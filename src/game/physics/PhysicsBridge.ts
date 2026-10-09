import { useEffect } from 'react';
import * as THREE from 'three';
import { useRapier } from '@react-three/rapier';

export type RapierWorldInstance = ReturnType<typeof useRapier>['world'];
export type RapierInstance = ReturnType<typeof useRapier>['rapier'];

export interface TreeColliderTier {
  halfHeight: number;
  radius: number;
  offsetY: number;
}

export interface CollisionBox {
  id: string;
  position: [number, number, number];
  size: [number, number, number];
  rotationY: number;
  type: 'wall' | 'barrier' | 'bunker' | 'container' | 'building' | 'crate' | 'pillar' | 'rock' | 'tree' | 'bridge';
  treeTiers?: TreeColliderTier[];
}

export interface VaultTarget {
  obstacleId: string;
  startPos: [number, number, number];
  grabPos: [number, number, number];
  apexPos: [number, number, number];
  landPos: [number, number, number];
  duration: number;
  mode: 'vault' | 'mantle';
  obstacleHeight: number;
}

export interface MapBounds {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

// Rapier 16-bit Membership and Filter bitmasks for interaction groups
export const PHYSICS_LAYERS = {
  STATIC: 0x0001,      // Terrain, buildings, walls, obstacles
  PLAYER: 0x0002,      // Player capsules
  SENSOR: 0x0004,      // Vault triggers, water boundary probes
  COMBAT: 0x0008,      // Bullet hitscan rays, combat projectiles
  CAMERA: 0x0010,      // Third-person camera obstruction rays
  DYNAMIC: 0x0020,     // Vehicles, grenades, supply crates
} as const;

/**
 * Creates Rapier 32-bit interaction groups bitmask:
 * High 16 bits = membership (who this object is)
 * Low 16 bits = filter (who this object can interact/collide with)
 */
export function createInteractionGroup(memberships: number, filter: number): number {
  return ((memberships & 0xffff) << 16) | (filter & 0xffff);
}

// Preset interaction group bitmasks
export const INTERACTION_GROUPS = {
  // Static obstacles collide with players, camera rays, bullets, dynamics
  STATIC: createInteractionGroup(
    PHYSICS_LAYERS.STATIC,
    PHYSICS_LAYERS.PLAYER | PHYSICS_LAYERS.CAMERA | PHYSICS_LAYERS.COMBAT | PHYSICS_LAYERS.DYNAMIC
  ),
  // Player collides with static obstacles and other players
  PLAYER: createInteractionGroup(
    PHYSICS_LAYERS.PLAYER,
    PHYSICS_LAYERS.STATIC | PHYSICS_LAYERS.PLAYER | PHYSICS_LAYERS.DYNAMIC
  ),
  // Camera rays only test static obstacles
  CAMERA_RAY: createInteractionGroup(
    PHYSICS_LAYERS.CAMERA,
    PHYSICS_LAYERS.STATIC
  ),
  // Ground probe ray query: tests static terrain and obstacles
  GROUND_RAY: createInteractionGroup(
    PHYSICS_LAYERS.PLAYER,
    PHYSICS_LAYERS.STATIC
  ),
  // Bullets test static obstacles and players
  BULLET_RAY: createInteractionGroup(
    PHYSICS_LAYERS.COMBAT,
    PHYSICS_LAYERS.STATIC | PHYSICS_LAYERS.PLAYER
  ),
} as const;

/**
 * Centralized, synchronous bridge to Rapier's WASM World.
 * Authoritative system for:
 * - Kinematic character controller capsule resolution
 * - Downward terrain & obstacle ground height detection
 * - Upward vertical clearance verification
 * - Camera obstruction raycasts
 * - Bullet hitscan raycasts with surface classification
 * - Vault / mantle obstacle detection
 */
export class PhysicsBridge {
  private static _world: RapierWorldInstance | null = null;
  private static _rapier: RapierInstance | null = null;

  // Character controller state for kinematic capsule resolution
  private static _charController: any = null;
  private static _playerBody: any = null;
  private static _playerCollider: any = null;
  private static _currentCapsuleHeight = 1.8;
  private static _currentCapsuleRadius = 0.42;

