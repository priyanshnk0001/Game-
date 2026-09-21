import React, { useMemo } from 'react';
import * as THREE from 'three';
import {
  getJungleTerrainHeight,
  JUNGLE_ROAD_NETWORKS,
  getDistanceToRoads,
  checkRoadClearance,
  JungleRoadDef,
} from '../../config/maps';

// ============================================================================
// 1. PROCEDURAL 3D FOLIAGE GEOMETRY & ROAD TEXTURES
// ============================================================================

// Helper: 3D Clump Geometry for Realistic Tropical Grass (3 Intersecting Cards)
function createGrassClumpGeometry(width = 0.85, height = 0.75): THREE.BufferGeometry {
  const geom = new THREE.BufferGeometry();
  const halfW = width / 2;
  const positions: number[] = [];
  const uvs: number[] = [];
  const normals: number[] = [];
  const indices: number[] = [];

  const angles = [0, Math.PI / 3, (2 * Math.PI) / 3];
  let vertOffset = 0;

  angles.forEach((angle) => {
    const cos = Math.cos(angle) * halfW;
    const sin = Math.sin(angle) * halfW;

    positions.push(-cos, 0, -sin);
    positions.push(cos, 0, sin);
    positions.push(cos, height, sin);
    positions.push(-cos, height, -sin);

    uvs.push(0, 0, 1, 0, 1, 1, 0, 1);
    normals.push(0, 0.7, 0, 0, 0.7, 0, 0, 0.9, 0, 0, 0.9, 0);

    indices.push(
      vertOffset, vertOffset + 1, vertOffset + 2,
      vertOffset, vertOffset + 2, vertOffset + 3,
      vertOffset + 2, vertOffset + 1, vertOffset,
      vertOffset + 3, vertOffset + 2, vertOffset
    );
    vertOffset += 4;
  });

  geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geom.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geom.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geom.setIndex(indices);
  return geom;
}

// Helper: 3D Clump Geometry for Realistic Tropical Ground Ferns
function createFernClumpGeometry(width = 1.3, height = 0.65): THREE.BufferGeometry {
  const geom = new THREE.BufferGeometry();
  const halfW = width / 2;
  const positions: number[] = [];
  const uvs: number[] = [];
  const normals: number[] = [];
  const indices: number[] = [];

  const angles = [Math.PI / 6, Math.PI / 2, (5 * Math.PI) / 6];
  let vertOffset = 0;

  angles.forEach((angle) => {
    const cos = Math.cos(angle) * halfW;
    const sin = Math.sin(angle) * halfW;

    positions.push(-cos, 0, -sin);
    positions.push(cos, 0, sin);
    positions.push(cos * 1.15, height, sin * 1.15);
    positions.push(-cos * 1.15, height, -sin * 1.15);

    uvs.push(0, 0, 1, 0, 1, 1, 0, 1);
    normals.push(0, 0.75, 0, 0, 0.75, 0, 0, 0.95, 0, 0, 0.95, 0);

    indices.push(
      vertOffset, vertOffset + 1, vertOffset + 2,
      vertOffset, vertOffset + 2, vertOffset + 3,
      vertOffset + 2, vertOffset + 1, vertOffset,
      vertOffset + 3, vertOffset + 2, vertOffset
    );
    vertOffset += 4;
  });

  geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geom.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geom.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geom.setIndex(indices);
  return geom;
}

function createDirtRoadTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  const imgData = ctx.createImageData(512, 512);
  const d = imgData.data;

  // Realistic tropical dirt road: muted earthy brown/tan with subtle organic noise & soft wheel ruts
  for (let y = 0; y < 512; y++) {
    const rowOffset = y * 512 * 4;
    for (let x = 0; x < 512; x++) {
      const u = x / 512; // cross-road axis

      // Smooth organic 2D ground noise (multiple spatial frequencies)
      const n1 = Math.sin(x * 0.05 + y * 0.04) * 0.5 + Math.cos(x * 0.08 - y * 0.06) * 0.5;
      const n2 = Math.sin(x * 0.14 - y * 0.11) * 0.5 + Math.cos(x * 0.09 + y * 0.16) * 0.5;
      const n3 = Math.sin(x * 0.32 + y * 0.28) * 0.5 + Math.cos(x * 0.22 - y * 0.35) * 0.5;
      const noise = n1 * 0.55 + n2 * 0.30 + n3 * 0.15; // in [-1, 1]

      // Subtle wheel-tracks: two soft depressions at u=0.31 and u=0.69 (darker moist compacted soil)
      const distTrackL = Math.abs(u - 0.31) / 0.11;
      const distTrackR = Math.abs(u - 0.69) / 0.11;
      const trackL = Math.exp(-distTrackL * distTrackL * 2.2);
      const trackR = Math.exp(-distTrackR * distTrackR * 2.2);
      const trackWear = Math.max(trackL, trackR); // [0, 1]

      // Center crown vs edge profile (center is slightly lighter dry earth/gravel)
      const centerCrown = Math.max(0, 1.0 - Math.abs(u - 0.5) / 0.18);

      // Base earthy dirt palette:
      // Neutral compacted earth: RGB(88, 72, 54)
      // Damp wheel track: RGB(68, 54, 40)
      // Dry center gravel: RGB(98, 82, 64)
      let r = 88 - trackWear * 20 + centerCrown * 10;
      let g = 72 - trackWear * 18 + centerCrown * 10;
      let b = 54 - trackWear * 14 + centerCrown * 10;

      // Apply organic noise variation (soil mottling)
      r += noise * 14;
      g += noise * 12;
      b += noise * 10;

      // Fine tactile gravel / sand grain
      const grain = (Math.random() - 0.5) * 12;
      const idx = rowOffset + x * 4;
      d[idx] = Math.min(255, Math.max(0, r + grain));
      d[idx + 1] = Math.min(255, Math.max(0, g + grain));
      d[idx + 2] = Math.min(255, Math.max(0, b + grain));
      d[idx + 3] = 255;
    }
  }

  ctx.putImageData(imgData, 0, 0);

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(1, 1);
  return tex;
}

function createPathTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  const imgData = ctx.createImageData(256, 256);
  const d = imgData.data;

  // Beaten dirt footpath: organic muted clay/loam
  for (let y = 0; y < 256; y++) {
    const rowOffset = y * 256 * 4;
    for (let x = 0; x < 256; x++) {
      const u = x / 256;
      const center = Math.max(0, 1.0 - Math.abs(u - 0.5) * 2.2);

      const n1 = Math.sin(x * 0.08 + y * 0.07) * 0.5 + Math.cos(x * 0.12 - y * 0.09) * 0.5;
      const n2 = Math.sin(x * 0.25 - y * 0.2) * 0.5 + Math.cos(x * 0.18 + y * 0.28) * 0.5;
      const noise = n1 * 0.65 + n2 * 0.35;

      let r = 84 - center * 12 + noise * 12;
      let g = 68 - center * 10 + noise * 10;
      let b = 50 - center * 8 + noise * 8;

      const grain = (Math.random() - 0.5) * 10;
      const idx = rowOffset + x * 4;
      d[idx] = Math.min(255, Math.max(0, r + grain));
      d[idx + 1] = Math.min(255, Math.max(0, g + grain));
      d[idx + 2] = Math.min(255, Math.max(0, b + grain));
      d[idx + 3] = 255;
    }
  }

  ctx.putImageData(imgData, 0, 0);

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(1, 1);
  return tex;
}

function createTreeBarkTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#483526';
  ctx.fillRect(0, 0, 256, 512);

  for (let x = 0; x < 256; x += 3) {
    ctx.strokeStyle = Math.random() > 0.4 ? '#281d14' : '#5e4736';
    ctx.lineWidth = 1 + Math.random() * 2.5;
    ctx.beginPath();
    ctx.moveTo(x + (Math.random() - 0.5) * 4, 0);
    ctx.bezierCurveTo(
      x + (Math.random() - 0.5) * 12,
      170,
      x + (Math.random() - 0.5) * 12,
      340,
      x + (Math.random() - 0.5) * 4,
      512
    );
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2, 4);
  return tex;
}

function createWeatheredWoodTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#604c38';
  ctx.fillRect(0, 0, 512, 512);

  for (let y = 0; y < 512; y += 42) {
    ctx.strokeStyle = '#302318';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(512, y);
    ctx.stroke();
  }

  for (let i = 0; i < 600; i++) {
    ctx.strokeStyle = Math.random() > 0.5 ? '#483828' : '#785f46';
    ctx.lineWidth = 1 + Math.random() * 1.5;
    const y = Math.random() * 512;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(512, y + (Math.random() - 0.5) * 6);
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(3, 3);
  return tex;
}

function createCorrugatedRoofTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#909a94';
  ctx.fillRect(0, 0, 512, 512);

  for (let x = 0; x < 512; x += 16) {
    ctx.fillStyle = '#b4bfb8';
    ctx.fillRect(x, 0, 8, 512);
    ctx.fillStyle = '#626a64';
    ctx.fillRect(x + 8, 0, 8, 512);
  }

  for (let i = 0; i < 40; i++) {
    const rx = Math.random() * 512;
    const ry = Math.random() * 512;
    const rw = 12 + Math.random() * 32;
    const rh = 30 + Math.random() * 90;
    ctx.fillStyle = `rgba(${140 + Math.random() * 40}, ${80 + Math.random() * 30}, ${40 + Math.random() * 20}, 0.5)`;
    ctx.fillRect(rx, ry, rw, rh);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(4, 4);
  return tex;
}

function createSandbagTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#988468';
  ctx.fillRect(0, 0, 256, 256);

  ctx.strokeStyle = '#72604a';
  ctx.lineWidth = 1;
  for (let x = 0; x < 256; x += 4) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, 256);
    ctx.stroke();
  }
  for (let y = 0; y < 256; y += 4) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(256, y);
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2, 2);
  return tex;
}

// ============================================================================
// 2. MATHEMATICAL SPLINE ROAD SYSTEM (FRENET FRAMES & TERRAIN ADAPTATION)
// ============================================================================

