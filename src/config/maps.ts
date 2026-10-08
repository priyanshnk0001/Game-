// Multi-Map Configuration & Definitions for Tactical Shooter

import { MapDefinition, MapId } from '../types/game';
import { CollisionBox } from '../game/physics/PhysicsBridge';
import { getRiverProfile } from '../game/environment/river/RiverFlow';
import { SECTOR02_RIVER_SPINE, SECTOR02_RIVER_CONFIG } from '../game/environment/river/riverConfig';

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

export function getJungleTerrainHeight(x: number, z: number): number {
  // 1. North Observation Ridge (x: -90..90, z: 110..240) - Prominent tactical hill rising to +8.5m
  const dxRidge = (x - 0) / 75;
  const dzRidge = (z - 175) / 55;
  const ridgeDistSq = dxRidge * dxRidge + dzRidge * dzRidge;
  const ridgeHeight = ridgeDistSq < 1.0 ? Math.cos(Math.sqrt(ridgeDistSq) * (Math.PI / 2)) * 8.5 : 0;

  // 2. Rural Plateau (x: 65..195, z: 65..195) - Raised terrace at +3.2m
  const dxVillage = (x - 130) / 65;
  const dzVillage = (z - 130) / 65;
  const villageDistSq = dxVillage * dxVillage + dzVillage * dzVillage;
  const villageHeight = villageDistSq < 1.0 ? Math.cos(Math.sqrt(villageDistSq) * (Math.PI / 2)) * 3.2 : 0;

  // 4. Southeast Farmland Rolling Knolls (x: 60..180, z: -180..-60) - Gentle agricultural slopes (+2.5m)
  const dxFarm = (x - 120) / 60;
  const dzFarm = (z - (-120)) / 60;
  const farmDistSq = dxFarm * dxFarm + dzFarm * dzFarm;
  const farmHeight = farmDistSq < 1.0 ? Math.cos(Math.sqrt(farmDistSq) * (Math.PI / 2)) * 2.5 : 0;

  // 5. Northwest Ancient Ruins Hillock (x: -180..-60, z: 60..180) - Rises to +3.0m
  const dxRuins = (x - (-120)) / 60;
  const dzRuins = (z - 120) / 60;
  const ruinsDistSq = dxRuins * dxRuins + dzRuins * dzRuins;
  const ruinsHeight = ruinsDistSq < 1.0 ? Math.cos(Math.sqrt(ruinsDistSq) * (Math.PI / 2)) * 3.0 : 0;

  // 6. Southwest FOB Alpha Clearing - Stabilized tactical platform at ~+1.2m
  const dxFob = (x - (-130)) / 65;
  const dzFob = (z - (-130)) / 65;
  const fobDistSq = dxFob * dxFob + dzFob * dzFob;
  const fobPlatform = fobDistSq < 1.0 ? Math.cos(Math.sqrt(fobDistSq) * (Math.PI / 2)) * 1.2 : 0;

  // 7. Continuous Natural Micro-Relief (Undulating Jungle Floor across 500m)
  const groundRoll =
    Math.sin(x * 0.024 + z * 0.015) * 0.75 +
    Math.cos(x * 0.015 - z * 0.024) * 0.65;

  const inlandLandHeight = Math.max(0.45, 1.0 + ridgeHeight + villageHeight + farmHeight + ruinsHeight + fobPlatform + groundRoll);

  // 8. Natural River Bed Channel & Sloping River Banks
  const riverProfile = getRiverProfile(x, z);
  if (riverProfile.isInsideRiver) {
    // Carved riverbed channel beneath the water surface (meeting waterLevel at banks, dropping in center)
    const bedRipple = Math.sin(x * 0.18 + z * 0.14) * 0.12;
    return riverProfile.bedElevation + bedRipple;
  } else if (riverProfile.isInsideBank) {
    // Natural sloping riverbank connecting inland terrain down to water surface (-1.35m)
    const t = riverProfile.bankT; // 0.0 at waterline, 1.0 at jungle verge
    const smoothT = t * t * (3.0 - 2.0 * t); // Hermite smoothstep
    return inlandLandHeight * smoothT + riverProfile.waterLevel * (1.0 - smoothT);
  }

  return inlandLandHeight;
}

/**
 * Accurately determines tree base Y coordinate by evaluating terrain slope drop across the tree base flare.
 * Ensures the lowest point of the tree root flare firmly enters the terrain with zero visible air gaps.
 */
