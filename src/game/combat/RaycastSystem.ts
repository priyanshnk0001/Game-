// Accurate 3D raycast hit detection intersecting map obstacles and player hitboxes

import * as THREE from 'three';
import { CollisionWorld } from '../collision/CollisionWorld';
import { PlayerId, PlayerState } from '../../types/game';

export type SurfaceType = 'concrete' | 'metal' | 'wood' | 'stone' | 'ground';

export interface RaycastHitResult {
  hit: boolean;
  hitPlayerId: PlayerId | null;
  hitPoint: [number, number, number];
  hitNormal?: [number, number, number];
  surfaceType?: SurfaceType;
  distance: number;
}

export class RaycastCombatSystem {
  private static ray = new THREE.Ray();
  private static hitVec = new THREE.Vector3();
  private static box = new THREE.Box3();

  /**
   * Casts a true 3D ray into the scene.
   * Checks collision with opponents and map obstacles.
   */
  static castShot(
    origin: THREE.Vector3,
    direction: THREE.Vector3,
    shooterId: PlayerId,
    allPlayers: Record<PlayerId, PlayerState>,
    maxRange = 120
  ): RaycastHitResult {
    this.ray.origin.copy(origin);
    this.ray.direction.copy(direction).normalize();

    let closestDist = maxRange;
    let hitPlayerId: PlayerId | null = null;
    let finalHitNormal: [number, number, number] | undefined = undefined;
    let finalSurfaceType: SurfaceType | undefined = undefined;

    const finalHitPoint = new THREE.Vector3()
      .copy(origin)
      .addScaledVector(this.ray.direction, maxRange);

    // 1. Check intersection with map obstacles / cover using CollisionWorld
    const obsHit = CollisionWorld.castBulletRay(origin, this.ray.direction, maxRange);
    if (obsHit.hit && obsHit.distance < closestDist) {
      closestDist = obsHit.distance;
      finalHitPoint.copy(obsHit.hitPoint);
      if (obsHit.hitNormal) {
        finalHitNormal = [obsHit.hitNormal.x, obsHit.hitNormal.y, obsHit.hitNormal.z];
      }
      finalSurfaceType = obsHit.surfaceType;
    }

    // 2. Check intersection with the opponent player
    const opponentId: PlayerId = shooterId === 'player1' ? 'player2' : 'player1';
    const opponent = allPlayers[opponentId];

    if (opponent && !opponent.isDead) {
      // Create accurate bounding box for opponent body (width: 0.8, height: 1.9, depth: 0.8)
      const opX = opponent.position[0];
      const opY = opponent.position[1];
      const opZ = opponent.position[2];

      this.box.min.set(opX - 0.45, opY, opZ - 0.45);
      this.box.max.set(opX + 0.45, opY + 1.9, opZ + 0.45);

      if (this.ray.intersectBox(this.box, this.hitVec)) {
        const dist = origin.distanceTo(this.hitVec);
        // Opponent is hit only if not obstructed by a wall closer than the player!
        if (dist < closestDist) {
          closestDist = dist;
          finalHitPoint.copy(this.hitVec);
          hitPlayerId = opponentId;
          finalHitNormal = undefined;
          finalSurfaceType = undefined;
        }
      }
    }

    return {
      hit: hitPlayerId !== null || obsHit.hit,
      hitPlayerId,
      hitPoint: [finalHitPoint.x, finalHitPoint.y, finalHitPoint.z],
      hitNormal: finalHitNormal,
      surfaceType: finalSurfaceType,
      distance: closestDist,
    };
  }
}