// Helper: Catmull-Rom interpolation of 2D curve
function sampleCatmullRom(points: [number, number][], samplesPerSeg = 8): [number, number][] {
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

      // Catmull-Rom matrix coefficients
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

// Generate continuous 3D Ribbon Mesh for a Road Spline with Soft Feathered Shoulders and Terrain Conformance
function createSplineRoadGeometry(road: JungleRoadDef, samplesPerSeg = 8): THREE.BufferGeometry {
  const curvePts = sampleCatmullRom(road.points, samplesPerSeg);
  const vertexCount = curvePts.length * 5; // 5 cross-section vertices: [L-shoulder, L-edge, Center, R-edge, R-shoulder]
  const positions = new Float32Array(vertexCount * 3);
  const uvs = new Float32Array(vertexCount * 2);
  const colors = new Float32Array(vertexCount * 3);
  const indices: number[] = [];

  const halfW = road.width * 0.5;
  const shoulderExtra = road.width > 5.0 ? 1.25 : 0.85;
  let totalLength = 0;

  for (let i = 0; i < curvePts.length; i++) {
    const [cx, cz] = curvePts[i];

    // Compute tangent vector
    let tx = 1;
    let tz = 0;
    if (i < curvePts.length - 1 && i > 0) {
      tx = curvePts[i + 1][0] - curvePts[i - 1][0];
      tz = curvePts[i + 1][1] - curvePts[i - 1][1];
    } else if (i < curvePts.length - 1) {
      tx = curvePts[i + 1][0] - cx;
      tz = curvePts[i + 1][1] - cz;
    } else if (i > 0) {
      tx = cx - curvePts[i - 1][0];
      tz = cz - curvePts[i - 1][1];
    }
    const tLen = Math.hypot(tx, tz) || 1;
    tx /= tLen;
    tz /= tLen;

    // Perpendicular normal: N = (-T.z, T.x)
    const nx = -tz;
    const nz = tx;

    if (i > 0) {
      totalLength += Math.hypot(cx - curvePts[i - 1][0], cz - curvePts[i - 1][1]);
    }

    // Bridge ramp elevation integration (smooth cosine ramp meeting bridge deck at y=0.25)
    let baseGroundY = getJungleTerrainHeight(cx, cz);
    const distToBridge = Math.hypot(cx, cz);
    let bridgeFactor = 0;
    if (distToBridge < 12.0) {
      bridgeFactor = Math.cos((distToBridge / 12.0) * (Math.PI / 2));
      baseGroundY = THREE.MathUtils.lerp(baseGroundY, 0.22, bridgeFactor);
    }

    // Natural subtle shoulder irregularity (worn, organic edge)
    const wobbleL = Math.sin(cx * 0.35 + cz * 0.28) * 0.24 + Math.cos(cx * 0.72 - cz * 0.65) * 0.12;
    const wobbleR = Math.sin(cx * 0.31 - cz * 0.42) * 0.24 + Math.cos(cx * 0.82 + cz * 0.58) * 0.12;
    const leftShoulderW = halfW + shoulderExtra + wobbleL;
    const rightShoulderW = halfW + shoulderExtra + wobbleR;

    const vBase = i * 5;
    const vCoord = totalLength * 0.12; // Natural, non-stretched texture repetition

    // 1. Left Soft Shoulder (feathers flush into terrain loam)
    const lxS = cx - nx * leftShoulderW;
    const lzS = cz - nz * leftShoulderW;
    let lyS = getJungleTerrainHeight(lxS, lzS) + 0.006;
    if (bridgeFactor > 0) lyS = THREE.MathUtils.lerp(lyS, 0.20, bridgeFactor);
    positions[(vBase + 0) * 3] = lxS;
    positions[(vBase + 0) * 3 + 1] = lyS;
    positions[(vBase + 0) * 3 + 2] = lzS;
    uvs[(vBase + 0) * 2] = 0.0;
    uvs[(vBase + 0) * 2 + 1] = vCoord;
    // Shoulder blends into jungle ground color: RGB(0.34, 0.44, 0.28)
    colors[(vBase + 0) * 3] = 0.34;
    colors[(vBase + 0) * 3 + 1] = 0.44;
    colors[(vBase + 0) * 3 + 2] = 0.28;

    // 2. Left Road Edge (gravel / compacted dirt boundary)
    const lxE = cx - nx * halfW;
    const lzE = cz - nz * halfW;
    let lyE = getJungleTerrainHeight(lxE, lzE) + 0.024;
    if (bridgeFactor > 0) lyE = THREE.MathUtils.lerp(lyE, 0.22, bridgeFactor);
    positions[(vBase + 1) * 3] = lxE;
    positions[(vBase + 1) * 3 + 1] = lyE;
    positions[(vBase + 1) * 3 + 2] = lzE;
    uvs[(vBase + 1) * 2] = 0.22;
    uvs[(vBase + 1) * 2 + 1] = vCoord;
    // Gravel edge transition color
    colors[(vBase + 1) * 3] = 0.56;
    colors[(vBase + 1) * 3 + 1] = 0.48;
    colors[(vBase + 1) * 3 + 2] = 0.38;

    // 3. Center Crown (+0.04m flush embedment into terrain)
    const cy = baseGroundY + 0.040;
    positions[(vBase + 2) * 3] = cx;
    positions[(vBase + 2) * 3 + 1] = cy;
    positions[(vBase + 2) * 3 + 2] = cz;
    uvs[(vBase + 2) * 2] = 0.5;
    uvs[(vBase + 2) * 2 + 1] = vCoord;
    // Driving crown compacted dirt color
    colors[(vBase + 2) * 3] = 0.68;
    colors[(vBase + 2) * 3 + 1] = 0.58;
    colors[(vBase + 2) * 3 + 2] = 0.46;

    // 4. Right Road Edge
    const rxE = cx + nx * halfW;
    const rzE = cz + nz * halfW;
    let ryE = getJungleTerrainHeight(rxE, rzE) + 0.024;
    if (bridgeFactor > 0) ryE = THREE.MathUtils.lerp(ryE, 0.22, bridgeFactor);
    positions[(vBase + 3) * 3] = rxE;
    positions[(vBase + 3) * 3 + 1] = ryE;
    positions[(vBase + 3) * 3 + 2] = rzE;
    uvs[(vBase + 3) * 2] = 0.78;
    uvs[(vBase + 3) * 2 + 1] = vCoord;
    colors[(vBase + 3) * 3] = 0.56;
    colors[(vBase + 3) * 3 + 1] = 0.48;
    colors[(vBase + 3) * 3 + 2] = 0.38;

    // 5. Right Soft Shoulder (feathers flush into terrain loam)
    const rxS = cx + nx * rightShoulderW;
    const rzS = cz + nz * rightShoulderW;
    let ryS = getJungleTerrainHeight(rxS, rzS) + 0.006;
    if (bridgeFactor > 0) ryS = THREE.MathUtils.lerp(ryS, 0.20, bridgeFactor);
    positions[(vBase + 4) * 3] = rxS;
    positions[(vBase + 4) * 3 + 1] = ryS;
    positions[(vBase + 4) * 3 + 2] = rzS;
    uvs[(vBase + 4) * 2] = 1.0;
    uvs[(vBase + 4) * 2 + 1] = vCoord;
    colors[(vBase + 4) * 3] = 0.34;
    colors[(vBase + 4) * 3 + 1] = 0.44;
    colors[(vBase + 4) * 3 + 2] = 0.28;

    // Triangulate: Counter-clockwise winding so normal points UP (+Y)
    if (i > 0) {
      const prev = (i - 1) * 5;
      const curr = i * 5;
      for (let quad = 0; quad < 4; quad++) {
        indices.push(prev + quad, prev + quad + 1, curr + quad);
        indices.push(curr + quad, prev + quad + 1, curr + quad + 1);
      }
    }
  }

  const geom = new THREE.BufferGeometry();
  geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geom.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  geom.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geom.setIndex(indices);
  geom.computeVertexNormals();
  return geom;
}

// Generate Seamless Road Intersection Junction Apron Mesh
function createRoadJunctionGeometry(cx: number, cz: number, radius: number, segments = 24): THREE.BufferGeometry {
  const vertexCount = segments + 1;
  const positions = new Float32Array(vertexCount * 3);
  const uvs = new Float32Array(vertexCount * 2);
  const colors = new Float32Array(vertexCount * 3);
  const indices: number[] = [];

  // Center vertex (driving crown)
  const cy = getJungleTerrainHeight(cx, cz) + 0.035;
  positions[0] = cx;
  positions[1] = cy;
  positions[2] = cz;
  uvs[0] = 0.5;
  uvs[1] = 0.5;
  colors[0] = 0.68;
  colors[1] = 0.58;
  colors[2] = 0.46;

  for (let s = 0; s < segments; s++) {
    const angle = (s / segments) * Math.PI * 2;
    const wobble = Math.sin(angle * 3.0) * 0.24 + Math.cos(angle * 5.0) * 0.14;
    const r = radius + wobble;
    const px = cx + Math.cos(angle) * r;
    const pz = cz + Math.sin(angle) * r;
    const py = getJungleTerrainHeight(px, pz) + 0.006;

    const idx = (s + 1) * 3;
    positions[idx] = px;
    positions[idx + 1] = py;
    positions[idx + 2] = pz;

    const uvIdx = (s + 1) * 2;
    uvs[uvIdx] = 0.5 + Math.cos(angle) * 0.48;
    uvs[uvIdx + 1] = 0.5 + Math.sin(angle) * 0.48;

    // Outer edge blends into jungle loam
    colors[idx] = 0.34;
    colors[idx + 1] = 0.44;
    colors[idx + 2] = 0.28;

    // Triangle to next perimeter point
    const next = s === segments - 1 ? 1 : s + 2;
    indices.push(0, s + 1, next);
  }

  const geom = new THREE.BufferGeometry();
  geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geom.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  geom.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geom.setIndex(indices);
  geom.computeVertexNormals();
  return geom;
}

// ============================================================================
// 3. VILLAGE & OUTPOST ARCHITECTURE (AUTHENTIC HUMAN SCALE)
// ============================================================================

// Traditional Southeast Asian Stilt Cottage (Upgraded Realistic Timber Framing, Veranda & Shutter Windows)
const VillageStiltHouse: React.FC<{
  position: [number, number, number];
  size: [number, number, number];
  rotationY?: number;
  wallMaterial: THREE.Material;
  roofMaterial: THREE.Material;
  woodMaterial: THREE.Material;
}> = ({ position, size, rotationY = 0, wallMaterial, roofMaterial, woodMaterial }) => {
  const [w, h, d] = size;
  const stiltHeight = 1.35;

  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      {/* 6 Heavy Timber Stilt Pillars with Ground Footing Brackets */}
      {[-w * 0.42, 0, w * 0.42].flatMap((px) =>
        [-d * 0.42, d * 0.42].map((pz, idx) => (
          <group key={`${px}-${idx}`} position={[px, stiltHeight * 0.5, pz]}>
            <mesh castShadow receiveShadow material={woodMaterial}>
              <cylinderGeometry args={[0.14, 0.16, stiltHeight, 8]} />
            </mesh>
            {/* Concrete / Stone Foundation Pier */}
            <mesh position={[0, -stiltHeight * 0.45, 0]} receiveShadow material={woodMaterial}>
              <boxGeometry args={[0.36, 0.22, 0.36]} />
            </mesh>
          </group>
        ))
      )}

      {/* Timber Diagonal Under-Floor Cross-Braces */}
      {[-w * 0.22, w * 0.22].map((bx, i) => (
        <mesh key={`brace-${i}`} position={[bx, stiltHeight * 0.5, 0]} rotation={[0, 0, i === 0 ? 0.35 : -0.35]} castShadow material={woodMaterial}>
          <cylinderGeometry args={[0.07, 0.07, stiltHeight * 1.3, 6]} />
        </mesh>
      ))}

      {/* Heavy Timber Floor Sub-Frame & Planked Veranda Deck */}
      <mesh position={[0, stiltHeight, 0.3]} receiveShadow material={woodMaterial}>
        <boxGeometry args={[w + 0.35, 0.22, d + 1.8]} />
      </mesh>
      {/* Deck Perimeter Edge Fascia */}
      <mesh position={[0, stiltHeight + 0.08, d * 0.5 + 1.15]} castShadow material={woodMaterial}>
        <boxGeometry args={[w + 0.4, 0.12, 0.08]} />
      </mesh>

      {/* Main Living Enclosure */}
      <mesh position={[0, stiltHeight + h * 0.5, -0.4]} castShadow receiveShadow material={wallMaterial}>
        <boxGeometry args={[w, h, d]} />
      </mesh>

      {/* Front Entrance Wooden Door Frame & Recessed Panel */}
      <group position={[-w * 0.2, stiltHeight + 0.95, d * 0.5 - 0.38]}>
        <mesh position={[0, 0, 0.04]} castShadow material={woodMaterial}>
          <boxGeometry args={[1.0, 1.9, 0.08]} />
        </mesh>
        <mesh position={[0, 0, 0.06]} material={woodMaterial}>
          <boxGeometry args={[0.82, 1.75, 0.02]} />
        </mesh>
      </group>

      {/* Louvered Window Shutters (Front Veranda Facing) */}
      <group position={[w * 0.22, stiltHeight + 1.25, d * 0.5 - 0.38]}>
        <mesh position={[0, 0, 0.04]} castShadow material={woodMaterial}>
          <boxGeometry args={[1.1, 1.0, 0.06]} />
        </mesh>
        {/* Louver Blades */}
        {[-0.28, 0, 0.28].map((ly, idx) => (
          <mesh key={idx} position={[0, ly, 0.06]} rotation={[0.2, 0, 0]} material={woodMaterial}>
            <boxGeometry args={[0.9, 0.14, 0.02]} />
          </mesh>
        ))}
      </group>

      {/* Veranda Porch Front Railing, Balusters & Support Posts */}
      <group position={[0, stiltHeight, d * 0.5 + 0.3]}>
        {/* Handrail */}
        <mesh position={[0, 0.85, 0.85]} castShadow material={woodMaterial}>
          <boxGeometry args={[w - 0.3, 0.08, 0.1]} />
        </mesh>
        {/* Bottom Rail */}
        <mesh position={[0, 0.15, 0.85]} castShadow material={woodMaterial}>
          <boxGeometry args={[w - 0.3, 0.06, 0.08]} />
        </mesh>
        {/* Vertical Baluster Spindles */}
        {[-w * 0.35, -w * 0.15, w * 0.05, w * 0.25].map((vx, i) => (
          <mesh key={i} position={[vx, 0.5, 0.85]} castShadow material={woodMaterial}>
            <cylinderGeometry args={[0.035, 0.035, 0.65, 6]} />
          </mesh>
        ))}
        {/* Full-Height Porch Columns */}
        {[-w * 0.42, w * 0.42].map((vx, i) => (
          <mesh key={`col-${i}`} position={[vx, h * 0.5, 0.85]} castShadow material={woodMaterial}>
            <cylinderGeometry args={[0.08, 0.09, h, 8]} />
          </mesh>
        ))}
        {/* Veranda Awning Overhang */}
        <mesh position={[0, h + 0.12, 0.4]} rotation={[0.24, 0, 0]} castShadow material={roofMaterial}>
          <boxGeometry args={[w + 0.35, 0.1, 1.6]} />
        </mesh>
      </group>

      {/* Entry Wooden Stairs with Step Treads */}
      <group position={[w * 0.3, 0, d * 0.5 + 1.25]} rotation={[-0.38, 0, 0]}>
        <mesh position={[-0.38, stiltHeight * 0.5, 0]} castShadow material={woodMaterial}>
          <boxGeometry args={[0.08, 0.16, stiltHeight * 1.6]} />
        </mesh>
        <mesh position={[0.38, stiltHeight * 0.5, 0]} castShadow material={woodMaterial}>
          <boxGeometry args={[0.08, 0.16, stiltHeight * 1.6]} />
        </mesh>
        {[-0.45, -0.15, 0.15, 0.45].map((tz, i) => (
          <mesh key={i} position={[0, stiltHeight * 0.5 + tz * 0.5, tz * 0.9]} castShadow material={woodMaterial}>
            <boxGeometry args={[0.74, 0.06, 0.22]} />
          </mesh>
        ))}
      </group>

      {/* Pitched Corrugated Metal Roof with Deep Overhangs & Ridge Cap Beam */}
      <group position={[0, stiltHeight + h + 0.68, -0.4]}>
        <mesh position={[-w * 0.3, 0, 0]} rotation={[0, 0, 0.44]} castShadow material={roofMaterial}>
          <boxGeometry args={[w * 0.72, 0.12, d + 1.4]} />
        </mesh>
        <mesh position={[w * 0.3, 0, 0]} rotation={[0, 0, -0.44]} castShadow material={roofMaterial}>
          <boxGeometry args={[w * 0.72, 0.12, d + 1.4]} />
        </mesh>
        {/* Ridge Capping Beam */}
        <mesh position={[0, 0.48, 0]} castShadow material={roofMaterial}>
          <boxGeometry args={[0.25, 0.15, d + 1.5]} />
        </mesh>
      </group>
    </group>
  );
};

