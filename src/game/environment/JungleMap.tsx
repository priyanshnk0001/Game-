import React, { useMemo } from 'react';
import * as THREE from 'three';

// Procedural texture generators for Jungle Environment
function createJungleDirtTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  // Base dirt tone
  ctx.fillStyle = '#1e2417';
  ctx.fillRect(0, 0, 512, 512);

  // Moss and loam patches
  for (let i = 0; i < 800; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    const r = 4 + Math.random() * 24;
    const isMoss = Math.random() > 0.45;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = isMoss
      ? `rgba(${25 + Math.random() * 35}, ${55 + Math.random() * 45}, ${20 + Math.random() * 25}, 0.22)`
      : `rgba(${45 + Math.random() * 25}, ${35 + Math.random() * 20}, ${20 + Math.random() * 15}, 0.18)`;
    ctx.fill();
  }

  // Fine soil noise
  const imgData = ctx.getImageData(0, 0, 512, 512);
  const d = imgData.data;
  for (let i = 0; i < d.length; i += 4) {
    const n = (Math.random() - 0.5) * 16;
    d[i] = Math.min(255, Math.max(0, d[i] + n));
    d[i + 1] = Math.min(255, Math.max(0, d[i + 1] + n));
    d[i + 2] = Math.min(255, Math.max(0, d[i + 2] + n));
  }
  ctx.putImageData(imgData, 0, 0);

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(16, 16);
  return tex;
}

function createTreeBarkTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#2c221b';
  ctx.fillRect(0, 0, 256, 512);

  // Vertical bark fissures
  for (let x = 0; x < 256; x += 4) {
    ctx.strokeStyle = Math.random() > 0.5 ? '#1a1410' : '#3d3025';
    ctx.lineWidth = 1 + Math.random() * 2.5;
    ctx.beginPath();
    ctx.moveTo(x + (Math.random() - 0.5) * 6, 0);
    ctx.bezierCurveTo(
      x + (Math.random() - 0.5) * 10,
      170,
      x + (Math.random() - 0.5) * 10,
      340,
      x + (Math.random() - 0.5) * 6,
      512
    );
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2, 4);
  return tex;
}

// Procedural Jungle Tree with detailed multi-canopy foliage
const JungleTree: React.FC<{
  position: [number, number, number];
  height?: number;
  scale?: number;
  barkMaterial: THREE.Material;
  leafMaterial: THREE.Material;
}> = ({ position, height = 6.5, scale = 1.0, barkMaterial, leafMaterial }) => {
  return (
    <group position={position} scale={[scale, scale, scale]}>
      {/* Main Trunk */}
      <mesh position={[0, height / 2, 0]} castShadow receiveShadow material={barkMaterial}>
        <cylinderGeometry args={[0.38, 0.52, height, 10]} />
      </mesh>
      {/* Buttress Roots */}
      {[0, Math.PI / 2, Math.PI, (Math.PI * 3) / 2].map((angle, i) => (
        <mesh
          key={i}
          position={[Math.cos(angle) * 0.45, 0.4, Math.sin(angle) * 0.45]}
          rotation={[0, angle, 0.3]}
          castShadow
          material={barkMaterial}
        >
          <boxGeometry args={[0.3, 0.9, 0.3]} />
        </mesh>
      ))}
      {/* Canopy Clusters (Lush volumetric layered foliage) */}
      <group position={[0, height - 0.8, 0]}>
        <mesh position={[0, 0.8, 0]} castShadow material={leafMaterial}>
          <dodecahedronGeometry args={[2.4, 1]} />
        </mesh>
        <mesh position={[-1.2, 0.2, 0.8]} castShadow material={leafMaterial}>
          <dodecahedronGeometry args={[1.8, 1]} />
        </mesh>
        <mesh position={[1.3, 0.3, -0.7]} castShadow material={leafMaterial}>
          <dodecahedronGeometry args={[1.9, 1]} />
        </mesh>
        <mesh position={[0.5, 1.8, 0.4]} castShadow material={leafMaterial}>
          <dodecahedronGeometry args={[1.6, 1]} />
        </mesh>
      </group>
    </group>
  );
};

