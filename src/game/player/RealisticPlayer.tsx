import React, { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF, Html } from '@react-three/drei';
import * as THREE from 'three';
import { clone as cloneSkeleton } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { PlayerState } from '../../types/game';
import { WEAPON_SPAWNS } from '../../config/constants';
import { RealisticWeapon } from '../weapons/RealisticWeapon';
import { PhysicsBridge } from '../physics/PhysicsBridge';

interface RealisticPlayerProps {
  player: PlayerState;
  isLocal: boolean;
}

// Pre-allocated scratch vectors and quaternions for 60fps zero-garbage-collection calculations
const _v0 = new THREE.Vector3();
const _v1 = new THREE.Vector3();
const _v2 = new THREE.Vector3();
const _contactPos = new THREE.Vector3();
const _q0 = new THREE.Quaternion();
const _q1 = new THREE.Quaternion();
const _q2 = new THREE.Quaternion();
const _qDelta = new THREE.Quaternion();

const X_AXIS = new THREE.Vector3(1, 0, 0);
const Y_AXIS = new THREE.Vector3(0, 1, 0);
const Z_AXIS = new THREE.Vector3(0, 0, 1);

// Anatomically calibrated crouch vertical drop lookup table:
// In stationary crouch, hips lower 0.5786m so the kneeling knee and planted foot rest naturally on the terrain throughout the transition without feet lifting or penetrating.
const CROUCH_REST_DROP_LUT = [0, 0, 0.0132, 0.0438, 0.0896, 0.1494, 0.2218, 0.3050, 0.3970, 0.4953, 0.5786];
const getCrouchRestDrop = (t: number) => {
  const clampedT = Math.min(1.0, Math.max(0.0, t));
  const idx = Math.min(9, Math.floor(clampedT * 10));
  const frac = (clampedT * 10) - idx;
  return CROUCH_REST_DROP_LUT[idx] + (CROUCH_REST_DROP_LUT[idx + 1] - CROUCH_REST_DROP_LUT[idx]) * frac;
};

export type StanceWaypoint = 'standing' | 'crouch_moving' | 'crouch_resting' | 'prone';

const WAYPOINT_COORDS: Record<StanceWaypoint, { crouchT: number; crouchStyle: number; proneT: number }> = {
  standing: { crouchT: 0.0, crouchStyle: 1.0, proneT: 0.0 },
  crouch_moving: { crouchT: 1.0, crouchStyle: 1.0, proneT: 0.0 },
  crouch_resting: { crouchT: 1.0, crouchStyle: 0.0, proneT: 0.0 },
  prone: { crouchT: 1.0, crouchStyle: 0.0, proneT: 1.0 },
};

const STANCE_ORDER: StanceWaypoint[] = ['standing', 'crouch_moving', 'crouch_resting', 'prone'];

function getWaypointSequence(from: StanceWaypoint, to: StanceWaypoint): StanceWaypoint[] {
  if (from === to) return [to];

  const fromIdx = STANCE_ORDER.indexOf(from);
  const toIdx = STANCE_ORDER.indexOf(to);

  const seq: StanceWaypoint[] = [];
  if (fromIdx < toIdx) {
    for (let i = fromIdx + 1; i <= toIdx; i++) {
      seq.push(STANCE_ORDER[i]);
    }
  } else {
    for (let i = fromIdx - 1; i >= toIdx; i--) {
      seq.push(STANCE_ORDER[i]);
    }
  }
  return seq;
}

// Perlin C2 quintic smootherstep for zero-jerk acceleration and velocity continuity at blend boundaries
const smootherstep = (x: number, min: number, max: number) => {
  if (x <= min) return 0;
  if (x >= max) return 1;
  const t = (x - min) / (max - min);
  return t * t * t * (t * (t * 6 - 15) + 10);
};

// Seamless overlapping blend window evaluator for multi-stage stance transitions
function evaluateStanceTransition(
  fromCoords: { crouchT: number; crouchStyle: number; proneT: number },
  stages: StanceWaypoint[],
  progress: number
): { crouchT: number; crouchStyle: number; proneT: number } {
  const p = Math.min(1.0, Math.max(0.0, progress));
  const n = stages.length;

  if (n <= 1) {
    const target = WAYPOINT_COORDS[stages[0] || 'standing'];
    const t = smootherstep(p, 0.0, 1.0);
    return {
      crouchT: THREE.MathUtils.lerp(fromCoords.crouchT, target.crouchT, t),
      crouchStyle: THREE.MathUtils.lerp(fromCoords.crouchStyle, target.crouchStyle, t),
      proneT: THREE.MathUtils.lerp(fromCoords.proneT, target.proneT, t),
    };
  }

  if (n === 2) {
    const p1 = WAYPOINT_COORDS[stages[0]];
    const p2 = WAYPOINT_COORDS[stages[1]];

    // Refined overlapping blend windows with continuous C2 velocity curve:
    // Stage 1 active p: 0.00 -> 0.65
    // Stage 2 active p: 0.35 -> 1.00 (wide 30% overlap window)
    const t1 = smootherstep(p, 0.0, 0.65);
    const t2 = smootherstep(p, 0.35, 1.00);

    const c1 = THREE.MathUtils.lerp(fromCoords.crouchT, p1.crouchT, t1);
    const s1 = THREE.MathUtils.lerp(fromCoords.crouchStyle, p1.crouchStyle, t1);
    const pr1 = THREE.MathUtils.lerp(fromCoords.proneT, p1.proneT, t1);

    return {
      crouchT: THREE.MathUtils.lerp(c1, p2.crouchT, t2),
      crouchStyle: THREE.MathUtils.lerp(s1, p2.crouchStyle, t2),
      proneT: THREE.MathUtils.lerp(pr1, p2.proneT, t2),
    };
  }

  // n === 3: Three-stage sequence (Standing <-> Prone)
  const p1 = WAYPOINT_COORDS[stages[0]];
  const p2 = WAYPOINT_COORDS[stages[1]];
  const p3 = WAYPOINT_COORDS[stages[2]];

  // Refined overlapping blend windows with continuous C2 velocity curve:
  // Stage 1 active p: 0.00 -> 0.48
  // Stage 2 active p: 0.22 -> 0.78 (wide 26% overlap with Stage 1)
  // Stage 3 active p: 0.52 -> 1.00 (wide 26% overlap with Stage 2)
  const t1 = smootherstep(p, 0.0, 0.48);
  const t2 = smootherstep(p, 0.22, 0.78);
  const t3 = smootherstep(p, 0.52, 1.00);

  const c1 = THREE.MathUtils.lerp(fromCoords.crouchT, p1.crouchT, t1);
  const s1 = THREE.MathUtils.lerp(fromCoords.crouchStyle, p1.crouchStyle, t1);
  const pr1 = THREE.MathUtils.lerp(fromCoords.proneT, p1.proneT, t1);

  const c2 = THREE.MathUtils.lerp(c1, p2.crouchT, t2);
  const s2 = THREE.MathUtils.lerp(s1, p2.crouchStyle, t2);
  const pr2 = THREE.MathUtils.lerp(pr1, p2.proneT, t2);

  return {
    crouchT: THREE.MathUtils.lerp(c2, p3.crouchT, t3),
    crouchStyle: THREE.MathUtils.lerp(s2, p3.crouchStyle, t3),
    proneT: THREE.MathUtils.lerp(pr2, p3.proneT, t3),
  };
}

