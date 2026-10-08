import React, { useRef, useMemo, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { Water } from 'three-stdlib';
import { TEST_POND_CONFIG } from './testPondConfig';

export interface TestPondWaterProps {
  center?: [number, number];
  waterElevation?: number;
  waterRadius?: number;
  shallowColor?: string;
  deepColor?: string;
  sunPosition?: [number, number, number];
  sunColor?: string;
}

export const TestPondWater: React.FC<TestPondWaterProps> = ({
  center = TEST_POND_CONFIG.center,
  waterElevation = TEST_POND_CONFIG.waterElevation,
  waterRadius = TEST_POND_CONFIG.waterRadius,
  shallowColor = TEST_POND_CONFIG.shallowWaterColor,
  deepColor = TEST_POND_CONFIG.deepWaterColor,
  sunPosition = [120, 100, 80],
  sunColor = '#fff8e7',
}) => {
  const waterRef = useRef<Water | null>(null);
  const { scene } = useThree();

  // Refs for underwater fog management
  const originalFogRef = useRef<THREE.Fog | THREE.FogExp2 | null>(null);
  const underwaterFogRef = useRef<THREE.FogExp2>(new THREE.FogExp2('#0b565e', 0.18));
  const isUnderwaterRef = useRef<boolean>(false);

  // Create Water instance and enhanced realistic shaders
  const water = useMemo(() => {
    // 1. High-density subdivided plane geometry for continuous physical surface ripples
    const planeSize = (waterRadius + 1.2) * 2;
    const geometry = new THREE.PlaneGeometry(planeSize, planeSize, 96, 96);

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
    const waterInstance = new Water(geometry, {
      textureWidth: 512,
      textureHeight: 512,
      waterNormals: waterNormals,
      sunDirection: sunDir,
      sunColor: new THREE.Color(sunColor),
      waterColor: new THREE.Color(TEST_POND_CONFIG.baseWaterColor),
      distortionScale: 3.2,
      fog: true,
    });

    // 5. Inject custom uniforms for realistic depth gradients, organic pond radius, and edge softness
    const pondWorldCenter = new THREE.Vector3(center[0], waterElevation, center[1]);
    waterInstance.material.uniforms['uPondCenter'] = { value: pondWorldCenter };
    waterInstance.material.uniforms['uPondRadius'] = { value: waterRadius };
    waterInstance.material.uniforms['uShallowWaterColor'] = { value: new THREE.Color(shallowColor) };
    waterInstance.material.uniforms['uDeepWaterColor'] = { value: new THREE.Color(deepColor) };

    // 6. Enhanced Vertex Shader:
    // Adds subtle physical Gerstner-style micro-undulations damped smoothly to zero at the shoreline
    let vs = waterInstance.material.vertexShader;
    vs = 'uniform float uPondRadius;\n' + vs;
    vs = vs.replace(
      'mirrorCoord = modelMatrix * vec4( position, 1.0 );',
      `
      // Subtle continuous wave movement (scaled to zero at pond perimeter so shoreline stays anchored)
      float waveDist = length(position.xy);
      float shoreDamp = smoothstep(uPondRadius, uPondRadius * 0.55, waveDist);
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
    // - Organic non-rectangular boundary (discards outside organic pond radius)
    // - Shoreline alpha feathering (soft natural contact with sloping terrain, zero polygon seams)
    // - Fluid ceiling rendering from underneath with caustics, sunlight filtration and Snell's window
    let fs = waterInstance.material.fragmentShader;
    fs = `
    uniform vec3 uPondCenter;
    uniform float uPondRadius;
    uniform vec3 uShallowWaterColor;
    uniform vec3 uDeepWaterColor;
    ` + fs;

    fs = fs.replace(
      'vec3 scatter = max( 0.0, dot( surfaceNormal, eyeDirection ) ) * waterColor;',
      `
      // 1. Organic shape modulation and radial distance
      vec2 dP = worldPosition.xz - uPondCenter.xz;
      float dAngle = atan(dP.y, dP.x);
      float organicR = uPondRadius + sin(dAngle * 3.0) * 0.20 + cos(dAngle * 5.0) * 0.10;
      float distToCenter = length(dP);
      float shoreDist = organicR - distToCenter;

      // Discard pixels outside pond boundary: guarantees NO square boundary edges
      if (shoreDist < -0.02) {
        discard;
      }

      // 2. Depth-based coloration:
      // Shallow edges: clear tropical turquoise / blue-green
      // Deep basin center: rich dark navy blue
      float depthRatio = clamp(1.0 - (distToCenter / organicR), 0.0, 1.0);
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
      // Shoreline feathering
      float shoreAlpha = smoothstep(-0.02, 0.40, shoreDist);

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

    // 9. Align horizontal water surface
    waterInstance.rotation.x = -Math.PI / 2;
    waterInstance.position.set(center[0], waterElevation, center[1]);

    return waterInstance;
  }, [center, waterElevation, waterRadius, shallowColor, deepColor, sunPosition, sunColor]);

  // Keep ref up to date and clean up
  useEffect(() => {
    waterRef.current = water;
    return () => {
      water.geometry.dispose();
      water.material.dispose();
      // Restore scene fog if unmounted while underwater
      if (isUnderwaterRef.current && originalFogRef.current) {
        scene.fog = originalFogRef.current;
        isUnderwaterRef.current = false;
      }
    };
  }, [water, scene]);

  // Per-frame update: animate time uniform & detect underwater camera to dynamically switch fog
  useFrame((state, delta) => {
    // 1. Smooth per-frame animation of water time uniforms
    if (waterRef.current && waterRef.current.material.uniforms['time']) {
      waterRef.current.material.uniforms['time'].value += delta * 0.42;
    }

    // 2. Underwater camera detection & dynamic fog switching
    const camY = state.camera.position.y;
    const camDistToPond = Math.hypot(state.camera.position.x - center[0], state.camera.position.z - center[1]);
    const isUnderwater = camY < waterElevation && camDistToPond < waterRadius + 2.0;

    if (isUnderwater && !isUnderwaterRef.current) {
      // Camera entered underwater: save original scene fog and dynamically switch to dense teal FogExp2
      isUnderwaterRef.current = true;
      originalFogRef.current = scene.fog;
      scene.fog = underwaterFogRef.current;
    } else if (!isUnderwater && isUnderwaterRef.current) {
      // Camera exited underwater: dynamically restore original scene fog
      isUnderwaterRef.current = false;
      scene.fog = originalFogRef.current;
    }
  });

  return <primitive object={water} />;
};
