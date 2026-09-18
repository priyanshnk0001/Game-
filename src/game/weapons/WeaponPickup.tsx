import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { WeaponGroundItem } from '../../types/game';
import { WeaponModel } from './WeaponModel';

interface WeaponPickupProps {
  item: WeaponGroundItem;
}

export const WeaponPickup: React.FC<WeaponPickupProps> = ({ item }) => {
  const groupRef = useRef<THREE.Group>(null);
  const ringRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (groupRef.current && !item.isPickedUp) {
      const time = state.clock.getElapsedTime();
      // Gentle floating bob & slow rotation
      groupRef.current.position.y = item.position[1] + Math.sin(time * 2.5) * 0.12;
      groupRef.current.rotation.y = time * 1.2;
    }
    if (ringRef.current && !item.isPickedUp) {
      const time = state.clock.getElapsedTime();
      ringRef.current.rotation.z = -time * 0.8;
    }
  });

  if (item.isPickedUp) {
    return null;
  }

  return (
    <group position={[item.position[0], 0, item.position[2]]}>
      {/* Ground holographic spawn beacon ring */}
      <mesh
        ref={ringRef}
        position={[0, 0.05, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
      >
        <ringGeometry args={[0.7, 0.95, 32]} />
        <meshBasicMaterial
          color={item.accentColor}
          transparent
          opacity={0.65}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Pulsing light source */}
      <pointLight
        position={[0, 0.8, 0]}
        color={item.accentColor}
        intensity={1.5}
        distance={4}
      />

      {/* Floating 3D Gun */}
      <group ref={groupRef} position={[0, item.position[1], 0]}>
        <WeaponModel type={item.type} accentColor={item.accentColor} />
      </group>
    </group>
  );
};