  // Active map bounds and obstacles
  private static _obstacles: CollisionBox[] = [];
  private static _currentBounds: MapBounds = { minX: -120, maxX: 120, minZ: -120, maxZ: 120 };
  private static _terrainFn: ((x: number, z: number) => number) | null = null;

  public static setWorld(world: RapierWorldInstance, rapier: RapierInstance) {
    this._world = world;
    this._rapier = rapier;
    this._initCharacterController();
  }

  public static clearWorld() {
    this._charController = null;
    this._playerBody = null;
    this._playerCollider = null;
    this._world = null;
    this._rapier = null;
  }

  public static get world(): RapierWorldInstance | null {
    return this._world;
  }

  public static get rapier(): RapierInstance | null {
    return this._rapier;
  }

  public static isReady(): boolean {
    return this._world !== null && this._rapier !== null;
  }

  public static get obstacles(): CollisionBox[] {
    return this._obstacles;
  }

  public static setMap(
    obstacles: CollisionBox[],
    bounds: MapBounds = { minX: -120, maxX: 120, minZ: -120, maxZ: 120 },
    terrainFn: ((x: number, z: number) => number) | null = null
  ) {
    this._obstacles = obstacles;
    this._currentBounds = { ...bounds };
    this._terrainFn = terrainFn;
  }

  private static _initCharacterController() {
    if (!this._world || !this._rapier) return;
    try {
      this._charController = this._world.createCharacterController(0.01);
      this._charController.enableAutostep(0.35, 0.2, false);
      this._charController.setSlideEnabled(true);
      this._charController.setMaxSlopeClimbAngle((48 * Math.PI) / 180);
      this._charController.setMinSlopeSlideAngle((50 * Math.PI) / 180);

      const pDesc = this._rapier.RigidBodyDesc.kinematicPositionBased().setTranslation(0, 0.9, 0);
      this._playerBody = this._world.createRigidBody(pDesc);

      const halfH = Math.max(0.01, (1.8 - 2 * 0.42) / 2);
      this._playerCollider = this._world.createCollider(
        this._rapier.ColliderDesc.capsule(halfH, 0.42).setCollisionGroups(INTERACTION_GROUPS.PLAYER),
        this._playerBody
      );
      this._currentCapsuleHeight = 1.8;
      this._currentCapsuleRadius = 0.42;
    } catch (e) {
      console.warn('Failed to initialize Rapier Character Controller:', e);
    }
  }

  /**
   * Casts a ray through the Rapier world and returns the closest intersection.
   */
  public static castRay(
    origin: THREE.Vector3,
    direction: THREE.Vector3,
    maxToi = 100,
    groups?: number,
    excludeCollider?: any,
    excludeRigidBody?: any,
    solid = true
  ): {
    hit: boolean;
    toi: number;
    hitPoint: THREE.Vector3;
    normal?: THREE.Vector3;
    collider?: any;
  } | null {
    if (!this._world || !this._rapier) return null;

    const pCol = excludeCollider ?? this._playerCollider;
    const pBody = excludeRigidBody ?? this._playerBody;

    const ray = new this._rapier.Ray(origin, direction);
    const hit = this._world.castRayAndGetNormal(
      ray,
      maxToi,
      solid,
      undefined,
      groups,
      pCol,
      pBody,
      (c: any) => c !== pCol && (!pBody || (typeof c.parent === 'function' ? c.parent() !== pBody : true))
    ) as any;

    if (hit) {
      const toi = typeof hit.toi === 'number' ? hit.toi : (hit.timeOfImpact ?? 0);
      const hitPoint = new THREE.Vector3(
        origin.x + direction.x * toi,
        origin.y + direction.y * toi,
        origin.z + direction.z * toi
      );
      const normal = hit.normal
        ? new THREE.Vector3(hit.normal.x, hit.normal.y, hit.normal.z)
        : undefined;
      return { hit: true, toi, hitPoint, normal, collider: hit.collider };
    }

    return null;
  }

