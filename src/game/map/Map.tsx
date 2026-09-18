import React from 'react';
import * as THREE from 'three';
import { MAP_OBSTACLES, PLAYER_SPAWNS } from '../../config/constants';

export const Map: React.FC = () => {
  return (
    <group>
      {/* Main Ground Platform */}
      <mesh receiveShadow position={[0, -0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[56, 56]} />
        <meshStandardMaterial color="#0b0f19" roughness={0.85} metalness={0.15} />
      </mesh>

      {/* Grid Floor Overlay for high-tech tactical arena feel */}
      <gridHelper
        args={[54, 54, '#1e293b', '#111827']}
        position={[0, 0.01, 0]}
      />

      {/* Outer Arena Boundary Wall (Glass/Neon Energy Barriers) */}
      {/* North Wall */}
      <mesh position={[0, 2.5, -27]}>
        <boxGeometry args={[54, 5, 0.4]} />
        <meshStandardMaterial color="#0f172a" roughness={0.5} transparent opacity={0.85} />
      </mesh>
      {/* South Wall */}
      <mesh position={[0, 2.5, 27]}>
        <boxGeometry args={[54, 5, 0.4]} />
        <meshStandardMaterial color="#0f172a" roughness={0.5} transparent opacity={0.85} />
      </mesh>
      {/* West Wall */}
      <mesh position={[-27, 2.5, 0]}>
        <boxGeometry args={[0.4, 5, 54]} />
        <meshStandardMaterial color="#0f172a" roughness={0.5} transparent opacity={0.85} />
      </mesh>
      {/* East Wall */}
      <mesh position={[27, 2.5, 0]}>
        <boxGeometry args={[0.4, 5, 54]} />
        <meshStandardMaterial color="#0f172a" roughness={0.5} transparent opacity={0.85} />
      </mesh>

      {/* Perimeter glowing neon base strips */}
      <mesh position={[0, 0.08, -26.8]}>
        <boxGeometry args={[53.6, 0.1, 0.1]} />
        <meshBasicMaterial color="#38bdf8" />
      </mesh>
      <mesh position={[0, 0.08, 26.8]}>
        <boxGeometry args={[53.6, 0.1, 0.1]} />
        <meshBasicMaterial color="#38bdf8" />
      </mesh>
      <mesh position={[-26.8, 0.08, 0]}>
        <boxGeometry args={[0.1, 0.1, 53.6]} />
        <meshBasicMaterial color="#38bdf8" />
      </mesh>
      <mesh position={[26.8, 0.08, 0]}>
        <boxGeometry args={[0.1, 0.1, 53.6]} />
        <meshBasicMaterial color="#38bdf8" />
      </mesh>

      {/* Player 1 Spawn Pad (Tactical Cyan) */}
      <group position={PLAYER_SPAWNS.player1}>
        <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[2.2, 32]} />
          <meshBasicMaterial color="#06b6d4" transparent opacity={0.25} />
        </mesh>
        <mesh position={[0, 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[2.0, 2.2, 32]} />
          <meshBasicMaterial color="#06b6d4" />
        </mesh>
      </group>

      {/* Player 2 Spawn Pad (Tactical Crimson) */}
      <group position={PLAYER_SPAWNS.player2}>
        <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[2.2, 32]} />
          <meshBasicMaterial color="#f43f5e" transparent opacity={0.25} />
        </mesh>
        <mesh position={[0, 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[2.0, 2.2, 32]} />
          <meshBasicMaterial color="#f43f5e" />
        </mesh>
      </group>

      {/* Map Obstacles & Buildings */}
      {MAP_OBSTACLES.map((obs) => {
        if (obs.type === 'building') {
          return (
            <group key={obs.id} position={obs.position}>
              {/* Main Building Block */}
              <mesh castShadow receiveShadow>
                <boxGeometry args={obs.size} />
                <meshStandardMaterial color="#1e293b" metalness={0.4} roughness={0.6} />
              </mesh>
              {/* Roof Trim */}
              <mesh position={[0, obs.size[1] / 2 + 0.05, 0]}>
                <boxGeometry args={[obs.size[0] + 0.2, 0.1, obs.size[2] + 0.2]} />
                <meshStandardMaterial color="#334155" metalness={0.7} roughness={0.3} />
              </mesh>
              {/* Glowing window slit */}
              <mesh position={[0, 0.8, obs.size[2] / 2 + 0.01]}>
                <boxGeometry args={[obs.size[0] * 0.6, 0.4, 0.02]} />
                <meshBasicMaterial color="#38bdf8" />
              </mesh>
            </group>
          );
        }

        if (obs.type === 'crate') {
          return (
            <group key={obs.id} position={obs.position}>
              <mesh castShadow receiveShadow>
                <boxGeometry args={obs.size} />
                <meshStandardMaterial color="#475569" metalness={0.5} roughness={0.5} />
              </mesh>
              {/* Steel Frame Edges */}
              <lineSegments>
                <edgesGeometry args={[new THREE.BoxGeometry(...obs.size)]} />
                <lineBasicMaterial color="#94a3b8" />
              </lineSegments>
            </group>
          );
        }

        if (obs.type === 'pillar') {
          return (
            <group key={obs.id} position={obs.position}>
              <mesh castShadow receiveShadow>
                <cylinderGeometry args={[obs.size[0] / 2, obs.size[0] / 2, obs.size[1], 16]} />
                <meshStandardMaterial color="#1e293b" metalness={0.5} roughness={0.5} />
              </mesh>
              <mesh position={[0, obs.size[1] / 2, 0]}>
                <cylinderGeometry args={[obs.size[0] / 2 + 0.1, obs.size[0] / 2 + 0.1, 0.2, 16]} />
                <meshBasicMaterial color="#64748b" />
              </mesh>
            </group>
          );
        }

        // Walls / Cover
        return (
          <group key={obs.id} position={obs.position}>
            <mesh castShadow receiveShadow>
              <boxGeometry args={obs.size} />
              <meshStandardMaterial color="#334155" metalness={0.3} roughness={0.7} />
            </mesh>
            {/* Top yellow/black hazard trim */}
            <mesh position={[0, obs.size[1] / 2 + 0.02, 0]}>
              <boxGeometry args={[obs.size[0], 0.04, obs.size[2] * 1.05]} />
              <meshBasicMaterial color="#eab308" />
            </mesh>
          </group>
        );
      })}
    </group>
  );
};