export const RealisticPlayer: React.FC<RealisticPlayerProps> = ({ player, isLocal }) => {
  const rootGroupRef = useRef<THREE.Group>(null);
  const characterGroupRef = useRef<THREE.Group>(null);
  const weaponSocket1Ref = useRef<THREE.Group>(null);
  const weaponSocket2Ref = useRef<THREE.Group>(null);

  // Load realistic human male character GLB
  const { scene } = useGLTF('/models/player/human_male.glb');

  // Clone skeleton for independent bones and animation per player instance
  const cloned = useMemo(() => {
    const clone = cloneSkeleton(scene) as THREE.Group;

    // Enable shadows and configure high-fidelity PBR skin & material shaders
    clone.traverse((child) => {
      if ((child as THREE.SkinnedMesh).isSkinnedMesh) {
        child.castShadow = true;
        child.receiveShadow = true;

        const mesh = child as THREE.SkinnedMesh;
        if (Array.isArray(mesh.material)) {
          mesh.material = mesh.material.map((m) => m.clone());
        } else if (mesh.material) {
          mesh.material = mesh.material.clone();
        }

        const mats = (Array.isArray(mesh.material) ? mesh.material : [mesh.material]) as THREE.MeshStandardMaterial[];
        mats.forEach((mat) => {
          if (!mat) return;
          const matName = (mat.name || '').toLowerCase();
          // High-grade PBR skin calibration: natural surface roughness and realistic ambient light response
          if (matName.includes('face') || matName.includes('body') || matName.includes('legs') || matName.includes('hand')) {
            mat.roughness = 0.68;
            mat.metalness = 0.0;
            mat.envMapIntensity = 0.85;
          } else if (matName.includes('eye')) {
            mat.roughness = 0.12;
            mat.metalness = 0.0;
            mat.envMapIntensity = 1.2;
          } else if (matName.includes('teeth')) {
            mat.roughness = 0.35;
            mat.metalness = 0.0;
          }
        });
      }
    });

    return clone;
  }, [scene]);

  // Clean Human Skeleton Bone References
  const bonesRef = useRef<{
    hips?: THREE.Bone;
    spine?: THREE.Bone;
    spine1?: THREE.Bone;
    spine2?: THREE.Bone;
    neck?: THREE.Bone;
    head?: THREE.Bone;
    leftShoulder?: THREE.Bone;
    leftArm?: THREE.Bone;
    leftForeArm?: THREE.Bone;
    leftHand?: THREE.Bone;
    rightShoulder?: THREE.Bone;
    rightArm?: THREE.Bone;
    rightForeArm?: THREE.Bone;
    rightHand?: THREE.Bone;
    leftUpLeg?: THREE.Bone;
    leftLeg?: THREE.Bone;
    leftFoot?: THREE.Bone;
    leftToeBase?: THREE.Bone;
    leftToeEnd?: THREE.Bone;
    rightUpLeg?: THREE.Bone;
    rightLeg?: THREE.Bone;
    rightFoot?: THREE.Bone;
    rightToeBase?: THREE.Bone;
    rightToeEnd?: THREE.Bone;
    fingerBones?: {
      bone: THREE.Bone;
      name: string;
      finger: 'Thumb' | 'Index' | 'Middle' | 'Ring' | 'Pinky';
      joint: number;
      isThumb: boolean;
    }[];
  }>({});

  // Pristine Anatomical Rest Pose Registry (stores uncorrupted initial local rotations of every human bone)
  const restQuatsRef = useRef<Map<string, THREE.Quaternion>>(new Map());

  // Holstered Weapon Back Mounts (attached to Spine2 on upper back in 1:1 metric units)
  const backMount1 = useMemo(() => {
    const obj = new THREE.Object3D();
    obj.position.set(0.0, -0.03, -0.175);
    obj.rotation.set(1.475, -0.583, -1.584);
    return obj;
  }, []);

  const backMount2 = useMemo(() => {
    const obj = new THREE.Object3D();
    obj.position.set(0.0, -0.03, -0.200);
    obj.rotation.set(1.475, 0.583, 1.584);
    return obj;
  }, []);

  // Continuous animation state tracking
  const prevPosRef = useRef<THREE.Vector3>(new THREE.Vector3(...player.position));
  const gaitPhaseRef = useRef<number>(0);
  const breathTimeRef = useRef<number>(Math.random() * 10);
  const locoBlendRef = useRef<number>(0);
  const sprintBlendRef = useRef<number>(0);

  // Discrete and continuous stance state sequencer tracking
  const initialStance: StanceWaypoint = player.isProne
    ? 'prone'
    : player.isCrouching
      ? 'crouch_resting'
      : 'standing';

  const currentStanceRef = useRef<StanceWaypoint>(initialStance);
  const desiredGoalRef = useRef<StanceWaypoint>(initialStance);
  const lastNonProneStanceRef = useRef<StanceWaypoint>(
    player.isCrouching ? 'crouch_resting' : 'standing'
  );

  // Single unified transition timeline controller
  const transitionRef = useRef<{
    isActive: boolean;
    time: number;
    duration: number;
    fromCoords: { crouchT: number; crouchStyle: number; proneT: number };
    stages: StanceWaypoint[];
  }>({
    isActive: false,
    time: 0,
    duration: 0.23,
    fromCoords: { ...WAYPOINT_COORDS[initialStance] },
    stages: [initialStance],
  });

  const crouchProgressRef = useRef<number>(WAYPOINT_COORDS[initialStance].crouchT);
  const crouchStyleRef = useRef<number>(WAYPOINT_COORDS[initialStance].crouchStyle);
  const proneProgressRef = useRef<number>(WAYPOINT_COORDS[initialStance].proneT);

  const weaponTransition1Ref = useRef<number>(player.activeSlot === 1 && player.weaponState === 'ready' ? 1.0 : 0.0);
  const weaponTransition2Ref = useRef<number>(player.activeSlot === 2 && player.weaponState === 'ready' ? 1.0 : 0.0);
  const aimProgressRef = useRef<number>(player.isAiming ? 1.0 : 0.0);
  const recoilKickRef = useRef<number>(0);

  // Discover and cache skeleton bones & register pristine rest quaternions
  useEffect(() => {
    const bones: typeof bonesRef.current = {};
    const fingerBones: {
      bone: THREE.Bone;
      name: string;
      finger: 'Thumb' | 'Index' | 'Middle' | 'Ring' | 'Pinky';
      joint: number;
      isThumb: boolean;
    }[] = [];
    const restQuats = new Map<string, THREE.Quaternion>();

    cloned.traverse((node) => {
      if ((node as THREE.Bone).isBone) {
        const bone = node as THREE.Bone;
        restQuats.set(bone.name, bone.quaternion.clone());

        const cleanName = bone.name.replace('mixamorig:', '').replace('mixamorig', '');
        const fingerMatch = cleanName.match(/^(LeftHand|RightHand)(Thumb|Index|Middle|Ring|Pinky)([1-4])$/);
        if (fingerMatch) {
          fingerBones.push({
            bone,
            name: cleanName,
            finger: fingerMatch[2] as 'Thumb' | 'Index' | 'Middle' | 'Ring' | 'Pinky',
            joint: parseInt(fingerMatch[3], 10),
            isThumb: fingerMatch[2] === 'Thumb',
          });
        }

        switch (cleanName) {
          case 'Hips': bones.hips = bone; break;
          case 'Spine': bones.spine = bone; break;
          case 'Spine1': bones.spine1 = bone; break;
          case 'Spine2':
            bones.spine2 = bone;
            bone.add(backMount1);
            bone.add(backMount2);
            break;
          case 'Neck': bones.neck = bone; break;
          case 'Head': bones.head = bone; break;
          case 'LeftShoulder': bones.leftShoulder = bone; break;
          case 'LeftArm': bones.leftArm = bone; break;
          case 'LeftForeArm': bones.leftForeArm = bone; break;
          case 'LeftHand': bones.leftHand = bone; break;
          case 'RightShoulder': bones.rightShoulder = bone; break;
          case 'RightArm': bones.rightArm = bone; break;
          case 'RightForeArm': bones.rightForeArm = bone; break;
          case 'RightHand': bones.rightHand = bone; break;
          case 'LeftUpLeg': bones.leftUpLeg = bone; break;
          case 'LeftLeg': bones.leftLeg = bone; break;
          case 'LeftFoot': bones.leftFoot = bone; break;
          case 'LeftToeBase': bones.leftToeBase = bone; break;
          case 'LeftToe_End': bones.leftToeEnd = bone; break;
          case 'RightUpLeg': bones.rightUpLeg = bone; break;
          case 'RightLeg': bones.rightLeg = bone; break;
          case 'RightFoot': bones.rightFoot = bone; break;
          case 'RightToeBase': bones.rightToeBase = bone; break;
          case 'RightToe_End': bones.rightToeEnd = bone; break;
        }
      }
    });

    bones.fingerBones = fingerBones;
    bonesRef.current = bones;
    restQuatsRef.current = restQuats;

    return () => {
      backMount1.removeFromParent();
      backMount2.removeFromParent();
    };
  }, [cloned, backMount1, backMount2]);

  // Main 60fps Human Animation & Kinematics Frame Loop
  useFrame((_, delta) => {
    const b = bonesRef.current;
    const rest = restQuatsRef.current;
    if (!b.hips || rest.size === 0) return;

    // Clamp frame delta to prevent physics explosion / delta spikes (max 50ms, min 1ms)
    const dt = Math.min(Math.max(delta, 0.001), 0.05);

    // 1. Authoritative World Position and Rotation from Gameplay Controller
    if (rootGroupRef.current) {
      rootGroupRef.current.position.set(...player.position);
      rootGroupRef.current.rotation.y = player.rotationY;
    }

    // Measure horizontal ground velocity and speed (ignoring vertical movement)
    const dx = player.position[0] - prevPosRef.current.x;
    const dz = player.position[2] - prevPosRef.current.z;
    const horizontalDistMoved = Math.hypot(dx, dz);
    prevPosRef.current.set(...player.position);
    const speed = horizontalDistMoved / dt;
    const isMoving = speed > 0.12 && !player.isDead;
    const isSprinting = player.isSprinting && isMoving && speed > 2.5;

    // Locomotion and Sprint smooth blend weights (prevents any pose snapping)
    locoBlendRef.current = THREE.MathUtils.lerp(locoBlendRef.current, isMoving ? 1.0 : 0.0, Math.min(1, dt * 10));
    sprintBlendRef.current = THREE.MathUtils.lerp(sprintBlendRef.current, isSprinting ? 1.0 : 0.0, Math.min(1, dt * 8));
    const locoW = locoBlendRef.current;
    const sprintW = sprintBlendRef.current;

    // Advance breath and gait timers
    breathTimeRef.current += dt;

    // Calibrated Human Stride Cadence:
    // Stride length ~1.65m (walk) expanding to ~2.15m (sprint).
    // Stride frequency directly matches travel distance to completely eliminate foot sliding/skating.
    const currentStrideLen = THREE.MathUtils.lerp(5.15, 2.15, sprintW);
    const gaitFreq = isMoving ? (speed / currentStrideLen) * Math.PI * 2 : 0;
    gaitPhaseRef.current = (gaitPhaseRef.current + dt * gaitFreq) % (Math.PI * 2);
    const gp = gaitPhaseRef.current;

    // Pelvis Dynamics:
    // Vertical bob: 2 cycles per stride, dips during double support, highest at mid-stance
    const pelvisBob = -Math.cos(gp * 2) * 0.022 * locoW;
    // Lateral weight transfer over supporting stance leg
    const pelvisSwayX = Math.sin(gp) * 0.016 * locoW;
    // Pelvic list / roll
    const pelvisRollZ = Math.sin(gp) * 0.025 * locoW;

    // Stance transition smoothing: multi-stage sequence between standing, moving crouch, resting crouch, and prone
    let desiredGoal: StanceWaypoint;
    if (player.isProne && !player.isDead) {
      desiredGoal = 'prone';
    } else if (player.isCrouching && !player.isDead) {
      // If currently in prone (or transitioning out of prone):
      if (currentStanceRef.current === 'prone' || proneProgressRef.current > 0.05) {
        if (isMoving) {
          desiredGoal = 'crouch_moving';
        } else if (lastNonProneStanceRef.current === 'crouch_resting') {
          // Direct return to resting crouch (Sequence 3: Prone -> Resting Crouch)
          desiredGoal = 'crouch_resting';
        } else {
          // Return to moving crouch posture (Sequence 2: Prone -> Resting Crouch -> Moving Crouch)
          desiredGoal = 'crouch_moving';
        }
      } else {
        // Regular crouch mode: moving crouch if walking, resting crouch if stationary
        desiredGoal = isMoving ? 'crouch_moving' : 'crouch_resting';
      }
    } else {
      // Standing (Sequence 1 returning: Prone -> Resting Crouch -> Moving Crouch -> Standing)
      desiredGoal = 'standing';
    }

    // When desired goal changes, record origin stance and launch continuous transition timeline
    if (desiredGoal !== desiredGoalRef.current) {
      if (desiredGoal === 'prone' && currentStanceRef.current !== 'prone') {
        lastNonProneStanceRef.current = currentStanceRef.current;
      }
      desiredGoalRef.current = desiredGoal;

      const stages = getWaypointSequence(currentStanceRef.current, desiredGoal);
      const numStages = stages.length;
      // Fluid continuous timing without sequential pauses (18% faster): 3 stages (0.59s), 2 stages (0.41s), 1 stage (0.23s)
      const duration = numStages === 3 ? 0.59 : numStages === 2 ? 0.41 : 0.23;

      transitionRef.current = {
        isActive: true,
        time: 0,
        duration,
        fromCoords: {
          crouchT: crouchProgressRef.current,
          crouchStyle: crouchStyleRef.current,
          proneT: proneProgressRef.current,
        },
        stages,
      };
    }

    const tr = transitionRef.current;
    if (tr.isActive) {
      tr.time += dt;
      const progress = Math.min(1.0, tr.time / tr.duration);

      // Evaluate smoothly overlapping coordinates along the full sequence
      const coords = evaluateStanceTransition(tr.fromCoords, tr.stages, progress);
      crouchProgressRef.current = coords.crouchT;
      crouchStyleRef.current = coords.crouchStyle;
      proneProgressRef.current = coords.proneT;

      // Update currentStanceRef as progress passes milestone thresholds so interruptions reverse seamlessly
      const n = tr.stages.length;
      if (n === 3) {
        if (progress >= 0.65) currentStanceRef.current = tr.stages[2];
        else if (progress >= 0.35) currentStanceRef.current = tr.stages[1];
      } else if (n === 2) {
        if (progress >= 0.50) currentStanceRef.current = tr.stages[1];
      }

      if (progress >= 1.0) {
        tr.isActive = false;
        currentStanceRef.current = tr.stages[tr.stages.length - 1];
        const finalCoords = WAYPOINT_COORDS[currentStanceRef.current];
        crouchProgressRef.current = finalCoords.crouchT;
        crouchStyleRef.current = finalCoords.crouchStyle;
        proneProgressRef.current = finalCoords.proneT;
      }
    }

    const crouchT = crouchProgressRef.current;
    const crouchStyle = crouchStyleRef.current;
    const proneT = proneProgressRef.current;

    // Weight for base crouch posture (0 = resting crouch, 1 = moving crouch)
    const crouchPoseWeight = crouchT * crouchStyle;
    // Crouch walking strides only animate if moving input is active
    const crouchWalkWeight = crouchPoseWeight * locoW;

    // Weapon state transition smoothing
    const isSlot1Ready = player.activeSlot === 1 && player.weaponState === 'ready' && !player.isDead && !player.isVaulting && !player.isMantling;
    const isSlot2Ready = player.activeSlot === 2 && player.weaponState === 'ready' && !player.isDead && !player.isVaulting && !player.isMantling;
    weaponTransition1Ref.current = THREE.MathUtils.lerp(weaponTransition1Ref.current, isSlot1Ready ? 1.0 : 0.0, Math.min(1, dt * 10));
    weaponTransition2Ref.current = THREE.MathUtils.lerp(weaponTransition2Ref.current, isSlot2Ready ? 1.0 : 0.0, Math.min(1, dt * 10));
    const t1 = weaponTransition1Ref.current;
    const t2 = weaponTransition2Ref.current;
    const tWeapon = Math.max(t1, t2);

    const targetAim = player.isAiming && player.weaponState === 'ready' && !player.isDead ? 1.0 : 0.0;
    aimProgressRef.current = THREE.MathUtils.lerp(aimProgressRef.current, targetAim, Math.min(1, dt * 12));
    const aimT = aimProgressRef.current;

    // Weapon recoil kick impulse decay
    if (player.isFiring && !player.isDead) {
      recoilKickRef.current = Math.min(1.0, recoilKickRef.current + 0.35);
    } else {
      recoilKickRef.current = THREE.MathUtils.lerp(recoilKickRef.current, 0.0, Math.min(1, dt * 14));
    }
    const kick = recoilKickRef.current;

    // Water states
    const isInWater = player.waterState === 'swimming' || player.waterState === 'surface' || player.waterState === 'underwater';
    const isDiving = player.waterState === 'underwater';

    // 2. Character Root Group Placement & Overall Stance Pitch (Native Forward Axis)
    if (characterGroupRef.current) {
      if (player.isDead) {
        // Natural death pose: smoothly tilt onto back/side
        characterGroupRef.current.rotation.x = THREE.MathUtils.lerp(characterGroupRef.current.rotation.x, -Math.PI / 2, Math.min(1, dt * 8));
        characterGroupRef.current.rotation.y = 0;
        characterGroupRef.current.position.set(0, 0.15, 0);
      } else if (isDiving) {
        // Underwater diving streamlined posture
        characterGroupRef.current.rotation.x = THREE.MathUtils.lerp(characterGroupRef.current.rotation.x, 1.25, Math.min(1, dt * 6));
        characterGroupRef.current.rotation.y = 0;
        characterGroupRef.current.position.set(0, 0, 0);
      } else if (isInWater) {
        // Surface swimming forward pitch
        characterGroupRef.current.rotation.x = THREE.MathUtils.lerp(characterGroupRef.current.rotation.x, 1.35, Math.min(1, dt * 6));
        characterGroupRef.current.rotation.y = 0;
        characterGroupRef.current.position.set(0, -0.20, 0);
      } else if (player.isMantling || player.isVaulting) {
        // Vault / mantle forward push
        const mp = player.mantleProgress ?? player.vaultProgress ?? 0.5;
        const mantlePitch = mp < 0.3 ? 0.20 : mp < 0.7 ? 0.45 : 0.10;
        characterGroupRef.current.rotation.x = THREE.MathUtils.lerp(characterGroupRef.current.rotation.x, mantlePitch, Math.min(1, dt * 10));
        characterGroupRef.current.rotation.y = 0;
        characterGroupRef.current.position.set(0, 0, 0);
      } else {
        // Seamless continuous blend: Standing -> Crouch -> Prone
        const targetRotX = (Math.PI / 2) * proneT;
        characterGroupRef.current.rotation.x = THREE.MathUtils.lerp(characterGroupRef.current.rotation.x, targetRotX, Math.min(1, dt * 22));
        characterGroupRef.current.rotation.y = 0;

        // Vertical and depth offsets:
        // Anatomically calibrated crouch vertical drop (ensures feet remain planted on ground as knees bend)
        // In stationary crouch, hips lower 0.5786m so the kneeling knee and planted foot rest naturally on the terrain.
        // In crouch-walking, hips lower 0.31m so the bent-knee gait maintains grounded foot clearance.
        const crouchRestDrop = getCrouchRestDrop(crouchT);
        const crouchWalkDrop = 0.31 * crouchT;
        const crouchVerticalDrop = THREE.MathUtils.lerp(crouchRestDrop, crouchWalkDrop, crouchPoseWeight);

        const crawlBob = proneT > 0.05 && isMoving ? Math.abs(Math.sin(gp * 2)) * 0.015 * proneT : 0;
        const targetPosY = (0.10 * proneT) + crawlBob - (crouchVerticalDrop * (1.0 - proneT)) + pelvisBob * (1.0 - proneT);
        const targetPosZ = (-0.08 * crouchT * (1.0 - proneT)) + (-0.70 * proneT);
        const targetPosX = (proneT > 0.05 && isMoving ? Math.sin(gp) * 0.03 * proneT : 0) + pelvisSwayX * (1.0 - proneT);

        characterGroupRef.current.position.set(targetPosX, targetPosY, targetPosZ);
      }
    }

    // Helper: Reset a bone to its pristine rest quaternion
    const resetBone = (bone?: THREE.Bone) => {
      if (bone && rest.has(bone.name)) {
        bone.quaternion.copy(rest.get(bone.name)!);
      }
    };

    // Reset all core bones to pristine rest baseline before applying this frame's clean human pose
    resetBone(b.hips);
    resetBone(b.spine);
    resetBone(b.spine1);
    resetBone(b.spine2);
    resetBone(b.neck);
    resetBone(b.head);
    resetBone(b.leftShoulder);
    resetBone(b.leftArm);
    resetBone(b.leftForeArm);
    resetBone(b.leftHand);
    resetBone(b.rightShoulder);
    resetBone(b.rightArm);
    resetBone(b.rightForeArm);
    resetBone(b.rightHand);
    resetBone(b.leftUpLeg);
    resetBone(b.leftLeg);
    resetBone(b.leftFoot);
    resetBone(b.leftToeBase);
    resetBone(b.rightUpLeg);
    resetBone(b.rightLeg);
    resetBone(b.rightFoot);
    resetBone(b.rightToeBase);
    if (b.fingerBones) {
      for (let i = 0; i < b.fingerBones.length; i++) {
        resetBone(b.fingerBones[i].bone);
      }
    }

    // Dynamic ground placement: calculates actual lowest body/foot contact point and vertically places
    // the character so that it rests naturally on the existing ground in sitting/crouch, standing, etc.
    const enforceGroundContact = () => {
      if (!characterGroupRef.current) return;
      characterGroupRef.current.updateMatrixWorld(true);

      const contactPoints = (!player.isDead && isMoving)
        ? [
          { bone: b.leftFoot, radius: 0.080 },
          { bone: b.rightFoot, radius: 0.080 },
          { bone: b.leftToeBase, radius: 0.040 },
          { bone: b.rightToeBase, radius: 0.040 },
        ]
        : [
          { bone: b.leftFoot, radius: 0.080 },
          { bone: b.rightFoot, radius: 0.080 },
          { bone: b.leftToeBase, radius: 0.040 },
          { bone: b.rightToeBase, radius: 0.040 },
          { bone: b.leftToeEnd, radius: 0.025 },
          { bone: b.rightToeEnd, radius: 0.025 },
          { bone: b.leftLeg, radius: 0.080 },
          { bone: b.rightLeg, radius: 0.080 },
          { bone: b.leftUpLeg, radius: 0.090 },
          { bone: b.rightUpLeg, radius: 0.090 },
          { bone: b.hips, radius: 0.110 },
          { bone: b.spine, radius: 0.110 },
          { bone: b.leftForeArm, radius: 0.055 },
          { bone: b.rightForeArm, radius: 0.055 },
          { bone: b.leftHand, radius: 0.045 },
          { bone: b.rightHand, radius: 0.045 },
        ];

      const GROUND_MARGIN = 0.002; // 2mm solid contact margin
      let minDelta = Infinity;

      // 1. Direct bone contact points
      for (let i = 0; i < contactPoints.length; i++) {
        const cp = contactPoints[i];
        if (!cp.bone) continue;

        cp.bone.getWorldPosition(_contactPos);
        const lowestY = _contactPos.y - cp.radius;
        const groundY = PhysicsBridge.getGroundHeight(_contactPos.x, _contactPos.z, _contactPos.y);
        const deltaToTarget = lowestY - (groundY + GROUND_MARGIN);

        if (deltaToTarget < minDelta) {
          minDelta = deltaToTarget;
        }
      }

      // 2. Calf / shin midpoints (for sitting/kneeling postures where the lower leg rests against ground)
      if (b.leftLeg && b.leftFoot) {
        b.leftLeg.getWorldPosition(_contactPos);
        b.leftFoot.getWorldPosition(_v1);
        _contactPos.add(_v1).multiplyScalar(0.5);
        const lowestY = _contactPos.y - 0.070;
        const groundY = PhysicsBridge.getGroundHeight(_contactPos.x, _contactPos.z, _contactPos.y);
        const deltaToTarget = lowestY - (groundY + GROUND_MARGIN);
        if (deltaToTarget < minDelta) {
          minDelta = deltaToTarget;
        }
      }
      if (b.rightLeg && b.rightFoot) {
        b.rightLeg.getWorldPosition(_contactPos);
        b.rightFoot.getWorldPosition(_v1);
        _contactPos.add(_v1).multiplyScalar(0.5);
        const lowestY = _contactPos.y - 0.070;
        const groundY = PhysicsBridge.getGroundHeight(_contactPos.x, _contactPos.z, _contactPos.y);
        const deltaToTarget = lowestY - (groundY + GROUND_MARGIN);
        if (deltaToTarget < minDelta) {
          minDelta = deltaToTarget;
        }
      }

      // 3. Palm centers (midpoint between wrist and middle knuckle)
      if (b.leftHand && b.fingerBones) {
        const leftMiddle = b.fingerBones.find(f => f.name === 'LeftHandMiddle1')?.bone;
        if (leftMiddle) {
          b.leftHand.getWorldPosition(_contactPos);
          leftMiddle.getWorldPosition(_v1);
          _contactPos.add(_v1).multiplyScalar(0.5);
          const lowestY = _contactPos.y - 0.035;
          const groundY = PhysicsBridge.getGroundHeight(_contactPos.x, _contactPos.z, _contactPos.y);
          const deltaToTarget = lowestY - (groundY + GROUND_MARGIN);
          if (deltaToTarget < minDelta) minDelta = deltaToTarget;
        }
      }
      if (b.rightHand && b.fingerBones) {
        const rightMiddle = b.fingerBones.find(f => f.name === 'RightHandMiddle1')?.bone;
        if (rightMiddle) {
          b.rightHand.getWorldPosition(_contactPos);
          rightMiddle.getWorldPosition(_v1);
          _contactPos.add(_v1).multiplyScalar(0.5);
          const lowestY = _contactPos.y - 0.035;
          const groundY = PhysicsBridge.getGroundHeight(_contactPos.x, _contactPos.z, _contactPos.y);
          const deltaToTarget = lowestY - (groundY + GROUND_MARGIN);
          if (deltaToTarget < minDelta) minDelta = deltaToTarget;
        }
      }

      // 4. Fingers and knuckles (ensures hands and fingertips never penetrate terrain in prone)
      if (b.fingerBones) {
        for (let i = 0; i < b.fingerBones.length; i++) {
          const fb = b.fingerBones[i];
          if (!fb.bone) continue;
          fb.bone.getWorldPosition(_contactPos);
          const lowestY = _contactPos.y - 0.018;
          const groundY = PhysicsBridge.getGroundHeight(_contactPos.x, _contactPos.z, _contactPos.y);
          const deltaToTarget = lowestY - (groundY + GROUND_MARGIN);
          if (deltaToTarget < minDelta) {
            minDelta = deltaToTarget;
          }
        }
      }

      // 5. Chest and upper torso (prevents chest/abdomen ground penetration in prone)
      if (b.spine1) {
        b.spine1.getWorldPosition(_contactPos);
        const lowestY = _contactPos.y - 0.120;
        const groundY = PhysicsBridge.getGroundHeight(_contactPos.x, _contactPos.z, _contactPos.y);
        const deltaToTarget = lowestY - (groundY + GROUND_MARGIN);
        if (deltaToTarget < minDelta) minDelta = deltaToTarget;
      }
      if (b.spine2) {
        b.spine2.getWorldPosition(_contactPos);
        const lowestY = _contactPos.y - 0.120;
        const groundY = PhysicsBridge.getGroundHeight(_contactPos.x, _contactPos.z, _contactPos.y);
        const deltaToTarget = lowestY - (groundY + GROUND_MARGIN);
        if (deltaToTarget < minDelta) minDelta = deltaToTarget;
      }

      // 6. Elbows and upper arms
      if (b.leftArm) {
        b.leftArm.getWorldPosition(_contactPos);
        const lowestY = _contactPos.y - 0.065;
        const groundY = PhysicsBridge.getGroundHeight(_contactPos.x, _contactPos.z, _contactPos.y);
        const deltaToTarget = lowestY - (groundY + GROUND_MARGIN);
        if (deltaToTarget < minDelta) minDelta = deltaToTarget;
      }
      if (b.rightArm) {
        b.rightArm.getWorldPosition(_contactPos);
        const lowestY = _contactPos.y - 0.065;
        const groundY = PhysicsBridge.getGroundHeight(_contactPos.x, _contactPos.z, _contactPos.y);
        const deltaToTarget = lowestY - (groundY + GROUND_MARGIN);
        if (deltaToTarget < minDelta) minDelta = deltaToTarget;
      }

      // 7. Head / chin
      if (b.head) {
        b.head.getWorldPosition(_contactPos);
        const lowestY = _contactPos.y - 0.095;
        const groundY = PhysicsBridge.getGroundHeight(_contactPos.x, _contactPos.z, _contactPos.y);
        const deltaToTarget = lowestY - (groundY + GROUND_MARGIN);
        if (deltaToTarget < minDelta) minDelta = deltaToTarget;
      }

      if (!isFinite(minDelta)) return;

      const clampedDelta = Math.max(-0.40, Math.min(0.40, minDelta));

      if (player.isDead) {
        // Vertically place the complete character mesh container so the lowest contact point rests naturally on the ground
        characterGroupRef.current.position.y -= clampedDelta;
        characterGroupRef.current.updateMatrixWorld(true);
      } else if (clampedDelta < 0) {
        // Prevent clipping into terrain surfaces (only elevate if penetrating)
        characterGroupRef.current.position.y -= clampedDelta;
        characterGroupRef.current.updateMatrixWorld(true);
      }
    };

    if (player.isDead) {
      enforceGroundContact();
      return;
    }

    // Subtle natural pelvic list/roll during gait weight transfer
    if (b.hips && proneT < 0.999 && !isInWater) {
      _q0.setFromAxisAngle(Z_AXIS, pelvisRollZ * (1.0 - proneT));
      b.hips.quaternion.multiply(_q0);
    }

    // 3. Human Spine & Breathing Dynamics
    const breathCycle = Math.sin(breathTimeRef.current * 1.8);
    if (b.spine1) {
      // Subtle natural chest rise and fall during breathing (0.012 rad) + thoracic forward lean in crouch
      _q0.setFromAxisAngle(X_AXIS, breathCycle * 0.012 * (1.0 - proneT) + 0.18 * crouchT * (1.0 - proneT));
      // Counter-rotation of upper torso opposite to pelvis/stride for natural balance
      _q1.setFromAxisAngle(Y_AXIS, -Math.sin(gp) * 0.035 * locoW * (1.0 - proneT));
      _qDelta.multiplyQuaternions(_q0, _q1);
      b.spine1.quaternion.multiply(_qDelta);
    }

    const proneLegFade = 1.0 - proneT;

    // 4. Anatomical Human Locomotion Kinematics (Hips -> Thigh -> Knee -> Ankle -> Foot)
    if (!isInWater && !player.isVaulting && !player.isMantling && proneLegFade > 0.001) {
      // Stride amplitude scales smoothly from walking (~0.42 rad) to sprinting (~0.72 rad)
      const thighAmp = THREE.MathUtils.lerp(0.12, 0.52, sprintW) * locoW;

      // Bilateral phase offset by PI radians (180 deg)
      const lPhase = gp;
      const rPhase = (gp + Math.PI) % (Math.PI * 2);

      const lSwing = Math.sin(lPhase);
      const rSwing = Math.sin(rPhase);
      const lCos = Math.cos(lPhase);
      const rCos = Math.cos(rPhase);

      // Thigh flexion on local X axis (+X swings thigh forward, -X swings thigh back)
      const lThighAngle = lSwing * thighAmp;
      const rThighAngle = rSwing * thighAmp;

      // Subtle forward foot/step placement during swing and landing phase:
      // FOOT LIFTS -> KNEE BENDS -> FOOT SWINGS FORWARD -> REACHES SLIGHTLY AHEAD -> PLANTS ON GROUND -> BODY PASSES OVER
      const stepPlacementAmp = THREE.MathUtils.lerp(0.20, 0.18, sprintW) * locoW;
      const lStepPlacement = Math.max(0, Math.sin(lPhase - 0.5)) * stepPlacementAmp;
      const rStepPlacement = Math.max(0, Math.sin(rPhase - 0.5)) * stepPlacementAmp;

      // Anatomical Knee Flexion:
      // During swing phase (cos > 0), knee flexes deeply to lift foot and clear the ground:
      // ~1.05 rad (60 deg) for walk, up to 1.35 rad (77 deg) for sprint.
      // In stance phase (cos <= 0), knee maintains compliant extension (-0.08 rad).
      const kneeFlexBase = THREE.MathUtils.lerp(1.25, 1.90, sprintW);
      const lKneeFlex = -0.08 - (lCos > 0 ? Math.pow(lCos, 1.4) * kneeFlexBase : 0) * locoW;
      const rKneeFlex = -0.08 - (rCos > 0 ? Math.pow(rCos, 1.4) * kneeFlexBase : 0) * locoW;

      // Ankle Articulation (dorsiflexion on heel strike, plantarflexion on push-off):
      const lAnkle = (-lSwing * -0.58 + (lCos > 0.2 ? 0.16 : -0.12 * Math.max(0, -lCos))) * locoW;
      const rAnkle = (-rSwing * -0.58 + (rCos > 0.2 ? 0.16 : -0.12 * Math.max(0, -rCos))) * locoW;

      // 1. Original default resting crouch pose (preserved exactly from existing code)
      const leftCrouchRestThigh = 1.86 * crouchT;
      const leftCrouchRestKnee = -2.48 * crouchT;
      const leftCrouchRestAnkle = 0.58 * crouchT;

      const rightCrouchRestThigh = 0.86 * crouchT;
      const rightCrouchRestKnee = -2.58 * crouchT;
      const rightCrouchRestAnkle = -0.48 * crouchT;

      const crouchRestSpine = 0.35 * crouchT;

      // 2. Crouch-walking base pose (active when moving while crouched)
      const leftCrouchWalkThigh = 1.36 * crouchT;
      const leftCrouchWalkKnee = -1.78 * crouchT;
      const leftCrouchWalkAnkle = 0.58 * crouchT;

      const rightCrouchWalkThigh = 0.86 * crouchT;
      const rightCrouchWalkKnee = -1.88 * crouchT;
      const rightCrouchWalkAnkle = 0.68 * crouchT;

      const crouchWalkSpineBase = 0.55 * crouchT;

      // Interpolate base crouch pose: default stationary crouch at crouchPoseWeight = 0, crouch-walking pose at crouchPoseWeight = 1
      const leftCrouchThigh = THREE.MathUtils.lerp(leftCrouchRestThigh, leftCrouchWalkThigh, crouchPoseWeight) * proneLegFade;
      const leftCrouchKnee = THREE.MathUtils.lerp(leftCrouchRestKnee, leftCrouchWalkKnee, crouchPoseWeight) * proneLegFade;
      const leftCrouchAnkle = THREE.MathUtils.lerp(leftCrouchRestAnkle, leftCrouchWalkAnkle, crouchPoseWeight) * proneLegFade;

      const rightCrouchThigh = THREE.MathUtils.lerp(rightCrouchRestThigh, rightCrouchWalkThigh, crouchPoseWeight) * proneLegFade;
      const rightCrouchKnee = THREE.MathUtils.lerp(rightCrouchRestKnee, rightCrouchWalkKnee, crouchPoseWeight) * proneLegFade;
      const rightCrouchAnkle = THREE.MathUtils.lerp(rightCrouchRestAnkle, rightCrouchWalkAnkle, crouchPoseWeight) * proneLegFade;

      const crouchSpine = THREE.MathUtils.lerp(crouchRestSpine, crouchWalkSpineBase, crouchPoseWeight) * proneLegFade;

      // PUBG/BGMI tactical crouch-walking gait offsets (applied smoothly on top of resting crouch pose)

      // 1. Alternating Thigh Kinematics:
      // Smoothly level resting asymmetry during locomotion so both legs have symmetric, balanced strides
      const crouchAsymThigh = 0.25 * crouchWalkWeight * proneLegFade;
      const crouchThighAmp = 0.35 * crouchWalkWeight * proneLegFade;
      const lCrouchStepPlacement = Math.max(0, Math.sin(lPhase - 0.45)) * 0.10 * crouchWalkWeight * proneLegFade;
      const rCrouchStepPlacement = Math.max(0, Math.sin(rPhase - 0.45)) * 0.10 * crouchWalkWeight * proneLegFade;
      const lThighCrouchOffset = -crouchAsymThigh + lSwing * crouchThighAmp + lCrouchStepPlacement;
      const rThighCrouchOffset = crouchAsymThigh + rSwing * crouchThighAmp + rCrouchStepPlacement;

      // 2. Natural Knee Kinematics:
      // Smoothly level resting asymmetry during locomotion
      const crouchAsymKnee = 0.05 * crouchWalkWeight * proneLegFade;
      // Swing lift: knee flexes deeper when foot swings forward to clear ground cleanly
      const lCrouchKneeSwing = -Math.pow(Math.max(0, lCos), 1.3) * 0.36 * crouchWalkWeight * proneLegFade;
      const rCrouchKneeSwing = -Math.pow(Math.max(0, rCos), 1.3) * 0.36 * crouchWalkWeight * proneLegFade;
      // Foot plant / touchdown reach extension
      const lCrouchKneePlant = Math.max(0, lSwing) * 0.16 * crouchWalkWeight * proneLegFade;
      const rCrouchKneePlant = Math.max(0, rSwing) * 0.16 * crouchWalkWeight * proneLegFade;
      // Trailing leg push-off extension
      const lCrouchKneePush = Math.max(0, -lSwing) * 0.20 * crouchWalkWeight * proneLegFade;
      const rCrouchKneePush = Math.max(0, -rSwing) * 0.20 * crouchWalkWeight * proneLegFade;
      const lKneeCrouchOffset = -crouchAsymKnee + lCrouchKneeSwing + lCrouchKneePlant + lCrouchKneePush;
      const rKneeCrouchOffset = crouchAsymKnee + rCrouchKneeSwing + rCrouchKneePlant + rCrouchKneePush;

      // 3. Realistic Ankle Articulation:
      // Smoothly level resting asymmetry during locomotion
      const crouchAsymAnkle = 0.05 * crouchWalkWeight * proneLegFade;
      // Swing dip relaxation
      const lCrouchAnkleSwing = -Math.max(0, lCos) * 0.18 * crouchWalkWeight * proneLegFade;
      const rCrouchAnkleSwing = -Math.max(0, rCos) * 0.18 * crouchWalkWeight * proneLegFade;
      // Heel strike / foot plant dorsiflexion
      const lCrouchAnkleStrike = Math.max(0, lSwing) * 0.14 * crouchWalkWeight * proneLegFade;
      const rCrouchAnkleStrike = Math.max(0, rSwing) * 0.14 * crouchWalkWeight * proneLegFade;
      // Push-off toe roll
      const lCrouchAnklePush = -Math.max(0, -lSwing) * 0.16 * crouchWalkWeight * proneLegFade;
      const rCrouchAnklePush = -Math.max(0, -rSwing) * 0.16 * crouchWalkWeight * proneLegFade;
      const lAnkleCrouchOffset = crouchAsymAnkle + lCrouchAnkleSwing + lCrouchAnkleStrike + lCrouchAnklePush;
      const rAnkleCrouchOffset = -crouchAsymAnkle + rCrouchAnkleSwing + rCrouchAnkleStrike + rCrouchAnklePush;

      // 4. Subtle Torso Stabilization:
      const crouchWalkSpine = Math.sin(gp * 2) * 0.018 * crouchWalkWeight * proneLegFade;

      // Leg Kinematics: blend standing walking out as crouchT increases, and apply crouch walking offsets on top of the resting crouch pose
      const standLegWeight = (1.0 - crouchT) * proneLegFade;

      if (b.leftUpLeg) {
        _q0.setFromAxisAngle(X_AXIS, (lThighAngle + lStepPlacement) * standLegWeight + leftCrouchThigh + lThighCrouchOffset);
        b.leftUpLeg.quaternion.multiply(_q0);
      }
      if (b.rightUpLeg) {
        _q0.setFromAxisAngle(X_AXIS, (rThighAngle + rStepPlacement) * standLegWeight + rightCrouchThigh + rThighCrouchOffset);
        b.rightUpLeg.quaternion.multiply(_q0);
      }

      if (b.leftLeg) {
        _q0.setFromAxisAngle(X_AXIS, lKneeFlex * standLegWeight + leftCrouchKnee + lKneeCrouchOffset);
        b.leftLeg.quaternion.multiply(_q0);
      }
      if (b.rightLeg) {
        _q0.setFromAxisAngle(X_AXIS, rKneeFlex * standLegWeight + rightCrouchKnee + rKneeCrouchOffset);
        b.rightLeg.quaternion.multiply(_q0);
      }

      if (b.leftFoot) {
        _q0.setFromAxisAngle(X_AXIS, lAnkle * standLegWeight + leftCrouchAnkle + lAnkleCrouchOffset);
        b.leftFoot.quaternion.multiply(_q0);
      }
      if (b.rightFoot) {
        _q0.setFromAxisAngle(X_AXIS, rAnkle * standLegWeight + rightCrouchAnkle + rAnkleCrouchOffset);
        b.rightFoot.quaternion.multiply(_q0);
      }

      if (b.spine) {
        _q0.setFromAxisAngle(X_AXIS, crouchSpine + crouchWalkSpine);
        b.spine.quaternion.multiply(_q0);
      }

      // Counter-tilt neck in crouch so head stays looking forward alertly along horizon
      if (b.neck) {
        _q0.setFromAxisAngle(X_AXIS, -0.30 * crouchT * proneLegFade);
        b.neck.quaternion.multiply(_q0);
      }

      // In-air jump tuck
      if (!player.isGrounded && proneT < 0.1) {
        _q0.setFromAxisAngle(X_AXIS, 0.25);
        if (b.leftUpLeg) b.leftUpLeg.quaternion.multiply(_q0);
        if (b.rightUpLeg) b.rightUpLeg.quaternion.multiply(_q0);
        _q1.setFromAxisAngle(X_AXIS, -0.40);
        if (b.leftLeg) b.leftLeg.quaternion.multiply(_q1);
        if (b.rightLeg) b.rightLeg.quaternion.multiply(_q1);
      }
    }

    if (proneT > 0.001 && !player.isDead && !isInWater) {
      // 5. Military Prone Kinematics
      // Head alertly raised to look forward along sight line (-0.75 resting, -1.05 crawling)
      if (b.neck) {
        const neckPitch = THREE.MathUtils.lerp(-0.55, -1.05, locoW) * proneT;
        _q0.setFromAxisAngle(X_AXIS, neckPitch);
        b.neck.quaternion.multiply(_q0);
      }

      // Anatomical Military Prone Arm Support Position (Shoulder -> Upper Arm -> Forearm -> Hand)
      // 1. Shoulders: rotate to bring upper arms forward and outward naturally
      if (b.leftShoulder) {
        _q0.setFromAxisAngle(Z_AXIS, 0.15 * proneT);
        b.leftShoulder.quaternion.multiply(_q0);
      }
      if (b.rightShoulder) {
        _q0.setFromAxisAngle(Z_AXIS, 0.15 * proneT);
        b.rightShoulder.quaternion.multiply(_q0);
      }

      // 2. Upper arms: angle down toward the ground and forward
      if (b.leftArm) {
        _q0.setFromEuler(new THREE.Euler(-1.30 * proneT, 0, 0.80 * proneT));
        b.leftArm.quaternion.multiply(_q0);
      }
      if (b.rightArm) {
        _q0.setFromEuler(new THREE.Euler(-1.30 * proneT, 0, -0.80 * proneT));
        b.rightArm.quaternion.multiply(_q0);
      }

      // 3. Forearms / elbows: bend elbows so forearms rest flat and extend forward along the ground
      if (b.leftForeArm) {
        _q0.setFromEuler(new THREE.Euler(-1.80 * proneT, 0, 0.60 * proneT));
        b.leftForeArm.quaternion.multiply(_q0);
      }
      if (b.rightForeArm) {
        _q0.setFromEuler(new THREE.Euler(-1.80 * proneT, 0, -0.60 * proneT));
        b.rightForeArm.quaternion.multiply(_q0);
      }

      // 4. Hands: extend naturally forward from forearms, flat and aligned with the ground
      if (b.leftHand) {
        _q0.setFromEuler(new THREE.Euler(-0.10 * proneT, 0, -0.15 * proneT));
        b.leftHand.quaternion.multiply(_q0);
      }
      if (b.rightHand) {
        _q0.setFromEuler(new THREE.Euler(-0.10 * proneT, 0, 0.15 * proneT));
        b.rightHand.quaternion.multiply(_q0);
      }

      // Prone crawl stride: alternating knee push
      if (isMoving) {
        const crawlPush = Math.sin(gp);
        if (b.leftUpLeg) {
          _q0.setFromAxisAngle(Z_AXIS, Math.max(0, -crawlPush) * 0.25 * proneT);
          b.leftUpLeg.quaternion.multiply(_q0);
        }
        if (b.rightUpLeg) {
          _q0.setFromAxisAngle(Z_AXIS, Math.max(0, crawlPush) * -0.25 * proneT);
          b.rightUpLeg.quaternion.multiply(_q0);
        }
      }
    } else if (isInWater) {
      // 6. Natural Human Swimming Kinematics
      const swimPhase = (breathTimeRef.current * 4.5) % (Math.PI * 2);
      const kickL = Math.sin(swimPhase) * 0.35;
      const kickR = -kickL;

      if (b.leftUpLeg) {
        _q0.setFromAxisAngle(X_AXIS, kickL);
        b.leftUpLeg.quaternion.multiply(_q0);
      }
      if (b.rightUpLeg) {
        _q0.setFromAxisAngle(X_AXIS, kickR);
        b.rightUpLeg.quaternion.multiply(_q0);
      }
      if (b.leftLeg) {
        _q0.setFromAxisAngle(X_AXIS, -Math.max(0, -kickL) * 0.5);
        b.leftLeg.quaternion.multiply(_q0);
      }
      if (b.rightLeg) {
        _q0.setFromAxisAngle(X_AXIS, -Math.max(0, -kickR) * 0.5);
        b.rightLeg.quaternion.multiply(_q0);
      }
    }

    // 7. Human Shoulder and Arm Posing (Contralateral Locomotion Counter-Swing vs Weapon Hold)
    if (tWeapon < 0.999 && proneLegFade > 0.001 && !isInWater && !player.isVaulting && !player.isMantling) {
      const unarmWeight = (1.0 - tWeapon) * proneLegFade;

      // Locomotion arm swing amplitude (walk ~0.30 rad, sprint ~0.60 rad)
      const armSwingAmp = THREE.MathUtils.lerp(0.30, 0.60, sprintW) * locoW;
      const elbowSwingAmp = THREE.MathUtils.lerp(0.10, 0.25, sprintW) * locoW;

      // Natural Contralateral Arm Swing:
      // Left leg phase is gp. When left leg swings forward (sin(gp) > 0),
      // Left arm swings BACKWARD, Right arm swings FORWARD.
      // In the human rig coordinate system:
      // For LeftArm: +Z is forward swing, -Z is backward swing.
      // For RightArm: -Z is forward swing, +Z is backward swing.
      const lArmSwing = -Math.sin(gp) * armSwingAmp;
      const rArmSwing = -Math.sin(gp) * armSwingAmp;

      const lElbowSwing = Math.sin(gp + Math.PI) * elbowSwingAmp;
      const rElbowSwing = Math.sin(gp) * elbowSwingAmp;

      // Subtle shoulder / clavicle counter-tilt
      if (b.leftShoulder) {
        _q0.setFromAxisAngle(Z_AXIS, -lArmSwing * 0.10 * unarmWeight);
        b.leftShoulder.quaternion.multiply(_q0);
      }
      if (b.rightShoulder) {
        _q0.setFromAxisAngle(Z_AXIS, -rArmSwing * 0.10 * unarmWeight);
        b.rightShoulder.quaternion.multiply(_q0);
      }

      // Upper Arms: independent left and right crouch controls
      const leftArmCrouchX = (0.48 - 0.12 * crouchT) * unarmWeight;
      const rightArmCrouchX = (0.48 - 0.12 * crouchT) * unarmWeight;

      const leftElbowCrouch = 0.35 * crouchT;
      const rightElbowCrouch = 0.35 * crouchT;

      if (b.leftArm) {
        _q0.setFromAxisAngle(X_AXIS, leftArmCrouchX);
        _q1.setFromAxisAngle(Z_AXIS, lArmSwing * unarmWeight);
        _qDelta.multiplyQuaternions(_q0, _q1);
        b.leftArm.quaternion.multiply(_qDelta);
      }

      if (b.rightArm) {
        _q0.setFromAxisAngle(X_AXIS, rightArmCrouchX);
        _q1.setFromAxisAngle(Z_AXIS, rArmSwing * unarmWeight);
        _qDelta.multiplyQuaternions(_q0, _q1);
        b.rightArm.quaternion.multiply(_qDelta);
      }

      // Forearms / Elbows: relaxed natural bend, flexes forward in crouch for tactical ready posture
      const sprintElbowBend = THREE.MathUtils.lerp(0.0, -1.20, sprintW);

      // Left ForeArm: +Z flexes elbow forward
      const lElbowFlex = (-0.20 - sprintElbowBend + leftElbowCrouch + Math.max(0, lArmSwing) * 0.35 + lElbowSwing) * unarmWeight;
      if (b.leftForeArm) {
        _q0.setFromAxisAngle(Z_AXIS, lElbowFlex);
        b.leftForeArm.quaternion.multiply(_q0);
      }

      // Right ForeArm: -Z flexes elbow forward
      const rElbowFlex = (0.20 + sprintElbowBend - rightElbowCrouch - Math.max(0, -rArmSwing) * 0.35 + rElbowSwing) * unarmWeight;
      if (b.rightForeArm) {
        _q0.setFromAxisAngle(Z_AXIS, rElbowFlex);
        b.rightForeArm.quaternion.multiply(_q0);
      }

      // Wrists / Hands: remain naturally attached, softly follow forearm swing with relaxed fingers
      if (b.leftHand) {
        _q0.setFromAxisAngle(Z_AXIS, lArmSwing * 0.15 * unarmWeight);
        b.leftHand.quaternion.multiply(_q0);
      }
      if (b.rightHand) {
        _q0.setFromAxisAngle(Z_AXIS, rArmSwing * 0.15 * unarmWeight);
        b.rightHand.quaternion.multiply(_q0);
      }

      // Natural running fist: progressively curls finger bones into a closed fist when sprinting
      if (sprintW > 0.001 && b.fingerBones) {
        const fistWeight = sprintW * unarmWeight;

        // Finalized fist curl values (curl rotation around X_AXIS)
        // Joint 1: proximal (base knuckle), Joint 2: intermediate, Joint 3: distal (tip)
        const thumbCurl1 = 0.15;
        const thumbCurl2 = -0.35;
        const thumbCurl3 = 0.10;

        const indexCurl1 = 1.15;
        const indexCurl2 = 1.35;
        const indexCurl3 = 1.05;

        const middleCurl1 = 1.15;
        const middleCurl2 = 1.35;
        const middleCurl3 = 1.05;

        const ringCurl1 = 1.15;
        const ringCurl2 = 1.35;
        const ringCurl3 = 1.05;

        const pinkyCurl1 = 1.15;
        const pinkyCurl2 = 1.35;
        const pinkyCurl3 = 1.05;

        for (let i = 0; i < b.fingerBones.length; i++) {
          const fb = b.fingerBones[i];
          let curl = 0;
          if (fb.finger === 'Thumb') {
            curl = fb.joint === 1 ? thumbCurl1 : fb.joint === 2 ? thumbCurl2 : thumbCurl3;
          } else if (fb.finger === 'Index') {
            curl = fb.joint === 1 ? indexCurl1 : fb.joint === 2 ? indexCurl2 : indexCurl3;
          } else if (fb.finger === 'Middle') {
            curl = fb.joint === 1 ? middleCurl1 : fb.joint === 2 ? middleCurl2 : middleCurl3;
          } else if (fb.finger === 'Ring') {
            curl = fb.joint === 1 ? ringCurl1 : fb.joint === 2 ? ringCurl2 : ringCurl3;
          } else if (fb.finger === 'Pinky') {
            curl = fb.joint === 1 ? pinkyCurl1 : fb.joint === 2 ? pinkyCurl2 : pinkyCurl3;
          }
          _q0.setFromAxisAngle(X_AXIS, curl * fistWeight);
          fb.bone.quaternion.multiply(_q0);
        }
      }
    }

    // 8. Authentic Two-Handed Tactical Weapon Pose
    if (tWeapon > 0.001 && proneLegFade > 0.001 && !player.isDead) {
      const weaponHoldWeight = tWeapon * proneLegFade;

      // Right Arm: Raises to shoulder pocket, hand grips weapon handle & trigger
      if (b.rightShoulder) {
        _q0.setFromAxisAngle(Z_AXIS, 0.15 * weaponHoldWeight);
        b.rightShoulder.quaternion.multiply(_q0);
      }
      if (b.rightArm) {
        _q0.setFromAxisAngle(X_AXIS, 0.65 * weaponHoldWeight + 0.15 * aimT);
        _q1.setFromAxisAngle(Z_AXIS, 0.28 * weaponHoldWeight);
        _qDelta.multiplyQuaternions(_q0, _q1);
        b.rightArm.quaternion.multiply(_qDelta);
      }
      if (b.rightForeArm) {
        _q0.setFromAxisAngle(X_AXIS, 0.85 * weaponHoldWeight + 0.10 * aimT);
        b.rightForeArm.quaternion.multiply(_q0);
      }
      if (b.rightHand) {
        _q0.setFromAxisAngle(Y_AXIS, -0.30 * weaponHoldWeight);
        b.rightHand.quaternion.multiply(_q0);
      }

      // Left Arm: Reaches across torso to cradle front handguard / foregrip
      if (b.leftShoulder) {
        _q0.setFromAxisAngle(Z_AXIS, -0.15 * weaponHoldWeight);
        b.leftShoulder.quaternion.multiply(_q0);
      }
      if (b.leftArm) {
        _q0.setFromAxisAngle(X_AXIS, 0.55 * weaponHoldWeight + 0.12 * aimT);
        _q1.setFromAxisAngle(Z_AXIS, -0.45 * weaponHoldWeight);
        _qDelta.multiplyQuaternions(_q0, _q1);
        b.leftArm.quaternion.multiply(_qDelta);
      }
      if (b.leftForeArm) {
        _q0.setFromAxisAngle(X_AXIS, 0.95 * weaponHoldWeight + 0.10 * aimT);
        b.leftForeArm.quaternion.multiply(_q0);
      }
      if (b.leftHand) {
        _q0.setFromAxisAngle(Y_AXIS, 0.35 * weaponHoldWeight);
        b.leftHand.quaternion.multiply(_q0);
      }
    }

    // 8.5 Global Ground Clearance & Surface Contact Enforcement
    // Ensures no body part (feet, knees, hands, pelvis, torso, head) ever penetrates the ground
    enforceGroundContact();

    // 9. Weapon Socket Positioning (Smooth transition between Upper Back Holster and Ready Hands)
    const backPos1 = _v1;
    const backQuat1 = _q1;
    const backPos2 = _v2;
    const backQuat2 = _q2;

    backMount1.updateWorldMatrix(true, false);
    backMount2.updateWorldMatrix(true, false);
    backMount1.getWorldPosition(backPos1);
    backMount1.getWorldQuaternion(backQuat1);
    backMount2.getWorldPosition(backPos2);
    backMount2.getWorldQuaternion(backQuat2);

    // Compute ready weapon position in front of chest / sightline
    const worldUp = Y_AXIS;
    const playerHeading = _v0.set(0, 0, 1).applyAxisAngle(worldUp, player.rotationY);
    const playerRight = _v1.set(1, 0, 0).applyAxisAngle(worldUp, player.rotationY);

    const rArmPos = new THREE.Vector3();
    if (b.rightArm) {
      b.rightArm.updateWorldMatrix(true, false);
      b.rightArm.getWorldPosition(rArmPos);
    } else {
      rArmPos.set(...player.position).addScaledVector(worldUp, 1.4);
    }

    // Aim direction or low-ready forward
    let weaponForward = playerHeading.clone();
    if (player.aimTarget) {
      const aimTargetVec = new THREE.Vector3(...player.aimTarget);
      weaponForward.subVectors(aimTargetVec, rArmPos).normalize();
    }
    const weaponRight = new THREE.Vector3().crossVectors(worldUp, weaponForward).normalize();
    const weaponUp = new THREE.Vector3().crossVectors(weaponForward, weaponRight).normalize();
    const readyMat = new THREE.Matrix4().makeBasis(weaponRight, weaponUp, weaponForward);
    const readyQuat = new THREE.Quaternion().setFromRotationMatrix(readyMat);

    // Physical position in front of dominant shoulder
    const readyPos = rArmPos.clone()
      .addScaledVector(weaponForward, 0.22 + 0.05 * aimT)
      .addScaledVector(worldUp, -0.06 + 0.06 * aimT)
      .addScaledVector(playerRight, -0.04);

    // Recoil kick impulse displacement
    if (kick > 0.001) {
      readyPos.addScaledVector(weaponForward, -0.035 * kick);
      readyPos.addScaledVector(worldUp, 0.015 * kick);
      readyQuat.multiply(new THREE.Quaternion().setFromAxisAngle(weaponRight, -0.04 * kick));
    }

    // Authoritative muzzle tracer origin
    const muzzlePos = readyPos.clone().addScaledVector(weaponForward, 0.65);
    player.muzzlePos = [muzzlePos.x, muzzlePos.y, muzzlePos.z];

    // Smoothly interpolate Weapon Sockets
    if (weaponSocket1Ref.current) {
      weaponSocket1Ref.current.position.lerpVectors(backPos1, readyPos, t1);
      weaponSocket1Ref.current.quaternion.slerpQuaternions(backQuat1, readyQuat, t1);
    }
    if (weaponSocket2Ref.current) {
      weaponSocket2Ref.current.position.lerpVectors(backPos2, readyPos, t2);
      weaponSocket2Ref.current.quaternion.slerpQuaternions(backQuat2, readyQuat, t2);
    }
  });

  const slot1Def = player.inventory.slot1 ? WEAPON_SPAWNS[player.inventory.slot1] : null;
  const slot2Def = player.inventory.slot2 ? WEAPON_SPAWNS[player.inventory.slot2] : null;

  // Visual health percentage
  const hpPercent = Math.max(0, Math.min(100, (player.health / 100) * 100));
  const hpColor = hpPercent > 60 ? '#10b981' : hpPercent > 30 ? '#f59e0b' : '#ef4444';

  return (
    <>
      {/* 3D Root Group physically positioned and rotated every frame */}
      <group ref={rootGroupRef}>
        {/* Character mesh assembly oriented along native forward facing axis */}
        <group ref={characterGroupRef} rotation={[0, 0, 0]}>
          <primitive
            object={cloned}
            scale={[1.0, 1.0, 1.0]}
            position={[0, 0, 0]}
          />
        </group>

        {/* Compact Tactical Overhead Health Indicator */}
        <Html
          position={[0, player.isDead ? 0.35 : player.isProne ? 0.50 : player.isCrouching ? 1.50 : 2.05, 0]}
          center
          style={{ pointerEvents: 'none', userSelect: 'none' }}
        >
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              width: '84px',
              padding: '2px 4px',
              background: 'rgba(10, 14, 23, 0.88)',
              border: `1px solid ${player.isDead ? '#64748b' : player.color}`,
              borderRadius: '3px',
              backdropFilter: 'blur(6px)',
              boxShadow: '0 2px 8px rgba(0,0,0,0.6)',
            }}
          >
            <div
              style={{
                fontSize: '8.5px',
                fontWeight: 700,
                letterSpacing: '0.04em',
                color: player.isDead ? '#94a3b8' : player.accentColor,
                marginBottom: '1.5px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                width: '100%',
                fontFamily: 'monospace',
                lineHeight: 1,
              }}
            >
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {player.name} {isLocal ? '(YOU)' : ''}
              </span>
              <span style={{ color: player.isDead ? '#ef4444' : '#ffffff', fontWeight: 800, marginLeft: '4px' }}>
                {player.isDead ? 'KIA' : `${player.health}`}
              </span>
            </div>

            {/* Health Bar Track */}
            <div
              style={{
                width: '100%',
                height: '2.5px',
                backgroundColor: '#1e293b',
                borderRadius: '1px',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  width: `${hpPercent}%`,
                  height: '100%',
                  backgroundColor: player.isDead ? '#475569' : hpColor,
                  transition: 'width 0.15s ease-out',
                }}
              />
            </div>
          </div>
        </Html>
      </group>

      {/* Slot 1 weapon (Weapon 1) - Back or Hands */}
      {slot1Def && !player.isDead && (
        <group ref={weaponSocket1Ref}>
          <RealisticWeapon
            type={slot1Def.type}
            isFiring={player.isFiring && player.activeSlot === 1}
          />
        </group>
      )}

      {/* Slot 2 weapon (Weapon 2) - Back or Hands */}
      {slot2Def && !player.isDead && (
        <group ref={weaponSocket2Ref}>
          <RealisticWeapon
            type={slot2Def.type}
            isFiring={player.isFiring && player.activeSlot === 2}
          />
        </group>
      )}
    </>
  );
};

useGLTF.preload('/models/player/human_male.glb');
