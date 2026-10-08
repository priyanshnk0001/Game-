/**
 * @deprecated CollisionWorld has been migrated to React Three Rapier (PhysicsBridge).
 * This module remains as an authoritative compatibility proxy forwarding all calls to PhysicsBridge.
 */
import * as THREE from 'three';
import {
  PhysicsBridge,
  CollisionBox,
  VaultTarget,
  MapBounds,
} from '../physics/PhysicsBridge';

export type { CollisionBox, VaultTarget, MapBounds };

export class CollisionWorld {
  public static get obstacles(): CollisionBox[] {
    return PhysicsBridge.obstacles;
  }

  public static setMap(
    obstacles: CollisionBox[],
    bounds?: MapBounds,
    terrainHeightFn?: ((x: number, z: number) => number) | null
  ) {
    PhysicsBridge.setMap(obstacles, bounds, terrainHeightFn);
  }

  public static getGroundHeight(
    x: number,
    z: number,
    currentY = 0,
    radius = 0.42
  ): number {
    return PhysicsBridge.getGroundHeight(x, z, currentY, radius);
  }

  public static hasVerticalClearance(
    x: number,
    y: number,
    z: number,
    targetHeight: number,
    currentHeight: number
  ): boolean {
    return PhysicsBridge.hasVerticalClearance(x, y, z, targetHeight, currentHeight);
  }

  public static castCameraRay(
    targetHead: THREE.Vector3,
    desiredCamPos: THREE.Vector3,
    clearance = 0.25
  ): number {
    return PhysicsBridge.castCameraRay(targetHead, desiredCamPos, clearance);
  }

  public static castBulletRay(
    origin: THREE.Vector3,
    direction: THREE.Vector3,
    maxRange: number
  ) {
    return PhysicsBridge.castBulletRay(origin, direction, maxRange);
  }

  public static resolveCapsuleMovement(
    startX: number,
    startY: number,
    startZ: number,
    vx: number,
    vz: number,
    delta: number,
    radius = 0.42,
    height = 1.8,
    maxStepHeight = 0.35
  ) {
    return PhysicsBridge.resolveCapsuleMovement(
      startX,
      startY,
      startZ,
      vx,
      vz,
      delta,
      radius,
      height,
      maxStepHeight
    );
  }

  public static findVaultableObstacle(
    playerX: number,
    playerY: number,
    playerZ: number,
    forwardX: number,
    forwardZ: number,
    maxDistance = 1.35
  ): VaultTarget | null {
    return PhysicsBridge.findVaultableObstacle(
      playerX,
      playerY,
      playerZ,
      forwardX,
      forwardZ,
      maxDistance
    );
  }
}
