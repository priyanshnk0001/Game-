import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Html } from '@react-three/drei';
import { PlayerState } from '../../types/game';
import { WeaponModel } from '../weapons/WeaponModel';
import { WEAPON_SPAWNS } from '../../config/constants';

interface PlayerMeshProps {
  player: PlayerState;
  isLocal: boolean;
}

export const PlayerMesh: React.FC<PlayerMeshProps> = ({ player, isLocal }) => {
  const groupRef = useRef<THREE.Group>(null);

  useFrame(() => {
    if (groupRef.current) {
      groupRef.current.position.set(
        player.position[0],
        player.position[1],
        player.position[2]
      );
      groupRef.current.rotation.y = player.rotationY;
      groupRef.current.rotation.x = player.isDead ? -Math.PI / 2 : 0;
    }
  });

  const equippedDef = player.equippedWeapon ? WEAPON_SPAWNS[player.equippedWeapon] : null;

  // Visual health percentage
  const hpPercent = Math.max(0, Math.min(100, (player.health / 100) * 100));
  const hpColor =
    hpPercent > 60 ? '#10b981' : hpPercent > 30 ? '#f59e0b' : '#ef4444';

  return (
    <group ref={groupRef}>
      {/* 3D Character Body Assembly */}
      <group position={[0, player.isDead ? 0.3 : 0, 0]}>
        {/* Torso & Tactical Armor Plate */}
        <mesh position={[0, 1.05, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.55, 0.65, 0.35]} />
          <meshStandardMaterial
            color={player.isDead ? '#334155' : '#1e293b'}
            roughness={0.4}
            metalness={0.6}
          />
        </mesh>

        {/* Chest Tactical Insignia Plate */}
        <mesh position={[0, 1.15, 0.185]} castShadow>
          <boxGeometry args={[0.36, 0.3, 0.04]} />
          <meshStandardMaterial
            color={player.isDead ? '#475569' : player.color}
            roughness={0.3}
            metalness={0.7}
          />
        </mesh>

        {/* Tactical Belt */}
        <mesh position={[0, 0.72, 0]} castShadow>
          <boxGeometry args={[0.56, 0.1, 0.36]} />
          <meshStandardMaterial color="#0f172a" roughness={0.8} />
        </mesh>

        {/* Head / Combat Helmet */}
        <mesh position={[0, 1.55, 0]} castShadow>
          <boxGeometry args={[0.34, 0.36, 0.34]} />
          <meshStandardMaterial
            color={player.isDead ? '#1e293b' : '#0f172a'}
            roughness={0.3}
            metalness={0.7}
          />
        </mesh>

        {/* Glowing Tactical Visor */}
        <mesh position={[0, 1.58, 0.175]}>
          <boxGeometry args={[0.26, 0.08, 0.03]} />
          <meshBasicMaterial color={player.isDead ? '#64748b' : player.accentColor} />
        </mesh>

        {/* Left Arm */}
        <mesh position={[-0.38, 1.05, 0.05]} castShadow>
          <boxGeometry args={[0.15, 0.55, 0.16]} />
          <meshStandardMaterial color="#334155" roughness={0.6} />
        </mesh>

        {/* Right Arm (Shooting/Aiming Arm) */}
        <group
          position={[0.38, 1.15, 0.05]}
          rotation={[player.isAiming ? -Math.PI / 2.8 : -0.2, 0, 0]}
        >
          <mesh position={[0, -0.25, 0.1]} rotation={[0.4, 0, 0]} castShadow>
            <boxGeometry args={[0.15, 0.55, 0.16]} />
            <meshStandardMaterial color="#334155" roughness={0.6} />
          </mesh>

          {/* Weapon Socket in Hand */}
          {equippedDef && (
            <group
              position={[0.02, -0.42, 0.32]}
              rotation={[-0.3, 0, 0]}
            >
              <WeaponModel
                type={equippedDef.type}
                accentColor={equippedDef.accentColor}
                isFiring={player.isFiring}
              />
            </group>
          )}
        </group>

        {/* Left Leg */}
        <mesh position={[-0.18, 0.35, 0]} castShadow>
          <boxGeometry args={[0.18, 0.7, 0.22]} />
          <meshStandardMaterial color="#0f172a" roughness={0.7} />
        </mesh>

        {/* Right Leg */}
        <mesh position={[0.18, 0.35, 0]} castShadow>
          <boxGeometry args={[0.18, 0.7, 0.22]} />
          <meshStandardMaterial color="#0f172a" roughness={0.7} />
        </mesh>

        {/* Tactical Boots */}
        <mesh position={[-0.18, 0.06, 0.04]} castShadow>
          <boxGeometry args={[0.2, 0.14, 0.3]} />
          <meshStandardMaterial color="#020617" roughness={0.9} />
        </mesh>
        <mesh position={[0.18, 0.06, 0.04]} castShadow>
          <boxGeometry args={[0.2, 0.14, 0.3]} />
          <meshStandardMaterial color="#020617" roughness={0.9} />
        </mesh>
      </group>

      {/* Overhead Nameplate & Floating Health Bar */}
      <Html
        position={[0, player.isDead ? 1.0 : 2.25, 0]}
        center
        distanceFactor={14}
        style={{ pointerEvents: 'none', userSelect: 'none' }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            minWidth: '130px',
            padding: '4px 8px',
            background: 'rgba(15, 23, 42, 0.85)',
            border: `1px solid ${player.color}`,
            borderRadius: '6px',
            backdropFilter: 'blur(6px)',
            boxShadow: `0 0 10px ${player.color}40`,
            transform: 'scale(0.9)',
          }}
        >
          <div
            style={{
              fontSize: '11px',
              fontWeight: 800,
              letterSpacing: '0.05em',
              color: player.accentColor,
              marginBottom: '3px',
              display: 'flex',
              justifyContent: 'space-between',
              width: '100%',
            }}
          >
            <span>{player.name} {isLocal ? '(YOU)' : ''}</span>
            <span style={{ color: player.isDead ? '#ef4444' : '#f8fafc' }}>
              {player.isDead ? 'DEAD' : `${player.health} HP`}
            </span>
          </div>

          {/* Health Bar Track */}
          <div
            style={{
              width: '100%',
              height: '6px',
              backgroundColor: '#334155',
              borderRadius: '3px',
              overflow: 'hidden',
              position: 'relative',
            }}
          >
            <div
              style={{
                width: `${hpPercent}%`,
                height: '100%',
                backgroundColor: player.isDead ? '#64748b' : hpColor,
                transition: 'width 0.2s ease-out, background-color 0.2s ease-out',
                boxShadow: player.isDead ? 'none' : `0 0 6px ${hpColor}`,
              }}
            />
          </div>
        </div>
      </Html>
    </group>
  );
};
