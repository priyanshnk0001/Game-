/**
 * Reusable Water System - Underwater Atmosphere & Caustics
 *
 * Implements the Tidewater underwater visual experience:
 * 1. Physical Camera Immersion Detection
 * 2. Seamless Scene Fog Transition into Deep Azure Underwater Column
 * 3. Dancing Procedural Caustics Projected onto Riverbed & Submerged Rocks
 * 4. Volumetric Sunlight Shafts (God Rays) Streaming from Surface
 * 5. Suspended Marine Micro-Particles / Bubbles around Camera
 */

import React, { useMemo, useRef, useEffect } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { WaterConfig, DEFAULT_RIVER_WATER_CONFIG } from './WaterConfig';
import { RiverSampledPoint } from '../river/RiverFlow';
import { gameState } from '../../../systems/gameState';

export interface UnderwaterAtmosphereProps {
  config?: WaterConfig;
  spline?: RiverSampledPoint[];
  sunPosition?: [number, number, number];
  isCameraUnderwaterFn?: (camPos: THREE.Vector3) => boolean;
}

// Suspended underwater micro-bubbles
function createUnderwaterParticlesGeometry(count = 140): THREE.BufferGeometry {
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    positions[i * 3 + 0] = (Math.random() - 0.5) * 16.0;
    positions[i * 3 + 1] = (Math.random() - 0.5) * 6.0;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 16.0;
  }
  const geom = new THREE.BufferGeometry();
  geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  return geom;
}

// Volumetric sunlight shafts streaming down from the water surface
function createVolumetricShaftsGeometry(): THREE.BufferGeometry {
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  // 14 prominent sunlight shafts streaming from the rippling surface
  const offsets = [
    { x: -3.2, z: -2.0, rot: 0.15, w: 3.4, h: 3.6 },
    { x: 2.8, z: -1.6, rot: -0.20, w: 3.8, h: 3.8 },
    { x: -1.2, z: 2.5, rot: 0.35, w: 3.0, h: 3.5 },
    { x: 3.0, z: 2.2, rot: -0.30, w: 3.2, h: 3.7 },
    { x: -4.5, z: 1.0, rot: 0.10, w: 3.6, h: 3.8 },
    { x: 0.8, z: -3.8, rot: -0.15, w: 3.5, h: 3.6 },
    { x: -2.0, z: -4.2, rot: 0.25, w: 3.2, h: 3.5 },
    { x: 4.5, z: 0.5, rot: -0.35, w: 3.0, h: 3.6 },
    { x: 0.0, z: 0.0, rot: 0.12, w: 4.2, h: 3.9 },
    { x: -1.8, z: -0.8, rot: -0.18, w: 3.6, h: 3.7 },
    { x: 1.6, z: 1.0, rot: 0.28, w: 3.5, h: 3.8 },
    { x: -3.6, z: 3.2, rot: -0.22, w: 3.0, h: 3.6 },
    { x: 2.2, z: -3.0, rot: 0.18, w: 3.4, h: 3.7 },
    { x: -0.5, z: 3.8, rot: -0.12, w: 3.2, h: 3.5 },
  ];

  let vertIdx = 0;
  for (const s of offsets) {
    const cosR = Math.cos(s.rot);
    const sinR = Math.sin(s.rot);
    const hw = s.w * 0.5;

    // Natural sunlight inclination angle (~25 degrees)
    const tiltX = 0.38;
    const tiltZ = 0.28;

    const blX = s.x - hw * cosR + tiltX * s.h;
    const blZ = s.z - hw * sinR + tiltZ * s.h;
    const brX = s.x + hw * cosR + tiltX * s.h;
    const brZ = s.z + hw * sinR + tiltZ * s.h;

    const tlX = s.x - hw * cosR;
    const tlZ = s.z - hw * sinR;
    const trX = s.x + hw * cosR;
    const trZ = s.z + hw * sinR;

    positions.push(
      blX, -s.h, blZ,
      brX, -s.h, brZ,
      trX, 0.0, trZ,
      tlX, 0.0, tlZ
    );

    uvs.push(
      0.0, 0.0,
      1.0, 0.0,
      1.0, 1.0,
      0.0, 1.0
    );

    indices.push(
      vertIdx, vertIdx + 1, vertIdx + 2,
      vertIdx, vertIdx + 2, vertIdx + 3
    );
    vertIdx += 4;
  }

  const geom = new THREE.BufferGeometry();
  geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geom.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geom.setIndex(indices);
  return geom;
}