// Village Chief 2-Story Building (Plaster Lower Level, Timber Upper Balcony, Louvered Windows)
const VillageChiefHouse: React.FC<{
  position: [number, number, number];
  rotationY?: number;
  wallMaterial: THREE.Material;
  woodMaterial: THREE.Material;
  roofMaterial: THREE.Material;
}> = ({ position, rotationY = 0, wallMaterial, woodMaterial, roofMaterial }) => {
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      {/* Lower Level Concrete Plaster Base */}
      <mesh position={[0, 1.4, 0]} castShadow receiveShadow material={wallMaterial}>
        <boxGeometry args={[8.6, 2.8, 7.6]} />
      </mesh>
      {/* Ground Floor Entrance Doorway */}
      <mesh position={[0, 1.1, 3.82]} castShadow material={woodMaterial}>
        <boxGeometry args={[1.3, 2.2, 0.1]} />
      </mesh>
      {/* Ground Floor Flanking Windows */}
      {[-2.6, 2.6].map((wx, i) => (
        <mesh key={i} position={[wx, 1.35, 3.82]} castShadow material={woodMaterial}>
          <boxGeometry args={[1.1, 1.1, 0.08]} />
        </mesh>
      ))}

      {/* Upper Level Timber Living Area */}
      <mesh position={[0, 3.85, 0]} castShadow receiveShadow material={woodMaterial}>
        <boxGeometry args={[8.4, 2.2, 7.4]} />
      </mesh>
      {/* Upper Floor Louvered Window Shutters */}
      {[-2.5, 0, 2.5].map((wx, i) => (
        <mesh key={`up-win-${i}`} position={[wx, 4.0, 3.72]} castShadow material={woodMaterial}>
          <boxGeometry args={[1.2, 1.2, 0.08]} />
        </mesh>
      ))}

      {/* Front Balcony Promenade with Timber Railings */}
      <mesh position={[0, 2.7, 4.3]} receiveShadow material={woodMaterial}>
        <boxGeometry args={[8.4, 0.22, 1.5]} />
      </mesh>
      <mesh position={[0, 3.35, 5.0]} castShadow material={woodMaterial}>
        <boxGeometry args={[8.2, 0.85, 0.08]} />
      </mesh>
      {/* Balcony Support Corbels */}
      {[-3.6, -1.2, 1.2, 3.6].map((cx, i) => (
        <mesh key={i} position={[cx, 2.4, 4.1]} rotation={[0.4, 0, 0]} castShadow material={woodMaterial}>
          <boxGeometry args={[0.14, 0.45, 0.8]} />
        </mesh>
      ))}

      {/* Pitched Corrugated Tin Roof with Overhangs and Ridge Capping */}
      <group position={[0, 5.55, 0]}>
        <mesh position={[-2.5, 0, 0]} rotation={[0, 0, 0.42]} castShadow material={roofMaterial}>
          <boxGeometry args={[5.8, 0.14, 9.2]} />
        </mesh>
        <mesh position={[2.5, 0, 0]} rotation={[0, 0, -0.42]} castShadow material={roofMaterial}>
          <boxGeometry args={[5.8, 0.14, 9.2]} />
        </mesh>
        {/* Peak Ridge Cap */}
        <mesh position={[0, 1.1, 0]} castShadow material={roofMaterial}>
          <boxGeometry args={[0.3, 0.18, 9.3]} />
        </mesh>
      </group>
    </group>
  );
};

// Village Market Stall / Trading Post (Detailed Timber Trusses, Counters, and Produce Crates)
const VillageMarketShed: React.FC<{
  position: [number, number, number];
  rotationY?: number;
  woodMaterial: THREE.Material;
  roofMaterial: THREE.Material;
}> = ({ position, rotationY = 0, woodMaterial, roofMaterial }) => {
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      {/* 6 Heavy Timber Rafter Posts */}
      {[-4.0, 0, 4.0].flatMap((px) =>
        [-2.5, 2.5].map((pz, idx) => (
          <mesh key={`${px}-${idx}`} position={[px, 1.6, pz]} castShadow material={woodMaterial}>
            <cylinderGeometry args={[0.13, 0.14, 3.2, 8]} />
          </mesh>
        ))
      )}
      {/* Longitudinal Roof Support Beams */}
      {[-2.5, 2.5].map((pz, i) => (
        <mesh key={`beam-${i}`} position={[0, 3.1, pz]} castShadow material={woodMaterial}>
          <boxGeometry args={[8.6, 0.16, 0.16]} />
        </mesh>
      ))}

      {/* Front and Back Market Trading Counters */}
      <mesh position={[0, 0.65, -1.8]} castShadow receiveShadow material={woodMaterial}>
        <boxGeometry args={[7.6, 0.85, 1.2]} />
      </mesh>
      <mesh position={[0, 0.65, 1.8]} castShadow receiveShadow material={woodMaterial}>
        <boxGeometry args={[7.6, 0.85, 1.2]} />
      </mesh>

      {/* Market Produce / Supply Crates resting on Counters */}
      {[-2.4, -0.8, 1.2, 2.8].map((cx, i) => (
        <mesh key={`crate-${i}`} position={[cx, 1.2, (i % 2 === 0 ? -1.8 : 1.8)]} castShadow receiveShadow material={woodMaterial}>
          <boxGeometry args={[0.8, 0.45, 0.7]} />
        </mesh>
      ))}

      {/* Sloped Metal Roof Canopy */}
      <mesh position={[0, 3.35, 0]} rotation={[0.08, 0, 0]} castShadow material={roofMaterial}>
        <boxGeometry args={[9.8, 0.12, 6.8]} />
      </mesh>
    </group>
  );
};