  /**
   * Authoritative ground height detection.
   * Uses Rapier downward raycast against static geometry (terrain and obstacle tops).
   */
  public static getGroundHeight(
    x: number,
    z: number,
    currentFeetY = 0,
    _radius = 0.42
  ): number {
    const baseTerrain = this._terrainFn ? this._terrainFn(x, z) : 0;

    if (!this._world || !this._rapier) {
      return baseTerrain;
    }

    // Cast downward ray starting above feet (+0.50m step reach).
    // Uses GROUND_RAY, solid=false (to prevent zero-toi penetration on start),
    // and strictly excludes player's own capsule and body!
    const origin = new THREE.Vector3(x, currentFeetY + 0.50, z);
    const downDir = new THREE.Vector3(0, -1, 0);

    const hit = this.castRay(
      origin,
      downDir,
      30,
      INTERACTION_GROUPS.GROUND_RAY,
      undefined,
      undefined,
      false
    );

    // Ground validation:
    // 1. Must have traversed non-zero distance (toi > 0.005) to avoid internal self-collision artifacts
    // 2. Must not be higher than legitimate step reach (hitPoint.y <= currentFeetY + 0.45)
    // 3. Must have an upward-facing standable slope (normal.y >= 0.5)
    if (
      hit &&
      hit.toi > 0.005 &&
      hit.hitPoint.y <= currentFeetY + 0.45 &&
      (!hit.normal || hit.normal.y >= 0.5)
    ) {
      return Math.max(baseTerrain, hit.hitPoint.y);
    }

    return baseTerrain;
  }

  /**
   * Overhead clearance verification for stance transitions (prone -> crouch -> stand).
   */
  public static hasVerticalClearance(
    x: number,
    y: number,
    z: number,
    targetHeight: number,
    currentHeight: number
  ): boolean {
    const requiredDistance = targetHeight - currentHeight;
    if (requiredDistance <= 0.01) return true;

    const origin = new THREE.Vector3(x, y + currentHeight, z);
    const upDir = new THREE.Vector3(0, 1, 0);

    const hit = this.castRay(origin, upDir, requiredDistance + 0.05, INTERACTION_GROUPS.STATIC);
    if (hit && hit.toi < requiredDistance) {
      return false; // Obstructed by ceiling or obstacle above
    }
    return true;
  }

  /**
   * Camera obstruction raycast against all static geometry.
   * Prevents third-person camera clipping through walls, ceilings, rocks or terrain.
   */
  public static castCameraRay(
    targetHead: THREE.Vector3,
    desiredCamPos: THREE.Vector3,
    clearance = 0.25
  ): number {
    const rayDir = new THREE.Vector3().subVectors(desiredCamPos, targetHead);
    const naturalDist = rayDir.length();
    if (naturalDist < 0.01) return naturalDist;
    rayDir.normalize();

    const hit = this.castRay(targetHead, rayDir, naturalDist, INTERACTION_GROUPS.CAMERA_RAY);
    if (hit) {
      return Math.max(clearance, hit.toi - 0.20);
    }

    return naturalDist;
  }

  /**
   * Combat bullet raycast against static geometry with surface classification.
   */
  public static castBulletRay(
    origin: THREE.Vector3,
    direction: THREE.Vector3,
    maxRange: number
  ): {
    hit: boolean;
    distance: number;
    hitPoint: THREE.Vector3;
    hitNormal?: THREE.Vector3;
    surfaceType?: 'concrete' | 'metal' | 'wood' | 'stone' | 'ground';
  } {
    const hit = this.castRay(origin, direction, maxRange, INTERACTION_GROUPS.BULLET_RAY);
    if (hit) {
      let surfaceType: 'concrete' | 'metal' | 'wood' | 'stone' | 'ground' = 'concrete';
      const uData = hit.collider?.parent?.()?.userData ?? hit.collider?.parent?.userData ?? hit.collider?.userData;
      if (uData && uData.surfaceType) {
        surfaceType = uData.surfaceType;
      } else if (!uData && hit.normal && hit.normal.y > 0.6) {
        surfaceType = 'ground';
      }

      return {
        hit: true,
        distance: hit.toi,
        hitPoint: hit.hitPoint,
        hitNormal: hit.normal,
        surfaceType,
      };
    }

    return {
      hit: false,
      distance: maxRange,
      hitPoint: new THREE.Vector3().copy(origin).addScaledVector(direction, maxRange),
    };
  }

