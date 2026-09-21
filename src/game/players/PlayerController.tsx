import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import {
  PLAYER_WALK_SPEED,
  PLAYER_SPRINT_SPEED,
  PLAYER_CROUCH_SPEED,
  PLAYER_PRONE_SPEED,
  PLAYER_JUMP_FORCE,
  GRAVITY,
  PICKUP_DISTANCE,
  PLAYER_RADIUS,
  PLAYER_HEIGHT,
  PLAYER_CROUCH_HEIGHT,
  PLAYER_PRONE_HEIGHT,
  MAX_STEP_HEIGHT,
  WEAPON_SPAWNS,
  WEAPON_DAMAGE,
} from '../../config/constants';
import { CollisionWorld, VaultTarget } from '../collision/CollisionWorld';
import { PlayerId, WeaponId } from '../../types/game';
import { gameState } from '../../systems/gameState';
import { soundManager } from '../../systems/sound';
import { RaycastCombatSystem } from '../combat/RaycastSystem';
import { inputManager } from '../input/InputManager';

interface PlayerControllerProps {
  activeId: PlayerId;
  onNearWeaponChange: (weaponId: WeaponId | null, weaponName: string | null) => void;
}

export const PlayerController: React.FC<PlayerControllerProps> = ({
  activeId,
  onNearWeaponChange,
}) => {
  const { camera, gl } = useThree();

  // Orientation refs
  const yawRef = useRef<number>(activeId === 'player1' ? 0 : Math.PI);
  const pitchRef = useRef<number>(0);
  const recoilPitchRef = useRef<number>(0);
  const recoilYawRef = useRef<number>(0);

  // Velocity & physics state
  const velocity = useRef(new THREE.Vector3());
  const verticalVelocity = useRef<number>(0);
  const isGrounded = useRef<boolean>(true);
  const wasInAir = useRef<boolean>(false);
  const landingDipRef = useRef<number>(0);

  // Head bob & animation timers
  const bobTimeRef = useRef<number>(0);

  // Cooldown timers & toggle debounces
  const lastShotTimeRef = useRef<number>(0);
  const firingTimeoutRef = useRef<number | null>(null);
  const toggleHolsterPressedRef = useRef<boolean>(false);
  const crouchPressedRef = useRef<boolean>(false);
  const pronePressedRef = useRef<boolean>(false);
  const stanceRef = useRef<'standing' | 'crouching' | 'prone' | 'vaulting' | 'mantling'>('standing');
  const vaultTargetRef = useRef<VaultTarget | null>(null);
  const vaultTimeRef = useRef<number>(0);

  // Smooth camera tracking
  const currentCamPos = useRef(new THREE.Vector3());
  const currentLookAt = useRef(new THREE.Vector3());

  // Initialize InputManager with canvas
  useEffect(() => {
    const canvas = gl.domElement;
    inputManager.init(canvas);

    return () => {
      if (firingTimeoutRef.current) clearTimeout(firingTimeoutRef.current);
    };
  }, [gl]);

  // Sync orientation when active player changes
  useEffect(() => {
    const p = gameState.players[activeId];
    if (p) {
      yawRef.current = p.rotationY;
    }
  }, [activeId]);

  // Main 60FPS tactical movement, physics, combat & camera loop
  useFrame((_, delta) => {
    const player = gameState.players[activeId];
    if (!player) return;

    const input = inputManager.state;
    const { deltaX, deltaY } = inputManager.consumeMouseDelta();

    // 1. MOUSE CAMERA ROTATION
    const isAiming = input.aim && !player.isDead && player.weaponState === 'ready';
    const sensitivity = isAiming ? 0.0016 : 0.0024;

    yawRef.current -= deltaX * sensitivity;
    pitchRef.current -= deltaY * sensitivity;

    // Clamp vertical camera pitch between -70° and +70°
    pitchRef.current = Math.max(-1.22, Math.min(1.22, pitchRef.current));

    // Smooth recoil recovery (critically damped return to center)
    if (Math.abs(recoilPitchRef.current) > 0.0001) {
      recoilPitchRef.current = THREE.MathUtils.damp(recoilPitchRef.current, 0, 8.5, delta);
    } else {
      recoilPitchRef.current = 0;
    }

    if (Math.abs(recoilYawRef.current) > 0.0001) {
      recoilYawRef.current = THREE.MathUtils.damp(recoilYawRef.current, 0, 10.0, delta);
    } else {
      recoilYawRef.current = 0;
    }

    // Landing camera dip recovery
    if (landingDipRef.current > 0.001) {
      landingDipRef.current = THREE.MathUtils.lerp(landingDipRef.current, 0, delta * 12);
    } else {
      landingDipRef.current = 0;
    }

    // 2. WEAPON TOGGLE HOLSTER [Q], RELOAD [R] & SLOT SWITCHING
    if (input.toggleHolster && player.equippedWeapon && !player.isDead) {
      if (!toggleHolsterPressedRef.current) {
        toggleHolsterPressedRef.current = true;
        gameState.toggleWeaponState(activeId);
      }
    } else if (!input.toggleHolster) {
      toggleHolsterPressedRef.current = false;
    }

    if (input.reload && player.equippedWeapon && !player.isReloading && !player.isDead && player.weaponState === 'ready') {
      gameState.reload(activeId);
    }

    if (input.slot1 && player.inventory.slot1 && player.activeSlot !== 1 && !player.isDead) {
      gameState.switchSlot(activeId, 1);
    }

    if (input.slot2 && player.inventory.slot2 && player.activeSlot !== 2 && !player.isDead) {
      gameState.switchSlot(activeId, 2);
    }

    // 3. CAMERA DIRECTION VECTORS
    const cameraForward = new THREE.Vector3();
    camera.getWorldDirection(cameraForward);
    cameraForward.y = 0;
    cameraForward.normalize();

    const worldUp = new THREE.Vector3(0, 1, 0);
    const cameraRight = new THREE.Vector3().crossVectors(cameraForward, worldUp).normalize();

    // 4. STANCE TRANSITION STATE MACHINE (STANDING ↔ CROUCHING ↔ PRONE)
    if (!player.isDead && gameState.matchState.status === 'playing' && stanceRef.current !== 'vaulting') {
      // Toggle / Hold Crouch (Key C or Control)
      if (input.crouch && !crouchPressedRef.current) {
        crouchPressedRef.current = true;
        if (stanceRef.current === 'standing') {
          stanceRef.current = 'crouching';
        } else if (stanceRef.current === 'crouching') {
          // Check overhead clearance before rising to standing
          if (CollisionWorld.hasVerticalClearance(player.position[0], player.position[1], player.position[2], PLAYER_HEIGHT, PLAYER_CROUCH_HEIGHT)) {
            stanceRef.current = 'standing';
          }
        } else if (stanceRef.current === 'prone') {
          // Check overhead clearance before rising to crouching
          if (CollisionWorld.hasVerticalClearance(player.position[0], player.position[1], player.position[2], PLAYER_CROUCH_HEIGHT, PLAYER_PRONE_HEIGHT)) {
            stanceRef.current = 'crouching';
          }
        }
      } else if (!input.crouch) {
        crouchPressedRef.current = false;
      }

      // Toggle Prone (Key Z)
      if (input.prone && !pronePressedRef.current) {
        pronePressedRef.current = true;
        if (stanceRef.current === 'prone') {
          // Check overhead clearance to rise to standing or crouching
          if (CollisionWorld.hasVerticalClearance(player.position[0], player.position[1], player.position[2], PLAYER_HEIGHT, PLAYER_PRONE_HEIGHT)) {
            stanceRef.current = 'standing';
          } else if (CollisionWorld.hasVerticalClearance(player.position[0], player.position[1], player.position[2], PLAYER_CROUCH_HEIGHT, PLAYER_PRONE_HEIGHT)) {
            stanceRef.current = 'crouching';
          }
        } else {
          stanceRef.current = 'prone';
        }
      } else if (!input.prone) {
        pronePressedRef.current = false;
      }

      // Space while crouched or prone attempts to stand up
      if (input.jump && isGrounded.current && (stanceRef.current === 'crouching' || stanceRef.current === 'prone')) {
        const curH = stanceRef.current === 'crouching' ? PLAYER_CROUCH_HEIGHT : PLAYER_PRONE_HEIGHT;
        if (CollisionWorld.hasVerticalClearance(player.position[0], player.position[1], player.position[2], PLAYER_HEIGHT, curH)) {
          stanceRef.current = 'standing';
        }
      }

      // Sprint input while crouched or prone attempts to stand up if clear
      if (input.sprint && input.forward && isGrounded.current && (stanceRef.current === 'crouching' || stanceRef.current === 'prone')) {
        const curH = stanceRef.current === 'crouching' ? PLAYER_CROUCH_HEIGHT : PLAYER_PRONE_HEIGHT;
        if (CollisionWorld.hasVerticalClearance(player.position[0], player.position[1], player.position[2], PLAYER_HEIGHT, curH)) {
          stanceRef.current = 'standing';
        }
      }
    }

    // 5. CONTEXTUAL VAULT / WALL MANTLE DETECTION
    if (
      !player.isDead &&
      gameState.matchState.status === 'playing' &&
      stanceRef.current !== 'vaulting' &&
      stanceRef.current !== 'mantling' &&
      input.forward
    ) {
      // Trigger when pressing Jump while moving forward toward an obstacle or wall
      if (input.jump) {
        const candidate = CollisionWorld.findVaultableObstacle(
          player.position[0],
          player.position[1],
          player.position[2],
          cameraForward.x,
          cameraForward.z,
          1.35
        );

        if (candidate) {
          stanceRef.current = candidate.mode === 'mantle' ? 'mantling' : 'vaulting';
          vaultTargetRef.current = candidate;
          vaultTimeRef.current = 0;
          verticalVelocity.current = 0;
          isGrounded.current = false;
        }
      }
    }

    const isProne = stanceRef.current === 'prone';
    const isCrouching = stanceRef.current === 'crouching';
    const isVaulting = stanceRef.current === 'vaulting';
    const isMantling = stanceRef.current === 'mantling';
    const isOverObstacle = isVaulting || isMantling;
    const isSprinting = stanceRef.current === 'standing' && input.sprint && !isAiming && isGrounded.current && !player.isDead;

    // 6. VAULT & WALL MANTLE KINEMATICS & MOVEMENT RESOLUTION
    if (isOverObstacle && vaultTargetRef.current && !player.isDead) {
      const vt = vaultTargetRef.current;
      vaultTimeRef.current += delta;
      const progress = Math.min(1.0, vaultTimeRef.current / vt.duration);

      let targetX = player.position[0];
      let targetY = player.position[1];
      let targetZ = player.position[2];

      if (vt.mode === 'mantle') {
        // 4-Phase Realistic Tactical Wall Climb & Mantle:
        // Phase 1 (0% to 25%): Leap upward, hands reach toward top edge, forward movement slows
        if (progress < 0.25) {
          const u = progress / 0.25;
          const s = u * u * (3 - 2 * u);
          targetX = THREE.MathUtils.lerp(vt.startPos[0], vt.grabPos[0] - cameraForward.x * 0.15, s);
          targetY = THREE.MathUtils.lerp(vt.startPos[1], vt.grabPos[1] - 0.70, s);
          targetZ = THREE.MathUtils.lerp(vt.startPos[2], vt.grabPos[2] - cameraForward.z * 0.15, s);
        }
        // Phase 2 (25% to 40%): Hand Grab & Hold - Hands firmly grip top edge, pause momentarily
        else if (progress < 0.40) {
          const u = (progress - 0.25) / 0.15;
          const s = u * u * (3 - 2 * u);
          targetX = THREE.MathUtils.lerp(vt.grabPos[0] - cameraForward.x * 0.15, vt.grabPos[0] - cameraForward.x * 0.05, s);
          targetY = THREE.MathUtils.lerp(vt.grabPos[1] - 0.70, vt.grabPos[1] - 0.55, s);
          targetZ = THREE.MathUtils.lerp(vt.grabPos[2] - cameraForward.z * 0.15, vt.grabPos[2] - cameraForward.z * 0.05, s);
        }
        // Phase 3 (40% to 75%): Pull-Up & Chest Crest - Arms press down, body pulls up and over apex
        else if (progress < 0.75) {
          const u = (progress - 0.40) / 0.35;
          const s = u * u * (3 - 2 * u);
          targetX = THREE.MathUtils.lerp(vt.grabPos[0] - cameraForward.x * 0.05, vt.apexPos[0], s);
          targetY = THREE.MathUtils.lerp(vt.grabPos[1] - 0.55, vt.apexPos[1], s);
          targetZ = THREE.MathUtils.lerp(vt.grabPos[2] - cameraForward.z * 0.05, vt.apexPos[2], s);
        }
        // Phase 4 (75% to 100%): Leg Swing & Drop Landing - Crests over wall and descends to ground
        else {
          const u = (progress - 0.75) / 0.25;
          const s = u * u * (3 - 2 * u);
          targetX = THREE.MathUtils.lerp(vt.apexPos[0], vt.landPos[0], s);
          targetY = THREE.MathUtils.lerp(vt.apexPos[1], vt.landPos[1], s);
          targetZ = THREE.MathUtils.lerp(vt.apexPos[2], vt.landPos[2], s);
        }
      } else {
        // Quick 3-phase low barrier vault
        if (progress < 0.35) {
          const u = progress / 0.35;
          const s = u * u * (3 - 2 * u);
          targetX = THREE.MathUtils.lerp(vt.startPos[0], vt.grabPos[0], s);
          targetY = THREE.MathUtils.lerp(vt.startPos[1], vt.grabPos[1], s);
          targetZ = THREE.MathUtils.lerp(vt.startPos[2], vt.grabPos[2], s);
        } else if (progress < 0.70) {
          const u = (progress - 0.35) / 0.35;
          const s = u * u * (3 - 2 * u);
          targetX = THREE.MathUtils.lerp(vt.grabPos[0], vt.apexPos[0], s);
          targetY = THREE.MathUtils.lerp(vt.grabPos[1], vt.apexPos[1], s);
          targetZ = THREE.MathUtils.lerp(vt.grabPos[2], vt.apexPos[2], s);
        } else {
          const u = (progress - 0.70) / 0.30;
          const s = u * u * (3 - 2 * u);
          targetX = THREE.MathUtils.lerp(vt.apexPos[0], vt.landPos[0], s);
          targetY = THREE.MathUtils.lerp(vt.apexPos[1], vt.landPos[1], s);
          targetZ = THREE.MathUtils.lerp(vt.apexPos[2], vt.landPos[2], s);
        }
      }

      player.position[0] = targetX;
      player.position[1] = targetY;
      player.position[2] = targetZ;

      // Face mantle/vault direction
      const moveDirX = vt.landPos[0] - vt.startPos[0];
      const moveDirZ = vt.landPos[2] - vt.startPos[2];
      if (Math.hypot(moveDirX, moveDirZ) > 0.01) {
        player.rotationY = Math.atan2(moveDirX, moveDirZ);
      }

      gameState.setStance(activeId, {
        isSprinting: false,
        isCrouching: false,
        isProne: false,
        isVaulting,
        isMantling,
        stance: stanceRef.current,
        vaultProgress: isVaulting ? progress : 0,
        mantleProgress: isMantling ? progress : 0,
        isGrounded: false,
      });

      if (progress >= 1.0) {
        // Landed cleanly on the other side
        player.position[0] = vt.landPos[0];
        player.position[1] = vt.landPos[1];
        player.position[2] = vt.landPos[2];
        velocity.current.x = cameraForward.x * (PLAYER_WALK_SPEED * 0.85);
        velocity.current.z = cameraForward.z * (PLAYER_WALK_SPEED * 0.85);
        stanceRef.current = 'standing';
        vaultTargetRef.current = null;
        isGrounded.current = true;
        verticalVelocity.current = 0;
      }
    } else {
      // 7. STANDARD GROUND MOVEMENT (STANDING, CROUCHING, PRONE)
      gameState.setStance(activeId, {
        isSprinting,
        isCrouching,
        isProne,
        isVaulting: false,
        isMantling: false,
        stance: stanceRef.current,
        vaultProgress: 0,
        mantleProgress: 0,
        isGrounded: isGrounded.current,
      });

      if (player.isAiming !== isAiming) {
        gameState.setAiming(activeId, isAiming);
      }

      let targetSpeed = PLAYER_WALK_SPEED;
      if (isSprinting) targetSpeed = PLAYER_SPRINT_SPEED;
      else if (isCrouching) targetSpeed = PLAYER_CROUCH_SPEED;
      else if (isProne) targetSpeed = PLAYER_PRONE_SPEED;

      if (isAiming) {
        targetSpeed = (isProne ? PLAYER_PRONE_SPEED : isCrouching ? PLAYER_CROUCH_SPEED : PLAYER_WALK_SPEED) * 0.65;
      }

      if (!player.isDead && gameState.matchState.status === 'playing') {
        let inputX = 0;
        let inputZ = 0;

        if (input.forward) inputZ += 1;
        if (input.backward) inputZ -= 1;
        if (input.left) inputX -= 1;
        if (input.right) inputX += 1;

        let targetMoveX = 0;
        let targetMoveZ = 0;

        const hasMoveInput = inputX !== 0 || inputZ !== 0;

        // Calculate normalized movement direction
        const moveDir = new THREE.Vector3();
        if (input.forward) moveDir.add(cameraForward);
        if (input.backward) moveDir.sub(cameraForward);
        if (input.right) moveDir.add(cameraRight);
        if (input.left) moveDir.sub(cameraRight);

        if (moveDir.lengthSq() > 0) {
          moveDir.normalize();
          targetMoveX = moveDir.x * targetSpeed;
          targetMoveZ = moveDir.z * targetSpeed;
          bobTimeRef.current += delta * (isSprinting ? 15 : isCrouching ? 8 : isProne ? 6 : 11);
        }

        // Smooth acceleration / deceleration
        const accelFactor = hasMoveInput ? 14 : 16;
        velocity.current.x = THREE.MathUtils.lerp(velocity.current.x, targetMoveX, delta * accelFactor);
        velocity.current.z = THREE.MathUtils.lerp(velocity.current.z, targetMoveZ, delta * accelFactor);

        // Continuous Capsule Collision Resolution with Stance-Specific Height & Step Traversal
        const capsuleHeight = isProne ? PLAYER_PRONE_HEIGHT : isCrouching ? PLAYER_CROUCH_HEIGHT : PLAYER_HEIGHT;
        const resolved = CollisionWorld.resolveCapsuleMovement(
          player.position[0],
          player.position[1],
          player.position[2],
          velocity.current.x,
          velocity.current.z,
          delta,
          PLAYER_RADIUS,
          capsuleHeight,
          isProne ? 0.15 : MAX_STEP_HEIGHT
        );

        player.position[0] = resolved.x;
        player.position[1] = resolved.y;
        player.position[2] = resolved.z;
        velocity.current.x = resolved.vx;
        velocity.current.z = resolved.vz;

        // 8. JUMP, GRAVITY & GROUND/OBSTACLE TOP DETECTION
        const groundHeight = CollisionWorld.getGroundHeight(
          player.position[0],
          player.position[2],
          player.position[1],
          PLAYER_RADIUS
        );

        if (input.jump && isGrounded.current && stanceRef.current === 'standing' && !player.isDead) {
          verticalVelocity.current = PLAYER_JUMP_FORCE;
          isGrounded.current = false;
          wasInAir.current = true;
        }

        // Check if player has stepped off an edge or is in the air
        if (player.position[1] > groundHeight + 0.04) {
          isGrounded.current = false;
        }

        if (!isGrounded.current) {
          verticalVelocity.current -= GRAVITY * delta;
          player.position[1] += verticalVelocity.current * delta;

          // Landing check (ground or top of obstacle)
          if (player.position[1] <= groundHeight) {
            player.position[1] = groundHeight;
            verticalVelocity.current = 0;
            isGrounded.current = true;

            // Landing camera impact dip
            if (wasInAir.current) {
              landingDipRef.current = 0.08;
              wasInAir.current = false;
            }
          }
        } else {
          // Grounded: smoothly adhere to ground/obstacle surface
          player.position[1] = groundHeight;
          verticalVelocity.current = 0;
        }

        // 9. CHARACTER ROTATION & FACING
        const camAngle = Math.atan2(cameraForward.x, cameraForward.z);
        let targetFacingAngle = player.rotationY;

        if (isAiming) {
          // When aiming: face camera/crosshair direction
          targetFacingAngle = camAngle;
        } else if (hasMoveInput) {
          if (input.backward && !input.forward && !input.left && !input.right) {
            targetFacingAngle = camAngle;
          } else if (input.backward && input.right) {
            targetFacingAngle = Math.atan2(cameraForward.x + cameraRight.x, cameraForward.z + cameraRight.z);
          } else if (input.backward && input.left) {
            targetFacingAngle = Math.atan2(cameraForward.x - cameraRight.x, cameraForward.z - cameraRight.z);
          } else {
            targetFacingAngle = Math.atan2(moveDir.x, moveDir.z);
          }
        }

        // Smooth rotation interpolation toward targetFacingAngle
        const diff = THREE.MathUtils.euclideanModulo(targetFacingAngle - player.rotationY + Math.PI, Math.PI * 2) - Math.PI;
        player.rotationY += diff * Math.min(1, delta * (isAiming ? 20 : 12));

        player.pitch = pitchRef.current + recoilPitchRef.current;
      }
    }

    // 10. WEAPON PICKUP PROXIMITY DETECTION & [E] INTERACT
    let nearbyItem: { id: WeaponId; name: string } | null = null;
    const pPos = new THREE.Vector3(...player.position);

    // Only allow pickup if player has an empty slot (slot1 or slot2)
    const hasEmptySlot = !player.inventory.slot1 || !player.inventory.slot2;

    if (hasEmptySlot) {
      for (const key of ['gun1', 'gun2'] as WeaponId[]) {
        const gItem = gameState.groundWeapons[key];
        if (gItem && !gItem.isPickedUp) {
          const itemPos = new THREE.Vector3(...gItem.position);
          const dist = pPos.distanceTo(itemPos);
          if (dist <= PICKUP_DISTANCE) {
            nearbyItem = { id: gItem.id, name: gItem.name };
            break;
          }
        }
      }
    }

    onNearWeaponChange(
      nearbyItem ? nearbyItem.id : null,
      nearbyItem ? nearbyItem.name : null
    );

    if (input.interact && nearbyItem && !player.isDead) {
      gameState.pickupWeapon(activeId, nearbyItem.id);
    }

    // 8. SHOOTING & AMMUNITION CONSUMPTION
    if (
      input.fire &&
      player.equippedWeapon &&
      !player.isDead &&
      !player.isReloading &&
      !isSprinting &&
      player.weaponState === 'ready' &&
      gameState.matchState.status === 'playing'
    ) {
      const weaponDef = WEAPON_SPAWNS[player.equippedWeapon];
      const now = Date.now();

      if (now - lastShotTimeRef.current >= weaponDef.fireRateMs) {
        // Attempt to consume 1 round
        const canShoot = gameState.consumeAmmo(activeId);

        if (canShoot) {
          lastShotTimeRef.current = now;

          // Realistic Camera / Aim Recoil Kick
          // Stance modifiers: Prone provides 40% reduction, Crouch provides 20% reduction
          const stanceRecoilMult = isProne ? 0.60 : isCrouching ? 0.80 : 1.0;
          // ADS modifier: tighter vertical kick (30% reduction) and tighter horizontal drift (50% reduction)
          const adsPitchMult = isAiming ? 0.70 : 1.0;
          const adsYawMult = isAiming ? 0.50 : 1.0;

          // Vertical pitch impulse (M16A2 rifle vs secondary)
          const basePitchKick = weaponDef.type === 'rifle' ? 0.024 : 0.016;
          const pitchKick = basePitchKick * stanceRecoilMult * adsPitchMult;
          // Stack vertical kick up to realistic tactical ceiling ~9.5° (0.165 rad)
          recoilPitchRef.current = Math.min(0.165, recoilPitchRef.current + pitchKick);

          // Subtle horizontal recoil drift with slight rightward rifling torque bias
          const yawDriftRange = weaponDef.type === 'rifle' ? 0.014 : 0.009;
          const yawKick = ((Math.random() - 0.46) * yawDriftRange) * stanceRecoilMult * adsYawMult;
          recoilYawRef.current = Math.max(-0.06, Math.min(0.06, recoilYawRef.current + yawKick));

          // Muzzle flash
          gameState.setFiring(activeId, true);
          if (firingTimeoutRef.current) clearTimeout(firingTimeoutRef.current);
          firingTimeoutRef.current = window.setTimeout(() => {
            gameState.setFiring(activeId, false);
          }, 60);

          soundManager.playShoot(weaponDef.type);

          // Authoritative screen-center raycast from camera
          const shootCamForward = new THREE.Vector3();
          camera.getWorldDirection(shootCamForward);

          const hitResult = RaycastCombatSystem.castShot(
            camera.position,
            shootCamForward,
            activeId,
            gameState.players,
            weaponDef.type === 'rifle' ? 120 : 80
          );

          // Bullet tracer starts at actual physical weapon muzzle in world space
          const muzzlePos = player.muzzlePos
            ? new THREE.Vector3(...player.muzzlePos)
            : new THREE.Vector3(
              player.position[0],
              player.position[1] + (stanceRef.current === 'prone' ? 0.35 : stanceRef.current === 'crouching' ? 0.85 : 1.25),
              player.position[2]
            );

          gameState.addBullet({
            id: Math.random().toString(36).substring(2, 9),
            origin: [muzzlePos.x, muzzlePos.y, muzzlePos.z],
            target: hitResult.hitPoint,
            shooterId: activeId,
            hitPlayerId: hitResult.hitPlayerId,
            timestamp: now,
            color: weaponDef.tracerColor,
          });

          if (hitResult.hit && hitResult.hitPlayerId) {
            gameState.applyDamage(hitResult.hitPlayerId, activeId, WEAPON_DAMAGE);
          } else if (hitResult.hitNormal) {
            gameState.addDecal({
              id: Math.random().toString(36).substring(2, 9),
              position: hitResult.hitPoint,
              normal: hitResult.hitNormal,
              surfaceType: hitResult.surfaceType || 'concrete',
              timestamp: now,
              rotationZ: Math.random() * Math.PI * 2,
              variant: Math.floor(Math.random() * 6),
              scale: 0.85 + Math.random() * 0.40,
            });
          }
        }
      }
    }

    // 12. POLISHED TACTICAL THIRD-PERSON CAMERA WITH COLLISION DETECTION
    let targetFov = 65;
    if (isAiming) targetFov = 45;
    else if (isSprinting) targetFov = 72;

    const perspectiveCam = camera as THREE.PerspectiveCamera;
    if (perspectiveCam.fov !== targetFov) {
      perspectiveCam.fov = THREE.MathUtils.lerp(perspectiveCam.fov, targetFov, delta * 12);
      perspectiveCam.updateProjectionMatrix();
    }

    // Camera offsets by stance
    let camDist = 3.2;
    let camHeight = 1.8;
    let shoulderOffset = 0.55;

    if (isAiming) {
      camDist = 1.8;
      camHeight = isProne ? 0.65 : isCrouching ? 1.25 : 1.55;
      shoulderOffset = isProne ? 0.35 : 0.65;
    } else if (isProne) {
      camDist = 2.4;
      camHeight = 0.65;
      shoulderOffset = 0.38;
    } else if (isCrouching) {
      camDist = 2.6;
      camHeight = 1.15;
      shoulderOffset = 0.5;
    } else if (isVaulting || isMantling) {
      camDist = 3.2;
      camHeight = isMantling ? 2.1 : 1.75;
      shoulderOffset = 0.45;
    } else if (isSprinting) {
      camDist = 3.6;
      camHeight = 1.85;
      shoulderOffset = 0.5;
    }

    // Subtle head bobbing & landing impact
    const isMoving = velocity.current.lengthSq() > 0.1;
    const bobOffset = isMoving ? Math.sin(bobTimeRef.current) * (isSprinting ? 0.04 : isProne ? 0.015 : 0.02) : 0;

    const yaw = yawRef.current + recoilYawRef.current;
    const totalPitch = pitchRef.current + recoilPitchRef.current;

    const headY = player.isDead
      ? 0.35
      : isProne
      ? 0.45
      : isCrouching
      ? 0.95
      : 1.45;

    const targetHead = new THREE.Vector3(
      player.position[0],
      player.position[1] + headY + bobOffset - landingDipRef.current,
      player.position[2]
    );

    const cosPitch = Math.cos(totalPitch);
    const sinPitch = Math.sin(totalPitch);
    const sinY = Math.sin(yaw);
    const cosY = Math.cos(yaw);

    const rightX = cosY * shoulderOffset;
    const rightZ = -sinY * shoulderOffset;

    let desiredCamPos = new THREE.Vector3(
      targetHead.x - sinY * cosPitch * camDist + rightX,
      targetHead.y + sinPitch * camDist + (camHeight - headY),
      targetHead.z - cosY * cosPitch * camDist + rightZ
    );

    // Camera Collision Raycast Against All Map Obstacles
    const camClearanceDist = CollisionWorld.castCameraRay(targetHead, desiredCamPos, 0.25);
    const camRayDir = new THREE.Vector3().subVectors(desiredCamPos, targetHead);
    const naturalDist = camRayDir.length();

    if (naturalDist > 0.01 && camClearanceDist < naturalDist) {
      camRayDir.normalize();
      desiredCamPos = new THREE.Vector3()
        .copy(targetHead)
        .addScaledVector(camRayDir, camClearanceDist);
    }

    // Keep camera above ground
    if (desiredCamPos.y < 0.35) {
      desiredCamPos.y = 0.35;
    }

    // Smooth camera damping
    if (currentCamPos.current.lengthSq() === 0) {
      currentCamPos.current.copy(desiredCamPos);
      currentLookAt.current.copy(targetHead);
    } else {
      const damp = isAiming ? 18 * delta : 12 * delta;
      currentCamPos.current.lerp(desiredCamPos, Math.min(1, damp));
      currentLookAt.current.lerp(targetHead, Math.min(1, damp));
    }

    camera.position.copy(currentCamPos.current);

    // Crosshair target: forward in line of sight
    const lookTarget = new THREE.Vector3(
      currentLookAt.current.x + sinY * cosPitch * 50,
      currentLookAt.current.y - sinPitch * 50,
      currentLookAt.current.z + cosY * cosPitch * 50
    );
    camera.lookAt(lookTarget);
    camera.updateMatrixWorld();

    // 10. AUTHORITATIVE SCREEN-CENTER CAMERA AIM CALCULATION
    // Ray originates from camera passing through screen-center crosshair
    const centerCamForward = new THREE.Vector3();
    camera.getWorldDirection(centerCamForward);

    const aimRaycast = RaycastCombatSystem.castShot(
      camera.position,
      centerCamForward,
      activeId,
      gameState.players,
      120
    );

    gameState.setAimTarget(activeId, aimRaycast.hitPoint);
  });

  return null;
};
