import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import {
  RIVER_SPINE,
  RIVER_WATER_Y,
  RIVER_HALF_WIDTH,
  RIVER_MAX_DEPTH,
} from '../../config/maps';

function catmullRomPt(
  p0: [number, number], p1: [number, number],
  p2: [number, number], p3: [number, number], t: number
): [number, number] {
  const t2 = t * t, t3 = t2 * t;
  return [
    0.5 * (2 * p1[0] + (-p0[0] + p2[0]) * t + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3),
    0.5 * (2 * p1[1] + (-p0[1] + p2[1]) * t + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3),
  ];
}

function sampleRiverSpline(samplesPerSeg = 18): [number, number][] {
  const pts = RIVER_SPINE;
  const n = pts.length;
  const result: [number, number][] = [];
  for (let i = 0; i < n - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(n - 1, i + 2)];
    for (let s = 0; s < samplesPerSeg; s++) {
      result.push(catmullRomPt(p0, p1, p2, p3, s / samplesPerSeg));
    }
  }
  result.push(pts[n - 1]);
  return result;
}

function buildRiverWaterGeometry(): THREE.BufferGeometry {
  const centerline = sampleRiverSpline(20);
  const n = centerline.length;
  const RINGS = 9;
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  for (let i = 0; i < n; i++) {
    const [cx, cz] = centerline[i];
    const ahead = centerline[Math.min(i + 1, n - 1)];
    const behind = centerline[Math.max(i - 1, 0)];
    const dx = ahead[0] - behind[0], dz = ahead[1] - behind[1];
    const len = Math.sqrt(dx * dx + dz * dz) || 1;
    const px = -dz / len, pz = dx / len;

    // Width variation: wider at bends
    const curveFactor = (() => {
      if (i <= 0 || i >= n - 1) return 1;
      const [x0, z0] = centerline[i - 1];
      const [x1, z1] = centerline[i];
      const [x2, z2] = centerline[i + 1];
      const d1x = x1 - x0, d1z = z1 - z0, d2x = x2 - x1, d2z = z2 - z1;
      const cross = Math.abs(d1x * d2z - d1z * d2x);
      const l1 = Math.sqrt(d1x * d1x + d1z * d1z);
      const l2 = Math.sqrt(d2x * d2x + d2z * d2z);
      const k = cross / (Math.max(0.001, l1 * l2));
      return 1 + Math.min(k * 30, 0.55);
    })();

    const halfW = RIVER_HALF_WIDTH * curveFactor * (1 + Math.sin(i * 0.31) * 0.07);

    for (let j = 0; j < RINGS; j++) {
      const t = j / (RINGS - 1);
      const offset = (t - 0.5) * 2 * halfW;
      const wx = cx + px * offset;
      const wz = cz + pz * offset;
      const edgeFactor = Math.abs(t - 0.5) * 2;
      const crossDip = (1 - edgeFactor * edgeFactor) * 0.12;
      positions.push(wx, RIVER_WATER_Y - crossDip, wz);
      uvs.push(t, i / (n - 1));
    }

    if (i < n - 1) {
      const base = i * RINGS;
      for (let j = 0; j < RINGS - 1; j++) {
        const a = base + j, b = base + j + 1, c = base + RINGS + j, d = base + RINGS + j + 1;
        indices.push(a, c, b, b, c, d);
      }
    }
  }

  const geom = new THREE.BufferGeometry();
  geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geom.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geom.setIndex(indices);
  geom.computeVertexNormals();
  return geom;
}

function buildRiverbedGeometry(): THREE.BufferGeometry {
  const centerline = sampleRiverSpline(14);
  const n = centerline.length;
  const RINGS = 11;
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  for (let i = 0; i < n; i++) {
    const [cx, cz] = centerline[i];
    const ahead = centerline[Math.min(i + 1, n - 1)];
    const behind = centerline[Math.max(i - 1, 0)];
    const dx = ahead[0] - behind[0], dz = ahead[1] - behind[1];
    const len = Math.sqrt(dx * dx + dz * dz) || 1;
    const px = -dz / len, pz = dx / len;
    const bedW = RIVER_HALF_WIDTH * 1.4;

    for (let j = 0; j < RINGS; j++) {
      const t = j / (RINGS - 1);
      const offset = (t - 0.5) * 2 * bedW;
      const wx = cx + px * offset;
      const wz = cz + pz * offset;
      const edgeFactor = Math.abs(t - 0.5) * 2;
      const depth = (1 - edgeFactor * edgeFactor) * RIVER_MAX_DEPTH;
      const noise = Math.sin(wx * 0.15 + wz * 0.12) * 0.22;
      positions.push(wx, RIVER_WATER_Y - depth + noise, wz);
      uvs.push(t, i / (n - 1));
    }

    if (i < n - 1) {
      const base = i * RINGS;
      for (let j = 0; j < RINGS - 1; j++) {
        const a = base + j, b = base + j + 1, c = base + RINGS + j, d = base + RINGS + j + 1;
        indices.push(a, c, b, b, c, d);
      }
    }
  }

  const geom = new THREE.BufferGeometry();
  geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geom.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geom.setIndex(indices);
  geom.computeVertexNormals();
  return geom;
}

