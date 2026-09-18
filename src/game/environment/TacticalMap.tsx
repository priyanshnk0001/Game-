import React, { useMemo } from 'react';
import * as THREE from 'three';
import {
  createAsphaltPBR,
  createConcreteWallPBR,
  createShippingContainerPBR,
  createSandbagPBR,
  createJerseyBarrierPBR,
  createAmmoCratePBR,
} from './materials';
import { PLAYER_SPAWNS } from '../../config/constants';

// Single Sandbag Mesh with rounded burlap geometry
const SandbagMesh: React.FC<{ position: [number, number, number]; rotation?: [number, number, number]; material: THREE.Material }> = ({
  position,
  rotation = [0, 0, 0],
  material,
}) => (
  <mesh position={position} rotation={rotation} castShadow receiveShadow material={material}>
    <boxGeometry args={[0.9, 0.28, 0.45]} />
  </mesh>
);

// Stacked Sandbag Bunker Wall (realistic staggered military placement)
const SandbagBunker: React.FC<{ position: [number, number, number]; rotationY?: number; material: THREE.Material }> = ({
  position,
  rotationY = 0,
  material,
}) => {
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      {/* Row 1 (base) */}
      <SandbagMesh position={[-0.85, 0.14, 0]} material={material} />
      <SandbagMesh position={[0, 0.14, 0]} material={material} />
      <SandbagMesh position={[0.85, 0.14, 0]} material={material} />

      {/* Row 2 */}
      <SandbagMesh position={[-0.42, 0.4, 0]} material={material} />
      <SandbagMesh position={[0.42, 0.4, 0]} material={material} />

      {/* Row 3 */}
      <SandbagMesh position={[-0.85, 0.66, 0]} material={material} />
      <SandbagMesh position={[0, 0.66, 0]} material={material} />
      <SandbagMesh position={[0.85, 0.66, 0]} material={material} />

      {/* Top Cap Row 4 */}
      <SandbagMesh position={[-0.42, 0.92, 0]} material={material} />
      <SandbagMesh position={[0.42, 0.92, 0]} material={material} />
    </group>
  );
};

// Heavy Concrete Jersey Barrier with chamfered geometry
const JerseyBarrier: React.FC<{ position: [number, number, number]; rotationY?: number; material: THREE.Material }> = ({
  position,
  rotationY = 0,
  material,
}) => {
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      {/* Lower wide base */}
      <mesh position={[0, 0.2, 0]} castShadow receiveShadow material={material}>
        <boxGeometry args={[3.2, 0.4, 0.65]} />
      </mesh>
      {/* Upper tapered neck */}
      <mesh position={[0, 0.65, 0]} castShadow receiveShadow material={material}>
        <boxGeometry args={[3.2, 0.55, 0.35]} />
      </mesh>
      {/* Top rounded cap */}
      <mesh position={[0, 0.98, 0]} castShadow receiveShadow material={material}>
        <boxGeometry args={[3.2, 0.12, 0.22]} />
      </mesh>
    </group>
  );
};

// Shipping Container with corrugated ribbed panels and corner castings
const ShippingContainer: React.FC<{
  position: [number, number, number];
  rotationY?: number;
  material: THREE.Material;
  size?: [number, number, number];
}> = ({ position, rotationY = 0, material, size = [6.5, 2.6, 2.5] }) => {
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      {/* Main Container Body */}
      <mesh position={[0, size[1] / 2, 0]} castShadow receiveShadow material={material}>
        <boxGeometry args={size} />
      </mesh>
      {/* Structural Corner Posts */}
      {[-size[0] / 2, size[0] / 2].map((x, xi) =>
        [-size[2] / 2, size[2] / 2].map((z, zi) => (
          <mesh key={`${xi}-${zi}`} position={[x, size[1] / 2, z]} castShadow>
            <boxGeometry args={[0.2, size[1] + 0.05, 0.2]} />
            <meshStandardMaterial color="#1e242d" metalness={0.8} roughness={0.3} />
          </mesh>
        ))
      )}
    </group>
  );
};

// Military Ammo Crate Stack
const AmmoCrateStack: React.FC<{ position: [number, number, number]; material: THREE.Material }> = ({
  position,
  material,
}) => (
  <group position={position}>
    <mesh position={[0, 0.35, 0]} castShadow receiveShadow material={material}>
      <boxGeometry args={[1.3, 0.7, 0.9]} />
    </mesh>
    <mesh position={[0.2, 0.95, 0]} rotation={[0, 0.15, 0]} castShadow receiveShadow material={material}>
      <boxGeometry args={[1.2, 0.6, 0.8]} />
    </mesh>
  </group>
);