  /**
   * Continuous Capsule-vs-World collision solver with autostep, corner relaxation and wall sliding.
   * Leverages Rapier KinematicCharacterController.
   */
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
  ): { x: number; y: number; z: number; vx: number; vz: number } {
    // If velocity is effectively zero, return identical position immediately to prevent any drift
    if (Math.abs(vx) < 1e-4 && Math.abs(vz) < 1e-4) {
      return {
        x: startX,
        y: startY,
        z: startZ,
        vx: 0,
        vz: 0,
      };
    }

    if (
      this._world &&
      this._rapier &&
      this._charController &&
      this._playerBody &&
      this._playerCollider
    ) {
      try {
        // Adjust collider shape if height or radius changed
        if (
          Math.abs(this._currentCapsuleHeight - height) > 0.05 ||
          Math.abs(this._currentCapsuleRadius - radius) > 0.02
        ) {
          this._world.removeCollider(this._playerCollider, false);
          const halfH = Math.max(0.01, (height - 2 * radius) / 2);
          this._playerCollider = this._world.createCollider(
            this._rapier.ColliderDesc.capsule(halfH, radius).setCollisionGroups(INTERACTION_GROUPS.PLAYER),
            this._playerBody
          );
          this._currentCapsuleHeight = height;
          this._currentCapsuleRadius = radius;
        }

        // Set body translation to starting capsule center
        this._playerBody.setTranslation(
          new this._rapier.Vector3(startX, startY + height / 2, startZ),
          true
        );
        this._world.propagateModifiedBodyPositionsToColliders();

        this._charController.enableAutostep(maxStepHeight, 0.2, false);

        const desiredTranslation = new this._rapier.Vector3(vx * delta, 0, vz * delta);
        this._charController.computeColliderMovement(
          this._playerCollider,
          desiredTranslation,
          undefined,
          INTERACTION_GROUPS.PLAYER
        );

        const mov = this._charController.computedMovement();
        let nextX = startX + mov.x;
        let nextZ = startZ + mov.z;

        // Map boundary limits
        nextX = Math.max(
          this._currentBounds.minX + radius,
          Math.min(this._currentBounds.maxX - radius, nextX)
        );
        nextZ = Math.max(
          this._currentBounds.minZ + radius,
          Math.min(this._currentBounds.maxZ - radius, nextZ)
        );

        // Synchronize player rigid body and colliders with final position immediately
        this._playerBody.setTranslation(
          new this._rapier.Vector3(nextX, startY + height / 2, nextZ),
          true
        );
        this._world.propagateModifiedBodyPositionsToColliders();

        const finalVx = delta > 0.0001 ? mov.x / delta : vx;
        const finalVz = delta > 0.0001 ? mov.z / delta : vz;

        // Horizontal capsule solver only modifies X and Z.
        // Vertical motion (Y) is strictly managed by gravity, jumping, falling, and ground adherence in PlayerController.
        return {
          x: nextX,
          y: startY,
          z: nextZ,
          vx: finalVx,
          vz: finalVz,
        };
      } catch (e) {
        console.warn('Rapier character movement computation fallback:', e);
      }
    }

    // Multi-pass geometric fallback for frame 0
    return this._fallbackCapsuleMovement(startX, startY, startZ, vx, vz, delta, radius, height, maxStepHeight);
  }

