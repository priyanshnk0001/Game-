// Centralized gameplay constants - single source of truth

export const PLAYER_MAX_HEALTH = 100;
export const WEAPON_DAMAGE = 34; // Shot 1: 66, Shot 2: 32, Shot 3: 0 (Dead)

export const PLAYER_WALK_SPEED = 5.2;
export const PLAYER_SPRINT_SPEED = 8.6;
export const PLAYER_CROUCH_SPEED = 3.0;
export const PLAYER_JUMP_FORCE = 7.2;
export const GRAVITY = 20.0;
export const RELOAD_TIME_MS = 1800;

export const PLAYER_RADIUS = 0.42;
export const PLAYER_HEIGHT = 1.8;
export const PLAYER_CROUCH_HEIGHT = 1.25;
export const MAX_STEP_HEIGHT = 0.35;
export const PICKUP_DISTANCE = 2.6;

export const PLAYER_SPAWNS: Record<'player1' | 'player2', [number, number, number]> = {
  player1: [-14, 0, 0],
  player2: [14, 0, 0],
};

export const WEAPON_SPAWNS: Record<'gun1' | 'gun2', {
  id: 'gun1' | 'gun2';
  name: string;
  type: 'rifle' | 'smg';
  position: [number, number, number];
  color: string;
  accentColor: string;
  fireRateMs: number;
  tracerColor: string;
  magazineCapacity: number;
}> = {
  gun1: {
    id: 'gun1',
    name: 'M16A2 Assault Rifle',
    type: 'rifle',
    position: [-5, 0.5, 5],
    color: '#1e293b',
    accentColor: '#10b981',
    fireRateMs: 180,
    tracerColor: '#34d399',
    magazineCapacity: 30,
  },
  gun2: {
    id: 'gun2',
    name: 'Tactical SMG',
    type: 'smg',
    position: [5, 0.5, -5],
    color: '#0f172a',
    accentColor: '#38bdf8',
    fireRateMs: 110,
    tracerColor: '#60a5fa',
    magazineCapacity: 25,
  },
};

export const MAP_BOUNDS = {
  minX: -26,
  maxX: 26,
  minZ: -26,
  maxZ: 26,
};

// Cover objects / building boxes for world geometry and cover play
export interface MapObstacle {
  id: string;
  position: [number, number, number];
  size: [number, number, number];
  rotationY?: number;
  type: 'wall' | 'barrier' | 'bunker' | 'container' | 'building' | 'crate' | 'pillar';
}

