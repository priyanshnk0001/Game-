/**
 * Bird Flying Animation System - Visual Scene Component
 *
 * Standalone, reusable atmospheric avian wildlife system for 3D environments.
 * Manages multiple species, flock formation geometry, procedural flight paths,
 * desynchronized flapping/gliding animation, and distance LOD optimizations.
 */

import React, { useMemo, useRef, Suspense } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';

import {
  BirdSpeciesId,
  BirdSpeciesConfig,
  BirdFlockSpec,
  DEFAULT_BIRD_SPECIES,
  DEFAULT_BIRD_CONFIG,
} from './birdConfig';
import {
  BirdIndividualState,
  FlockState,
  generateFormationOffsets,
  pickNextWaypoint,
  updateFlock,
} from './BirdFlight';

export interface BirdSystemProps {
  enabled?: boolean;
  spawnBounds?: { minX: number; maxX: number; minZ: number; maxZ: number };
  flocks?: BirdFlockSpec[];
  maxVisibleDistance?: number;
  lodDistance?: number;
  altitudeOffset?: number;
}

// Internal component that loads GLTFs with Suspense
const BirdSystemInner: React.FC<BirdSystemProps> = ({
  enabled = true,
  spawnBounds = DEFAULT_BIRD_CONFIG.spawnBounds,
  flocks = DEFAULT_BIRD_CONFIG.flocks,
  maxVisibleDistance = DEFAULT_BIRD_CONFIG.maxVisibleDistance,
  lodDistance = DEFAULT_BIRD_CONFIG.lodDistance,
  altitudeOffset = 0,
}) => {
  const { camera } = useThree();
  const rootGroupRef = useRef<THREE.Group>(null);

  // 1. Preload & load all 3 official permissive bird models
  const parrotGltf = useGLTF(DEFAULT_BIRD_SPECIES.parrot.modelPath);
  const storkGltf = useGLTF(DEFAULT_BIRD_SPECIES.stork.modelPath);
  const flamingoGltf = useGLTF(DEFAULT_BIRD_SPECIES.flamingo.modelPath);

  const speciesAssetMap = useMemo<
    Record<BirdSpeciesId, { gltf: typeof parrotGltf; config: BirdSpeciesConfig }>
  >(() => {
    return {
      parrot: { gltf: parrotGltf, config: DEFAULT_BIRD_SPECIES.parrot },
      stork: { gltf: storkGltf, config: DEFAULT_BIRD_SPECIES.stork },
      flamingo: { gltf: flamingoGltf, config: DEFAULT_BIRD_SPECIES.flamingo },
    };
  }, [parrotGltf, storkGltf, flamingoGltf]);

  // 2. Initialize flock instances, formation offsets, and individual bird states
  const flockStates = useMemo<FlockState[]>(() => {
    if (!enabled) return [];

    const result: FlockState[] = [];

    flocks.forEach((flockSpec, flockIdx) => {
      const asset = speciesAssetMap[flockSpec.species];
      if (!asset) return;

      const { gltf, config } = asset;
      const flockSize =
        flockSpec.size ??
        Math.floor(
          config.flockSize.min +
            Math.random() * (config.flockSize.max - config.flockSize.min + 1)
        );

      // Determine initial leader position and heading
      const margin = 60.0;
      const startX =
        flockSpec.initialCenter?.[0] ??
        spawnBounds.minX + margin + Math.random() * (spawnBounds.maxX - spawnBounds.minX - margin * 2);
      const startZ =
        flockSpec.initialCenter?.[2] ??
        spawnBounds.minZ + margin + Math.random() * (spawnBounds.maxZ - spawnBounds.minZ - margin * 2);
      const startY =
        (flockSpec.initialCenter?.[1] ??
          config.altitude.min + Math.random() * (config.altitude.max - config.altitude.min)) +
        altitudeOffset;

      const initialHeading = Math.random() * Math.PI * 2;
      const initialSpeed = (config.speed.min + config.speed.max) * 0.5;
      const initialVel = new THREE.Vector3(
        Math.sin(initialHeading) * initialSpeed,
        0,
        Math.cos(initialHeading) * initialSpeed
      );

      const leaderPos = new THREE.Vector3(startX, startY, startZ);
      const firstWaypoint = pickNextWaypoint(leaderPos, initialVel, spawnBounds, config);

      // Formation offsets for all members
      const formationOffsets = generateFormationOffsets(flockSize, config);

      const members: BirdIndividualState[] = [];
      let leaderState: BirdIndividualState | null = null;

      const flockId = `flock-${flockSpec.species}-${flockIdx}`;

      for (let mIdx = 0; mIdx < flockSize; mIdx++) {
        const isLeader = mIdx === 0;
        const offset = formationOffsets[mIdx];

        // Clone model scene with independent morph targets
        const clonedScene = SkeletonUtils.clone(gltf.scene);

        // Configure vertex colors, materials, and shadows
        clonedScene.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) {
            const mesh = child as THREE.Mesh;
            mesh.castShadow = false;
            mesh.receiveShadow = false;
            mesh.frustumCulled = true;

            if (mesh.material) {
              if (Array.isArray(mesh.material)) {
                mesh.material.forEach((mat) => {
                  mat.vertexColors = true;
                  mat.side = THREE.DoubleSide;
                });
              } else {
                mesh.material.vertexColors = true;
                mesh.material.side = THREE.DoubleSide;
              }
            }
          }
        });

        // Set visual scale
        clonedScene.scale.set(config.scale, config.scale, config.scale);

        // Group container that handles world transform and banking
        const birdGroup = new THREE.Group();
        birdGroup.name = `bird-${flockId}-${mIdx}`;
        birdGroup.add(clonedScene);

        // Animation mixer & wing action
        const mixer = new THREE.AnimationMixer(clonedScene);
        const clip = gltf.animations[0];
        const action = mixer.clipAction(clip);

        // Individualized start phase so birds never flap in synchronized unison
        const randomPhase = Math.random() * clip.duration;
        mixer.setTime(randomPhase);
        action.play();

        const initialFlapSpeed = config.flapSpeed.min + Math.random() * (config.flapSpeed.max - config.flapSpeed.min);
        action.timeScale = initialFlapSpeed;

        const initialPos = isLeader
          ? leaderPos.clone()
          : leaderPos.clone().add(offset);

        const birdState: BirdIndividualState = {
          id: `${flockId}-bird-${mIdx}`,
          speciesId: flockSpec.species,
          config,
          isLeader,
          flockId,
          position: initialPos,
          velocity: initialVel.clone(),
          targetPosition: initialPos.clone(),
          formationOffset: offset,
          yaw: initialHeading,
          pitch: 0,
          roll: 0,
          yawVelocity: 0,
          isFlapping: Math.random() > config.glideRatio * 0.5,
          stateTimer: 2.0 + Math.random() * 4.0,
          targetFlapSpeed: initialFlapSpeed,
          currentFlapSpeed: initialFlapSpeed,
          flapPhaseOffset: Math.random() * Math.PI * 2,
          group: birdGroup,
          mixer,
          action,
        };

        if (isLeader) {
          leaderState = birdState;
        }

        members.push(birdState);
      }

      if (leaderState) {
        result.push({
          id: flockId,
          speciesId: flockSpec.species,
          config,
          leader: leaderState,
          members,
          currentWaypoint: leaderPos.clone(),
          targetWaypoint: firstWaypoint,
          waypointProgress: 0,
          turnDirection: Math.random() > 0.5 ? 1 : -1,
        });
      }
    });

    return result;
  }, [enabled, flocks, spawnBounds, speciesAssetMap, altitudeOffset]);

  // 3. Mount all bird groups into the scene graph
  React.useEffect(() => {
    const root = rootGroupRef.current;
    if (!root) return;

    // Attach all bird groups to root
    flockStates.forEach((flock) => {
      flock.members.forEach((bird) => {
        root.add(bird.group);
      });
    });

    return () => {
      // Clean up when unmounting or reconfiguring
      flockStates.forEach((flock) => {
        flock.members.forEach((bird) => {
          bird.mixer.stopAllAction();
          root.remove(bird.group);
        });
      });
    };
  }, [flockStates]);

  // 4. Single lightweight 60FPS simulation loop
  useFrame((_, delta) => {
    if (!enabled || flockStates.length === 0) return;

    // Limit delta step to prevent physics exploding on tab-switch
    const safeDelta = Math.min(delta, 0.1);
    const cameraPos = camera.position;

    flockStates.forEach((flock) => {
      updateFlock(
        flock,
        safeDelta,
        spawnBounds,
        cameraPos,
        maxVisibleDistance,
        lodDistance
      );
    });
  });

  return <group ref={rootGroupRef} name="BirdFlightAtmosphereSystem" />;
};

// Safe exported component wrapped in Suspense so it never blocks rendering
export const BirdSystem: React.FC<BirdSystemProps> = (props) => {
  return (
    <Suspense fallback={null}>
      <BirdSystemInner {...props} />
    </Suspense>
  );
};

// Preload models for immediate smooth display
useGLTF.preload(DEFAULT_BIRD_SPECIES.parrot.modelPath);
useGLTF.preload(DEFAULT_BIRD_SPECIES.stork.modelPath);
useGLTF.preload(DEFAULT_BIRD_SPECIES.flamingo.modelPath);
