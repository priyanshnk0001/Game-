import React, { useMemo } from 'react';
import * as THREE from 'three';

// Procedural texture for crisp arctic snow with soft icy sheen
function createSnowTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  // Base crisp snow white/slight cyan tint
  ctx.fillStyle = '#e8eff7';
  ctx.fillRect(0, 0, 512, 512);

  // Soft windblown drift striations
  for (let i = 0; i < 400; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    const r = 8 + Math.random() * 32;
    const isIce = Math.random() > 0.6;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = isIce
      ? `rgba(180, 215, 240, ${0.1 + Math.random() * 0.15})`
      : `rgba(255, 255, 255, ${0.2 + Math.random() * 0.25})`;
    ctx.fill();
  }

  // Micro-sparkle noise
  const imgData = ctx.getImageData(0, 0, 512, 512);
  const d = imgData.data;
  for (let i = 0; i < d.length; i += 4) {
    const n = (Math.random() - 0.5) * 14;
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

// Alpine Snow-Covered Pine Tree
const SnowPineTree: React.FC<{
  position: [number, number, number];
  height?: number;
  scale?: number;
  trunkMaterial: THREE.Material;
  needleMaterial: THREE.Material;
  snowCapMaterial: THREE.Material;
}> = ({ position, height = 7.0, scale = 1.0, trunkMaterial, needleMaterial, snowCapMaterial }) => {
  return (
    <group position={position} scale={[scale, scale, scale]}>
      {/* Pine Trunk */}
      <mesh position={[0, height / 2, 0]} castShadow receiveShadow material={trunkMaterial}>
        <cylinderGeometry args={[0.3, 0.45, height, 8]} />
      </mesh>

      {/* Tier 1 (Lowest foliage cone) */}
      <mesh position={[0, height * 0.4, 0]} castShadow material={needleMaterial}>
        <coneGeometry args={[2.5, 2.4, 8]} />
      </mesh>
      <mesh position={[0, height * 0.48, 0]} castShadow material={snowCapMaterial}>
        <coneGeometry args={[2.55, 0.6, 8]} />
      </mesh>

      {/* Tier 2 (Middle foliage cone) */}
      <mesh position={[0, height * 0.65, 0]} castShadow material={needleMaterial}>
        <coneGeometry args={[2.0, 2.2, 8]} />
      </mesh>
      <mesh position={[0, height * 0.72, 0]} castShadow material={snowCapMaterial}>
        <coneGeometry args={[2.05, 0.55, 8]} />
      </mesh>

      {/* Tier 3 (Top foliage cone) */}
      <mesh position={[0, height * 0.88, 0]} castShadow material={needleMaterial}>
        <coneGeometry args={[1.4, 1.8, 8]} />
      </mesh>
      <mesh position={[0, height * 0.94, 0]} castShadow material={snowCapMaterial}>
        <coneGeometry args={[1.45, 0.5, 8]} />
      </mesh>
    </group>
  );
};

// Frosted Shipping Container
const FrostedContainer: React.FC<{
  position: [number, number, number];
  rotationY?: number;
  containerMaterial: THREE.Material;
  snowMaterial: THREE.Material;
  size?: [number, number, number];
}> = ({ position, rotationY = 0, containerMaterial, snowMaterial, size = [6.5, 2.6, 2.5] }) => {
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      {/* Container Body */}
      <mesh position={[0, size[1] / 2, 0]} castShadow receiveShadow material={containerMaterial}>
        <boxGeometry args={size} />
      </mesh>
      {/* Corner Posts */}
      {[-size[0] / 2, size[0] / 2].map((x, xi) =>
        [-size[2] / 2, size[2] / 2].map((z, zi) => (
          <mesh key={`${xi}-${zi}`} position={[x, size[1] / 2, z]} castShadow>
            <boxGeometry args={[0.2, size[1] + 0.05, 0.2]} />
            <meshStandardMaterial color="#1e293b" roughness={0.3} metalness={0.7} />
          </mesh>
        ))
      )}
      {/* Snow Layer on Roof */}
      <mesh position={[0, size[1] + 0.08, 0]} castShadow receiveShadow material={snowMaterial}>
        <boxGeometry args={[size[0] + 0.1, 0.15, size[2] + 0.1]} />
      </mesh>
    </group>
  );
};

