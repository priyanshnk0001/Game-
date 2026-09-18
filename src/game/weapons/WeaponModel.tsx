import React, { useRef } from 'react';
import * as THREE from 'three';
import { WeaponType } from '../../types/game';

interface WeaponModelProps {
  type: WeaponType;
  accentColor?: string;
  isFiring?: boolean;
}

export const WeaponModel: React.FC<WeaponModelProps> = ({
  type,
  accentColor = '#10b981',
  isFiring = false,
}) => {
  const muzzleRef = useRef<THREE.PointLight>(null);

  if (type === 'rifle') {
    // Assault Rifle
    return (
      <group scale={[0.85, 0.85, 0.85]}>
        {/* Main Body / Receiver */}
        <mesh position={[0, 0, 0]} castShadow>
          <boxGeometry args={[0.08, 0.12, 0.55]} />
          <meshStandardMaterial color="#1e293b" metalness={0.8} roughness={0.3} />
        </mesh>

        {/* Upper Picatinny Rail */}
        <mesh position={[0, 0.07, 0]} castShadow>
          <boxGeometry args={[0.05, 0.025, 0.45]} />
          <meshStandardMaterial color="#0f172a" metalness={0.9} roughness={0.2} />
        </mesh>

        {/* Holographic Sight */}
        <mesh position={[0, 0.1, -0.05]}>
          <boxGeometry args={[0.04, 0.05, 0.08]} />
          <meshStandardMaterial color="#334155" metalness={0.5} roughness={0.4} />
        </mesh>
        <mesh position={[0, 0.11, -0.05]}>
          <boxGeometry args={[0.02, 0.02, 0.02]} />
          <meshBasicMaterial color={accentColor} />
        </mesh>

        {/* Extended Barrel */}
        <mesh position={[0, 0.02, 0.45]} rotation={[Math.PI / 2, 0, 0]} castShadow>
          <cylinderGeometry args={[0.02, 0.02, 0.4, 12]} />
          <meshStandardMaterial color="#090d16" metalness={0.9} roughness={0.1} />
        </mesh>

        {/* Barrel Shroud / Handguard */}
        <mesh position={[0, 0.01, 0.32]} castShadow>
          <boxGeometry args={[0.07, 0.09, 0.22]} />
          <meshStandardMaterial color="#334155" metalness={0.6} roughness={0.4} />
        </mesh>

        {/* Tactical Magazine (curved style) */}
        <mesh position={[0, -0.13, 0.1]} rotation={[-0.2, 0, 0]} castShadow>
          <boxGeometry args={[0.06, 0.18, 0.1]} />
          <meshStandardMaterial color="#0f172a" metalness={0.7} roughness={0.3} />
        </mesh>

        {/* Pistol Grip */}
        <mesh position={[0, -0.1, -0.12]} rotation={[0.4, 0, 0]} castShadow>
          <boxGeometry args={[0.06, 0.14, 0.07]} />
          <meshStandardMaterial color="#020617" metalness={0.4} roughness={0.7} />
        </mesh>

        {/* Tactical Stock */}
        <mesh position={[0, 0, -0.38]} castShadow>
          <boxGeometry args={[0.06, 0.1, 0.24]} />
          <meshStandardMaterial color="#1e293b" metalness={0.5} roughness={0.5} />
        </mesh>

        {/* Neon Accent Stripe */}
        <mesh position={[0.042, 0.02, 0.05]}>
          <boxGeometry args={[0.005, 0.03, 0.25]} />
          <meshBasicMaterial color={accentColor} />
        </mesh>
        <mesh position={[-0.042, 0.02, 0.05]}>
          <boxGeometry args={[0.005, 0.03, 0.25]} />
          <meshBasicMaterial color={accentColor} />
        </mesh>

        {/* Muzzle Flash */}
        {isFiring && (
          <group position={[0, 0.02, 0.68]}>
            <pointLight ref={muzzleRef} color="#fbbf24" intensity={3} distance={5} />
            <mesh>
              <sphereGeometry args={[0.08, 8, 8]} />
              <meshBasicMaterial color="#fef08a" />
            </mesh>
            <mesh rotation={[0, 0, Math.PI / 4]}>
              <boxGeometry args={[0.15, 0.03, 0.03]} />
              <meshBasicMaterial color="#f59e0b" />
            </mesh>
          </group>
        )}
      </group>
    );
  }

  // Tactical SMG (Compact, Rapid)
  return (
    <group scale={[0.8, 0.8, 0.8]}>
      {/* Compact Frame */}
      <mesh position={[0, 0, 0]} castShadow>
        <boxGeometry args={[0.09, 0.14, 0.38]} />
        <meshStandardMaterial color="#0f172a" metalness={0.85} roughness={0.25} />
      </mesh>

      {/* Short Barrel & Compensator */}
      <mesh position={[0, 0.01, 0.26]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <cylinderGeometry args={[0.028, 0.028, 0.16, 12]} />
        <meshStandardMaterial color="#1e293b" metalness={0.9} roughness={0.1} />
      </mesh>

      {/* Straight Stick Magazine */}
      <mesh position={[0, -0.16, 0.06]} castShadow>
        <boxGeometry args={[0.05, 0.22, 0.06]} />
        <meshStandardMaterial color="#020617" metalness={0.7} roughness={0.3} />
      </mesh>

      {/* Front Tactical Grip */}
      <mesh position={[0, -0.09, 0.18]} castShadow>
        <boxGeometry args={[0.05, 0.11, 0.05]} />
        <meshStandardMaterial color="#1e293b" metalness={0.5} roughness={0.6} />
      </mesh>

      {/* Main Ergonomic Grip */}
      <mesh position={[0, -0.1, -0.08]} rotation={[0.35, 0, 0]} castShadow>
        <boxGeometry args={[0.06, 0.14, 0.07]} />
        <meshStandardMaterial color="#020617" metalness={0.4} roughness={0.7} />
      </mesh>

      {/* Wire Stock */}
      <mesh position={[0, 0.02, -0.28]} castShadow>
        <boxGeometry args={[0.07, 0.05, 0.2]} />
        <meshStandardMaterial color="#334155" metalness={0.9} roughness={0.2} />
      </mesh>

      {/* Cyber Neon Strip */}
      <mesh position={[0.048, 0.02, 0]}>
        <boxGeometry args={[0.005, 0.025, 0.2]} />
        <meshBasicMaterial color={accentColor} />
      </mesh>
      <mesh position={[-0.048, 0.02, 0]}>
        <boxGeometry args={[0.005, 0.025, 0.2]} />
        <meshBasicMaterial color={accentColor} />
      </mesh>

      {/* Muzzle Flash */}
      {isFiring && (
        <group position={[0, 0.01, 0.36]}>
          <pointLight ref={muzzleRef} color="#38bdf8" intensity={3.5} distance={5} />
          <mesh>
            <sphereGeometry args={[0.07, 8, 8]} />
            <meshBasicMaterial color="#e0f2fe" />
          </mesh>
        </group>
      )}
    </group>
  );
};
