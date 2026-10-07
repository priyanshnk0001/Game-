/**
 * Aquatic Wildlife - Turtle Swimming Simulation & Kinematics Engine
 *
 * Implements smooth underwater 3D steering, gradual turning without robotic snapping,
 * natural flipper stroke cadence modulation, riverbed foraging dives, and river corridor
 * containment. Architecture matches BirdFlight.ts and FishSwim.ts for clean separation.
 */

import * as THREE from 'three';
import { TurtleSpeciesConfig, TurtleSpeciesId } from './turtleConfig';
import { RiverSampledPoint, getRiverProfile } from '../river/RiverFlow';
import { RiverConfig } from '../river/riverConfig';

export interface TurtleIndividualState {
  id: string;
  speciesId: TurtleSpeciesId;
  config: TurtleSpeciesConfig;

  // 3D Transform & Kinematics
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  targetPosition: THREE.Vector3;

  // Euler Angles (radians) - Models face +Z forward
  currentHeading: number; // Yaw angle (radians)
  currentPitch: number;   // Pitch angle (diving / surfacing)
  currentRoll: number;    // Roll banking during turns
  yawVelocity: number;

  // Speed and Navigation
  speed: number;
  targetSpeed: number;
  splineProgress: number;
  direction: number; // 1: downstream, -1: upstream
  lateralOffsetRatio: number; // -1 to 1 across river corridor

  // Riverbed Foraging Behavior
  isForagingBottom: boolean;
  forageTimer: number;
  forageDuration: number;
  timeSinceLastForage: number;
  nextForageInterval: number;

  // Organic Wandering & Flipper Stroke Phases
  wanderTimer: number;
  wanderInterval: number;
  strokePhaseOffset: number; // Desynchronized paddling cycle

  // Three.js References
  group: THREE.Group;
  mixer?: THREE.AnimationMixer;
  action?: THREE.AnimationAction;
}

