/**
 * Freshwater Fish Wildlife System - Visual Scene Component
 *
 * Standalone, reusable aquatic wildlife component for 3D rivers and lakes.
 * Follows the BirdSystem architectural pattern:
 * - Multi-species freshwater fish ecosystem (6 distinct species)
 * - Schooling coordination with non-uniform formation geometry
 * - Smooth 3D steering physics without robotic snapping
 * - Preserved realistic tail undulation & animated skeletal swimming
 */

import React, { useMemo, useRef, Suspense } from 'react';
import * as THREE from 'three';
import { useGLTF } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';

import {
  FishSpeciesId,
  FishSchoolSpec,
  DEFAULT_FISH_SPECIES,
  DEFAULT_FISH_CONFIG,
} from './fishConfig';
import {
  FishIndividualState,
  FishSchoolState,
  generateSchoolFormationOffsets,
  pickNextFishWaypoint,
  updateFishSchool,
} from './FishSwim';
import { RiverSampledPoint, getRiverProfile } from '../river/RiverFlow';
import { RiverConfig, SECTOR02_RIVER_CONFIG } from '../river/riverConfig';

export interface FishSystemProps {
  enabled?: boolean;
  spline: RiverSampledPoint[];
  config?: RiverConfig;
  schools?: FishSchoolSpec[];
  maxVisibleDistance?: number;
}

