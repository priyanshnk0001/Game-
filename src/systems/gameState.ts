// Centralized authoritative game state manager

import {
  PLAYER_MAX_HEALTH,
  WEAPON_DAMAGE,
  PLAYER_SPAWNS,
  WEAPON_SPAWNS,
  RELOAD_TIME_MS,
} from '../config/constants';
import {
  PlayerId,
  WeaponId,
  PlayerState,
  WeaponGroundItem,
  BulletTracer,
  BulletImpactDecal,
  MatchState,
  HitFeedbackData,
  MapId,
} from '../types/game';
import { soundManager } from './sound';
import { MAPS, MAP_OBSTACLES, getJungleTerrainHeight, validateJungleRoadClearance } from '../config/maps';
import { CollisionWorld } from '../game/collision/CollisionWorld';

type Listener = () => void;

class GameStateManager {
  public activeMapId: MapId = 'battle-area';

  public players: Record<PlayerId, PlayerState> = {
    player1: {
      id: 'player1',
      name: 'PLAYER 1',
      position: [...PLAYER_SPAWNS.player1],
      rotationY: 0,
      pitch: 0,
      health: PLAYER_MAX_HEALTH,
      isDead: false,
      equippedWeapon: null,
      weaponState: 'holstered',
      inventory: {
        slot1: null,
        slot2: null,
      },
      slots: {
        slot1: null,
        slot2: null,
      },
      activeSlot: 1,
      magazine: 0,
      maxMagazine: 0,
      isReloading: false,
      isAiming: false,
      isFiring: false,
      isSprinting: false,
      isCrouching: false,
      isProne: false,
      isVaulting: false,
      isMantling: false,
      stance: 'standing',
      vaultProgress: 0,
      mantleProgress: 0,
      isGrounded: true,
      color: '#06b6d4',
      accentColor: '#67e8f9',
    },
    player2: {
      id: 'player2',
      name: 'PLAYER 2',
      position: [...PLAYER_SPAWNS.player2],
      rotationY: Math.PI,
      pitch: 0,
      health: PLAYER_MAX_HEALTH,
      isDead: false,
      equippedWeapon: null,
      weaponState: 'holstered',
      inventory: {
        slot1: null,
        slot2: null,
      },
      slots: {
        slot1: null,
        slot2: null,
      },
      activeSlot: 1,
      magazine: 0,
      maxMagazine: 0,
      isReloading: false,
      isAiming: false,
      isFiring: false,
      isSprinting: false,
      isCrouching: false,
      isProne: false,
      isVaulting: false,
      isMantling: false,
      stance: 'standing',
      vaultProgress: 0,
      mantleProgress: 0,
      isGrounded: true,
      color: '#f43f5e',
      accentColor: '#fda4af',
    },
  };

  public groundWeapons: Record<WeaponId, WeaponGroundItem> = {
    gun1: {
      id: 'gun1',
      name: WEAPON_SPAWNS.gun1.name,
      type: WEAPON_SPAWNS.gun1.type,
      position: [...WEAPON_SPAWNS.gun1.position],
      color: WEAPON_SPAWNS.gun1.color,
      accentColor: WEAPON_SPAWNS.gun1.accentColor,
      isPickedUp: false,
      pickedUpBy: null,
    },
    gun2: {
      id: 'gun2',
      name: WEAPON_SPAWNS.gun2.name,
      type: WEAPON_SPAWNS.gun2.type,
      position: [...WEAPON_SPAWNS.gun2.position],
      color: WEAPON_SPAWNS.gun2.color,
      accentColor: WEAPON_SPAWNS.gun2.accentColor,
      isPickedUp: false,
      pickedUpBy: null,
    },
  };

  public matchState: MatchState = {
    status: 'playing',
    winner: null,
    eliminationMessage: null,
  };

  public activePlayerId: PlayerId = 'player1';
  public bullets: BulletTracer[] = [];
  public decals: BulletImpactDecal[] = [];
  public hitFeedbacks: HitFeedbackData[] = [];
  public isMultiplayer = false;
  public networkRole: 'host' | 'client' | 'local' = 'local';

