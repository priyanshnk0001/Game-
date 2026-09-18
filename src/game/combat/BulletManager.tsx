import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { BulletTracer } from '../../types/game';
import { gameState } from '../../systems/gameState';

interface BulletManagerProps {
  bullets: BulletTracer[];
}

// Single Tracer Line Component with animated fade
const TracerLine: React.FC<{ bullet: BulletTracer }> = ({ bullet }) => {
  const lineRef = useRef<THREE.Line>(null);
  const sparkRef = useRef<THREE.Mesh>(null);

  const start = new THREE.Vector3(...bullet.origin);
  const end = new THREE.Vector3(...bullet.target);

  const points = [start, end];
  const geometry = new THREE.BufferGeometry().setFromPoints(points);

  useFrame(() => {
    const elapsed = Date.now() - bullet.timestamp;
    const progress = Math.min(1, elapsed / 280);

    if (lineRef.current) {
      const mat = lineRef.current.material as THREE.LineBasicMaterial;
      mat.opacity = 1 - progress;
    }

    if (sparkRef.current) {
      const scale = (1 - progress) * (bullet.hitPlayerId ? 1.5 : 0.8);
      sparkRef.current.scale.set(scale, scale, scale);
    }
  });

  return (
    <group>
      {/* Laser Tracer Line */}
      {/* @ts-expect-error - Three.js line intrinsic element */}
      <line ref={lineRef} geometry={geometry}>
        <lineBasicMaterial
          color={bullet.color || '#38bdf8'}
          transparent
          opacity={1}
          linewidth={2}
        />
      </line>

      {/* Impact Spark / Particle at Hit Point */}
      <mesh ref={sparkRef} position={bullet.target}>
        <sphereGeometry args={[bullet.hitPlayerId ? 0.22 : 0.12, 8, 8]} />
        <meshBasicMaterial
          color={bullet.hitPlayerId ? '#ef4444' : '#fbbf24'}
          transparent
          opacity={0.9}
        />
      </mesh>
    </group>
  );
};

export const BulletManager: React.FC<BulletManagerProps> = ({ bullets }) => {
  useFrame(() => {
    gameState.clearExpiredBullets();
  });

  return (
    <group>
      {bullets.map((b) => (
        <TracerLine key={b.id} bullet={b} />
      ))}
    </group>
  );
};