// Arctic Research Bunker Shoot House
const ArcticBunker: React.FC<{
  position: [number, number, number];
  bunkerMaterial: THREE.Material;
  snowMaterial: THREE.Material;
  label: string;
}> = ({ position, bunkerMaterial, snowMaterial }) => {
  return (
    <group position={position}>
      {/* Main Reinforced Concrete Structure */}
      <mesh position={[0, 2.0, 0]} castShadow receiveShadow material={bunkerMaterial}>
        <boxGeometry args={[8.5, 4.0, 7.5]} />
      </mesh>
      {/* Heavy Steel Reinforced Doorway recess */}
      <mesh position={[0, 1.4, 3.8]} castShadow material={bunkerMaterial}>
        <boxGeometry args={[2.6, 2.8, 0.2]} />
      </mesh>
      {/* Deep Snow Drift on the Roof */}
      <mesh position={[0, 4.15, 0]} castShadow receiveShadow material={snowMaterial}>
        <boxGeometry args={[8.8, 0.35, 7.8]} />
      </mesh>
    </group>
  );
};

// Frosted Concrete Barrier / Snow Berm
const FrostedBarrier: React.FC<{
  position: [number, number, number];
  rotationY?: number;
  barrierMaterial: THREE.Material;
  snowMaterial: THREE.Material;
  size?: [number, number, number];
}> = ({ position, rotationY = 0, barrierMaterial, snowMaterial, size = [3.4, 1.2, 0.8] }) => {
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      {/* Concrete Barrier Base */}
      <mesh position={[0, size[1] / 2, 0]} castShadow receiveShadow material={barrierMaterial}>
        <boxGeometry args={size} />
      </mesh>
      {/* Snow Mound Cap */}
      <mesh position={[0, size[1] + 0.06, 0]} castShadow material={snowMaterial}>
        <boxGeometry args={[size[0] * 0.95, 0.14, size[2] * 0.7]} />
      </mesh>
    </group>
  );
};

