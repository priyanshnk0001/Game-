import React, { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF, Html } from '@react-three/drei';
import * as THREE from 'three';
import { clone as cloneSkeleton } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { PlayerState } from '../../types/game';
import { WEAPON_SPAWNS } from '../../config/constants';
import { RealisticWeapon } from '../weapons/RealisticWeapon';

interface RealisticPlayerProps {
  player: PlayerState;
  isLocal: boolean;
}

// Pre-allocated scratch vectors and quaternions for 60fps zero-garbage-collection calculations
const _v0 = new THREE.Vector3();
const _v1 = new THREE.Vector3();
const _v2 = new THREE.Vector3();
const _q0 = new THREE.Quaternion();
const _q1 = new THREE.Quaternion();
const _q2 = new THREE.Quaternion();
const _qDelta = new THREE.Quaternion();

const X_AXIS = new THREE.Vector3(1, 0, 0);
const Y_AXIS = new THREE.Vector3(0, 1, 0);
const Z_AXIS = new THREE.Vector3(0, 0, 1);

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
    rightUpLeg?: THREE.Bone;
    rightLeg?: THREE.Bone;
    rightFoot?: THREE.Bone;
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
  const crouchProgressRef = useRef<number>(player.isCrouching ? 1.0 : 0.0);
  const proneProgressRef = useRef<number>(player.isProne ? 1.0 : 0.0);
  const weaponTransition1Ref = useRef<number>(player.activeSlot === 1 && player.weaponState === 'ready' ? 1.0 : 0.0);
  const weaponTransition2Ref = useRef<number>(player.activeSlot === 2 && player.weaponState === 'ready' ? 1.0 : 0.0);
  const aimProgressRef = useRef<number>(player.isAiming ? 1.0 : 0.0);
  const recoilKickRef = useRef<number>(0);

  // Discover and cache skeleton bones & register pristine rest quaternions
  useEffect(() => {
    const bones: typeof bonesRef.current = {};
    const restQuats = new Map<string, THREE.Quaternion>();

    cloned.traverse((node) => {
      if ((node as THREE.Bone).isBone) {
        const bone = node as THREE.Bone;
        restQuats.set(bone.name, bone.quaternion.clone());

        const cleanName = bone.name.replace('mixamorig:', '').replace('mixamorig', '');
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
          case 'RightUpLeg': bones.rightUpLeg = bone; break;
          case 'RightLeg': bones.rightLeg = bone; break;
          case 'RightFoot': bones.rightFoot = bone; break;
        }
      }
    });

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

    // 1. Authoritative World Position and Rotation from Gameplay Controller
    if (rootGroupRef.current) {
      rootGroupRef.current.position.set(...player.position);
      rootGroupRef.current.rotation.y = player.rotationY;
    }

    // Measure ground velocity and speed
    const currentPos = _v0.set(...player.position);
    const distMoved = currentPos.distanceTo(prevPosRef.current);
    prevPosRef.current.copy(currentPos);
    const speed = distMoved / Math.max(0.0001, delta);
    const isMoving = speed > 0.12 && !player.isDead;
    const isSprinting = player.isSprinting && isMoving && speed > 2.5;

    // Locomotion and Sprint smooth blend weights (prevents any pose snapping)
    locoBlendRef.current = THREE.MathUtils.lerp(locoBlendRef.current, isMoving ? 1.0 : 0.0, Math.min(1, delta * 10));
    sprintBlendRef.current = THREE.MathUtils.lerp(sprintBlendRef.current, isSprinting ? 1.0 : 0.0, Math.min(1, delta * 8));
    const locoW = locoBlendRef.current;
    const sprintW = sprintBlendRef.current;

    // Advance breath and gait timers
    breathTimeRef.current += delta;

    // Calibrated Human Stride Cadence:
    // Stride length ~1.65m (walk) expanding to ~2.15m (sprint).
    // Stride frequency directly matches travel distance to completely eliminate foot sliding/skating.
    const currentStrideLen = THREE.MathUtils.lerp(1.65, 2.15, sprintW);
    const gaitFreq = isMoving ? (speed / currentStrideLen) * Math.PI * 2 : 0;
    gaitPhaseRef.current = (gaitPhaseRef.current + delta * gaitFreq) % (Math.PI * 2);
    const gp = gaitPhaseRef.current;

    // Pelvis Dynamics:
    // Vertical bob: 2 cycles per stride, dips during double support, highest at mid-stance
    const pelvisBob = -Math.cos(gp * 2) * 0.022 * locoW;
    // Lateral weight transfer over supporting stance leg
    const pelvisSwayX = Math.sin(gp) * 0.016 * locoW;
    // Pelvic list / roll
    const pelvisRollZ = Math.sin(gp) * 0.025 * locoW;

    // Stance transition smoothing: standing (0.0), crouch (1.0), prone (1.0)
    const targetCrouch = player.isCrouching && !player.isDead ? 1.0 : 0.0;
    const targetProne = player.isProne && !player.isDead ? 1.0 : 0.0;
    crouchProgressRef.current = THREE.MathUtils.lerp(crouchProgressRef.current, targetCrouch, delta * 8);
    proneProgressRef.current = THREE.MathUtils.lerp(proneProgressRef.current, targetProne, delta * 6);
    const crouchT = crouchProgressRef.current;
    const proneT = proneProgressRef.current;

    // Weapon state transition smoothing
    const isSlot1Ready = player.activeSlot === 1 && player.weaponState === 'ready' && !player.isDead && !player.isVaulting && !player.isMantling;
    const isSlot2Ready = player.activeSlot === 2 && player.weaponState === 'ready' && !player.isDead && !player.isVaulting && !player.isMantling;
    weaponTransition1Ref.current = THREE.MathUtils.lerp(weaponTransition1Ref.current, isSlot1Ready ? 1.0 : 0.0, delta * 10);
    weaponTransition2Ref.current = THREE.MathUtils.lerp(weaponTransition2Ref.current, isSlot2Ready ? 1.0 : 0.0, delta * 10);
    const t1 = weaponTransition1Ref.current;
    const t2 = weaponTransition2Ref.current;
    const tWeapon = Math.max(t1, t2);

    const targetAim = player.isAiming && player.weaponState === 'ready' && !player.isDead ? 1.0 : 0.0;
    aimProgressRef.current = THREE.MathUtils.lerp(aimProgressRef.current, targetAim, delta * 12);
    const aimT = aimProgressRef.current;

    // Weapon recoil kick impulse decay
    if (player.isFiring && !player.isDead) {
      recoilKickRef.current = Math.min(1.0, recoilKickRef.current + 0.35);
    } else {
      recoilKickRef.current = THREE.MathUtils.lerp(recoilKickRef.current, 0.0, delta * 14);
    }
    const kick = recoilKickRef.current;

    // Water states
    const isInWater = player.waterState === 'swimming' || player.waterState === 'surface' || player.waterState === 'underwater';
    const isDiving = player.waterState === 'underwater';

    // 2. Character Root Group Placement & Overall Stance Pitch (Native Forward Axis)
    if (characterGroupRef.current) {
      if (player.isDead) {
        // Natural death pose: smoothly tilt onto back/side
        characterGroupRef.current.rotation.x = THREE.MathUtils.lerp(characterGroupRef.current.rotation.x, -Math.PI / 2, delta * 8);
        characterGroupRef.current.rotation.y = 0;
        characterGroupRef.current.position.set(0, 0.15, 0);
      } else if (isDiving) {
        // Underwater diving streamlined posture
        characterGroupRef.current.rotation.x = THREE.MathUtils.lerp(characterGroupRef.current.rotation.x, 1.25, delta * 6);
        characterGroupRef.current.rotation.y = 0;
        characterGroupRef.current.position.set(0, 0, 0);
      } else if (isInWater) {
        // Surface swimming forward pitch
        characterGroupRef.current.rotation.x = THREE.MathUtils.lerp(characterGroupRef.current.rotation.x, 1.35, delta * 6);
        characterGroupRef.current.rotation.y = 0;
        characterGroupRef.current.position.set(0, -0.20, 0);
      } else if (player.isMantling || player.isVaulting) {
        // Vault / mantle forward push
        const mp = player.mantleProgress ?? player.vaultProgress ?? 0.5;
        const mantlePitch = mp < 0.3 ? 0.20 : mp < 0.7 ? 0.45 : 0.10;
        characterGroupRef.current.rotation.x = THREE.MathUtils.lerp(characterGroupRef.current.rotation.x, mantlePitch, delta * 10);
        characterGroupRef.current.rotation.y = 0;
        characterGroupRef.current.position.set(0, 0, 0);
      } else {
        // Seamless continuous blend: Standing -> Crouch -> Prone
        const targetRotX = (Math.PI / 2) * proneT;
        characterGroupRef.current.rotation.x = THREE.MathUtils.lerp(characterGroupRef.current.rotation.x, targetRotX, delta * 8);
        characterGroupRef.current.rotation.y = 0;

        // Vertical and depth offsets:
        // Crouch drops hips by ~0.26m so knees flex forward and feet remain planted flat
        // Prone lowers torso to 0.10m ground contact and shifts Z by -0.70m to center hips in capsule
        const crawlBob = proneT > 0.05 && isMoving ? Math.abs(Math.sin(gp * 2)) * 0.015 * proneT : 0;
        const targetPosY = (0.10 * proneT) + crawlBob + (-0.26 * crouchT * (1.0 - proneT)) + pelvisBob * (1.0 - proneT);
        const targetPosZ = -0.70 * proneT;
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
    resetBone(b.rightUpLeg);
    resetBone(b.rightLeg);
    resetBone(b.rightFoot);

    if (player.isDead) return;

    // Subtle natural pelvic list/roll during gait weight transfer
    if (b.hips && proneT < 0.5 && !isInWater) {
      _q0.setFromAxisAngle(Z_AXIS, pelvisRollZ);
      b.hips.quaternion.multiply(_q0);
    }

    // 3. Human Spine & Breathing Dynamics
    const breathCycle = Math.sin(breathTimeRef.current * 1.8);
    if (b.spine1) {
      // Subtle natural chest rise and fall during breathing (0.012 rad)
      _q0.setFromAxisAngle(X_AXIS, breathCycle * 0.012 * (1.0 - proneT));
      // Counter-rotation of upper torso opposite to pelvis/stride for natural balance
      _q1.setFromAxisAngle(Y_AXIS, -Math.sin(gp) * 0.035 * locoW * (1.0 - proneT));
      _qDelta.multiplyQuaternions(_q0, _q1);
      b.spine1.quaternion.multiply(_qDelta);
    }

    // 4. Anatomical Human Locomotion Kinematics (Hips -> Thigh -> Knee -> Ankle -> Foot)
    if (!isInWater && !player.isVaulting && !player.isMantling && proneT < 0.5) {
      // Stride amplitude scales smoothly from walking (~0.42 rad) to sprinting (~0.72 rad)
      const thighAmp = THREE.MathUtils.lerp(0.42, 0.72, sprintW) * locoW;

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

      // Anatomical Knee Flexion:
      // During swing phase (cos > 0), knee flexes deeply to lift foot and clear the ground:
      // ~1.05 rad (60 deg) for walk, up to 1.35 rad (77 deg) for sprint.
      // In stance phase (cos <= 0), knee maintains compliant extension (-0.08 rad).
      const kneeFlexBase = THREE.MathUtils.lerp(0.95, 1.30, sprintW);
      const lKneeFlex = -0.08 - (lCos > 0 ? Math.pow(lCos, 1.4) * kneeFlexBase : 0) * locoW;
      const rKneeFlex = -0.08 - (rCos > 0 ? Math.pow(rCos, 1.4) * kneeFlexBase : 0) * locoW;

      // Ankle Articulation (dorsiflexion on heel strike, plantarflexion on push-off):
      const lAnkle = (-lSwing * 0.18 + (lCos > 0.2 ? 0.16 : -0.12 * Math.max(0, -lCos))) * locoW;
      const rAnkle = (-rSwing * 0.18 + (rCos > 0.2 ? 0.16 : -0.12 * Math.max(0, -rCos))) * locoW;

      // Crouch stance additions (knees bend forward naturally, hips lower)
      const crouchThigh = 0.70 * crouchT;
      const crouchKnee = -1.25 * crouchT;
      const crouchAnkle = 0.55 * crouchT;
      const crouchSpine = 0.22 * crouchT;

      if (b.leftUpLeg) {
        _q0.setFromAxisAngle(X_AXIS, lThighAngle * (1.0 - crouchT * 0.5) + crouchThigh);
        b.leftUpLeg.quaternion.multiply(_q0);
      }
      if (b.rightUpLeg) {
        _q0.setFromAxisAngle(X_AXIS, rThighAngle * (1.0 - crouchT * 0.5) + crouchThigh);
        b.rightUpLeg.quaternion.multiply(_q0);
      }

      if (b.leftLeg) {
        _q0.setFromAxisAngle(X_AXIS, lKneeFlex * (1.0 - crouchT * 0.5) + crouchKnee);
        b.leftLeg.quaternion.multiply(_q0);
      }
      if (b.rightLeg) {
        _q0.setFromAxisAngle(X_AXIS, rKneeFlex * (1.0 - crouchT * 0.5) + crouchKnee);
        b.rightLeg.quaternion.multiply(_q0);
      }

      if (b.leftFoot) {
        _q0.setFromAxisAngle(X_AXIS, lAnkle * (1.0 - crouchT) + crouchAnkle);
        b.leftFoot.quaternion.multiply(_q0);
      }
      if (b.rightFoot) {
        _q0.setFromAxisAngle(X_AXIS, rAnkle * (1.0 - crouchT) + crouchAnkle);
        b.rightFoot.quaternion.multiply(_q0);
      }

      if (b.spine) {
        _q0.setFromAxisAngle(X_AXIS, crouchSpine);
        b.spine.quaternion.multiply(_q0);
      }

      // In-air jump tuck
      if (!player.isGrounded) {
        _q0.setFromAxisAngle(X_AXIS, 0.25);
        if (b.leftUpLeg) b.leftUpLeg.quaternion.multiply(_q0);
        if (b.rightUpLeg) b.rightUpLeg.quaternion.multiply(_q0);
        _q1.setFromAxisAngle(X_AXIS, -0.40);
        if (b.leftLeg) b.leftLeg.quaternion.multiply(_q1);
        if (b.rightLeg) b.rightLeg.quaternion.multiply(_q1);
      }
    } else if (proneT >= 0.5 && !player.isDead) {
      // 5. Military Prone Kinematics
      // Head alertly raised to look forward along sight line
      if (b.neck) {
        _q0.setFromAxisAngle(X_AXIS, -0.35 * proneT);
        b.neck.quaternion.multiply(_q0);
      }

      // Forearms resting forward on ground
      if (b.leftForeArm) {
        _q0.setFromAxisAngle(Z_AXIS, 0.70 * proneT);
        b.leftForeArm.quaternion.multiply(_q0);
      }
      if (b.rightForeArm) {
        _q0.setFromAxisAngle(Z_AXIS, -0.70 * proneT);
        b.rightForeArm.quaternion.multiply(_q0);
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
    if (tWeapon < 0.999 && proneT < 0.5 && !isInWater && !player.isVaulting && !player.isMantling) {
      const unarmWeight = 1.0 - tWeapon;

      // Locomotion arm swing amplitude (walk ~0.30 rad, sprint ~0.60 rad)
      const armSwingAmp = THREE.MathUtils.lerp(0.30, 0.60, sprintW) * locoW;

      // Natural Contralateral Arm Swing:
      // Left leg phase is gp. When left leg swings forward (sin(gp) > 0),
      // Left arm swings BACKWARD, Right arm swings FORWARD.
      // In the human rig coordinate system:
      // For LeftArm: +Z is forward swing, -Z is backward swing.
      // For RightArm: -Z is forward swing, +Z is backward swing.
      const lArmSwing = -Math.sin(gp) * armSwingAmp;
      const rArmSwing = -Math.sin(gp) * armSwingAmp;

      // Subtle shoulder / clavicle counter-tilt
      if (b.leftShoulder) {
        _q0.setFromAxisAngle(Z_AXIS, -lArmSwing * 0.10 * unarmWeight);
        b.leftShoulder.quaternion.multiply(_q0);
      }
      if (b.rightShoulder) {
        _q0.setFromAxisAngle(Z_AXIS, -rArmSwing * 0.10 * unarmWeight);
        b.rightShoulder.quaternion.multiply(_q0);
      }

      // Upper Arms: lowered naturally along torso (+0.48 rad on local X) + sagittal swing on local Z
      if (b.leftArm) {
        _q0.setFromAxisAngle(X_AXIS, 0.48 * unarmWeight);
        _q1.setFromAxisAngle(Z_AXIS, lArmSwing * unarmWeight);
        _qDelta.multiplyQuaternions(_q0, _q1);
        b.leftArm.quaternion.multiply(_qDelta);
      }

      if (b.rightArm) {
        _q0.setFromAxisAngle(X_AXIS, 0.48 * unarmWeight);
        _q1.setFromAxisAngle(Z_AXIS, rArmSwing * unarmWeight);
        _qDelta.multiplyQuaternions(_q0, _q1);
        b.rightArm.quaternion.multiply(_qDelta);
      }

      // Forearms / Elbows: relaxed natural bend, flexes more during forward swing
      // Left ForeArm: +Z flexes elbow forward
      const lElbowFlex = (0.20 + Math.max(0, lArmSwing) * 0.35) * unarmWeight;
      if (b.leftForeArm) {
        _q0.setFromAxisAngle(Z_AXIS, lElbowFlex);
        b.leftForeArm.quaternion.multiply(_q0);
      }

      // Right ForeArm: -Z flexes elbow forward
      const rElbowFlex = (-0.20 - Math.max(0, -rArmSwing) * 0.35) * unarmWeight;
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
    }

    // 8. Authentic Two-Handed Tactical Weapon Pose
    if (tWeapon > 0.001 && proneT < 0.5 && !player.isDead) {
      // Right Arm: Raises to shoulder pocket, hand grips weapon handle & trigger
      if (b.rightShoulder) {
        _q0.setFromAxisAngle(Z_AXIS, 0.15 * tWeapon);
        b.rightShoulder.quaternion.multiply(_q0);
      }
      if (b.rightArm) {
        _q0.setFromAxisAngle(X_AXIS, 0.65 * tWeapon + 0.15 * aimT);
        _q1.setFromAxisAngle(Z_AXIS, 0.28 * tWeapon);
        _qDelta.multiplyQuaternions(_q0, _q1);
        b.rightArm.quaternion.multiply(_qDelta);
      }
      if (b.rightForeArm) {
        _q0.setFromAxisAngle(X_AXIS, 0.85 * tWeapon + 0.10 * aimT);
        b.rightForeArm.quaternion.multiply(_q0);
      }
      if (b.rightHand) {
        _q0.setFromAxisAngle(Y_AXIS, -0.30 * tWeapon);
        b.rightHand.quaternion.multiply(_q0);
      }

      // Left Arm: Reaches across torso to cradle front handguard / foregrip
      if (b.leftShoulder) {
        _q0.setFromAxisAngle(Z_AXIS, -0.15 * tWeapon);
        b.leftShoulder.quaternion.multiply(_q0);
      }
      if (b.leftArm) {
        _q0.setFromAxisAngle(X_AXIS, 0.55 * tWeapon + 0.12 * aimT);
        _q1.setFromAxisAngle(Z_AXIS, -0.45 * tWeapon);
        _qDelta.multiplyQuaternions(_q0, _q1);
        b.leftArm.quaternion.multiply(_qDelta);
      }
      if (b.leftForeArm) {
        _q0.setFromAxisAngle(X_AXIS, 0.95 * tWeapon + 0.10 * aimT);
        b.leftForeArm.quaternion.multiply(_q0);
      }
      if (b.leftHand) {
        _q0.setFromAxisAngle(Y_AXIS, 0.35 * tWeapon);
        b.leftHand.quaternion.multiply(_q0);
      }
    }

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
        {/* Character mesh assembly calibrated with 180 deg conversion for gameplay forward facing */}
        <group ref={characterGroupRef} rotation={[0, Math.PI, 0]}>
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