export function getTreePlacementY(treeX: number, treeZ: number, baseRadius = 2.0): number {
  const centerH = getJungleTerrainHeight(treeX, treeZ);
  let minH = centerH;
  for (let a = 0; a < 8; a++) {
    const ang = (a / 8) * Math.PI * 2;
    const h = getJungleTerrainHeight(treeX + Math.cos(ang) * baseRadius, treeZ + Math.sin(ang) * baseRadius);
    if (h < minH) minH = h;
  }
  const slopeDrop = centerH - minH;
  return centerH - slopeDrop * 0.5;
}

export const JUNGLE_OPS_OBSTACLES: CollisionBox[] = [
  // 1. Natural Outer Perimeter Boundary (500m x 500m Region: -250 to +250)
  { id: 'jungle_perim_n', position: [0, 6.0, -250], size: [500, 12.0, 4.0], rotationY: 0, type: 'wall' },
  { id: 'jungle_perim_s', position: [0, 6.0, 250], size: [500, 12.0, 4.0], rotationY: 0, type: 'wall' },
  { id: 'jungle_perim_w', position: [-250, 6.0, 0], size: [4.0, 12.0, 500], rotationY: 0, type: 'wall' },
  { id: 'jungle_perim_e', position: [250, 6.0, 0], size: [4.0, 12.0, 500], rotationY: 0, type: 'wall' },

  // 2. Southwest Tactical Compound: "FOB Sabre" (Exact match with JungleMap.tsx visual structures)
  { id: 'fob_hq_container', position: [-52, getJungleTerrainHeight(-52, -56) + 1.3, -56], size: [12.0, 2.6, 2.5], rotationY: 0.15, type: 'container' },
  { id: 'fob_armory_container', position: [-38, getJungleTerrainHeight(-38, -62) + 1.3, -62], size: [6.5, 2.6, 2.5], rotationY: -0.2, type: 'container' },
  { id: 'fob_command_shelter', position: [-68, getJungleTerrainHeight(-68, -40) + 1.8, -40], size: [8.0, 3.6, 6.0], rotationY: 0.4, type: 'building' },
  { id: 'tower_fob_sentry', position: [-22, getJungleTerrainHeight(-22, -42) + 3.1, -42], size: [4.2, 6.2, 4.2], rotationY: 0.3, type: 'building' },
  { id: 'fob_sandbag_front', position: [-46, getJungleTerrainHeight(-46, -50) + 0.6, -50], size: [8.0, 1.2, 0.9], rotationY: 0.1, type: 'bunker' },
  { id: 'fob_sandbag_east', position: [-26, getJungleTerrainHeight(-26, -48) + 0.6, -48], size: [8.0, 1.2, 0.9], rotationY: -0.2, type: 'bunker' },
  { id: 'fob_sandbag_flank', position: [-68, getJungleTerrainHeight(-68, -58) + 0.6, -58], size: [0.9, 1.2, 12.0], rotationY: 0, type: 'bunker' },
  { id: 'fob_ammo_pallet_1', position: [-54, getJungleTerrainHeight(-54, -52) + 0.5, -52], size: [2.4, 1.0, 2.0], rotationY: 0.15, type: 'crate' },
  { id: 'fob_ammo_pallet_2', position: [-38, getJungleTerrainHeight(-38, -56) + 0.5, -56], size: [2.4, 1.0, 2.0], rotationY: -0.25, type: 'crate' },
  { id: 'fob_fuel_depot', position: [-60, getJungleTerrainHeight(-60, -64) + 0.6, -64], size: [3.5, 1.2, 2.5], rotationY: 0, type: 'container' },
  { id: 'fob_radio_mast', position: [-68, getJungleTerrainHeight(-68, -56) + 5.0, -56], size: [0.6, 10.0, 0.6], rotationY: 0, type: 'pillar' },

  // 3. Central Creek Ravine & Timber Trestle Bridge
  { id: 'bridge_rail_left', position: [-3.8, getJungleTerrainHeight(-3.8, -0.6) + 0.9, -0.6], size: [0.3, 0.9, 12.0], rotationY: Math.PI / 4, type: 'barrier' },
  { id: 'bridge_rail_right', position: [3.8, getJungleTerrainHeight(3.8, 0.6) + 0.9, 0.6], size: [0.3, 0.9, 12.0], rotationY: Math.PI / 4, type: 'barrier' },

  // 4. Northeast Main Town: "Ban Khao" (Exact match with JungleMap.tsx visual structures)
  { id: 'village_chief_house', position: [44, getJungleTerrainHeight(44, 52) + 2.5, 52], size: [8.5, 5.0, 7.5], rotationY: 0.15, type: 'building' },
  { id: 'village_stilt_1', position: [60, getJungleTerrainHeight(60, 38) + 1.6, 38], size: [7.5, 3.2, 6.5], rotationY: -0.25, type: 'building' },
  { id: 'village_market_shed', position: [42, getJungleTerrainHeight(42, 22) + 1.8, 22], size: [9.5, 3.6, 6.5], rotationY: 0.35, type: 'building' },
  { id: 'village_stilt_2', position: [66, getJungleTerrainHeight(66, 60) + 1.5, 60], size: [7.0, 3.0, 6.8], rotationY: 0.08, type: 'building' },
  { id: 'village_workshop_barn', position: [26, getJungleTerrainHeight(26, 62) + 1.7, 62], size: [8.0, 3.4, 8.5], rotationY: -0.18, type: 'building' },
  { id: 'village_storage_shed', position: [50, getJungleTerrainHeight(50, 74) + 1.3, 74], size: [5.5, 2.6, 4.5], rotationY: 0.32, type: 'building' },
  { id: 'village_wall_plaza', position: [38, getJungleTerrainHeight(38, 44) + 0.6, 44], size: [8.0, 1.2, 0.4], rotationY: 0.1, type: 'wall' },
  { id: 'village_wall_east', position: [54, getJungleTerrainHeight(54, 46) + 0.6, 46], size: [0.4, 1.2, 10.0], rotationY: -0.1, type: 'wall' },
  { id: 'village_fence_north', position: [52, getJungleTerrainHeight(52, 68) + 0.5, 68], size: [9.0, 1.0, 0.3], rotationY: 0.2, type: 'barrier' },
  { id: 'village_cistern_tank', position: [30, getJungleTerrainHeight(30, 42) + 2.5, 42], size: [2.5, 5.0, 2.5], rotationY: 0, type: 'pillar' },

  // 5. Southeast Riverside Hamlet: "Ban Nam" & Farmland (Exact match with JungleMap.tsx visual structures)
  { id: 'bannam_cottage_1', position: [36, getJungleTerrainHeight(36, -32) + 1.5, -32], size: [7.0, 3.0, 6.0], rotationY: 0.2, type: 'building' },
  { id: 'bannam_cottage_2', position: [54, getJungleTerrainHeight(54, -36) + 1.5, -36], size: [7.0, 3.0, 6.0], rotationY: -0.15, type: 'building' },
  { id: 'bannam_hay_stack', position: [50, getJungleTerrainHeight(50, -64) + 0.9, -64], size: [3.2, 1.8, 2.8], rotationY: 0.4, type: 'barrier' },
  { id: 'bannam_fence_terrace', position: [42, getJungleTerrainHeight(42, -42) + 0.5, -42], size: [14.0, 1.0, 0.3], rotationY: 0.1, type: 'barrier' },

  // 6. Northwest Highland Ridge & Ancient Monastery Ruins
  { id: 'tower_north_ridge', position: [0, getJungleTerrainHeight(0, 68) + 3.75, 68], size: [4.5, 7.5, 4.5], rotationY: 0.1, type: 'building' },
  { id: 'monastery_ruin_shrine', position: [-50, getJungleTerrainHeight(-50, 48) + 1.3, 48], size: [6.5, 2.6, 6.5], rotationY: 0.2, type: 'building' },
  { id: 'monastery_pillar_1', position: [-52.8, getJungleTerrainHeight(-50, 48) + 2.5, 45.2], size: [1.1, 5.0, 1.1], rotationY: 0, type: 'pillar' },
  { id: 'monastery_pillar_2', position: [-47.2, getJungleTerrainHeight(-50, 48) + 2.5, 50.8], size: [1.1, 5.0, 1.1], rotationY: 0, type: 'pillar' },

  // 7. Tactical Mountain Boulders & Natural Cover (Exact match with JungleMap.tsx visual rocks and logs)
  { id: 'boulder_ridge_w', position: [-70, getJungleTerrainHeight(-70, 32) + 1.2, 32], size: [4.4, 3.6, 4.4], rotationY: 0.4, type: 'rock' },
  { id: 'boulder_deep_forest', position: [-38, getJungleTerrainHeight(-38, 65) + 1.2, 65], size: [4.8, 3.6, 4.8], rotationY: -0.5, type: 'rock' },
  { id: 'boulder_river_bend', position: [-20, getJungleTerrainHeight(-20, -8) + 1.2, -8], size: [4.2, 3.2, 4.2], rotationY: 0.8, type: 'rock' },
  { id: 'boulder_east_knoll', position: [72, getJungleTerrainHeight(72, -42) + 1.2, -42], size: [4.4, 3.6, 4.4], rotationY: 0.2, type: 'rock' },
  { id: 'log_trail_ambush', position: [-44, getJungleTerrainHeight(-44, 22) + 0.5, 22], size: [7.5, 1.0, 1.2], rotationY: 0.6, type: 'barrier' },
  { id: 'log_deep_forest', position: [-62, getJungleTerrainHeight(-62, 60) + 0.5, 60], size: [8.0, 1.0, 1.2], rotationY: -0.4, type: 'barrier' },
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
    bounds: { minX: -250, maxX: 250, minZ: -250, maxZ: 250 },
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
      sunPosition: [120, 100, 80],
      inclination: 0.55,
      azimuth: 0.25,
      turbidity: 5.5,
      rayleigh: 1.1,
      mieCoefficient: 0.0035,
      mieDirectionalG: 0.78,
      fogColor: '#7a9682',
      fogNear: 80,
      fogFar: 550,
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

// Helper: Catmull-Rom 2D curve sampling for exact road polyline conformance
function sampleRoadCatmullRom(points: [number, number][], samplesPerSeg = 20): [number, number][] {
  const result: [number, number][] = [];
  const n = points.length;
  if (n < 2) return points;

  for (let i = 0; i < n - 1; i++) {
    const p0 = points[Math.max(0, i - 1)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(n - 1, i + 2)];

    for (let s = 0; s < samplesPerSeg; s++) {
      const t = s / samplesPerSeg;
      const t2 = t * t;
      const t3 = t2 * t;

      const x =
        0.5 *
        (2 * p1[0] +
          (-p0[0] + p2[0]) * t +
          (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 +
          (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3);
      const z =
        0.5 *
        (2 * p1[1] +
          (-p0[1] + p2[1]) * t +
          (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 +
          (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3);
      result.push([x, z]);
    }
  }
  result.push(points[n - 1]);
  return result;
}

// Pre-computed dense polylines for all road networks (conforms directly to 3D road spline meshes)
export const DENSE_ROAD_POLYLINES = JUNGLE_ROAD_NETWORKS.map((road) => ({
  id: road.id,
  name: road.name,
  width: road.width,
  corridorHalf: road.width * 0.5 + (road.width > 5.0 ? 1.25 : 0.85),
  curve: sampleRoadCatmullRom(road.points, 20),
}));

export function getDistanceToRoads(x: number, z: number): number {
  let minDist = Infinity;
  for (const road of DENSE_ROAD_POLYLINES) {
    const pts = road.curve;
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
  closestRoadPoint?: [number, number];
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
  let closestRoadPoint: [number, number] | undefined;

  for (const road of DENSE_ROAD_POLYLINES) {
    const totalRoadCorridorHalf = road.corridorHalf;
    const requiredForThisRoad = totalRoadCorridorHalf + objectRadiusOrFootprint + safetyMargin;

    const pts = road.curve;
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
        closestRoadPoint = [projX, projZ];
      }
      if (dist < requiredForThisRoad) {
        isClear = false;
        violatingRoad = road.id;
        requiredClearance = Math.max(requiredClearance, requiredForThisRoad);
      }
    }
  }

  return { isClear, minDistance, requiredClearance, violatingRoad, closestRoadPoint };
}

export function validateJungleRoadClearance(obstacles: CollisionBox[]): { violations: number; details: string[] } {
  let violations = 0;
  const details: string[] = [];

  for (const obs of obstacles) {
    // Skip bridge components (they are intentional crossing structures) and perimeter walls
    if (obs.id.startsWith('bridge_') || obs.id.startsWith('jungle_perim_')) continue;

    // Check center footprint
    const footprintRadius = Math.hypot(obs.size[0] * 0.5, obs.size[2] * 0.5);
    const centerResult = checkRoadClearance(obs.position[0], obs.position[2], footprintRadius, 0.4);

    // Also check all 4 corners of oriented bounding box for elongated barriers/fences/walls
    const cos = Math.cos(obs.rotationY || 0);
    const sin = Math.sin(obs.rotationY || 0);
    const hx = obs.size[0] * 0.5;
    const hz = obs.size[2] * 0.5;
    const corners = [
      [-hx, -hz], [hx, -hz], [hx, hz], [-hx, hz]
    ].map(([cx, cz]) => [
      obs.position[0] + (cx * cos - cz * sin),
      obs.position[2] + (cx * sin + cz * cos)
    ]);

    let worstResult = centerResult;
    for (const [cx, cz] of corners) {
      const cornerRes = checkRoadClearance(cx, cz, 0.2, 0.4);
      if (!cornerRes.isClear) {
        worstResult = cornerRes;
        break;
      }
    }

    if (!worstResult.isClear) {
      violations++;
      details.push(
        `Obstacle "${obs.id}" at [${obs.position[0]}, ${obs.position[2]}] (radius ${footprintRadius.toFixed(1)}m) violates road "${worstResult.violatingRoad}" (dist: ${worstResult.minDistance.toFixed(2)}m < req: ${worstResult.requiredClearance.toFixed(2)}m)`
      );
    }
  }

  return { violations, details };
}

// River System Constants (Sector-02 Ravine Creek - derived from reusable riverConfig)
export const RIVER_SPINE: [number, number][] = SECTOR02_RIVER_SPINE;
export const RIVER_WATER_Y = SECTOR02_RIVER_CONFIG.waterLevel;
export const RIVER_HALF_WIDTH = SECTOR02_RIVER_CONFIG.defaultWidth * 0.5;
export const RIVER_MAX_DEPTH = SECTOR02_RIVER_CONFIG.defaultDepth;

// ============================================================================
// SECTOR-02 JUNGLE TREE REGISTRY (SINGLE SOURCE OF TRUTH FOR 3D & 2D MAPS)
// ============================================================================
export interface JungleTreeRawData {
  emergent: [number, number][];
  matureCanopy: [number, number][];
  youngTropical: [number, number][];
  scenicJacaranda: [number, number][];
  rareRedMaple: [number, number][];
  highlandConifers: [number, number][];
  palms: [number, number][];
  banyans: [number, number][];
  perimeter: [number, number][];
}

export const RAW_JUNGLE_TREES: JungleTreeRawData = {
  emergent: [
    // Northwest Rainforest Quadrant
    [-210, 50], [-190, 80], [-160, 45], [-185, 145], [-150, 175], [-110, 160], [-70, 190], [-95, 215], [-40, 220],
    [-220, 110], [-175, 10], [-60, 150], [-30, 180],
    // Southwest Jungle Quadrant
    [-215, -60], [-185, -80], [-220, -180], [-170, -210], [-110, -200], [-80, -170], [-65, -135], [-120, -85],
    [-190, -130], [-150, -60], [-100, -110], [-70, -70], [-50, -110],
    // Northeast Forest Quadrant
    [45, 150], [80, 185], [120, 215], [165, 205], [205, 180], [215, 120], [175, 75], [120, 50],
    [60, 80], [90, 60], [150, 40], [190, 50], [220, 160], [160, 160],
    // Southeast Forest Quadrant
    [50, -140], [80, -180], [130, -205], [175, -190], [215, -150], [225, -90], [190, -45], [135, -30],
    [70, -50], [100, -70], [150, -80], [180, -110], [210, -50],
  ],
  matureCanopy: [
    // NW
    [-170, 20], [-135, 60], [-80, 50], [-50, 95], [-110, 130], [-160, 210], [-200, 30],
    // SW
    [-160, -60], [-95, -70], [-70, -110], [-130, -195], [-190, -150], [-205, -100], [-110, -150],
    // NE
    [60, 110], [95, 150], [140, 190], [190, 145], [185, 95], [150, 50], [100, 90], [170, 170],
    // SE
    [65, -95], [95, -145], [155, -170], [195, -120], [170, -75], [115, -45], [80, -110], [140, -60],
  ],
  youngTropical: [
    // NW
    [-145, 35], [-75, 75], [-40, 120], [-90, 160], [-180, 90], [-60, 60],
    // SW
    [-140, -85], [-85, -120], [-165, -180], [-185, -50], [-55, -90], [-120, -160],
    // NE
    [70, 75], [110, 135], [160, 175], [180, 125], [135, 70], [85, 110],
    // SE
    [85, -75], [115, -125], [165, -150], [175, -95], [125, -55], [155, -110],
  ],
  scenicJacaranda: [
    // Wild natural pockets across the forest
    [-200, -120], [-160, -90], [-100, -80], [-70, -50], [-40, -25],
    [40, 35], [75, 60], [105, 80], [165, 140], [210, 170],
    [45, -65], [75, -85], [105, -100], [165, -35], [155, 35],
  ],
  rareRedMaple: [
    // Accent trees in secret forest grottos
    [-180, 30], [-110, 85], [-50, 170], [80, 140], [175, 60], [160, -80], [-150, -90], [-60, -160],
  ],
  highlandConifers: [
    // High North Ridge slopes & peaks
    [-40, 160], [-25, 175], [-15, 195], [15, 195], [30, 180], [45, 165], [-55, 180], [55, 180], [0, 210], [-20, 220], [20, 220],
  ],
  palms: [
    // Along River Banks
    [-210, 165], [-190, 145], [-160, 125], [-140, 105], [-105, 88], [-80, 68], [-45, 42], [-20, 20],
    [20, -20], [45, -42], [75, -68], [100, -88], [130, -108], [160, -125], [190, -145], [210, -165],
    [-25, -10], [10, -5], [-5, 15],
  ],
  banyans: [
    // Deep forest ancient banyans
    [-190, -30], [-150, 20], [-100, 140], [-35, 75], [70, 170], [190, 70], [180, -150], [-70, -190],
  ],
  perimeter: [-240, -200, -160, -120, -80, -40, 0, 40, 80, 120, 160, 200, 240].flatMap((c): [number, number][] => [
    [c, -245],
    [c, 245],
    [-245, c],
    [245, c],
  ]),
};

export function getFilteredJungleTrees(): {
  emergent: [number, number][];
  matureCanopy: [number, number][];
  youngTropical: [number, number][];
  scenicJacaranda: [number, number][];
  rareRedMaple: [number, number][];
  highlandConifers: [number, number][];
  palms: [number, number][];
  banyans: [number, number][];
  perimeter: [number, number][];
} {
  return {
    emergent: RAW_JUNGLE_TREES.emergent.filter(([x, z]) => checkRoadClearance(x, z, 5.5, 1.8).isClear),
    matureCanopy: RAW_JUNGLE_TREES.matureCanopy.filter(([x, z]) => checkRoadClearance(x, z, 6.0, 1.8).isClear),
    youngTropical: RAW_JUNGLE_TREES.youngTropical.filter(([x, z]) => checkRoadClearance(x, z, 3.2, 1.5).isClear),
    scenicJacaranda: RAW_JUNGLE_TREES.scenicJacaranda.filter(([x, z]) => checkRoadClearance(x, z, 4.2, 1.6).isClear),
    rareRedMaple: RAW_JUNGLE_TREES.rareRedMaple.filter(([x, z]) => checkRoadClearance(x, z, 5.2, 2.5).isClear),
    highlandConifers: RAW_JUNGLE_TREES.highlandConifers.filter(([x, z]) => checkRoadClearance(x, z, 3.2, 1.5).isClear),
    palms: RAW_JUNGLE_TREES.palms.filter(([x, z]) => checkRoadClearance(x, z, 4.0, 1.6).isClear),
    banyans: RAW_JUNGLE_TREES.banyans,
    perimeter: RAW_JUNGLE_TREES.perimeter,
  };
}

/**
 * Derives authoritative physical collision boxes for all tree trunks in Sector-02 Jungle.
 * Ensures player collision, camera raycasts, and bullet hitscans recognize every solid tree.
 */
interface TreeTierSpec {
  yStart: number;
  yEnd: number;
  radius: number;
}

function buildTreeTiers(
  totalHeight: number,
  specs: TreeTierSpec[]
): { tiers: { halfHeight: number; radius: number; offsetY: number }[]; maxRadius: number } {
  let maxRadius = 0;
  const tiers = specs.map((s) => {
    const h = s.yEnd - s.yStart;
    const halfHeight = Math.max(0.1, h / 2);
    const offsetY = (s.yStart + s.yEnd - totalHeight) / 2;
    if (s.radius > maxRadius) maxRadius = s.radius;
    return { halfHeight, radius: s.radius, offsetY };
  });
  return { tiers, maxRadius };
}

/**
 * Derives authoritative physical collision boxes and compound cylinder colliders
 * for all tree trunks and buttress root flares in Sector-02 Jungle.
 * Ensures player collision, camera raycasts, and bullet hitscans recognize every solid tree.
 */
export function getJungleTreeObstacles(): CollisionBox[] {
  const trees = getFilteredJungleTrees();
  const result: CollisionBox[] = [];

  // 1. Dominant Rainforest Emergent Trees (5-lobed organic buttress base)
  for (let i = 0; i < trees.emergent.length; i++) {
    const [tx, tz] = trees.emergent[i];
    const scale = 0.9 + (i % 3) * 0.2;
    const rawHeight = 11.0 + (i % 4) * 2.0;
    const totalHeight = rawHeight * scale;
    const groundY = getTreePlacementY(tx, tz, 2.2 * scale);
    const { tiers, maxRadius } = buildTreeTiers(totalHeight, [
      { yStart: -1.5 * scale, yEnd: 1.1 * scale, radius: 2.10 * scale },
      { yStart: 1.1 * scale, yEnd: 2.4 * scale, radius: 1.35 * scale },
      { yStart: 2.4 * scale, yEnd: totalHeight, radius: 0.75 * scale },
    ]);
    result.push({
      id: `tree_emergent_${i}`,
      position: [tx, groundY + totalHeight / 2, tz],
      size: [maxRadius * 2, totalHeight, maxRadius * 2],
      rotationY: 0,
      type: 'tree',
      treeTiers: tiers,
    });
  }

  // 2. Dominant Mature Broadleaf Dome Canopy Trees (4-lobed wide buttress base)
  for (let i = 0; i < trees.matureCanopy.length; i++) {
    const [tx, tz] = trees.matureCanopy[i];
    const scale = 0.95 + (i % 3) * 0.15;
    const rawHeight = 10.5 + (i % 3) * 1.5;
    const totalHeight = rawHeight * scale;
    const groundY = getTreePlacementY(tx, tz, 2.4 * scale);
    const { tiers, maxRadius } = buildTreeTiers(totalHeight, [
      { yStart: -1.5 * scale, yEnd: 1.1 * scale, radius: 2.25 * scale },
      { yStart: 1.1 * scale, yEnd: 2.4 * scale, radius: 1.45 * scale },
      { yStart: 2.4 * scale, yEnd: totalHeight, radius: 0.90 * scale },
    ]);
    result.push({
      id: `tree_mature_${i}`,
      position: [tx, groundY + totalHeight / 2, tz],
      size: [maxRadius * 2, totalHeight, maxRadius * 2],
      rotationY: 0,
      type: 'tree',
      treeTiers: tiers,
    });
  }

  // 3. Young Tropical Slender Understory Trees
  for (let i = 0; i < trees.youngTropical.length; i++) {
    const [tx, tz] = trees.youngTropical[i];
    const scale = 0.9 + (i % 2) * 0.2;
    const rawHeight = 5.8 + (i % 3) * 1.2;
    const totalHeight = rawHeight * scale;
    const groundY = getTreePlacementY(tx, tz, 1.6 * scale);
    const { tiers, maxRadius } = buildTreeTiers(totalHeight, [
      { yStart: -1.2 * scale, yEnd: 0.7 * scale, radius: 1.30 * scale },
      { yStart: 0.7 * scale, yEnd: 1.6 * scale, radius: 0.70 * scale },
      { yStart: 1.6 * scale, yEnd: totalHeight, radius: 0.32 * scale },
    ]);
    result.push({
      id: `tree_young_${i}`,
      position: [tx, groundY + totalHeight / 2, tz],
      size: [maxRadius * 2, totalHeight, maxRadius * 2],
      rotationY: 0,
      type: 'tree',
      treeTiers: tiers,
    });
  }

  // 4. Scenic Jacaranda Purple Flowering Trees
  for (let i = 0; i < trees.scenicJacaranda.length; i++) {
    const [tx, tz] = trees.scenicJacaranda[i];
    const scale = 0.95 + (i % 2) * 0.15;
    const rawHeight = 9.2 + (i % 3) * 1.2;
    const totalHeight = rawHeight * scale;
    const groundY = getTreePlacementY(tx, tz, 1.9 * scale);
    const { tiers, maxRadius } = buildTreeTiers(totalHeight, [
      { yStart: -1.5 * scale, yEnd: 0.9 * scale, radius: 1.75 * scale },
      { yStart: 0.9 * scale, yEnd: 2.0 * scale, radius: 1.10 * scale },
      { yStart: 2.0 * scale, yEnd: totalHeight, radius: 0.55 * scale },
    ]);
    result.push({
      id: `tree_jacaranda_${i}`,
      position: [tx, groundY + totalHeight / 2, tz],
      size: [maxRadius * 2, totalHeight, maxRadius * 2],
      rotationY: 0,
      type: 'tree',
      treeTiers: tiers,
    });
  }

  // 5. Rare Japanese Red Laceleaf Weeping Maples
  for (let i = 0; i < trees.rareRedMaple.length; i++) {
    const [tx, tz] = trees.rareRedMaple[i];
    const scale = 1.05 + (i % 2) * 0.15;
    const rawHeight = 3.4 + (i % 2) * 0.4;
    const totalHeight = rawHeight * scale;
    const groundY = getTreePlacementY(tx, tz, 1.5 * scale);
    const { tiers, maxRadius } = buildTreeTiers(totalHeight, [
      { yStart: -1.2 * scale, yEnd: 0.7 * scale, radius: 1.35 * scale },
      { yStart: 0.7 * scale, yEnd: 1.6 * scale, radius: 0.75 * scale },
      { yStart: 1.6 * scale, yEnd: totalHeight, radius: 0.32 * scale },
    ]);
    result.push({
      id: `tree_redmaple_${i}`,
      position: [tx, groundY + totalHeight / 2, tz],
      size: [maxRadius * 2, totalHeight, maxRadius * 2],
      rotationY: 0,
      type: 'tree',
      treeTiers: tiers,
    });
  }

  // 6. Highland Conifer Spire Trees
  for (let i = 0; i < trees.highlandConifers.length; i++) {
    const [tx, tz] = trees.highlandConifers[i];
    const scale = 0.95 + (i % 2) * 0.2;
    const rawHeight = 12.5 + (i % 3) * 2.0;
    const totalHeight = rawHeight * scale;
    const groundY = getTreePlacementY(tx, tz, 1.4 * scale);
    const { tiers, maxRadius } = buildTreeTiers(totalHeight, [
      { yStart: -1.5 * scale, yEnd: 1.0 * scale, radius: 0.65 * scale },
      { yStart: 1.0 * scale, yEnd: totalHeight, radius: 0.42 * scale },
    ]);
    result.push({
      id: `tree_conifer_${i}`,
      position: [tx, groundY + totalHeight / 2, tz],
      size: [maxRadius * 2, totalHeight, maxRadius * 2],
      rotationY: 0,
      type: 'tree',
      treeTiers: tiers,
    });
  }

  // 7. Banyan Spreading Trees (Deep forest anchors with 8 aerial prop roots)
  for (let i = 0; i < trees.banyans.length; i++) {
    const [bx, bz] = trees.banyans[i];
    const scale = 0.95 + (i % 2) * 0.2;
    const totalHeight = 10.5 * scale;
    const groundY = getTreePlacementY(bx, bz, 3.2 * scale);
    const { tiers, maxRadius } = buildTreeTiers(totalHeight, [
      { yStart: -1.5 * scale, yEnd: 1.2 * scale, radius: 2.65 * scale },
      { yStart: 1.2 * scale, yEnd: 2.5 * scale, radius: 1.85 * scale },
      { yStart: 2.5 * scale, yEnd: totalHeight, radius: 1.25 * scale },
    ]);
    result.push({
      id: `tree_banyan_${i}`,
      position: [bx, groundY + totalHeight / 2, bz],
      size: [maxRadius * 2, totalHeight, maxRadius * 2],
      rotationY: 0,
      type: 'tree',
      treeTiers: tiers,
    });
  }

  // 8. Tropical Curved Palms
  for (let i = 0; i < trees.palms.length; i++) {
    const [px, pz] = trees.palms[i];
    const rawHeight = 7.5 + (i % 3) * 1.5;
    const totalHeight = rawHeight;
    const groundY = getTreePlacementY(px, pz, 1.2);
    const { tiers, maxRadius } = buildTreeTiers(totalHeight, [
      { yStart: -1.5, yEnd: 1.0, radius: 0.65 },
      { yStart: 1.0, yEnd: totalHeight, radius: 0.35 },
    ]);
    result.push({
      id: `tree_palm_${i}`,
      position: [px, groundY + totalHeight / 2, pz],
      size: [maxRadius * 2, totalHeight, maxRadius * 2],
      rotationY: 0,
      type: 'tree',
      treeTiers: tiers,
    });
  }

  // 9. Dense Outer Perimeter Jungle Wall Trees
  for (let i = 0; i < trees.perimeter.length; i++) {
    const [coordX, coordZ] = trees.perimeter[i];
    const scale = 1.35;
    const totalHeight = 14.0 * scale;
    const groundY = getTreePlacementY(coordX, coordZ, 2.6);
    const { tiers, maxRadius } = buildTreeTiers(totalHeight, [
      { yStart: -1.5 * scale, yEnd: 1.1 * scale, radius: 2.10 * scale },
      { yStart: 1.1 * scale, yEnd: 2.4 * scale, radius: 1.35 * scale },
      { yStart: 2.4 * scale, yEnd: totalHeight, radius: 0.75 * scale },
    ]);
    result.push({
      id: `tree_perim_${i}`,
      position: [coordX, groundY + totalHeight / 2, coordZ],
      size: [maxRadius * 2, totalHeight, maxRadius * 2],
      rotationY: 0,
      type: 'tree',
      treeTiers: tiers,
    });
  }

  return result;
}

export const MAP_OBSTACLES: Record<MapId, CollisionBox[]> = {
  'battle-area': BATTLE_AREA_OBSTACLES,
  'jungle-ops': [...JUNGLE_OPS_OBSTACLES, ...getJungleTreeObstacles()],
  'snow-ops': SNOW_OPS_OBSTACLES,
};

