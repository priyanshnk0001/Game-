import React, { useMemo } from 'react';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { WeaponType } from '../../types/game';

interface RealisticWeaponProps {
  type: WeaponType;
  isFiring?: boolean;
}

export const RealisticWeapon: React.FC<RealisticWeaponProps> = ({
  type,
  isFiring = false,
}) => {
  // Load respective GLB model
  const modelPath = type === 'rifle' ? '/models/rifle.glb' : '/models/smg.glb';
  const { scene } = useGLTF(modelPath);

  // Clone scene so multiple instances (ground, player 1, player 2) don't conflict
  const clonedScene = useMemo(() => {
    const clone = scene.clone(true);

    clone.traverse((child) => {
      // Hide any first-person arm meshes so only the authentic weapon is visible
      if (child.name.toLowerCase().includes('arm')) {
        child.visible = false;
      }
      if ((child as THREE.Mesh).isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });

    return clone;
  }, [scene]);

  if (type === 'rifle') {
    // Authentic Full-Size M16A2 Assault Rifle (~0.95m length)
    return (
      <group>
        {/* Oriented so barrel points +Z (forward), sights point +Y (up), pistol grip at origin */}
        <primitive
          object={clonedScene}
          scale={[0.85, 0.85, 0.85]}
          position={[0, -0.05, 0]}
          rotation={[0, Math.PI, 0]}
        />

        {/* Dynamic Muzzle Flash at the tip of the full-size barrel */}
        {isFiring && (
          <group position={[0, 0.05, 0.67]}>
            <pointLight color="#fef08a" intensity={4} distance={6} />
            <mesh>
              <sphereGeometry args={[0.07, 8, 8]} />
              <meshBasicMaterial color="#fef08a" />
            </mesh>
            <mesh rotation={[0, 0, Math.PI / 4]}>
              <boxGeometry args={[0.22, 0.04, 0.04]} />
              <meshBasicMaterial color="#f59e0b" />
            </mesh>
          </group>
        )}
      </group>
    );
  }

  // Tactical Compact SMG / Firearm
  return (
    <group>
      <primitive
        object={clonedScene}
        scale={[0.018, 0.018, 0.018]}
        position={[0, -0.02, 0.08]}
        rotation={[0, Math.PI, 0]}
      />

      {/* Dynamic Muzzle Flash on firing */}
      {isFiring && (
        <group position={[0, 0.04, 0.35]}>
          <pointLight color="#fef08a" intensity={3.5} distance={5} />
          <mesh>
            <sphereGeometry args={[0.06, 8, 8]} />
            <meshBasicMaterial color="#fef08a" />
          </mesh>
        </group>
      )}
    </group>
  );
};

useGLTF.preload('/models/rifle.glb');
useGLTF.preload('/models/smg.glb');
