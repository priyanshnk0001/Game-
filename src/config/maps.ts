// Multi-Map Configuration & Definitions for Tactical Shooter

import { MapDefinition, MapId } from '../types/game';
import { CollisionBox } from '../game/collision/CollisionWorld';

export const BATTLE_AREA_OBSTACLES: CollisionBox[] = [
  // 1. Concrete Perimeter Walls (56m x 4m x 0.8m)
  { id: 'perim_north', position: [0, 2.0, -28], size: [56, 4.0, 0.8], rotationY: 0, type: 'wall' },
  { id: 'perim_south', position: [0, 2.0, 28], size: [56, 4.0, 0.8], rotationY: 0, type: 'wall' },
  { id: 'perim_west', position: [-28, 2.0, 0], size: [0.8, 4.0, 56], rotationY: 0, type: 'wall' },
  { id: 'perim_east', position: [28, 2.0, 0], size: [0.8, 4.0, 56], rotationY: 0, type: 'wall' },

  // 2. Concrete Jersey Barriers (Width 3.2m, Height 1.05m, Depth 0.65m)
  { id: 'jersey_center_north', position: [0, 0.525, -3.2], size: [3.2, 1.05, 0.65], rotationY: 0, type: 'barrier' },
  { id: 'jersey_center_south', position: [0, 0.525, 3.2], size: [3.2, 1.05, 0.65], rotationY: 0, type: 'barrier' },
  { id: 'jersey_diag_nw', position: [-6.5, 0.525, 8.5], size: [3.2, 1.05, 0.65], rotationY: Math.PI / 4, type: 'barrier' },
  { id: 'jersey_diag_se', position: [6.5, 0.525, -8.5], size: [3.2, 1.05, 0.65], rotationY: Math.PI / 4, type: 'barrier' },
  { id: 'jersey_diag_ne', position: [-10.5, 0.525, -4.5], size: [3.2, 1.05, 0.65], rotationY: -Math.PI / 6, type: 'barrier' },
  { id: 'jersey_diag_sw', position: [10.5, 0.525, 4.5], size: [3.2, 1.05, 0.65], rotationY: -Math.PI / 6, type: 'barrier' },

  // 3. Sandbag Fortified Positions (Width 2.6m, Height 1.05m, Depth 0.8m)
  { id: 'sandbag_mid_left', position: [-4.5, 0.525, 1.5], size: [2.6, 1.05, 0.8], rotationY: Math.PI / 2, type: 'bunker' },
  { id: 'sandbag_mid_right', position: [4.5, 0.525, -1.5], size: [2.6, 1.05, 0.8], rotationY: -Math.PI / 2, type: 'bunker' },
  { id: 'sandbag_flank_left', position: [-12, 0.525, 6], size: [2.6, 1.05, 0.8], rotationY: 0, type: 'bunker' },
  { id: 'sandbag_flank_right', position: [12, 0.525, -6], size: [2.6, 1.05, 0.8], rotationY: 0, type: 'bunker' },

  // 4. Military Shipping Containers (Length 6.5m, Height 2.6m, Width 2.5m)
  { id: 'container_alpha', position: [-9, 1.3, -9], size: [6.5, 2.6, 2.5], rotationY: 0.2, type: 'container' },
  { id: 'container_bravo', position: [9, 1.3, 9], size: [6.5, 2.6, 2.5], rotationY: -0.2, type: 'container' },

  // 5. Command Bunker Shoot House (Mid-Left, Base at [-16, 0, -14])
  { id: 'bunker1_back_wall', position: [-16, 1.8, -14], size: [7.5, 3.6, 0.6], rotationY: 0, type: 'building' },
  { id: 'bunker1_left_wall', position: [-19.45, 1.8, -10.5], size: [0.6, 3.6, 7.0], rotationY: 0, type: 'building' },
  { id: 'bunker1_right_wall', position: [-12.55, 1.8, -10.5], size: [0.6, 3.6, 7.0], rotationY: 0, type: 'building' },
  { id: 'bunker1_roof', position: [-16, 3.75, -10.5], size: [8.0, 0.4, 7.6], rotationY: 0, type: 'building' },

  // 6. Observation Shoot House (Mid-Right, Base at [16, 0, 14])
  { id: 'bunker2_back_wall', position: [16, 1.8, 14], size: [7.5, 3.6, 0.6], rotationY: 0, type: 'building' },
  { id: 'bunker2_right_wall', position: [19.45, 1.8, 10.5], size: [0.6, 3.6, 7.0], rotationY: 0, type: 'building' },
  { id: 'bunker2_left_wall', position: [12.55, 1.8, 10.5], size: [0.6, 3.6, 7.0], rotationY: 0, type: 'building' },
  { id: 'bunker2_roof', position: [16, 3.75, 10.5], size: [8.0, 0.4, 7.6], rotationY: 0, type: 'building' },

  // 7. Military Ammo Crate Stacks
  { id: 'crates_center', position: [0, 0.65, 0], size: [1.5, 1.3, 1.1], rotationY: 0, type: 'crate' },
  { id: 'crates_flank_1', position: [-3.5, 0.65, 7.5], size: [1.5, 1.3, 1.1], rotationY: 0, type: 'crate' },
  { id: 'crates_flank_2', position: [3.5, 0.65, -7.5], size: [1.5, 1.3, 1.1], rotationY: 0, type: 'crate' },

  // 8. Industrial Light Tower Poles
  { id: 'tower_nw', position: [-24, 3.5, -24], size: [0.5, 7.0, 0.5], rotationY: 0, type: 'pillar' },
  { id: 'tower_ne', position: [24, 3.5, -24], size: [0.5, 7.0, 0.5], rotationY: 0, type: 'pillar' },
  { id: 'tower_sw', position: [-24, 3.5, 24], size: [0.5, 7.0, 0.5], rotationY: 0, type: 'pillar' },
  { id: 'tower_se', position: [24, 3.5, 24], size: [0.5, 7.0, 0.5], rotationY: 0, type: 'pillar' },
];

