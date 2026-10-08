import React, { useMemo, Suspense } from 'react';
import * as THREE from 'three';
import { TEST_POND_CONFIG, getTestPondDepression } from './testPondConfig';
import { TestPondWater } from './TestPondWater';

export const TestPond: React.FC = () => {
  const { center, rimElevation, waterElevation } = TEST_POND_CONFIG;

  // 1. High-Density Sculpted Pond Basin Geometry
  // Provides fine ground curvature, natural sloped sides, and seamless terrain integration
  const basinGeometry = useMemo(() => {
    const radialSegments = 72;
    const rings = 28;
    const outerRadius = TEST_POND_CONFIG.rimRadius;
    const geom = new THREE.RingGeometry(0.001, outerRadius, radialSegments, rings);
    geom.rotateX(-Math.PI / 2);

    const pos = geom.attributes.position;
    const colors = new Float32Array(pos.count * 3);
    const uvs = geom.attributes.uv;

    for (let i = 0; i < pos.count; i++) {
      const vx = pos.getX(i);
      const vz = pos.getZ(i);

      // World coordinates
      const worldX = center[0] + vx;
      const worldZ = center[1] + vz;

      // Base terrain elevation + smooth pond depression
      const depression = getTestPondDepression(worldX, worldZ);
      const y = rimElevation + depression;
      pos.setY(i, y);

      // Generate repeat UV coordinates for fine riverbed pebble texture
      uvs.setXY(i, worldX * 0.45, worldZ * 0.45);

      // Vertex color gradient for natural wetness & depth:
      // - Submerged bottom: dark damp silt / submerged loam
      // - Waterline margin: dark wet mud / mossy earth
      // - Upper rim: blends seamlessly into playground grass/soil
      const isSubmerged = y < waterElevation;
      const depthBelowWater = Math.max(0, waterElevation - y);

      if (isSubmerged) {
        // Wet submerged basin: dark rich riverbed tones
        const depthT = Math.min(1.0, depthBelowWater / 1.15);
        colors[i * 3 + 0] = THREE.MathUtils.lerp(0.38, 0.22, depthT);
        colors[i * 3 + 1] = THREE.MathUtils.lerp(0.35, 0.20, depthT);
        colors[i * 3 + 2] = THREE.MathUtils.lerp(0.28, 0.16, depthT);
      } else {
        // Sloping bank above waterline: damp shoreline grading to playground earth
        const heightAbove = y - waterElevation;
        const bankT = Math.min(1.0, heightAbove / (rimElevation - waterElevation + 0.05));
        colors[i * 3 + 0] = THREE.MathUtils.lerp(0.40, 0.62, bankT);
        colors[i * 3 + 1] = THREE.MathUtils.lerp(0.36, 0.58, bankT);
        colors[i * 3 + 2] = THREE.MathUtils.lerp(0.28, 0.45, bankT);
      }
    }

    geom.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geom.computeVertexNormals();
    return geom;
  }, [center, rimElevation, waterElevation]);

  // 2. High-Quality Basin PBR Material with Riverbed Pebbles Textures
  const basinMaterial = useMemo(() => {
    const loader = new THREE.TextureLoader();
    const pebbleDiffuse = loader.load('/assets/environment/riverbed/ganges_pebbles_diff.jpg');
    const pebbleNormal = loader.load('/assets/environment/riverbed/ganges_pebbles_nor.jpg');
    const pebbleRough = loader.load('/assets/environment/riverbed/ganges_pebbles_rough.jpg');

    [pebbleDiffuse, pebbleNormal, pebbleRough].forEach((tex) => {
      tex.wrapS = THREE.RepeatWrapping;
      tex.wrapT = THREE.RepeatWrapping;
      tex.repeat.set(4.5, 4.5);
    });

    return new THREE.MeshStandardMaterial({
      map: pebbleDiffuse,
      normalMap: pebbleNormal,
      roughnessMap: pebbleRough,
      roughness: 0.55,
      metalness: 0.08,
      vertexColors: true,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    });
  }, []);

  // 3. Natural Shoreline River Stones & Smooth Pebbles
  // Scattered along the waterline to create an organic, realistic bank transition
  const shorelineStones = useMemo(() => {
    const stones: Array<{
      pos: [number, number, number];
      scale: [number, number, number];
      rot: [number, number, number];
      color: string;
    }> = [];

    const numStones = 26;
    for (let i = 0; i < numStones; i++) {
      const angle = (i / numStones) * Math.PI * 2 + (Math.sin(i * 3.7) * 0.15);
      const radius = TEST_POND_CONFIG.waterRadius + 0.15 + (Math.sin(i * 2.3) * 0.28);
      const x = center[0] + Math.cos(angle) * radius;
      const z = center[1] + Math.sin(angle) * radius;
      const y = rimElevation + getTestPondDepression(x, z);

      // Varying natural stone sizes and shapes
      const baseScale = 0.22 + ((i * 13) % 7) * 0.045;
      const scaleX = baseScale * (0.8 + ((i * 5) % 5) * 0.1);
      const scaleY = baseScale * 0.45;
      const scaleZ = baseScale * (0.9 + ((i * 7) % 4) * 0.12);

      // Natural river stone colors (wet basalt, granite, slate)
      const stoneColors = ['#45433f', '#3b3834', '#4e4c47', '#2e3032', '#544f47', '#383a3d'];
      const color = stoneColors[i % stoneColors.length];

      stones.push({
        pos: [x, y + scaleY * 0.35, z],
        scale: [scaleX, scaleY, scaleZ],
        rot: [Math.sin(i) * 0.2, (i * 1.6) % Math.PI, Math.cos(i) * 0.2],
        color,
      });
    }

    return stones;
  }, [center, rimElevation]);

  const stoneGeometry = useMemo(() => {
    // Smooth pebble geometry
    return new THREE.DodecahedronGeometry(1.0, 1);
  }, []);

  return (
    <group name="TestPond">
      {/* 1. Sculpted Depression Basin Lining */}
      <mesh
        position={[center[0], 0, center[1]]}
        geometry={basinGeometry}
        material={basinMaterial}
        receiveShadow
      />

      {/* 2. Natural Shoreline River Pebbles & Stones */}
      {shorelineStones.map((stone, idx) => (
        <mesh
          key={idx}
          position={stone.pos}
          scale={stone.scale}
          rotation={stone.rot}
          geometry={stoneGeometry}
          castShadow
          receiveShadow
        >
          <meshStandardMaterial
            color={stone.color}
            roughness={0.42}
            metalness={0.05}
          />
        </mesh>
      ))}

      {/* 3. High-Quality Three.js Realistic Water Surface */}
      <Suspense fallback={null}>
        <TestPondWater />
      </Suspense>
    </group>
  );
};