export const SnowMap: React.FC = () => {
  const materials = useMemo(() => {
    const snowTex = createSnowTexture();

    const snow = new THREE.MeshStandardMaterial({
      map: snowTex,
      roughness: 0.78,
      metalness: 0.06,
      color: '#f8fafc',
    });

    const ice = new THREE.MeshStandardMaterial({
      roughness: 0.12,
      metalness: 0.2,
      color: '#93c5fd',
      transparent: true,
      opacity: 0.85,
    });

    const frostedConcrete = new THREE.MeshStandardMaterial({
      color: '#64748b',
      roughness: 0.82,
      metalness: 0.15,
    });

    const frostedPerimeter = new THREE.MeshStandardMaterial({
      color: '#475569',
      roughness: 0.85,
      metalness: 0.1,
    });

    const arcticContainer = new THREE.MeshStandardMaterial({
      color: '#2563eb',
      roughness: 0.55,
      metalness: 0.45,
    });

    const pineTrunk = new THREE.MeshStandardMaterial({
      color: '#33271e',
      roughness: 0.9,
    });

    const pineNeedles = new THREE.MeshStandardMaterial({
      color: '#143823',
      roughness: 0.75,
      flatShading: true,
    });

    const snowCap = new THREE.MeshStandardMaterial({
      color: '#ffffff',
      roughness: 0.7,
      flatShading: true,
    });

    const arcticCrate = new THREE.MeshStandardMaterial({
      color: '#334155',
      roughness: 0.6,
      metalness: 0.35,
    });

    return {
      snow,
      ice,
      frostedConcrete,
      frostedPerimeter,
      arcticContainer,
      pineTrunk,
      pineNeedles,
      snowCap,
      arcticCrate,
    };
  }, []);

  return (
    <group name="SnowMapEnvironment">
      {/* 1. Main Crisp Snow Ground Plane */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow material={materials.snow}>
        <planeGeometry args={[56, 56, 32, 32]} />
      </mesh>

      {/* Frozen Glacial Blue Ice Patches */}
      <mesh rotation={[-Math.PI / 2, 0, 0.4]} position={[0, 0.015, 0]} receiveShadow material={materials.ice}>
        <planeGeometry args={[14, 14]} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, -0.6]} position={[-12, 0.015, 12]} receiveShadow material={materials.ice}>
        <planeGeometry args={[8, 10]} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0.8]} position={[12, 0.015, -12]} receiveShadow material={materials.ice}>
        <planeGeometry args={[9, 9]} />
      </mesh>

      {/* 2. Arctic Perimeter Blast Walls (North, South, West, East) */}
      <group position={[0, 2.0, -28]}>
        <mesh castShadow receiveShadow material={materials.frostedPerimeter}>
          <boxGeometry args={[56, 4.0, 0.9]} />
        </mesh>
        <mesh position={[0, 2.05, 0]} material={materials.snow}>
          <boxGeometry args={[56.1, 0.15, 0.95]} />
        </mesh>
      </group>
      <group position={[0, 2.0, 28]}>
        <mesh castShadow receiveShadow material={materials.frostedPerimeter}>
          <boxGeometry args={[56, 4.0, 0.9]} />
        </mesh>
        <mesh position={[0, 2.05, 0]} material={materials.snow}>
          <boxGeometry args={[56.1, 0.15, 0.95]} />
        </mesh>
      </group>
      <group position={[-28, 2.0, 0]}>
        <mesh castShadow receiveShadow material={materials.frostedPerimeter}>
          <boxGeometry args={[0.9, 4.0, 56]} />
        </mesh>
        <mesh position={[0, 2.05, 0]} material={materials.snow}>
          <boxGeometry args={[0.95, 0.15, 56.1]} />
        </mesh>
      </group>
      <group position={[28, 2.0, 0]}>
        <mesh castShadow receiveShadow material={materials.frostedPerimeter}>
          <boxGeometry args={[0.9, 4.0, 56]} />
        </mesh>
        <mesh position={[0, 2.05, 0]} material={materials.snow}>
          <boxGeometry args={[0.95, 0.15, 56.1]} />
        </mesh>
      </group>

      {/* 3. Arctic Research Station Bunkers (Matching SNOW_OPS_OBSTACLES) */}
      <ArcticBunker
        position={[-16, 0, -12]}
        bunkerMaterial={materials.frostedConcrete}
        snowMaterial={materials.snow}
        label="RADAR BUNKER"
      />
      <ArcticBunker
        position={[16, 0, 12]}
        bunkerMaterial={materials.frostedConcrete}
        snowMaterial={materials.snow}
        label="CRYOGENIC LAB"
      />

      {/* 4. Frosted Arctic Shipping Containers */}
      <FrostedContainer
        position={[-8, 0, 8]}
        rotationY={-0.35}
        containerMaterial={materials.arcticContainer}
        snowMaterial={materials.snow}
        size={[6.5, 2.6, 2.5]}
      />
      <FrostedContainer
        position={[8, 0, -8]}
        rotationY={0.35}
        containerMaterial={materials.arcticContainer}
        snowMaterial={materials.snow}
        size={[6.5, 2.6, 2.5]}
      />
      <FrostedContainer
        position={[-1, 0, 10]}
        rotationY={1.57}
        containerMaterial={materials.arcticContainer}
        snowMaterial={materials.snow}
        size={[6.0, 2.6, 2.4]}
      />

      {/* 5. Sub-Zero Blast Barriers & Snow Berms */}
      <FrostedBarrier position={[0, 0, -3.5]} barrierMaterial={materials.frostedConcrete} snowMaterial={materials.snow} size={[3.8, 1.2, 1.2]} />
      <FrostedBarrier position={[0, 0, 3.5]} barrierMaterial={materials.frostedConcrete} snowMaterial={materials.snow} size={[3.8, 1.2, 1.2]} />
      <FrostedBarrier position={[-7.5, 0, -6.5]} rotationY={0.7} barrierMaterial={materials.frostedConcrete} snowMaterial={materials.snow} size={[3.4, 1.2, 0.8]} />
      <FrostedBarrier position={[7.5, 0, 6.5]} rotationY={0.7} barrierMaterial={materials.frostedConcrete} snowMaterial={materials.snow} size={[3.4, 1.2, 0.8]} />
      <FrostedBarrier position={[11, 0, -2]} rotationY={1.57} barrierMaterial={materials.frostedConcrete} snowMaterial={materials.snow} size={[3.6, 1.2, 0.8]} />
      <FrostedBarrier position={[-11, 0, 2]} rotationY={1.57} barrierMaterial={materials.frostedConcrete} snowMaterial={materials.snow} size={[3.6, 1.2, 0.8]} />

      {/* 6. Alpine Pine Trees (Solid Trunks matching SNOW_OPS_OBSTACLES) */}
      <SnowPineTree
        position={[-22, 0, -22]}
        height={7.2}
        scale={1.1}
        trunkMaterial={materials.pineTrunk}
        needleMaterial={materials.pineNeedles}
        snowCapMaterial={materials.snowCap}
      />
      <SnowPineTree
        position={[22, 0, -22]}
        height={7.0}
        scale={1.05}
        trunkMaterial={materials.pineTrunk}
        needleMaterial={materials.pineNeedles}
        snowCapMaterial={materials.snowCap}
      />
      <SnowPineTree
        position={[-22, 0, 22]}
        height={6.8}
        scale={1.0}
        trunkMaterial={materials.pineTrunk}
        needleMaterial={materials.pineNeedles}
        snowCapMaterial={materials.snowCap}
      />
      <SnowPineTree
        position={[22, 0, 22]}
        height={7.4}
        scale={1.15}
        trunkMaterial={materials.pineTrunk}
        needleMaterial={materials.pineNeedles}
        snowCapMaterial={materials.snowCap}
      />
      <SnowPineTree
        position={[-6, 0, -18]}
        height={6.6}
        scale={0.95}
        trunkMaterial={materials.pineTrunk}
        needleMaterial={materials.pineNeedles}
        snowCapMaterial={materials.snowCap}
      />
      <SnowPineTree
        position={[6, 0, 18]}
        height={6.7}
        scale={1.0}
        trunkMaterial={materials.pineTrunk}
        needleMaterial={materials.pineNeedles}
        snowCapMaterial={materials.snowCap}
      />

      {/* Background Outer Mountain Pines */}
      {[-24, -12, 0, 12, 24].map((coord, i) => (
        <React.Fragment key={i}>
          <SnowPineTree position={[coord, 0, -32]} height={8.5} scale={1.25} trunkMaterial={materials.pineTrunk} needleMaterial={materials.pineNeedles} snowCapMaterial={materials.snowCap} />
          <SnowPineTree position={[coord, 0, 32]} height={8.5} scale={1.25} trunkMaterial={materials.pineTrunk} needleMaterial={materials.pineNeedles} snowCapMaterial={materials.snowCap} />
          <SnowPineTree position={[-32, 0, coord]} height={8.5} scale={1.25} trunkMaterial={materials.pineTrunk} needleMaterial={materials.pineNeedles} snowCapMaterial={materials.snowCap} />
          <SnowPineTree position={[32, 0, coord]} height={8.5} scale={1.25} trunkMaterial={materials.pineTrunk} needleMaterial={materials.pineNeedles} snowCapMaterial={materials.snowCap} />
        </React.Fragment>
      ))}

      {/* 7. Frozen Military Supply Crates */}
      <group position={[0, 0.65, 0]} rotation={[0, 0.2, 0]}>
        <mesh castShadow receiveShadow material={materials.arcticCrate}>
          <boxGeometry args={[1.6, 1.3, 1.2]} />
        </mesh>
      </group>
      <group position={[-3.8, 0.65, 6.5]} rotation={[0, -0.1, 0]}>
        <mesh castShadow receiveShadow material={materials.arcticCrate}>
          <boxGeometry args={[1.5, 1.3, 1.1]} />
        </mesh>
      </group>
      <group position={[3.8, 0.65, -6.5]} rotation={[0, 0.1, 0]}>
        <mesh castShadow receiveShadow material={materials.arcticCrate}>
          <boxGeometry args={[1.5, 1.3, 1.1]} />
        </mesh>
      </group>
    </group>
  );
};