export const JUNGLE_OPS_OBSTACLES: CollisionBox[] = [
  // 1. Outer Perimeter Palisades (56m x 3.8m x 0.8m)
  { id: 'jungle_perim_n', position: [0, 1.9, -28], size: [56, 3.8, 0.8], rotationY: 0, type: 'wall' },
  { id: 'jungle_perim_s', position: [0, 1.9, 28], size: [56, 3.8, 0.8], rotationY: 0, type: 'wall' },
  { id: 'jungle_perim_w', position: [-28, 1.9, 0], size: [0.8, 3.8, 56], rotationY: 0, type: 'wall' },
  { id: 'jungle_perim_e', position: [28, 1.9, 0], size: [0.8, 3.8, 56], rotationY: 0, type: 'wall' },

  // 2. Central Moss Ruins & Stone Pillars
  { id: 'jungle_shrine_base', position: [0, 0.6, 0], size: [5.0, 1.2, 5.0], rotationY: 0.1, type: 'bunker' },
  { id: 'jungle_ruin_pillar_nw', position: [-2.0, 2.0, -2.0], size: [0.9, 4.0, 0.9], rotationY: 0, type: 'pillar' },
  { id: 'jungle_ruin_pillar_se', position: [2.0, 2.0, 2.0], size: [0.9, 4.0, 0.9], rotationY: 0, type: 'pillar' },
  { id: 'jungle_ruin_arch', position: [0, 3.8, 0], size: [5.2, 0.6, 1.2], rotationY: 0.785, type: 'building' },

  // 3. Massive Jungle Boulders
  { id: 'jungle_boulder_nw', position: [-10, 1.4, -10], size: [4.2, 2.8, 3.8], rotationY: 0.4, type: 'rock' },
  { id: 'jungle_boulder_se', position: [10, 1.4, 10], size: [4.4, 2.8, 4.0], rotationY: -0.3, type: 'rock' },
  { id: 'jungle_boulder_ne', position: [11, 1.2, -9], size: [3.6, 2.4, 3.4], rotationY: 0.8, type: 'rock' },
  { id: 'jungle_boulder_sw', position: [-11, 1.2, 9], size: [3.8, 2.4, 3.6], rotationY: -0.6, type: 'rock' },

  // 4. Fallen Hardwood Tree Trunks (Barriers)
  { id: 'jungle_log_center_n', position: [0, 0.5, -6.5], size: [6.8, 1.0, 1.2], rotationY: 0.15, type: 'barrier' },
  { id: 'jungle_log_center_s', position: [0, 0.5, 6.5], size: [6.8, 1.0, 1.2], rotationY: -0.15, type: 'barrier' },
  { id: 'jungle_log_flank_w', position: [-7.5, 0.5, 1.5], size: [5.4, 1.0, 1.1], rotationY: 1.4, type: 'barrier' },
  { id: 'jungle_log_flank_e', position: [7.5, 0.5, -1.5], size: [5.4, 1.0, 1.1], rotationY: 1.4, type: 'barrier' },

  // 5. Wooden Palisade Stockades & Watchtowers
  { id: 'jungle_tower_w', position: [-17, 2.5, -12], size: [4.5, 5.0, 4.5], rotationY: 0.1, type: 'building' },
  { id: 'jungle_tower_e', position: [17, 2.5, 12], size: [4.5, 5.0, 4.5], rotationY: -0.1, type: 'building' },
  { id: 'jungle_stockade_nw', position: [-16, 1.1, 0], size: [1.0, 2.2, 6.0], rotationY: 0, type: 'wall' },
  { id: 'jungle_stockade_se', position: [16, 1.1, 0], size: [1.0, 2.2, 6.0], rotationY: 0, type: 'wall' },

  // 6. Forest Pine/Palm Trunks (Solid Colliders)
  { id: 'jungle_tree_1', position: [-20, 3.0, -20], size: [1.0, 6.0, 1.0], rotationY: 0, type: 'tree' },
  { id: 'jungle_tree_2', position: [20, 3.0, -20], size: [1.0, 6.0, 1.0], rotationY: 0, type: 'tree' },
  { id: 'jungle_tree_3', position: [-20, 3.0, 20], size: [1.0, 6.0, 1.0], rotationY: 0, type: 'tree' },
  { id: 'jungle_tree_4', position: [20, 3.0, 20], size: [1.0, 6.0, 1.0], rotationY: 0, type: 'tree' },
  { id: 'jungle_tree_5', position: [-4, 3.0, -18], size: [0.9, 6.0, 0.9], rotationY: 0, type: 'tree' },
  { id: 'jungle_tree_6', position: [4, 3.0, 18], size: [0.9, 6.0, 0.9], rotationY: 0, type: 'tree' },

  // 7. Tactical Gear Cache Crate Stacks
  { id: 'jungle_cache_center', position: [-1.2, 0.5, 2.5], size: [1.6, 1.0, 1.2], rotationY: 0.3, type: 'crate' },
  { id: 'jungle_cache_flank', position: [1.2, 0.5, -2.5], size: [1.6, 1.0, 1.2], rotationY: -0.3, type: 'crate' },
];

