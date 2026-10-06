import { MapId } from '../../types/game';
import {
  MAPS,
  BATTLE_AREA_OBSTACLES,
  SNOW_OPS_OBSTACLES,
  JUNGLE_OPS_OBSTACLES,
  JUNGLE_ROAD_NETWORKS,
  RIVER_SPINE,
  getFilteredJungleTrees,
} from '../../config/maps';
import { SECTOR02_CONFIG } from '../environment/JungleMap';

export interface WorldMapObject {
  id: string;
  type: 'wall' | 'barrier' | 'bunker' | 'container' | 'building' | 'crate' | 'pillar' | 'rock' | 'tree' | 'bridge';
  position: [number, number, number]; // [x, y, z] Three.js world coordinates
  size: [number, number, number];     // [width, height, depth] in meters
  rotationY: number;                  // radians around Y
  label?: string;
  subType?: 'emergent' | 'mature' | 'young' | 'jacaranda' | 'redmaple' | 'conifer' | 'palm' | 'banyan' | 'pine';
}

export interface WorldLinearFeature {
  id: string;
  type: 'road' | 'river';
  name: string;
  width: number; // in world meters
  points: [number, number][]; // [x, z] world coordinates
}

export interface WorldPOI {
  id: string;
  label: string;
  x: number;
  z: number;
}

export interface WorldMapData {
  mapId: MapId;
  bounds: { minX: number; maxX: number; minZ: number; maxZ: number };
  objects: WorldMapObject[];
  linearFeatures: WorldLinearFeature[];
  pois: WorldPOI[];
}

export class WorldObjectRegistry {
  private static dynamicObjects: Map<MapId, Map<string, WorldMapObject>> = new Map();
  private static dynamicLinearFeatures: Map<MapId, Map<string, WorldLinearFeature>> = new Map();
  private static listeners: Set<() => void> = new Set();

  public static subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private static notify(): void {
    for (const listener of this.listeners) {
      listener();
    }
  }

  public static registerDynamicObject(mapId: MapId, obj: WorldMapObject): void {
    if (!this.dynamicObjects.has(mapId)) {
      this.dynamicObjects.set(mapId, new Map());
    }
    this.dynamicObjects.get(mapId)!.set(obj.id, obj);
    this.notify();
  }

  public static unregisterDynamicObject(mapId: MapId, id: string): void {
    const map = this.dynamicObjects.get(mapId);
    if (map && map.delete(id)) {
      this.notify();
    }
  }

  public static updateDynamicObject(mapId: MapId, id: string, updates: Partial<WorldMapObject>): void {
    const map = this.dynamicObjects.get(mapId);
    if (map && map.has(id)) {
      const existing = map.get(id)!;
      map.set(id, { ...existing, ...updates });
      this.notify();
    }
  }

  public static registerDynamicLinearFeature(mapId: MapId, feature: WorldLinearFeature): void {
    if (!this.dynamicLinearFeatures.has(mapId)) {
      this.dynamicLinearFeatures.set(mapId, new Map());
    }
    this.dynamicLinearFeatures.get(mapId)!.set(feature.id, feature);
    this.notify();
  }

  public static unregisterDynamicLinearFeature(mapId: MapId, id: string): void {
    const map = this.dynamicLinearFeatures.get(mapId);
    if (map && map.delete(id)) {
      this.notify();
    }
  }