// Heavy Timber Trestle Bridge (Spans central creek ravine on 45-deg road axis)
const TimberTrestleBridge: React.FC<{
  position: [number, number, number];
  length: number;
  width: number;
  rotationY?: number;
  woodMaterial: THREE.Material;
}> = ({ position, length, width, rotationY = 0, woodMaterial }) => {
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      {/* Bridge Deck Planking */}
      <mesh position={[0, 0.25, 0]} receiveShadow material={woodMaterial}>
        <boxGeometry args={[width, 0.35, length]} />
      </mesh>

      {/* Sloped Timber Approach Threshold Ramps at Both Ends (Smooth transition to dirt road grade) */}
      <mesh position={[0, 0.12, -length * 0.5 - 0.7]} rotation={[0.18, 0, 0]} receiveShadow material={woodMaterial}>
        <boxGeometry args={[width, 0.22, 1.4]} />
      </mesh>
      <mesh position={[0, 0.12, length * 0.5 + 0.7]} rotation={[-0.18, 0, 0]} receiveShadow material={woodMaterial}>
        <boxGeometry args={[width, 0.22, 1.4]} />
      </mesh>

      {/* Lateral Guardrails & Stanchions */}
      {[-width * 0.5 + 0.15, width * 0.5 - 0.15].map((gx, i) => (
        <group key={i}>
          {/* Top Rail */}
          <mesh position={[gx, 1.05, 0]} castShadow material={woodMaterial}>
            <boxGeometry args={[0.18, 0.15, length]} />
          </mesh>
          {/* Mid Rail */}
          <mesh position={[gx, 0.65, 0]} castShadow material={woodMaterial}>
            <boxGeometry args={[0.14, 0.12, length]} />
          </mesh>
          {/* Vertical Stanchion Posts */}
          {[-length * 0.4, -length * 0.2, 0, length * 0.2, length * 0.4].map((sz, j) => (
            <mesh key={j} position={[gx, 0.65, sz]} castShadow material={woodMaterial}>
              <boxGeometry args={[0.15, 0.85, 0.15]} />
            </mesh>
          ))}
        </group>
      ))}

      {/* Deep Timber Trestle Pilings Driven into Ravine Bed */}
      {[-length * 0.3, 0, length * 0.3].map((pz, idx) => (
        <group key={idx} position={[0, -1.2, pz]}>
          <mesh position={[-width * 0.4, 0, 0]} castShadow receiveShadow material={woodMaterial}>
            <cylinderGeometry args={[0.22, 0.24, 2.8, 8]} />
          </mesh>
          <mesh position={[width * 0.4, 0, 0]} castShadow receiveShadow material={woodMaterial}>
            <cylinderGeometry args={[0.22, 0.24, 2.8, 8]} />
          </mesh>
          <mesh position={[0, 0.9, 0]} castShadow material={woodMaterial}>
            <boxGeometry args={[width, 0.3, 0.3]} />
          </mesh>
        </group>
      ))}
    </group>
  );
};

// Tactical Observation Watchtower (Perched on high ground)
const TacticalWatchtower: React.FC<{
  position: [number, number, number];
  height: number;
  rotationY?: number;
  woodMaterial: THREE.Material;
  roofMaterial: THREE.Material;
}> = ({ position, height, rotationY = 0, woodMaterial, roofMaterial }) => {
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      {[-1.8, 1.8].flatMap((lx) =>
        [-1.8, 1.8].map((lz, idx) => (
          <mesh
            key={`${lx}-${idx}`}
            position={[lx * 0.85, height * 0.5, lz * 0.85]}
            rotation={[lz > 0 ? -0.06 : 0.06, 0, lx > 0 ? 0.06 : -0.06]}
            castShadow
            material={woodMaterial}
          >
            <cylinderGeometry args={[0.18, 0.24, height, 8]} />
          </mesh>
        ))
      )}
      {/* Observation Deck Platform */}
      <mesh position={[0, height, 0]} receiveShadow material={woodMaterial}>
        <boxGeometry args={[4.4, 0.3, 4.4]} />
      </mesh>
      {/* Perimeter Railings */}
      <mesh position={[0, height + 0.55, 2.1]} castShadow material={woodMaterial}>
        <boxGeometry args={[4.2, 0.8, 0.1]} />
      </mesh>
      <mesh position={[0, height + 0.55, -2.1]} castShadow material={woodMaterial}>
        <boxGeometry args={[4.2, 0.8, 0.1]} />
      </mesh>
      <mesh position={[2.1, height + 0.55, 0]} castShadow material={woodMaterial}>
        <boxGeometry args={[0.1, 0.8, 4.2]} />
      </mesh>
      {/* Lookout Roof */}
      <group position={[0, height + 2.6, 0]}>
        <mesh castShadow material={roofMaterial}>
          <coneGeometry args={[3.2, 1.1, 4]} />
        </mesh>
      </group>
    </group>
  );
};

// ============================================================================
// 4. MULTI-SPECIES VEGETATION ASSETS
// ============================================================================

const RainforestEmergentTree: React.FC<{
  position: [number, number, number];
  height?: number;
  scale?: number;
  rotationY?: number;
  barkMaterial: THREE.Material;
  leafMaterial: THREE.Material;
  leafHighlightMaterial: THREE.Material;
}> = ({ position, height = 12.0, scale = 1.0, rotationY = 0, barkMaterial, leafMaterial, leafHighlightMaterial }) => {
  return (
    <group position={position} rotation={[0, rotationY, 0]} scale={[scale, scale, scale]}>
      {/* 1. Main Tapered Tree Trunk */}
      <mesh position={[0, height * 0.45, 0]} castShadow receiveShadow material={barkMaterial}>
        <cylinderGeometry args={[0.42, 0.9, height * 0.9, 10]} />
      </mesh>

      {/* 2. Flared Buttress Roots (4 Radiating Base Fins) */}
      {[0, Math.PI * 0.5, Math.PI, Math.PI * 1.5].map((angle, i) => (
        <group key={`root-${i}`} rotation={[0, angle + 0.15, 0]}>
          <mesh position={[0.75, 0.7, 0]} rotation={[0, 0, -0.45]} castShadow receiveShadow material={barkMaterial}>
            <boxGeometry args={[1.1, 1.4, 0.22]} />
          </mesh>
        </group>
      ))}

      {/* 3. Primary Branching Limbs */}
      <mesh position={[-1.1, height * 0.72, 0.5]} rotation={[0.35, 0.4, 0.6]} castShadow material={barkMaterial}>
        <cylinderGeometry args={[0.22, 0.38, 3.2, 8]} />
      </mesh>
      <mesh position={[1.2, height * 0.76, -0.6]} rotation={[-0.4, -0.3, -0.55]} castShadow material={barkMaterial}>
        <cylinderGeometry args={[0.2, 0.35, 3.0, 8]} />
      </mesh>
      <mesh position={[0.4, height * 0.82, 0.9]} rotation={[0.5, -0.2, 0.3]} castShadow material={barkMaterial}>
        <cylinderGeometry args={[0.18, 0.3, 2.6, 8]} />
      </mesh>

      {/* 4. Multi-Tiered Rainforest Canopy (Layered Umbrella Silhouettes) */}
      <group position={[0, height, 0]}>
        {/* Main Central Crown Dome */}
        <mesh position={[0, 1.2, 0]} scale={[1.4, 0.85, 1.4]} castShadow receiveShadow material={leafMaterial}>
          <dodecahedronGeometry args={[3.4, 2]} />
        </mesh>
        {/* Sunlit Crown Highlights */}
        <mesh position={[-0.2, 2.6, -0.2]} scale={[1.1, 0.75, 1.1]} castShadow material={leafHighlightMaterial}>
          <dodecahedronGeometry args={[2.4, 2]} />
        </mesh>
        {/* West Outspread Canopy Clump */}
        <mesh position={[-2.4, 0.3, 1.1]} scale={[1.15, 0.75, 1.05]} castShadow receiveShadow material={leafMaterial}>
          <dodecahedronGeometry args={[2.5, 2]} />
        </mesh>
        {/* East Outspread Canopy Clump */}
        <mesh position={[2.3, 0.5, -1.0]} scale={[1.1, 0.75, 1.2]} castShadow receiveShadow material={leafHighlightMaterial}>
          <dodecahedronGeometry args={[2.5, 2]} />
        </mesh>
        {/* South Lower Canopy Clump */}
        <mesh position={[0.6, -0.4, 1.8]} scale={[1.0, 0.65, 1.0]} castShadow receiveShadow material={leafMaterial}>
          <dodecahedronGeometry args={[2.1, 2]} />
        </mesh>
      </group>
    </group>
  );
};

const TropicalPalmTree: React.FC<{
  position: [number, number, number];
  height?: number;
  rotationY?: number;
  leanAngle?: number;
  barkMaterial: THREE.Material;
  frondMaterial: THREE.Material;
  woodMaterial: THREE.Material;
}> = ({ position, height = 8.5, rotationY = 0, leanAngle = 0.12, barkMaterial, frondMaterial, woodMaterial }) => {
  return (
    <group position={position} rotation={[0, rotationY, leanAngle]}>
      {/* Segmented Curved Palm Trunk with Natural Ring Bands */}
      <mesh position={[0.2, height * 0.32, 0]} rotation={[0, 0, -0.06]} castShadow receiveShadow material={barkMaterial}>
        <cylinderGeometry args={[0.24, 0.36, height * 0.65, 8]} />
      </mesh>
      <mesh position={[0.68, height * 0.75, 0]} rotation={[0, 0, -0.15]} castShadow receiveShadow material={barkMaterial}>
        <cylinderGeometry args={[0.18, 0.24, height * 0.52, 8]} />
      </mesh>

      {/* Palm Crown Under-Frond Coconut Clusters */}
      <group position={[1.15, height - 0.25, 0]}>
        {[-0.18, 0, 0.18].map((cx, i) => (
          <mesh key={i} position={[cx, -0.15, (i % 2 === 0 ? 0.14 : -0.14)]} castShadow material={woodMaterial}>
            <sphereGeometry args={[0.2, 8, 8]} />
          </mesh>
        ))}
      </group>

      {/* 12 Arching Curved Palm Fronds with Realistic Droop */}
      <group position={[1.15, height, 0]}>
        {[0, 0.52, 1.05, 1.57, 2.09, 2.62, 3.14, 3.67, 4.19, 4.71, 5.24, 5.76].map((angle, i) => {
          const droop = 0.48 + (i % 4) * 0.08;
          const frondLen = 3.4 + (i % 3) * 0.3;
          return (
            <group key={i} rotation={[0, angle, 0]}>
              {/* Main arching frond stem */}
              <mesh position={[frondLen * 0.48, -0.4, 0]} rotation={[0, 0, -droop]} castShadow receiveShadow material={frondMaterial}>
                <boxGeometry args={[frondLen, 0.06, 0.7]} />
              </mesh>
            </group>
          );
        })}
      </group>
    </group>
  );
};

const BanyanTree: React.FC<{
  position: [number, number, number];
  scale?: number;
  rotationY?: number;
  barkMaterial: THREE.Material;
  leafMaterial: THREE.Material;
}> = ({ position, scale = 1.0, rotationY = 0, barkMaterial, leafMaterial }) => {
  return (
    <group position={position} rotation={[0, rotationY, 0]} scale={[scale, scale, scale]}>
      {/* Massive Fluted Trunk */}
      <mesh position={[0, 4.0, 0]} castShadow receiveShadow material={barkMaterial}>
        <cylinderGeometry args={[0.75, 1.25, 8.0, 10]} />
      </mesh>
      {/* 6 Descending Aerial Prop Roots */}
      {[
        [-1.9, 3.5, 1.3],
        [2.0, 3.5, -1.1],
        [0.9, 3.5, 2.1],
        [-1.3, 3.5, -1.8],
        [-0.7, 3.5, 1.9],
        [1.6, 3.5, 1.2]
      ].map(([rx, ry, rz], i) => (
        <mesh key={i} position={[rx, ry, rz]} castShadow receiveShadow material={barkMaterial}>
          <cylinderGeometry args={[0.11, 0.16, 7.0, 6]} />
        </mesh>
      ))}
      {/* Spreading Umbrella Canopy */}
      <group position={[0, 7.8, 0]}>
        <mesh scale={[1.85, 0.65, 1.85]} castShadow receiveShadow material={leafMaterial}>
          <dodecahedronGeometry args={[4.4, 2]} />
        </mesh>
        <mesh position={[0, 1.4, 0]} scale={[1.4, 0.65, 1.4]} castShadow material={leafMaterial}>
          <dodecahedronGeometry args={[3.2, 2]} />
        </mesh>
      </group>
    </group>
  );
};

