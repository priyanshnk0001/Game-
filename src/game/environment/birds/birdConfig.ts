/**
 * Bird Flying Animation System - Configuration
 *
 * Standalone, reusable configuration definitions for aerial avian wildlife.
 * Models: Official Three.js / Google Data Arts CC-BY 3.0 permissive avian models
 * (Parrot, Flamingo, Stork) with morphological wing-stroke animations.
 */

export type BirdSpeciesId = 'parrot' | 'stork' | 'flamingo';

export interface BirdSpeciesConfig {
  id: BirdSpeciesId;
  name: string;
  modelPath: string;
  scale: number;
  speed: { min: number; max: number };
  altitude: { min: number; max: number };
  flapSpeed: { min: number; max: number };
  glideRatio: number;
  flapDuration: { min: number; max: number };
  glideDuration: { min: number; max: number };
  flockSize: { min: number; max: number };
  formationSpread: { lateral: number; longitudinal: number; vertical: number };
  bankFactor: number;
  maxBank: number;
  turnRate: number;
  bodyBob: number;
}

export const DEFAULT_BIRD_SPECIES: Record<BirdSpeciesId, BirdSpeciesConfig> = {
  // 1. Tropical Rainforest Parrots - Fast, agile flutterers just above emergent canopy
  parrot: {
    id: 'parrot',
    name: 'Tropical Macaw / Parrot',
    modelPath: '/models/birds/Parrot.glb',
    scale: 0.024,
    speed: { min: 14.0, max: 18.5 },
    altitude: { min: 24.0, max: 42.0 },
    flapSpeed: { min: 1.8, max: 2.4 },
    glideRatio: 0.25,
    flapDuration: { min: 3.5, max: 6.0 },
    glideDuration: { min: 1.0, max: 2.2 },
    flockSize: { min: 2, max: 4 },
    formationSpread: { lateral: 4.8, longitudinal: 5.5, vertical: 1.2 },
    bankFactor: 1.4,
    maxBank: 0.65, // ~37 degrees
    turnRate: 0.75,
    bodyBob: 0.14,
  },

  // 2. High-Soaring Storks / Herons - Majestic thermal soarers with long graceful glides
  stork: {
    id: 'stork',
    name: 'Jungle Stork / Heron',
    modelPath: '/models/birds/Stork.glb',
    scale: 0.025,
    speed: { min: 10.5, max: 14.0 },
    altitude: { min: 55.0, max: 92.0 },
    flapSpeed: { min: 0.95, max: 1.25 },
    glideRatio: 0.65,
    flapDuration: { min: 2.8, max: 4.8 },
    glideDuration: { min: 4.5, max: 9.0 },
    flockSize: { min: 2, max: 4 },
    formationSpread: { lateral: 8.5, longitudinal: 9.5, vertical: 1.5 },
    bankFactor: 0.95,
    maxBank: 0.45, // ~26 degrees
    turnRate: 0.38,
    bodyBob: 0.08,
  },

  // 3. Flocking Flamingos / Cranes - Synchronous formation cruisers at mid-altitude
  flamingo: {
    id: 'flamingo',
    name: 'Coastal Flamingo / Crane',
    modelPath: '/models/birds/Flamingo.glb',
    scale: 0.026,
    speed: { min: 12.0, max: 15.5 },
    altitude: { min: 36.0, max: 64.0 },
    flapSpeed: { min: 1.3, max: 1.65 },
    glideRatio: 0.40,
    flapDuration: { min: 4.0, max: 7.2 },
    glideDuration: { min: 2.2, max: 4.8 },
    flockSize: { min: 3, max: 5 },
    formationSpread: { lateral: 6.8, longitudinal: 7.8, vertical: 1.0 },
    bankFactor: 1.15,
    maxBank: 0.52, // ~30 degrees
    turnRate: 0.48,
    bodyBob: 0.12,
  },
};

export interface BirdFlockSpec {
  species: BirdSpeciesId;
  size?: number;
  initialCenter?: [number, number, number];
}

export interface BirdSystemConfig {
  enabled: boolean;
  spawnBounds: {
    minX: number;
    maxX: number;
    minZ: number;
    maxZ: number;
  };
  flocks: BirdFlockSpec[];
  maxVisibleDistance: number;
  lodDistance: number;
}

export const DEFAULT_BIRD_CONFIG: BirdSystemConfig = {
  enabled: true,
  spawnBounds: {
    minX: -280,
    maxX: 280,
    minZ: -280,
    maxZ: 280,
  },
  flocks: [
    { species: 'parrot', size: 3 },
    { species: 'parrot', size: 3 },
    { species: 'stork', size: 3 },
    { species: 'stork', size: 2 },
    { species: 'flamingo', size: 4 },
  ],
  maxVisibleDistance: 650,
  lodDistance: 320,
};