  private static _fallbackCapsuleMovement(
    startX: number,
    startY: number,
    startZ: number,
    vx: number,
    vz: number,
    delta: number,
    radius: number,
    height: number,
    _maxStepHeight: number
  ) {
    const subSteps = 3;
    const subDt = delta / subSteps;

    let curX = startX;
    let curY = startY;
    let curZ = startZ;
    let curVx = vx;
    let curVz = vz;

    // Filter obstacles spatially to avoid massive iteration loops
    const maxTravel = Math.max(0.2, Math.hypot(vx, vz) * delta) + radius + 1.0;
    const minX = startX - maxTravel;
    const maxX = startX + maxTravel;
    const minZ = startZ - maxTravel;
    const maxZ = startZ + maxTravel;

    const nearbyObstacles = this._obstacles.filter((obs) => {
      const halfX = obs.size[0] / 2 + 0.5;
      const halfZ = obs.size[2] / 2 + 0.5;
      return (
        obs.position[0] + halfX >= minX &&
        obs.position[0] - halfX <= maxX &&
        obs.position[2] + halfZ >= minZ &&
        obs.position[2] - halfZ <= maxZ
      );
    });

    for (let step = 0; step < subSteps; step++) {
      let nextX = curX + curVx * subDt;
      let nextZ = curZ + curVz * subDt;

      for (let pass = 0; pass < 4; pass++) {
        let hadCollision = false;

        for (const obs of nearbyObstacles) {
          const topY = obs.position[1] + obs.size[1] / 2;
          const bottomY = obs.position[1] - obs.size[1] / 2;

          if (curY >= topY - 0.02) continue;
          if (curY + height <= bottomY + 0.05) continue;

          // Specialized cylindrical tier collision for tree trunks and buttress flares
          if (obs.type === 'tree' && obs.treeTiers && obs.treeTiers.length > 0) {
            for (const tier of obs.treeTiers) {
              const tierCenterY = obs.position[1] + tier.offsetY;
              const tierTop = tierCenterY + tier.halfHeight;
              const tierBottom = tierCenterY - tier.halfHeight;
              if (curY >= tierTop - 0.02) continue;
              if (curY + height <= tierBottom + 0.05) continue;

              const dx = nextX - obs.position[0];
              const dz = nextZ - obs.position[2];
              const distSq = dx * dx + dz * dz;
              const totalR = tier.radius + radius;
              if (distSq < totalR * totalR) {
                hadCollision = true;
                const dist = Math.sqrt(Math.max(1e-8, distSq));
                const overlap = totalR - dist;
                const nx = dist > 1e-6 ? dx / dist : 1;
                const nz = dist > 1e-6 ? dz / dist : 0;

                const dot = curVx * nx + curVz * nz;
                if (dot < 0) {
                  curVx -= dot * nx;
                  curVz -= dot * nz;
                }
                nextX += nx * overlap;
                nextZ += nz * overlap;
              }
            }
            continue;
          }

          const cos = Math.cos(obs.rotationY ?? 0);
          const sin = Math.sin(obs.rotationY ?? 0);
          const dx = nextX - obs.position[0];
          const dz = nextZ - obs.position[2];

          const lx = cos * dx - sin * dz;
          const lz = sin * dx + cos * dz;

          const halfX = obs.size[0] / 2;
          const halfZ = obs.size[2] / 2;

          const clampedX = Math.max(-halfX, Math.min(halfX, lx));
          const clampedZ = Math.max(-halfZ, Math.min(halfZ, lz));

          const diffX = lx - clampedX;
          const diffZ = lz - clampedZ;
          const distSq = diffX * diffX + diffZ * diffZ;

          if (distSq < radius * radius) {
            hadCollision = true;
            let nx = 0;
            let nz = 0;
            let overlap = 0;

            if (distSq > 1e-8) {
              const dist = Math.sqrt(distSq);
              overlap = radius - dist;
              nx = diffX / dist;
              nz = diffZ / dist;
            } else {
              const pushX = (halfX - Math.abs(lx)) + radius;
              const pushZ = (halfZ - Math.abs(lz)) + radius;
              if (pushX < pushZ) {
                nx = lx >= 0 ? 1 : -1;
                nz = 0;
                overlap = pushX;
              } else {
                nx = 0;
                nz = lz >= 0 ? 1 : -1;
                overlap = pushZ;
              }
            }

            const resolvedLx = lx + nx * overlap;
            const resolvedLz = lz + nz * overlap;

            const worldNx = cos * nx + sin * nz;
            const worldNz = -sin * nx + cos * nz;

            const dot = curVx * worldNx + curVz * worldNz;
            if (dot < 0) {
              curVx -= dot * worldNx;
              curVz -= dot * worldNz;
            }

            nextX = obs.position[0] + (cos * resolvedLx + sin * resolvedLz);
            nextZ = obs.position[2] + (-sin * resolvedLx + cos * resolvedLz);
          }
        }

        if (!hadCollision) break;
      }

      nextX = Math.max(this._currentBounds.minX + radius, Math.min(this._currentBounds.maxX - radius, nextX));
      nextZ = Math.max(this._currentBounds.minZ + radius, Math.min(this._currentBounds.maxZ - radius, nextZ));

      curX = nextX;
      curZ = nextZ;
    }

    return { x: curX, y: curY, z: curZ, vx: curVx, vz: curVz };
  }

