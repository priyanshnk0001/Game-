import React, { Suspense } from 'react';
import { Sky } from '@react-three/drei';
import { useGameState } from '../hooks/useGameState';
import { TacticalMap } from './environment/TacticalMap';
import { RealisticWeaponPickup } from './weapons/RealisticWeaponPickup';
import { RealisticPlayer } from './player/RealisticPlayer';
import { BulletManager } from './combat/BulletManager';
import { PlayerController } from './players/PlayerController';
import { CollisionDebugVisualizer } from './collision/CollisionDebugVisualizer';
import { AimDebugMarker } from './combat/AimDebugMarker';
import { WeaponId } from '../types/game';

interface SceneProps {
  onNearWeaponChange: (weaponId: WeaponId | null, weaponName: string | null) => void;
}

export const Scene: React.FC<SceneProps> = ({ onNearWeaponChange }) => {
  const state = useGameState();
  const activeId = state.activePlayerId;

  return (
    <>
      {/* 1. Realistic Sky & Atmospheric Depth */}
      <Sky
        distance={450000}
        sunPosition={[45, 30, 25]}
        inclination={0.55}
        azimuth={0.25}
        turbidity={8}
        rayleigh={1.2}
        mieCoefficient={0.005}
        mieDirectionalG={0.8}
      />
      <fog attach="fog" args={['#1c212a', 25, 80]} />

      {/* 2. Realistic Sunlight & Natural Ambient Fill (PBR) */}
      <ambientLight intensity={0.55} color="#8fa3b5" />

      {/* Primary Directional Sunlight with High-Resolution Shadows */}
      <directionalLight
        position={[35, 45, 25]}
        intensity={1.75}
        color="#fff5e6"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-32}
        shadow-camera-right={32}
        shadow-camera-top={32}
        shadow-camera-bottom={-32}
        shadow-bias={-0.00015}
        shadow-normalBias={0.02}
      />

      {/* Subtle Sky Bounce Light */}
      <directionalLight
        position={[-20, 15, -20]}
        intensity={0.35}
        color="#70889e"
      />

      {/* 3. Believable Tactical Combat Environment Map */}
      <TacticalMap />

      {/* 4. Realistic Ground Weapons resting on gear crates */}
      <Suspense fallback={null}>
        <RealisticWeaponPickup item={state.groundWeapons.gun1} />
        <RealisticWeaponPickup item={state.groundWeapons.gun2} />
      </Suspense>

      {/* 5. Realistic Rigged Vanguard Tactical Soldiers */}
      <Suspense fallback={null}>
        <RealisticPlayer
          player={state.players.player1}
          isLocal={activeId === 'player1'}
        />
        <RealisticPlayer
          player={state.players.player2}
          isLocal={activeId === 'player2'}
        />
      </Suspense>

      {/* 6. High-Velocity Bullet Tracers and Impact Sparks */}
      <BulletManager bullets={state.bullets} />

      {/* 7. Tactical Third-Person Player Controller */}
      <PlayerController
        activeId={activeId}
        onNearWeaponChange={onNearWeaponChange}
      />
      {/* 8. Optional Collision Wireframe Visualizer (when ?debug=1 or VITE_GAME_DEBUG=true) */}
      <CollisionDebugVisualizer />
      {/* 9. Optional Aim Target Debug Marker (when ?debug=1 or VITE_GAME_DEBUG=true) */}
      <AimDebugMarker />
    </>
  );
};
