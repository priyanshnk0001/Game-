import * as THREE from 'three';
import {
  MAP_BOUNDS,
  VAULT_MIN_HEIGHT,
  VAULT_MAX_HEIGHT,
  VAULT_MAX_DEPTH,
  VAULT_DURATION,
  MANTLE_MIN_HEIGHT,
  MANTLE_MAX_HEIGHT,
  MANTLE_MAX_DEPTH,
  MANTLE_DURATION,
} from '../../config/constants';

export interface CollisionBox {
  id: string;
  position: [number, number, number]; // Center [x, y, z]
  size: [number, number, number];     // Dimensions [width, height, depth]
  rotationY: number;                  // Rotation around Y axis in radians
  type: 'wall' | 'barrier' | 'bunker' | 'container' | 'building' | 'crate' | 'pillar' | 'rock' | 'tree';
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

export class CollisionWorld {
  // Current active map boundary limits
  public static currentBounds = { ...MAP_BOUNDS };

  // Master registry of all physical map structures
  public static obstacles: CollisionBox[] = [
    // 1. Concrete Perimeter Walls (56m x 4m x 0.8m)
    { id: 'perim_north', position: [0, 2.0, -28], size: [56, 4.0, 0.8], rotationY: 0, type: 'wall' },
    { id: 'perim_south', position: [0, 2.0, 28], size: [56, 4.0, 0.8], rotationY: 0, type: 'wall' },
    { id: 'perim_west', position: [-28, 2.0, 0], size: [0.8, 4.0, 56], rotationY: 0, type: 'wall' },
    { id: 'perim_east', position: [28, 2.0, 0], size: [0.8, 4.0, 56], rotationY: 0, type: 'wall' },

    // 2. Concrete Jersey Barriers (Width 3.2m, Height 1.05m, Depth 0.65m)
    { id: 'jersey_center_north', position: [0, 0.525, -3.2], size: [3.2, 1.05, 0.65], rotationY: 0, type: 'barrier' },
    { id: 'jersey_center_south', position: [0, 0.525, 3.2], size: [3.2, 1.05, 0.65], rotationY: 0, type: 'barrier' },
    { id: 'jersey_diag_nw', position: [-6.5, 0.525, 8.5], size: [3.2, 1.05, 0.65], rotationY: Math.PI / 4, type: 'barrier' },
    { id: 'jersey_diag_se', position: [6.5, 0.525, -8.5], size: [3.2, 1.05, 0.65], rotationY: Math.PI / 4, type: 'barrier' },
    { id: 'jersey_diag_ne', position: [-10.5, 0.525, -4.5], size: [3.2, 1.05, 0.65], rotationY: -Math.PI / 6, type: 'barrier' },
    { id: 'jersey_diag_sw', position: [10.5, 0.525, 4.5], size: [3.2, 1.05, 0.65], rotationY: -Math.PI / 6, type: 'barrier' },

    // 3. Sandbag Fortified Positions (Width 2.6m, Height 1.05m, Depth 0.8m)
    { id: 'sandbag_mid_left', position: [-4.5, 0.525, 1.5], size: [2.6, 1.05, 0.8], rotationY: Math.PI / 2, type: 'bunker' },
    { id: 'sandbag_mid_right', position: [4.5, 0.525, -1.5], size: [2.6, 1.05, 0.8], rotationY: -Math.PI / 2, type: 'bunker' },
    { id: 'sandbag_flank_left', position: [-12, 0.525, 6], size: [2.6, 1.05, 0.8], rotationY: 0, type: 'bunker' },
    { id: 'sandbag_flank_right', position: [12, 0.525, -6], size: [2.6, 1.05, 0.8], rotationY: 0, type: 'bunker' },

    // 4. Military Shipping Containers (Length 6.5m, Height 2.6m, Width 2.5m)
    { id: 'container_alpha', position: [-9, 1.3, -9], size: [6.5, 2.6, 2.5], rotationY: 0.2, type: 'container' },
    { id: 'container_bravo', position: [9, 1.3, 9], size: [6.5, 2.6, 2.5], rotationY: -0.2, type: 'container' },

    // 5. Command Bunker Shoot House (Mid-Left, Base at [-16, 0, -14])
    { id: 'bunker1_back_wall', position: [-16, 1.8, -14], size: [7.5, 3.6, 0.6], rotationY: 0, type: 'building' },
    { id: 'bunker1_left_wall', position: [-19.45, 1.8, -10.5], size: [0.6, 3.6, 7.0], rotationY: 0, type: 'building' },
    { id: 'bunker1_right_wall', position: [-12.55, 1.8, -10.5], size: [0.6, 3.6, 7.0], rotationY: 0, type: 'building' },
    { id: 'bunker1_roof', position: [-16, 3.75, -10.5], size: [8.0, 0.4, 7.6], rotationY: 0, type: 'building' },

    // 6. Observation Shoot House (Mid-Right, Base at [16, 0, 14])
    { id: 'bunker2_back_wall', position: [16, 1.8, 14], size: [7.5, 3.6, 0.6], rotationY: 0, type: 'building' },
    { id: 'bunker2_right_wall', position: [19.45, 1.8, 10.5], size: [0.6, 3.6, 7.0], rotationY: 0, type: 'building' },
    { id: 'bunker2_left_wall', position: [12.55, 1.8, 10.5], size: [0.6, 3.6, 7.0], rotationY: 0, type: 'building' },
    { id: 'bunker2_roof', position: [16, 3.75, 10.5], size: [8.0, 0.4, 7.6], rotationY: 0, type: 'building' },

    // 7. Military Ammo Crate Stacks
    { id: 'crates_center', position: [0, 0.65, 0], size: [1.5, 1.3, 1.1], rotationY: 0, type: 'crate' },
    { id: 'crates_flank_1', position: [-3.5, 0.65, 7.5], size: [1.5, 1.3, 1.1], rotationY: 0, type: 'crate' },
    { id: 'crates_flank_2', position: [3.5, 0.65, -7.5], size: [1.5, 1.3, 1.1], rotationY: 0, type: 'crate' },

    // 8. Industrial Light Tower Poles
    { id: 'tower_nw', position: [-24, 3.5, -24], size: [0.5, 7.0, 0.5], rotationY: 0, type: 'pillar' },
    { id: 'tower_ne', position: [24, 3.5, -24], size: [0.5, 7.0, 0.5], rotationY: 0, type: 'pillar' },
    { id: 'tower_sw', position: [-24, 3.5, 24], size: [0.5, 7.0, 0.5], rotationY: 0, type: 'pillar' },
    { id: 'tower_se', position: [24, 3.5, 24], size: [0.5, 7.0, 0.5], rotationY: 0, type: 'pillar' },
  ];

