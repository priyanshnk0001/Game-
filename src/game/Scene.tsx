import React, { Suspense } from 'react';
import { Sky } from '@react-three/drei';
import { useGameState } from '../hooks/useGameState';
import { TacticalMap } from './environment/TacticalMap';
import { JungleMap } from './environment/JungleMap';
import { SnowMap } from './environment/SnowMap';
import { MAPS } from '../config/maps';
import { RealisticWeaponPickup } from './weapons/RealisticWeaponPickup';
import { RealisticPlayer } from './player/RealisticPlayer';
import { BulletManager } from './combat/BulletManager';
import { DecalManager } from './combat/DecalManager';
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
  const activeMapId = state.activeMapId || 'battle-area';
  const activeMapDef = MAPS[activeMapId] || MAPS['battle-area'];
  const sky = activeMapDef.sky;

  return (
    <>
      {/* 1. Realistic Sky & Atmospheric Depth */}
      <Sky
        distance={450000}
        sunPosition={sky.sunPosition}
        inclination={sky.inclination}
        azimuth={sky.azimuth}
        turbidity={sky.turbidity}
        rayleigh={sky.rayleigh}
        mieCoefficient={sky.mieCoefficient}
        mieDirectionalG={sky.mieDirectionalG}
      />
      <fog attach="fog" args={[sky.fogColor, sky.fogNear, sky.fogFar]} />

      {/* 2. Realistic Sunlight & Natural Ambient Fill (PBR) */}
      <ambientLight intensity={sky.ambientIntensity} color={sky.ambientColor} />

      {/* Primary Directional Sunlight with High-Resolution Shadows */}
      <directionalLight
        position={sky.sunPosition}
        intensity={sky.sunIntensity}
        color={sky.sunColor}
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
        intensity={sky.skyBounceIntensity}
        color={sky.skyBounceColor}
      />

      {/* 3. Believable Tactical Combat Environment Map */}
      {activeMapId === 'battle-area' && <TacticalMap />}
      {activeMapId === 'jungle-ops' && <JungleMap />}
      {activeMapId === 'snow-ops' && <SnowMap />}

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

      {/* 7. Bullet Impact Marks / Decals on Solid Surfaces */}
      <DecalManager decals={state.decals} />

      {/* 8. Tactical Third-Person Player Controller */}
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
