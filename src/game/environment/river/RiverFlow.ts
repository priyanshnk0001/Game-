/**
 * River System - Spline Geometry, Flow Kinematics & Terrain Profiling
 *
 * Implements Catmull-Rom river spline sampling, local flow vectors,
 * river bed elevation profiling for terrain depression carving, and
 * transverse UV generation for realistic along-river water movement.
 */

import * as THREE from 'three';
import { RiverConfig, SECTOR02_RIVER_CONFIG } from './riverConfig';

export interface RiverSampledPoint {
  x: number;
  z: number;
  width: number;
  depth: number;
  arcLength: number;
  tangentX: number;
  tangentZ: number;
  normalX: number;
  normalZ: number;
}

export interface RiverProfileResult {
  isInsideRiver: boolean;
  isInsideBank: boolean;
  distToCenterline: number;
  halfWidth: number;
  bankWidth: number;
  crossT: number;        // 0.0 at center, 1.0 at waterline
  bankT: number;         // 0.0 at waterline, 1.0 at upper bank verge
  bedElevation: number;  // Y elevation of the river bed beneath water
  waterDepth: number;    // Depth of water column at this point
  waterLevel: number;    // Water surface elevation
  flowDirection: [number, number]; // [dx, dz] normalized flow vector
}

// Catmull-Rom 2D interpolation with width & depth interpolation
function catmullRom4D(
  p0: [number, number, number, number],
  p1: [number, number, number, number],
  p2: [number, number, number, number],
  p3: [number, number, number, number],
  t: number
): [number, number, number, number] {
  const t2 = t * t;
  const t3 = t2 * t;

  const res: [number, number, number, number] = [0, 0, 0, 0];
  for (let c = 0; c < 4; c++) {
    res[c] =
      0.5 *
      (2 * p1[c] +
        (-p0[c] + p2[c]) * t +
        (2 * p0[c] - 5 * p1[c] + 4 * p2[c] - p3[c]) * t2 +
        (-p0[c] + 3 * p1[c] - 3 * p2[c] + p3[c]) * t3);
  }
  return res;
}

/**
 * Samples a continuous smooth river spline with local widths and depths from waypoints.
 */
export function sampleRiverSpline(config: RiverConfig, samplesPerSegment = 18): RiverSampledPoint[] {
  const pts = config.waypoints;
  const n = pts.length;
  if (n < 2) return [];

  const rawPoints: [number, number, number, number][] = pts.map((w) => [
    w.x,
    w.z,
    w.width ?? config.defaultWidth,
    w.depth ?? config.defaultDepth,
  ]);

  const sampled: { x: number; z: number; width: number; depth: number }[] = [];

  for (let i = 0; i < n - 1; i++) {
    const p0 = rawPoints[Math.max(0, i - 1)];
    const p1 = rawPoints[i];
    const p2 = rawPoints[i + 1];
    const p3 = rawPoints[Math.min(n - 1, i + 2)];

    for (let s = 0; s < samplesPerSegment; s++) {
      const t = s / samplesPerSegment;
      const [x, z, width, depth] = catmullRom4D(p0, p1, p2, p3, t);
      sampled.push({ x, z, width, depth });
    }
  }

  // Final endpoint
  const last = rawPoints[n - 1];
  sampled.push({ x: last[0], z: last[1], width: last[2], depth: last[3] });

  // Compute tangents, normals, and arc-lengths
  const result: RiverSampledPoint[] = [];
  let cumLength = 0;

  for (let i = 0; i < sampled.length; i++) {
    const curr = sampled[i];
    const prev = sampled[Math.max(0, i - 1)];
    const next = sampled[Math.min(sampled.length - 1, i + 1)];

    if (i > 0) {
      cumLength += Math.hypot(curr.x - prev.x, curr.z - prev.z);
    }

    const dx = next.x - prev.x;
    const dz = next.z - prev.z;
    const len = Math.hypot(dx, dz) || 1.0;
    const tx = dx / len;
    const tz = dz / len;

    // Perpendicular normal (pointing towards right bank)
    const nx = -tz;
    const nz = tx;

    result.push({
      x: curr.x,
      z: curr.z,
      width: curr.width,
      depth: curr.depth,
      arcLength: cumLength,
      tangentX: tx,
      tangentZ: tz,
      normalX: nx,
      normalZ: nz,
    });
  }

  return result;
}

// Cached dense spline for Sector-02 default river
let cachedSector02Spline: RiverSampledPoint[] | null = null;

export function getSector02RiverSpline(): RiverSampledPoint[] {
  if (!cachedSector02Spline) {
    cachedSector02Spline = sampleRiverSpline(SECTOR02_RIVER_CONFIG, 18);
  }
  return cachedSector02Spline;
}

/**
 * Evaluates the river channel profile, depth, and bank slope at any world position (x, z).
 * Used by getJungleTerrainHeight to mathematically carve the riverbed into terrain.
 */