// Mossy Jungle Boulder
const MossyBoulder: React.FC<{
  position: [number, number, number];
  size: [number, number, number];
  rotationY?: number;
  material: THREE.Material;
}> = ({ position, size, rotationY = 0, material }) => {
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      {/* Main Boulder Mass */}
      <mesh castShadow receiveShadow material={material}>
        <dodecahedronGeometry args={[size[0] / 2, 2]} />
      </mesh>
      {/* Base embedding stones */}
      <mesh position={[size[0] * 0.3, -size[1] * 0.3, size[2] * 0.2]} castShadow material={material}>
        <dodecahedronGeometry args={[size[0] * 0.25, 1]} />
      </mesh>
    </group>
  );
};

// Fallen Giant Log Barrier
const FallenLog: React.FC<{
  position: [number, number, number];
  length: number;
  rotationY?: number;
  barkMaterial: THREE.Material;
}> = ({ position, length, rotationY = 0, barkMaterial }) => {
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      {/* Horizontal Fallen Trunk */}
      <mesh rotation={[0, 0, Math.PI / 2]} castShadow receiveShadow material={barkMaterial}>
        <cylinderGeometry args={[0.45, 0.55, length, 12]} />
      </mesh>
      {/* Mossy bark stumps */}
      <mesh position={[-length * 0.35, 0.3, 0.2]} rotation={[0.4, 0.2, 0]} castShadow material={barkMaterial}>
        <cylinderGeometry args={[0.15, 0.2, 0.7, 8]} />
      </mesh>
    </group>
  );
};

// Wooden Palisade Stockade Rampart
const PalisadeWall: React.FC<{
  position: [number, number, number];
  length: number;
  height: number;
  isPerimeter?: boolean;
  material: THREE.Material;
}> = ({ position, length, height, isPerimeter = false, material }) => {
  return (
    <group position={position}>
      <mesh position={[0, height / 2, 0]} castShadow receiveShadow material={material}>
        <boxGeometry args={[length, height, 0.8]} />
      </mesh>
      {/* Pointed stake tops on top of the palisade */}
      {!isPerimeter && (
        <mesh position={[0, height + 0.25, 0]} castShadow material={material}>
          <coneGeometry args={[0.3, 0.6, 6]} />
        </mesh>
      )}
    </group>
  );
};

// Jungle Watchtower Structure
const JungleWatchtower: React.FC<{
  position: [number, number, number];
  rotationY?: number;
  woodMaterial: THREE.Material;
}> = ({ position, rotationY = 0, woodMaterial }) => {
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      {/* 4 Corner Stilt Legs */}
      {[-1.8, 1.8].map((x, xi) =>
        [-1.8, 1.8].map((z, zi) => (
          <mesh key={`${xi}-${zi}`} position={[x, 2.5, z]} castShadow material={woodMaterial}>
            <cylinderGeometry args={[0.16, 0.2, 5.0, 8]} />
          </mesh>
        ))
      )}
      {/* Cross bracing */}
      <mesh position={[0, 2.0, -1.8]} rotation={[0, 0, 0.3]} castShadow material={woodMaterial}>
        <boxGeometry args={[3.8, 0.12, 0.12]} />
      </mesh>
      <mesh position={[0, 2.0, 1.8]} rotation={[0, 0, -0.3]} castShadow material={woodMaterial}>
        <boxGeometry args={[3.8, 0.12, 0.12]} />
      </mesh>
      {/* Elevated Platform */}
      <mesh position={[0, 4.2, 0]} castShadow receiveShadow material={woodMaterial}>
        <boxGeometry args={[4.2, 0.25, 4.2]} />
      </mesh>
      {/* Guard Railings */}
      <mesh position={[0, 4.7, 1.95]} castShadow material={woodMaterial}>
        <boxGeometry args={[4.0, 0.7, 0.1]} />
      </mesh>
      <mesh position={[0, 4.7, -1.95]} castShadow material={woodMaterial}>
        <boxGeometry args={[4.0, 0.7, 0.1]} />
      </mesh>
      {/* Tower Roof */}
      <mesh position={[0, 5.6, 0]} castShadow material={woodMaterial}>
        <coneGeometry args={[3.2, 1.2, 4]} />
      </mesh>
    </group>
  );
};