  /**
   * Evaluates the highest solid surface beneath the player's feet.
   * Returns 0 for natural ground, or obstacle top height if standing on a crate/barrier/roof.
   */
  public static getGroundHeight(
    x: number,
    z: number,
    currentFeetY: number,
    footprintRadius = 0.35
  ): number {
    let highestGround = 0;

    for (const obs of this.obstacles) {
      const topY = obs.position[1] + obs.size[1] / 2;

      // Only surfaces beneath or within step reach of player's feet can support them
      if (topY > currentFeetY + 0.38) continue;

      const cos = Math.cos(obs.rotationY);
      const sin = Math.sin(obs.rotationY);
      const dx = x - obs.position[0];
      const dz = z - obs.position[2];

      const lx = cos * dx - sin * dz;
      const lz = sin * dx + cos * dz;

      const halfX = obs.size[0] / 2 + footprintRadius * 0.4;
      const halfZ = obs.size[2] / 2 + footprintRadius * 0.4;

      if (Math.abs(lx) <= halfX && Math.abs(lz) <= halfZ) {
        if (topY > highestGround) {
          highestGround = topY;
        }
      }
    }

    return highestGround;
  }

  /**
   * Verifies if there is adequate vertical clearance above the player to stand or crouch.
   * Prevents standing up under low ceilings, bunker eaves, or low obstacles.
   */
  public static hasVerticalClearance(
    x: number,
    y: number,
    z: number,
    targetHeight: number,
    currentHeight: number,
    radius = 0.38
  ): boolean {
    for (const obs of this.obstacles) {
      const topY = obs.position[1] + obs.size[1] / 2;
      const bottomY = obs.position[1] - obs.size[1] / 2;

      // Only obstacles that intersect the headroom space above the player are relevant
      if (bottomY >= y + targetHeight - 0.04) continue; // Plenty of overhead space
      if (topY <= y + currentHeight + 0.05) continue;   // Surface is below current head

      // Check horizontal footprint in obstacle local coordinates
      const cos = Math.cos(obs.rotationY);
      const sin = Math.sin(obs.rotationY);
      const dx = x - obs.position[0];
      const dz = z - obs.position[2];

      const lx = cos * dx - sin * dz;
      const lz = sin * dx + cos * dz;

      const halfX = obs.size[0] / 2 + radius * 0.85;
      const halfZ = obs.size[2] / 2 + radius * 0.85;

      if (Math.abs(lx) <= halfX && Math.abs(lz) <= halfZ) {
        return false; // Obstacle blocks standing / rising up!
      }
    }
    return true;
  }

