import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { WeaponGroundItem } from '../../types/game';
import { RealisticWeapon } from './RealisticWeapon';

interface RealisticWeaponPickupProps {
  item: WeaponGroundItem;
}

export const RealisticWeaponPickup: React.FC<RealisticWeaponPickupProps> = ({ item }) => {
  const glintRef = useRef<THREE.PointLight>(null);

  useFrame((state) => {
    if (glintRef.current && !item.isPickedUp) {
      const time = state.clock.getElapsedTime();
      // Subtle military equipment glint
      glintRef.current.intensity = 0.8 + Math.sin(time * 3) * 0.4;
    }
  });

  if (item.isPickedUp) {
    return null;
  }

  return (
    <group position={item.position}>
      {/* Tactical Gear Staging Crate Base */}
      <mesh position={[0, -0.4, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.6, 0.45, 0.8]} />
        <meshStandardMaterial color="#2d3748" metalness={0.6} roughness={0.4} />
      </mesh>
      {/* Foam Inset Mat */}
      <mesh position={[0, -0.16, 0]} receiveShadow>
        <boxGeometry args={[1.5, 0.05, 0.7]} />
        <meshStandardMaterial color="#1a202c" roughness={0.9} />
      </mesh>

      {/* Subtle Tactical Marker Pin */}
      <mesh position={[0, 0.6, 0]}>
        <octahedronGeometry args={[0.08]} />
        <meshBasicMaterial color="#38bdf8" />
      </mesh>
      <pointLight ref={glintRef} position={[0, 0.4, 0]} color="#38bdf8" distance={2.5} />

      {/* The Realistic 3D Weapon Model resting on the staging box */}
      <group position={[0, 0, 0]} rotation={[0, Math.PI / 4, 0]}>
        <RealisticWeapon type={item.type} />
      </group>
    </group>
  );
};
