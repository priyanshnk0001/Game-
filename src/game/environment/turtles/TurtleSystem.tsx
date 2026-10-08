/**
 * Aquatic Wildlife - Turtle Swimming System (Scene Component)
 *
 * Standalone, reusable aquatic turtle component for 3D rivers and waterways.
 * Follows the BirdSystem architectural pattern:
 * - Multi-species freshwater & river turtle ecosystem (4 distinct species)
 * - Real complete 3D models with full anatomy (head, neck, 4 flippers, shell, tail)
 * - Skeletal flipper swimming strokes with dynamic speed-dependent paddling cadence
 * - Smooth 3D steering without robotic snapping
 * - Riverbed foraging dives near pebbles/gravel and mid-depth cruising
 */

import React, { useMemo, useRef, useEffect, Suspense } from 'react';
import * as THREE from 'three';
import { useGLTF } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';

import {
  TurtleIndividualSpec,
  DEFAULT_TURTLE_SPECIES,
  DEFAULT_TURTLE_CONFIG,
} from './turtleConfig';
import {
  TurtleIndividualState,
  initializeTurtleState,
  updateTurtleState,
} from './TurtleSwim';
import { RiverSampledPoint } from '../river/RiverFlow';
import { RiverConfig, SECTOR02_RIVER_CONFIG } from '../river/riverConfig';

export interface TurtleSystemProps {
  enabled?: boolean;
  spline: RiverSampledPoint[];
  config?: RiverConfig;
  turtles?: TurtleIndividualSpec[];
  maxVisibleDistance?: number;
}

