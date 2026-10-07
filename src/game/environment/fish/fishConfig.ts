/**
 * Freshwater Fish Wildlife System - Configuration
 *
 * Standalone, reusable configuration definitions for river aquatic fauna.
 * Architecture mirrors the bird system (birdConfig.ts) with species specifications,
 * calibrated swimming kinematics, schooling formations, and depth preferences.
 */

export type FishSpeciesId =
  | 'barramundi'
  | 'rainbow_trout'
  | 'jikin_carp'
  | 'tosakin_carp'
  | 'silver_minnow'
  | 'golden_dace';

export interface FishSpeciesConfig {
  id: FishSpeciesId;
  name: string;
  modelPath: string;
  scale: number;
  // Noticeably relaxed swimming speeds (m/s) for calm natural freshwater movement
  speed: { min: number; max: number };
  // Smooth turning rate (rad/s) ensuring gradual, non-robotic direction changes
  turnRate: number;
  // Subtle roll banking during curved swimming arcs
  bankFactor: number;
  bodyPitchFactor: number;
  // Tail / fin swimming undulation cadence (Hz)
  swimFreq: { min: number; max: number };
  depthPreference: 'bottom' | 'mid' | 'surface' | 'all';
  // Preferred depth ratio [0.0 = water surface, 1.0 = riverbed substrate]
  depthRatioRange: { min: number; max: number };
  colorTint?: string;
  modelRotationOffset?: [number, number, number]; // Rotational correction so mouth/head points along -Z
  schoolSize: { min: number; max: number };
  formationSpread: { lateral: number; longitudinal: number; vertical: number };
}

export const DEFAULT_FISH_SPECIES: Record<FishSpeciesId, FishSpeciesConfig> = {
  // 1. Barramundi River Predator - Large solitary adult cruising deep riverbed gravel (~45cm)
  barramundi: {
    id: 'barramundi',
    name: 'Barramundi River Predator',
    modelPath: '/assets/environment/river/fish/river_fish.glb',
    scale: 0.70,
    speed: { min: 0.35, max: 0.60 },
    turnRate: 0.45, // Slow, dignified steering turns
    bankFactor: 0.25,
    bodyPitchFactor: 0.08,
    swimFreq: { min: 4.5, max: 6.0 },
    depthPreference: 'bottom',
    depthRatioRange: { min: 0.70, max: 0.90 }, // 10-25cm above gravel
    schoolSize: { min: 1, max: 2 },
    formationSpread: { lateral: 1.5, longitudinal: 2.0, vertical: 0.25 },
  },

  // 2. Rainbow River Trout - Athletic mid-water column cruiser (~34cm)
  rainbow_trout: {
    id: 'rainbow_trout',
    name: 'Rainbow River Trout',
    modelPath: '/assets/environment/river/fish/fish_animated.glb',
    scale: 0.14,
    modelRotationOffset: [0, Math.PI, 0], // Reverses +Z model orientation to -Z forward
    speed: { min: 0.45, max: 0.75 },
    turnRate: 0.65,
    bankFactor: 0.35,
    bodyPitchFactor: 0.12,
    swimFreq: { min: 5.5, max: 7.2 },
    depthPreference: 'mid',
    depthRatioRange: { min: 0.35, max: 0.65 },
    colorTint: '#a0e4dc',
    schoolSize: { min: 3, max: 5 },
    formationSpread: { lateral: 1.2, longitudinal: 1.4, vertical: 0.25 },
  },

  // 3. Jikin Butterfly Carp - Elegant river pool dweller with broad fin movements (~24cm)
  jikin_carp: {
    id: 'jikin_carp',
    name: 'Jikin Butterfly Carp',
    modelPath: '/assets/environment/river/fish/jikin_goldfish.glb',
    scale: 0.018,
    modelRotationOffset: [0, Math.PI, 0], // Reverses +Z model orientation to -Z forward
    speed: { min: 0.28, max: 0.48 },
    turnRate: 0.52,
    bankFactor: 0.22,
    bodyPitchFactor: 0.07,
    swimFreq: { min: 3.8, max: 5.2 },
    depthPreference: 'mid',
    depthRatioRange: { min: 0.40, max: 0.75 },
    schoolSize: { min: 2, max: 4 },
    formationSpread: { lateral: 1.0, longitudinal: 1.2, vertical: 0.20 },
  },

  // 4. Tosakin Curled Carp - Gentle bottom browser near riverbed rocks (~22cm)
  tosakin_carp: {
    id: 'tosakin_carp',
    name: 'Tosakin Curled Carp',
    modelPath: '/assets/environment/river/fish/tosakin_goldfish.glb',
    scale: 0.009,
    modelRotationOffset: [0, Math.PI, 0], // Reverses +Z model orientation to -Z forward
    speed: { min: 0.25, max: 0.42 },
    turnRate: 0.48,
    bankFactor: 0.20,
    bodyPitchFactor: 0.06,
    swimFreq: { min: 3.5, max: 4.8 },
    depthPreference: 'bottom',
    depthRatioRange: { min: 0.65, max: 0.88 },
    schoolSize: { min: 2, max: 3 },
    formationSpread: { lateral: 1.0, longitudinal: 1.2, vertical: 0.20 },
  },

  // 5. Silver River Minnow - Small schooling fish darting gracefully near shallows (~10cm)
  silver_minnow: {
    id: 'silver_minnow',
    name: 'Silver River Minnow',
    modelPath: '/assets/environment/river/fish/river_fish.glb',
    scale: 0.15,
    speed: { min: 0.40, max: 0.68 },
    turnRate: 0.85,
    bankFactor: 0.40,
    bodyPitchFactor: 0.14,
    swimFreq: { min: 7.2, max: 9.0 },
    depthPreference: 'surface',
    depthRatioRange: { min: 0.20, max: 0.50 },
    colorTint: '#b2d8e8',
    schoolSize: { min: 5, max: 8 },
    formationSpread: { lateral: 0.65, longitudinal: 0.85, vertical: 0.18 },
  },

  // 6. Golden Freshwater Dace - Medium-bodied schooling fish in mid-water (~18cm)
  golden_dace: {
    id: 'golden_dace',
    name: 'Golden River Dace',
    modelPath: '/assets/environment/river/fish/river_fish.glb',
    scale: 0.28,
    speed: { min: 0.32, max: 0.55 },
    turnRate: 0.60,
    bankFactor: 0.30,
    bodyPitchFactor: 0.10,
    swimFreq: { min: 5.8, max: 7.5 },
    depthPreference: 'all',
    depthRatioRange: { min: 0.30, max: 0.70 },
    colorTint: '#d8b672',
    schoolSize: { min: 3, max: 6 },
    formationSpread: { lateral: 0.9, longitudinal: 1.1, vertical: 0.22 },
  },
};

