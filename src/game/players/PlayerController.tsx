import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import {
  PLAYER_WALK_SPEED,
  PLAYER_SPRINT_SPEED,
  PLAYER_CROUCH_SPEED,
  PLAYER_JUMP_FORCE,
  GRAVITY,
  PICKUP_DISTANCE,
  PLAYER_RADIUS,
  PLAYER_HEIGHT,
  PLAYER_CROUCH_HEIGHT,
  MAX_STEP_HEIGHT,
  WEAPON_SPAWNS,
  WEAPON_DAMAGE,
} from '../../config/constants';
import { CollisionWorld } from '../collision/CollisionWorld';
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

    // Smooth recoil recovery
    if (recoilPitchRef.current > 0.001) {
      recoilPitchRef.current = THREE.MathUtils.lerp(recoilPitchRef.current, 0, delta * 14);
    } else {
      recoilPitchRef.current = 0;
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

    // 3. STANCE & SPEED CALCULATION
    const isSprinting = input.sprint && !isAiming && !input.crouch && isGrounded.current && !player.isDead;
    const isCrouching = input.crouch && isGrounded.current && !player.isDead;

    gameState.setStance(activeId, {
      isSprinting,
      isCrouching,
      isGrounded: isGrounded.current,
    });

    if (player.isAiming !== isAiming) {
      gameState.setAiming(activeId, isAiming);
    }

    let targetSpeed = PLAYER_WALK_SPEED;
    if (isSprinting) targetSpeed = PLAYER_SPRINT_SPEED;
    if (isCrouching) targetSpeed = PLAYER_CROUCH_SPEED;
    if (isAiming) targetSpeed = PLAYER_WALK_SPEED * 0.65;

    // 4. CAMERA-RELATIVE MOVEMENT WITH ACCELERATION / DECELERATION
    if (!player.isDead && gameState.matchState.status === 'playing') {
      let inputX = 0;
      let inputZ = 0;

      if (input.forward) inputZ += 1;
      if (input.backward) inputZ -= 1;
      if (input.left) inputX -= 1;
      if (input.right) inputX += 1;

      // Camera horizontal forward and true right vectors
      const cameraForward = new THREE.Vector3();
      camera.getWorldDirection(cameraForward);
      cameraForward.y = 0;
      cameraForward.normalize();

      const worldUp = new THREE.Vector3(0, 1, 0);
      const cameraRight = new THREE.Vector3().crossVectors(cameraForward, worldUp).normalize();

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
        bobTimeRef.current += delta * (isSprinting ? 15 : isCrouching ? 8 : 11);
      }

      // Smooth acceleration / deceleration
      const accelFactor = hasMoveInput ? 14 : 16;
      velocity.current.x = THREE.MathUtils.lerp(velocity.current.x, targetMoveX, delta * accelFactor);
      velocity.current.z = THREE.MathUtils.lerp(velocity.current.z, targetMoveZ, delta * accelFactor);

      // Continuous Capsule Collision Resolution with Step Traversal & Wall Sliding
      const capsuleHeight = isCrouching ? PLAYER_CROUCH_HEIGHT : PLAYER_HEIGHT;
      const resolved = CollisionWorld.resolveCapsuleMovement(
        player.position[0],
        player.position[1],
        player.position[2],
        velocity.current.x,
        velocity.current.z,
        delta,
        PLAYER_RADIUS,
        capsuleHeight,
        MAX_STEP_HEIGHT
      );

      player.position[0] = resolved.x;
      player.position[1] = resolved.y;
      player.position[2] = resolved.z;
      velocity.current.x = resolved.vx;
      velocity.current.z = resolved.vz;

      // 5. JUMP, GRAVITY & GROUND/OBSTACLE TOP DETECTION
      const groundHeight = CollisionWorld.getGroundHeight(
        player.position[0],
        player.position[2],
        player.position[1],
        PLAYER_RADIUS
      );

      if (input.jump && isGrounded.current && !isCrouching && !player.isDead) {
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

      // 6. CHARACTER ROTATION & FACING
      const camAngle = Math.atan2(cameraForward.x, cameraForward.z);
      let targetFacingAngle = player.rotationY;

      if (isAiming) {
        // When aiming: always face camera/crosshair direction
        targetFacingAngle = camAngle;
      } else if (hasMoveInput) {
        if (input.backward && !input.forward && !input.left && !input.right) {
          // S only: Player moves backward, but remains oriented toward forward direction!
          // Camera continues seeing the back of the player.
          targetFacingAngle = camAngle;
        } else if (input.backward && input.right) {
          // S + D: Face forward-right
          targetFacingAngle = Math.atan2(cameraForward.x + cameraRight.x, cameraForward.z + cameraRight.z);
        } else if (input.backward && input.left) {
          // S + A: Face forward-left
          targetFacingAngle = Math.atan2(cameraForward.x - cameraRight.x, cameraForward.z - cameraRight.z);
        } else {
          // Forward, Left, Right, Diagonals: face movement direction
          targetFacingAngle = Math.atan2(moveDir.x, moveDir.z);
        }
      }

      // Smooth rotation interpolation toward targetFacingAngle
      const diff = THREE.MathUtils.euclideanModulo(targetFacingAngle - player.rotationY + Math.PI, Math.PI * 2) - Math.PI;
      player.rotationY += diff * Math.min(1, delta * (isAiming ? 20 : 12));

      player.pitch = pitchRef.current + recoilPitchRef.current;
    }

    // 7. WEAPON PICKUP PROXIMITY DETECTION & [E] INTERACT
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

          // Camera recoil kick
          recoilPitchRef.current = Math.min(
            0.075,
            recoilPitchRef.current + (weaponDef.type === 'rifle' ? 0.026 : 0.018)
          );

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
              player.position[1] + (isCrouching ? 0.85 : 1.25),
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
          }
        }
      }
    }

    // 9. POLISHED TACTICAL THIRD-PERSON CAMERA WITH COLLISION DETECTION
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
      camHeight = 1.55;
      shoulderOffset = 0.65;
    } else if (isCrouching) {
      camDist = 2.6;
      camHeight = 1.15;
      shoulderOffset = 0.5;
    } else if (isSprinting) {
      camDist = 3.6;
      camHeight = 1.85;
      shoulderOffset = 0.5;
    }

    // Subtle head bobbing & landing impact
    const isMoving = velocity.current.lengthSq() > 0.1;
    const bobOffset = isMoving ? Math.sin(bobTimeRef.current) * (isSprinting ? 0.04 : 0.02) : 0;

    const yaw = yawRef.current;
    const totalPitch = pitchRef.current + recoilPitchRef.current;

    const targetHead = new THREE.Vector3(
      player.position[0],
      player.position[1] + (player.isDead ? 0.35 : isCrouching ? 0.95 : 1.45) + bobOffset - landingDipRef.current,
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
      targetHead.y + sinPitch * camDist + (camHeight - 1.45),
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
