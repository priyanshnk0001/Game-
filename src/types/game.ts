// Game TypeScript definitions and interfaces

export type PlayerId = 'player1' | 'player2';
export type WeaponId = 'gun1' | 'gun2';
export type WeaponType = 'rifle' | 'smg';

export interface WeaponSlotState {
  slot: 1 | 2;
  weaponId: WeaponId;
  ammo: number;
  maxAmmo: number;
  reserveAmmo: number;
}

export interface PlayerState {
  id: PlayerId;
  name: string;
  position: [number, number, number];
  rotationY: number; // yaw in radians
  pitch: number;     // pitch in radians
  health: number;
  isDead: boolean;
  equippedWeapon: WeaponId | null;
  weaponState: 'holstered' | 'ready';
  inventory: {
    slot1: WeaponId | null;
    slot2: WeaponId | null;
  };
  slots: {
    slot1: WeaponSlotState | null;
    slot2: WeaponSlotState | null;
  };
  activeSlot: 1 | 2;
  magazine: number;
  maxMagazine: number;
  isReloading: boolean;
  isAiming: boolean;
  isFiring: boolean;
  isSprinting: boolean;
  isCrouching: boolean;
  isGrounded: boolean;
  aimTarget?: [number, number, number];
  muzzlePos?: [number, number, number];
  color: string;
  accentColor: string;
}

export interface WeaponGroundItem {
  id: WeaponId;
  name: string;
  type: WeaponType;
  position: [number, number, number];
  color: string;
  accentColor: string;
  isPickedUp: boolean;
  pickedUpBy: PlayerId | null;
}

export interface BulletTracer {
  id: string;
  origin: [number, number, number];
  target: [number, number, number];
  shooterId: PlayerId;
  hitPlayerId: PlayerId | null;
  timestamp: number;
  color: string;
}

export interface MatchState {
  status: 'playing' | 'ended';
  winner: PlayerId | null;
  eliminationMessage: string | null;
}

export interface HitFeedbackData {
  id: string;
  damage: number;
  isFatal: boolean;
  timestamp: number;
}
