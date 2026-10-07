/**
 * River System - Reusable 3D Scene Component
 *
 * Standalone, physically-grounded river waterway component.
 * Features:
 * - Dynamic Water System (surface refraction, Snell window, riverbed caustics)
 * - Real Scanned Riverbed Environment from CC0 PBR Assets:
 *   1. Large Smooth River Boulders (embedded naturally in riverbed sand)
 *   2. Medium Smooth River Stones
 *   3. Small Rounded River Pebbles & Gravel Clusters
 *   4. Aquatic Freshwater Grass & Sprout Clumps (tall along banks, sprouts on gravel)
 */

import React, { useMemo, useCallback, useRef, useLayoutEffect, Suspense } from 'react';
import * as THREE from 'three';
import { useGLTF } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';

import { RiverConfig, SECTOR02_RIVER_CONFIG } from './riverConfig';
import {
  getSector02RiverSpline,
  sampleRiverSpline,
  RiverSampledPoint,
  buildRiverWaterGeometry,
  getRiverProfile,
} from './RiverFlow';
import { WaterSystem } from '../water/WaterSystem';
import { WaterConfig } from '../water/WaterConfig';
import { TurtleSystem } from '../turtles';
import { FishSystem } from '../fish';

export interface RiverSystemProps {
  config?: RiverConfig;
  renderStones?: boolean;
}

interface InstancedCollectionProps {
  geometry: THREE.BufferGeometry;
  material: THREE.Material;
  matrices: THREE.Matrix4[];
  castShadow?: boolean;
  receiveShadow?: boolean;
}

const InstancedCollection: React.FC<InstancedCollectionProps> = ({
  geometry,
  material,
  matrices,
  castShadow = false,
  receiveShadow = true,
}) => {
  const meshRef = useRef<THREE.InstancedMesh>(null);

  useLayoutEffect(() => {
    if (!meshRef.current || matrices.length === 0) return;
    for (let i = 0; i < matrices.length; i++) {
      meshRef.current.setMatrixAt(i, matrices[i]);
    }
    meshRef.current.instanceMatrix.needsUpdate = true;
  }, [matrices]);

  if (matrices.length === 0) return null;

  return (
    <instancedMesh
      ref={meshRef}
      args={[geometry, material, matrices.length]}
      castShadow={castShadow}
      receiveShadow={receiveShadow}
    />
  );
};

/**
 * Real Scanned Riverbed 3D Assets (Poly Haven CC0):
 * - Large water-worn river boulders
 * - Medium smooth river stones
 * - Small rounded river pebbles
 * - Aquatic freshwater river grass and sprouts
 */
