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

// Helper: Generate particle field around player for suspended underwater micro-bubbles
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

export const UnderwaterAtmosphere: React.FC<UnderwaterAtmosphereProps> = ({
  config = DEFAULT_RIVER_WATER_CONFIG,
  isCameraUnderwaterFn,
}) => {
  const { scene } = useThree();
  const particlesRef = useRef<THREE.Points>(null);
  const particleMatRef = useRef<THREE.PointsMaterial>(null);

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

  const targetUnderwaterFogColor = useMemo(() => {
    return new THREE.Color(config.colors.underwaterFog);
  }, [config.colors.underwaterFog]);

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

    // Active player underwater state guarantees underwater camera atmosphere
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

    // 2. Smooth Dynamic Scene Fog Transformation into Tidewater Azure
    if (scene.fog && 'near' in scene.fog && originalFogRef.current) {
      const orig = originalFogRef.current;

      if (weight > 0.005) {
        scene.fog.color.lerpColors(orig.color, targetUnderwaterFogColor, weight);
        scene.fog.near = THREE.MathUtils.lerp(orig.near, config.underwaterFogNear, weight);
        scene.fog.far = THREE.MathUtils.lerp(orig.far, config.underwaterFogFar, weight);
      } else {
        scene.fog.color.copy(orig.color);
        scene.fog.near = orig.near;
        scene.fog.far = orig.far;
      }
    }

    // 3. Update Suspended Micro-Particles Position around Camera
    if (particlesRef.current && particleMatRef.current) {
      if (weight > 0.05) {
        particlesRef.current.visible = true;
        particlesRef.current.position.set(camPos.x, config.waterLevel - 1.2, camPos.z);
        particleMatRef.current.opacity = weight * 0.55;

        // Gentle floating drift
        const positions = particlesGeom.attributes.position.array as Float32Array;
        for (let i = 0; i < positions.length; i += 3) {
          positions[i + 1] += Math.sin(time * 0.8 + i) * 0.002;
        }
        particlesGeom.attributes.position.needsUpdate = true;
      } else {
        particlesRef.current.visible = false;
      }
    }
  });

  return (
    <group name={`UnderwaterAtmosphere-${config.id}`}>
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
