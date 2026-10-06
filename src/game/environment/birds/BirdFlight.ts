/**
 * Bird Flight Kinematics & Flocking Simulation Engine
 *
 * Implements smooth procedural avian flight paths, realistic banking during turns,
 * desynchronized flapping/gliding state machines, and natural flock formation physics.
 */

import * as THREE from 'three';
import { BirdSpeciesConfig, BirdSpeciesId } from './birdConfig';

export interface BirdIndividualState {
  id: string;
  speciesId: BirdSpeciesId;
  config: BirdSpeciesConfig;
  isLeader: boolean;
  flockId: string;

  // Transform & Kinematics
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  targetPosition: THREE.Vector3;
  formationOffset: THREE.Vector3; // Local offset relative to leader [x: right, y: up, z: back]

  // Flight Euler Angles (radians)
  yaw: number;
  pitch: number;
  roll: number;
  yawVelocity: number;

  // Individual flap vs. glide state machine
  isFlapping: boolean;
  stateTimer: number;
  targetFlapSpeed: number;
  currentFlapSpeed: number;
  flapPhaseOffset: number;

  // Three.js Scene References
  group: THREE.Group;
  mixer: THREE.AnimationMixer;
  action: THREE.AnimationAction;
}

export interface FlockState {
  id: string;
  speciesId: BirdSpeciesId;
  config: BirdSpeciesConfig;
  leader: BirdIndividualState;
  members: BirdIndividualState[];

  // Aerial Navigation Waypoints
  currentWaypoint: THREE.Vector3;
  targetWaypoint: THREE.Vector3;
  waypointProgress: number;
  turnDirection: number; // -1 (left bias) or +1 (right bias)
}

