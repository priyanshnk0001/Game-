import React, { useMemo } from 'react';
import { PhysicsBridge } from '../physics/PhysicsBridge';
import { gameState } from '../../systems/gameState';
import { PLAYER_RADIUS, PLAYER_HEIGHT } from '../../config/constants';

/**
 * Rapier Physics Debug Wireframe Visualizer.
 * Renders physical collision bounds from the authoritative PhysicsBridge
 * when debug mode is enabled (?debug=1 or VITE_GAME_DEBUG=true).
 */
export const CollisionDebugVisualizer: React.FC = () => {
  const isDebug = useMemo(() => {
    return (
      import.meta.env.VITE_GAME_DEBUG === 'true' ||
      (typeof window !== 'undefined' && window.location.search.includes('debug=1'))
    );
  }, []);

  if (!isDebug) return null;

  const player1 = gameState.players.player1;
  const obstacles = PhysicsBridge.obstacles;

  return (
    <group name="RapierPhysicsDebugVisualizer">
      {/* Wireframe outlines for all physical obstacle colliders */}
      {obstacles.map((obs) => {
        if (obs.type === 'tree' && obs.treeTiers && obs.treeTiers.length > 0) {
          return (
            <group
              key={`debug-${obs.id}`}
              position={obs.position}
              rotation={[0, obs.rotationY, 0]}
            >
              {obs.treeTiers.map((tier, idx) => (
                <mesh key={`tier-${idx}`} position={[0, tier.offsetY, 0]}>
                  <cylinderGeometry args={[tier.radius, tier.radius, tier.halfHeight * 2, 16]} />
                  <meshBasicMaterial color="#10b981" wireframe transparent opacity={0.35} />
                </mesh>
              ))}
            </group>
          );
        }
        return (
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
        );
      })}

      {/* Local Player 1 Rapier Collision Capsule representation */}
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