export const SNOW_OPS_OBSTACLES: CollisionBox[] = [
  // 1. Arctic Compound Blast Perimeter Walls
  { id: 'snow_perim_n', position: [0, 2.0, -28], size: [56, 4.0, 0.9], rotationY: 0, type: 'wall' },
  { id: 'snow_perim_s', position: [0, 2.0, 28], size: [56, 4.0, 0.9], rotationY: 0, type: 'wall' },
  { id: 'snow_perim_w', position: [-28, 2.0, 0], size: [0.9, 4.0, 56], rotationY: 0, type: 'wall' },
  { id: 'snow_perim_e', position: [28, 2.0, 0], size: [0.9, 4.0, 56], rotationY: 0, type: 'wall' },

  // 2. Arctic Research Station Bunkers
  { id: 'snow_bunker_west', position: [-16, 2.0, -12], size: [8.5, 4.0, 7.5], rotationY: 0, type: 'building' },
  { id: 'snow_bunker_east', position: [16, 2.0, 12], size: [8.5, 4.0, 7.5], rotationY: 0, type: 'building' },

  // 3. Frosted Military Shipping Containers
  { id: 'snow_container_alpha', position: [-8, 1.3, 8], size: [6.5, 2.6, 2.5], rotationY: -0.35, type: 'container' },
  { id: 'snow_container_bravo', position: [8, 1.3, -8], size: [6.5, 2.6, 2.5], rotationY: 0.35, type: 'container' },
  { id: 'snow_container_center', position: [-1, 1.3, 10], size: [6.0, 2.6, 2.4], rotationY: 1.57, type: 'container' },

  // 4. Sub-Zero Concrete Blast Barriers & Snow Berms
  { id: 'snow_berm_center_n', position: [0, 0.6, -3.5], size: [3.8, 1.2, 1.2], rotationY: 0, type: 'barrier' },
  { id: 'snow_berm_center_s', position: [0, 0.6, 3.5], size: [3.8, 1.2, 1.2], rotationY: 0, type: 'barrier' },
  { id: 'snow_barrier_nw', position: [-7.5, 0.6, -6.5], size: [3.4, 1.2, 0.8], rotationY: 0.7, type: 'barrier' },
  { id: 'snow_barrier_se', position: [7.5, 0.6, 6.5], size: [3.4, 1.2, 0.8], rotationY: 0.7, type: 'barrier' },
  { id: 'snow_barrier_ne', position: [11, 0.6, -2], size: [3.6, 1.2, 0.8], rotationY: 1.57, type: 'barrier' },
  { id: 'snow_barrier_sw', position: [-11, 0.6, 2], size: [3.6, 1.2, 0.8], rotationY: 1.57, type: 'barrier' },

  // 5. Alpine Pine Trees (Solid Trunks)
  { id: 'snow_pine_1', position: [-22, 3.5, -22], size: [1.0, 7.0, 1.0], rotationY: 0, type: 'tree' },
  { id: 'snow_pine_2', position: [22, 3.5, -22], size: [1.0, 7.0, 1.0], rotationY: 0, type: 'tree' },
  { id: 'snow_pine_3', position: [-22, 3.5, 22], size: [1.0, 7.0, 1.0], rotationY: 0, type: 'tree' },
  { id: 'snow_pine_4', position: [22, 3.5, 22], size: [1.0, 7.0, 1.0], rotationY: 0, type: 'tree' },
  { id: 'snow_pine_5', position: [-6, 3.5, -18], size: [0.9, 7.0, 0.9], rotationY: 0, type: 'tree' },
  { id: 'snow_pine_6', position: [6, 3.5, 18], size: [0.9, 7.0, 0.9], rotationY: 0, type: 'tree' },

  // 6. Frozen Supply Crates & Pallets
  { id: 'snow_crates_center', position: [0, 0.65, 0], size: [1.6, 1.3, 1.2], rotationY: 0.2, type: 'crate' },
  { id: 'snow_crates_west', position: [-3.8, 0.65, 6.5], size: [1.5, 1.3, 1.1], rotationY: -0.1, type: 'crate' },
  { id: 'snow_crates_east', position: [3.8, 0.65, -6.5], size: [1.5, 1.3, 1.1], rotationY: 0.1, type: 'crate' },
];