export const JungleMap: React.FC = () => {
  // PBR and stylized tactical materials
  const materials = useMemo(() => {
    const dirtTex = createJungleDirtDirt();
    const barkTex = createTreeBarkTexture();

    function createJungleDirtDirt() {
      return createJungleDirtTexture();
    }

    const ground = new THREE.MeshStandardMaterial({
      map: dirtTex,
      roughness: 0.88,
      metalness: 0.05,
    });

    const bark = new THREE.MeshStandardMaterial({
      map: barkTex,
      roughness: 0.92,
      metalness: 0.02,
      color: '#382a1d',
    });

    const leaves = new THREE.MeshStandardMaterial({
      color: '#1a532d',
      roughness: 0.65,
      metalness: 0.05,
      flatShading: true,
    });

    const mossyStone = new THREE.MeshStandardMaterial({
      color: '#3b4a36',
      roughness: 0.9,
      metalness: 0.1,
      flatShading: true,
    });

    const weatheredWood = new THREE.MeshStandardMaterial({
      color: '#423326',
      roughness: 0.85,
      metalness: 0.05,
    });

    const camoCrate = new THREE.MeshStandardMaterial({
      color: '#283618',
      roughness: 0.7,
      metalness: 0.2,
    });

    return { ground, bark, leaves, mossyStone, weatheredWood, camoCrate };
  }, []);

  return (
    <group name="JungleMapEnvironment">
      {/* 1. Main Jungle Loam / Dirt Ground Plane */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow material={materials.ground}>
        <planeGeometry args={[56, 56, 32, 32]} />
      </mesh>

      {/* 2. Outer Palisade Fortification Walls (North, South, West, East) */}
      <PalisadeWall position={[0, 0, -28]} length={56} height={3.8} isPerimeter material={materials.weatheredWood} />
      <PalisadeWall position={[0, 0, 28]} length={56} height={3.8} isPerimeter material={materials.weatheredWood} />
      <group rotation={[0, Math.PI / 2, 0]}>
        <PalisadeWall position={[0, 0, -28]} length={56} height={3.8} isPerimeter material={materials.weatheredWood} />
        <PalisadeWall position={[0, 0, 28]} length={56} height={3.8} isPerimeter material={materials.weatheredWood} />
      </group>

      {/* 3. Central Ancient Moss Shrine Ruins */}
      <group position={[0, 0, 0]}>
        {/* Stepped Stone Dais */}
        <mesh position={[0, 0.3, 0]} castShadow receiveShadow material={materials.mossyStone}>
          <boxGeometry args={[5.2, 0.6, 5.2]} />
        </mesh>
        <mesh position={[0, 0.75, 0]} castShadow receiveShadow material={materials.mossyStone}>
          <boxGeometry args={[4.0, 0.3, 4.0]} />
        </mesh>
        {/* Weathered Monolith Pillars */}
        <mesh position={[-2.0, 2.0, -2.0]} castShadow receiveShadow material={materials.mossyStone}>
          <boxGeometry args={[0.9, 4.0, 0.9]} />
        </mesh>
        <mesh position={[2.0, 2.0, 2.0]} castShadow receiveShadow material={materials.mossyStone}>
          <boxGeometry args={[0.9, 4.0, 0.9]} />
        </mesh>
        {/* Broken Cross-Lintel Beam */}
        <mesh position={[0, 3.8, 0]} rotation={[0, Math.PI / 4, 0.05]} castShadow material={materials.mossyStone}>
          <boxGeometry args={[5.2, 0.6, 1.2]} />
        </mesh>
      </group>

      {/* 4. Massive Mossy Boulders (Matching JUNGLE_OPS_OBSTACLES) */}
      <MossyBoulder position={[-10, 1.4, -10]} size={[4.2, 2.8, 3.8]} rotationY={0.4} material={materials.mossyStone} />
      <MossyBoulder position={[10, 1.4, 10]} size={[4.4, 2.8, 4.0]} rotationY={-0.3} material={materials.mossyStone} />
      <MossyBoulder position={[11, 1.2, -9]} size={[3.6, 2.4, 3.4]} rotationY={0.8} material={materials.mossyStone} />
      <MossyBoulder position={[-11, 1.2, 9]} size={[3.8, 2.4, 3.6]} rotationY={-0.6} material={materials.mossyStone} />

      {/* 5. Fallen Hardwood Tree Trunks (Barriers) */}
      <FallenLog position={[0, 0.5, -6.5]} length={6.8} rotationY={0.15} barkMaterial={materials.bark} />
      <FallenLog position={[0, 0.5, 6.5]} length={6.8} rotationY={-0.15} barkMaterial={materials.bark} />
      <FallenLog position={[-7.5, 0.5, 1.5]} length={5.4} rotationY={1.4} barkMaterial={materials.bark} />
      <FallenLog position={[7.5, 0.5, -1.5]} length={5.4} rotationY={1.4} barkMaterial={materials.bark} />

      {/* 6. Wooden Jungle Watchtowers */}
      <JungleWatchtower position={[-17, 0, -12]} rotationY={0.1} woodMaterial={materials.weatheredWood} />
      <JungleWatchtower position={[17, 0, 12]} rotationY={-0.1} woodMaterial={materials.weatheredWood} />

      {/* 7. Tactical Palisade Stockades */}
      <group position={[-16, 1.1, 0]}>
        <mesh castShadow receiveShadow material={materials.weatheredWood}>
          <boxGeometry args={[1.0, 2.2, 6.0]} />
        </mesh>
      </group>
      <group position={[16, 1.1, 0]}>
        <mesh castShadow receiveShadow material={materials.weatheredWood}>
          <boxGeometry args={[1.0, 2.2, 6.0]} />
        </mesh>
      </group>

      {/* 8. Procedural Canopy Trees (Physical Colliders) */}
      <JungleTree position={[-20, 0, -20]} height={7.0} scale={1.1} barkMaterial={materials.bark} leafMaterial={materials.leaves} />
      <JungleTree position={[20, 0, -20]} height={7.2} scale={1.15} barkMaterial={materials.bark} leafMaterial={materials.leaves} />
      <JungleTree position={[-20, 0, 20]} height={6.8} scale={1.05} barkMaterial={materials.bark} leafMaterial={materials.leaves} />
      <JungleTree position={[20, 0, 20]} height={7.0} scale={1.1} barkMaterial={materials.bark} leafMaterial={materials.leaves} />
      <JungleTree position={[-4, 0, -18]} height={6.5} scale={1.0} barkMaterial={materials.bark} leafMaterial={materials.leaves} />
      <JungleTree position={[4, 0, 18]} height={6.6} scale={1.0} barkMaterial={materials.bark} leafMaterial={materials.leaves} />

      {/* Perimeter Background Trees for Immersive Density */}
      {[-24, -12, 0, 12, 24].map((coord, i) => (
        <React.Fragment key={i}>
          <JungleTree position={[coord, 0, -32]} height={8.0} scale={1.2} barkMaterial={materials.bark} leafMaterial={materials.leaves} />
          <JungleTree position={[coord, 0, 32]} height={8.0} scale={1.2} barkMaterial={materials.bark} leafMaterial={materials.leaves} />
          <JungleTree position={[-32, 0, coord]} height={8.0} scale={1.2} barkMaterial={materials.bark} leafMaterial={materials.leaves} />
          <JungleTree position={[32, 0, coord]} height={8.0} scale={1.2} barkMaterial={materials.bark} leafMaterial={materials.leaves} />
        </React.Fragment>
      ))}

      {/* 9. Tactical Camo Gear Caches */}
      <group position={[-1.2, 0.5, 2.5]} rotation={[0, 0.3, 0]}>
        <mesh castShadow receiveShadow material={materials.camoCrate}>
          <boxGeometry args={[1.6, 1.0, 1.2]} />
        </mesh>
      </group>
      <group position={[1.2, 0.5, -2.5]} rotation={[0, -0.3, 0]}>
        <mesh castShadow receiveShadow material={materials.camoCrate}>
          <boxGeometry args={[1.6, 1.0, 1.2]} />
        </mesh>
      </group>
    </group>
  );
};