export function randomBetween(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

/**
 * Selects a natural 3D waypoint ahead along the river channel.
 * Guarantees that the turtle stays inside the water column (between riverbed substrate
 * and water surface) and within the natural river corridor banks.
 */
export function pickNextTurtleWaypoint(
  currentPos: THREE.Vector3,
  splineProgress: number,
  direction: number,
  spline: RiverSampledPoint[],
  riverConfig: RiverConfig,
  speciesConfig: TurtleSpeciesConfig,
  isForagingBottom: boolean,
  currentLateralOffset: number
): { target: THREE.Vector3; nextProgress: number; nextDirection: number; lateralOffset: number } {
  const splineLen = spline.length;
  if (splineLen === 0) {
    return {
      target: currentPos.clone().add(new THREE.Vector3(0, 0, 5)),
      nextProgress: splineProgress,
      nextDirection: direction,
      lateralOffset: currentLateralOffset,
    };
  }

  // Look ahead 8 to 15 meters along the river spline
  const stepRatio = randomBetween(0.04, 0.08);
  let nextProgress = splineProgress + direction * stepRatio;
  let nextDirection = direction;

  // Reverse direction near river endpoints so turtles gently turn around and explore
  if (nextProgress >= 0.92) {
    nextDirection = -1;
    nextProgress = 0.90;
  } else if (nextProgress <= 0.08) {
    nextDirection = 1;
    nextProgress = 0.10;
  }

  // Sample spline point with fractional interpolation
  const splineIdxFloat = Math.max(0, Math.min(0.999, nextProgress)) * (splineLen - 1);
  const idx0 = Math.floor(splineIdxFloat);
  const idx1 = Math.min(splineLen - 1, idx0 + 1);
  const frac = splineIdxFloat - idx0;

  const p0 = spline[idx0];
  const p1 = spline[idx1];

  const cx = p0.x + (p1.x - p0.x) * frac;
  const cz = p0.z + (p1.z - p0.z) * frac;
  const width = p0.width + (p1.width - p0.width) * frac;
  const normalX = p0.normalX + (p1.normalX - p0.normalX) * frac;
  const normalZ = p0.normalZ + (p1.normalZ - p0.normalZ) * frac;

  // Natural organic meandering offset across river width (stays within 65% of width to avoid banks)
  const lateralOffset = THREE.MathUtils.clamp(
    currentLateralOffset + randomBetween(-0.25, 0.25),
    -0.65,
    0.65
  );

  const halfWidth = width * 0.5;
  const lateralDist = lateralOffset * (halfWidth * 0.70);

  // Position on horizontal plane: centerline + normal * lateralDist
  const targetX = cx + normalX * lateralDist;
  const targetZ = cz + normalZ * lateralDist;

  // Vertical depth calculation
  const waterLevel = riverConfig.waterLevel;
  const riverProfile = getRiverProfile(targetX, targetZ, riverConfig, spline);
  const riverbedY = riverProfile.bedElevation;

  const safeBottomY = riverbedY + 0.28;
  const safeTopY = waterLevel - 0.30;

  let targetY: number;

  if (isForagingBottom) {
    // Bottom foraging: cruise smoothly 0.28m - 0.40m above the riverbed pebbles and gravel
    targetY = riverbedY + randomBetween(0.28, 0.40);
  } else {
    // Normal swimming: cruise within preferred species depth bracket
    const depthRatio = randomBetween(
      speciesConfig.depthRatioRange.min,
      speciesConfig.depthRatioRange.max
    );
    targetY = THREE.MathUtils.lerp(safeTopY, safeBottomY, depthRatio);
  }

  // Safety clamp: keep strictly between riverbed and water surface
  targetY = (safeBottomY >= safeTopY)
    ? (riverbedY + waterLevel) * 0.5
    : THREE.MathUtils.clamp(targetY, safeBottomY, safeTopY);

  return {
    target: new THREE.Vector3(targetX, targetY, targetZ),
    nextProgress,
    nextDirection,
    lateralOffset,
  };
}

/**
 * Initializes a turtle's kinematics, orientation, and navigation state.
 */
export function initializeTurtleState(
  id: string,
  speciesId: TurtleSpeciesId,
  config: TurtleSpeciesConfig,
  initialProgress: number,
  initialDirection: number,
  spline: RiverSampledPoint[],
  riverConfig: RiverConfig,
  group: THREE.Group
): TurtleIndividualState {
  const lateralOffset = randomBetween(-0.5, 0.5);
  const splineLen = spline.length;
  const splineIdx = Math.floor(initialProgress * (splineLen - 1));
  const sample = spline[Math.max(0, Math.min(splineLen - 1, splineIdx))];

  const halfWidth = (sample?.width ?? 12) * 0.5;
  const lateralDist = lateralOffset * (halfWidth * 0.70);
  const posX = (sample?.x ?? 0) + (sample?.normalX ?? 0) * lateralDist;
  const posZ = (sample?.z ?? 0) + (sample?.normalZ ?? 1) * lateralDist;

  const waterLevel = riverConfig.waterLevel;
  const profile = getRiverProfile(posX, posZ, riverConfig, spline);
  const depthRatio = randomBetween(config.depthRatioRange.min, config.depthRatioRange.max);
  const safeBottom = profile.bedElevation + 0.28;
  const safeTop = waterLevel - 0.30;
  const posY = (safeBottom >= safeTop)
    ? (profile.bedElevation + waterLevel) * 0.5
    : THREE.MathUtils.clamp(THREE.MathUtils.lerp(safeTop, safeBottom, depthRatio), safeBottom, safeTop);

  const position = new THREE.Vector3(posX, posY, posZ);

  // Initial heading aligned with river tangent
  const tanX = (sample?.tangentX ?? 0) * initialDirection;
  const tanZ = (sample?.tangentZ ?? 1) * initialDirection;
  const initialYaw = Math.atan2(tanX, tanZ);

  const initialSpeed = randomBetween(config.speed.min, config.speed.max);

  const { target } = pickNextTurtleWaypoint(
    position,
    initialProgress,
    initialDirection,
    spline,
    riverConfig,
    config,
    false,
    lateralOffset
  );

  return {
    id,
    speciesId,
    config,
    position,
    velocity: new THREE.Vector3(0, 0, 0),
    targetPosition: target,
    currentHeading: initialYaw,
    currentPitch: 0,
    currentRoll: 0,
    yawVelocity: 0,
    speed: initialSpeed,
    targetSpeed: initialSpeed,
    splineProgress: initialProgress,
    direction: initialDirection,
    lateralOffsetRatio: lateralOffset,
    isForagingBottom: false,
    forageTimer: 0,
    forageDuration: 0,
    timeSinceLastForage: randomBetween(4, 12),
    nextForageInterval: randomBetween(config.bottomForageInterval.min, config.bottomForageInterval.max),
    wanderTimer: 0,
    wanderInterval: randomBetween(3.5, 6.5),
    strokePhaseOffset: Math.random() * Math.PI * 2,
    group,
  };
}

/**
 * Updates an individual turtle's 3D motion, steering kinematics, foraging state,
 * and flipper animation mixer.
 */
export function updateTurtleState(
  state: TurtleIndividualState,
  delta: number,
  time: number,
  spline: RiverSampledPoint[],
  riverConfig: RiverConfig,
  isVisible: boolean = true
): void {
  const config = state.config;

  // 1. Manage Bottom Foraging State Machine
  state.timeSinceLastForage += delta;
  if (!state.isForagingBottom) {
    if (state.timeSinceLastForage >= state.nextForageInterval) {
      // Initiate a bottom forage dive
      state.isForagingBottom = true;
      state.forageTimer = 0;
      state.forageDuration = randomBetween(
        config.bottomForageDuration.min,
        config.bottomForageDuration.max
      );
      // Immediately pick a riverbed waypoint
      const { target, nextProgress, nextDirection, lateralOffset } = pickNextTurtleWaypoint(
        state.position,
        state.splineProgress,
        state.direction,
        spline,
        riverConfig,
        config,
        true,
        state.lateralOffsetRatio
      );
      state.targetPosition.copy(target);
      state.splineProgress = nextProgress;
      state.direction = nextDirection;
      state.lateralOffsetRatio = lateralOffset;
    }
  } else {
    state.forageTimer += delta;
    if (state.forageTimer >= state.forageDuration) {
      // End bottom foraging, return to mid-depths
      state.isForagingBottom = false;
      state.timeSinceLastForage = 0;
      state.nextForageInterval = randomBetween(
        config.bottomForageInterval.min,
        config.bottomForageInterval.max
      );
      const { target, nextProgress, nextDirection, lateralOffset } = pickNextTurtleWaypoint(
        state.position,
        state.splineProgress,
        state.direction,
        spline,
        riverConfig,
        config,
        false,
        state.lateralOffsetRatio
      );
      state.targetPosition.copy(target);
      state.splineProgress = nextProgress;
      state.direction = nextDirection;
      state.lateralOffsetRatio = lateralOffset;
    }
  }

  // 2. Periodic Speed and Waypoint Adjustments
  state.wanderTimer += delta;
  if (state.wanderTimer >= state.wanderInterval) {
    state.wanderTimer = 0;
    state.wanderInterval = randomBetween(4.0, 7.5);
    // Slight cruising speed modulation for organic variation
    state.targetSpeed = randomBetween(config.speed.min, config.speed.max);
  }

  // Smooth speed interpolation
  state.speed = THREE.MathUtils.lerp(state.speed, state.targetSpeed, delta * 1.5);

  // 3. Waypoint Proximity Check
  const distToTarget = state.position.distanceTo(state.targetPosition);
  if (distToTarget < 2.2) {
    const { target, nextProgress, nextDirection, lateralOffset } = pickNextTurtleWaypoint(
      state.position,
      state.splineProgress,
      state.direction,
      spline,
      riverConfig,
      config,
      state.isForagingBottom,
      state.lateralOffsetRatio
    );
    state.targetPosition.copy(target);
    state.splineProgress = nextProgress;
    state.direction = nextDirection;
    state.lateralOffsetRatio = lateralOffset;
  }

  // 4. Smooth 3D Steering Kinematics (No robotic snapping)
  const toTarget = new THREE.Vector3().subVectors(state.targetPosition, state.position);
  const horizDist = Math.hypot(toTarget.x, toTarget.z);

  // Target yaw angle (model faces +Z forward)
  const desiredYaw = Math.atan2(toTarget.x, toTarget.z);

  // Shortest angular difference (-PI to +PI)
  let yawDiff = desiredYaw - state.currentHeading;
  while (yawDiff > Math.PI) yawDiff -= Math.PI * 2;
  while (yawDiff < -Math.PI) yawDiff += Math.PI * 2;

  // Turn rate with natural acceleration and damping
  const targetYawVel = THREE.MathUtils.clamp(
    yawDiff * 1.8,
    -config.turnRate,
    config.turnRate
  );
  state.yawVelocity = THREE.MathUtils.lerp(state.yawVelocity, targetYawVel, delta * 3.5);
  state.currentHeading += state.yawVelocity * delta;

  // Natural pitch angle (positive tilts nose down into dives, negative tilts nose up)
  const desiredPitch = -Math.atan2(toTarget.y, Math.max(0.2, horizDist)) * config.pitchFactor;
  state.currentPitch = THREE.MathUtils.lerp(state.currentPitch, desiredPitch, delta * 2.2);

  // Roll banking into turns (negative yaw velocity banks outward/inward naturally)
  const targetRoll = -state.yawVelocity * config.bankFactor;
  state.currentRoll = THREE.MathUtils.lerp(state.currentRoll, targetRoll, delta * 2.8);

  // 5. Update Velocity and Position
  const forwardDir = new THREE.Vector3(0, 0, 1).applyEuler(
    new THREE.Euler(state.currentPitch, state.currentHeading, state.currentRoll, 'YXZ')
  );
  state.velocity.copy(forwardDir).multiplyScalar(state.speed);
  state.position.addScaledVector(state.velocity, delta);

  // River boundaries safeguard: strictly keep inside underwater volume between riverbed and water surface
  const profile = getRiverProfile(state.position.x, state.position.z, riverConfig, spline);
  const minDepthY = profile.bedElevation + 0.28;
  const maxDepthY = riverConfig.waterLevel - 0.30;
  state.position.y = (minDepthY >= maxDepthY)
    ? (profile.bedElevation + riverConfig.waterLevel) * 0.5
    : THREE.MathUtils.clamp(state.position.y, minDepthY, maxDepthY);

  // 6. Subtle Organic Swimming Undulation (Micro-pitch & roll bobbing)
  const strokeCadence = THREE.MathUtils.lerp(
    config.flipperRate.min,
    config.flipperRate.max,
    state.speed / config.speed.max
  );
  const bobPhase = (time + state.strokePhaseOffset) * strokeCadence * Math.PI * 2;
  const subtlePitchBob = Math.sin(bobPhase) * 0.035;
  const subtleRollBob = Math.cos(bobPhase) * 0.025;

  // 7. Apply Transforms to Scene Group
  state.group.position.copy(state.position);

  if (isVisible) {
    state.group.rotation.set(
      state.currentPitch + subtlePitchBob,
      state.currentHeading,
      state.currentRoll + subtleRollBob,
      'YXZ'
    );

    // 8. Update Animation Mixer (Flipper paddling rate matches swim speed)
    if (state.mixer) {
      const speedRatio = THREE.MathUtils.clamp(state.speed / config.speed.min, 0.6, 1.6);
      const timeScale = speedRatio * strokeCadence;
      state.mixer.update(delta * timeScale);
    }
  }
}
