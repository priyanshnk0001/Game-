/**
 * Reusable Water System - Master Component
 *
 * Physically-grounded realistic GPU water system extracted from TestPondWater.
 * Features:
 * - Real-time planar reflection via Three.js stdlib Water
 * - Dual-layer animated normal map sampling (/waternormals.jpg)
 * - Physical Gerstner-style micro-wave displacements with shoreline damping
 * - Depth-dependent water coloration (crystal clear shallow turquoise to rich deep navy)
 * - Double-sided rendering with underwater Snell's window, total internal reflection,
 *   luminous fluid ceiling, and moving caustic sun filtration
 * - Shoreline soft-edge alpha feathering (zero hard polygon seams against terrain)
 * - Riverbed caustics, volumetric god rays, and underwater atmosphere
 */

import React, { useRef, useMemo, useEffect } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { Water } from 'three-stdlib';
import { WaterConfig, DEFAULT_RIVER_WATER_CONFIG } from './WaterConfig';
import { UnderwaterAtmosphere } from './UnderwaterAtmosphere';
import { RiverSampledPoint } from '../river/RiverFlow';
import { TEST_POND_CONFIG } from './testPondConfig';

export interface WaterSystemProps {
  config?: WaterConfig;
  geometry?: THREE.BufferGeometry;
  spline?: RiverSampledPoint[];
  sunPosition?: [number, number, number];
  isCameraUnderwaterFn?: (camPos: THREE.Vector3) => boolean;
  renderCaustics?: boolean;
}

/**
 * Transforms / prepares water geometry for the Three.js Water system:
 * - Converts horizontal world-space meshes (such as the spline river ribbon) into
 *   local coordinate space where local normal is (0, 0, 1) and rotation.x = -PI/2
 *   aligns it with world horizontal plane at Y = config.waterLevel.
 * - Ensures aRiverParams attribute exists for wave damping and depth gradient calculations.
 */
function prepareWaterGeometry(
  geom: THREE.BufferGeometry,
  waterLevel: number
): THREE.BufferGeometry {
  const localGeom = geom.clone();
  localGeom.computeBoundingBox();
  const bb = localGeom.boundingBox;

  // Check if geometry coordinates are in world space (XZ span >> Y elevation range)
  const isWorldSpace = bb && Math.abs(bb.max.y - bb.min.y) < 10 && (bb.max.z - bb.min.z) > 10;
  if (isWorldSpace) {
    const pos = localGeom.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const wx = pos.getX(i);
      const wy = pos.getY(i);
      const wz = pos.getZ(i);
      // Map world coords (wx, wy, wz) to local coords (x_L, y_L, z_L):
      // pos_world = (0, waterLevel, 0) + R_x(-PI/2) * (x_L, y_L, z_L) = (x_L, waterLevel + z_L, -y_L)
      // Therefore: x_L = wx, y_L = -wz, z_L = wy - waterLevel
      pos.setXYZ(i, wx, -wz, wy - waterLevel);
    }
    pos.needsUpdate = true;
    localGeom.computeVertexNormals();
  }

  // Ensure aRiverParams attribute exists for shader shoreline calculations
  if (!localGeom.hasAttribute('aRiverParams')) {
    const count = localGeom.attributes.position.count;
    const params = new Float32Array(count * 2);
    const maxR = bb ? Math.max(bb.max.x - bb.min.x, bb.max.y - bb.min.y) * 0.5 : 25.0;
    const pos = localGeom.attributes.position;
    for (let i = 0; i < count; i++) {
      const dist = Math.hypot(pos.getX(i), pos.getY(i));
      const edge = Math.min(1.0, dist / (maxR || 1.0));
      params[i * 2 + 0] = edge;
      params[i * 2 + 1] = 1.0;
    }
    localGeom.setAttribute('aRiverParams', new THREE.BufferAttribute(params, 2));
  }

  return localGeom;
}

/**
 * Generates fallback plane geometry if none provided (for ocean/lake/pond)
 */
function createDefaultWaterGeometry(config: WaterConfig): THREE.BufferGeometry {
  const size = config.type === 'ocean' ? 1200 : config.type === 'lake' ? 250 : 50;
  const segments = 48;
  const geom = new THREE.PlaneGeometry(size, size, segments, segments);
  return geom;
}

/**
 * Realistic Water Surface using the Three.js Water engine logic extracted from TestPondWater
 */