export const MAPS: Record<MapId, MapDefinition> = {
  'battle-area': {
    id: 'battle-area',
    name: 'Battle Area',
    sectorCode: 'SECTOR-01',
    tagline: 'Industrial Combat Grounds',
    description:
      'Heavy urban tactical facility equipped with reinforced concrete jersey barriers, dual shipping containers, fortified sandbag bunkers, and tactical shoot houses.',
    environmentType: 'industrial',
    bounds: { minX: -27.6, maxX: 27.6, minZ: -27.6, maxZ: 27.6 },
    playerSpawns: {
      player1: [-14, 0, 0],
      player2: [14, 0, 0],
    },
    playerSpawnRotations: {
      player1: 0,
      player2: Math.PI,
    },
    weaponSpawns: {
      gun1: [-5, 0.5, 5],
      gun2: [5, 0.5, -5],
    },
    sky: {
      sunPosition: [35, 45, 25],
      inclination: 0.55,
      azimuth: 0.25,
      turbidity: 8,
      rayleigh: 1.2,
      mieCoefficient: 0.005,
      mieDirectionalG: 0.8,
      fogColor: '#1c212a',
      fogNear: 25,
      fogFar: 80,
      ambientColor: '#8fa3b5',
      ambientIntensity: 0.55,
      sunColor: '#fff5e6',
      sunIntensity: 1.75,
      skyBounceColor: '#70889e',
      skyBounceIntensity: 0.35,
    },
    schematicObstacles: [
      { id: 'bunker_1', x: -16, z: -10.5, width: 8, height: 7.6, type: 'building', label: 'COMMAND BUNKER' },
      { id: 'bunker_2', x: 16, z: 10.5, width: 8, height: 7.6, type: 'building', label: 'OBSERVATION POST' },
      { id: 'cont_alpha', x: -9, z: -9, width: 6.5, height: 2.5, rotation: 0.2, type: 'container', label: 'CONTAINER A' },
      { id: 'cont_bravo', x: 9, z: 9, width: 6.5, height: 2.5, rotation: -0.2, type: 'container', label: 'CONTAINER B' },
      { id: 'crates_c', x: 0, z: 0, width: 2.5, height: 2.5, type: 'crate', label: 'DEPOT' },
      { id: 'barrier_cn', x: 0, z: -3.2, width: 3.2, height: 1.0, type: 'barrier' },
      { id: 'barrier_cs', x: 0, z: 3.2, width: 3.2, height: 1.0, type: 'barrier' },
      { id: 'barrier_nw', x: -6.5, z: 8.5, width: 3.2, height: 1.0, rotation: 0.78, type: 'barrier' },
      { id: 'barrier_se', x: 6.5, z: -8.5, width: 3.2, height: 1.0, rotation: 0.78, type: 'barrier' },
      { id: 'sandbag_l', x: -4.5, z: 1.5, width: 2.6, height: 1.0, rotation: 1.57, type: 'bunker' },
      { id: 'sandbag_r', x: 4.5, z: -1.5, width: 2.6, height: 1.0, rotation: -1.57, type: 'bunker' },
    ],
    sectors: [
      { label: 'COMMAND BUNKER', x: -16, z: -10.5 },
      { label: 'OBSERVATION POST', x: 16, z: 10.5 },
      { label: 'CENTRAL DEPOT', x: 0, z: 0 },
      { label: 'CONTAINER ALPHA', x: -9, z: -9 },
      { label: 'CONTAINER BRAVO', x: 9, z: 9 },
    ],
    cardGradient: 'from-slate-900 via-slate-800 to-emerald-950',
    badgeColor: 'text-emerald-400 border-emerald-500/40 bg-emerald-950/40',
  },

  'jungle-ops': {
    id: 'jungle-ops',
    name: 'Jungle Operations',
    sectorCode: 'SECTOR-02',
    tagline: 'Dense Tropical Canopy & Ruins',
    description:
      'Dense humid rainforest clearing surrounded by wooden palisades, ancient mossy monoliths, fallen tree barriers, and elevated watchtower outposts.',
    environmentType: 'jungle',
    bounds: { minX: -27.6, maxX: 27.6, minZ: -27.6, maxZ: 27.6 },
    playerSpawns: {
      player1: [-16, 0, 0],
      player2: [16, 0, 0],
    },
    playerSpawnRotations: {
      player1: 0,
      player2: Math.PI,
    },
    weaponSpawns: {
      gun1: [-4, 0.5, 6],
      gun2: [4, 0.5, -6],
    },
    sky: {
      sunPosition: [30, 40, 20],
      inclination: 0.6,
      azimuth: 0.3,
      turbidity: 10,
      rayleigh: 2.2,
      mieCoefficient: 0.008,
      mieDirectionalG: 0.85,
      fogColor: '#132418',
      fogNear: 20,
      fogFar: 75,
      ambientColor: '#7ba97d',
      ambientIntensity: 0.65,
      sunColor: '#fff1c5',
      sunIntensity: 1.85,
      skyBounceColor: '#4d7c57',
      skyBounceIntensity: 0.4,
    },
    schematicObstacles: [
      { id: 'shrine', x: 0, z: 0, width: 5.5, height: 5.5, type: 'building', label: 'ANCIENT SHRINE' },
      { id: 'tower_w', x: -17, z: -12, width: 4.5, height: 4.5, type: 'building', label: 'WEST WATCHTOWER' },
      { id: 'tower_e', x: 17, z: 12, width: 4.5, height: 4.5, type: 'building', label: 'EAST WATCHTOWER' },
      { id: 'boulder_nw', x: -10, z: -10, width: 4.2, height: 3.8, type: 'rock', label: 'MOSSY BOULDER' },
      { id: 'boulder_se', x: 10, z: 10, width: 4.4, height: 4.0, type: 'rock', label: 'MOSSY BOULDER' },
      { id: 'boulder_ne', x: 11, z: -9, width: 3.6, height: 3.4, type: 'rock' },
      { id: 'boulder_sw', x: -11, z: 9, width: 3.8, height: 3.6, type: 'rock' },
      { id: 'log_cn', x: 0, z: -6.5, width: 6.8, height: 1.2, rotation: 0.15, type: 'barrier', label: 'FALLEN TRUNK' },
      { id: 'log_cs', x: 0, z: 6.5, width: 6.8, height: 1.2, rotation: -0.15, type: 'barrier', label: 'FALLEN TRUNK' },
      { id: 'stockade_w', x: -16, z: 0, width: 1.0, height: 6.0, type: 'wall' },
      { id: 'stockade_e', x: 16, z: 0, width: 1.0, height: 6.0, type: 'wall' },
    ],
    sectors: [
      { label: 'ANCIENT SHRINE', x: 0, z: 0 },
      { label: 'WEST WATCHTOWER', x: -17, z: -12 },
      { label: 'EAST WATCHTOWER', x: 17, z: 12 },
      { label: 'NORTH CANOPY', x: 0, z: -16 },
      { label: 'SOUTH PALISADE', x: 0, z: 16 },
    ],
    cardGradient: 'from-slate-900 via-emerald-950 to-teal-900',
    badgeColor: 'text-teal-400 border-teal-500/40 bg-teal-950/40',
  },

  'snow-ops': {
    id: 'snow-ops',
    name: 'Snow Operations',
    sectorCode: 'SECTOR-03',
    tagline: 'Sub-Zero Mountain Outpost',
    description:
      'Glacial arctic research outpost subjected to sub-zero temperatures, frosted shipping containers, subterranean blast bunkers, and snow-laden alpine pine barriers.',
    environmentType: 'arctic',
    bounds: { minX: -27.6, maxX: 27.6, minZ: -27.6, maxZ: 27.6 },
    playerSpawns: {
      player1: [-15, 0, 0],
      player2: [15, 0, 0],
    },
    playerSpawnRotations: {
      player1: 0,
      player2: Math.PI,
    },
    weaponSpawns: {
      gun1: [-6, 0.5, 4],
      gun2: [6, 0.5, -4],
    },
    sky: {
      sunPosition: [25, 30, 20],
      inclination: 0.45,
      azimuth: 0.15,
      turbidity: 4,
      rayleigh: 0.8,
      mieCoefficient: 0.003,
      mieDirectionalG: 0.75,
      fogColor: '#b8c9dc',
      fogNear: 22,
      fogFar: 85,
      ambientColor: '#cbd5e1',
      ambientIntensity: 0.75,
      sunColor: '#f1f5f9',
      sunIntensity: 1.6,
      skyBounceColor: '#93c5fd',
      skyBounceIntensity: 0.45,
    },
    schematicObstacles: [
      { id: 'bunker_w', x: -16, z: -12, width: 8.5, height: 7.5, type: 'building', label: 'RADAR BUNKER' },
      { id: 'bunker_e', x: 16, z: 12, width: 8.5, height: 7.5, type: 'building', label: 'CRYOGENIC LAB' },
      { id: 'cont_alpha', x: -8, z: 8, width: 6.5, height: 2.5, rotation: -0.35, type: 'container', label: 'FROST CONTAINER A' },
      { id: 'cont_bravo', x: 8, z: -8, width: 6.5, height: 2.5, rotation: 0.35, type: 'container', label: 'FROST CONTAINER B' },
      { id: 'cont_c', x: -1, z: 10, width: 6.0, height: 2.4, rotation: 1.57, type: 'container' },
      { id: 'crates_c', x: 0, z: 0, width: 2.0, height: 2.0, type: 'crate', label: 'DEPOT' },
      { id: 'berm_n', x: 0, z: -3.5, width: 3.8, height: 1.2, type: 'barrier' },
      { id: 'berm_s', x: 0, z: 3.5, width: 3.8, height: 1.2, type: 'barrier' },
      { id: 'barrier_nw', x: -7.5, z: -6.5, width: 3.4, height: 0.8, rotation: 0.7, type: 'barrier' },
      { id: 'barrier_se', x: 7.5, z: 6.5, width: 3.4, height: 0.8, rotation: 0.7, type: 'barrier' },
    ],
    sectors: [
      { label: 'RADAR BUNKER', x: -16, z: -12 },
      { label: 'CRYOGENIC LAB', x: 16, z: 12 },
      { label: 'FROZEN COURTYARD', x: 0, z: 0 },
      { label: 'ARCTIC CONTAINER A', x: -8, z: 8 },
      { label: 'ARCTIC CONTAINER B', x: 8, z: -8 },
    ],
    cardGradient: 'from-slate-900 via-sky-950 to-blue-900',
    badgeColor: 'text-sky-400 border-sky-500/40 bg-sky-950/40',
  },
};

export const MAP_OBSTACLES: Record<MapId, CollisionBox[]> = {
  'battle-area': BATTLE_AREA_OBSTACLES,
  'jungle-ops': JUNGLE_OPS_OBSTACLES,
  'snow-ops': SNOW_OPS_OBSTACLES,
};