type WaterShader = {
  uniforms: Record<string, { value: unknown }>;
  vertexShader: string;
  fragmentShader: string;
};

function createWaterMaterial(): THREE.MeshStandardMaterial & { _shader?: WaterShader } {
  const mat: THREE.MeshStandardMaterial & { _shader?: WaterShader } = new THREE.MeshStandardMaterial({
    color: new THREE.Color(0x2d6a8a),
    roughness: 0.05,
    metalness: 0.15,
    transparent: true,
    opacity: 0.86,
    side: THREE.FrontSide,
    depthWrite: false,
  });

  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = { value: 0 };
    mat._shader = shader as WaterShader;

    shader.vertexShader = shader.vertexShader
      .replace('void main() {', 'varying vec2 vWaterUV;\nvarying vec3 vWPos;\nvoid main() {')
      .replace('#include <uv_vertex>', '#include <uv_vertex>\nvWaterUV = uv;\nvWPos = (modelMatrix * vec4(position,1.0)).xyz;');

    shader.fragmentShader = shader.fragmentShader
      .replace('void main() {', 'uniform float uTime;\nvarying vec2 vWaterUV;\nvarying vec3 vWPos;\nvoid main() {')
      .replace('#include <map_fragment>', `
        float spd = 0.20;
        vec2 fd = normalize(vec2(0.65, 0.25));
        vec2 uv1 = vWaterUV * vec2(2.5, 9.0) + fd * uTime * spd;
        vec2 uv2 = vWaterUV * vec2(4.0, 6.0) + vec2(-fd.y, fd.x) * uTime * spd * 1.3;
        float r1 = sin(uv1.x*6.28 + uv1.y*3.14)*0.5+0.5;
        float r2 = sin(uv2.x*5.0  - uv2.y*4.5 + 1.3)*0.5+0.5;
        float r3 = sin((uv1.x+uv2.y)*9.0 + uTime*0.5)*0.5+0.5;
        float ripple = r1*0.5 + r2*0.35 + r3*0.15;
        float crossT = abs(vWaterUV.x - 0.5)*2.0;
        float deep = 1.0 - crossT*crossT;
        vec3 c0 = vec3(0.03,0.20,0.34);
        vec3 c1 = vec3(0.10,0.38,0.54);
        vec3 c2 = vec3(0.26,0.60,0.70);
        vec3 col = mix(c2, mix(c1, c0, deep), deep);
        float glint = pow(r3, 6.0)*0.3*deep;
        col += vec3(glint*0.4, glint*0.65, glint);
        float foamM = smoothstep(0.78, 0.97, crossT);
        float foam  = foamM*(r1*0.5+0.5)*0.5;
        col = mix(col, vec3(0.78,0.90,0.94), foam);
        float caps = smoothstep(0.84, 0.97, ripple)*deep*0.12;
        col += vec3(caps);
        diffuseColor.rgb = col;
      `);
  };

  return mat;
}

export const RiverSystem: React.FC = () => {
  const matRef = useRef<(THREE.MeshStandardMaterial & { _shader?: WaterShader }) | null>(null);
  const waterGeom = useMemo(() => buildRiverWaterGeometry(), []);
  const bedGeom = useMemo(() => buildRiverbedGeometry(), []);
  const waterMat = useMemo(() => createWaterMaterial(), []);
  const bedMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: new THREE.Color(0x4a3c28),
    roughness: 0.97,
    metalness: 0.0,
  }), []);

  React.useEffect(() => {
    matRef.current = waterMat;
  }, [waterMat]);

  useFrame((_, delta) => {
    const s = matRef.current?._shader;
    if (s?.uniforms?.uTime) {
      (s.uniforms.uTime as { value: number }).value += delta;
    }
  });

  return (
    <group name="RiverSystem">
      <mesh geometry={bedGeom} material={bedMat} receiveShadow />
      <mesh geometry={waterGeom} material={waterMat} receiveShadow />
    </group>
  );
};