function randomBetween(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

/**
 * Generates natural V-formation or staggered echelon offsets for flock members
 */
export function generateFormationOffsets(
  flockSize: number,
  config: BirdSpeciesConfig
): THREE.Vector3[] {
  const offsets: THREE.Vector3[] = [];
  const spread = config.formationSpread;

  // Leader is at the apex
  offsets.push(new THREE.Vector3(0, 0, 0));

  for (let i = 1; i < flockSize; i++) {
    const side = i % 2 === 1 ? -1 : 1; // Alternate left and right wings
    const tier = Math.ceil(i / 2);

    // Staggered V-formation with subtle organic jitter
    const x = side * tier * spread.lateral + randomBetween(-0.6, 0.6);
    const y = randomBetween(-spread.vertical * 0.4, spread.vertical * 0.4) + (tier % 2 === 0 ? 0.3 : -0.2);
    const z = -tier * spread.longitudinal + randomBetween(-0.8, 0.8);

    offsets.push(new THREE.Vector3(x, y, z));
  }

  return offsets;
}

/**
 * Selects an organic aerial waypoint across the sky that prevents boundary collisions
 * and creates graceful sweeping curves rather than sharp turns.
 */
export function pickNextWaypoint(
  currentPos: THREE.Vector3,
  currentVelocity: THREE.Vector3,
  bounds: { minX: number; maxX: number; minZ: number; maxZ: number },
  config: BirdSpeciesConfig
): THREE.Vector3 {
  const margin = 55.0;
  const isNearBoundary =
    currentPos.x < bounds.minX + margin ||
    currentPos.x > bounds.maxX - margin ||
    currentPos.z < bounds.minZ + margin ||
    currentPos.z > bounds.maxZ - margin;

  let targetX: number;
  let targetZ: number;

  if (isNearBoundary) {
    // Steer back towards inner airspace with a gentle inward arc
    const centerX = (bounds.minX + bounds.maxX) * 0.5 + randomBetween(-60, 60);
    const centerZ = (bounds.minZ + bounds.maxZ) * 0.5 + randomBetween(-60, 60);
    const dirToCenter = new THREE.Vector2(centerX - currentPos.x, centerZ - currentPos.z).normalize();
    const distance = randomBetween(120, 200);

    targetX = currentPos.x + dirToCenter.x * distance;
    targetZ = currentPos.z + dirToCenter.y * distance;
  } else {
    // Continue flying forward with a gentle sweeping curve (-40° to +40°)
    const currentHeading = Math.atan2(currentVelocity.x, currentVelocity.z);
    const turnAngle = randomBetween(-0.7, 0.7);
    const newHeading = currentHeading + turnAngle;
    const distance = randomBetween(110, 190);

    targetX = currentPos.x + Math.sin(newHeading) * distance;
    targetZ = currentPos.z + Math.cos(newHeading) * distance;
  }

  // Clamp safely within bounds
  targetX = THREE.MathUtils.clamp(targetX, bounds.minX + 30, bounds.maxX - 30);
  targetZ = THREE.MathUtils.clamp(targetZ, bounds.minZ + 30, bounds.maxZ - 30);

  // Natural altitude undulation within preferred species altitude
  const targetY = randomBetween(config.altitude.min, config.altitude.max);

  return new THREE.Vector3(targetX, targetY, targetZ);
}

/**
 * Updates a single flock's flight physics, formation geometry, banking, and animation.
 */
export function updateFlock(
  flock: FlockState,
  delta: number,
  bounds: { minX: number; maxX: number; minZ: number; maxZ: number },
  cameraPosition: THREE.Vector3,
  maxVisibleDistance: number,
  lodDistance: number
): void {
  const { config, leader } = flock;

  // 1. LEADER NAVIGATION & WAYPOINT TRACKING
  const toWaypoint = flock.targetWaypoint.clone().sub(leader.position);
  const distToWaypoint = toWaypoint.length();

  // Pick a new waypoint if close or time exceeded
  if (distToWaypoint < 35.0) {
    flock.currentWaypoint.copy(flock.targetWaypoint);
    flock.targetWaypoint.copy(
      pickNextWaypoint(leader.position, leader.velocity, bounds, config)
    );
  }

  // Desired leader flight vector
  const desiredDir = toWaypoint.normalize();
  const targetSpeed = randomBetween(config.speed.min, config.speed.max);
  const desiredVelocity = desiredDir.clone().multiplyScalar(targetSpeed);

  // Smoothly steer leader velocity (smooth turning rate)
  const steerRate = config.turnRate * delta;
  leader.velocity.lerp(desiredVelocity, Math.min(1.0, steerRate * 1.8));

  // Advance leader position
  leader.position.addScaledVector(leader.velocity, delta);

  // 2. COMPUTE LEADER ORIENTATION FRAME FOR FORMATION
  const horizontalSpeed = Math.hypot(leader.velocity.x, leader.velocity.z);
  const forwardDir = horizontalSpeed > 0.1
    ? new THREE.Vector3(leader.velocity.x, 0, leader.velocity.z).normalize()
    : new THREE.Vector3(0, 0, 1);
  const rightDir = new THREE.Vector3(-forwardDir.z, 0, forwardDir.x);
  const upDir = new THREE.Vector3(0, 1, 0);

  // 3. UPDATE ALL FLOCK MEMBERS (LEADER + FOLLOWERS)
  flock.members.forEach((bird, idx) => {
    if (!bird.isLeader) {
      // Calculate follower's target position in formation
      const offset = bird.formationOffset;
      const formationTarget = leader.position
        .clone()
        .addScaledVector(rightDir, offset.x)
        .addScaledVector(upDir, offset.y)
        .addScaledVector(forwardDir, offset.z);

      // Add gentle personal breathing/flutter to formation position
      const time = leader.position.x * 0.05 + idx * 1.5;
      formationTarget.x += Math.sin(time * 0.9) * 0.45;
      formationTarget.y += Math.cos(time * 1.1) * 0.35;
      formationTarget.z += Math.sin(time * 0.7) * 0.45;

      bird.targetPosition.copy(formationTarget);

      // Follower steering towards formation target
      const toFormation = bird.targetPosition.clone().sub(bird.position);
      const dist = toFormation.length();

      // Dynamic catch-up / lag speed modulation
      const catchupMult = THREE.MathUtils.clamp(1.0 + (dist - 2.0) * 0.18, 0.75, 1.45);
      const followerDesiredVel = toFormation
        .normalize()
        .multiplyScalar(targetSpeed * catchupMult);

      // Follower separation repulsion: avoid colliding with other flock members
      const separationForce = new THREE.Vector3();
      for (const other of flock.members) {
        if (other === bird) continue;
        const d = bird.position.distanceTo(other.position);
        if (d < 3.2 && d > 0.01) {
          const repel = bird.position.clone().sub(other.position).normalize();
          separationForce.addScaledVector(repel, (3.2 - d) * 2.5);
        }
      }
      followerDesiredVel.add(separationForce);

      // Smooth follower acceleration
      bird.velocity.lerp(followerDesiredVel, Math.min(1.0, delta * 3.2));
      bird.position.addScaledVector(bird.velocity, delta);
    }

    // 4. ORIENTATION & NATURAL BANKING PHYSICS
    const hSpeed = Math.hypot(bird.velocity.x, bird.velocity.z);
    if (hSpeed > 0.2) {
      // Target Yaw (heading along flight velocity)
      const targetYaw = Math.atan2(bird.velocity.x, bird.velocity.z);
      const yawDiff = THREE.MathUtils.euclideanModulo(targetYaw - bird.yaw + Math.PI, Math.PI * 2) - Math.PI;

      // Track turning angular rate for banking
      bird.yawVelocity = THREE.MathUtils.lerp(bird.yawVelocity, yawDiff / Math.max(delta, 0.01), delta * 5.0);
      bird.yaw += yawDiff * Math.min(1.0, delta * 4.8);

      // Realistic Bank/Roll proportional to yaw turning rate
      // Roll dips the inside wing towards the turn direction
      const targetRoll = -THREE.MathUtils.clamp(
        bird.yawVelocity * config.bankFactor * 0.35,
        -config.maxBank,
        config.maxBank
      );
      bird.roll = THREE.MathUtils.lerp(bird.roll, targetRoll, delta * 4.5);

      // Pitch: tilt beak up when gaining altitude, tilt down when descending
      const targetPitch = -Math.atan2(bird.velocity.y, hSpeed);
      bird.pitch = THREE.MathUtils.lerp(bird.pitch, targetPitch, delta * 3.8);
    }

    // 5. FLAPPING VS. GLIDING STATE MACHINE
    bird.stateTimer -= delta;
    if (bird.stateTimer <= 0) {
      if (bird.isFlapping) {
        // Transition from flapping to gliding
        bird.isFlapping = false;
        bird.stateTimer = randomBetween(config.glideDuration.min, config.glideDuration.max);
        // During gliding, slow wing-stroke right down into steady outstretched soar
        bird.targetFlapSpeed = 0.05;
      } else {
        // Transition from gliding back to rhythmic flapping
        bird.isFlapping = true;
        bird.stateTimer = randomBetween(config.flapDuration.min, config.flapDuration.max);
        bird.targetFlapSpeed = randomBetween(config.flapSpeed.min, config.flapSpeed.max);
      }
    }

    // Smooth transition of wing flap rate
    bird.currentFlapSpeed = THREE.MathUtils.lerp(
      bird.currentFlapSpeed,
      bird.targetFlapSpeed,
      delta * 4.0
    );
    bird.action.timeScale = bird.currentFlapSpeed;

    // Subtle natural body heave/bob during active wing strokes
    const bobOffset = bird.isFlapping
      ? Math.sin(bird.mixer.time * bird.currentFlapSpeed * 4.2 + bird.flapPhaseOffset) * config.bodyBob
      : 0;

    // 6. APPLY 3D POSITION AND ROTATION TO THREE.JS GROUP
    bird.group.position.set(
      bird.position.x,
      bird.position.y + bobOffset,
      bird.position.z
    );

    // Apply pitch, yaw, and banking roll in YXZ intrinsic order
    bird.group.rotation.set(bird.pitch, bird.yaw, bird.roll, 'YXZ');

    // 7. DISTANCE-BASED LOD & ANIMATION CULLING
    const distToCam = cameraPosition.distanceTo(bird.position);
    if (distToCam > maxVisibleDistance) {
      bird.group.visible = false;
    } else {
      bird.group.visible = true;
      // Animate wing morph targets
      if (distToCam <= lodDistance) {
        bird.mixer.update(delta);
      } else {
        // Distant LOD: update at half rate for high performance
        bird.mixer.update(delta * 0.7);
      }
    }
  });
}
