/**
 * Reusable Water System - Configuration
 *
 * Configurable parameters for procedural water bodies:
 * Rivers, Lakes, Oceans, and Ponds.
 * Independent of specific maps or sectors.
 */

export type WaterType = 'river' | 'lake' | 'ocean' | 'pond';

export interface WaterColors {
  shallow: string;         // Crystal clear shallow edge water (turquoise/teal)
  deep: string;            // Deep water channel absorption (rich navy/deep aqua)
  highlight: string;       // Fresnel grazing angle reflection tint
  sunGlint: string;        // Specular sun highlight
  underwaterFog: string;   // Tidewater-style atmospheric underwater fog color
  causticColor: string;    // Dancing sun caustics web color
}

export interface WaterConfig {
  id: string;
  name: string;
  type: WaterType;
  waterLevel: number;             // Surface Y elevation in world space
  flowSpeed: number;              // Water current speed (m/s)
  waveScale: number;              // Spatial frequency of surface ripples
  waveSpeed: number;              // Animation speed of surface ripples
  waveHeight: number;             // Vertical displacement amplitude
  roughness: number;              // Surface specular roughness
  fresnelPower: number;           // Power for view-angle Fresnel reflectance
  opacity: number;                // Base surface opacity (allows seeing riverbed)
  causticsIntensity: number;      // Intensity of underwater caustics pattern
  underwaterFogNear: number;      // Distance where underwater fog starts (m)
  underwaterFogFar: number;       // Distance where visibility fades into blue (m)
  colors: WaterColors;
}

/**
 * Default Preset: Tropical Freshwater River (e.g. Sector-02 Jungle Creek Ravine)
 * Matches the Tidewater visual target: crystal clear shallows, visible sand/rocks,
 * deep azure underwater atmosphere, sparkling dancing caustics.
 */
export const DEFAULT_RIVER_WATER_CONFIG: WaterConfig = {
  id: 'tropical_freshwater_river',
  name: 'Tropical Freshwater River',
  type: 'river',
  waterLevel: -0.70, // Raised by 0.65 units to match closer to top of mud banks
  flowSpeed: 0.45,
  waveScale: 1.8,
  waveSpeed: 0.8,
  waveHeight: 0.05,
  roughness: 0.08,
  fresnelPower: 3.5,
  opacity: 0.82,
  causticsIntensity: 0.75,
  underwaterFogNear: 1.0,
  underwaterFogFar: 34.0,
  colors: {
    shallow: '#2F858C',
    deep: '#075078',
    highlight: '#69C7D6',
    sunGlint: '#ffffff',     // Specular sun gleam
    underwaterFog: '#084f68', // Tidewater signature cyan-blue volumetric fog
    causticColor: '#80eeff',  // Bright caustic web
  },
};

/**
 * Preset: Tropical Ocean / Lagoon
 */
export const DEFAULT_OCEAN_WATER_CONFIG: WaterConfig = {
  id: 'tropical_ocean',
  name: 'Tropical Ocean Lagoon',
  type: 'ocean',
  waterLevel: 0.0,
  flowSpeed: 0.2,
  waveScale: 1.2,
  waveSpeed: 0.6,
  waveHeight: 0.12,
  roughness: 0.05,
  fresnelPower: 3.8,
  opacity: 0.85,
  causticsIntensity: 0.9,
  underwaterFogNear: 1.5,
  underwaterFogFar: 45.0,
  colors: {
    shallow: '#1cb0a8',
    deep: '#042742',
    highlight: '#a2f5ed',
    sunGlint: '#ffffff',
    underwaterFog: '#06425a',
    causticColor: '#96f5ff',
  },
};

/**
 * Preset: Mountain Lake
 */
export const DEFAULT_LAKE_WATER_CONFIG: WaterConfig = {
  id: 'alpine_lake',
  name: 'Alpine Freshwater Lake',
  type: 'lake',
  waterLevel: 0.0,
  flowSpeed: 0.08,
  waveScale: 1.5,
  waveSpeed: 0.4,
  waveHeight: 0.04,
  roughness: 0.06,
  fresnelPower: 3.2,
  opacity: 0.88,
  causticsIntensity: 0.5,
  underwaterFogNear: 1.0,
  underwaterFogFar: 28.0,
  colors: {
    shallow: '#216365',
    deep: '#0b2633',
    highlight: '#74c4be',
    sunGlint: '#ffffff',
    underwaterFog: '#083344',
    causticColor: '#70d6e3',
  },
};

/**
 * Preset: Forest Pond
 */
export const DEFAULT_POND_WATER_CONFIG: WaterConfig = {
  id: 'forest_pond',
  name: 'Forest Pond',
  type: 'pond',
  waterLevel: 0.0,
  flowSpeed: 0.02,
  waveScale: 2.0,
  waveSpeed: 0.3,
  waveHeight: 0.02,
  roughness: 0.1,
  fresnelPower: 3.0,
  opacity: 0.9,
  causticsIntensity: 0.35,
  underwaterFogNear: 0.8,
  underwaterFogFar: 18.0,
  colors: {
    shallow: '#2d5a48',
    deep: '#0c221a',
    highlight: '#69b08d',
    sunGlint: '#ffffff',
    underwaterFog: '#08261e',
    causticColor: '#5ac796',
  },
};