const TurtleSystemInner: React.FC<TurtleSystemProps> = ({
  enabled = true,
  spline,
  config = SECTOR02_RIVER_CONFIG,
  turtles = DEFAULT_TURTLE_CONFIG.turtles,
  maxVisibleDistance = 140,
}) => {
  const rootGroupRef = useRef<THREE.Group>(null);

  // 1. Load real complete 3D turtle GLBs
  const greenTurtleGltf = useGLTF(DEFAULT_TURTLE_SPECIES.green_turtle.modelPath);
  const kempsRidleyGltf = useGLTF(DEFAULT_TURTLE_SPECIES.kemps_ridley.modelPath);
  const leatherbackGltf = useGLTF(DEFAULT_TURTLE_SPECIES.leatherback.modelPath);
  const hawksbillGltf = useGLTF(DEFAULT_TURTLE_SPECIES.hawksbill.modelPath);

  const gltfBySpecies = useMemo(() => ({
    green_turtle: greenTurtleGltf,
    kemps_ridley: kempsRidleyGltf,
    leatherback: leatherbackGltf,
    hawksbill: hawksbillGltf,
  }), [greenTurtleGltf, kempsRidleyGltf, leatherbackGltf, hawksbillGltf]);

  // Keep individual turtle simulation states
  const turtleStatesRef = useRef<TurtleIndividualState[]>([]);

  // 2. Instantiate and assemble turtle entities
  useEffect(() => {
    const root = rootGroupRef.current;
    if (!root || !enabled || spline.length === 0) return;

    // Clear previous entities
    while (root.children.length > 0) {
      const child = root.children[0];
      root.remove(child);
    }

    const createdStates: TurtleIndividualState[] = [];

    turtles.forEach((spec, idx) => {
      const speciesConfig = DEFAULT_TURTLE_SPECIES[spec.species] ?? DEFAULT_TURTLE_SPECIES.green_turtle;
      const gltf = gltfBySpecies[spec.species] ?? greenTurtleGltf;

      // Clone scene graph including skeletal bone hierarchy
      const clonedScene = SkeletonUtils.clone(gltf.scene);

      // Wrapper group for world transform
      const turtleGroup = new THREE.Group();
      turtleGroup.name = `Turtle-${spec.species}-${idx}`;

      // Inner container for local centering offset and scale
      const innerContainer = new THREE.Group();
      innerContainer.position.set(
        speciesConfig.modelOffset[0],
        speciesConfig.modelOffset[1],
        speciesConfig.modelOffset[2]
      );

      if (Array.isArray(speciesConfig.scale)) {
        innerContainer.scale.set(
          speciesConfig.scale[0],
          speciesConfig.scale[1],
          speciesConfig.scale[2]
        );
      } else {
        innerContainer.scale.setScalar(speciesConfig.scale);
      }

      if (speciesConfig.modelRotationOffset) {
        innerContainer.rotation.set(
          speciesConfig.modelRotationOffset[0],
          speciesConfig.modelRotationOffset[1],
          speciesConfig.modelRotationOffset[2]
        );
      }

      // Configure materials and depth/render ordering so turtles render underneath the transparent water surface
      turtleGroup.renderOrder = 1;
      clonedScene.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          const mesh = child as THREE.Mesh;
          mesh.castShadow = true;
          mesh.receiveShadow = true;
          mesh.renderOrder = 1; // Render before water surface (renderOrder: 10)

          if (mesh.material) {
            const origMat = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;
            const newMat = (origMat as THREE.MeshStandardMaterial).clone();
            if (speciesConfig.colorTint) {
              const tintCol = new THREE.Color(speciesConfig.colorTint);
              newMat.color.lerp(tintCol, 0.45);
              newMat.roughness = 0.35;
            }
            newMat.depthWrite = false; // Prevent turtle from occluding the transparent water surface
            newMat.depthTest = true;
            newMat.side = THREE.FrontSide;
            mesh.material = newMat;
          }
        }
      });

      innerContainer.add(clonedScene);
      turtleGroup.add(innerContainer);

      // Setup AnimationMixer for natural flipper strokes
      let mixer: THREE.AnimationMixer | undefined;
      let action: THREE.AnimationAction | undefined;

      if (gltf.animations && gltf.animations.length > 0) {
        mixer = new THREE.AnimationMixer(clonedScene);
        // Find best swimming clip
        const swimClip =
          gltf.animations.find((a) => a.name.toLowerCase().includes('swim')) ||
          gltf.animations.find((a) => a.name.toLowerCase().includes('idle')) ||
          gltf.animations[0];

        if (swimClip) {
          action = mixer.clipAction(swimClip);
          action.play();
          // Desynchronize initial flipper stroke time
          action.time = Math.random() * swimClip.duration;
        }
      }

      // Initialize kinematics and steering state
      const initialProgress = spec.initialProgress ?? (idx / turtles.length) * 0.8 + 0.1;
      const initialDirection = spec.direction ?? (idx % 2 === 0 ? 1 : -1);

      const state = initializeTurtleState(
        `turtle-${spec.species}-${idx}`,
        spec.species,
        speciesConfig,
        initialProgress,
        initialDirection,
        spline,
        config,
        turtleGroup
      );

      state.mixer = mixer;
      state.action = action;

      root.add(turtleGroup);
      createdStates.push(state);
    });

    turtleStatesRef.current = createdStates;

    return () => {
      // Cleanup mixers
      createdStates.forEach((s) => s.mixer?.stopAllAction());
    };
  }, [enabled, spline, config, turtles, gltfBySpecies, greenTurtleGltf]);

  // 3. Animation and Kinematics Frame Loop
  useFrame(({ clock, camera }, delta) => {
    if (!enabled || turtleStatesRef.current.length === 0) return;

    // Cap delta to prevent large step leaps after tab switching
    const clampedDelta = Math.min(delta, 0.08);
    const elapsedTime = clock.getElapsedTime();
    const camPos = camera.position;
    const maxDistSq = maxVisibleDistance * maxVisibleDistance;

    turtleStatesRef.current.forEach((turtleState) => {
      // Distance culling check
      const distSq = turtleState.position.distanceToSquared(camPos);
      const isVisible = distSq <= maxDistSq;
      turtleState.group.visible = isVisible;

      // Update kinematics, steering, flipper animation, and depth
      // Turtles keep swimming across the whole river; when invisible, heavy mixer updates are skipped
      updateTurtleState(turtleState, clampedDelta, elapsedTime, spline, config, isVisible);
    });
  });

  if (!enabled) return null;

  return <group ref={rootGroupRef} name="TurtleSystemRoot" renderOrder={1} />;
};

export const TurtleSystem: React.FC<TurtleSystemProps> = (props) => {
  return (
    <Suspense fallback={null}>
      <TurtleSystemInner {...props} />
    </Suspense>
  );
};

// Preload real 3D turtle models
useGLTF.preload(DEFAULT_TURTLE_SPECIES.green_turtle.modelPath);
useGLTF.preload(DEFAULT_TURTLE_SPECIES.kemps_ridley.modelPath);
useGLTF.preload(DEFAULT_TURTLE_SPECIES.leatherback.modelPath);
useGLTF.preload(DEFAULT_TURTLE_SPECIES.hawksbill.modelPath);