export const MAP_OBSTACLES: MapObstacle[] = [
  // 1. Concrete Perimeter Walls
  { id: 'perim_north', position: [0, 2.0, -28], size: [56, 4.0, 0.8], rotationY: 0, type: 'wall' },
  { id: 'perim_south', position: [0, 2.0, 28], size: [56, 4.0, 0.8], rotationY: 0, type: 'wall' },
  { id: 'perim_west', position: [-28, 2.0, 0], size: [0.8, 4.0, 56], rotationY: 0, type: 'wall' },
  { id: 'perim_east', position: [28, 2.0, 0], size: [0.8, 4.0, 56], rotationY: 0, type: 'wall' },

  // 2. Concrete Jersey Barriers
  { id: 'jersey_center_north', position: [0, 0.525, -3.2], size: [3.2, 1.05, 0.65], rotationY: 0, type: 'barrier' },
  { id: 'jersey_center_south', position: [0, 0.525, 3.2], size: [3.2, 1.05, 0.65], rotationY: 0, type: 'barrier' },
  { id: 'jersey_diag_nw', position: [-6.5, 0.525, 8.5], size: [3.2, 1.05, 0.65], rotationY: Math.PI / 4, type: 'barrier' },
  { id: 'jersey_diag_se', position: [6.5, 0.525, -8.5], size: [3.2, 1.05, 0.65], rotationY: Math.PI / 4, type: 'barrier' },
  { id: 'jersey_diag_ne', position: [-10.5, 0.525, -4.5], size: [3.2, 1.05, 0.65], rotationY: -Math.PI / 6, type: 'barrier' },
  { id: 'jersey_diag_sw', position: [10.5, 0.525, 4.5], size: [3.2, 1.05, 0.65], rotationY: -Math.PI / 6, type: 'barrier' },

  // 3. Sandbag Bunkers
  { id: 'sandbag_mid_left', position: [-4.5, 0.525, 1.5], size: [2.6, 1.05, 0.8], rotationY: Math.PI / 2, type: 'bunker' },
  { id: 'sandbag_mid_right', position: [4.5, 0.525, -1.5], size: [2.6, 1.05, 0.8], rotationY: -Math.PI / 2, type: 'bunker' },
  { id: 'sandbag_flank_left', position: [-12, 0.525, 6], size: [2.6, 1.05, 0.8], rotationY: 0, type: 'bunker' },
  { id: 'sandbag_flank_right', position: [12, 0.525, -6], size: [2.6, 1.05, 0.8], rotationY: 0, type: 'bunker' },

  // 4. Shipping Containers
  { id: 'container_alpha', position: [-9, 1.3, -9], size: [6.5, 2.6, 2.5], rotationY: 0.2, type: 'container' },
  { id: 'container_bravo', position: [9, 1.3, 9], size: [6.5, 2.6, 2.5], rotationY: -0.2, type: 'container' },

  // 5. Command Bunker 1
  { id: 'bunker1_back_wall', position: [-16, 1.8, -14], size: [7.5, 3.6, 0.6], rotationY: 0, type: 'building' },
  { id: 'bunker1_left_wall', position: [-19.45, 1.8, -10.5], size: [0.6, 3.6, 7.0], rotationY: 0, type: 'building' },
  { id: 'bunker1_right_wall_lower', position: [-12.55, 1.0, -10.5], size: [0.6, 2.0, 7.0], rotationY: 0, type: 'building' },
  { id: 'bunker1_right_wall_upper', position: [-12.55, 2.9, -10.5], size: [0.6, 1.4, 7.0], rotationY: 0, type: 'building' },
  { id: 'bunker1_roof', position: [-16, 3.75, -10.5], size: [8.0, 0.4, 7.6], rotationY: 0, type: 'building' },

  // 6. Observation Shoot House 2
  { id: 'bunker2_back_wall', position: [16, 1.8, 14], size: [7.5, 3.6, 0.6], rotationY: 0, type: 'building' },
  { id: 'bunker2_right_wall', position: [19.45, 1.8, 10.5], size: [0.6, 3.6, 7.0], rotationY: 0, type: 'building' },
  { id: 'bunker2_left_wall_lower', position: [12.55, 1.0, 10.5], size: [0.6, 2.0, 7.0], rotationY: 0, type: 'building' },
  { id: 'bunker2_left_wall_upper', position: [12.55, 2.9, 10.5], size: [0.6, 1.4, 7.0], rotationY: 0, type: 'building' },
  { id: 'bunker2_roof', position: [16, 3.75, 10.5], size: [8.0, 0.4, 7.6], rotationY: 0, type: 'building' },

  // 7. Ammo Crates
  { id: 'crates_center', position: [0, 0.65, 0], size: [1.5, 1.3, 1.1], rotationY: 0, type: 'crate' },
  { id: 'crates_flank_1', position: [-3.5, 0.65, 7.5], size: [1.5, 1.3, 1.1], rotationY: 0, type: 'crate' },
  { id: 'crates_flank_2', position: [3.5, 0.65, -7.5], size: [1.5, 1.3, 1.1], rotationY: 0, type: 'crate' },

  // 8. Tower Poles
  { id: 'tower_nw', position: [-24, 3.5, -24], size: [0.5, 7.0, 0.5], rotationY: 0, type: 'pillar' },
  { id: 'tower_ne', position: [24, 3.5, -24], size: [0.5, 7.0, 0.5], rotationY: 0, type: 'pillar' },
  { id: 'tower_sw', position: [-24, 3.5, 24], size: [0.5, 7.0, 0.5], rotationY: 0, type: 'pillar' },
  { id: 'tower_se', position: [24, 3.5, 24], size: [0.5, 7.0, 0.5], rotationY: 0, type: 'pillar' },
];