export interface FishSchoolSpec {
  species: FishSpeciesId;
  size?: number;
  initialProgress?: number; // 0 to 1 along river spline
  direction?: 1 | -1;       // 1: downstream, -1: upstream
}

export interface FishSystemConfig {
  enabled: boolean;
  schools: FishSchoolSpec[];
  maxVisibleDistance: number;
}

export const DEFAULT_FISH_CONFIG: FishSystemConfig = {
  enabled: true,
  schools: [
    // --- Sector 1: Upstream Northwest Reach (0.10 - 0.35) ---
    { species: 'silver_minnow', size: 8, initialProgress: 0.12, direction: 1 },
    { species: 'barramundi', size: 1, initialProgress: 0.16, direction: 1 },
    { species: 'rainbow_trout', size: 5, initialProgress: 0.20, direction: -1 },
    { species: 'golden_dace', size: 6, initialProgress: 0.24, direction: 1 },
    { species: 'jikin_carp', size: 3, initialProgress: 0.28, direction: -1 },
    { species: 'tosakin_carp', size: 4, initialProgress: 0.32, direction: 1 },

    // --- Sector 2: Upper Central Approach (0.35 - 0.48) ---
    { species: 'barramundi', size: 1, initialProgress: 0.36, direction: -1 },
    { species: 'silver_minnow', size: 9, initialProgress: 0.38, direction: 1 },
    { species: 'golden_dace', size: 7, initialProgress: 0.41, direction: -1 },
    { species: 'tosakin_carp', size: 4, initialProgress: 0.43, direction: 1 },
    { species: 'rainbow_trout', size: 5, initialProgress: 0.45, direction: -1 },
    { species: 'jikin_carp', size: 4, initialProgress: 0.47, direction: 1 },
    { species: 'silver_minnow', size: 8, initialProgress: 0.48, direction: -1 },

    // --- Sector 3: Central River & Crossing Pool (0.49 - 0.62) --- Right where player operates
    { species: 'barramundi', size: 1, initialProgress: 0.50, direction: 1 },
    { species: 'golden_dace', size: 7, initialProgress: 0.51, direction: -1 },
    { species: 'silver_minnow', size: 10, initialProgress: 0.53, direction: 1 },
    { species: 'tosakin_carp', size: 4, initialProgress: 0.55, direction: -1 },
    { species: 'rainbow_trout', size: 5, initialProgress: 0.57, direction: 1 },
    { species: 'jikin_carp', size: 4, initialProgress: 0.59, direction: -1 },
    { species: 'golden_dace', size: 6, initialProgress: 0.60, direction: 1 },
    { species: 'silver_minnow', size: 9, initialProgress: 0.61, direction: -1 },
    { species: 'barramundi', size: 1, initialProgress: 0.62, direction: -1 },

    // --- Sector 4: Lower Central & Farmland Curve (0.63 - 0.78) ---
    { species: 'jikin_carp', size: 4, initialProgress: 0.64, direction: 1 },
    { species: 'rainbow_trout', size: 5, initialProgress: 0.66, direction: -1 },
    { species: 'golden_dace', size: 7, initialProgress: 0.68, direction: 1 },
    { species: 'silver_minnow', size: 8, initialProgress: 0.71, direction: -1 },
    { species: 'tosakin_carp', size: 4, initialProgress: 0.73, direction: 1 },
    { species: 'barramundi', size: 1, initialProgress: 0.76, direction: 1 },
    { species: 'rainbow_trout', size: 5, initialProgress: 0.78, direction: -1 },

    // --- Sector 5: Downstream Southeast Estuary (0.79 - 0.92) ---
    { species: 'golden_dace', size: 6, initialProgress: 0.81, direction: 1 },
    { species: 'jikin_carp', size: 3, initialProgress: 0.84, direction: -1 },
    { species: 'silver_minnow', size: 8, initialProgress: 0.87, direction: 1 },
    { species: 'barramundi', size: 1, initialProgress: 0.89, direction: -1 },
    { species: 'rainbow_trout', size: 4, initialProgress: 0.91, direction: 1 },
  ],
  maxVisibleDistance: 140,
};