const BambooThicket: React.FC<{
  position: [number, number, number];
  height?: number;
  woodMaterial: THREE.Material;
  leafMaterial: THREE.Material;
}> = ({ position, height = 6.5, woodMaterial, leafMaterial }) => {
  return (
    <group position={position}>
      {[
        [-0.45, -0.3], [0.35, -0.45], [-0.55, 0.25], [0.22, 0.45],
        [0.62, -0.15], [-0.25, 0.62], [0, 0], [0.52, 0.52]
      ].map(([bx, bz], i) => (
        <mesh
          key={i}
          position={[bx, height * 0.45, bz]}
          rotation={[(i % 2 === 0 ? 0.04 : -0.04), 0, (i % 3 === 0 ? 0.05 : -0.05)]}
          castShadow
          material={woodMaterial}
        >
          <cylinderGeometry args={[0.065, 0.085, height * 0.9, 8]} />
        </mesh>
      ))}
      {/* Bamboo Plume Canopy */}
      <mesh position={[0, height, 0]} scale={[1.5, 0.8, 1.5]} castShadow material={leafMaterial}>
        <dodecahedronGeometry args={[1.6, 1]} />
      </mesh>
    </group>
  );
};

const JungleFernCluster: React.FC<{
  position: [number, number, number];
  scale?: number;
  leafMaterial: THREE.Material;
}> = ({ position, scale = 1.0, leafMaterial }) => {
  return (
    <group position={position} scale={[scale, scale, scale]}>
      {[0, 0.78, 1.57, 2.36, 3.14, 3.93, 4.71, 5.5].map((angle, i) => (
        <mesh
          key={i}
          position={[Math.cos(angle) * 0.7, 0.35, Math.sin(angle) * 0.7]}
          rotation={[0.38, angle, 0]}
          castShadow
          material={leafMaterial}
        >
          <boxGeometry args={[1.35, 0.05, 0.65]} />
        </mesh>
      ))}
    </group>
  );
};

// ============================================================================
// 4.5. REALISTIC 3D INSTANCED TROPICAL GRASS & UNDERGROWTH
// ============================================================================

const RealisticJungleGrassLayer: React.FC<{
  material: THREE.Material;
  fernMaterial: THREE.Material;
}> = ({ material, fernMaterial }) => {
  const grassMeshRef = React.useRef<THREE.InstancedMesh>(null);
  const fernMeshRef = React.useRef<THREE.InstancedMesh>(null);

  const grassGeom = useMemo(() => createGrassClumpGeometry(0.85, 0.75), []);
  const fernGeom = useMemo(() => createFernClumpGeometry(1.3, 0.65), []);

  const { grassInstances, fernInstances } = useMemo(() => {
    const grass: { pos: [number, number, number]; rot: number; scale: [number, number, number]; color: THREE.Color }[] = [];
    const ferns: { pos: [number, number, number]; rot: number; scale: [number, number, number]; color: THREE.Color }[] = [];

    // Building/Structure exclusion zones [x, z, radius]
    const exclusions: [number, number, number][] = [
      [44, 52, 6.5], [60, 38, 6.5], [42, 22, 6.5], [66, 60, 6.5],
      [26, 62, 6.0], [50, 74, 6.0], [30, 42, 7.0], [38, 44, 4.0], [54, 46, 4.0],
      [36, -32, 6.0], [54, -36, 6.0], [58, -58, 6.0], [42, -42, 4.0], [50, -64, 4.0],
      [0, 68, 5.0], [2, -6, 12.0],
    ];

    let seed = 42891;
    function pseudoRandom() {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    }

    const numCandidates = 6000;
    for (let i = 0; i < numCandidates; i++) {
      const x = (pseudoRandom() - 0.5) * 190;
      const z = (pseudoRandom() - 0.5) * 190;

      // FOB Sabre interior yard clearance
      if (x > -70 && x < -34 && z > -68 && z < -34) continue;

      const y = getJungleTerrainHeight(x, z);
      if (y < -0.35) continue; // Below waterline

      let insideExclusion = false;
      for (const [exX, exZ, exR] of exclusions) {
        const dx = x - exX;
        const dz = z - exZ;
        if (dx * dx + dz * dz < exR * exR) {
          insideExclusion = true;
          break;
        }
      }
      if (insideExclusion) continue;

      // Strict Road Clearance Check
      const roadCheck = checkRoadClearance(x, z, 0.45, 0.35);
      if (!roadCheck.isClear) continue;

      const baseScale = 0.8 + pseudoRandom() * 0.55;
      const heightMult = 0.9 + pseudoRandom() * 0.6;
      const rot = pseudoRandom() * Math.PI * 2;

      const tintWeight = pseudoRandom();
      const col = new THREE.Color().setRGB(
        0.20 + tintWeight * 0.12,
        0.48 + tintWeight * 0.16,
        0.18 + tintWeight * 0.08
      );

      grass.push({
        pos: [x, y, z],
        rot,
        scale: [baseScale, baseScale * heightMult, baseScale],
        color: col,
      });

      if (grass.length >= 3200) break;
    }

    for (let i = 0; i < 2000; i++) {
      const x = (pseudoRandom() - 0.5) * 185;
      const z = (pseudoRandom() - 0.5) * 185;

      if (x > -70 && x < -34 && z > -68 && z < -34) continue;
      const y = getJungleTerrainHeight(x, z);
      if (y < -0.3) continue;

      let insideExclusion = false;
      for (const [exX, exZ, exR] of exclusions) {
        const dx = x - exX;
        const dz = z - exZ;
        if (dx * dx + dz * dz < (exR + 0.5) * (exR + 0.5)) {
          insideExclusion = true;
          break;
        }
      }
      if (insideExclusion) continue;

      const roadCheck = checkRoadClearance(x, z, 0.6, 0.4);
      if (!roadCheck.isClear) continue;

      const baseScale = 0.85 + pseudoRandom() * 0.5;
      const rot = pseudoRandom() * Math.PI * 2;
      const col = new THREE.Color().setRGB(
        0.18 + pseudoRandom() * 0.08,
        0.44 + pseudoRandom() * 0.12,
        0.20 + pseudoRandom() * 0.06
      );

      ferns.push({
        pos: [x, y, z],
        rot,
        scale: [baseScale, baseScale * 0.9, baseScale],
        color: col,
      });

      if (ferns.length >= 650) break;
    }

    return { grassInstances: grass, fernInstances: ferns };
  }, []);

  React.useEffect(() => {
    if (grassMeshRef.current) {
      const dummy = new THREE.Object3D();
      grassInstances.forEach((inst, i) => {
        dummy.position.set(inst.pos[0], inst.pos[1], inst.pos[2]);
        dummy.rotation.set(0, inst.rot, 0);
        dummy.scale.set(inst.scale[0], inst.scale[1], inst.scale[2]);
        dummy.updateMatrix();
        grassMeshRef.current!.setMatrixAt(i, dummy.matrix);
        grassMeshRef.current!.setColorAt(i, inst.color);
      });
      grassMeshRef.current.instanceMatrix.needsUpdate = true;
      if (grassMeshRef.current.instanceColor) {
        grassMeshRef.current.instanceColor.needsUpdate = true;
      }
    }

    if (fernMeshRef.current) {
      const dummy = new THREE.Object3D();
      fernInstances.forEach((inst, i) => {
        dummy.position.set(inst.pos[0], inst.pos[1], inst.pos[2]);
        dummy.rotation.set(0, inst.rot, 0);
        dummy.scale.set(inst.scale[0], inst.scale[1], inst.scale[2]);
        dummy.updateMatrix();
        fernMeshRef.current!.setMatrixAt(i, dummy.matrix);
        fernMeshRef.current!.setColorAt(i, inst.color);
      });
      fernMeshRef.current.instanceMatrix.needsUpdate = true;
      if (fernMeshRef.current.instanceColor) {
        fernMeshRef.current.instanceColor.needsUpdate = true;
      }
    }
  }, [grassInstances, fernInstances]);

  return (
    <group name="TropicalUndergrowthGroundCover">
      <instancedMesh
        ref={grassMeshRef}
        args={[grassGeom, material, grassInstances.length]}
        castShadow
        receiveShadow
      />
      <instancedMesh
        ref={fernMeshRef}
        args={[fernGeom, fernMaterial, fernInstances.length]}
        castShadow
        receiveShadow
      />
    </group>
  );
};

// ============================================================================
// 5. MASTER SECTOR-02 OPEN-WORLD ENVIRONMENT RENDERER
// ============================================================================

