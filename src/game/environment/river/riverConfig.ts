/**
 * River System - Configuration Definitions
 *
 * Standalone, reusable configuration for procedural river waterways.
 * Defines waypoints, localized channel width/depth, flow velocity, water level,
 * bank transitions, and water color palette.
 */

export interface RiverWaypoint {
  x: number;
  z: number;
  width?: number; // Local river surface width (meters)
  depth?: number; // Local bed depth below water level (meters)
}

export interface RiverWaterColor {
  shallow: string; // Near-bank shallow water color
  deep: string;    // Central deep channel color
  highlight: string; // Sun glint and foam crest color
}

export interface RiverConfig {
  id: string;
  name: string;
  waterLevel: number;        // Surface Y elevation (meters)
  defaultWidth: number;      // Nominal river width across water surface
  defaultDepth: number;      // Nominal depth below water level at channel center
  bankWidth: number;         // Width of sloping natural river bank on each side
  flowSpeed: number;         // Surface flow velocity (m/s)
  waypoints: RiverWaypoint[];
  waterColor: RiverWaterColor;
}

/**
 * Default River Configuration for SECTOR-02 Jungle Operations.
 * Naturally winding tropical creek ravine running across the 500m island
 * from Northwest to Southeast, with varying widths and organic bends.
 */
export const SECTOR02_RIVER_CONFIG: RiverConfig = {
  id: 'sector02_jungle_river',
  name: 'Central Creek Ravine River',
  waterLevel: -1.35,
  defaultWidth: 15.0,
  defaultDepth: 2.35,
  bankWidth: 6.5,
  flowSpeed: 0.35,
  waypoints: [
    { x: -225, z: 175, width: 17.0, depth: 2.1 },  // Northwest entrance / estuary
    { x: -180, z: 140, width: 15.2, depth: 2.3 },  // Winding pass between knolls
    { x: -135, z: 105, width: 13.6, depth: 2.5 },  // Narrower swift channel
    { x: -90,  z: 70,  width: 15.8, depth: 2.4 },  // Gentle bend south of Ancient Ruins
    { x: -45,  z: 35,  width: 14.2, depth: 2.3 },  // Approach to center crossing
    { x: 0,    z: 0,   width: 13.8, depth: 2.3 },  // Central valley crossing
    { x: 45,   z: -35, width: 16.2, depth: 2.5 },  // Widening pool past crossing
    { x: 90,   z: -72, width: 17.8, depth: 2.4 },  // Wide lazy meander near Ban Nam
    { x: 135,  z: -108, width: 15.4, depth: 2.4 }, // Curving around farmland knolls
    { x: 180,  z: -142, width: 14.0, depth: 2.5 }, // Approaching southeast valley
    { x: 225,  z: -175, width: 16.8, depth: 2.1 }, // Southeast exit / estuary
  ],
  waterColor: {
    shallow: '#2d6d6a', // Tropical freshwater shallows
    deep: '#0e3448',    // Deep river channel
    highlight: '#8ee0dc',
  },
};

/**
 * Derived spine points for 2D minimap & world object registration
 */
export const SECTOR02_RIVER_SPINE: [number, number][] =
  SECTOR02_RIVER_CONFIG.waypoints.map((w) => [w.x, w.z]);