const RealisticRiverbedEnvironment: React.FC<{
  spline: RiverSampledPoint[];
  config: RiverConfig;
}> = ({ spline, config }) => {
  const boulderGltf = useGLTF('/assets/environment/riverbed/river_boulder.glb');
  const stonesGltf = useGLTF('/assets/environment/riverbed/river_stones.glb');
  const grassGltf = useGLTF('/assets/environment/river/grass/aquatic_grass.glb');

  // Lightweight time uniform for smooth continuous underwater current undulations
  const grassUniforms = useRef({ uTime: { value: 0 } }).current;
  useFrame((state) => {
    grassUniforms.uTime.value = state.clock.getElapsedTime();
  });

  // 1. Boulder Geometry & Material
  const boulderGeom = useMemo(() => {
    const mesh = boulderGltf.scene.getObjectByName('stone_01') as THREE.Mesh | undefined;
    if (!mesh) return new THREE.BufferGeometry();
    const g = mesh.geometry.clone();
    g.center();
    return g;
  }, [boulderGltf]);

  const boulderMat = useMemo(() => {
    const mesh = boulderGltf.scene.getObjectByName('stone_01') as THREE.Mesh | undefined;
    if (!mesh) return new THREE.MeshStandardMaterial({ color: '#7a766c', roughness: 0.75 });
    const mat = (mesh.material as THREE.MeshStandardMaterial).clone();
    mat.roughness = 0.72;
    mat.metalness = 0.02;
    return mat;
  }, [boulderGltf]);

  // 2. Stone Geometries & Material (5 distinct scanned shapes)
  const stoneGeoms = useMemo(() => {
    const letters = ['a', 'b', 'c', 'd', 'e'];
    return letters.map((l) => {
      const mesh = stonesGltf.scene.getObjectByName(`namaqualand_stones_01_${l}`) as THREE.Mesh | undefined;
      if (!mesh) return new THREE.BufferGeometry();
      const g = mesh.geometry.clone();
      g.center();
      return g;
    });
  }, [stonesGltf]);

  const stonesMat = useMemo(() => {
    const mesh = stonesGltf.scene.getObjectByName('namaqualand_stones_01_a') as THREE.Mesh | undefined;
    if (!mesh) return new THREE.MeshStandardMaterial({ color: '#68645b', roughness: 0.72 });
    const mat = (mesh.material as THREE.MeshStandardMaterial).clone();
    mat.roughness = 0.70;
    mat.metalness = 0.02;
    return mat;
  }, [stonesGltf]);

  // 3. Realistic Scanned Aquatic Grass Geometries & Material
  const { grassGeoms, grassMat } = useMemo(() => {
    let baseGeom: THREE.BufferGeometry | null = null;
    let baseMat: THREE.Material | null = null;

    grassGltf.scene.traverse((child) => {
      if (!baseGeom && (child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        baseGeom = mesh.geometry.clone();
        if (mesh.material) {
          baseMat = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;
        }
      }
    });

    const targetGeom = (baseGeom ?? new THREE.BufferGeometry()).clone();
    targetGeom.computeBoundingBox();
    const bb = targetGeom.boundingBox;
    if (bb) {
      const cx = (bb.min.x + bb.max.x) * 0.5;
      const cz = (bb.min.z + bb.max.z) * 0.5;
      // Anchor root base firmly at substrate elevation (y = 0)
      targetGeom.translate(-cx, -bb.min.y, -cz);
    }

    // Three distinct realistic size/aspect variations from the real 3D blades
    // 0: Tall dense riverbank eelgrass ribbons
    const geomTall = targetGeom.clone();
    geomTall.scale(1.15, 1.35, 1.15);

    // 1: Medium riverbed cluster
    const geomMid = targetGeom.clone();
    geomMid.scale(0.95, 0.95, 0.95);

    // 2: Small gravel sprouts
    const geomSprout = targetGeom.clone();
    geomSprout.scale(0.75, 0.65, 0.75);

    const mat = baseMat && (baseMat as THREE.MeshStandardMaterial).isMeshStandardMaterial
      ? (baseMat as THREE.MeshStandardMaterial).clone()
      : new THREE.MeshStandardMaterial({ color: '#3ea82a', roughness: 0.45 });

    mat.side = THREE.DoubleSide;
    mat.roughness = 0.38;
    mat.metalness = 0.02;
    // Submerged freshwater lush aquatic green tint matching reference 2 & 3
    mat.color = new THREE.Color('#3ea82a');

    // Realistic continuous underwater river current sway vertex animation
    mat.customProgramCacheKey = () => 'aquatic_river_grass_sway_v5';
    mat.onBeforeCompile = (shader) => {
      shader.uniforms.uTime = grassUniforms.uTime;
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

        // Height above root (transformed.y = 0.0 at bed substrate)
        float bladeHeight = max(0.0, transformed.y);
        // Quadratic bending: 0.0 at base firmly rooted in gravel, progressively stronger toward blade tips
        float swayWeight = clamp(bladeHeight / 1.6, 0.0, 1.0);
        swayWeight = swayWeight * swayWeight;

        #ifdef USE_INSTANCING
          vec3 worldClusterPos = (modelMatrix * vec4(instanceMatrix[3].xyz, 1.0)).xyz;
        #else
          vec3 worldClusterPos = (modelMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
        #endif

        // Natural continuous multi-frequency underwater current undulation
        float phase = worldClusterPos.x * 0.42 + worldClusterPos.z * 0.36 + transformed.x * 3.8;
        float t = uTime * 1.35;
        float wave1 = sin(t + phase) * 0.18;
        float wave2 = sin(t * 1.8 + phase * 1.4) * 0.09;
        float wave3 = cos(t * 0.65 + phase * 0.7) * 0.12;

        // River current flows Southeast along (0.78, -0.62)
        vec2 flowDir = vec2(0.78, -0.62);
        vec2 flowCross = vec2(0.62, 0.78);
        vec2 currentSway = flowDir * (0.20 + wave1 + wave3) + flowCross * wave2;

        // Sway along current direction + natural vertical dip as flexible blade bends
        mvPosition.x += currentSway.x * swayWeight * 0.40;
        mvPosition.z += currentSway.y * swayWeight * 0.40;
        mvPosition.y -= dot(currentSway, currentSway) * swayWeight * 0.12;

        mvPosition = modelViewMatrix * mvPosition;
        gl_Position = projectionMatrix * mvPosition;
        `
      );
    };

    return {
      grassGeoms: [geomTall, geomMid, geomSprout],
      grassMat: mat,
    };
  }, [grassGltf, grassUniforms]);

  // Boulders: 1 every 7 segments (approx 24 smooth river boulders along the channel)
  const boulderMatrices = useMemo(() => {
    const mats: THREE.Matrix4[] = [];
    const dummy = new THREE.Object3D();
    const n = spline.length;

    for (let sIdx = 3; sIdx < n - 4; sIdx += 7) {
      const pt = spline[sIdx];
      const side = (sIdx % 2 === 0) ? 1 : -1;
      const crossRatio = 0.15 + ((sIdx * 7) % 5) * 0.10;
      const halfW = pt.width * 0.5;
      const offset = side * (halfW * crossRatio);

      const px = pt.x + pt.normalX * offset;
      const pz = pt.z + pt.normalZ * offset;
      const profile = getRiverProfile(px, pz, config, spline);
      const bedY = profile.bedElevation;

      const scaleUniform = 8.5 + ((sIdx * 3) % 5) * 1.3;
      const sx = scaleUniform * (0.95 + ((sIdx * 5) % 3) * 0.12);
      const sy = scaleUniform * (0.55 + ((sIdx * 7) % 3) * 0.08); // Flattened water-worn
      const sz = scaleUniform * (0.90 + ((sIdx * 11) % 4) * 0.10);

      const embedDepth = 0.12 + ((sIdx * 4) % 4) * 0.05;
      const py = bedY - embedDepth;

      dummy.position.set(px, py, pz);
      dummy.rotation.set(
        ((sIdx * 7) % 5 - 2) * 0.05,
        sIdx * 1.45,
        ((sIdx * 11) % 5 - 2) * 0.05
      );
      dummy.scale.set(sx, sy, sz);
      dummy.updateMatrix();
      mats.push(dummy.matrix.clone());
    }
    return mats;
  }, [spline, config]);

  // Medium stones: 1 every 2 segments across 3 geometries (~90 medium stones)
  const mediumStoneMatrices = useMemo(() => {
    const dummy = new THREE.Object3D();
    const n = spline.length;
    const matsA: THREE.Matrix4[] = [];
    const matsB: THREE.Matrix4[] = [];
    const matsC: THREE.Matrix4[] = [];
    const allMats = [matsA, matsB, matsC];

    for (let sIdx = 2; sIdx < n - 3; sIdx += 2) {
      const typeIdx = (sIdx / 2) % 3;
      const pt = spline[sIdx];
      const side = (sIdx % 4 < 2) ? 1 : -1;
      const crossRatio = 0.12 + ((sIdx * 7) % 7) * 0.10;
      const halfW = pt.width * 0.5;
      const offset = side * (halfW * crossRatio);

      const px = pt.x + pt.normalX * offset;
      const pz = pt.z + pt.normalZ * offset;
      const profile = getRiverProfile(px, pz, config, spline);
      const bedY = profile.bedElevation;

      const baseScale = 3.8 + ((sIdx * 5) % 5) * 0.55;
      const sx = baseScale * (0.90 + ((sIdx * 3) % 3) * 0.10);
      const sy = baseScale * (0.65 + ((sIdx * 7) % 3) * 0.10);
      const sz = baseScale * (0.90 + ((sIdx * 11) % 3) * 0.10);

      const py = bedY - 0.04;
      dummy.position.set(px, py, pz);
      dummy.rotation.set(
        ((sIdx * 3) % 5 - 2) * 0.08,
        sIdx * 1.62,
        ((sIdx * 5) % 5 - 2) * 0.08
      );
      dummy.scale.set(sx, sy, sz);
      dummy.updateMatrix();
      allMats[typeIdx].push(dummy.matrix.clone());
    }
    return allMats;
  }, [spline, config]);

  // Small pebbles: 2 per segment across 2 geometries (~350 pebbles)
  const smallPebbleMatrices = useMemo(() => {
    const dummy = new THREE.Object3D();
    const n = spline.length;
    const matsD: THREE.Matrix4[] = [];
    const matsE: THREE.Matrix4[] = [];
    const allMats = [matsD, matsE];

    for (let sIdx = 2; sIdx < n - 3; sIdx++) {
      for (let p = 0; p < 2; p++) {
        const typeIdx = (sIdx + p) % 2;
        const pt = spline[sIdx];
        const side = (p === 0) ? 1 : -1;
        const crossRatio = 0.05 + ((sIdx * 7 + p * 13) % 17) * 0.05;
        const halfW = pt.width * 0.5;
        const offset = side * (halfW * crossRatio);

        const px = pt.x + pt.normalX * offset;
        const pz = pt.z + pt.normalZ * offset;
        const profile = getRiverProfile(px, pz, config, spline);
        const bedY = profile.bedElevation;

        const baseScale = 1.2 + ((sIdx * 3 + p * 5) % 6) * 0.22;
        const sx = baseScale * (0.85 + ((sIdx * 2) % 3) * 0.15);
        const sy = baseScale * (0.60 + ((sIdx * 4) % 3) * 0.15);
        const sz = baseScale * (0.85 + ((sIdx * 6) % 3) * 0.15);

        const py = bedY - 0.02;
        dummy.position.set(px, py, pz);
        dummy.rotation.set(
          ((sIdx * 7) % 5 - 2) * 0.10,
          sIdx * 2.1 + p * 1.5,
          ((sIdx * 9) % 5 - 2) * 0.10
        );
        dummy.scale.set(sx, sy, sz);
        dummy.updateMatrix();
        allMats[typeIdx].push(dummy.matrix.clone());
      }
    }
    return allMats;
  }, [spline, config]);

  // Noticeably dense aquatic grass along shallow edges + natural riverbed patches
  const grassMatrices = useMemo(() => {
    const dummy = new THREE.Object3D();
    const n = spline.length;
    // 0: Tall bank ribbons, 1: Mid riverbed clusters, 2: Gravel sprouts
    const mats: THREE.Matrix4[][] = [[], [], []];

    for (let sIdx = 2; sIdx < n - 3; sIdx++) {
      const pt = spline[sIdx];
      const halfW = pt.width * 0.5;

      // 1. Noticeably dense aquatic eelgrass along Left Bank / shallows (3 staggered clumps)
      const leftCrossRatios = [0.50, 0.63, 0.75];
      for (let k = 0; k < 3; k++) {
        const crossRatio = leftCrossRatios[k] + ((sIdx * 7 + k * 11) % 5) * 0.02;
        const alongJitter = ((sIdx * 3 + k * 7) % 5 - 2) * 0.35;
        const px = pt.x + pt.normalX * (halfW * crossRatio) + pt.tangentX * alongJitter;
        const pz = pt.z + pt.normalZ * (halfW * crossRatio) + pt.tangentZ * alongJitter;
        const bedY = getRiverProfile(px, pz, config, spline).bedElevation;

        const scaleY = 1.9 + ((sIdx * 5 + k * 3) % 4) * 0.22;
        const scaleXZ = 1.6 + ((sIdx * 3 + k * 5) % 3) * 0.18;

        dummy.position.set(px, bedY - 0.04, pz);
        dummy.rotation.set(0, sIdx * 1.3 + k * 1.8, 0);
        dummy.scale.set(scaleXZ, scaleY, scaleXZ);
        dummy.updateMatrix();
        mats[0].push(dummy.matrix.clone());
      }

      // 2. Noticeably dense aquatic eelgrass along Right Bank / shallows (3 staggered clumps)
      const rightCrossRatios = [0.50, 0.63, 0.75];
      for (let k = 0; k < 3; k++) {
        const crossRatio = rightCrossRatios[k] + ((sIdx * 11 + k * 13) % 5) * 0.02;
        const alongJitter = ((sIdx * 7 + k * 3) % 5 - 2) * 0.35;
        const px = pt.x - pt.normalX * (halfW * crossRatio) + pt.tangentX * alongJitter;
        const pz = pt.z - pt.normalZ * (halfW * crossRatio) + pt.tangentZ * alongJitter;
        const bedY = getRiverProfile(px, pz, config, spline).bedElevation;

        const scaleY = 1.9 + ((sIdx * 7 + k * 5) % 4) * 0.22;
        const scaleXZ = 1.6 + ((sIdx * 2 + k * 7) % 3) * 0.18;

        dummy.position.set(px, bedY - 0.04, pz);
        dummy.rotation.set(0, sIdx * 1.7 + k * 2.1 + Math.PI, 0);
        dummy.scale.set(scaleXZ, scaleY, scaleXZ);
        dummy.updateMatrix();
        mats[0].push(dummy.matrix.clone());
      }

      // 3. Natural riverbed center patches (scattered every 2 segments, less dense in open water)
      if (sIdx % 2 === 0) {
        const side = (sIdx % 4 < 2) ? 1 : -1;
        const crossRatio = 0.08 + ((sIdx * 13) % 6) * 0.05;
        const px = pt.x + pt.normalX * (side * halfW * crossRatio);
        const pz = pt.z + pt.normalZ * (side * halfW * crossRatio);
        const bedY = getRiverProfile(px, pz, config, spline).bedElevation;

        const gType = (sIdx % 4 === 0) ? 1 : 2; // Mid clump or tiny gravel sprout
        const scaleY = gType === 1 ? (1.3 + ((sIdx * 3) % 3) * 0.18) : (0.95 + ((sIdx * 5) % 3) * 0.15);
        const scaleXZ = gType === 1 ? (1.2 + ((sIdx * 5) % 3) * 0.15) : (0.90 + ((sIdx * 2) % 3) * 0.12);

        dummy.position.set(px, bedY - 0.03, pz);
        dummy.rotation.set(0, sIdx * 2.3, 0);
        dummy.scale.set(scaleXZ, scaleY, scaleXZ);
        dummy.updateMatrix();
        mats[gType].push(dummy.matrix.clone());
      }
    }
    return mats;
  }, [spline, config]);

  return (
    <group name="RealisticRiverbedAssets">
      {/* 1. Large Smooth River Boulders (Reference 1 & 2) */}
      <InstancedCollection
        geometry={boulderGeom}
        material={boulderMat}
        matrices={boulderMatrices}
        castShadow
        receiveShadow
      />

      {/* 2. Medium River Stones (a, b, c) */}
      {mediumStoneMatrices.map((mats, i) => (
        <InstancedCollection
          key={`med-stone-${i}`}
          geometry={stoneGeoms[i]}
          material={stonesMat}
          matrices={mats}
          castShadow
          receiveShadow
        />
      ))}

      {/* 3. Small Rounded Pebbles & Gravel (d, e) */}
      {smallPebbleMatrices.map((mats, i) => (
        <InstancedCollection
          key={`pebble-${i}`}
          geometry={stoneGeoms[i + 3]}
          material={stonesMat}
          matrices={mats}
          castShadow
          receiveShadow
        />
      ))}

      {/* 4. Natural Dense Aquatic River Grass & Vegetation */}
      {grassMatrices.map((mats, i) => (
        <InstancedCollection
          key={`grass-${i}`}
          geometry={grassGeoms[i]}
          material={grassMat}
          matrices={mats}
          receiveShadow
        />
      ))}
    </group>
  );
};

export const RiverSystem: React.FC<RiverSystemProps> = ({
  config = SECTOR02_RIVER_CONFIG,
  renderStones = true,
}) => {
  const spline = useMemo(() => {
    return config.id === SECTOR02_RIVER_CONFIG.id
      ? getSector02RiverSpline()
      : sampleRiverSpline(config);
  }, [config]);

  // High-resolution continuous water ribbon geometry following the river spline
  const waterGeom = useMemo(() => {
    return buildRiverWaterGeometry(config, spline);
  }, [config, spline]);

  // Derived WaterConfig for the reusable WaterSystem
  const waterConfig: WaterConfig = useMemo(() => ({
    id: config.id,
    name: config.name,
    type: 'river',
    waterLevel: config.waterLevel,
    flowSpeed: config.flowSpeed,
    waveScale: 1.8,
    waveSpeed: 0.8,
    waveHeight: 0.045,
    roughness: 0.08,
    fresnelPower: 3.5,
    opacity: 0.82,
    causticsIntensity: 0.85,
    underwaterFogNear: 1.5,
    underwaterFogFar: 24.0,
    colors: {
      shallow: config.waterColor.shallow,
      deep: config.waterColor.deep,
      highlight: config.waterColor.highlight,
      sunGlint: '#ffffff',
      underwaterFog: '#0c6470', // Clear tropical freshwater blue-green / teal
      causticColor: '#8cf5ff',
    },
  }), [config]);

  // Exact river bounds test for camera immersion detection
  const isCameraUnderwater = useCallback((camPos: THREE.Vector3) => {
    if (camPos.y > config.waterLevel) return false;
    const profile = getRiverProfile(camPos.x, camPos.z, config, spline);
    return profile.isInsideRiver || (profile.isInsideBank && camPos.y < config.waterLevel);
  }, [config, spline]);

  return (
    <group name={`RiverSystem-${config.id}`}>
      {/* Reusable Water System: WaterSurface + Riverbed Caustics + Underwater Fog + God Rays */}
      <WaterSystem
        config={waterConfig}
        geometry={waterGeom}
        spline={spline}
        isCameraUnderwaterFn={isCameraUnderwater}
      />

      {/* Real 3D Riverbed Environment (Scanned Boulders, Medium Stones, Small Pebbles, Dense Aquatic Grass) */}
      {renderStones && (
        <Suspense fallback={null}>
          <RealisticRiverbedEnvironment spline={spline} config={config} />
        </Suspense>
      )}

      {/* Realistic Aquatic Wildlife (Turtle System & Freshwater Fish System) */}
      <Suspense fallback={null}>
        <TurtleSystem spline={spline} config={config} />
        <FishSystem spline={spline} config={config} />
      </Suspense>
    </group>
  );
};

useGLTF.preload('/assets/environment/riverbed/river_boulder.glb');
useGLTF.preload('/assets/environment/riverbed/river_stones.glb');
useGLTF.preload('/assets/environment/river/grass/aquatic_grass.glb');
useGLTF.preload('/assets/environment/river/turtles/green_turtle.glb');
useGLTF.preload('/assets/environment/river/fish/river_fish.glb');
