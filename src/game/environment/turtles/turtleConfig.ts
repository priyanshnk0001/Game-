/**
 * Aquatic Wildlife - Turtle Swimming System Configuration
 *
 * Standalone, reusable configuration definitions for river aquatic turtles.
 * Follows the clean architecture of the Bird System (birdConfig.ts).
 * Features 4 distinct real 3D turtle species with calibrated underwater
 * kinematics, depths, speeds, flipper rates, and foraging behaviors.
 */

export type TurtleSpeciesId =
  | 'green_turtle'
  | 'kemps_ridley'
  | 'leatherback'
  | 'hawksbill';

export interface TurtleSpeciesConfig {
  id: TurtleSpeciesId;
  name: string;
  modelPath: string;
  scale: number | [number, number, number];
  modelOffset: [number, number, number]; // Centering offset for geometry pivot
  modelRotationOffset?: [number, number, number];
  // Natural cruising speeds (m/s) in water
  speed: { min: number; max: number };
  // Smooth turning rate (rad/s) for natural non-robotic steering
  turnRate: number;
  bankFactor: number;
  pitchFactor: number;
  // Flipper stroke animation speed multiplier
  flipperRate: { min: number; max: number };
  // Preferred depth ratio [0.0 = water surface, 1.0 = riverbed substrate]
  depthRatioRange: { min: number; max: number };
  // Frequency and duration of bottom foraging dives (near riverbed gravel)
  bottomForageInterval: { min: number; max: number }; // Seconds between dives
  bottomForageDuration: { min: number; max: number }; // Seconds spent near gravel
  colorTint?: string;
  description: string;
}

export const DEFAULT_TURTLE_SPECIES: Record<TurtleSpeciesId, TurtleSpeciesConfig> = {
  // 1. Green Sea Turtle - Classic streamlined cruiser with powerful synchronous flipper strokes
  green_turtle: {
    id: 'green_turtle',
    name: 'Green River Turtle (Chelonia mydas)',
    modelPath: '/assets/environment/river/turtles/green_turtle.glb',
    scale: 0.38,
    modelOffset: [0, -1.35, -0.07],
    speed: { min: 0.28, max: 0.48 },
    turnRate: 0.42,
    bankFactor: 0.28,
    pitchFactor: 0.35,
    flipperRate: { min: 0.85, max: 1.25 },
    depthRatioRange: { min: 0.35, max: 0.75 },
    bottomForageInterval: { min: 18, max: 35 },
    bottomForageDuration: { min: 7, max: 14 },
    description: 'Graceful mid-depth river cruiser with powerful synchronous flipper strokes',
  },

  // 2. Kemp's Ridley Turtle - Compact, agile bottom explorer with intricate shell
  kemps_ridley: {
    id: 'kemps_ridley',
    name: "Kemp's Ridley River Turtle (Lepidochelys kempii)",
    modelPath: '/assets/environment/river/turtles/kemps_ridley.glb',
    scale: 2.2,
    modelOffset: [0, -0.03, -0.04],
    modelRotationOffset: [0, Math.PI, 0], // Reverses -Z model orientation to +Z forward
    speed: { min: 0.22, max: 0.38 },
    turnRate: 0.50,
    bankFactor: 0.22,
    pitchFactor: 0.30,
    flipperRate: { min: 0.90, max: 1.30 },
    depthRatioRange: { min: 0.55, max: 0.88 }, // Prefers deeper water near riverbed
    bottomForageInterval: { min: 14, max: 26 },
    bottomForageDuration: { min: 10, max: 18 },
    description: 'Active bottom forager frequently browsing riverbed pebbles and aquatic grass',
  },

  // 3. Leatherback River Cruiser - Majestic heavy-bodied gentle giant
  leatherback: {
    id: 'leatherback',
    name: 'Leatherback River Cruiser (Dermochelys coriacea)',
    modelPath: '/assets/environment/river/turtles/leatherback.glb',
    scale: 0.20,
    modelOffset: [0.06, 1.60, 6.68],
    speed: { min: 0.20, max: 0.34 },
    turnRate: 0.32,
    bankFactor: 0.18,
    pitchFactor: 0.25,
    flipperRate: { min: 0.70, max: 1.05 },
    depthRatioRange: { min: 0.28, max: 0.65 },
    bottomForageInterval: { min: 25, max: 45 },
    bottomForageDuration: { min: 6, max: 12 },
    description: 'Slow, dignified cruiser with expansive paddle reach in the river channel',
  },

  // 4. Hawksbill River Turtle - Warm amber mottled carapace, agile diver
  hawksbill: {
    id: 'hawksbill',
    name: 'Hawksbill River Turtle (Eretmochelys imbricata)',
    modelPath: '/assets/environment/river/turtles/hawksbill.glb',
    scale: [0.31, 0.31, 0.34],
    modelOffset: [0, -1.35, -0.07],
    speed: { min: 0.30, max: 0.50 },
    turnRate: 0.46,
    bankFactor: 0.30,
    pitchFactor: 0.38,
    flipperRate: { min: 0.95, max: 1.35 },
    depthRatioRange: { min: 0.25, max: 0.70 },
    bottomForageInterval: { min: 16, max: 32 },
    bottomForageDuration: { min: 8, max: 15 },
    colorTint: '#cf9842',
    description: 'Agile diver cruising along sunken riverbed logs and stone shelves',
  },
};

export interface TurtleIndividualSpec {
  species: TurtleSpeciesId;
  initialProgress?: number; // 0 to 1 along river length
  direction?: number;       // 1: downstream, -1: upstream
}

export interface TurtleSystemConfig {
  enabled: boolean;
  turtles: TurtleIndividualSpec[];
}

export const DEFAULT_TURTLE_CONFIG: TurtleSystemConfig = {
  enabled: true,
  turtles: [
    // --- Sector 1: Upstream Northwest Reach (0.10 - 0.35) ---
    { species: 'hawksbill', initialProgress: 0.14, direction: 1 },
    { species: 'green_turtle', initialProgress: 0.18, direction: -1 },
    { species: 'kemps_ridley', initialProgress: 0.25, direction: 1 },
    { species: 'leatherback', initialProgress: 0.32, direction: -1 },

    // --- Sector 2: Upper Central Approach (0.35 - 0.48) ---
    { species: 'kemps_ridley', initialProgress: 0.38, direction: 1 },
    { species: 'hawksbill', initialProgress: 0.42, direction: -1 },
    { species: 'green_turtle', initialProgress: 0.46, direction: 1 },
    { species: 'leatherback', initialProgress: 0.49, direction: -1 },

    // --- Sector 3: Central River & Pool (0.50 - 0.65) --- Right where player operates
    { species: 'leatherback', initialProgress: 0.52, direction: 1 },
    { species: 'kemps_ridley', initialProgress: 0.55, direction: -1 },
    { species: 'hawksbill', initialProgress: 0.58, direction: 1 },
    { species: 'green_turtle', initialProgress: 0.62, direction: -1 },

    // --- Sector 4: Lower Central & Farmland Reach (0.66 - 0.78) ---
    { species: 'kemps_ridley', initialProgress: 0.68, direction: 1 },
    { species: 'leatherback', initialProgress: 0.74, direction: -1 },
    { species: 'hawksbill', initialProgress: 0.78, direction: 1 },

    // --- Sector 5: Downstream Southeast Estuary (0.79 - 0.92) ---
    { species: 'green_turtle', initialProgress: 0.82, direction: -1 },
    { species: 'hawksbill', initialProgress: 0.86, direction: 1 },
    { species: 'leatherback', initialProgress: 0.89, direction: -1 },
  ],
};
