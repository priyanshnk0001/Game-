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
  // 1. Natural Outer Perimeter Boundary (160m x 160m Region: -80 to +80)
  { id: 'jungle_perim_n', position: [0, 4.0, -80], size: [160, 8.0, 2.0], rotationY: 0, type: 'wall' },
  { id: 'jungle_perim_s', position: [0, 4.0, 80], size: [160, 8.0, 2.0], rotationY: 0, type: 'wall' },
  { id: 'jungle_perim_w', position: [-80, 4.0, 0], size: [2.0, 8.0, 160], rotationY: 0, type: 'wall' },
  { id: 'jungle_perim_e', position: [80, 4.0, 0], size: [2.0, 8.0, 160], rotationY: 0, type: 'wall' },

  // 2. Southwest Tactical Compound: "FOB Sabre" (South of Main Road)
  { id: 'fob_hq_container', position: [-52, 1.3, -56], size: [12.0, 2.6, 2.5], rotationY: 0.15, type: 'container' },
  { id: 'fob_armory_container', position: [-38, 1.3, -62], size: [6.5, 2.6, 2.5], rotationY: -0.2, type: 'container' },
  { id: 'fob_command_shelter', position: [-68, 1.8, -40], size: [8.0, 3.6, 6.0], rotationY: 0.4, type: 'building' },
  { id: 'fob_sandbag_front', position: [-46, 0.6, -50], size: [8.0, 1.2, 0.9], rotationY: 0.15, type: 'bunker' },
  { id: 'fob_sandbag_east', position: [-26, 0.6, -48], size: [8.0, 1.2, 0.9], rotationY: -0.2, type: 'bunker' },
  { id: 'fob_sandbag_flank', position: [-68, 0.6, -58], size: [0.9, 1.2, 12.0], rotationY: 0, type: 'bunker' },
  { id: 'fob_ammo_pallet_1', position: [-54, 0.7, -52], size: [2.8, 1.4, 2.4], rotationY: 0.1, type: 'crate' },
  { id: 'fob_ammo_pallet_2', position: [-38, 0.7, -56], size: [2.4, 1.4, 2.2], rotationY: -0.3, type: 'crate' },
  { id: 'fob_fuel_depot', position: [-60, 0.6, -64], size: [3.5, 1.2, 2.5], rotationY: 0, type: 'container' },
  { id: 'fob_radio_mast', position: [-68, 5.0, -48], size: [0.6, 10.0, 0.6], rotationY: 0, type: 'pillar' },
  { id: 'tower_fob_sentry', position: [-22, 3.0, -42], size: [4.2, 6.0, 4.2], rotationY: 0.3, type: 'building' },

  // 3. Central Creek Ravine & Timber Trestle Bridge (Spans ravine along 45-deg road axis)
  { id: 'bridge_deck', position: [0, 0.3, 0], size: [6.5, 0.6, 12.0], rotationY: Math.PI / 4, type: 'barrier' },
  { id: 'bridge_rail_left', position: [-2.6, 1.0, 0], size: [0.3, 0.9, 12.0], rotationY: Math.PI / 4, type: 'barrier' },
  { id: 'bridge_rail_right', position: [2.6, 1.0, 0], size: [0.3, 0.9, 12.0], rotationY: Math.PI / 4, type: 'barrier' },

  // 4. Northeast Main Town: "Ban Khao" (Plateau at +2.8m, buildings arranged along streets)
  { id: 'village_chief_house', position: [44, 2.8, 52], size: [8.5, 5.0, 7.5], rotationY: 0.15, type: 'building' },
  { id: 'village_stilt_1', position: [60, 2.8, 38], size: [7.5, 4.0, 6.5], rotationY: -0.25, type: 'building' },
  { id: 'village_market_shed', position: [42, 2.8, 22], size: [9.5, 3.6, 6.5], rotationY: 0.35, type: 'building' },
  { id: 'village_stilt_2', position: [66, 2.8, 60], size: [7.0, 4.4, 7.0], rotationY: 0.08, type: 'building' },
  { id: 'village_workshop_barn', position: [26, 2.8, 62], size: [8.0, 4.4, 9.0], rotationY: -0.18, type: 'building' },
  { id: 'village_storage_shed', position: [50, 2.8, 74], size: [5.5, 3.0, 4.5], rotationY: 0.32, type: 'building' },
  { id: 'village_wall_plaza', position: [38, 1.4, 44], size: [8.0, 1.2, 0.4], rotationY: 0.1, type: 'wall' },
  { id: 'village_wall_east', position: [54, 1.4, 46], size: [0.4, 1.2, 10.0], rotationY: -0.1, type: 'wall' },
  { id: 'village_fence_north', position: [52, 1.4, 68], size: [9.0, 1.0, 0.3], rotationY: 0.2, type: 'barrier' },
  { id: 'village_cistern_tank', position: [30, 3.5, 42], size: [2.5, 5.0, 2.5], rotationY: 0, type: 'pillar' },

  // 5. Southeast Riverside Hamlet: "Ban Nam" & Farmland Terraces (+1.6m)
  { id: 'bannam_cottage_1', position: [36, 1.8, -32], size: [7.0, 3.8, 6.0], rotationY: 0.2, type: 'building' },
  { id: 'bannam_cottage_2', position: [54, 1.8, -36], size: [6.5, 3.6, 6.0], rotationY: -0.15, type: 'building' },
  { id: 'bannam_farm_barn', position: [58, 1.8, -58], size: [8.0, 4.2, 7.0], rotationY: -0.3, type: 'building' },
  { id: 'bannam_fence_terrace', position: [42, 0.6, -42], size: [14.0, 1.0, 0.3], rotationY: 0.1, type: 'barrier' },
  { id: 'bannam_hay_stack', position: [50, 1.0, -64], size: [3.2, 1.8, 2.8], rotationY: 0.4, type: 'barrier' },

  // 6. Northwest Highland Ridge & Ancient Monastery Ruins
  { id: 'tower_north_ridge', position: [0, 7.2, 68], size: [4.5, 7.5, 4.5], rotationY: 0.1, type: 'building' },
  { id: 'monastery_ruin_shrine', position: [-50, 3.0, 48], size: [6.5, 2.6, 6.5], rotationY: 0.2, type: 'building' },
  { id: 'monastery_pillar_1', position: [-53, 4.0, 45], size: [1.1, 5.0, 1.1], rotationY: 0, type: 'pillar' },
  { id: 'monastery_pillar_2', position: [-47, 4.0, 51], size: [1.1, 5.0, 1.1], rotationY: 0, type: 'pillar' },

  // 7. Tactical Mountain Boulders & Natural Cover (Positioned outside road corridors)
  { id: 'boulder_ridge_w', position: [-70, 2.2, 32], size: [5.5, 3.6, 5.0], rotationY: 0.4, type: 'rock' },
  { id: 'boulder_deep_forest', position: [-38, 2.0, 65], size: [4.8, 3.0, 4.2], rotationY: -0.5, type: 'rock' },
  { id: 'boulder_river_bend', position: [-20, 1.2, -8], size: [4.2, 2.8, 3.8], rotationY: 0.8, type: 'rock' },
  { id: 'boulder_east_knoll', position: [72, 2.0, -42], size: [5.0, 3.2, 4.4], rotationY: 0.2, type: 'rock' },
  { id: 'log_trail_ambush', position: [-44, 0.8, 22], size: [7.5, 1.0, 1.2], rotationY: 0.6, type: 'barrier' },
  { id: 'log_deep_forest', position: [-62, 0.8, 60], size: [8.0, 1.0, 1.2], rotationY: -0.4, type: 'barrier' },
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
    tagline: 'Rural Village & Military FOB Region',
    description:
      'Expansive 200m tropical combat theatre featuring rural village Ban Khao, military Forward Operating Base Alpha, high-ground observation watchtowers, connected road network, winding river crossing, and deep rainforest.',
    environmentType: 'jungle',
    bounds: { minX: -80, maxX: 80, minZ: -80, maxZ: 80 },
    playerSpawns: {
      player1: [-54, 0.9, -50],
      player2: [45, 3.2, 45],
    },
    playerSpawnRotations: {
      player1: Math.PI / 4,
      player2: (-Math.PI * 3) / 4,
    },
    weaponSpawns: {
      gun1: [-50, 0.8, -52],
      gun2: [40, 3.2, 54],
    },
    sky: {
      sunPosition: [55, 48, 40],
      inclination: 0.55,
      azimuth: 0.25,
      turbidity: 5.5,
      rayleigh: 1.1,
      mieCoefficient: 0.0035,
      mieDirectionalG: 0.78,
      fogColor: '#7a9682',
      fogNear: 55,
      fogFar: 225,
      ambientColor: '#d4ebd9',
      ambientIntensity: 1.1,
      sunColor: '#fff8e7',
      sunIntensity: 2.35,
      skyBounceColor: '#587c62',
      skyBounceIntensity: 0.7,
    },
    schematicObstacles: [
      { id: 'town_bankhao', x: 45, z: 48, width: 35, height: 35, type: 'building', label: 'BAN KHAO TOWN' },
      { id: 'hamlet_bannam', x: 45, z: -36, width: 25, height: 25, type: 'building', label: 'BAN NAM HAMLET' },
      { id: 'fob_sabre', x: -50, z: -50, width: 35, height: 35, type: 'building', label: 'FOB SABRE' },
      { id: 'tower_ridge', x: 0, z: 68, width: 6, height: 6, type: 'building', label: 'NORTH RIDGE TOWER' },
      { id: 'bridge', x: 0, z: 0, width: 8, height: 12, type: 'barrier', label: 'CREEK BRIDGE' },
      { id: 'ruins', x: -50, z: 48, width: 12, height: 12, type: 'building', label: 'MONASTERY RUINS' },
      { id: 'farm_barn', x: 58, z: -58, width: 10, height: 8, type: 'building', label: 'FARMLAND' },
    ],
    sectors: [
      { label: 'BAN KHAO TOWN', x: 45, z: 48 },
      { label: 'BAN NAM HAMLET', x: 45, z: -36 },
      { label: 'FOB SABRE', x: -50, z: -50 },
      { label: 'NORTH RIDGE', x: 0, z: 68 },
      { label: 'CREEK BRIDGE', x: 0, z: 0 },
      { label: 'MONASTERY RUINS', x: -50, z: 48 },
      { label: 'FARMLAND TERRACES', x: 55, z: -58 },
      { label: 'PRIMARY RAINFOREST', x: -55, z: 10 },
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

// ============================================================================
// SECTOR-02: UNIFIED HIERARCHICAL ROAD NETWORK (SINGLE SOURCE OF TRUTH)
// ============================================================================
export interface JungleRoadDef {
  id: string;
  name: string;
  width: number;
  points: [number, number][];
}

export const JUNGLE_ROAD_NETWORKS: JungleRoadDef[] = [
  // 1. Primary Arterial Highway (West Logistics -> FOB Sabre -> Valley -> Bridge -> Ban Khao -> Northeast Exit)
  {
    id: 'main_road',
    name: 'Main Arterial Highway',
    width: 6.5,
    points: [
      [-96, -50],
      [-75, -48],
      [-50, -48], // Passes through open FOB Sabre motor pool
      [-34, -36], // Down through valley
      [-20, -22],
      [-10, -10],
      [-5, -5],
      [-2.5, -2.5],
      [0, 0], // Center of Timber Bridge (45 deg collinear)
      [2.5, 2.5],
      [5, 5],
      [12, 14], // East Bridge Junction
      [24, 26], // Ascends to Ban Khao Plateau
      [34, 35], // Enters Ban Khao Village Square
      [46, 48], // Passes between Chief Residence and Market
      [58, 60],
      [74, 76],
      [95, 95], // Northeast Regional Highway Exit
    ],
  },
  // 2. Southern Valley Secondary Road (Bridge Junction -> Ban Nam Hamlet -> Farmland -> Ban Khao)
  {
    id: 'south_loop',
    name: 'Southern Valley Road',
    width: 4.5,
    points: [
      [-12, -14], // Junction on Main Road before bridge
      [-5, -24],  // Valley bank
      [12, -30],
      [28, -34],  // Enters Ban Nam Riverside Hamlet
      [44, -36],  // Along Ban Nam cottages
      [58, -44],  // Farmland terraces
      [62, -22],
      [50, 4],
      [34, 26],   // Reconnects into Ban Khao Town
    ],
  },
  // 3. North Ridge Service Trail (Bridge Exit -> Valley -> North Ridge Watchtower)
  {
    id: 'north_ridge',
    name: 'North Ridge Service Trail',
    width: 3.6,
    points: [
      [12, 14], // Junction at East Bridge Approach
      [10, 32], // Valley floor
      [8, 48],  // Ridge base
      [4, 60],  // Climbing south ridge slope
      [0, 68],  // Terminates at North Observation Watchtower
    ],
  },
  // 4. Ban Khao Village Footpaths (Connecting Chief House, Market, Cistern, Side Cottages)
  {
    id: 'ban_khao_paths',
    name: 'Ban Khao Village Footpaths',
    width: 2.0,
    points: [
      [24, 26],
      [34, 30],
      [40, 42],
      [44, 52],
      [56, 56],
      [64, 46],
    ],
  },
  // 5. Ban Nam Hamlet Footpaths (Connecting Cottages, Riverside Fishing Dock, Farmland)
  {
    id: 'ban_nam_paths',
    name: 'Ban Nam Hamlet Footpaths',
    width: 2.0,
    points: [
      [28, -34],
      [30, -30],
      [36, -32],
      [48, -34],
      [54, -36],
      [58, -48],
      [58, -58],
    ],
  },
];

export function getDistanceToRoads(x: number, z: number): number {
  let minDist = Infinity;
  for (const road of JUNGLE_ROAD_NETWORKS) {
    const pts = road.points;
    for (let i = 0; i < pts.length - 1; i++) {
      const x1 = pts[i][0];
      const z1 = pts[i][1];
      const x2 = pts[i + 1][0];
      const z2 = pts[i + 1][1];

      const dx = x2 - x1;
      const dz = z2 - z1;
      const lenSq = dx * dx + dz * dz;
      if (lenSq < 1e-4) continue;

      let t = ((x - x1) * dx + (z - z1) * dz) / lenSq;
      t = Math.max(0, Math.min(1, t));
      const projX = x1 + t * dx;
      const projZ = z1 + t * dz;

      const dist = Math.hypot(x - projX, z - projZ);
      if (dist < minDist) {
        minDist = dist;
      }
    }
  }
  return minDist;
}

export interface RoadClearanceResult {
  isClear: boolean;
  minDistance: number;
  requiredClearance: number;
  violatingRoad?: string;
}

export function checkRoadClearance(
  x: number,
  z: number,
  objectRadiusOrFootprint: number,
  safetyMargin = 0.5
): RoadClearanceResult {
  let minDistance = Infinity;
  let requiredClearance = 0;
  let isClear = true;
  let violatingRoad: string | undefined;

  for (const road of JUNGLE_ROAD_NETWORKS) {
    const halfW = road.width * 0.5;
    const shoulderExtra = road.width > 5.0 ? 1.25 : 0.85;
    const totalRoadCorridorHalf = halfW + shoulderExtra;
    const requiredForThisRoad = totalRoadCorridorHalf + objectRadiusOrFootprint + safetyMargin;

    const pts = road.points;
    for (let i = 0; i < pts.length - 1; i++) {
      const x1 = pts[i][0];
      const z1 = pts[i][1];
      const x2 = pts[i + 1][0];
      const z2 = pts[i + 1][1];

      const dx = x2 - x1;
      const dz = z2 - z1;
      const lenSq = dx * dx + dz * dz;
      if (lenSq < 1e-4) continue;

      let t = ((x - x1) * dx + (z - z1) * dz) / lenSq;
      t = Math.max(0, Math.min(1, t));
      const projX = x1 + t * dx;
      const projZ = z1 + t * dz;

      const dist = Math.hypot(x - projX, z - projZ);
      if (dist < minDistance) {
        minDistance = dist;
      }
      if (dist < requiredForThisRoad) {
        isClear = false;
        violatingRoad = road.id;
        requiredClearance = Math.max(requiredClearance, requiredForThisRoad);
      }
    }
  }

  return { isClear, minDistance, requiredClearance, violatingRoad };
}

export function validateJungleRoadClearance(obstacles: CollisionBox[]): { violations: number; details: string[] } {
  let violations = 0;
  const details: string[] = [];

  for (const obs of obstacles) {
    // Skip bridge components (they are intentional crossing structures) and perimeter walls
    if (obs.id.startsWith('bridge_') || obs.id.startsWith('jungle_perim_')) continue;

    // Footprint horizontal radius from bounding box size [width, height, depth]
    const footprintRadius = Math.hypot(obs.size[0] * 0.5, obs.size[2] * 0.5);
    const result = checkRoadClearance(obs.position[0], obs.position[2], footprintRadius, 0.4);

    if (!result.isClear) {
      violations++;
      details.push(
        `Obstacle "${obs.id}" at [${obs.position[0]}, ${obs.position[2]}] (radius ${footprintRadius.toFixed(1)}m) violates road "${result.violatingRoad}" (dist: ${result.minDistance.toFixed(2)}m < req: ${result.requiredClearance.toFixed(2)}m)`
      );
    }
  }

  return { violations, details };
}

export function getJungleTerrainHeight(x: number, z: number): number {
  // 1. North Observation Ridge (x: -35..35, z: 45..88) - Prominent tactical hill rising to +6.8m
  const dxRidge = (x - 0) / 36;
  const dzRidge = (z - 68) / 26;
  const ridgeDistSq = dxRidge * dxRidge + dzRidge * dzRidge;
  const ridgeHeight = ridgeDistSq < 1.0 ? Math.cos(Math.sqrt(ridgeDistSq) * (Math.PI / 2)) * 6.8 : 0;

  // 2. Rural Village "Ban Khao" Elevated Plateau (x: 20..75, z: 20..75) - Raised terrace at +2.8m
  const dxVillage = (x - 48) / 34;
  const dzVillage = (z - 48) / 34;
  const villageDistSq = dxVillage * dxVillage + dzVillage * dzVillage;
  const villageHeight = villageDistSq < 1.0 ? Math.cos(Math.sqrt(villageDistSq) * (Math.PI / 2)) * 2.8 : 0;

  // 3. Central Winding Creek Ravine - Sunken water drainage gully cutting down to -2.0m
  // The stream curves from [65, -30] through [0, 0] to [-55, 45]
  const streamPathZ = -x * 0.75 + Math.sin(x * 0.05) * 7.0;
  const distToStream = Math.abs(z - streamPathZ);
  const streamWidth = 14.0;
  const streamDip = distToStream < streamWidth ? -Math.cos((distToStream / streamWidth) * (Math.PI / 2)) * 2.0 : 0;

  // 4. Southeast Farmland Rolling Knolls (x: 35..85, z: -75..-25) - Gentle agricultural slopes (+2.4m)
  const dxFarm = (x - 60) / 30;
  const dzFarm = (z - 52) / 30;
  const farmDistSq = dxFarm * dxFarm + dzFarm * dzFarm;
  const farmHeight = farmDistSq < 1.0 ? Math.cos(Math.sqrt(farmDistSq) * (Math.PI / 2)) * 2.4 : 0;

  // 5. Northwest Ancient Ruins Hillock (x: -70..-30, z: 25..65) - Rises to +2.5m
  const dxRuins = (x - 50) / 24;
  const dzRuins = (z - 45) / 24;
  const ruinsDistSq = dxRuins * dxRuins + dzRuins * dzRuins;
  const ruinsHeight = ruinsDistSq < 1.0 ? Math.cos(Math.sqrt(ruinsDistSq) * (Math.PI / 2)) * 2.5 : 0;

  // 6. Southwest FOB Alpha Clearing - Stabilized tactical platform at ~+0.8m
  const dxFob = (x - (-50)) / 28;
  const dzFob = (z - (-48)) / 28;
  const fobDistSq = dxFob * dxFob + dzFob * dzFob;
  const fobPlatform = fobDistSq < 1.0 ? Math.cos(Math.sqrt(fobDistSq) * (Math.PI / 2)) * 0.8 : 0;

  // 7. Continuous Natural Micro-Relief (Undulating Jungle Floor)
  // Low-frequency gentle rolls across the 200m landscape
  const groundRoll =
    Math.sin(x * 0.06 + z * 0.035) * 0.65 +
    Math.cos(x * 0.035 - z * 0.055) * 0.55;

  const total = ridgeHeight + villageHeight + farmHeight + ruinsHeight + fobPlatform + streamDip + groundRoll;
  return Math.max(-2.2, total);
}

