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

export const RealisticPlayer: React.FC<RealisticPlayerProps> = ({ player, isLocal }) => {
  const rootGroupRef = useRef<THREE.Group>(null);
  const characterGroupRef = useRef<THREE.Group>(null);
  const weaponSocket1Ref = useRef<THREE.Group>(null);
  const weaponSocket2Ref = useRef<THREE.Group>(null);

  // Load Vanguard tactical soldier GLB
  const { scene, animations } = useGLTF('/models/Soldier.glb');

  // Clone skeleton for independent bones and animation mixers per player
  const cloned = useMemo(() => {
    const clone = cloneSkeleton(scene) as THREE.Group;

    // Enable shadows and customize team colors
    clone.traverse((child) => {
      if ((child as THREE.SkinnedMesh).isSkinnedMesh) {
        child.castShadow = true;
        child.receiveShadow = true;

        // Clone materials so P1 and P2 can have team uniforms
        const mesh = child as THREE.SkinnedMesh;
        if (Array.isArray(mesh.material)) {
          mesh.material = mesh.material.map((m) => m.clone());
        } else if (mesh.material) {
          mesh.material = mesh.material.clone();
        }

        // Apply team color accents to visor
        if (child.name.toLowerCase().includes('visor')) {
          const visorMat = (mesh.material as THREE.MeshStandardMaterial);
          if (visorMat) {
            visorMat.emissive = new THREE.Color(player.isDead ? '#334155' : player.color);
            visorMat.emissiveIntensity = player.isDead ? 0.1 : 1.2;
          }
        }
      }
    });

    return clone;
  }, [scene, player.color, player.isDead]);

  // Setup AnimationMixer
  const mixer = useMemo(() => new THREE.AnimationMixer(cloned), [cloned]);
  const actions = useMemo(() => {
    const actMap: Record<string, THREE.AnimationAction> = {};
    animations.forEach((clip) => {
      actMap[clip.name] = mixer.clipAction(clip);
    });
    return actMap;
  }, [animations, mixer]);

  const currentActionRef = useRef<string>('Idle');
  const prevPosRef = useRef<THREE.Vector3>(new THREE.Vector3(...player.position));
  const spineBoneRef = useRef<THREE.Object3D | null>(null);

  // Skeleton bone references for procedural military crouch, prone crawl, and arm aiming
  const hipsBoneRef = useRef<THREE.Bone | null>(null);
  const spineBone0Ref = useRef<THREE.Bone | null>(null);
  const neckBoneRef = useRef<THREE.Bone | null>(null);
  const headBoneRef = useRef<THREE.Bone | null>(null);

  const leftUpLegRef = useRef<THREE.Bone | null>(null);
  const leftLegRef = useRef<THREE.Bone | null>(null);
  const leftFootRef = useRef<THREE.Bone | null>(null);

  const rightUpLegRef = useRef<THREE.Bone | null>(null);
  const rightLegRef = useRef<THREE.Bone | null>(null);
  const rightFootRef = useRef<THREE.Bone | null>(null);

  // Base bind pose quaternions to prevent accumulate drift
  const baseLeftUpLegRef = useRef<THREE.Quaternion>(new THREE.Quaternion());
  const baseLeftLegRef = useRef<THREE.Quaternion>(new THREE.Quaternion());
  const baseLeftFootRef = useRef<THREE.Quaternion>(new THREE.Quaternion());

  const baseRightUpLegRef = useRef<THREE.Quaternion>(new THREE.Quaternion());
  const baseRightLegRef = useRef<THREE.Quaternion>(new THREE.Quaternion());
  const baseRightFootRef = useRef<THREE.Quaternion>(new THREE.Quaternion());

  const baseSpine0Ref = useRef<THREE.Quaternion>(new THREE.Quaternion());
  const baseNeckRef = useRef<THREE.Quaternion>(new THREE.Quaternion());
  const baseHeadRef = useRef<THREE.Quaternion>(new THREE.Quaternion());
  const baseRightShoulderRef = useRef<THREE.Quaternion>(new THREE.Quaternion());
  const baseLeftShoulderRef = useRef<THREE.Quaternion>(new THREE.Quaternion());

  // Smooth continuous stance transition progress: 0.0 to 1.0
  const crouchAmountRef = useRef<number>(player.isCrouching ? 1.0 : 0.0);
  const proneAmountRef = useRef<number>(player.isProne ? 1.0 : 0.0);
  const crawlPhaseRef = useRef<number>(0);

  // Arm bone references for procedural two-handed tactical holding pose
  // Right Arm (holds pistol grip & trigger with stock tucked firmly against right shoulder)
  const rightShoulderRef = useRef<THREE.Bone | null>(null);
  const rightArmRef = useRef<THREE.Bone | null>(null);
  const rightForeArmRef = useRef<THREE.Bone | null>(null);
  const rightHandRef = useRef<THREE.Bone | null>(null);

  // Left Arm (reaches across torso to grip and cradle the front handguard / foregrip)
  const leftShoulderRef = useRef<THREE.Bone | null>(null);
  const leftArmRef = useRef<THREE.Bone | null>(null);
  const leftForeArmRef = useRef<THREE.Bone | null>(null);
  const leftHandRef = useRef<THREE.Bone | null>(null);

  // 1. HOLSTERED STATE MOUNT 1 (Back of Torso) — LOCKED / UNTOUCHED
  // Attached to mixamorig:Spine2 (upper chest/back bone).
  // Positioned diagonally across the back from upper right shoulder to lower left hip,
  // resting snug against the back armor vest plate carrier (z = -17.5cm, no floating, no deep clipping).
  const backMount1 = useMemo(() => {
    const obj = new THREE.Object3D();
    obj.position.set(0.0, -3.0, -17.5);
    obj.rotation.set(1.475, -0.583, -1.584);
    return obj;
  }, []);

  // 2. HOLSTERED STATE MOUNT 2 (Secondary Back Cross-Sling)
  // Attached to mixamorig:Spine2.
  // Crosses diagonally from upper left shoulder to lower right hip,
  // seated 2.5cm behind mount 1 (z = -20.0cm) to form an authentic dual-weapon tactical sling with zero clipping.
  const backMount2 = useMemo(() => {
    const obj = new THREE.Object3D();
    obj.position.set(0.0, -3.0, -20.0);
    obj.rotation.set(1.475, 0.583, 1.584);
    return obj;
  }, []);

  // Smooth transition progress: 0.0 = Holstered on Back, 1.0 = Ready in Hands for Slot 1 and Slot 2
  const transitionProgress1Ref = useRef<number>(player.activeSlot === 1 && player.weaponState === 'ready' ? 1.0 : 0.0);
  const transitionProgress2Ref = useRef<number>(player.activeSlot === 2 && player.weaponState === 'ready' ? 1.0 : 0.0);
  const aimProgressRef = useRef<number>(player.isAiming ? 1.0 : 0.0);

  // Discover and cache skeleton bones & attach back mounts to Spine2
  useEffect(() => {
    cloned.traverse((node) => {
      const name = node.name.replace(':', '');
      if (name === 'mixamorigSpine2') {
        spineBoneRef.current = node;
        node.add(backMount1);
        node.add(backMount2);
      }
      if (name === 'mixamorigHips') hipsBoneRef.current = node as THREE.Bone;
      if (name === 'mixamorigSpine') {
        spineBone0Ref.current = node as THREE.Bone;
        baseSpine0Ref.current.copy(node.quaternion);
      }
      if (name === 'mixamorigNeck') {
        neckBoneRef.current = node as THREE.Bone;
        baseNeckRef.current.copy(node.quaternion);
      }
      if (name === 'mixamorigHead') {
        headBoneRef.current = node as THREE.Bone;
        baseHeadRef.current.copy(node.quaternion);
      }

      if (name === 'mixamorigLeftUpLeg') {
        leftUpLegRef.current = node as THREE.Bone;
        baseLeftUpLegRef.current.copy(node.quaternion);
      }
      if (name === 'mixamorigLeftLeg') {
        leftLegRef.current = node as THREE.Bone;
        baseLeftLegRef.current.copy(node.quaternion);
      }
      if (name === 'mixamorigLeftFoot') {
        leftFootRef.current = node as THREE.Bone;
        baseLeftFootRef.current.copy(node.quaternion);
      }

      if (name === 'mixamorigRightUpLeg') {
        rightUpLegRef.current = node as THREE.Bone;
        baseRightUpLegRef.current.copy(node.quaternion);
      }
      if (name === 'mixamorigRightLeg') {
        rightLegRef.current = node as THREE.Bone;
        baseRightLegRef.current.copy(node.quaternion);
      }
      if (name === 'mixamorigRightFoot') {
        rightFootRef.current = node as THREE.Bone;
        baseRightFootRef.current.copy(node.quaternion);
      }

      if (name === 'mixamorigRightShoulder') {
        rightShoulderRef.current = node as THREE.Bone;
        baseRightShoulderRef.current.copy(node.quaternion);
      }
      if (name === 'mixamorigRightArm') rightArmRef.current = node as THREE.Bone;
      if (name === 'mixamorigRightForeArm') rightForeArmRef.current = node as THREE.Bone;
      if (name === 'mixamorigRightHand') rightHandRef.current = node as THREE.Bone;

      if (name === 'mixamorigLeftShoulder') {
        leftShoulderRef.current = node as THREE.Bone;
        baseLeftShoulderRef.current.copy(node.quaternion);
      }
      if (name === 'mixamorigLeftArm') leftArmRef.current = node as THREE.Bone;
      if (name === 'mixamorigLeftForeArm') leftForeArmRef.current = node as THREE.Bone;
      if (name === 'mixamorigLeftHand') leftHandRef.current = node as THREE.Bone;
    });

    return () => {
      backMount1.removeFromParent();
      backMount2.removeFromParent();
    };
  }, [cloned, backMount1, backMount2]);

  // Initial animation start
  useEffect(() => {
    if (actions['Idle']) {
      actions['Idle'].play();
    }
    return () => {
      mixer.stopAllAction();
    };
  }, [actions, mixer]);

  // Per-frame animation cross-fading, procedural crouch/prone bone adjustments, arm posing, and weapon tracking
  useFrame((_, delta) => {
    mixer.update(delta);

    // 1. Physically update root group transform to match authoritative player position & rotation
    if (rootGroupRef.current) {
      rootGroupRef.current.position.set(
        player.position[0],
        player.position[1],
        player.position[2]
      );
      rootGroupRef.current.rotation.y = player.rotationY;
    }

    // Smooth continuous stance transition progress
    const targetCrouch = player.isCrouching && !player.isDead ? 1.0 : 0.0;
    const targetProne = player.isProne && !player.isDead ? 1.0 : 0.0;

    crouchAmountRef.current = THREE.MathUtils.damp(
      crouchAmountRef.current,
      targetCrouch,
      8.0,
      delta
    );
    proneAmountRef.current = THREE.MathUtils.damp(
      proneAmountRef.current,
      targetProne,
      7.0,
      delta
    );

    const crouchT = crouchAmountRef.current;
    const proneT = proneAmountRef.current;

    // Smooth weapon state transition and ADS aiming interpolation
    const isSlot1Ready = player.activeSlot === 1 && player.weaponState === 'ready' && !player.isDead && !player.isVaulting && !player.isMantling;
    const isSlot2Ready = player.activeSlot === 2 && player.weaponState === 'ready' && !player.isDead && !player.isVaulting && !player.isMantling;

    const targetT1 = isSlot1Ready ? 1.0 : 0.0;
    const targetT2 = isSlot2Ready ? 1.0 : 0.0;

    transitionProgress1Ref.current = THREE.MathUtils.damp(
      transitionProgress1Ref.current,
      targetT1,
      10.0,
      delta
    );
    transitionProgress2Ref.current = THREE.MathUtils.damp(
      transitionProgress2Ref.current,
      targetT2,
      10.0,
      delta
    );

    const t1 = transitionProgress1Ref.current;
    const t2 = transitionProgress2Ref.current;
    const tArms = Math.max(t1, t2);

    const targetAim = player.isAiming && player.weaponState === 'ready' && !player.isDead ? 1.0 : 0.0;
    aimProgressRef.current = THREE.MathUtils.damp(
      aimProgressRef.current,
      targetAim,
      12.0,
      delta
    );
    const at = aimProgressRef.current;

    // Movement speed & crawl cycle calculations
    const currentPos = new THREE.Vector3(...player.position);
    const distMoved = currentPos.distanceTo(prevPosRef.current);
    prevPosRef.current.copy(currentPos);
    const speed = distMoved / (delta || 0.016);
    const isMoving = speed > 0.12;

    if (player.isProne && isMoving) {
      crawlPhaseRef.current += delta * Math.min(speed * 3.8, 8.0);
    }
    const crawlPhase = crawlPhaseRef.current;

    // 2. Continuous Character Group Transforms (Pitch, Height, Depth, Roll)
    if (characterGroupRef.current) {
      if (player.isDead) {
        characterGroupRef.current.rotation.x = THREE.MathUtils.lerp(
          characterGroupRef.current.rotation.x,
          -Math.PI / 2,
          delta * 8
        );
        characterGroupRef.current.rotation.y = Math.PI;
        characterGroupRef.current.rotation.z = 0;
        characterGroupRef.current.position.set(0, 0.15, 0);
      } else if (player.isMantling) {
        const mp = player.mantleProgress ?? 0;
        const targetPitch = mp < 0.35 ? 0.15 : mp < 0.75 ? 0.42 : 0.08;
        characterGroupRef.current.rotation.x = THREE.MathUtils.lerp(
          characterGroupRef.current.rotation.x,
          targetPitch,
          delta * 12
        );
        characterGroupRef.current.rotation.y = Math.PI;
        characterGroupRef.current.rotation.z = 0;
        characterGroupRef.current.position.set(0, 0, 0);
      } else if (player.isVaulting) {
        characterGroupRef.current.rotation.x = THREE.MathUtils.lerp(
          characterGroupRef.current.rotation.x,
          0.42,
          delta * 12
        );
        characterGroupRef.current.rotation.y = Math.PI;
        characterGroupRef.current.rotation.z = 0;
        characterGroupRef.current.position.set(0, 0, 0);
      } else {
        // Continuous blend between Standing, Tactical Crouch, and Grounded Military Prone
        // In Prone: rotation.x = 1.50 (chest/stomach facing ground, back facing upward, head facing forward)
        const targetRotX = 1.50 * proneT;
        const targetRotY = Math.PI;
        const targetRotZ = proneT > 0.05 && isMoving ? Math.sin(crawlPhase) * 0.035 * proneT : 0;

        // In Prone: position.y = 0.08 (torso and legs resting flat against ground), position.z = -0.75 (centers hips in capsule, legs behind)
        // Crawl locomotion adds subtle vertical bob and lateral hip shift
        const crawlBob = proneT > 0.05 && isMoving ? Math.abs(Math.sin(crawlPhase * 2)) * 0.015 * proneT : 0;
        const targetPosY = (0.08 * proneT) + crawlBob + (-0.34 * crouchT * (1.0 - proneT));
        const targetPosZ = (-0.75 * proneT);
        const targetPosX = proneT > 0.05 && isMoving ? Math.sin(crawlPhase) * 0.035 * proneT : 0;

        characterGroupRef.current.rotation.x = targetRotX;
        characterGroupRef.current.rotation.y = targetRotY;
        characterGroupRef.current.rotation.z = targetRotZ;

        characterGroupRef.current.position.x = targetPosX;
        characterGroupRef.current.position.y = targetPosY;
        characterGroupRef.current.position.z = targetPosZ;
      }
    }

    // 3. Stance Animation Action Cross-fading
    if (!player.isDead && !player.isVaulting && !player.isMantling) {
      let desiredAction = 'Idle';
      if (player.isProne) {
        if (isMoving) desiredAction = 'Walk';
        else desiredAction = 'Idle';
      } else if (player.isCrouching) {
        if (isMoving) desiredAction = 'Walk';
        else desiredAction = 'Idle';
      } else {
        if (player.isSprinting && speed > 1.0) desiredAction = 'Run';
        else if (isMoving) desiredAction = 'Walk';
        else desiredAction = 'Idle';
      }

      if (currentActionRef.current !== desiredAction && actions[desiredAction]) {
        const from = actions[currentActionRef.current];
        const to = actions[desiredAction];
        if (from && to) {
          to.reset().fadeIn(0.2).play();
          from.fadeOut(0.2);
          currentActionRef.current = desiredAction;
        }
      }
    } else if (player.isVaulting || player.isMantling) {
      if (currentActionRef.current !== 'Run' && actions['Run']) {
        actions['Run'].reset().fadeIn(0.15).play();
        if (actions[currentActionRef.current]) actions[currentActionRef.current].fadeOut(0.15);
        currentActionRef.current = 'Run';
      }
    }

    // 4. Procedural Skeletal Adjustments for Tactical Stances (Standing, Crouch, Prone, and ADS Aiming)
    if (!player.isDead && !player.isVaulting && !player.isMantling) {
      const cWeight = crouchT * (1.0 - proneT);
      const sWeight = (1.0 - crouchT) * (1.0 - proneT);

      // A. Real Military Tactical Combat Crouch:
      // Uses the exact anatomical standing pose as the reference:
      // Same foot placement + same leg direction -> knees bend forward -> hips lower downward
      if (cWeight > 0.005) {
        const applyLegCrouch = (
          upLeg: THREE.Bone | null,
          leg: THREE.Bone | null,
          foot: THREE.Bone | null
        ) => {
          if (!upLeg || !leg || !foot) return;

          upLeg.updateWorldMatrix(true, false);
          leg.updateWorldMatrix(true, false);
          foot.updateWorldMatrix(true, false);

          const pHip = new THREE.Vector3();
          const pKnee = new THREE.Vector3();
          const pFoot = new THREE.Vector3();
          upLeg.getWorldPosition(pHip);
          leg.getWorldPosition(pKnee);
          foot.getWorldPosition(pFoot);

          const vThigh = new THREE.Vector3().subVectors(pKnee, pHip);
          const vShin = new THREE.Vector3().subVectors(pFoot, pKnee);
          const hingeAxis = new THREE.Vector3().crossVectors(vThigh, vShin).normalize();

          if (hingeAxis.lengthSq() < 0.5) return;

          const rotBone = (bone: THREE.Bone, angle: number) => {
            const boneWorldQ = new THREE.Quaternion();
            bone.getWorldQuaternion(boneWorldQ);
            const parentWorldQ = new THREE.Quaternion();
            if (bone.parent) bone.parent.getWorldQuaternion(parentWorldQ);

            const deltaQ = new THREE.Quaternion().setFromAxisAngle(hingeAxis, angle * cWeight);
            const newBoneWorldQ = deltaQ.multiply(boneWorldQ);
            bone.quaternion.copy(parentWorldQ.invert().multiply(newBoneWorldQ));
          };

          // Natural anatomical crouch:
          // Thigh rotates forward, knee bends downward/backward, ankle flexes so foot remains planted flat
          rotBone(upLeg, -0.65);
          rotBone(leg, 1.30);
          rotBone(foot, -0.65);
        };

        applyLegCrouch(leftUpLegRef.current, leftLegRef.current, leftFootRef.current);
        applyLegCrouch(rightUpLegRef.current, rightLegRef.current, rightFootRef.current);

        // Torso balance with natural forward lean
        if (spineBone0Ref.current && leftShoulderRef.current && rightShoulderRef.current) {
          leftShoulderRef.current.updateWorldMatrix(true, false);
          rightShoulderRef.current.updateWorldMatrix(true, false);
          const pL = new THREE.Vector3(), pR = new THREE.Vector3();
          leftShoulderRef.current.getWorldPosition(pL);
          rightShoulderRef.current.getWorldPosition(pR);
          const shoulderAxis = new THREE.Vector3().subVectors(pL, pR).normalize();

          if (shoulderAxis.lengthSq() > 0.5) {
            const spinePitch = 0.22 + 0.12 * at; // 0.22 natural combat crouch, 0.34 when aiming
            const boneWorldQ = new THREE.Quaternion();
            spineBone0Ref.current.getWorldQuaternion(boneWorldQ);
            const parentWorldQ = new THREE.Quaternion();
            if (spineBone0Ref.current.parent) spineBone0Ref.current.parent.getWorldQuaternion(parentWorldQ);

            const deltaQ = new THREE.Quaternion().setFromAxisAngle(shoulderAxis, spinePitch * cWeight);
            const newBoneWorldQ = deltaQ.multiply(boneWorldQ);
            spineBone0Ref.current.quaternion.copy(parentWorldQ.invert().multiply(newBoneWorldQ));
          }
        }

        // Dedicated cheek weld in crouch aiming
        if (neckBoneRef.current && at > 0.01) {
          const crouchCheekWeld = baseNeckRef.current.clone().multiply(
            new THREE.Quaternion().setFromEuler(new THREE.Euler(-0.16 * at, 0.04 * at, 0.05 * at))
          );
          neckBoneRef.current.quaternion.slerp(crouchCheekWeld, cWeight * at);
        }
      }

      // B. Standing Combat Aim Pose (Reference Image 4):
      // Athletic shooting platform: forward spine lean, athletic knee flex, stable shoulder cheek weld
      if (sWeight > 0.05 && at > 0.005) {
        const standSpineRot = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), 0.14 * at);
        if (spineBone0Ref.current) {
          const target = baseSpine0Ref.current.clone().multiply(standSpineRot);
          spineBone0Ref.current.quaternion.slerp(target, sWeight * at);
        }

        // Subtle athletic knee flex for recoil bracing
        if (leftLegRef.current && rightLegRef.current) {
          const kneeFlex = baseLeftLegRef.current.clone().multiply(
            new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -0.10 * at)
          );
          leftLegRef.current.quaternion.slerp(kneeFlex, sWeight * at * 0.7);
          rightLegRef.current.quaternion.slerp(kneeFlex, sWeight * at * 0.7);
        }

        // Cheek weld on rifle buttstock
        if (neckBoneRef.current) {
          const standCheekWeld = baseNeckRef.current.clone().multiply(
            new THREE.Quaternion().setFromEuler(new THREE.Euler(-0.12 * at, 0.05 * at, 0.06 * at))
          );
          neckBoneRef.current.quaternion.slerp(standCheekWeld, sWeight * at);
        }
      }

      // C. Military Prone Pose & Crawl Kinematics (Anchored to base quaternions to prevent drift):
      // Soldier lies flat on stomach/chest with back facing up.
      // Legs extend backward, slightly apart (10 deg splay).
      // When crawling, coordinated military low-crawl (leopard crawl):
      // Alternate knee pushes outward against ground while opposite arm pulls forward.
      if (proneT > 0.005) {
        // Alert head lift so gaze stays oriented toward look/aim direction (higher when aiming)
        if (neckBoneRef.current) {
          const proneNeckPitch = THREE.MathUtils.lerp(-0.28, -0.36, at);
          const headLift = baseNeckRef.current.clone().multiply(
            new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), proneNeckPitch)
          );
          neckBoneRef.current.quaternion.slerp(headLift, proneT);
        }

        // Base prone leg splay (slightly apart, extending backward)
        const baseRSplay = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), 0.08);
        const baseLSplay = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), -0.08);

        if (isMoving && player.isProne) {
          // Continuous alternating low-crawl leg stroke
          const rPush = Math.max(0, Math.sin(crawlPhase));
          const lPush = Math.max(0, -Math.sin(crawlPhase));

          // Right leg push: thigh swings outward on Z, knee bends outward on Z against ground
          const rThighZ = 0.08 + rPush * 0.35;
          const rKneeZ = rPush * 0.25;

          // Left leg push: thigh swings outward on Z, knee bends outward on Z against ground
          const lThighZ = -0.08 - lPush * 0.35;
          const lKneeZ = -lPush * 0.25;

          if (rightUpLegRef.current) {
            const target = baseRightUpLegRef.current.clone().multiply(
              new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), rThighZ)
            );
            rightUpLegRef.current.quaternion.slerp(target, proneT * 0.85);
          }
          if (rightLegRef.current) {
            const target = baseRightLegRef.current.clone().multiply(
              new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), rKneeZ)
            );
            rightLegRef.current.quaternion.slerp(target, proneT * 0.85);
          }

          if (leftUpLegRef.current) {
            const target = baseLeftUpLegRef.current.clone().multiply(
              new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), lThighZ)
            );
            leftUpLegRef.current.quaternion.slerp(target, proneT * 0.85);
          }
          if (leftLegRef.current) {
            const target = baseLeftLegRef.current.clone().multiply(
              new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), lKneeZ)
            );
            leftLegRef.current.quaternion.slerp(target, proneT * 0.85);
          }
        } else {
          // Stationary prone: legs extend backward naturally resting on the ground
          if (rightUpLegRef.current) {
            const target = baseRightUpLegRef.current.clone().multiply(baseRSplay);
            rightUpLegRef.current.quaternion.slerp(target, proneT * 0.85);
          }
          if (rightLegRef.current) {
            rightLegRef.current.quaternion.slerp(baseRightLegRef.current, proneT * 0.85);
          }

          if (leftUpLegRef.current) {
            const target = baseLeftUpLegRef.current.clone().multiply(baseLSplay);
            leftUpLegRef.current.quaternion.slerp(target, proneT * 0.85);
          }
          if (leftLegRef.current) {
            leftLegRef.current.quaternion.slerp(baseLeftLegRef.current, proneT * 0.85);
          }
        }
      }
    }

    // 5. Procedural Arm Posing (Wall Mantle vs Vaulting vs Stance x Aim Matrix vs Prone Support)
    if (player.isMantling && !player.isDead) {
      const mp = player.mantleProgress ?? 0;

      // Realistic 4-Phase Wall Climb & Mantle Posing:
      // Phase 1 (0-25%): High Reach - Both hands leap up to grab top edge
      // Phase 2 (25-40%): Firm Grip & Hang - Hands hold edge, biceps engage
      // Phase 3 (40-75%): Pull-Up & Muscle Over - Arms push down, chest crests wall
      // Phase 4 (75-100%): Step Over & Land - Hands release, brace for ground contact
      let rArmX = 2.25, rArmY = -0.25, rArmZ = 0.15;
      let lArmX = 2.25, lArmY = 0.25, lArmZ = -0.15;
      let rForeArmX = 0.30, lForeArmX = 0.30;
      let rHandX = 0.85, lHandX = 0.85;

      if (mp < 0.25) {
        // Leaping & reaching for the top lip
        rArmX = 2.35; lArmX = 2.35;
        rForeArmX = 0.25; lForeArmX = 0.25;
      } else if (mp < 0.40) {
        // Holding edge firmly
        rArmX = 2.10; lArmX = 2.10;
        rForeArmX = 0.65; lForeArmX = 0.65;
      } else if (mp < 0.75) {
        // Pressing down onto wall surface to hoist chest up
        rArmX = 1.15; lArmX = 1.15;
        rArmY = -0.38; lArmY = 0.38;
        rForeArmX = 1.10; lForeArmX = 1.10;
        rHandX = 0.50; lHandX = 0.50;
      } else {
        // Releasing edge and preparing for landing
        rArmX = 0.95; lArmX = 0.95;
        rForeArmX = 0.55; lForeArmX = 0.55;
        rHandX = 0.30; lHandX = 0.30;
      }

      const rightArmMantle = new THREE.Quaternion().setFromEuler(new THREE.Euler(rArmX, rArmY, rArmZ));
      const rightForeArmMantle = new THREE.Quaternion().setFromEuler(new THREE.Euler(rForeArmX, 0.1, -0.05));
      const rightHandMantle = new THREE.Quaternion().setFromEuler(new THREE.Euler(rHandX, -0.1, 0.05));

      const leftShoulderMantle = new THREE.Quaternion().setFromEuler(new THREE.Euler(0.25, 0.12, -0.1));
      const leftArmMantle = new THREE.Quaternion().setFromEuler(new THREE.Euler(lArmX, lArmY, lArmZ));
      const leftForeArmMantle = new THREE.Quaternion().setFromEuler(new THREE.Euler(lForeArmX, -0.1, 0.05));
      const leftHandMantle = new THREE.Quaternion().setFromEuler(new THREE.Euler(lHandX, 0.1, -0.05));

      if (rightArmRef.current) rightArmRef.current.quaternion.slerp(rightArmMantle, 0.88);
      if (rightForeArmRef.current) rightForeArmRef.current.quaternion.slerp(rightForeArmMantle, 0.88);
      if (rightHandRef.current) rightHandRef.current.quaternion.slerp(rightHandMantle, 0.88);

      if (leftShoulderRef.current) leftShoulderRef.current.quaternion.slerp(leftShoulderMantle, 0.88);
      if (leftArmRef.current) leftArmRef.current.quaternion.slerp(leftArmMantle, 0.88);
      if (leftForeArmRef.current) leftForeArmRef.current.quaternion.slerp(leftForeArmMantle, 0.88);
      if (leftHandRef.current) leftHandRef.current.quaternion.slerp(leftHandMantle, 0.88);

      // Leg kinematics: tuck right knee high during pull-up to clear wall
      if (mp >= 0.35 && mp < 0.80) {
        const pullProgress = (mp - 0.35) / 0.45;
        const tuckAmt = Math.sin(pullProgress * Math.PI);
        const rThighRot = new THREE.Quaternion().setFromEuler(new THREE.Euler(-0.95 * tuckAmt, -0.1, 0.15 * tuckAmt));
        const rKneeRot = new THREE.Quaternion().setFromEuler(new THREE.Euler(1.45 * tuckAmt, 0, 0));
        if (rightUpLegRef.current) rightUpLegRef.current.quaternion.slerp(rThighRot, 0.75);
        if (rightLegRef.current) rightLegRef.current.quaternion.slerp(rKneeRot, 0.75);
      }
    } else if (player.isVaulting && !player.isDead) {
      // Both hands reach forward and press onto the top edge of the obstacle to pull body upward
      const rightArmVault = new THREE.Quaternion().setFromEuler(new THREE.Euler(1.65, -0.35, 0.15));
      const rightForeArmVault = new THREE.Quaternion().setFromEuler(new THREE.Euler(0.45, 0.1, -0.1));
      const rightHandVault = new THREE.Quaternion().setFromEuler(new THREE.Euler(0.7, -0.15, 0.1));

      const leftShoulderVault = new THREE.Quaternion().setFromEuler(new THREE.Euler(0.2, 0.15, -0.1));
      const leftArmVault = new THREE.Quaternion().setFromEuler(new THREE.Euler(1.65, 0.35, -0.15));
      const leftForeArmVault = new THREE.Quaternion().setFromEuler(new THREE.Euler(0.45, -0.1, 0.1));
      const leftHandVault = new THREE.Quaternion().setFromEuler(new THREE.Euler(0.7, 0.15, -0.1));

      if (rightArmRef.current) rightArmRef.current.quaternion.slerp(rightArmVault, 0.85);
      if (rightForeArmRef.current) rightForeArmRef.current.quaternion.slerp(rightForeArmVault, 0.85);
      if (rightHandRef.current) rightHandRef.current.quaternion.slerp(rightHandVault, 0.85);

      if (leftShoulderRef.current) leftShoulderRef.current.quaternion.slerp(leftShoulderVault, 0.85);
      if (leftArmRef.current) leftArmRef.current.quaternion.slerp(leftArmVault, 0.85);
      if (leftForeArmRef.current) leftForeArmRef.current.quaternion.slerp(leftForeArmVault, 0.85);
      if (leftHandRef.current) leftHandRef.current.quaternion.slerp(leftHandVault, 0.85);
    } else if (tArms > 0.002 && !player.isDead) {
      // Weapon Ready Arm Posing: Dedicated Stance x Aim Matrix
      const isProneArmed = proneT > 0.1;
      const crawlArmShuffle = isProneArmed && isMoving ? Math.sin(crawlPhase) * 0.10 * proneT : 0;

      // 1. Standing: blend between Low-Ready (Reference Image 2) and Standing-Aim (Reference Image 4) by `at`
      const stand_rArmX = THREE.MathUtils.lerp(0.95, 1.52, at);
      const stand_rArmY = THREE.MathUtils.lerp(-0.42, -0.82, at);
      const stand_rArmZ = THREE.MathUtils.lerp(-0.10, 0.06, at);

      const stand_rForeArmX = THREE.MathUtils.lerp(1.26, 0.96, at);
      const stand_rForeArmY = THREE.MathUtils.lerp(0.46, 0.58, at);
      const stand_rForeArmZ = THREE.MathUtils.lerp(-0.04, -0.05, at);

      const stand_lShoulderX = THREE.MathUtils.lerp(0.35, 0.85, at);
      const stand_lShoulderY = THREE.MathUtils.lerp(0.40, 0.95, at);
      const stand_lShoulderZ = THREE.MathUtils.lerp(0.15, 0.45, at);

      const stand_lArmX = THREE.MathUtils.lerp(-0.20, -0.62, at);
      const stand_lArmY = THREE.MathUtils.lerp(0.80, 1.15, at);
      const stand_lArmZ = THREE.MathUtils.lerp(0.50, 0.72, at);

      const stand_lForeArmX = THREE.MathUtils.lerp(0.35, -0.18, at);
      const stand_lForeArmY = THREE.MathUtils.lerp(-1.05, -1.42, at);
      const stand_lForeArmZ = THREE.MathUtils.lerp(-0.35, -0.18, at);

      // 2. Crouch: blend between Crouch-Low-Ready (Reference Image 3) and Crouch-Aim (Reference Image 5) by `at`
      const crouch_rArmX = THREE.MathUtils.lerp(0.90, 1.50, at);
      const crouch_rArmY = THREE.MathUtils.lerp(-0.38, -0.80, at);
      const crouch_rArmZ = THREE.MathUtils.lerp(-0.08, 0.08, at);

      const crouch_rForeArmX = THREE.MathUtils.lerp(1.22, 0.95, at);
      const crouch_rForeArmY = THREE.MathUtils.lerp(0.42, 0.55, at);
      const crouch_rForeArmZ = THREE.MathUtils.lerp(-0.04, -0.05, at);

      const crouch_lShoulderX = THREE.MathUtils.lerp(0.30, 0.88, at);
      const crouch_lShoulderY = THREE.MathUtils.lerp(0.35, 0.98, at);
      const crouch_lShoulderZ = THREE.MathUtils.lerp(0.12, 0.48, at);

      const crouch_lArmX = THREE.MathUtils.lerp(-0.16, -0.60, at);
      const crouch_lArmY = THREE.MathUtils.lerp(0.75, 1.12, at);
      const crouch_lArmZ = THREE.MathUtils.lerp(0.46, 0.70, at);

      const crouch_lForeArmX = THREE.MathUtils.lerp(0.32, -0.16, at);
      const crouch_lForeArmY = THREE.MathUtils.lerp(-1.02, -1.40, at);
      const crouch_lForeArmZ = THREE.MathUtils.lerp(-0.32, -0.16, at);

      // 3. Upright: blend between Standing and Crouch with `crouchT`
      const upright_rArmX = THREE.MathUtils.lerp(stand_rArmX, crouch_rArmX, crouchT);
      const upright_rArmY = THREE.MathUtils.lerp(stand_rArmY, crouch_rArmY, crouchT);
      const upright_rArmZ = THREE.MathUtils.lerp(stand_rArmZ, crouch_rArmZ, crouchT);

      const upright_rForeArmX = THREE.MathUtils.lerp(stand_rForeArmX, crouch_rForeArmX, crouchT);
      const upright_rForeArmY = THREE.MathUtils.lerp(stand_rForeArmY, crouch_rForeArmY, crouchT);
      const upright_rForeArmZ = THREE.MathUtils.lerp(stand_rForeArmZ, crouch_rForeArmZ, crouchT);

      const upright_lShoulderX = THREE.MathUtils.lerp(stand_lShoulderX, crouch_lShoulderX, crouchT);
      const upright_lShoulderY = THREE.MathUtils.lerp(stand_lShoulderY, crouch_lShoulderY, crouchT);
      const upright_lShoulderZ = THREE.MathUtils.lerp(stand_lShoulderZ, crouch_lShoulderZ, crouchT);

      const upright_lArmX = THREE.MathUtils.lerp(stand_lArmX, crouch_lArmX, crouchT);
      const upright_lArmY = THREE.MathUtils.lerp(stand_lArmY, crouch_lArmY, crouchT);
      const upright_lArmZ = THREE.MathUtils.lerp(stand_lArmZ, crouch_lArmZ, crouchT);

      const upright_lForeArmX = THREE.MathUtils.lerp(stand_lForeArmX, crouch_lForeArmX, crouchT);
      const upright_lForeArmY = THREE.MathUtils.lerp(stand_lForeArmY, crouch_lForeArmY, crouchT);
      const upright_lForeArmZ = THREE.MathUtils.lerp(stand_lForeArmZ, crouch_lForeArmZ, crouchT);

      // 4. Prone Armed: elbows support on ground, weapon cradled above ground
      const prone_rArmX = THREE.MathUtils.lerp(1.42, 1.46, at) + crawlArmShuffle;
      const prone_rArmY = THREE.MathUtils.lerp(-0.85, -0.82, at);
      const prone_rArmZ = THREE.MathUtils.lerp(0.02, 0.04, at);

      const prone_rForeArmX = THREE.MathUtils.lerp(1.02, 1.04, at);
      const prone_rForeArmY = THREE.MathUtils.lerp(0.60, 0.56, at);
      const prone_rForeArmZ = THREE.MathUtils.lerp(-0.06, -0.05, at);

      const prone_lShoulderX = 0.95;
      const prone_lShoulderY = 1.05;
      const prone_lShoulderZ = 0.50;

      const prone_lArmX = THREE.MathUtils.lerp(-0.55, -0.56, at) - crawlArmShuffle;
      const prone_lArmY = THREE.MathUtils.lerp(1.05, 1.06, at);
      const prone_lArmZ = THREE.MathUtils.lerp(0.65, 0.68, at);

      const prone_lForeArmX = THREE.MathUtils.lerp(0.85, 0.88, at);
      const prone_lForeArmY = THREE.MathUtils.lerp(-0.20, -0.22, at);
      const prone_lForeArmZ = THREE.MathUtils.lerp(-1.30, -1.28, at);

      // 5. Final continuous blend between Upright and Prone with `proneT`
      const final_rArmX = THREE.MathUtils.lerp(upright_rArmX, prone_rArmX, proneT);
      const final_rArmY = THREE.MathUtils.lerp(upright_rArmY, prone_rArmY, proneT);
      const final_rArmZ = THREE.MathUtils.lerp(upright_rArmZ, prone_rArmZ, proneT);

      const final_rForeArmX = THREE.MathUtils.lerp(upright_rForeArmX, prone_rForeArmX, proneT);
      const final_rForeArmY = THREE.MathUtils.lerp(upright_rForeArmY, prone_rForeArmY, proneT);
      const final_rForeArmZ = THREE.MathUtils.lerp(upright_rForeArmZ, prone_rForeArmZ, proneT);

      const final_lShoulderX = THREE.MathUtils.lerp(upright_lShoulderX, prone_lShoulderX, proneT);
      const final_lShoulderY = THREE.MathUtils.lerp(upright_lShoulderY, prone_lShoulderY, proneT);
      const final_lShoulderZ = THREE.MathUtils.lerp(upright_lShoulderZ, prone_lShoulderZ, proneT);

      const final_lArmX = THREE.MathUtils.lerp(upright_lArmX, prone_lArmX, proneT);
      const final_lArmY = THREE.MathUtils.lerp(upright_lArmY, prone_lArmY, proneT);
      const final_lArmZ = THREE.MathUtils.lerp(upright_lArmZ, prone_lArmZ, proneT);

      const final_lForeArmX = THREE.MathUtils.lerp(upright_lForeArmX, prone_lForeArmX, proneT);
      const final_lForeArmY = THREE.MathUtils.lerp(upright_lForeArmY, prone_lForeArmY, proneT);
      const final_lForeArmZ = THREE.MathUtils.lerp(upright_lForeArmZ, prone_lForeArmZ, proneT);

      const rightArmTarget = new THREE.Quaternion().setFromEuler(
        new THREE.Euler(final_rArmX, final_rArmY, final_rArmZ)
      );
      const rightForeArmTarget = new THREE.Quaternion().setFromEuler(
        new THREE.Euler(final_rForeArmX, final_rForeArmY, final_rForeArmZ)
      );
      const rightHandTarget = new THREE.Quaternion().setFromEuler(
        new THREE.Euler(0.12, -0.18, 0.12)
      );

      const leftShoulderTarget = new THREE.Quaternion().setFromEuler(
        new THREE.Euler(final_lShoulderX, final_lShoulderY, final_lShoulderZ)
      );
      const leftArmTarget = new THREE.Quaternion().setFromEuler(
        new THREE.Euler(final_lArmX, final_lArmY, final_lArmZ)
      );
      const leftForeArmTarget = new THREE.Quaternion().setFromEuler(
        new THREE.Euler(final_lForeArmX, final_lForeArmY, final_lForeArmZ)
      );
      const leftHandTarget = new THREE.Quaternion().setFromEuler(
        new THREE.Euler(-0.12, 0.22, -0.18)
      );

      // Right shoulder tucks back into buttstock pocket when aiming
      if (rightShoulderRef.current && at > 0.01) {
        const rShoulderPocket = baseRightShoulderRef.current.clone().multiply(
          new THREE.Quaternion().setFromEuler(new THREE.Euler(0.08 * at, -0.12 * at, 0.06 * at))
        );
        rightShoulderRef.current.quaternion.slerp(rShoulderPocket, tArms * (1.0 - proneT) * at);
      }

      if (rightArmRef.current) rightArmRef.current.quaternion.slerp(rightArmTarget, tArms);
      if (rightForeArmRef.current) rightForeArmRef.current.quaternion.slerp(rightForeArmTarget, tArms);
      if (rightHandRef.current) rightHandRef.current.quaternion.slerp(rightHandTarget, tArms);

      if (leftShoulderRef.current) leftShoulderRef.current.quaternion.slerp(leftShoulderTarget, tArms);
      if (leftArmRef.current) leftArmRef.current.quaternion.slerp(leftArmTarget, tArms);
      if (leftForeArmRef.current) leftForeArmRef.current.quaternion.slerp(leftForeArmTarget, tArms);
      if (leftHandRef.current) leftHandRef.current.quaternion.slerp(leftHandTarget, tArms);
    } else if (proneT > 0.05 && !player.isDead) {
      // Unarmed Prone: forearms positioned forward on ground supporting upper body
      // When crawling forward: alternating crawl stroke (contralateral pull)
      const rPull = isMoving ? Math.max(0, -Math.sin(crawlPhase)) * 0.22 * proneT : 0;
      const lPull = isMoving ? Math.max(0, Math.sin(crawlPhase)) * 0.22 * proneT : 0;

      const rArmProne = new THREE.Quaternion().setFromEuler(new THREE.Euler(1.25 + rPull, -0.25, 0.15));
      const rForeArmProne = new THREE.Quaternion().setFromEuler(new THREE.Euler(0.70, 0.15, -0.10));
      const rHandProne = new THREE.Quaternion().setFromEuler(new THREE.Euler(0.20, -0.10, 0.05));

      const lShoulderProne = new THREE.Quaternion().setFromEuler(new THREE.Euler(0.15, 0.10, -0.05));
      const lArmProne = new THREE.Quaternion().setFromEuler(new THREE.Euler(1.25 + lPull, 0.25, -0.15));
      const lForeArmProne = new THREE.Quaternion().setFromEuler(new THREE.Euler(0.70, -0.15, 0.10));
      const lHandProne = new THREE.Quaternion().setFromEuler(new THREE.Euler(0.20, 0.10, -0.05));

      if (rightArmRef.current) rightArmRef.current.quaternion.slerp(rArmProne, proneT * 0.85);
      if (rightForeArmRef.current) rightForeArmRef.current.quaternion.slerp(rForeArmProne, proneT * 0.85);
      if (rightHandRef.current) rightHandRef.current.quaternion.slerp(rHandProne, proneT * 0.85);

      if (leftShoulderRef.current) leftShoulderRef.current.quaternion.slerp(lShoulderProne, proneT * 0.85);
      if (leftArmRef.current) leftArmRef.current.quaternion.slerp(lArmProne, proneT * 0.85);
      if (leftForeArmRef.current) leftForeArmRef.current.quaternion.slerp(lForeArmProne, proneT * 0.85);
      if (leftHandRef.current) leftHandRef.current.quaternion.slerp(lHandProne, proneT * 0.85);
    }

    // 7. Smooth Weapon Socket Interpolation for Slot 1 and Slot 2
    if (spineBoneRef.current) {
      backMount1.updateWorldMatrix(true, false);
      backMount2.updateWorldMatrix(true, false);

      const backPos1 = new THREE.Vector3();
      const backQuat1 = new THREE.Quaternion();
      backMount1.getWorldPosition(backPos1);
      backMount1.getWorldQuaternion(backQuat1);

      const backPos2 = new THREE.Vector3();
      const backQuat2 = new THREE.Quaternion();
      backMount2.getWorldPosition(backPos2);
      backMount2.getWorldQuaternion(backQuat2);

      // In READY state: weapon transform is calculated directly from the two hands
      let readyPos = backPos1;
      let readyQuat = backQuat1;

      if (rightHandRef.current && leftHandRef.current) {
        rightHandRef.current.updateWorldMatrix(true, false);
        leftHandRef.current.updateWorldMatrix(true, false);

        const rHandWorld = new THREE.Vector3();
        const lHandWorld = new THREE.Vector3();
        rightHandRef.current.getWorldPosition(rHandWorld);
        leftHandRef.current.getWorldPosition(lHandWorld);

        readyPos = rHandWorld;

        // Player forward heading vector
        const playerHeading = new THREE.Vector3(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), player.rotationY);

        // Relaxed Low-Ready Forward (points forward and ~22 deg down across the waist/lap)
        const lowReadyForward = playerHeading.clone().addScaledVector(new THREE.Vector3(0, -1, 0), 0.36).normalize();
        const proneLowReady = playerHeading.clone();
        const effectiveLowReady = proneT > 0.4 ? proneLowReady : lowReadyForward;

        // Authoritative Aim Direction toward Screen-Center Camera Aim Target
        let aimTargetForward: THREE.Vector3;
        if (player.aimTarget) {
          const targetVec = new THREE.Vector3(...player.aimTarget);
          aimTargetForward = new THREE.Vector3().subVectors(targetVec, readyPos).normalize();
        } else {
          aimTargetForward = playerHeading.clone();
        }

        // Smooth continuous transition from Low-Ready carry to ADS Aim Target
        const aimFactor = Math.max(at, player.isFiring ? 1.0 : 0.0);
        const weaponForward = new THREE.Vector3().lerpVectors(effectiveLowReady, aimTargetForward, aimFactor).normalize();

        const worldUp = new THREE.Vector3(0, 1, 0);
        const weaponRight = new THREE.Vector3().crossVectors(worldUp, weaponForward).normalize();
        const weaponUp = new THREE.Vector3().crossVectors(weaponForward, weaponRight).normalize();

        const readyMat = new THREE.Matrix4().makeBasis(weaponRight, weaponUp, weaponForward);
        readyQuat = new THREE.Quaternion().setFromRotationMatrix(readyMat);

        // Record exact world muzzle position for authoritative bullet tracer origin (0.67m down barrel)
        const muzzlePos = new THREE.Vector3().copy(readyPos).addScaledVector(weaponForward, 0.67);
        player.muzzlePos = [muzzlePos.x, muzzlePos.y, muzzlePos.z];
      }

      // Slot 1 weapon positioning: backMount1 <-> ready hands
      if (weaponSocket1Ref.current) {
        weaponSocket1Ref.current.position.lerpVectors(backPos1, readyPos, t1);
        weaponSocket1Ref.current.quaternion.slerpQuaternions(backQuat1, readyQuat, t1);
      }

      // Slot 2 weapon positioning: backMount2 <-> ready hands
      if (weaponSocket2Ref.current) {
        weaponSocket2Ref.current.position.lerpVectors(backPos2, readyPos, t2);
        weaponSocket2Ref.current.quaternion.slerpQuaternions(backQuat2, readyQuat, t2);
      }
    }
  });

  const slot1Def = player.inventory.slot1 ? WEAPON_SPAWNS[player.inventory.slot1] : null;
  const slot2Def = player.inventory.slot2 ? WEAPON_SPAWNS[player.inventory.slot2] : null;

  // Visual health percentage
  const hpPercent = Math.max(0, Math.min(100, (player.health / 100) * 100));
  const hpColor =
    hpPercent > 60 ? '#10b981' : hpPercent > 30 ? '#f59e0b' : '#ef4444';

  return (
    <>
      {/* 3D Root Group physically positioned and rotated every frame */}
      <group ref={rootGroupRef}>
        {/* Character mesh assembly - rotated Math.PI so back faces camera */}
        <group ref={characterGroupRef} rotation={[0, Math.PI, 0]}>
          <primitive
            object={cloned}
            scale={[1.0, 1.0, 1.0]}
            position={[0, 0, 0]}
          />
        </group>

        {/* Compact Tactical Overhead Health Indicator */}
        <Html
          position={[0, player.isDead ? 0.35 : player.isProne ? 0.65 : player.isCrouching ? 1.5 : 2.05, 0]}
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

useGLTF.preload('/models/Soldier.glb');
