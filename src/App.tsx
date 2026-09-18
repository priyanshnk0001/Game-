import React, { useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { Scene } from './game/Scene';
import { TacticalHUD } from './components/hud/TacticalHUD';
import { WeaponId } from './types/game';

export const App: React.FC = () => {
  const [nearbyWeapon, setNearbyWeapon] = useState<{ id: WeaponId; name: string } | null>(null);

  const handleNearWeaponChange = (id: WeaponId | null, name: string | null) => {
    if (id && name) {
      setNearbyWeapon({ id, name });
    } else {
      setNearbyWeapon(null);
    }
  };

  return (
    <div className="relative w-full h-full bg-[#0a0d14] select-none overflow-hidden">
      {/* Realistic 3D WebGL Canvas */}
      <div className="canvas-container">
        <Canvas
          shadows
          camera={{ fov: 65, near: 0.1, far: 1000, position: [0, 2, 5] }}
          gl={{
            antialias: true,
            powerPreference: 'high-performance',
          }}
        >
          <Scene onNearWeaponChange={handleNearWeaponChange} />
        </Canvas>
      </div>

      {/* Modern Minimal Tactical HUD */}
      <TacticalHUD nearbyWeapon={nearbyWeapon} />
    </div>
  );
};

export default App;