  /**
   * Contextual detection of vaultable obstacles directly ahead of the player.
   * Checks obstacle type, height (waist-to-chest), depth, and clearance of the landing spot on the other side.
   */
  public static findVaultableObstacle(
    playerX: number,
    playerY: number,
    playerZ: number,
    dirX: number,
    dirZ: number,
    maxProbeDist = 1.35
  ): VaultTarget | null {
    const dirLen = Math.hypot(dirX, dirZ);
    if (dirLen < 0.01) return null;
    const ndx = dirX / dirLen;
    const ndz = dirZ / dirLen;

    for (const obs of this.obstacles) {
      const topY = obs.position[1] + obs.size[1] / 2;
      const relHeight = topY - playerY;

      // 1. Low Tactical Obstacles: Quick Vault (waist-to-chest, 0.55m - 1.35m)
      const isVaultCandidate =
        (obs.type === 'barrier' || obs.type === 'crate' || obs.type === 'bunker') &&
        relHeight >= VAULT_MIN_HEIGHT &&
        relHeight <= VAULT_MAX_HEIGHT;

      // 2. Medium-Height Walls: Two-Handed Wall Climb & Mantle (1.35m - 2.35m)
      const isMantleCandidate =
        (obs.type === 'wall' || obs.type === 'barrier' || obs.type === 'bunker' || obs.type === 'crate') &&
        relHeight >= MANTLE_MIN_HEIGHT &&
        relHeight <= MANTLE_MAX_HEIGHT;

      if (!isVaultCandidate && !isMantleCandidate) continue;

      const mode: 'vault' | 'mantle' = isMantleCandidate ? 'mantle' : 'vault';
      const maxDepth = mode === 'mantle' ? MANTLE_MAX_DEPTH : VAULT_MAX_DEPTH;
      const duration = mode === 'mantle' ? MANTLE_DURATION : VAULT_DURATION;

      // Transform player position and probe ray to obstacle local space
      const cos = Math.cos(obs.rotationY);
      const sin = Math.sin(obs.rotationY);
      const dx = playerX - obs.position[0];
      const dz = playerZ - obs.position[2];

      const plx = cos * dx - sin * dz;
      const plz = sin * dx + cos * dz;

      const ldx = cos * ndx - sin * ndz;
      const ldz = sin * ndx + cos * ndz;

      const halfX = obs.size[0] / 2;
      const halfZ = obs.size[2] / 2;

      // Ray-AABB intersection in local 2D space
      let tNear = -Infinity;
      let tFar = Infinity;

      // X slab
      if (Math.abs(ldx) > 1e-6) {
        let t1 = (-halfX - plx) / ldx;
        let t2 = (halfX - plx) / ldx;
        if (t1 > t2) { const tmp = t1; t1 = t2; t2 = tmp; }
        tNear = Math.max(tNear, t1);
        tFar = Math.min(tFar, t2);
      } else {
        if (plx < -halfX || plx > halfX) continue;
      }

      // Z slab
      if (Math.abs(ldz) > 1e-6) {
        let t1 = (-halfZ - plz) / ldz;
        let t2 = (halfZ - plz) / ldz;
        if (t1 > t2) { const tmp = t1; t1 = t2; t2 = tmp; }
        tNear = Math.max(tNear, t1);
        tFar = Math.min(tFar, t2);
      } else {
        if (plz < -halfZ || plz > halfZ) continue;
      }

      if (tNear > tFar || tFar < 0) continue;

      // Player must be close enough to front edge (between 0.05m and maxProbeDist)
      const allowedProbe = mode === 'mantle' ? maxProbeDist + 0.25 : maxProbeDist;
      const distToFront = Math.max(0, tNear);
      if (distToFront > allowedProbe) continue;

      const obstacleDepth = tFar - distToFront;
      if (obstacleDepth <= 0.1 || obstacleDepth > maxDepth) continue;

      // Compute world waypoints along the trajectory
      const startPos: [number, number, number] = [playerX, playerY, playerZ];

      // Hand grab edge: on top surface along the front boundary
      const grabDist = distToFront + 0.12;
      const grabPos: [number, number, number] = [
        playerX + ndx * grabDist,
        topY,
        playerZ + ndz * grabDist,
      ];

      // Apex point: cresting over the middle of the obstacle
      const apexDist = distToFront + obstacleDepth * 0.5;
      const apexHeightOffset = mode === 'mantle' ? 0.35 : 0.22;
      const apexPos: [number, number, number] = [
        playerX + ndx * apexDist,
        topY + apexHeightOffset,
        playerZ + ndz * apexDist,
      ];

      // Landing point on opposite side: past obstacle back edge by 0.65m
      const landDist = tFar + 0.65;
      const rawLandX = playerX + ndx * landDist;
      const rawLandZ = playerZ + ndz * landDist;

      // Landing space verification: within map bounds
      if (
        rawLandX < this.currentBounds.minX + 0.5 ||
        rawLandX > this.currentBounds.maxX - 0.5 ||
        rawLandZ < this.currentBounds.minZ + 0.5 ||
        rawLandZ > this.currentBounds.maxZ - 0.5
      ) {
        continue;
      }

      const landY = this.getGroundHeight(rawLandX, rawLandZ, topY);

      // Verify landing spot is unobstructed by solid walls/buildings
      let landingBlocked = false;
      for (const other of this.obstacles) {
        if (other.id === obs.id) continue;
        if (other.type === 'wall' || other.type === 'building' || other.type === 'pillar') {
          const oCos = Math.cos(other.rotationY);
          const oSin = Math.sin(other.rotationY);
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

  /**
   * Continuous Capsule-vs-Obstacles collision solver with step traversal, corner relaxation, and wall sliding.
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
    const subSteps = 3;
    const subDt = delta / subSteps;

    let curX = startX;
    let curY = startY;
    let curZ = startZ;
    let curVx = vx;
    let curVz = vz;

    for (let step = 0; step < subSteps; step++) {
      let nextX = curX + curVx * subDt;
      let nextZ = curZ + curVz * subDt;

      // Multi-pass relaxation loop (up to 4 passes) to resolve adjacent walls and corners cleanly
      for (let pass = 0; pass < 4; pass++) {
        let hadCollision = false;

        // Check collision against all registered obstacles
        for (const obs of this.obstacles) {
          const topY = obs.position[1] + obs.size[1] / 2;
          const bottomY = obs.position[1] - obs.size[1] / 2;

          // If player is safely above or below the obstacle, no horizontal collision
          if (curY >= topY - 0.02) continue;
          if (curY + height <= bottomY + 0.05) continue;

          // Transform test position into obstacle local coordinate frame (Three.js right-hand Y rotation)
          const cos = Math.cos(obs.rotationY);
          const sin = Math.sin(obs.rotationY);
          const dx = nextX - obs.position[0];
          const dz = nextZ - obs.position[2];

          // Inverse rotation matrix:
          const lx = cos * dx - sin * dz;
          const lz = sin * dx + cos * dz;

          const halfX = obs.size[0] / 2;
          const halfZ = obs.size[2] / 2;

          // Step-up traversal: only for low step-able obstacles (crates, low barriers), never walls/buildings/containers
          const canStepUp = obs.type !== 'wall' && obs.type !== 'building' && obs.type !== 'container';
          if (canStepUp) {
            const stepDelta = topY - curY;
            if (stepDelta > 0 && stepDelta <= maxStepHeight) {
              // If within horizontal footprint, step onto obstacle top
              if (Math.abs(lx) <= halfX + radius && Math.abs(lz) <= halfZ + radius) {
                curY = topY;
                continue; // Successfully stepped up
              }
            }
          }

          // Standard solid collision: clamp to box boundaries in local coordinate frame
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
              // Capsule center is inside the box: push out along closest local face
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

            // Push local position out
            const resolvedLx = lx + nx * overlap;
            const resolvedLz = lz + nz * overlap;

            // Transform local normal to world space:
            // [worldNx, worldNz] = [nx*cos + nz*sin, -nx*sin + nz*cos]
            const worldNx = cos * nx + sin * nz;
            const worldNz = -sin * nx + cos * nz;

            // Tangential wall sliding: cancel velocity component directed into the obstacle
            const dot = curVx * worldNx + curVz * worldNz;
            if (dot < 0) {
              curVx -= dot * worldNx;
              curVz -= dot * worldNz;
            }

            // Transform resolved local position back to world space:
            // [nextX, nextZ] = obs.pos + [resolvedLx*cos + resolvedLz*sin, -resolvedLx*sin + resolvedLz*cos]
            nextX = obs.position[0] + (cos * resolvedLx + sin * resolvedLz);
            nextZ = obs.position[2] + (-sin * resolvedLx + cos * resolvedLz);
          }
        }

        if (!hadCollision) {
          break; // Fully converged outside all obstacles
        }
      }

      // Map boundary limits
      nextX = Math.max(this.currentBounds.minX + radius, Math.min(this.currentBounds.maxX - radius, nextX));
      nextZ = Math.max(this.currentBounds.minZ + radius, Math.min(this.currentBounds.maxZ - radius, nextZ));

      curX = nextX;
      curZ = nextZ;
    }

    return {
      x: curX,
      y: curY,
      z: curZ,
      vx: curVx,
      vz: curVz,
    };
  }

  /**
   * Dynamically switches obstacles and boundaries when changing battle areas.
   */
  public static setMap(
    obstacles: CollisionBox[],
    bounds: { minX: number; maxX: number; minZ: number; maxZ: number } = MAP_BOUNDS
  ) {
    this.obstacles = obstacles;
    this.currentBounds = { ...bounds };
  }

  /**
   * Third-person camera ray obstruction test against all obstacles.
   * Prevents camera from passing through walls, containers, or bunkers.
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

    let closestDist = naturalDist;

    const localRay = new THREE.Ray();
    const localOrigin = new THREE.Vector3();
    const localDir = new THREE.Vector3();
    const hitPoint = new THREE.Vector3();
    const box = new THREE.Box3();

    for (const obs of this.obstacles) {
      const halfX = obs.size[0] / 2;
      const halfY = obs.size[1] / 2;
      const halfZ = obs.size[2] / 2;

      box.min.set(-halfX, -halfY, -halfZ);
      box.max.set(halfX, halfY, halfZ);

      // Transform ray origin and direction to obstacle local space
      const cos = Math.cos(obs.rotationY);
      const sin = Math.sin(obs.rotationY);

      const ox = targetHead.x - obs.position[0];
      const oy = targetHead.y - obs.position[1];
      const oz = targetHead.z - obs.position[2];

      localOrigin.set(
        cos * ox - sin * oz,
        oy,
        sin * ox + cos * oz
      );

      localDir.set(
        cos * rayDir.x - sin * rayDir.z,
        rayDir.y,
        sin * rayDir.x + cos * rayDir.z
      );

      localRay.set(localOrigin, localDir);

      if (localRay.intersectBox(box, hitPoint)) {
        const d = localOrigin.distanceTo(hitPoint);
        if (d < closestDist) {
          closestDist = Math.max(0.4, d - clearance);
        }
      }
    }

    return closestDist;
  }

  /**
   * Raycast for bullet hit detection against registered obstacles.
   */
  public static castBulletRay(
    origin: THREE.Vector3,
    direction: THREE.Vector3,
    maxRange: number
  ): { hit: boolean; distance: number; hitPoint: THREE.Vector3 } {
    let closestDist = maxRange;
    const finalHitPoint = new THREE.Vector3().copy(origin).addScaledVector(direction, maxRange);

    const localRay = new THREE.Ray();
    const localOrigin = new THREE.Vector3();
    const localDir = new THREE.Vector3();
    const hitVec = new THREE.Vector3();
    const box = new THREE.Box3();

    for (const obs of this.obstacles) {
      const halfX = obs.size[0] / 2;
      const halfY = obs.size[1] / 2;
      const halfZ = obs.size[2] / 2;

      box.min.set(-halfX, -halfY, -halfZ);
      box.max.set(halfX, halfY, halfZ);

      const cos = Math.cos(obs.rotationY);
      const sin = Math.sin(obs.rotationY);

      const ox = origin.x - obs.position[0];
      const oy = origin.y - obs.position[1];
      const oz = origin.z - obs.position[2];

      localOrigin.set(cos * ox - sin * oz, oy, sin * ox + cos * oz);
      localDir.set(cos * direction.x - sin * direction.z, direction.y, sin * direction.x + cos * direction.z);

      localRay.set(localOrigin, localDir);

      if (localRay.intersectBox(box, hitVec)) {
        const d = localOrigin.distanceTo(hitVec);
        if (d < closestDist) {
          closestDist = d;
          // Transform local hit point back to world coordinates
          finalHitPoint.set(
            obs.position[0] + (cos * hitVec.x + sin * hitVec.z),
            obs.position[1] + hitVec.y,
            obs.position[2] + (-sin * hitVec.x + cos * hitVec.z)
          );
        }
      }
    }

    return {
      hit: closestDist < maxRange,
      distance: closestDist,
      hitPoint: finalHitPoint,
    };
  }
}
