import React, { useMemo } from 'react';
import { CollisionWorld } from './CollisionWorld';
import { gameState } from '../../systems/gameState';
import { PLAYER_RADIUS, PLAYER_HEIGHT } from '../../config/constants';

export const CollisionDebugVisualizer: React.FC = () => {
  const isDebug = useMemo(() => {
    return (
      import.meta.env.VITE_GAME_DEBUG === 'true' ||
      (typeof window !== 'undefined' && window.location.search.includes('debug=1'))
    );
  }, []);

  if (!isDebug) return null;

  const player1 = gameState.players.player1;

  return (
    <group>
      {/* Wireframe outlines for all registered collision boxes */}
      {CollisionWorld.obstacles.map((obs) => (
        <group
          key={`debug-${obs.id}`}
          position={obs.position}
          rotation={[0, obs.rotationY, 0]}
        >
          <mesh>
            <boxGeometry args={obs.size} />
            <meshBasicMaterial color="#10b981" wireframe transparent opacity={0.35} />
          </mesh>
        </group>
      ))}

      {/* Local Player 1 Collision Capsule representation */}
      {player1 && (
        <group position={[player1.position[0], player1.position[1] + PLAYER_HEIGHT / 2, player1.position[2]]}>
          <mesh>
            <cylinderGeometry args={[PLAYER_RADIUS, PLAYER_RADIUS, PLAYER_HEIGHT, 12]} />
            <meshBasicMaterial color="#38bdf8" wireframe transparent opacity={0.5} />
          </mesh>
        </group>
      )}
    </group>
  );
};