export const RealisticWaterSurface: React.FC<{
  geometry: THREE.BufferGeometry;
  config: WaterConfig;
  sunPosition?: [number, number, number];
}> = ({ geometry, config, sunPosition = [100, 150, 100] }) => {
  const waterRef = useRef<Water | null>(null);

  const water = useMemo(() => {
    // 1. Prepare local geometry oriented for horizontal reflection plane
    const localGeom = prepareWaterGeometry(geometry, config.waterLevel);

    // 2. Load water normal map with smooth repeat wrapping
    const textureLoader = new THREE.TextureLoader();
    const waterNormals = textureLoader.load('/waternormals.jpg', (tex) => {
      tex.wrapS = THREE.RepeatWrapping;
      tex.wrapT = THREE.RepeatWrapping;
      tex.needsUpdate = true;
    });
    waterNormals.wrapS = THREE.RepeatWrapping;
    waterNormals.wrapT = THREE.RepeatWrapping;

    // 3. Normalised sun direction vector matching current map lighting
    const sunDir = new THREE.Vector3(...sunPosition).normalize();

    // 4. Construct official Three.js Water Addon instance
    const waterInstance = new Water(localGeom, {
      textureWidth: 512,
      textureHeight: 512,
      waterNormals: waterNormals,
      sunDirection: sunDir,
      sunColor: new THREE.Color(config.colors?.sunGlint || '#fff8e7'),
      waterColor: new THREE.Color(TEST_POND_CONFIG.baseWaterColor),
      distortionScale: 3.2,
      fog: true,
    });

    // 5. Inject custom uniforms for realistic depth gradients & colors
    const shallow = config.colors?.shallow || TEST_POND_CONFIG.shallowWaterColor;
    const deep = config.colors?.deep || TEST_POND_CONFIG.deepWaterColor;
    waterInstance.material.uniforms['uShallowWaterColor'] = { value: new THREE.Color(shallow) };
    waterInstance.material.uniforms['uDeepWaterColor'] = { value: new THREE.Color(deep) };

    // 6. Enhanced Vertex Shader:
    // Adds subtle physical Gerstner-style micro-undulations damped smoothly to zero at the shoreline banks
    let vs = waterInstance.material.vertexShader;
    vs = 'attribute vec2 aRiverParams;\nvarying float vEdge;\n' + vs;
    vs = vs.replace(
      'mirrorCoord = modelMatrix * vec4( position, 1.0 );',
      `
      vEdge = aRiverParams.x;
      // Subtle continuous wave movement (scaled to zero at shoreline banks so edges stay anchored)
      float shoreDamp = 1.0 - smoothstep(0.65, 0.98, aRiverParams.x);
      float w1 = sin(position.x * 3.8 + time * 1.5) * 0.012;
      float w2 = cos(position.y * 3.2 + time * 1.2) * 0.009;
      float w3 = sin((position.x * 2.4 + position.y * 2.4) + time * 1.9) * 0.006;
      vec3 displacedPos = position;
      displacedPos.z += (w1 + w2 + w3) * shoreDamp;
      mirrorCoord = modelMatrix * vec4( displacedPos, 1.0 );
      `
    );
    vs = vs.replace(
      'vec4 mvPosition =  modelViewMatrix * vec4( position, 1.0 );',
      'vec4 mvPosition =  modelViewMatrix * vec4( displacedPos, 1.0 );'
    );
    waterInstance.material.vertexShader = vs;

    // 7. Enhanced Fragment Shader:
    // Implements:
    // - Depth-based water coloration (clear turquoise in shallow margin, deep navy in deep center)
    // - Shoreline alpha feathering (soft natural contact with sloping terrain, zero polygon seams)
    // - Fluid ceiling rendering from underneath with caustics, sunlight filtration and Snell's window
    let fs = waterInstance.material.fragmentShader;
    fs = `
    varying float vEdge;
    uniform vec3 uShallowWaterColor;
    uniform vec3 uDeepWaterColor;
    ` + fs;

    fs = fs.replace(
      'vec3 scatter = max( 0.0, dot( surfaceNormal, eyeDirection ) ) * waterColor;',
      `
      // 1. Depth-based coloration:
      // Shallow edges: clear tropical turquoise / blue-green
      // Deep channel center: rich dark navy blue
      float depthRatio = clamp(1.0 - vEdge, 0.0, 1.0);
      float depthCurve = smoothstep(0.0, 0.82, depthRatio);
      vec3 effectiveWaterColor = mix(uShallowWaterColor, uDeepWaterColor, depthCurve);

      // Check if camera is viewing from underneath the water surface
      bool isUnder = (eye.y < worldPosition.y);

      // Diffuse ambient water scattering
      vec3 scatter = max( 0.0, dot( surfaceNormal, eyeDirection ) ) * effectiveWaterColor;
      `
    );

    fs = fs.replace(
      'gl_FragColor = vec4( outgoingLight, alpha );',
      `
      // Shoreline feathering along river banks: soft natural contact, zero polygon seams
      float shoreDist = 1.0 - vEdge;
      float shoreAlpha = smoothstep(0.0, 0.28, shoreDist);

      if (isUnder) {
        // UNDERWATER VIEW: Animated fluid ceiling with moving ripple caustics & sun filtration
        float sunTransmission = max(0.0, dot(surfaceNormal, sunDirection));
        vec3 sunDirNorm = normalize(sunDirection + surfaceNormal * 0.35);
        float sunGlint = pow(max(0.0, dot(-eyeDirection, sunDirNorm)), 28.0);

        // Luminous tropical teal fluid ceiling with moving ripples
        vec3 ceilingColor = mix(
          vec3(0.06, 0.52, 0.58),
          vec3(0.28, 0.80, 0.86),
          clamp(noise.y * 0.5 + 0.5, 0.0, 1.0)
        );
        ceilingColor += sunColor * sunGlint * 1.5;
        ceilingColor += sunColor * sunTransmission * 0.38;

        // Snell's Window / Total Internal Reflection effect
        float viewCos = max(0.0, -eyeDirection.y);
        float fresnelUnder = pow(1.0 - viewCos, 3.0);
        vec3 deepTealReflect = vec3(0.03, 0.22, 0.26);
        outgoingLight = mix(ceilingColor, deepTealReflect, fresnelUnder * 0.65);

        // Fluid ceiling opacity: keeps fluid ceiling clearly visible as an animated ceiling
        float underAlpha = mix(0.85, 0.96, fresnelUnder);
        float finalAlpha = clamp(underAlpha * shoreAlpha, 0.0, 0.96);
        gl_FragColor = vec4( outgoingLight, finalAlpha );
      } else {
        // ABOVE-WATER VIEW: Realistic water surface
        float finalAlpha = clamp(alpha * shoreAlpha * 0.94, 0.0, 1.0);
        gl_FragColor = vec4( outgoingLight, finalAlpha );
      }
      `
    );
    waterInstance.material.fragmentShader = fs;

    // 8. Material properties: DoubleSide for visible fluid ceiling underneath, transparency for blending
    waterInstance.material.side = THREE.DoubleSide;
    waterInstance.material.transparent = true;
    waterInstance.material.depthWrite = false;

    // 9. Align horizontal water surface at configured water elevation
    waterInstance.position.set(0, config.waterLevel, 0);
    waterInstance.rotation.x = -Math.PI / 2;

    return waterInstance;
  }, [geometry, config, sunPosition]);

  // Keep ref up to date and clean up
  useEffect(() => {
    waterRef.current = water;
    return () => {
      water.geometry.dispose();
      water.material.dispose();
    };
  }, [water]);

  // Per-frame update: animate time uniform matching TestPondWater speed
  useFrame((_state, delta) => {
    if (waterRef.current && waterRef.current.material.uniforms['time']) {
      waterRef.current.material.uniforms['time'].value += delta * 0.42;
    }
  });

  return <primitive object={water} />;
};

export const WaterSystem: React.FC<WaterSystemProps> = ({
  config = DEFAULT_RIVER_WATER_CONFIG,
  geometry,
  spline,
  sunPosition = [100, 150, 100],
  isCameraUnderwaterFn,
  renderCaustics = true,
}) => {
  // Use provided geometry or create default procedural plane
  const waterGeometry = useMemo(() => {
    if (geometry) return geometry;
    return createDefaultWaterGeometry(config);
  }, [geometry, config]);

  return (
    <group name={`WaterSystem-${config.id}`}>
      {/* 1. Realistic GPU Shader Water Surface (Three.js Water engine extracted from TestPondWater) */}
      <RealisticWaterSurface
        geometry={waterGeometry}
        config={config}
        sunPosition={sunPosition}
      />

      {/* 2. Underwater Atmospheric Effects, Riverbed Caustics & God Rays */}
      {renderCaustics && (
        <UnderwaterAtmosphere
          config={config}
          spline={spline}
          sunPosition={sunPosition}
          isCameraUnderwaterFn={isCameraUnderwaterFn}
        />
      )}
    </group>
  );
};
