/**
 * Freshwater Fish Swimming Kinematics & Schooling Simulation Engine
 *
 * Implements smooth underwater 3D steering, gradual turning without robotic snapping,
 * desynchronized swimming cadence, and river channel corridor containment.
 * Architecture matches BirdFlight.ts for clean separation of concerns.
 */

import * as THREE from 'three';
import { FishSpeciesConfig, FishSpeciesId } from './fishConfig';
import { RiverSampledPoint, getRiverProfile } from '../river/RiverFlow';
import { RiverConfig } from '../river/riverConfig';

export interface FishIndividualState {
  id: string;
  speciesId: FishSpeciesId;
  config: FishSpeciesConfig;
  isLeader: boolean;
  schoolId: string;

  // 3D Transform & Kinematics
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  targetPosition: THREE.Vector3;
  formationOffset: THREE.Vector3;

  // Euler Angles (radians) - Nose faces -Z in standard glTF convention
  currentHeading: number; // Yaw angle (radians)
  currentPitch: number;   // Pitch angle (diving / climbing)
  currentRoll: number;    // Banking roll during turns
  yawVelocity: number;

  // Speed and Propulsion
  speed: number;
  targetSpeed: number;
  splineProgress: number;
  direction: number; // 1: downstream, -1: upstream

  // Organic Wandering States
  wanderTimer: number;
  wanderInterval: number;
  phaseOffset: number; // Desynchronized tail wag and speed oscillations
}

export interface FishSchoolState {
  id: string;
  speciesId: FishSpeciesId;
  config: FishSpeciesConfig;
  leader: FishIndividualState;
  members: FishIndividualState[];

  // River Channel Waypoints
  currentWaypoint: THREE.Vector3;
  targetWaypoint: THREE.Vector3;
  direction: number;
  splineProgress: number;
}

