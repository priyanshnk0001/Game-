import React, { useMemo } from 'react';
import { useGameState } from '../../hooks/useGameState';

/**
 * Development-only debug marker for testing authoritative aim alignment.
 * Only rendered when ?debug=1 or VITE_GAME_DEBUG=true, and weapon is READY.
 */
export const AimDebugMarker: React.FC = () => {
  const isDebug = useMemo(() => {
    return (
      import.meta.env.VITE_GAME_DEBUG === 'true' ||
      (typeof window !== 'undefined' && window.location.search.includes('debug=1'))
    );
  }, []);

  const state = useGameState();
  const player = state.players[state.activePlayerId];

  if (!isDebug || !player || player.weaponState !== 'ready' || !player.aimTarget || player.isDead) {
    return null;
  }

  const [x, y, z] = player.aimTarget;

  return (
    <group position={[x, y, z]}>
      {/* Small glowing target sphere */}
      <mesh>
        <sphereGeometry args={[0.08, 16, 16]} />
        <meshBasicMaterial color="#ef4444" wireframe />
      </mesh>
      {/* Pulsing center point */}
      <mesh>
        <sphereGeometry args={[0.025, 8, 8]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>
    </group>
  );
};