export const JungleMap: React.FC = () => {
  // PBR Textures & Materials
  const materials = useMemo(() => {
    const loader = new THREE.TextureLoader();

    // 1. PBR Jungle Ground Textures (Poly Haven CC0 Forest Leaves 02)
    const groundDiffuse = loader.load('/assets/environment/ground/jungle_ground_diffuse.jpg');
    groundDiffuse.wrapS = THREE.RepeatWrapping;
    groundDiffuse.wrapT = THREE.RepeatWrapping;
    groundDiffuse.repeat.set(24, 24);
    groundDiffuse.colorSpace = THREE.SRGBColorSpace;

    const groundNormal = loader.load('/assets/environment/ground/jungle_ground_normal.jpg');
    groundNormal.wrapS = THREE.RepeatWrapping;
    groundNormal.wrapT = THREE.RepeatWrapping;
    groundNormal.repeat.set(24, 24);

    const groundRoughness = loader.load('/assets/environment/ground/jungle_ground_roughness.jpg');
    groundRoughness.wrapS = THREE.RepeatWrapping;
    groundRoughness.wrapT = THREE.RepeatWrapping;
    groundRoughness.repeat.set(24, 24);

    const groundAO = loader.load('/assets/environment/ground/jungle_ground_ao.jpg');
    groundAO.wrapS = THREE.RepeatWrapping;
    groundAO.wrapT = THREE.RepeatWrapping;
    groundAO.repeat.set(24, 24);

    // 2. Realistic Tropical Grass & Fern Textures (Poly Haven CC0)
    const grassDiffuse = loader.load('/assets/environment/grass/tropical_grass_diffuse.png');
    grassDiffuse.colorSpace = THREE.SRGBColorSpace;

    const grassNormal = loader.load('/assets/environment/grass/tropical_grass_normal.jpg');

    const fernDiffuse = loader.load('/assets/environment/grass/tropical_fern_diffuse.png');
    fernDiffuse.colorSpace = THREE.SRGBColorSpace;

    const roadTex = createDirtRoadTexture();
    const pathTex = createPathTexture();
    const barkTex = createTreeBarkTexture();
    const woodTex = createWeatheredWoodTexture();
    const roofTex = createCorrugatedRoofTexture();
    const sandbagTex = createSandbagTexture();

    const ground = new THREE.MeshStandardMaterial({
      map: groundDiffuse,
      normalMap: groundNormal,
      normalScale: new THREE.Vector2(0.85, 0.85),
      roughnessMap: groundRoughness,
      aoMap: groundAO,
      aoMapIntensity: 1.0,
      roughness: 0.85,
      metalness: 0.02,
    });

    const tropicalGrass = new THREE.MeshStandardMaterial({
      map: grassDiffuse,
      normalMap: grassNormal,
      normalScale: new THREE.Vector2(0.65, 0.65),
      alphaTest: 0.35,
      transparent: false,
      roughness: 0.65,
      metalness: 0.02,
      side: THREE.DoubleSide,
      shadowSide: THREE.DoubleSide,
    });

    const tropicalFern = new THREE.MeshStandardMaterial({
      map: fernDiffuse,
      alphaTest: 0.35,
      transparent: false,
      roughness: 0.60,
      metalness: 0.02,
      side: THREE.DoubleSide,
      shadowSide: THREE.DoubleSide,
    });

    const road = new THREE.MeshStandardMaterial({
      map: roadTex,
      vertexColors: true,
      roughness: 0.90,
      metalness: 0.02,
      side: THREE.DoubleSide,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
    });

    const path = new THREE.MeshStandardMaterial({
      map: pathTex,
      vertexColors: true,
      roughness: 0.92,
      metalness: 0.02,
      side: THREE.DoubleSide,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
    });

    const bark = new THREE.MeshStandardMaterial({
      map: barkTex,
      roughness: 0.88,
      metalness: 0.03,
      color: '#76604c',
    });

    const leaves = new THREE.MeshStandardMaterial({
      color: '#347738',
      roughness: 0.65,
      metalness: 0.04,
      flatShading: false,
    });

    const leafHighlight = new THREE.MeshStandardMaterial({
      color: '#4fa155',
      roughness: 0.6,
      metalness: 0.03,
      flatShading: false,
    });

    const palmFronds = new THREE.MeshStandardMaterial({
      color: '#3d8848',
      roughness: 0.62,
      metalness: 0.04,
      side: THREE.DoubleSide,
    });

    const bambooStalks = new THREE.MeshStandardMaterial({
      color: '#658f44',
      roughness: 0.72,
      metalness: 0.06,
    });

    const weatheredWood = new THREE.MeshStandardMaterial({
      map: woodTex,
      roughness: 0.84,
      metalness: 0.06,
      color: '#634f3c',
    });

    const villagePlaster = new THREE.MeshStandardMaterial({
      color: '#b8ab96',
      roughness: 0.85,
      metalness: 0.04,
    });

    const brickWall = new THREE.MeshStandardMaterial({
      color: '#825644',
      roughness: 0.88,
      metalness: 0.05,
    });

    const tinRoof = new THREE.MeshStandardMaterial({
      map: roofTex,
      roughness: 0.58,
      metalness: 0.42,
    });

    const sandbag = new THREE.MeshStandardMaterial({
      map: sandbagTex,
      roughness: 0.94,
      metalness: 0.02,
      color: '#a08a6e',
    });

    const camoContainer = new THREE.MeshStandardMaterial({
      color: '#3f563b',
      roughness: 0.65,
      metalness: 0.35,
    });

    const mossyStone = new THREE.MeshStandardMaterial({
      color: '#4e5e4b',
      roughness: 0.9,
      metalness: 0.06,
      flatShading: false,
    });

    const streamWater = new THREE.MeshStandardMaterial({
      color: '#244e45',
      roughness: 0.08,
      metalness: 0.82,
      transparent: true,
      opacity: 0.82,
    });

    const horizonMountain = new THREE.MeshStandardMaterial({
      color: '#385844',
      roughness: 0.96,
      metalness: 0.02,
    });

    return {
      ground,
      tropicalGrass,
      tropicalFern,
      road,
      path,
      bark,
      leaves,
      leafHighlight,
      palmFronds,
      bambooStalks,
      weatheredWood,
      villagePlaster,
      brickWall,
      tinRoof,
      sandbag,
      camoContainer,
      mossyStone,
      streamWater,
      horizonMountain,
    };
  }, []);

  // 160x160 High-Density Terrain Mesh (220m x 220m)
  const terrainGeometry = useMemo(() => {
    const size = 220;
    const segments = 150;
    const geom = new THREE.PlaneGeometry(size, size, segments, segments);
    geom.rotateX(-Math.PI / 2);

    const pos = geom.attributes.position;
    const colors = new Float32Array(pos.count * 3);

    for (let i = 0; i < pos.count; i++) {
      const vx = pos.getX(i);
      const vz = pos.getZ(i);
      const vy = getJungleTerrainHeight(vx, vz);
      pos.setY(i, vy);

      // 3-octave continuous macro biome variation across the 220m landscape
      const n1 = Math.sin(vx * 0.038 + vz * 0.026) * 0.45;
      const n2 = Math.cos(vx * 0.072 - vz * 0.058) * 0.35;
      const n3 = Math.sin(vx * 0.014 - vz * 0.018) * 0.20;
      const macroNoise = n1 + n2 + n3; // in [-1.0, 1.0]

      // Organic color zones:
      // Zone 1 (macroNoise < -0.2): Deep damp dark brown loam / valley soil
      // Zone 2 (-0.2 to 0.3): Rich tropical forest earth with leaf litter
      // Zone 3 (macroNoise > 0.3): Muted desaturated olive organic mossy earth
      let cr: number, cg: number, cb: number;
      if (macroNoise < -0.2) {
        const t = (macroNoise + 1.0) / 0.8;
        cr = 0.68 + t * 0.14;
        cg = 0.62 + t * 0.14;
        cb = 0.52 + t * 0.12;
      } else if (macroNoise < 0.3) {
        const t = (macroNoise + 0.2) / 0.5;
        cr = 0.82 + t * 0.08;
        cg = 0.76 + t * 0.08;
        cb = 0.64 + t * 0.06;
      } else {
        const t = (macroNoise - 0.3) / 0.7;
        cr = 0.90 - t * 0.10;
        cg = 0.84 + t * 0.08;
        cb = 0.70 - t * 0.08;
      }

      // Road verge transition: feather subtly near roads
      const distToRoad = getDistanceToRoads(vx, vz);
      if (distToRoad < 3.5) {
        const verge = 1.0 - distToRoad / 3.5;
        cr = cr * (1.0 - verge * 0.20) + 0.88 * verge * 0.20;
        cg = cg * (1.0 - verge * 0.20) + 0.82 * verge * 0.20;
        cb = cb * (1.0 - verge * 0.20) + 0.72 * verge * 0.20;
      }

      colors[i * 3] = cr;
      colors[i * 3 + 1] = cg;
      colors[i * 3 + 2] = cb;
    }

    geom.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geom.computeVertexNormals();
    geom.setAttribute('uv2', geom.attributes.uv);
    return geom;
  }, []);

  // Road Spline Geometries (Mathematically Ribboned with Upward Normals & Shared Coordinates)
  const mainRoadGeom = useMemo(() => createSplineRoadGeometry(JUNGLE_ROAD_NETWORKS[0]), []);
  const southLoopGeom = useMemo(() => createSplineRoadGeometry(JUNGLE_ROAD_NETWORKS[1]), []);
  const northRidgeGeom = useMemo(() => createSplineRoadGeometry(JUNGLE_ROAD_NETWORKS[2]), []);
  const banKhaoPathsGeom = useMemo(() => createSplineRoadGeometry(JUNGLE_ROAD_NETWORKS[3]), []);
  const banNamPathsGeom = useMemo(() => createSplineRoadGeometry(JUNGLE_ROAD_NETWORKS[4]), []);

  // Seamless Continuous Intersection Junction Aprons
  const westJunctionGeom = useMemo(() => createRoadJunctionGeometry(-12, -14, 6.8), []);
  const eastJunctionGeom = useMemo(() => createRoadJunctionGeometry(12, 14, 6.8), []);
  const northRidgeJunctionGeom = useMemo(() => createRoadJunctionGeometry(34, 35, 5.5), []);

  // Encircling Mountain Ridge Horizon Rim
  const horizonMountainGeometry = useMemo(() => {
    const geom = new THREE.CylinderGeometry(135, 115, 34, 48, 4, true);
    const pos = geom.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const vx = pos.getX(i);
      const vy = pos.getY(i);
      const vz = pos.getZ(i);
      const angle = Math.atan2(vz, vx);
      const ridgeNoise =
        Math.sin(angle * 6) * 5.5 +
        Math.sin(angle * 14) * 2.8 +
        Math.cos(angle * 22) * 1.5;
      pos.setY(i, vy + ridgeNoise);
    }
    geom.computeVertexNormals();
    return geom;
  }, []);

  // Filtered Vegetation Arrays (Strict Road Clearance: min distance > roadWidth/2 + margin)
  const filteredTrees = useMemo(() => {
    const raw: [number, number][] = [
      [-82, 35], [-72, 22], [-45, 15], [-55, 75], [-35, 52], [-24, 38],
      [-15, 80], [14, 78], [-28, 62], [-10, 52], [18, 62],
      [-82, -25], [-72, -12], [-58, -18], [-38, -12], [-22, -14],
      [-16, -48], [-28, -68], [-12, -78], [6, -48], [16, -22],
      [36, 12], [58, 14], [78, 20], [22, -58], [38, -72], [64, -28],
      [78, -52], [82, -78], [28, 82], [72, 78], [85, 48]
    ];
    return raw.filter(([x, z]) => getDistanceToRoads(x, z) > 5.6);
  }, []);

  const filteredPalms = useMemo(() => {
    const raw: [number, number][] = [
      [-10, -8], [-16, 2], [-6, 12], [8, -18], [14, 2], [20, -10],
      [36, 42], [52, 34], [30, 54], [64, 50], [-50, -30], [-32, -52],
      [-2, -26], [2, 26], [26, 40], [56, 64]
    ];
    return raw.filter(([x, z]) => getDistanceToRoads(x, z) > 5.0);
  }, []);

  const filteredBamboo = useMemo(() => {
    const raw: [number, number][] = [
      [-14, -6], [-7, 0], [7, 14], [16, -2], [30, 24], [-24, 14], [50, 26]
    ];
    return raw.filter(([x, z]) => getDistanceToRoads(x, z) > 5.2 && Math.hypot(x, z) > 8.0);
  }, []);

  const filteredFerns = useMemo(() => {
    const raw: [number, number][] = [
      [-48, -35], [-36, -24], [-16, -4], [12, -8], [26, 16],
      [42, 36], [54, 46], [-22, 42], [-42, 52], [-62, 32],
      [-6, 20], [16, 34], [32, -42], [52, -62]
    ];
    return raw.filter(([x, z]) => getDistanceToRoads(x, z) > 4.5);
  }, []);

  return (
    <group name="JungleOperationsLivikWorld">
      {/* ================================================================ */}
      {/* 1. ELEVATED TERRAIN SURFACE (220m x 220m with Real 3D Contours) */}
      {/* ================================================================ */}
      <mesh geometry={terrainGeometry} receiveShadow material={materials.ground} />

      {/* Dense 3D Tropical Undergrowth & Ground Cover (Instanced with Full Road Clearance) */}
      <RealisticJungleGrassLayer
        material={materials.tropicalGrass}
        fernMaterial={materials.tropicalFern}
      />

      {/* Surrounding Mountain Horizon Rim */}
      <mesh position={[0, -4, 0]} geometry={horizonMountainGeometry} material={materials.horizonMountain} />

      {/* ================================================================ */}
      {/* 2. MATHEMATICAL SPLINE ROAD NETWORK (Conforms Directly to Terrain) */}
      {/* ================================================================ */}
      {/* Primary Highway: West Logistics -> FOB Sabre -> Valley -> Bridge -> Ban Khao -> NE */}
      <mesh geometry={mainRoadGeom} receiveShadow material={materials.road} />

      {/* Southern Valley Loop: Bridge Approach -> Ban Nam Hamlet -> Farmland -> Ban Khao */}
      <mesh geometry={southLoopGeom} receiveShadow material={materials.road} />

      {/* North Ridge Service Spur: East Bridge Junction -> Valley Floor -> North Watchtower */}
      <mesh geometry={northRidgeGeom} receiveShadow material={materials.road} />

      {/* Seamless Continuous Intersection Junction Aprons (Zero Gaps / Flawless Junctions) */}
      <mesh geometry={westJunctionGeom} receiveShadow material={materials.road} />
      <mesh geometry={eastJunctionGeom} receiveShadow material={materials.road} />
      <mesh geometry={northRidgeJunctionGeom} receiveShadow material={materials.road} />

      {/* Ban Khao Village Footpaths (Chief House, Market, Cistern, Side Cottages) */}
      <mesh geometry={banKhaoPathsGeom} receiveShadow material={materials.path} />

      {/* Ban Nam Hamlet Footpaths (Cottages, Riverside Fishing Dock, Farmland) */}
      <mesh geometry={banNamPathsGeom} receiveShadow material={materials.path} />

      {/* ================================================================ */}
      {/* 3. CENTRAL CREEK RAVINE & SEAMLESS TIMBER TRESTLE BRIDGE */}
      {/* ================================================================ */}
      {/* Sunken River Surface (Follows lower ravine at y = -1.35, aligned along ravine) */}
      <mesh position={[0, -1.35, 0]} rotation={[-Math.PI / 2, -Math.PI / 4, 0]} receiveShadow material={materials.streamWater}>
        <planeGeometry args={[14.0, 180]} />
      </mesh>

      {/* Timber Trestle Bridge (Spans ravine at [0, 0], 45-deg collinear with road) */}
      <TimberTrestleBridge position={[0, 0.25, 0]} length={12.0} width={6.5} rotationY={Math.PI / 4} woodMaterial={materials.weatheredWood} />

      {/* ================================================================ */}
      {/* 4. NORTHEAST MAIN TOWN: "BAN KHAO" (On Elevated +2.8m Plateau) */}
      {/* ================================================================ */}
      {/* Village Chief 2-Story Residence */}
      <VillageChiefHouse
        position={[44, getJungleTerrainHeight(44, 52), 52]}
        rotationY={0.15}
        wallMaterial={materials.villagePlaster}
        woodMaterial={materials.weatheredWood}
        roofMaterial={materials.tinRoof}
      />

      {/* Stilt Cottage 1 */}
      <VillageStiltHouse
        position={[60, getJungleTerrainHeight(60, 38), 38]}
        size={[7.5, 3.2, 6.5]}
        rotationY={-0.25}
        wallMaterial={materials.brickWall}
        roofMaterial={materials.tinRoof}
        woodMaterial={materials.weatheredWood}
      />

      {/* Village Market Shed / Trading Stall (Faces Village Square, Clear of Road) */}
      <VillageMarketShed
        position={[42, getJungleTerrainHeight(42, 22), 22]}
        rotationY={0.35}
        woodMaterial={materials.weatheredWood}
        roofMaterial={materials.tinRoof}
      />

      {/* Stilt Cottage 2 */}
      <VillageStiltHouse
        position={[66, getJungleTerrainHeight(66, 60), 60]}
        size={[7.0, 3.0, 6.8]}
        rotationY={0.08}
        wallMaterial={materials.villagePlaster}
        roofMaterial={materials.tinRoof}
        woodMaterial={materials.weatheredWood}
      />

      {/* Village Workshop / Barn */}
      <VillageStiltHouse
        position={[26, getJungleTerrainHeight(26, 62), 62]}
        size={[8.0, 3.4, 8.5]}
        rotationY={-0.18}
        wallMaterial={materials.weatheredWood}
        roofMaterial={materials.tinRoof}
        woodMaterial={materials.weatheredWood}
      />

      {/* Village Storage Shed */}
      <VillageStiltHouse
        position={[50, getJungleTerrainHeight(50, 74), 74]}
        size={[5.5, 2.6, 4.5]}
        rotationY={0.32}
        wallMaterial={materials.villagePlaster}
        roofMaterial={materials.tinRoof}
        woodMaterial={materials.weatheredWood}
      />

      {/* Water Cistern on Timber Trestle */}
      <group position={[30, getJungleTerrainHeight(30, 42), 42]}>
        <mesh position={[0, 1.8, 0]} castShadow material={materials.weatheredWood}>
          <boxGeometry args={[2.4, 3.6, 2.4]} />
        </mesh>
        <mesh position={[0, 4.2, 0]} castShadow material={materials.tinRoof}>
          <cylinderGeometry args={[1.35, 1.35, 2.2, 14]} />
        </mesh>
      </group>

      {/* Village Utility Poles along Road Shoulder (Clear of Corridors with Realistic Setback) */}
      {[
        [15, 23], [25, 43], [35, 53], [54, 66], [-24, -14], [-38, -30]
      ].map(([ux, uz], i) => (
        <group key={i} position={[ux, getJungleTerrainHeight(ux, uz), uz]}>
          <mesh position={[0, 3.8, 0]} castShadow material={materials.weatheredWood}>
            <cylinderGeometry args={[0.13, 0.17, 7.6, 8]} />
          </mesh>
          <mesh position={[0, 7.2, 0]} castShadow material={materials.weatheredWood}>
            <boxGeometry args={[1.5, 0.12, 0.12]} />
          </mesh>
        </group>
      ))}

      {/* Courtyard Low Walls & Fences (Behind Roads) */}
      <mesh position={[38, getJungleTerrainHeight(38, 44) + 0.6, 44]} rotation={[0, 0.1, 0]} castShadow receiveShadow material={materials.villagePlaster}>
        <boxGeometry args={[8.0, 1.2, 0.4]} />
      </mesh>
      <mesh position={[54, getJungleTerrainHeight(54, 46) + 0.6, 46]} rotation={[0, -0.1, 0]} castShadow receiveShadow material={materials.villagePlaster}>
        <boxGeometry args={[0.4, 1.2, 10.0]} />
      </mesh>
      <mesh position={[52, getJungleTerrainHeight(52, 68) + 0.5, 68]} rotation={[0, 0.2, 0]} castShadow receiveShadow material={materials.weatheredWood}>
        <boxGeometry args={[9.0, 1.0, 0.3]} />
      </mesh>

      {/* ================================================================ */}
      {/* 5. SOUTHEAST RIVERSIDE HAMLET: "BAN NAM" & FARMLAND TERRACES */}
      {/* ================================================================ */}
      {/* Riverside Stilt Cottage 1 */}
      <VillageStiltHouse
        position={[36, getJungleTerrainHeight(36, -32), -32]}
        size={[7.0, 3.0, 6.0]}
        rotationY={0.2}
        wallMaterial={materials.weatheredWood}
        roofMaterial={materials.tinRoof}
        woodMaterial={materials.weatheredWood}
      />
      {/* Riverside Stilt Cottage 2 */}
      <VillageStiltHouse
        position={[54, getJungleTerrainHeight(54, -36), -36]}
        size={[6.5, 2.8, 6.0]}
        rotationY={-0.15}
        wallMaterial={materials.villagePlaster}
        roofMaterial={materials.tinRoof}
        woodMaterial={materials.weatheredWood}
      />
      {/* Agricultural Barn & Tool Shed */}
      <VillageStiltHouse
        position={[58, getJungleTerrainHeight(58, -58), -58]}
        size={[8.0, 3.5, 7.0]}
        rotationY={-0.3}
        wallMaterial={materials.weatheredWood}
        roofMaterial={materials.tinRoof}
        woodMaterial={materials.weatheredWood}
      />
      {/* Farmland Terrace Fencing */}
      <mesh position={[42, getJungleTerrainHeight(42, -42) + 0.5, -42]} rotation={[0, 0.1, 0]} castShadow receiveShadow material={materials.weatheredWood}>
        <boxGeometry args={[14.0, 1.0, 0.3]} />
      </mesh>
      {/* Hay / Feed Pallet */}
      <mesh position={[50, getJungleTerrainHeight(50, -64) + 0.9, -64]} rotation={[0, 0.4, 0]} castShadow receiveShadow material={materials.sandbag}>
        <boxGeometry args={[3.2, 1.8, 2.8]} />
      </mesh>

      {/* Ban Nam Riverside Wooden Fishing Dock (Extends into creek ravine) */}
      <group position={[30, -0.65, -30]} rotation={[0, -Math.PI / 4, 0]}>
        {/* Dock Deck Planks */}
        <mesh position={[0, 0, 3.5]} receiveShadow material={materials.weatheredWood}>
          <boxGeometry args={[2.4, 0.18, 7.5]} />
        </mesh>
        {/* Dock Support Pilings into Creek Bed */}
        {[-0.9, 0.9].flatMap((px) =>
          [1.0, 3.5, 6.0].map((pz, idx) => (
            <mesh key={`${px}-${idx}`} position={[px, -0.65, pz]} castShadow receiveShadow material={materials.weatheredWood}>
              <cylinderGeometry args={[0.1, 0.12, 1.4, 8]} />
            </mesh>
          ))
        )}
        {/* Mooring Bollards / Cleats */}
        <mesh position={[-1.0, 0.3, 6.8]} castShadow material={materials.weatheredWood}>
          <cylinderGeometry args={[0.08, 0.08, 0.45, 8]} />
        </mesh>
        <mesh position={[1.0, 0.3, 6.8]} castShadow material={materials.weatheredWood}>
          <cylinderGeometry args={[0.08, 0.08, 0.45, 8]} />
        </mesh>
        {/* Wooden Fish Supply Crates on Dock */}
        <mesh position={[-0.5, 0.3, 2.0]} castShadow receiveShadow material={materials.weatheredWood}>
          <boxGeometry args={[0.7, 0.45, 0.8]} />
        </mesh>
      </group>

      {/* ================================================================ */}
      {/* 6. SOUTHWEST MILITARY COMPOUND: "FOB SABRE" */}
      {/* ================================================================ */}
      {/* Command HQ Shipping Container */}
      <mesh position={[-52, getJungleTerrainHeight(-52, -56) + 1.3, -56]} rotation={[0, 0.15, 0]} castShadow receiveShadow material={materials.camoContainer}>
        <boxGeometry args={[12.0, 2.6, 2.5]} />
      </mesh>
      {/* Armory Shipping Container */}
      <mesh position={[-38, getJungleTerrainHeight(-38, -62) + 1.3, -62]} rotation={[0, -0.2, 0]} castShadow receiveShadow material={materials.camoContainer}>
        <boxGeometry args={[6.5, 2.6, 2.5]} />
      </mesh>

      {/* Camouflage Tactical Command Shelter (Offset Clear of Road) */}
      <group position={[-68, getJungleTerrainHeight(-68, -40), -40]} rotation={[0, 0.4, 0]}>
        <mesh position={[0, 1.8, 0]} castShadow receiveShadow material={materials.camoContainer}>
          <boxGeometry args={[8.0, 3.6, 6.0]} />
        </mesh>
        <mesh position={[0, 3.9, 0]} castShadow material={materials.camoContainer}>
          <coneGeometry args={[5.5, 1.8, 4]} />
        </mesh>
      </group>

      {/* Fortified Sandbag Revetments (Surrounding compound, clear of road) */}
      {[
        { pos: [-46, -50], len: 8.0, rot: 0.1 },
        { pos: [-26, -48], len: 8.0, rot: -0.2 },
        { pos: [-68, -58], len: 12.0, rot: 0 },
      ].map((sb, idx) => (
        <group key={idx} position={[sb.pos[0], getJungleTerrainHeight(sb.pos[0], sb.pos[1]), sb.pos[1]]} rotation={[0, sb.rot, 0]}>
          <mesh position={[0, 0.4, 0]} castShadow receiveShadow material={materials.sandbag}>
            <boxGeometry args={[sb.len, 0.8, 0.9]} />
          </mesh>
          <mesh position={[0, 0.9, 0]} castShadow receiveShadow material={materials.sandbag}>
            <boxGeometry args={[sb.len - 0.3, 0.5, 0.75]} />
          </mesh>
        </group>
      ))}

      {/* Military Ammo Pallet 1 (Wooden Cargo Pallet + Munitions Cases with Metal Straps) */}
      <group position={[-54, getJungleTerrainHeight(-54, -52), -52]} rotation={[0, 0.15, 0]}>
        <mesh position={[0, 0.08, 0]} receiveShadow material={materials.weatheredWood}>
          <boxGeometry args={[2.4, 0.16, 2.0]} />
        </mesh>
        <mesh position={[-0.45, 0.45, 0]} castShadow receiveShadow material={materials.camoContainer}>
          <boxGeometry args={[1.1, 0.6, 1.6]} />
        </mesh>
        <mesh position={[0.45, 0.45, 0]} castShadow receiveShadow material={materials.camoContainer}>
          <boxGeometry args={[1.1, 0.6, 1.6]} />
        </mesh>
        <mesh position={[0, 0.46, 0]} material={materials.tinRoof}>
          <boxGeometry args={[2.25, 0.05, 0.08]} />
        </mesh>
      </group>

      {/* Military Ammo Pallet 2 */}
      <group position={[-38, getJungleTerrainHeight(-38, -56), -56]} rotation={[0, -0.25, 0]}>
        <mesh position={[0, 0.08, 0]} receiveShadow material={materials.weatheredWood}>
          <boxGeometry args={[2.0, 0.16, 1.8]} />
        </mesh>
        <mesh position={[0, 0.45, 0]} castShadow receiveShadow material={materials.camoContainer}>
          <boxGeometry args={[1.6, 0.6, 1.4]} />
        </mesh>
      </group>
      {/* Fuel Drums */}
      {[-1.0, 0, 1.0].map((dx, i) => (
        <mesh key={i} position={[-60 + dx * 0.9, getJungleTerrainHeight(-60, -64) + 0.6, -64]} castShadow material={materials.tinRoof}>
          <cylinderGeometry args={[0.38, 0.38, 1.1, 10]} />
        </mesh>
      ))}

      {/* Communications Mast Tower with Red Beacon */}
      <group position={[-68, getJungleTerrainHeight(-68, -48), -48]}>
        <mesh position={[0, 6.0, 0]} castShadow material={materials.weatheredWood}>
          <cylinderGeometry args={[0.1, 0.42, 12.0, 6]} />
        </mesh>
        <mesh position={[0, 12.2, 0]}>
          <sphereGeometry args={[0.25, 8, 8]} />
          <meshBasicMaterial color="#ef4444" />
        </mesh>
        <pointLight position={[0, 12.2, 0]} intensity={2.0} distance={24} color="#ef4444" />
      </group>

      {/* FOB Sentry Watchtower (Positioned commanding the perimeter, clear of road) */}
      <TacticalWatchtower
        position={[-22, getJungleTerrainHeight(-22, -42), -42]}
        height={6.2}
        rotationY={0.3}
        woodMaterial={materials.weatheredWood}
        roofMaterial={materials.tinRoof}
      />

      {/* ================================================================ */}
      {/* 7. NORTHWEST HIGHLAND RIDGE & MONASTERY RUINS */}
      {/* ================================================================ */}
      {/* North Observation Watchtower (Perched high on +7.2m Ridge) */}
      <TacticalWatchtower
        position={[0, getJungleTerrainHeight(0, 68), 68]}
        height={7.5}
        rotationY={0.1}
        woodMaterial={materials.weatheredWood}
        roofMaterial={materials.tinRoof}
      />

      {/* Ancient Monastery Stone Ruins */}
      <group position={[-50, getJungleTerrainHeight(-50, 48), 48]} rotation={[0, 0.2, 0]}>
        <mesh position={[0, 0.6, 0]} castShadow receiveShadow material={materials.mossyStone}>
          <boxGeometry args={[6.5, 1.2, 6.5]} />
        </mesh>
        <mesh position={[-2.8, 2.5, -2.8]} castShadow receiveShadow material={materials.mossyStone}>
          <boxGeometry args={[1.1, 5.0, 1.1]} />
        </mesh>
        <mesh position={[2.8, 2.5, 2.8]} castShadow receiveShadow material={materials.mossyStone}>
          <boxGeometry args={[1.1, 5.0, 1.1]} />
        </mesh>
        <mesh position={[0, 4.8, 0]} rotation={[0, 0.78, 0]} castShadow material={materials.mossyStone}>
          <boxGeometry args={[6.8, 0.8, 1.4]} />
        </mesh>
      </group>

      {/* Weathered Tactical Boulders (Filtered outside road clearance) */}
      {[
        [-70, 32], [-38, 65], [-20, -8], [72, -42]
      ].map(([bx, bz], i) => (
        <group key={i} position={[bx, getJungleTerrainHeight(bx, bz) + 1.2, bz]}>
          <mesh castShadow receiveShadow material={materials.mossyStone}>
            <dodecahedronGeometry args={[2.2 + (i % 3) * 0.4, 1]} />
          </mesh>
        </group>
      ))}

      {/* Fallen Giant Hardwood Logs (Natural Cover beside Trails) */}
      {[
        { pos: [-44, 22], rot: 0.6, len: 7.5 },
        { pos: [-62, 60], rot: -0.4, len: 8.0 },
      ].map((log, i) => (
        <mesh
          key={i}
          position={[log.pos[0], getJungleTerrainHeight(log.pos[0], log.pos[1]) + 0.5, log.pos[1]]}
          rotation={[0, log.rot, Math.PI / 2]}
          castShadow
          receiveShadow
          material={materials.bark}
        >
          <cylinderGeometry args={[0.55, 0.65, log.len, 10]} />
        </mesh>
      ))}

      {/* ================================================================ */}
      {/* 8. DIVERSE TROPICAL VEGETATION (CLEAR OF ALL ROADS) */}
      {/* ================================================================ */}
      {/* Emergent Hardwood Trees */}
      {filteredTrees.map(([tx, tz], i) => (
        <RainforestEmergentTree
          key={`emergent-${i}`}
          position={[tx, getJungleTerrainHeight(tx, tz), tz]}
          height={11.0 + (i % 4) * 2.0}
          scale={0.9 + (i % 3) * 0.2}
          rotationY={i * 0.8}
          barkMaterial={materials.bark}
          leafMaterial={materials.leaves}
          leafHighlightMaterial={materials.leafHighlight}
        />
      ))}

      {/* Banyan Spreading Trees (Deep Forest Anchors) */}
      {[
        [-65, 5], [-32, 16], [42, -12], [20, 44]
      ].map(([bx, bz], i) => (
        <BanyanTree
          key={`banyan-${i}`}
          position={[bx, getJungleTerrainHeight(bx, bz), bz]}
          scale={0.95 + (i % 2) * 0.2}
          rotationY={i * 1.3}
          barkMaterial={materials.bark}
          leafMaterial={materials.leaves}
        />
      ))}

      {/* Curved Palms */}
      {filteredPalms.map(([px, pz], i) => (
        <TropicalPalmTree
          key={`palm-${i}`}
          position={[px, getJungleTerrainHeight(px, pz), pz]}
          height={7.5 + (i % 3) * 1.5}
          rotationY={i * 1.2}
          leanAngle={0.08 + (i % 4) * 0.04}
          barkMaterial={materials.bark}
          frondMaterial={materials.palmFronds}
          woodMaterial={materials.weatheredWood}
        />
      ))}

      {/* Bamboo Thickets along River & Forest Edges (Clear of bridge and road) */}
      {filteredBamboo.map(([bx, bz], i) => (
        <BambooThicket
          key={`bamboo-${i}`}
          position={[bx, getJungleTerrainHeight(bx, bz), bz]}
          height={6.0 + (i % 3) * 1.2}
          woodMaterial={materials.bambooStalks}
          leafMaterial={materials.leaves}
        />
      ))}

      {/* Forest Floor Fern Clusters */}
      {filteredFerns.map(([fx, fz], i) => (
        <JungleFernCluster
          key={`fern-${i}`}
          position={[fx, getJungleTerrainHeight(fx, fz), fz]}
          scale={1.0 + (i % 3) * 0.3}
          leafMaterial={materials.leafHighlight}
        />
      ))}

      {/* Dense Outer Perimeter Jungle Wall (Encircling 200m Map) */}
      {[-95, -75, -55, -35, -15, 0, 15, 35, 55, 75, 95].map((coord, i) => (
        <React.Fragment key={`perim-wall-${i}`}>
          <RainforestEmergentTree
            position={[coord, getJungleTerrainHeight(coord, -98), -98]}
            height={14.0}
            scale={1.35}
            barkMaterial={materials.bark}
            leafMaterial={materials.leaves}
            leafHighlightMaterial={materials.leafHighlight}
          />
          <RainforestEmergentTree
            position={[coord, getJungleTerrainHeight(coord, 98), 98]}
            height={14.0}
            scale={1.35}
            barkMaterial={materials.bark}
            leafMaterial={materials.leaves}
            leafHighlightMaterial={materials.leafHighlight}
          />
          <RainforestEmergentTree
            position={[-98, getJungleTerrainHeight(-98, coord), coord]}
            height={14.0}
            scale={1.35}
            barkMaterial={materials.bark}
            leafMaterial={materials.leaves}
            leafHighlightMaterial={materials.leafHighlight}
          />
          <RainforestEmergentTree
            position={[98, getJungleTerrainHeight(98, coord), coord]}
            height={14.0}
            scale={1.35}
            barkMaterial={materials.bark}
            leafMaterial={materials.leaves}
            leafHighlightMaterial={materials.leafHighlight}
          />
        </React.Fragment>
      ))}
    </group>
  );
};