function randomBetween(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

/**
 * Generates natural schooling formation offsets with loose, non-rigid spacing
 */
export function generateSchoolFormationOffsets(
  schoolSize: number,
  config: FishSpeciesConfig
): THREE.Vector3[] {
  const offsets: THREE.Vector3[] = [];
  const spread = config.formationSpread;

  // Leader is at center
  offsets.push(new THREE.Vector3(0, 0, 0));

  for (let i = 1; i < schoolSize; i++) {
    const angle = (i / (schoolSize - 1)) * Math.PI * 2 + randomBetween(-0.4, 0.4);
    const radius = randomBetween(spread.lateral * 0.4, spread.lateral * 1.1);

    const x = Math.cos(angle) * radius;
    const y = randomBetween(-spread.vertical * 0.5, spread.vertical * 0.5);
    const z = -Math.sin(angle) * (spread.longitudinal * 0.8) + randomBetween(-0.3, 0.3);

    offsets.push(new THREE.Vector3(x, y, z));
  }

  return offsets;
}

/**
 * Selects an organic 3D waypoint ahead in the river channel that stays safely
 * inside the water volume (between riverbed substrate and water surface)
 */
export function pickNextFishWaypoint(
  currentPos: THREE.Vector3,
  splineProgress: number,
  direction: number,
  spline: RiverSampledPoint[],
  riverConfig: RiverConfig,
  speciesConfig: FishSpeciesConfig
): THREE.Vector3 {
  const splineLen = spline.length;
  if (splineLen < 4) return currentPos.clone();

  // Project forward along spline by a natural distance (~4 - 8 meters)
  const stepDist = randomBetween(0.025, 0.055) * direction;
  let targetProgress = splineProgress + stepDist;

  // Ping-pong when reaching river ends
  if (targetProgress > 0.94) targetProgress = 0.94;
  if (targetProgress < 0.06) targetProgress = 0.06;

  const splineIdxFloat = Math.max(0, Math.min(0.999, targetProgress)) * (splineLen - 1);
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

  // Natural transverse wandering across 60% of river channel width
  const lateralRatio = randomBetween(-0.30, 0.30);
  const px = cx + normalX * (width * lateralRatio);
  const pz = cz + normalZ * (width * lateralRatio);

  // Depth calculation respecting species preference
  const profile = getRiverProfile(px, pz, riverConfig, spline);
  const bedY = profile.bedElevation;
  const surfaceY = riverConfig.waterLevel;

  const depthRatio = randomBetween(
    speciesConfig.depthRatioRange.min,
    speciesConfig.depthRatioRange.max
  );
  // Safe vertical margins so fish bodies never breach the water surface or clip into riverbed
  const safeMargin = 0.22;
  const minY = bedY + safeMargin;
  const maxY = surfaceY - safeMargin;
  const py = (minY >= maxY)
    ? (bedY + surfaceY) * 0.5
    : THREE.MathUtils.clamp(THREE.MathUtils.lerp(maxY, minY, depthRatio), minY, maxY);

  return new THREE.Vector3(px, py, pz);
}

/**
 * Updates an individual fish's smooth steering physics, gradual turning,
 * depth adjustment, and roll banking without instantaneous snapping.
 */
export function updateFishSteering(
  fish: FishIndividualState,
  targetPos: THREE.Vector3,
  delta: number,
  spline: RiverSampledPoint[],
  riverConfig: RiverConfig
): void {
  // 1. Calculate desired heading vector towards target
  const toTarget = new THREE.Vector3().subVectors(targetPos, fish.position);

  // Desired yaw: in standard glTF, fish head points along -Z
  // So heading angle is atan2(-dx, -dz)
  let desiredHeading = Math.atan2(-toTarget.x, -toTarget.z);

  // 2. Smooth gradual turning towards desired heading
  let angleDiff = desiredHeading - fish.currentHeading;
  // Wrap to [-PI, PI]
  while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
  while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;

  // Clamp turn rate (smooth, realistic turning)
  const maxTurn = fish.config.turnRate * delta;
  const turnStep = THREE.MathUtils.clamp(angleDiff, -maxTurn, maxTurn);

  fish.currentHeading += turnStep;
  fish.yawVelocity = turnStep / Math.max(0.001, delta);

  // 3. Smooth forward speed with organic micro-oscillations
  fish.wanderTimer += delta;
  if (fish.wanderTimer > fish.wanderInterval) {
    fish.wanderTimer = 0;
    fish.wanderInterval = randomBetween(2.5, 5.0);
    fish.targetSpeed = randomBetween(fish.config.speed.min, fish.config.speed.max);
  }

  // Desynchronized subtle speed pulse (fish propel with tail strokes)
  const speedPulse = 1.0 + Math.sin(fish.wanderTimer * 4.0 + fish.phaseOffset) * 0.12;
  fish.speed = THREE.MathUtils.lerp(fish.speed, fish.targetSpeed * speedPulse, delta * 1.5);

  // 4. Update velocity along current heading
  const forwardX = -Math.sin(fish.currentHeading);
  const forwardZ = -Math.cos(fish.currentHeading);

  fish.velocity.x = forwardX * fish.speed;
  fish.velocity.z = forwardZ * fish.speed;

  // Vertical velocity towards target Y (smooth gliding ascent/descent)
  const verticalDiff = targetPos.y - fish.position.y;
  const vertSpeed = THREE.MathUtils.clamp(verticalDiff * 0.8, -0.25, 0.25);
  fish.velocity.y = vertSpeed;

  // Integrate position
  fish.position.x += fish.velocity.x * delta;
  fish.position.z += fish.velocity.z * delta;
  fish.position.y += fish.velocity.y * delta;

  // 5. Hard boundary containment: strictly stay within water column with safe margins
  const profile = getRiverProfile(fish.position.x, fish.position.z, riverConfig, spline);
  const bedY = profile.bedElevation;
  const surfaceY = riverConfig.waterLevel;
  const safeBottom = bedY + 0.20;
  const safeTop = surfaceY - 0.20;
  fish.position.y = (safeBottom >= safeTop)
    ? (bedY + surfaceY) * 0.5
    : THREE.MathUtils.clamp(fish.position.y, safeBottom, safeTop);

  // 6. Natural Pitch and Roll Banking
  const targetPitch = THREE.MathUtils.clamp(
    Math.atan2(vertSpeed, Math.max(0.1, fish.speed)) * fish.config.bodyPitchFactor * 3.5,
    -0.35,
    0.35
  );
  fish.currentPitch = THREE.MathUtils.lerp(fish.currentPitch, targetPitch, delta * 3.0);

  const targetRoll = THREE.MathUtils.clamp(
    -fish.yawVelocity * fish.config.bankFactor * 0.25,
    -0.45,
    0.45
  );
  fish.currentRoll = THREE.MathUtils.lerp(fish.currentRoll, targetRoll, delta * 4.0);
}

/**
 * Updates a full school's movement: Leader navigates river waypoints,
 * followers maintain dynamic school cohesion with individual swimming jitter.
 */
export function updateFishSchool(
  school: FishSchoolState,
  delta: number,
  spline: RiverSampledPoint[],
  riverConfig: RiverConfig
): void {
  const leader = school.leader;

  // 1. Advance leader spline progress
  const stepProgress = (leader.speed / 60.0) * school.direction * delta;
  school.splineProgress += stepProgress;

  if (school.splineProgress > 0.94) {
    school.splineProgress = 0.94;
    school.direction = -1;
    school.targetWaypoint = pickNextFishWaypoint(
      leader.position,
      school.splineProgress,
      school.direction,
      spline,
      riverConfig,
      school.config
    );
  } else if (school.splineProgress < 0.06) {
    school.splineProgress = 0.06;
    school.direction = 1;
    school.targetWaypoint = pickNextFishWaypoint(
      leader.position,
      school.splineProgress,
      school.direction,
      spline,
      riverConfig,
      school.config
    );
  }

  // 2. Check if leader reached target waypoint
  const distToTarget = leader.position.distanceTo(school.targetWaypoint);
  if (distToTarget < 1.8) {
    school.currentWaypoint.copy(school.targetWaypoint);
    school.targetWaypoint = pickNextFishWaypoint(
      leader.position,
      school.splineProgress,
      school.direction,
      spline,
      riverConfig,
      school.config
    );
  }

  // Update leader steering towards target waypoint
  updateFishSteering(leader, school.targetWaypoint, delta, spline, riverConfig);

  // 3. Update school followers
  // Rotate formation offsets by leader's current heading
  const leaderHeading = leader.currentHeading;
  const cosH = Math.cos(leaderHeading);
  const sinH = Math.sin(leaderHeading);

  school.members.forEach((member) => {
    if (member.isLeader) return;

    // Local formation offset rotated into world space
    const ox = member.formationOffset.x;
    const oz = member.formationOffset.z;
    const oy = member.formationOffset.y;

    // In glTF coords where forward is -Z:
    const worldOffsetX = ox * cosH - oz * sinH;
    const worldOffsetZ = ox * sinH + oz * cosH;

    // Add organic individual micro-wander so followers do not look locked
    const microJitterX = Math.sin(member.wanderTimer * 1.5 + member.phaseOffset) * 0.25;
    const microJitterZ = Math.cos(member.wanderTimer * 1.5 + member.phaseOffset) * 0.25;

    const fProfile = getRiverProfile(
      leader.position.x + worldOffsetX + microJitterX,
      leader.position.z + worldOffsetZ + microJitterZ,
      riverConfig,
      spline
    );
    const fSafeBottom = fProfile.bedElevation + 0.20;
    const fSafeTop = riverConfig.waterLevel - 0.20;
    const clampedY = (fSafeBottom >= fSafeTop)
      ? (fProfile.bedElevation + riverConfig.waterLevel) * 0.5
      : THREE.MathUtils.clamp(leader.position.y + oy, fSafeBottom, fSafeTop);

    const followerTarget = new THREE.Vector3(
      leader.position.x + worldOffsetX + microJitterX,
      clampedY,
      leader.position.z + worldOffsetZ + microJitterZ
    );

    updateFishSteering(member, followerTarget, delta, spline, riverConfig);
  });
}