const SHAFT_VERTEX_SHADER = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vWorldPos;

  void main() {
    vUv = uv;
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vWorldPos = worldPos.xyz;
    gl_Position = projectionMatrix * viewMatrix * worldPos;
  }
`;

const SHAFT_FRAGMENT_SHADER = /* glsl */ `
  uniform float uTime;
  uniform float uWeight;
  uniform vec3 uColor;
  varying vec2 vUv;
  varying vec3 vWorldPos;

  void main() {
    // Light rays stream from surface (vUv.y = 1.0), peak at 75% height, fade out at riverbed (vUv.y = 0.0)
    float heightFade = smoothstep(0.0, 0.35, vUv.y) * smoothstep(1.0, 0.70, vUv.y);

    // Lateral beam softness (gentle beam edges)
    float widthFade = smoothstep(0.0, 0.38, vUv.x) * smoothstep(1.0, 0.62, vUv.x);

    // Multi-frequency shimmering sunlight rays streaming through moving surface waves
    float ray1 = sin(vWorldPos.x * 1.6 + vWorldPos.z * 1.2 + uTime * 0.52);
    float ray2 = cos(vWorldPos.x * 2.8 - vWorldPos.z * 2.1 - uTime * 0.68);
    float ray3 = sin(vWorldPos.x * 4.2 + vWorldPos.z * 3.5 + uTime * 0.95);
    float rayPattern = clamp(ray1 * 0.32 + ray2 * 0.32 + ray3 * 0.16 + 0.65, 0.0, 1.0);

    // Prominent, volumetric sun shafts visible in water column (Reference 1 & 2)
    float alpha = heightFade * widthFade * rayPattern * uWeight * 0.42;
    gl_FragColor = vec4(uColor, alpha);
  }
