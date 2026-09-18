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
      if (name === 'mixamorigRightShoulder') rightShoulderRef.current = node as THREE.Bone;
      if (name === 'mixamorigRightArm') rightArmRef.current = node as THREE.Bone;
      if (name === 'mixamorigRightForeArm') rightForeArmRef.current = node as THREE.Bone;
      if (name === 'mixamorigRightHand') rightHandRef.current = node as THREE.Bone;

      if (name === 'mixamorigLeftShoulder') leftShoulderRef.current = node as THREE.Bone;
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

  // Per-frame animation cross-fading, arm posing, and weapon socket tracking
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

    if (characterGroupRef.current) {
      // Smooth death ragdoll fall
      if (player.isDead) {
        characterGroupRef.current.rotation.x = THREE.MathUtils.lerp(
          characterGroupRef.current.rotation.x,
          -Math.PI / 2,
          delta * 8
        );
        characterGroupRef.current.position.y = THREE.MathUtils.lerp(
          characterGroupRef.current.position.y,
          0.15,
          delta * 6
        );
      } else {
        characterGroupRef.current.rotation.x = 0;
        characterGroupRef.current.position.y = 0;

        // Calculate velocity for animation blending
        const currentPos = new THREE.Vector3(...player.position);
        const distMoved = currentPos.distanceTo(prevPosRef.current);
        prevPosRef.current.copy(currentPos);

        const speed = distMoved / (delta || 0.016);
        let desiredAction = 'Idle';

        if (player.isSprinting && speed > 1.0) {
          desiredAction = 'Run';
        } else if (speed > 0.3) {
          desiredAction = 'Walk';
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
      }
    }

    // 2. Smooth weapon state transition and ADS aiming interpolation
    const isSlot1Ready = player.activeSlot === 1 && player.weaponState === 'ready' && !player.isDead;
    const isSlot2Ready = player.activeSlot === 2 && player.weaponState === 'ready' && !player.isDead;

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

    // 3. Procedural Two-Handed Tactical Combat Arm Posing
    // When either weapon is in or transitioning to READY (tArms > 0), blend arm bones
    if (tArms > 0.002 && !player.isDead) {
      // Right Arm (Pistol Grip / Trigger): stock against right shoulder, hand firmly on pistol grip & trigger
      const rightArmTarget = new THREE.Quaternion().setFromEuler(
        new THREE.Euler(
          THREE.MathUtils.lerp(1.375, 1.48, at),
          THREE.MathUtils.lerp(-0.911, -0.85, at),
          THREE.MathUtils.lerp(-0.041, 0.05, at)
        )
      );
      const rightForeArmTarget = new THREE.Quaternion().setFromEuler(
        new THREE.Euler(
          THREE.MathUtils.lerp(1.001, 1.15, at),
          THREE.MathUtils.lerp(0.645, 0.60, at),
          THREE.MathUtils.lerp(-0.064, -0.10, at)
        )
      );
      const rightHandTarget = new THREE.Quaternion().setFromEuler(
        new THREE.Euler(0.15, -0.20, 0.15)
      );

      // Left Arm (Foregrip / Handguard): reaches forward across upper torso, cradles foregrip
      const leftShoulderTarget = new THREE.Quaternion().setFromEuler(
        new THREE.Euler(
          THREE.MathUtils.lerp(0.988, 1.05, at),
          THREE.MathUtils.lerp(1.129, 1.10, at),
          THREE.MathUtils.lerp(0.558, 0.50, at)
        )
      );
      const leftArmTarget = new THREE.Quaternion().setFromEuler(
        new THREE.Euler(
          THREE.MathUtils.lerp(-0.618, -0.55, at),
          THREE.MathUtils.lerp(1.111, 1.05, at),
          THREE.MathUtils.lerp(0.771, 0.70, at)
        )
      );
      const leftForeArmTarget = new THREE.Quaternion().setFromEuler(
        new THREE.Euler(
          THREE.MathUtils.lerp(-0.158, -0.10, at),
          THREE.MathUtils.lerp(-1.432, -1.38, at),
          THREE.MathUtils.lerp(-0.177, -0.15, at)
        )
      );
      const leftHandTarget = new THREE.Quaternion().setFromEuler(
        new THREE.Euler(-0.15, 0.25, -0.20)
      );

      if (rightArmRef.current) rightArmRef.current.quaternion.slerp(rightArmTarget, tArms);
      if (rightForeArmRef.current) rightForeArmRef.current.quaternion.slerp(rightForeArmTarget, tArms);
      if (rightHandRef.current) rightHandRef.current.quaternion.slerp(rightHandTarget, tArms);

      if (leftShoulderRef.current) leftShoulderRef.current.quaternion.slerp(leftShoulderTarget, tArms);
      if (leftArmRef.current) leftArmRef.current.quaternion.slerp(leftArmTarget, tArms);
      if (leftForeArmRef.current) leftForeArmRef.current.quaternion.slerp(leftForeArmTarget, tArms);
      if (leftHandRef.current) leftHandRef.current.quaternion.slerp(leftHandTarget, tArms);
    }

    // 4. Smooth Weapon Socket Interpolation for Slot 1 and Slot 2
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

        // Authoritative Aim Direction toward Screen-Center Camera Aim Target
        let weaponForward: THREE.Vector3;
        if (player.aimTarget) {
          const targetVec = new THREE.Vector3(...player.aimTarget);
          weaponForward = new THREE.Vector3().subVectors(targetVec, readyPos).normalize();
        } else {
          weaponForward = new THREE.Vector3().subVectors(lHandWorld, rHandWorld).normalize();
        }

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
            scale={[1.0, player.isCrouching ? 0.72 : 1.0, 1.0]}
            position={[0, 0, 0]}
          />
        </group>

        {/* Compact Tactical Overhead Health Indicator */}
        <Html
          position={[0, player.isDead ? 0.35 : player.isCrouching ? 1.5 : 2.05, 0]}
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
