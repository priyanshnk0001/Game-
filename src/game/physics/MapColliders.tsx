import React, { useMemo } from 'react';
import { RigidBody, CuboidCollider, CylinderCollider } from '@react-three/rapier';
import { MAP_OBSTACLES } from '../../config/maps';
import { MapId } from '../../types/game';
import { CollisionBox, INTERACTION_GROUPS } from './PhysicsBridge';
import { SECTOR02_CONFIG } from '../environment/JungleMap';

interface MapCollidersProps {
  mapId: MapId;
}

/**
 * Rapier Static Environment Collider Manager.
 * Instantiates fixed rigid body colliders for all physical structures in the active map.
 */
export const MapColliders: React.FC<MapCollidersProps> = ({ mapId }) => {
  const obstacles = useMemo(() => {
    let list: CollisionBox[] = (MAP_OBSTACLES as Record<MapId, CollisionBox[]>)[mapId] || [];

    // Filter obstacles to match Sector-02 visibility flags
    if (mapId === 'jungle-ops') {
      list = list.filter((obs: CollisionBox) => {
        if (obs.id.startsWith('jungle_perim_')) return true;
        if (obs.type === 'tree') {
          return SECTOR02_CONFIG.ENABLE_TREES;
        }
        if (
          obs.type === 'building' ||
          obs.type === 'container' ||
          obs.type === 'wall' ||
          obs.type === 'barrier'
        ) {
          return SECTOR02_CONFIG.ENABLE_STRUCTURES;
        }
        if (obs.type === 'bunker' || obs.type === 'crate' || obs.type === 'pillar') {
          return SECTOR02_CONFIG.ENABLE_PROPS;
        }
        if (obs.type === 'rock' || obs.id.startsWith('log_')) {
          return SECTOR02_CONFIG.ENABLE_ROCKS_AND_LOGS;
        }
        if (obs.id.startsWith('bridge_')) {
          return SECTOR02_CONFIG.ENABLE_WATER_AND_BRIDGE;
        }
        return true;
      });
    }

    return list;
  }, [mapId]);

  return (
    <group name={`RapierMapColliders-${mapId}`}>
      {obstacles.map((obs: CollisionBox) => {
        const halfX = obs.size[0] / 2;
        const halfY = obs.size[1] / 2;
        const halfZ = obs.size[2] / 2;
        const rotY = obs.rotationY ?? 0;

        const surfaceType =
          obs.type === 'container' ? 'metal' :
          obs.type === 'crate' || obs.type === 'tree' ? 'wood' :
          obs.type === 'rock' ? 'stone' : 'concrete';

        return (
          <RigidBody
            key={`rapier-${obs.id}`}
            type="fixed"
            colliders={false}
            position={obs.position}
            rotation={[0, rotY, 0]}
            userData={{ obstacle: obs, surfaceType }}
          >
            {obs.type === 'tree' && obs.treeTiers && obs.treeTiers.length > 0 ? (
              obs.treeTiers.map((tier, idx) => (
                <CylinderCollider
                  key={`tier-${idx}`}
                  args={[tier.halfHeight, tier.radius]}
                  position={[0, tier.offsetY, 0]}
                  collisionGroups={INTERACTION_GROUPS.STATIC}
                />
              ))
            ) : obs.type === 'tree' || obs.type === 'pillar' ? (
              <CylinderCollider
                args={[halfY, Math.max(halfX, halfZ)]}
                collisionGroups={INTERACTION_GROUPS.STATIC}
              />
            ) : (
              <CuboidCollider
                args={[halfX, halfY, halfZ]}
                collisionGroups={INTERACTION_GROUPS.STATIC}
              />
            )}
          </RigidBody>
        );
      })}
    </group>
  );
};