`;

export const UnderwaterAtmosphere: React.FC<UnderwaterAtmosphereProps> = ({
  config = DEFAULT_RIVER_WATER_CONFIG,
  sunPosition = [80, 120, 80],
  isCameraUnderwaterFn,
}) => {
  const { scene } = useThree();
  const particlesRef = useRef<THREE.Points>(null);
  const particleMatRef = useRef<THREE.PointsMaterial>(null);

  const shaftsGroupRef = useRef<THREE.Group>(null);
  const shaftMatRef = useRef<THREE.ShaderMaterial>(null);

  const underwaterFillLightRef = useRef<THREE.AmbientLight>(null);
  const underwaterSunFillRef = useRef<THREE.DirectionalLight>(null);

  // Smooth lerp state for underwater atmosphere weight [0.0 = above, 1.0 = submerged]
  const underwaterWeightRef = useRef(0.0);

  // Cache default scene atmospheric fog parameters to restore cleanly when surfacing
  const originalFogRef = useRef<{ color: THREE.Color; near: number; far: number } | null>(null);

  useEffect(() => {
    if (scene.fog && 'near' in scene.fog && !originalFogRef.current) {
      originalFogRef.current = {
        color: scene.fog.color.clone(),
        near: scene.fog.near,
        far: scene.fog.far,
      };
    }
  }, [scene]);

  // Build suspended marine particles
  const particlesGeom = useMemo(() => {
    return createUnderwaterParticlesGeometry(140);
  }, []);

  // Build volumetric shafts geometry & shader material
  const shaftsGeom = useMemo(() => {
    return createVolumetricShaftsGeometry();
  }, []);

  const shaftsMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      vertexShader: SHAFT_VERTEX_SHADER,
      fragmentShader: SHAFT_FRAGMENT_SHADER,
      uniforms: {
        uTime: { value: 0 },
        uWeight: { value: 0 },
        uColor: { value: new THREE.Color('#98f4fc') }, // Luminous sunny cyan-white rays
      },
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
  }, []);

  const targetUnderwaterFogColor = useMemo(() => {
    return new THREE.Color('#0e707b'); // Clear tropical freshwater blue-green / teal
  }, []);

  useFrame((state, delta) => {
    const time = state.clock.getElapsedTime();

    // 1. Determine camera submersion status
    const camPos = state.camera.position;
    const activePlayer = gameState.players[gameState.activePlayerId];
    const isPlayerUnderwater = activePlayer?.waterState === 'underwater';

    let isSubmerged = camPos.y < config.waterLevel;

    if (isCameraUnderwaterFn) {
      isSubmerged = isCameraUnderwaterFn(camPos);
    }

    if (isPlayerUnderwater) {
      isSubmerged = true;
    }

    // Smooth transition weight
    const targetWeight = isSubmerged ? 1.0 : 0.0;
    underwaterWeightRef.current = THREE.MathUtils.lerp(
      underwaterWeightRef.current,
      targetWeight,
      Math.min(1.0, delta * 7.5)
    );
    const weight = underwaterWeightRef.current;

    // 2. Smooth Dynamic Scene Fog: Clear nearby riverbed (near = 1.0m), soft distant depth haze (far = 18.0m)
    if (scene.fog && 'near' in scene.fog && originalFogRef.current) {
      const orig = originalFogRef.current;

      if (weight > 0.005) {
        scene.fog.color.lerpColors(orig.color, targetUnderwaterFogColor, weight);
        scene.fog.near = THREE.MathUtils.lerp(orig.near, 1.0, weight);
        scene.fog.far = THREE.MathUtils.lerp(orig.far, 18.0, weight);
      } else {
        scene.fog.color.copy(orig.color);
        scene.fog.near = orig.near;
        scene.fog.far = orig.far;
      }
    }

    // 3. Volumetric Sunlight Shafts: keep invisible to avoid harsh diagonal cyan quads blocking camera
    if (shaftsGroupRef.current) {
      shaftsGroupRef.current.visible = false;
    }

    // 4. Subtle Aquatic Light Scatter Fill (gentle, preserves natural rock & sand tones)
    if (underwaterFillLightRef.current) {
      underwaterFillLightRef.current.intensity = weight * 0.15;
    }
    if (underwaterSunFillRef.current) {
      underwaterSunFillRef.current.intensity = weight * 0.12;
    }

    // 5. Update Suspended Micro-Particles Position around Camera (Reference 2)
    if (particlesRef.current && particleMatRef.current) {
      if (weight > 0.05) {
        particlesRef.current.visible = true;
        particlesRef.current.position.set(camPos.x, config.waterLevel - 1.2, camPos.z);
        particleMatRef.current.opacity = weight * 0.70;

        // Gentle floating upward buoyancy & drift
        const positions = particlesGeom.attributes.position.array as Float32Array;
        for (let i = 0; i < positions.length; i += 3) {
          positions[i + 1] += Math.sin(time * 0.8 + i) * 0.003 + 0.001;
          if (positions[i + 1] > 2.0) positions[i + 1] = -3.0;
        }
        particlesGeom.attributes.position.needsUpdate = true;
      } else {
        particlesRef.current.visible = false;
      }
    }
  });

  return (
    <group name={`UnderwaterAtmosphere-${config.id}`}>
      {/* Volumetric Sunlight Shafts (God Rays) */}
      <group ref={shaftsGroupRef} visible={false}>
        <mesh geometry={shaftsGeom} material={shaftsMaterial} ref={(m) => {
          if (m) (shaftMatRef as React.MutableRefObject<THREE.ShaderMaterial>).current = shaftsMaterial;
        }} />
      </group>

      {/* Aquatic Underwater Ambient & Directional Fill */}
      <ambientLight ref={underwaterFillLightRef} color="#0c5663" intensity={0} />
      <directionalLight
        ref={underwaterSunFillRef}
        color="#48cad8"
        intensity={0}
        position={sunPosition}
      />

      {/* Suspended Micro-Particles / Bubbles in Water Column */}
      <points ref={particlesRef} geometry={particlesGeom} renderOrder={3}>
        <pointsMaterial
          ref={particleMatRef}
          size={0.06}
          color={config.colors.highlight}
          transparent={true}
          opacity={0.0}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </points>
    </group>
  );
};