// Internal component loading GLTFs inside Suspense
const FishSystemInner: React.FC<FishSystemProps> = ({
  enabled = true,
  spline,
  config = SECTOR02_RIVER_CONFIG,
  schools = DEFAULT_FISH_CONFIG.schools,
  maxVisibleDistance = DEFAULT_FISH_CONFIG.maxVisibleDistance,
}) => {
  const rootGroupRef = useRef<THREE.Group>(null);

  // 1. Load real 3D fish assets
  const barramundiGltf = useGLTF(DEFAULT_FISH_SPECIES.barramundi.modelPath);
  const troutGltf = useGLTF(DEFAULT_FISH_SPECIES.rainbow_trout.modelPath);
  const jikinGltf = useGLTF(DEFAULT_FISH_SPECIES.jikin_carp.modelPath);
  const tosakinGltf = useGLTF(DEFAULT_FISH_SPECIES.tosakin_carp.modelPath);

  // Time uniform for continuous caudal tail wagging vertex shader
  const swimUniforms = useRef({ uTime: { value: 0 } }).current;

  // 2. Prepare vertex-animated instanced geometries & materials for Barramundi, Minnow, Dace
  const { barramundiGeom, barramundiMat, minnowMat, daceMat } = useMemo(() => {
    let geom = new THREE.BufferGeometry();
    let baseMat = new THREE.MeshStandardMaterial({
      color: '#55625c',
      roughness: 0.32,
      metalness: 0.10,
    });

    barramundiGltf.scene.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        geom = mesh.geometry.clone();
        if (mesh.material) {
          const m = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;
          baseMat = (m as THREE.MeshStandardMaterial).clone();
        }
      }
    });

    const createSwimMaterial = (tintColor?: string, customKey = 'fish_swim') => {
      const mat = baseMat.clone();
      mat.side = THREE.DoubleSide;
      mat.roughness = 0.28;
      mat.metalness = 0.12;
      mat.depthWrite = false; // Render underneath transparent water surface
      mat.depthTest = true;
      if (tintColor) {
        mat.color = new THREE.Color(tintColor);
      }

      // Preserved realistic caudal fin and spine undulation vertex shader
      mat.customProgramCacheKey = () => customKey;
      mat.onBeforeCompile = (shader) => {
        shader.uniforms.uTime = swimUniforms.uTime;
        shader.vertexShader = `
          uniform float uTime;
        ` + shader.vertexShader;

        shader.vertexShader = shader.vertexShader.replace(
          '#include <project_vertex>',
          `
          vec4 mvPosition = vec4( transformed, 1.0 );
          #ifdef USE_BATCHING
            mvPosition = batchingMatrix * mvPosition;
          #endif
          #ifdef USE_INSTANCING
            mvPosition = instanceMatrix * mvPosition;
          #endif

          // Barramundi coordinates: Nose is at Z < -0.1, Caudal tail is at Z > 0.0
          // Head stays steady to navigate; caudal peduncle and tail fin wag sideways
          float tailProg = clamp((transformed.z + 0.08) * 2.8, 0.0, 1.0);
          tailProg = tailProg * tailProg;

          #ifdef USE_INSTANCING
            float instPhase = instanceMatrix[3].x * 3.7 + instanceMatrix[3].z * 2.9;
          #else
            float instPhase = 0.0;
          #endif

          // Relaxed, natural swimming frequency
          float wag = sin(uTime * 6.5 + instPhase - transformed.z * 11.0) * tailProg * 0.065;
          mvPosition.x += wag;

          mvPosition = modelViewMatrix * mvPosition;
          gl_Position = projectionMatrix * mvPosition;
          `
        );
      };
      return mat;
    };

    return {
      barramundiGeom: geom,
      barramundiMat: createSwimMaterial(undefined, 'barramundi_swim_v2'),
      minnowMat: createSwimMaterial(DEFAULT_FISH_SPECIES.silver_minnow.colorTint, 'minnow_swim_v2'),
      daceMat: createSwimMaterial(DEFAULT_FISH_SPECIES.golden_dace.colorTint, 'dace_swim_v2'),
    };
  }, [barramundiGltf, swimUniforms]);

  // 3. Initialize animated model instances for Trout, Jikin, and Tosakin
  const animatedInstancesRef = useRef<
    Map<
      string,
      {
        group: THREE.Group;
        mixer: THREE.AnimationMixer;
      }
    >
  >(new Map());

  // 4. Initialize school states, formation offsets, and kinematics
  const schoolStates = useMemo<FishSchoolState[]>(() => {
    if (!enabled || spline.length < 4) return [];

    const result: FishSchoolState[] = [];
    const splineLen = spline.length;

    schools.forEach((spec, schoolIdx) => {
      const speciesConfig = DEFAULT_FISH_SPECIES[spec.species];
      if (!speciesConfig) return;

      const schoolSize =
        spec.size ??
        Math.floor(
          speciesConfig.schoolSize.min +
            Math.random() * (speciesConfig.schoolSize.max - speciesConfig.schoolSize.min + 1)
        );

      const direction = spec.direction ?? (schoolIdx % 2 === 0 ? 1 : -1);
      const initProgress = spec.initialProgress ?? 0.15 + (schoolIdx / schools.length) * 0.7;

      // Sample starting point on river spline
      const splineIdxFloat = Math.max(0, Math.min(0.999, initProgress)) * (splineLen - 1);
      const idx0 = Math.floor(splineIdxFloat);
      const idx1 = Math.min(splineLen - 1, idx0 + 1);
      const frac = splineIdxFloat - idx0;

      const p0 = spline[idx0];
      const p1 = spline[idx1];

      const cx = p0.x + (p1.x - p0.x) * frac;
      const cz = p0.z + (p1.z - p0.z) * frac;
      const width = p0.width + (p1.width - p0.width) * frac;
      const normalX = p0.normalX + (p1.normalX - p0.normalX) * frac;
      const normalZ = p0.normalZ + (p1.normalZ - p0.normalZ) * frac;

      const lateralJitter = ((schoolIdx * 7) % 5 - 2) * 0.08 * width;
      const px = cx + normalX * lateralJitter;
      const pz = cz + normalZ * lateralJitter;

      const profile = getRiverProfile(px, pz, config, spline);
      const bedY = profile.bedElevation;
      const surfaceY = config.waterLevel;
      const depthY = surfaceY - (surfaceY - bedY) * 0.5;

      const startPos = new THREE.Vector3(px, depthY, pz);
      const initSpeed = (speciesConfig.speed.min + speciesConfig.speed.max) * 0.5;

      const forwardX = p0.tangentX * direction;
      const forwardZ = p0.tangentZ * direction;
      const initialHeading = Math.atan2(-forwardX, -forwardZ);

      const leaderState: FishIndividualState = {
        id: `school-${schoolIdx}-leader`,
        speciesId: spec.species,
        config: speciesConfig,
        isLeader: true,
        schoolId: `school-${schoolIdx}`,
        position: startPos.clone(),
        velocity: new THREE.Vector3(forwardX * initSpeed, 0, forwardZ * initSpeed),
        targetPosition: startPos.clone(),
        formationOffset: new THREE.Vector3(0, 0, 0),
        currentHeading: initialHeading,
        currentPitch: 0,
        currentRoll: 0,
        yawVelocity: 0,
        speed: initSpeed,
        targetSpeed: initSpeed,
        splineProgress: initProgress,
        direction,
        wanderTimer: 0,
        wanderInterval: 3.5,
        phaseOffset: schoolIdx * 1.7,
      };

      const formationOffsets = generateSchoolFormationOffsets(schoolSize, speciesConfig);
      const members: FishIndividualState[] = [leaderState];

      for (let m = 1; m < schoolSize; m++) {
        const offset = formationOffsets[m];
        const memberPos = new THREE.Vector3(
          startPos.x + offset.x,
          startPos.y + offset.y,
          startPos.z + offset.z
        );

        members.push({
          id: `school-${schoolIdx}-member-${m}`,
          speciesId: spec.species,
          config: speciesConfig,
          isLeader: false,
          schoolId: `school-${schoolIdx}`,
          position: memberPos,
          velocity: new THREE.Vector3(forwardX * initSpeed, 0, forwardZ * initSpeed),
          targetPosition: memberPos.clone(),
          formationOffset: offset,
          currentHeading: initialHeading,
          currentPitch: 0,
          currentRoll: 0,
          yawVelocity: 0,
          speed: initSpeed,
          targetSpeed: initSpeed,
          splineProgress: initProgress,
          direction,
          wanderTimer: Math.random() * 2.0,
          wanderInterval: 3.0 + Math.random() * 2.0,
          phaseOffset: schoolIdx * 1.7 + m * 1.2,
        });
      }

      const nextWp = pickNextFishWaypoint(
        startPos,
        initProgress,
        direction,
        spline,
        config,
        speciesConfig
      );

      result.push({
        id: `school-${schoolIdx}`,
        speciesId: spec.species,
        config: speciesConfig,
        leader: leaderState,
        members,
        currentWaypoint: startPos.clone(),
        targetWaypoint: nextWp,
        direction,
        splineProgress: initProgress,
      });
    });

    return result;
  }, [enabled, spline, config, schools]);

  // 5. Separate fish by render technique:
  // Instanced species: barramundi, silver_minnow, golden_dace
  // Cloned species: rainbow_trout, jikin_carp, tosakin_carp
  const { instancedGroups, clonedMembers } = useMemo(() => {
    const instGroups: {
      speciesId: FishSpeciesId;
      mat: THREE.Material;
      members: FishIndividualState[];
    }[] = [
      { speciesId: 'barramundi', mat: barramundiMat, members: [] },
      { speciesId: 'silver_minnow', mat: minnowMat, members: [] },
      { speciesId: 'golden_dace', mat: daceMat, members: [] },
    ];

    const cloned: {
      member: FishIndividualState;
      gltf: typeof troutGltf;
      animClipName: string;
    }[] = [];

    schoolStates.forEach((sch) => {
      sch.members.forEach((member) => {
        const sid = member.speciesId;
        if (sid === 'barramundi') {
          instGroups[0].members.push(member);
        } else if (sid === 'silver_minnow') {
          instGroups[1].members.push(member);
        } else if (sid === 'golden_dace') {
          instGroups[2].members.push(member);
        } else if (sid === 'rainbow_trout') {
          cloned.push({ member, gltf: troutGltf, animClipName: 'Armature.001|Swim' });
        } else if (sid === 'jikin_carp') {
          cloned.push({ member, gltf: jikinGltf, animClipName: 'Scene' });
        } else if (sid === 'tosakin_carp') {
          cloned.push({ member, gltf: tosakinGltf, animClipName: 'Scene' });
        }
      });
    });

    return { instancedGroups: instGroups, clonedMembers: cloned };
  }, [schoolStates, barramundiMat, minnowMat, daceMat, troutGltf, jikinGltf, tosakinGltf]);

  // Cloned scene setup with animation mixers
  const clonedSceneObjects = useMemo(() => {
    return clonedMembers.map(({ member, gltf, animClipName }) => {
      const clonedScene = SkeletonUtils.clone(gltf.scene);
      clonedScene.scale.setScalar(member.config.scale);

      if (member.config.modelRotationOffset) {
        clonedScene.rotation.set(
          member.config.modelRotationOffset[0],
          member.config.modelRotationOffset[1],
          member.config.modelRotationOffset[2]
        );
      }

      const mixer = new THREE.AnimationMixer(clonedScene);
      let clip = gltf.animations.find((a) => a.name === animClipName);
      if (!clip && gltf.animations.length > 0) {
        clip = gltf.animations[0];
      }

      if (clip) {
        const action = mixer.clipAction(clip);
        action.timeScale = 0.85 + Math.random() * 0.35; // Individual desynchronized cadence
        mixer.setTime(Math.random() * clip.duration);
        action.play();
      }

      clonedScene.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          const mesh = child as THREE.Mesh;
          mesh.castShadow = true;
          mesh.receiveShadow = true;
          mesh.renderOrder = 1;
          if (mesh.material) {
            const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
            mats.forEach((m) => {
              m.depthWrite = false;
              m.depthTest = true;
              m.side = THREE.FrontSide;
            });
          }
        }
      });

      const group = new THREE.Group();
      group.name = `cloned-fish-${member.id}`;
      group.renderOrder = 1;
      group.add(clonedScene);

      return { member, group, mixer };
    });
  }, [clonedMembers]);

  // Keep ref updated for frame loop
  useMemo(() => {
    animatedInstancesRef.current.clear();
    clonedSceneObjects.forEach(({ member, group, mixer }) => {
      animatedInstancesRef.current.set(member.id, { group, mixer });
    });
  }, [clonedSceneObjects]);

  // Instanced meshes references
  const instancedMeshRefs = useRef<(THREE.InstancedMesh | null)[]>([]);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const _euler = useMemo(() => new THREE.Euler(), []);

  // 6. Main 60fps Frame Loop
  useFrame((state, delta) => {
    swimUniforms.uTime.value = state.clock.getElapsedTime();
    if (!enabled || spline.length < 4) return;

    // A. Update simulation kinematics for all schools
    schoolStates.forEach((school) => {
      updateFishSchool(school, delta, spline, config);
    });

    // B. Update instanced fish matrices
    instancedGroups.forEach((groupInfo, gIdx) => {
      const mesh = instancedMeshRefs.current[gIdx];
      if (!mesh) return;

      groupInfo.members.forEach((member, mIdx) => {
        dummy.position.copy(member.position);
        _euler.set(member.currentPitch, member.currentHeading, member.currentRoll, 'YXZ');
        dummy.quaternion.setFromEuler(_euler);
        dummy.scale.setScalar(member.config.scale);
        dummy.updateMatrix();

        mesh.setMatrixAt(mIdx, dummy.matrix);
      });

      mesh.instanceMatrix.needsUpdate = true;
    });

    // C. Update cloned animated fish groups and mixers (cull far-away animation updates)
    const camPos = state.camera.position;
    const maxDistSq = maxVisibleDistance * maxVisibleDistance;

    clonedSceneObjects.forEach(({ member, group, mixer }) => {
      const distSq = member.position.distanceToSquared(camPos);
      const isVisible = distSq <= maxDistSq;
      group.visible = isVisible;
      group.position.copy(member.position);

      if (isVisible) {
        mixer.update(delta);
        _euler.set(member.currentPitch, member.currentHeading, member.currentRoll, 'YXZ');
        group.quaternion.setFromEuler(_euler);
      }
    });
  });

  if (!enabled) return null;

  return (
    <group ref={rootGroupRef} name="RiverFishSystem" renderOrder={1}>
      {/* 1. High-Performance Instanced Species (Barramundi, Silver Minnow, Golden Dace) */}
      {instancedGroups.map((groupInfo, gIdx) => {
        if (groupInfo.members.length === 0) return null;
        return (
          <instancedMesh
            key={`inst-fish-${groupInfo.speciesId}`}
            ref={(el) => {
              instancedMeshRefs.current[gIdx] = el;
            }}
            args={[barramundiGeom, groupInfo.mat, groupInfo.members.length]}
            renderOrder={1}
            castShadow
            receiveShadow
          />
        );
      })}

      {/* 2. Cloned Animated Species with Moving Fins & Skeletons (Rainbow Trout, Jikin Carp, Tosakin Carp) */}
      {clonedSceneObjects.map(({ member, group }) => (
        <primitive key={`anim-fish-${member.id}`} object={group} />
      ))}
    </group>
  );
};

export const FishSystem: React.FC<FishSystemProps> = (props) => {
  return (
    <Suspense fallback={null}>
      <FishSystemInner {...props} />
    </Suspense>
  );
};

// Preload real 3D fish assets
useGLTF.preload(DEFAULT_FISH_SPECIES.barramundi.modelPath);
useGLTF.preload(DEFAULT_FISH_SPECIES.rainbow_trout.modelPath);
useGLTF.preload(DEFAULT_FISH_SPECIES.jikin_carp.modelPath);
useGLTF.preload(DEFAULT_FISH_SPECIES.tosakin_carp.modelPath);