  /**
   * Evaluates terrain and obstacles to find contextual vaulting/mantling targets.
   */
  public static findVaultableObstacle(
    playerX: number,
    playerY: number,
    playerZ: number,
    forwardX: number,
    forwardZ: number,
    maxDistance = 1.35
  ): VaultTarget | null {
    const fLen = Math.sqrt(forwardX * forwardX + forwardZ * forwardZ);
    if (fLen < 1e-5) return null;
    const fNormX = forwardX / fLen;
    const fNormZ = forwardZ / fLen;

    const probeDist = maxDistance;
    const probeX = playerX + fNormX * probeDist;
    const probeZ = playerZ + fNormZ * probeDist;

    for (const obs of this._obstacles) {
      if (
        obs.type !== 'barrier' &&
        obs.type !== 'crate' &&
        obs.type !== 'container' &&
        obs.type !== 'wall' &&
        obs.type !== 'bunker'
      ) {
        continue;
      }

      const topY = obs.position[1] + obs.size[1] / 2;
      const relHeight = topY - playerY;

      if (relHeight < 0.65 || relHeight > 2.85) continue;

      const cos = Math.cos(obs.rotationY ?? 0);
      const sin = Math.sin(obs.rotationY ?? 0);
      const dx = probeX - obs.position[0];
      const dz = probeZ - obs.position[2];
      const lx = cos * dx - sin * dz;
      const lz = sin * dx + cos * dz;

      const halfX = obs.size[0] / 2;
      const halfZ = obs.size[2] / 2;

      if (Math.abs(lx) > halfX + 0.35 || Math.abs(lz) > halfZ + 0.35) continue;

      const mode: 'vault' | 'mantle' = relHeight <= 1.45 ? 'vault' : 'mantle';
      const duration = mode === 'vault' ? 0.68 : 1.15;

      const startPos: [number, number, number] = [playerX, playerY, playerZ];
      const grabPos: [number, number, number] = [
        playerX + fNormX * 0.45,
        topY,
        playerZ + fNormZ * 0.45,
      ];
      const apexPos: [number, number, number] = [
        playerX + fNormX * (mode === 'vault' ? 0.95 : 0.65),
        topY + (mode === 'vault' ? 0.32 : 0.55),
        playerZ + fNormZ * (mode === 'vault' ? 0.95 : 0.65),
      ];

      const rawLandX = playerX + fNormX * (mode === 'vault' ? 1.85 : 1.15);
      const rawLandZ = playerZ + fNormZ * (mode === 'vault' ? 1.85 : 1.15);
      const landY = mode === 'vault' ? playerY : topY;

      let landingBlocked = false;
      for (const other of this._obstacles) {
        if (other.id === obs.id) continue;
        const otherTopY = other.position[1] + other.size[1] / 2;
        if (landY < otherTopY - 0.05) {
          const oCos = Math.cos(other.rotationY ?? 0);
          const oSin = Math.sin(other.rotationY ?? 0);
          const odx = rawLandX - other.position[0];
          const odz = rawLandZ - other.position[2];
          const olx = oCos * odx - oSin * odz;
          const olz = oSin * odx + oCos * odz;
          if (
            Math.abs(olx) <= other.size[0] / 2 + 0.35 &&
            Math.abs(olz) <= other.size[2] / 2 + 0.35
          ) {
            landingBlocked = true;
            break;
          }
        }
      }

      if (landingBlocked) continue;

      const landPos: [number, number, number] = [rawLandX, landY, rawLandZ];

      return {
        obstacleId: obs.id,
        startPos,
        grabPos,
        apexPos,
        landPos,
        duration,
        mode,
        obstacleHeight: relHeight,
      };
    }

    return null;
  }
}

/**
 * Synchronization component mounted inside `<Physics>` to capture the live Rapier world reference.
 */
export const PhysicsBridgeSync: React.FC = () => {
  const { world, rapier } = useRapier();

  useEffect(() => {
    if (world && rapier) {
      PhysicsBridge.setWorld(world, rapier);
    }
    return () => {
      PhysicsBridge.clearWorld();
    };
  }, [world, rapier]);

  return null;
};