export const TacticalMap: React.FC = () => {
  // Memoize procedural PBR materials to ensure fast rendering & shared GPU memory
  const materials = useMemo(() => {
    return {
      asphalt: createAsphaltPBR(),
      concrete: createConcreteWallPBR(),
      containerNavy: createShippingContainerPBR('#243746'),
      containerRust: createShippingContainerPBR('#593d2b'),
      sandbag: createSandbagPBR(),
      barrier: createJerseyBarrierPBR(),
      ammoCrate: createAmmoCratePBR(),
    };
  }, []);

  return (
    <group>
      {/* 1. Main Asphalt Ground with PBR normal & roughness */}
      <mesh receiveShadow position={[0, 0, 0]} rotation={[-Math.PI / 2, 0, 0]} material={materials.asphalt}>
        <planeGeometry args={[60, 60, 32, 32]} />
      </mesh>

      {/* Surrounding Dirt/Gravel Berm */}
      <mesh receiveShadow position={[0, -0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[75, 75]} />
        <meshStandardMaterial color="#1e1e18" roughness={0.95} />
      </mesh>

      {/* 2. Concrete Perimeter Walls with Realistic Formwork & Tie-Rod Seams */}
      {/* North Wall */}
      <mesh position={[0, 2.0, -28]} castShadow receiveShadow material={materials.concrete}>
        <boxGeometry args={[56, 4.0, 0.8]} />
      </mesh>
      {/* South Wall */}
      <mesh position={[0, 2.0, 28]} castShadow receiveShadow material={materials.concrete}>
        <boxGeometry args={[56, 4.0, 0.8]} />
      </mesh>
      {/* West Wall */}
      <mesh position={[-28, 2.0, 0]} castShadow receiveShadow material={materials.concrete}>
        <boxGeometry args={[0.8, 4.0, 56]} />
      </mesh>
      {/* East Wall */}
      <mesh position={[28, 2.0, 0]} castShadow receiveShadow material={materials.concrete}>
        <boxGeometry args={[0.8, 4.0, 56]} />
      </mesh>

      {/* Steel Security Wall Caps */}
      {[-28, 28].map((x) => (
        <mesh key={`xcap-${x}`} position={[x, 4.05, 0]}>
          <boxGeometry args={[0.9, 0.1, 56]} />
          <meshStandardMaterial color="#2d3748" metalness={0.7} roughness={0.3} />
        </mesh>
      ))}
      {[-28, 28].map((z) => (
        <mesh key={`zcap-${z}`} position={[0, 4.05, z]}>
          <boxGeometry args={[56, 0.1, 0.9]} />
          <meshStandardMaterial color="#2d3748" metalness={0.7} roughness={0.3} />
        </mesh>
      ))}

      {/* 3. Tactical Firing Positions & Concrete Jersey Barriers */}
      <JerseyBarrier position={[0, 0, 3.2]} rotationY={0} material={materials.barrier} />
      <JerseyBarrier position={[0, 0, -3.2]} rotationY={0} material={materials.barrier} />

      <JerseyBarrier position={[-6.5, 0, 8.5]} rotationY={Math.PI / 4} material={materials.barrier} />
      <JerseyBarrier position={[6.5, 0, -8.5]} rotationY={Math.PI / 4} material={materials.barrier} />

      <JerseyBarrier position={[-10.5, 0, -4.5]} rotationY={-Math.PI / 6} material={materials.barrier} />
      <JerseyBarrier position={[10.5, 0, 4.5]} rotationY={-Math.PI / 6} material={materials.barrier} />

      {/* 4. Sandbag Fortified Positions */}
      <SandbagBunker position={[-4.5, 0, 1.5]} rotationY={Math.PI / 2} material={materials.sandbag} />
      <SandbagBunker position={[4.5, 0, -1.5]} rotationY={-Math.PI / 2} material={materials.sandbag} />
      <SandbagBunker position={[-12, 0, 6]} rotationY={0} material={materials.sandbag} />
      <SandbagBunker position={[12, 0, -6]} rotationY={0} material={materials.sandbag} />

      {/* 5. Military Shipping Containers */}
      {/* Alpha Side Container (Navy Blue) */}
      <ShippingContainer position={[-9, 0, -9]} rotationY={0.2} material={materials.containerNavy} />
      {/* Bravo Side Container (Weathered Rust) */}
      <ShippingContainer position={[9, 0, 9]} rotationY={-0.2} material={materials.containerRust} />

      {/* 6. Concrete Command Bunker Building / Shoot House (Mid-Left) */}
      <group position={[-16, 0, -14]}>
        {/* Bunker Wall 1 */}
        <mesh position={[0, 1.8, 0]} castShadow receiveShadow material={materials.concrete}>
          <boxGeometry args={[7.5, 3.6, 0.6]} />
        </mesh>
        {/* Bunker Wall 2 */}
        <mesh position={[-3.45, 1.8, 3.5]} castShadow receiveShadow material={materials.concrete}>
          <boxGeometry args={[0.6, 3.6, 7.0]} />
        </mesh>
        {/* Bunker Wall 3 with Window Slit */}
        <mesh position={[3.45, 1.0, 3.5]} castShadow receiveShadow material={materials.concrete}>
          <boxGeometry args={[0.6, 2.0, 7.0]} />
        </mesh>
        <mesh position={[3.45, 2.9, 3.5]} castShadow receiveShadow material={materials.concrete}>
          <boxGeometry args={[0.6, 1.4, 7.0]} />
        </mesh>
        {/* Heavy Roof Slab */}
        <mesh position={[0, 3.75, 3.5]} castShadow receiveShadow material={materials.concrete}>
          <boxGeometry args={[8.0, 0.4, 7.6]} />
        </mesh>
      </group>

      {/* 7. Symmetrical Observation Shoot House (Mid-Right) */}
      <group position={[16, 0, 14]}>
        <mesh position={[0, 1.8, 0]} castShadow receiveShadow material={materials.concrete}>
          <boxGeometry args={[7.5, 3.6, 0.6]} />
        </mesh>
        <mesh position={[3.45, 1.8, -3.5]} castShadow receiveShadow material={materials.concrete}>
          <boxGeometry args={[0.6, 3.6, 7.0]} />
        </mesh>
        <mesh position={[-3.45, 1.0, -3.5]} castShadow receiveShadow material={materials.concrete}>
          <boxGeometry args={[0.6, 2.0, 7.0]} />
        </mesh>
        <mesh position={[-3.45, 2.9, -3.5]} castShadow receiveShadow material={materials.concrete}>
          <boxGeometry args={[0.6, 1.4, 7.0]} />
        </mesh>
        <mesh position={[0, 3.75, -3.5]} castShadow receiveShadow material={materials.concrete}>
          <boxGeometry args={[8.0, 0.4, 7.6]} />
        </mesh>
      </group>

      {/* 8. Ammo Crates & Gear Pallets */}
      <AmmoCrateStack position={[-3.5, 0, 7.5]} material={materials.ammoCrate} />
      <AmmoCrateStack position={[3.5, 0, -7.5]} material={materials.ammoCrate} />
      <AmmoCrateStack position={[0, 0, 0]} material={materials.ammoCrate} />

      {/* 9. Perimeter Industrial Floodlight Towers (Realistic lattice poles) */}
      {[
        [-24, -24],
        [24, -24],
        [-24, 24],
        [24, 24],
      ].map(([fx, fz], idx) => (
        <group key={`light-tower-${idx}`} position={[fx, 0, fz]}>
          {/* Steel Tower Pole */}
          <mesh position={[0, 3.5, 0]} castShadow>
            <cylinderGeometry args={[0.15, 0.25, 7.0, 8]} />
            <meshStandardMaterial color="#2d3748" metalness={0.8} roughness={0.3} />
          </mesh>
          {/* Top Crossbar */}
          <mesh position={[0, 7.0, 0]} castShadow>
            <boxGeometry args={[1.6, 0.15, 0.4]} />
            <meshStandardMaterial color="#1a202c" metalness={0.7} roughness={0.3} />
          </mesh>
          {/* Floodlight Fixtures */}
          <mesh position={[-0.6, 6.8, 0]}>
            <boxGeometry args={[0.45, 0.35, 0.35]} />
            <meshStandardMaterial color="#f8fafc" emissive="#f8fafc" emissiveIntensity={0.6} />
          </mesh>
          <mesh position={[0.6, 6.8, 0]}>
            <boxGeometry args={[0.45, 0.35, 0.35]} />
            <meshStandardMaterial color="#f8fafc" emissive="#f8fafc" emissiveIntensity={0.6} />
          </mesh>
        </group>
      ))}

      {/* 10. Subtle Tactical Staging Markings for Player 1 & 2 (Clean realistic paint) */}
      <mesh position={[PLAYER_SPAWNS.player1[0], 0.02, PLAYER_SPAWNS.player1[2]]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[2.5, 2.5]} />
        <meshBasicMaterial color="#38bdf8" transparent opacity={0.2} />
      </mesh>
      <mesh position={[PLAYER_SPAWNS.player2[0], 0.02, PLAYER_SPAWNS.player2[2]]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[2.5, 2.5]} />
        <meshBasicMaterial color="#f43f5e" transparent opacity={0.2} />
      </mesh>
    </group>
  );
};