  private listeners: Set<Listener> = new Set();
  private reloadTimeouts: Record<PlayerId, number | null> = {
    player1: null,
    player2: null,
  };

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    this.listeners.forEach((fn) => fn());
  }

  setActivePlayer(id: PlayerId) {
    this.activePlayerId = id;
    this.notify();
  }

  toggleActivePlayer() {
    this.activePlayerId = this.activePlayerId === 'player1' ? 'player2' : 'player1';
    this.notify();
  }

  updatePlayerTransform(
    id: PlayerId,
    pos: [number, number, number],
    rotationY: number,
    pitch: number
  ) {
    const p = this.players[id];
    if (!p || p.isDead) return;
    p.position[0] = pos[0];
    p.position[1] = pos[1];
    p.position[2] = pos[2];
    p.rotationY = rotationY;
    p.pitch = pitch;
  }

  setAiming(id: PlayerId, isAiming: boolean) {
    const p = this.players[id];
    if (!p || p.isAiming === isAiming) return;
    p.isAiming = isAiming;
    this.notify();
  }

  setAimTarget(id: PlayerId, target: [number, number, number], muzzle?: [number, number, number]) {
    const p = this.players[id];
    if (!p) return;
    p.aimTarget = target;
    if (muzzle) p.muzzlePos = muzzle;
  }

  setFiring(id: PlayerId, isFiring: boolean) {
    const p = this.players[id];
    if (!p) return;
    p.isFiring = isFiring;
  }

  setStance(
    id: PlayerId,
    stanceState: {
      isSprinting?: boolean;
      isCrouching?: boolean;
      isProne?: boolean;
      isVaulting?: boolean;
      isMantling?: boolean;
      stance?: 'standing' | 'crouching' | 'prone' | 'vaulting' | 'mantling';
      vaultProgress?: number;
      mantleProgress?: number;
      isGrounded?: boolean;
    }
  ) {
    const p = this.players[id];
    if (!p) return;
    if (typeof stanceState.isSprinting === 'boolean') p.isSprinting = stanceState.isSprinting;
    if (typeof stanceState.isCrouching === 'boolean') p.isCrouching = stanceState.isCrouching;
    if (typeof stanceState.isProne === 'boolean') p.isProne = stanceState.isProne;
    if (typeof stanceState.isVaulting === 'boolean') p.isVaulting = stanceState.isVaulting;
    if (typeof stanceState.isMantling === 'boolean') p.isMantling = stanceState.isMantling;
    if (stanceState.stance) p.stance = stanceState.stance;
    if (typeof stanceState.vaultProgress === 'number') p.vaultProgress = stanceState.vaultProgress;
    if (typeof stanceState.mantleProgress === 'number') p.mantleProgress = stanceState.mantleProgress;
    if (typeof stanceState.isGrounded === 'boolean') p.isGrounded = stanceState.isGrounded;
  }

  // Pickup weapon: equips to slot 1 or 2, maintains independent state per slot
  pickupWeapon(playerId: PlayerId, weaponId: WeaponId): boolean {
    const p = this.players[playerId];
    const weapon = this.groundWeapons[weaponId];
    if (!p || p.isDead || !weapon || weapon.isPickedUp) {
      return false;
    }

    // Only allow pickup if player has an empty slot (slot1 or slot2)
    if (p.slots.slot1 && p.slots.slot2) {
      return false;
    }

    weapon.isPickedUp = true;
    weapon.pickedUpBy = playerId;

    const def = WEAPON_SPAWNS[weaponId];

    if (!p.slots.slot1) {
      // First weapon goes to Slot 1
      p.slots.slot1 = {
        slot: 1,
        weaponId,
        ammo: def.magazineCapacity,
        maxAmmo: def.magazineCapacity,
        reserveAmmo: def.reserveAmmo || 90,
      };
      p.inventory.slot1 = weaponId;
      p.activeSlot = 1;
      p.equippedWeapon = weaponId;
      p.magazine = def.magazineCapacity;
      p.maxMagazine = def.magazineCapacity;
      // Newly picked up weapon starts in HOLSTERED state on the back
      p.weaponState = 'holstered';
    } else if (!p.slots.slot2) {
      // Second weapon goes to Slot 2 (does NOT remove or replace Slot 1)
      p.slots.slot2 = {
        slot: 2,
        weaponId,
        ammo: def.magazineCapacity,
        maxAmmo: def.magazineCapacity,
        reserveAmmo: def.reserveAmmo || 90,
      };
      p.inventory.slot2 = weaponId;
      // If player was unarmed, equip slot 2, else keep current activeSlot
      if (!p.equippedWeapon) {
        p.activeSlot = 2;
        p.equippedWeapon = weaponId;
        p.magazine = def.magazineCapacity;
        p.maxMagazine = def.magazineCapacity;
        p.weaponState = 'holstered';
      }
    }

    soundManager.playPickup();
    this.notify();
    return true;
  }

  // Toggle weapon state between 'holstered' (on back) and 'ready' (in hands)
  toggleWeaponState(playerId: PlayerId) {
    const p = this.players[playerId];
    if (!p || p.isDead || !p.equippedWeapon) return;

    p.weaponState = p.weaponState === 'ready' ? 'holstered' : 'ready';

    // Disengage aiming if weapon was holstered while aiming
    if (p.weaponState === 'holstered' && p.isAiming) {
      p.isAiming = false;
    }

    // Cancel active reload if holstering
    if (p.weaponState === 'holstered' && p.isReloading) {
      if (this.reloadTimeouts[playerId]) {
        clearTimeout(this.reloadTimeouts[playerId]!);
        this.reloadTimeouts[playerId] = null;
      }
      p.isReloading = false;
    }

    soundManager.playPickup();
    this.notify();
  }

  // Switch between Weapon Slot 1 and Slot 2 (Strictly Independent State)
  switchSlot(playerId: PlayerId, slot: 1 | 2) {
    const p = this.players[playerId];
    if (!p || p.isDead || p.activeSlot === slot) return;

    const targetSlot = slot === 1 ? p.slots.slot1 : p.slots.slot2;
    if (!targetSlot) return;

    // Cancel active reload on switch
    if (this.reloadTimeouts[playerId]) {
      clearTimeout(this.reloadTimeouts[playerId]!);
      this.reloadTimeouts[playerId] = null;
    }
    p.isReloading = false;

    p.activeSlot = slot;
    p.equippedWeapon = targetSlot.weaponId;
    p.magazine = targetSlot.ammo;
    p.maxMagazine = targetSlot.maxAmmo;

    soundManager.playPickup();
    this.notify();
  }

  // Consume 1 round from the CURRENTLY SELECTED weapon. Returns true if shot allowed.
  consumeAmmo(playerId: PlayerId): boolean {
    const p = this.players[playerId];
    // Shooting is strictly restricted to READY state
    if (!p || p.isDead || !p.equippedWeapon || p.isReloading || p.weaponState !== 'ready') {
      return false;
    }

    const currentSlot = p.activeSlot === 1 ? p.slots.slot1 : p.slots.slot2;
    if (!currentSlot || currentSlot.ammo <= 0) {
      // Auto trigger reload for selected weapon
      this.reload(playerId);
      return false;
    }

    currentSlot.ammo -= 1;
    p.magazine = currentSlot.ammo;
    this.notify();
    return true;
  }

  // Reload currently selected weapon (strictly isolated to active slot)
  reload(playerId: PlayerId) {
    const p = this.players[playerId];
    if (!p || p.isDead || !p.equippedWeapon || p.isReloading || p.weaponState !== 'ready') return;
    const currentSlot = p.activeSlot === 1 ? p.slots.slot1 : p.slots.slot2;
    if (!currentSlot || currentSlot.ammo === currentSlot.maxAmmo) return;

    const slotNum = p.activeSlot;
    p.isReloading = true;
    this.notify();

    if (this.reloadTimeouts[playerId]) {
      clearTimeout(this.reloadTimeouts[playerId]!);
    }

    this.reloadTimeouts[playerId] = window.setTimeout(() => {
      const targetSlot = slotNum === 1 ? p.slots.slot1 : p.slots.slot2;
      if (targetSlot) {
        targetSlot.ammo = targetSlot.maxAmmo;
        if (p.activeSlot === slotNum) {
          p.magazine = targetSlot.ammo;
        }
      }
      p.isReloading = false;
      this.reloadTimeouts[playerId] = null;
      soundManager.playPickup();
      this.notify();
    }, RELOAD_TIME_MS);
  }

  // Authoritative damage calculation: 34 per hit (100 -> 66 -> 32 -> 0)
  applyDamage(targetId: PlayerId, shooterId: PlayerId, damage = WEAPON_DAMAGE) {
    const target = this.players[targetId];
    if (!target || target.isDead || this.matchState.status === 'ended') {
      return;
    }

    const nextHealth = Math.max(0, target.health - damage);
    target.health = nextHealth;

    const isFatal = nextHealth <= 0;

    this.hitFeedbacks.push({
      id: Math.random().toString(36).substring(2, 9),
      damage,
      isFatal,
      timestamp: Date.now(),
    });

    if (isFatal) {
      target.isDead = true;
      target.equippedWeapon = null;
      this.matchState = {
        status: 'ended',
        winner: shooterId,
        eliminationMessage: `${target.name} ELIMINATED`,
      };
      soundManager.playEliminated();
      setTimeout(() => soundManager.playWin(), 350);
    } else {
      soundManager.playHit(false);
    }

    this.notify();
  }

  addBullet(bullet: BulletTracer) {
    this.bullets.push(bullet);
    if (this.bullets.length > 20) {
      this.bullets.shift();
    }
    this.notify();
  }

  clearExpiredBullets() {
    const now = Date.now();
    const prevLen = this.bullets.length;
    this.bullets = this.bullets.filter((b) => now - b.timestamp < 350);
    if (this.bullets.length !== prevLen) {
      this.notify();
    }
  }

  addDecal(decal: BulletImpactDecal) {
    this.decals.push(decal);
    // Keep max 80 active decals (FIFO) to maintain AAA 60fps performance
    if (this.decals.length > 80) {
      this.decals.shift();
    }
    this.notify();
  }

  clearExpiredDecals() {
    const now = Date.now();
    const prevLen = this.decals.length;
    // Decals persist for 8.0s (0-4s full, 4-8s smooth fade out)
    this.decals = this.decals.filter((d) => now - d.timestamp < 8000);
    if (this.decals.length !== prevLen) {
      this.notify();
    }
  }

  switchMap(mapId: MapId) {
    if (!MAPS[mapId]) return;
    this.activeMapId = mapId;
    const mapDef = MAPS[mapId];

    // Update physical collision boundaries, obstacles, and terrain elevation
    const terrainFn = mapId === 'jungle-ops' ? getJungleTerrainHeight : null;
    CollisionWorld.setMap(MAP_OBSTACLES[mapId], mapDef.bounds, terrainFn);

    if (mapId === 'jungle-ops') {
      const report = validateJungleRoadClearance(MAP_OBSTACLES['jungle-ops']);
      if (report.violations > 0) {
        console.warn(`[SECTOR-02 ROAD CLEARANCE] ${report.violations} violations found:`, report.details);
      } else {
        console.log(`[SECTOR-02 ROAD CLEARANCE] ROAD CLEARANCE VIOLATIONS: 0. All obstacles and buildings clear.`);
      }
    }

    // Cancel any active reloads
    Object.keys(this.reloadTimeouts).forEach((k) => {
      const pid = k as PlayerId;
      if (this.reloadTimeouts[pid]) {
        clearTimeout(this.reloadTimeouts[pid]!);
        this.reloadTimeouts[pid] = null;
      }
    });

    // Reset players at new map spawn points
    const p1Spawn = mapDef.playerSpawns.player1;
    const p2Spawn = mapDef.playerSpawns.player2;
    const p1Rot = mapDef.playerSpawnRotations?.player1 ?? 0;
    const p2Rot = mapDef.playerSpawnRotations?.player2 ?? Math.PI;

    this.players.player1.position = [...p1Spawn];
    this.players.player1.rotationY = p1Rot;
    this.players.player1.pitch = 0;
    this.players.player1.health = PLAYER_MAX_HEALTH;
    this.players.player1.isDead = false;
    this.players.player1.isReloading = false;
    this.players.player1.isAiming = false;
    this.players.player1.isFiring = false;

    this.players.player2.position = [...p2Spawn];
    this.players.player2.rotationY = p2Rot;
    this.players.player2.pitch = 0;
    this.players.player2.health = PLAYER_MAX_HEALTH;
    this.players.player2.isDead = false;
    this.players.player2.isReloading = false;
    this.players.player2.isAiming = false;
    this.players.player2.isFiring = false;

    // Reposition ground weapons to new map spawn locations
    this.groundWeapons.gun1.position = [...mapDef.weaponSpawns.gun1];
    this.groundWeapons.gun2.position = [...mapDef.weaponSpawns.gun2];

    // Reset match state and tracers
    this.matchState = {
      status: 'playing',
      winner: null,
      eliminationMessage: null,
    };
    this.bullets = [];
    this.decals = [];
    this.hitFeedbacks = [];

    this.notify();
  }

  restartMatch() {
    Object.keys(this.reloadTimeouts).forEach((k) => {
      const pid = k as PlayerId;
      if (this.reloadTimeouts[pid]) {
        clearTimeout(this.reloadTimeouts[pid]!);
        this.reloadTimeouts[pid] = null;
      }
    });

    const mapDef = MAPS[this.activeMapId] || MAPS['battle-area'];
    const p1Spawn = mapDef.playerSpawns.player1;
    const p2Spawn = mapDef.playerSpawns.player2;
    const p1Rot = mapDef.playerSpawnRotations?.player1 ?? 0;
    const p2Rot = mapDef.playerSpawnRotations?.player2 ?? Math.PI;

    this.players.player1 = {
      id: 'player1',
      name: 'PLAYER 1',
      position: [...p1Spawn],
      rotationY: p1Rot,
      pitch: 0,
      health: PLAYER_MAX_HEALTH,
      isDead: false,
      equippedWeapon: null,
      weaponState: 'holstered',
      inventory: { slot1: null, slot2: null },
      slots: { slot1: null, slot2: null },
      activeSlot: 1,
      magazine: 0,
      maxMagazine: 0,
      isReloading: false,
      isAiming: false,
      isFiring: false,
      isSprinting: false,
      isCrouching: false,
      isProne: false,
      isVaulting: false,
      isMantling: false,
      stance: 'standing',
      vaultProgress: 0,
      mantleProgress: 0,
      isGrounded: true,
      color: '#06b6d4',
      accentColor: '#67e8f9',
    };

    this.players.player2 = {
      id: 'player2',
      name: 'PLAYER 2',
      position: [...p2Spawn],
      rotationY: p2Rot,
      pitch: 0,
      health: PLAYER_MAX_HEALTH,
      isDead: false,
      equippedWeapon: null,
      weaponState: 'holstered',
      inventory: { slot1: null, slot2: null },
      slots: { slot1: null, slot2: null },
      activeSlot: 1,
      magazine: 0,
      maxMagazine: 0,
      isReloading: false,
      isAiming: false,
      isFiring: false,
      isSprinting: false,
      isCrouching: false,
      isProne: false,
      isVaulting: false,
      isMantling: false,
      stance: 'standing',
      vaultProgress: 0,
      mantleProgress: 0,
      isGrounded: true,
      color: '#f43f5e',
      accentColor: '#fda4af',
    };

    this.groundWeapons.gun1 = {
      id: 'gun1',
      name: WEAPON_SPAWNS.gun1.name,
      type: WEAPON_SPAWNS.gun1.type,
      position: [...mapDef.weaponSpawns.gun1],
      color: WEAPON_SPAWNS.gun1.color,
      accentColor: WEAPON_SPAWNS.gun1.accentColor,
      isPickedUp: false,
      pickedUpBy: null,
    };

    this.groundWeapons.gun2 = {
      id: 'gun2',
      name: WEAPON_SPAWNS.gun2.name,
      type: WEAPON_SPAWNS.gun2.type,
      position: [...mapDef.weaponSpawns.gun2],
      color: WEAPON_SPAWNS.gun2.color,
      accentColor: WEAPON_SPAWNS.gun2.accentColor,
      isPickedUp: false,
      pickedUpBy: null,
    };

    this.matchState = {
      status: 'playing',
      winner: null,
      eliminationMessage: null,
    };

    this.bullets = [];
    this.decals = [];
    this.hitFeedbacks = [];
    this.notify();
  }
}

export const gameState = new GameStateManager();