export function getRiverProfile(
  x: number,
  z: number,
  config: RiverConfig = SECTOR02_RIVER_CONFIG,
  spline: RiverSampledPoint[] = getSector02RiverSpline()
): RiverProfileResult {
  const n = spline.length;
  let minDistSq = Infinity;
  let closestIdx = 0;

  // Find closest segment along spline polyline
  for (let i = 0; i < n - 1; i++) {
    const p1 = spline[i];
    const p2 = spline[i + 1];

    const dx = p2.x - p1.x;
    const dz = p2.z - p1.z;
    const lenSq = dx * dx + dz * dz;
    if (lenSq < 1e-4) continue;

    let t = ((x - p1.x) * dx + (z - p1.z) * dz) / lenSq;
    t = Math.max(0, Math.min(1, t));

    const projX = p1.x + t * dx;
    const projZ = p1.z + t * dz;
    const dSq = (x - projX) * (x - projX) + (z - projZ) * (z - projZ);

    if (dSq < minDistSq) {
      minDistSq = dSq;
      closestIdx = i;
    }
  }

  const distToCenterline = Math.sqrt(minDistSq);
  const pt = spline[closestIdx];
  const halfWidth = pt.width * 0.5;
  const bankWidth = config.bankWidth;
  const waterLevel = config.waterLevel;

  const isInsideRiver = distToCenterline < halfWidth;
  const isInsideBank = distToCenterline < halfWidth + bankWidth;

  const crossT = Math.min(1.0, distToCenterline / halfWidth);
  const bankT = isInsideRiver ? 0.0 : Math.min(1.0, (distToCenterline - halfWidth) / bankWidth);

  // Parabolic carved channel bed: deeper at center, smoothly meeting waterLevel at edges
  const depthFactor = Math.max(0, 1.0 - crossT * crossT);
  const waterDepth = isInsideRiver ? depthFactor * pt.depth : 0;
  const bedElevation = waterLevel - waterDepth;

  return {
    isInsideRiver,
    isInsideBank,
    distToCenterline,
    halfWidth,
    bankWidth,
    crossT,
    bankT,
    bedElevation,
    waterDepth,
    waterLevel,
    flowDirection: [pt.tangentX, pt.tangentZ],
  };
}

/**
 * Builds high-density continuous 3D water mesh following the river spline curves.
 * Generates flow-aligned UVs where V runs along the local curve direction.
 */
export function buildRiverWaterGeometry(
  config: RiverConfig = SECTOR02_RIVER_CONFIG,
  spline: RiverSampledPoint[] = getSector02RiverSpline()
): THREE.BufferGeometry {
  const n = spline.length;
  const RINGS = 15; // High transverse mesh density across river width

  const positions: number[] = [];
  const uvs: number[] = [];
  const flowParams: number[] = [];
  const indices: number[] = [];

  for (let i = 0; i < n; i++) {
    const pt = spline[i];
    // Extend slightly into bank (0.25m) so water seamlessly embeds into sloping ground
    const halfW = pt.width * 0.5 + 0.25;
    const arcLen = pt.arcLength;

    for (let j = 0; j < RINGS; j++) {
      const u = j / (RINGS - 1); // 0.0 at left bank, 0.5 at center, 1.0 at right bank
      const offset = (u - 0.5) * 2.0 * halfW;

      const wx = pt.x + pt.normalX * offset;
      const wz = pt.z + pt.normalZ * offset;

      // Subtle natural water meniscus curve
      const edgeFactor = Math.abs(u - 0.5) * 2.0;
      const surfaceCurvature = (1.0 - edgeFactor * edgeFactor) * 0.03;
      const wy = config.waterLevel + surfaceCurvature;

      positions.push(wx, wy, wz);

      // Flow UV: U across river [0..1], V along flow direction (scaled to ~6m texture repeat)
      uvs.push(u, arcLen / 6.0);

      // aRiverParams: x = normalized distance from center [0..1], y = velocity multiplier (center faster than edges)
      const flowVel = 1.0 - edgeFactor * edgeFactor * 0.45;
      flowParams.push(edgeFactor, flowVel);
    }

    if (i < n - 1) {
      const base = i * RINGS;
      const nextBase = (i + 1) * RINGS;

      for (let j = 0; j < RINGS - 1; j++) {
        const a = base + j;
        const b = base + j + 1;
        const c = nextBase + j;
        const d = nextBase + j + 1;

        indices.push(a, c, b);
        indices.push(b, c, d);
      }
    }
  }

  const geom = new THREE.BufferGeometry();
  geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geom.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geom.setAttribute('aRiverParams', new THREE.Float32BufferAttribute(flowParams, 2));
  geom.setIndex(indices);
  geom.computeVertexNormals();

  return geom;
}
