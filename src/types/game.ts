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
  isProne: boolean;
  isVaulting: boolean;
  isMantling?: boolean;
  stance: 'standing' | 'crouching' | 'prone' | 'vaulting' | 'mantling';
  vaultProgress?: number; // 0.0 to 1.0 during active vault
  mantleProgress?: number; // 0.0 to 1.0 during active wall climb/mantle
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

export type MapId = 'battle-area' | 'jungle-ops' | 'snow-ops';

export interface MapSchematicObstacle {
  id: string;
  x: number;
  z: number;
  width: number;
  height: number;
  rotation?: number;
  type: 'wall' | 'barrier' | 'bunker' | 'container' | 'building' | 'crate' | 'rock' | 'tree';
  label?: string;
}

export interface MapDefinition {
  id: MapId;
  name: string;
  sectorCode: string;
  tagline: string;
  description: string;
  environmentType: 'industrial' | 'jungle' | 'arctic';
  bounds: { minX: number; maxX: number; minZ: number; maxZ: number };
  playerSpawns: Record<PlayerId, [number, number, number]>;
  playerSpawnRotations?: Record<PlayerId, number>;
  weaponSpawns: Record<WeaponId, [number, number, number]>;
  sky: {
    sunPosition: [number, number, number];
    inclination: number;
    azimuth: number;
    turbidity: number;
    rayleigh: number;
    mieCoefficient: number;
    mieDirectionalG: number;
    fogColor: string;
    fogNear: number;
    fogFar: number;
    ambientColor: string;
    ambientIntensity: number;
    sunColor: string;
    sunIntensity: number;
    skyBounceColor: string;
    skyBounceIntensity: number;
  };
  schematicObstacles: MapSchematicObstacle[];
  sectors: Array<{ label: string; x: number; z: number }>;
  cardGradient: string;
  badgeColor: string;
}