  /**
   * Authoritative query: Returns the complete, accurate world content that actually
   * exists in the playground for the given mapId.
   */
  public static getWorldMapData(mapId: MapId): WorldMapData {
    const mapDef = MAPS[mapId] || MAPS['battle-area'];
    const bounds = mapDef.bounds;

    let objects: WorldMapObject[] = [];
    let linearFeatures: WorldLinearFeature[] = [];
    let pois: WorldPOI[] = [];

    if (mapId === 'battle-area') {
      // 1. Physical obstacles from BATTLE_AREA_OBSTACLES
      for (const obs of BATTLE_AREA_OBSTACLES) {
        let label: string | undefined;
        if (obs.id === 'container_alpha') label = 'A';
        else if (obs.id === 'container_bravo') label = 'B';
        else if (obs.id.startsWith('bunker1_')) label = 'CMD';
        else if (obs.id.startsWith('bunker2_')) label = 'OBS';
        else if (obs.id === 'crates_center') label = 'DEPOT';

        objects.push({
          id: obs.id,
          type: obs.type,
          position: obs.position,
          size: obs.size,
          rotationY: obs.rotationY,
          label,
        });
      }

      // 2. Playable asphalt crossing runways
      linearFeatures.push({
        id: 'runway_ew',
        type: 'road',
        name: 'Runway East-West',
        width: 25,
        points: [[-27.6, 0], [27.6, 0]],
      });
      linearFeatures.push({
        id: 'runway_ns',
        type: 'road',
        name: 'Runway North-South',
        width: 25,
        points: [[0, -27.6], [0, 27.6]],
      });

      // 3. POIs
      pois = mapDef.sectors.map((s) => ({
        id: s.label,
        label: s.label,
        x: s.x,
        z: s.z,
      }));
    } else if (mapId === 'snow-ops') {
      // 1. Physical obstacles from SNOW_OPS_OBSTACLES
      for (const obs of SNOW_OPS_OBSTACLES) {
        let label: string | undefined;
        if (obs.id === 'snow_container_alpha') label = 'A';
        else if (obs.id === 'snow_container_bravo') label = 'B';
        else if (obs.id === 'snow_bunker_west') label = 'RADAR';
        else if (obs.id === 'snow_bunker_east') label = 'CRYO';
        else if (obs.id === 'snow_crates_center') label = 'DEPOT';

        objects.push({
          id: obs.id,
          type: obs.type,
          position: obs.position,
          size: obs.size,
          rotationY: obs.rotationY,
          label,
          subType: obs.type === 'tree' ? 'pine' : undefined,
        });
      }

      // 2. POIs
      pois = mapDef.sectors.map((s) => ({
        id: s.label,
        label: s.label,
        x: s.x,
        z: s.z,
      }));
    } else if (mapId === 'jungle-ops') {
      // 1. Perimeter boundary walls ALWAYS exist in the playground (-80 to +80)
      for (const obs of JUNGLE_OPS_OBSTACLES) {
        if (obs.id.startsWith('jungle_perim_')) {
          objects.push({
            id: obs.id,
            type: obs.type,
            position: obs.position,
            size: obs.size,
            rotationY: obs.rotationY,
          });
        }
      }

      // 2. Structures, houses, containers, bunkers (ONLY when enabled in playground)
      if (SECTOR02_CONFIG.ENABLE_STRUCTURES) {
        for (const obs of JUNGLE_OPS_OBSTACLES) {
          if (
            obs.type === 'building' ||
            obs.type === 'container' ||
            (obs.type === 'wall' && !obs.id.startsWith('jungle_perim_')) ||
            (obs.type === 'barrier' && !obs.id.startsWith('bridge_') && !obs.id.startsWith('log_'))
          ) {
            let label: string | undefined;
            if (obs.id === 'fob_hq_container') label = 'HQ';
            else if (obs.id === 'fob_armory_container') label = 'ARM';
            else if (obs.id === 'village_chief_house') label = 'CHIEF';
            else if (obs.id === 'tower_north_ridge') label = 'TOWER';
            else if (obs.id === 'monastery_ruin_shrine') label = 'RUINS';

            objects.push({
              id: obs.id,
              type: obs.type,
              position: obs.position,
              size: obs.size,
              rotationY: obs.rotationY,
              label,
            });
          }
        }
      }

      // 3. Props: bunkers, crates, fuel depots, masts
      if (SECTOR02_CONFIG.ENABLE_PROPS) {
        for (const obs of JUNGLE_OPS_OBSTACLES) {
          if (obs.type === 'bunker' || obs.type === 'crate' || obs.type === 'pillar') {
            objects.push({
              id: obs.id,
              type: obs.type,
              position: obs.position,
              size: obs.size,
              rotationY: obs.rotationY,
            });
          }
        }
      }

      // 4. Boulders, rocks, fallen logs
      if (SECTOR02_CONFIG.ENABLE_ROCKS_AND_LOGS) {
        for (const obs of JUNGLE_OPS_OBSTACLES) {
          if (obs.type === 'rock' || obs.id.startsWith('log_')) {
            objects.push({
              id: obs.id,
              type: 'rock',
              position: obs.position,
              size: obs.size,
              rotationY: obs.rotationY,
            });
          }
        }
      }

      // 5. Timber Trestle Bridge & Central Creek Ravine Water
      if (SECTOR02_CONFIG.ENABLE_WATER_AND_BRIDGE) {
        // Timber bridge at center [0, 0] rotated 45 deg
        objects.push({
          id: 'timber_trestle_bridge',
          type: 'bridge',
          position: [0, 0.25, 0],
          size: [6.5, 1.2, 12.0],
          rotationY: Math.PI / 4,
          label: 'BRIDGE',
        });

        // Winding creek river stream
        linearFeatures.push({
          id: 'creek_ravine',
          type: 'river',
          name: 'Central Creek Ravine',
          width: 14.0,
          points: RIVER_SPINE,
        });
      }

      // 6. Roads (only when enabled in playground)
      if (SECTOR02_CONFIG.ENABLE_ROADS) {
        for (const road of JUNGLE_ROAD_NETWORKS) {
          linearFeatures.push({
            id: road.id,
            type: 'road',
            name: road.name,
            width: road.width,
            points: road.points,
          });
        }
      }

      // 7. Active Trees (Derived directly from shared jungle tree registry)
      if (SECTOR02_CONFIG.ENABLE_TREES) {
        const trees = getFilteredJungleTrees();

        trees.emergent.forEach(([tx, tz], i) => {
          objects.push({
            id: `tree_emergent_${i}`,
            type: 'tree',
            subType: 'emergent',
            position: [tx, 0, tz],
            size: [5.2, 12, 5.2],
            rotationY: i * 0.8,
          });
        });

        trees.matureCanopy.forEach(([tx, tz], i) => {
          objects.push({
            id: `tree_mature_${i}`,
            type: 'tree',
            subType: 'mature',
            position: [tx, 0, tz],
            size: [5.8, 11, 5.8],
            rotationY: i * 1.1 + 0.4,
          });
        });

        trees.youngTropical.forEach(([tx, tz], i) => {
          objects.push({
            id: `tree_young_${i}`,
            type: 'tree',
            subType: 'young',
            position: [tx, 0, tz],
            size: [3.4, 6, 3.4],
            rotationY: i * 0.9 + 1.2,
          });
        });

        trees.scenicJacaranda.forEach(([tx, tz], i) => {
          objects.push({
            id: `tree_jacaranda_${i}`,
            type: 'tree',
            subType: 'jacaranda',
            position: [tx, 0, tz],
            size: [4.4, 9, 4.4],
            rotationY: i * 1.4 + 0.3,
          });
        });

        trees.rareRedMaple.forEach(([tx, tz], i) => {
          objects.push({
            id: `tree_redmaple_${i}`,
            type: 'tree',
            subType: 'redmaple',
            position: [tx, 0, tz],
            size: [3.8, 4, 3.8],
            rotationY: i * 1.7 + 0.6,
          });
        });

        trees.highlandConifers.forEach(([tx, tz], i) => {
          objects.push({
            id: `tree_conifer_${i}`,
            type: 'tree',
            subType: 'conifer',
            position: [tx, 0, tz],
            size: [3.4, 12, 3.4],
            rotationY: i * 1.25,
          });
        });

        trees.palms.forEach(([tx, tz], i) => {
          objects.push({
            id: `tree_palm_${i}`,
            type: 'tree',
            subType: 'palm',
            position: [tx, 0, tz],
            size: [3.6, 8, 3.6],
            rotationY: i * 1.2,
          });
        });

        trees.banyans.forEach(([bx, bz], i) => {
          objects.push({
            id: `tree_banyan_${i}`,
            type: 'tree',
            subType: 'banyan',
            position: [bx, 0, bz],
            size: [7.2, 12, 7.2],
            rotationY: i * 1.3,
          });
        });

        trees.perimeter.forEach(([px, pz], i) => {
          objects.push({
            id: `tree_perim_${i}`,
            type: 'tree',
            subType: 'emergent',
            position: [px, 0, pz],
            size: [5.5, 14, 5.5],
            rotationY: i * 0.5,
          });
        });
      }

      // 8. Sector POIs (landmarks that actually exist in playground)
      const allowedPoiLabels = new Set<string>();
      allowedPoiLabels.add('NORTH RIDGE');
      allowedPoiLabels.add('FARMLAND TERRACES');
      allowedPoiLabels.add('PRIMARY RAINFOREST');
      if (SECTOR02_CONFIG.ENABLE_STRUCTURES) {
        allowedPoiLabels.add('BAN KHAO TOWN');
        allowedPoiLabels.add('BAN NAM HAMLET');
        allowedPoiLabels.add('FOB SABRE');
        allowedPoiLabels.add('MONASTERY RUINS');
      }
      if (SECTOR02_CONFIG.ENABLE_WATER_AND_BRIDGE) {
        allowedPoiLabels.add('CREEK BRIDGE');
      }

      pois = mapDef.sectors
        .filter((s) => allowedPoiLabels.has(s.label))
        .map((s) => ({
          id: s.label,
          label: s.label,
          x: s.x,
          z: s.z,
        }));
    }

    // Merge any dynamic runtime objects
    const dynamicMap = this.dynamicObjects.get(mapId);
    if (dynamicMap) {
      for (const obj of dynamicMap.values()) {
        objects.push(obj);
      }
    }

    const dynamicFeatures = this.dynamicLinearFeatures.get(mapId);
    if (dynamicFeatures) {
      for (const feat of dynamicFeatures.values()) {
        linearFeatures.push(feat);
      }
    }

    return {
      mapId,
      bounds,
      objects,
      linearFeatures,
      pois,
    };
  }
}
