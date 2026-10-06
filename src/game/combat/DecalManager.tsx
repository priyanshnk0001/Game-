import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { BulletImpactDecal } from '../../types/game';
import { gameState } from '../../systems/gameState';

interface DecalManagerProps {
  decals: BulletImpactDecal[];
}

/**
 * Draws an irregular, jagged polygon representing broken/chipped stone or concrete.
 */
function drawJaggedPolygon(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  baseR: number,
  points: number,
  roughness: number,
  seed: number
) {
  ctx.beginPath();
  for (let i = 0; i <= points; i++) {
    const angle = (i / points) * Math.PI * 2;
    const h1 = Math.sin(angle * 3 + seed * 1.7) * 0.32;
    const h2 = Math.cos(angle * 5 + seed * 2.5) * 0.20;
    const h3 = Math.sin(angle * 7 + seed * 3.1) * 0.12;
    const r = baseR * Math.max(0.4, 1 + (h1 + h2 + h3) * roughness);
    const x = cx + Math.cos(angle) * r;
    const y = cy + Math.sin(angle) * r;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
}

/**
 * Generates an authentic, high-resolution 256x256 procedural texture
 * matching real-world bullet impacts into concrete, metal, wood, and ground.
 */
function createDecalTexture(
  type: 'concrete' | 'metal' | 'wood' | 'stone' | 'ground',
  variant: number
): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  if (ctx) {
    ctx.clearRect(0, 0, size, size);
    const cx = size / 2;
    const cy = size / 2;
    const seed = (variant + 1) * 13.37;

    if (type === 'metal') {
      // -------------------------------------------------------------
      // METAL: Bullet puncture hole with curled lips, heat scorch & dent
      // -------------------------------------------------------------
      // 1. Outer metallic indentation / depression halo
      const gradHalo = ctx.createRadialGradient(cx, cy, 18, cx, cy, 80);
      gradHalo.addColorStop(0, 'rgba(175, 190, 210, 0.45)');
      gradHalo.addColorStop(0.55, 'rgba(60, 65, 75, 0.25)');
      gradHalo.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = gradHalo;
      ctx.beginPath();
      ctx.arc(cx, cy, 80, 0, Math.PI * 2);
      ctx.fill();

      // 2. Dark burnt scorch ring around impact
      ctx.strokeStyle = 'rgba(20, 20, 24, 0.85)';
      ctx.lineWidth = 9;
      drawJaggedPolygon(ctx, cx, cy, 32, 16, 0.35, seed);
      ctx.stroke();

      // 3. Highlight on top-left edge (metallic specular reflection on curled lip)
      ctx.strokeStyle = 'rgba(240, 245, 255, 0.65)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(cx - 3, cy - 3, 26, Math.PI * 0.75, Math.PI * 1.75);
      ctx.stroke();

      // 4. Irregular dark metal puncture core
      const gradCore = ctx.createRadialGradient(cx, cy, 0, cx, cy, 24);
      gradCore.addColorStop(0, 'rgba(6, 6, 8, 1.0)');
      gradCore.addColorStop(0.85, 'rgba(15, 15, 18, 0.98)');
      gradCore.addColorStop(1, 'rgba(35, 38, 45, 0.7)');
      ctx.fillStyle = gradCore;
      drawJaggedPolygon(ctx, cx, cy, 24, 14, 0.4, seed + 1);
      ctx.fill();
    } else if (type === 'wood') {
      // -------------------------------------------------------------
      // WOOD: Splintered puncture with raw fiber distress
      // -------------------------------------------------------------
      // 1. Wood fiber splinter rays radiating along grain
      ctx.strokeStyle = 'rgba(30, 18, 10, 0.75)';
      ctx.lineWidth = 2.5;
      for (let i = 0; i < 18; i++) {
        const angle = (i / 18) * Math.PI * 2 + (Math.sin(i + seed) * 0.2);
        const len = 35 + ((i % 4) * 22);
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + Math.cos(angle) * len * 1.3, cy + Math.sin(angle) * len * 0.7); // anisotropic grain
        ctx.stroke();
      }

      // 2. Outer cratered splinter halo
      const gradWood = ctx.createRadialGradient(cx, cy, 14, cx, cy, 75);
      gradWood.addColorStop(0, 'rgba(50, 30, 18, 0.85)');
      gradWood.addColorStop(0.6, 'rgba(85, 52, 30, 0.4)');
      gradWood.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = gradWood;
      drawJaggedPolygon(ctx, cx, cy, 70, 16, 0.45, seed);
      ctx.fill();

      // 3. Deep punctured dark void
      ctx.fillStyle = 'rgba(10, 6, 4, 1.0)';
      drawJaggedPolygon(ctx, cx, cy, 24, 14, 0.5, seed + 2);
      ctx.fill();
    } else {
      // -------------------------------------------------------------
      // CONCRETE / STONE / MASONRY / WALL / GROUND:
      // Faithful recreation of real-world high-velocity bullet spall:
      // - Jagged multi-lobed spalled plaster/concrete outer crater
      // - Directional bevel shading (top-left highlight, bottom-right shadow)
      // - Mottled rough aggregate / exposed brick terracotta core
      // - Deep irregular entry cavity
      // - Satellite micro-spall flecks & hairline fissures
      // -------------------------------------------------------------
      const isRedCore = variant === 1 || variant === 3; // Prominent exposed brick/terracotta aggregate

      // 1. Subtle dust / pulverized powder outer halo
      const gradDust = ctx.createRadialGradient(cx, cy, 25, cx, cy, 115);
      gradDust.addColorStop(0, 'rgba(40, 42, 46, 0.55)');
      gradDust.addColorStop(0.5, 'rgba(70, 72, 78, 0.25)');
      gradDust.addColorStop(0.85, 'rgba(110, 112, 118, 0.08)');
      gradDust.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = gradDust;
      ctx.beginPath();
      ctx.arc(cx, cy, 115, 0, Math.PI * 2);
      ctx.fill();

      // 2. Broken Concrete / Plaster Spall Rim (Light highlights on top-left edge)
      ctx.fillStyle = 'rgba(230, 235, 242, 0.65)'; // Bright chipped plaster edge
      drawJaggedPolygon(ctx, cx - 2, cy - 2, 78, 22, 0.52, seed);
      ctx.fill();

      // 3. Cast Shadow on bottom-right inside the crater (Creates unmistakable 3D depth)
      ctx.fillStyle = 'rgba(12, 14, 16, 0.72)';
      drawJaggedPolygon(ctx, cx + 3, cy + 3, 76, 22, 0.52, seed);
      ctx.fill();

      // 4. Exposed Crater Bed (Mottled concrete aggregate & dark stone)
      const gradCrater = ctx.createRadialGradient(cx - 6, cy - 6, 10, cx, cy, 72);
      gradCrater.addColorStop(0, isRedCore ? 'rgba(115, 52, 38, 0.95)' : 'rgba(72, 76, 84, 0.95)');
      gradCrater.addColorStop(0.45, isRedCore ? 'rgba(92, 42, 32, 0.92)' : 'rgba(54, 58, 65, 0.92)');
      gradCrater.addColorStop(0.85, 'rgba(32, 35, 40, 0.90)');
      gradCrater.addColorStop(1, 'rgba(20, 22, 26, 0.85)');
      ctx.fillStyle = gradCrater;
      drawJaggedPolygon(ctx, cx, cy, 72, 20, 0.48, seed + 1);
      ctx.fill();

      // 5. Aggregate texture flecks (terracotta brick & gray quartz chips inside crater)
      ctx.fillStyle = isRedCore ? 'rgba(165, 82, 60, 0.8)' : 'rgba(130, 136, 145, 0.6)';
      for (let i = 0; i < 14; i++) {
        const fAngle = (i / 14) * Math.PI * 2 + Math.sin(i * 2.1);
        const fDist = 18 + ((i * 17) % 36);
        const fx = cx + Math.cos(fAngle) * fDist;
        const fy = cy + Math.sin(fAngle) * fDist;
        ctx.beginPath();
        ctx.arc(fx, fy, 2.5 + (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }

      // 6. Deep Dark Entry Hole Cavity (The deep hole where the bullet penetrated)
      const holeR = variant === 4 ? 20 : 25;
      const gradHole = ctx.createRadialGradient(cx - 3, cy - 3, 0, cx, cy, holeR);
      gradHole.addColorStop(0, 'rgba(4, 4, 6, 1.0)');
      gradHole.addColorStop(0.75, 'rgba(10, 10, 14, 0.98)');
      gradHole.addColorStop(1, 'rgba(22, 24, 28, 0.85)');
      ctx.fillStyle = gradHole;
      drawJaggedPolygon(ctx, cx, cy, holeR, 16, 0.42, seed + 3);
      ctx.fill();

      // 7. Satellite micro-spall flecks & hairline fissures (chips blown outward onto wall)
      ctx.fillStyle = 'rgba(35, 38, 44, 0.88)';
      for (let i = 0; i < 8; i++) {
        const satAngle = (i / 8) * Math.PI * 2 + (seed * 0.5);
        const satDist = 82 + ((i * 29) % 35);
        const sx = cx + Math.cos(satAngle) * satDist;
        const sy = cy + Math.sin(satAngle) * satDist;
        drawJaggedPolygon(ctx, sx, sy, 3 + (i % 3), 6, 0.4, seed + i);
        ctx.fill();
      }

      // Hairline crack lines shooting out from crater vertices
      ctx.strokeStyle = 'rgba(18, 20, 24, 0.75)';
      ctx.lineWidth = 1.8;
      for (let i = 0; i < 4; i++) {
        const crackAngle = (i / 4) * Math.PI * 2 + (seed * 0.7);
        const crackLen = 85 + (i * 12);
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(crackAngle) * 55, cy + Math.sin(crackAngle) * 55);
        const midX = cx + Math.cos(crackAngle + 0.1) * (crackLen * 0.6);
        const midY = cy + Math.sin(crackAngle + 0.1) * (crackLen * 0.6);
        ctx.lineTo(midX, midY);
        ctx.lineTo(cx + Math.cos(crackAngle - 0.05) * crackLen, cy + Math.sin(crackAngle - 0.05) * crackLen);
        ctx.stroke();
      }
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = false;
  return texture;
}

// Single Bullet Decal Component with animated fade and micro impact puff/spark
const SingleImpactDecal: React.FC<{
  decal: BulletImpactDecal;
  textures: Record<string, THREE.CanvasTexture[]>;
}> = ({ decal, textures }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const flashRef = useRef<THREE.Mesh>(null);
  const debrisRef = useRef<THREE.Group>(null);

  // Compute exact surface-normal oriented transform with micro offset
  const { position, quaternion, isMetal, size, texture } = useMemo(() => {
    const norm = new THREE.Vector3(...decal.normal).normalize();

    // 0.005m (5mm) surface offset strictly prevents z-fighting
    const pos = new THREE.Vector3(...decal.position).addScaledVector(norm, 0.005);

    // Plane geometry natural face is +Z (0, 0, 1). Rotate +Z to match surface normal:
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), norm);
    // Apply unique rotation around surface normal
    q.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), decal.rotationZ));

    // Material variant selection
    const variantList = textures[decal.surfaceType] || textures.concrete;
    const vIdx = Math.abs(decal.variant ?? 0) % variantList.length;
    const chosenTexture = variantList[vIdx];

    // Realistic scale: ~18cm to 26cm diameter (matches real-world concrete spall damage)
    const baseSize = decal.surfaceType === 'metal' ? 0.16 : decal.surfaceType === 'wood' ? 0.18 : 0.22;
    const finalSize = baseSize * (decal.scale || 1.0);

    return {
      position: pos,
      quaternion: q,
      isMetal: decal.surfaceType === 'metal',
      size: finalSize,
      texture: chosenTexture,
    };
  }, [decal, textures]);

  useFrame(() => {
    const age = Date.now() - decal.timestamp;

    // Decal fading: 0-4s 100% visible, 4-8s smooth fade out
    if (meshRef.current) {
      const mat = meshRef.current.material as THREE.MeshBasicMaterial;
      if (age < 4000) {
        mat.opacity = 0.96;
      } else {
        const fadeProgress = Math.min(1, (age - 4000) / 4000);
        mat.opacity = (1 - fadeProgress) * 0.96;
      }
    }

    // Micro impact spark/flash: active for the first 160ms
    if (flashRef.current) {
      if (age < 160) {
        const p = age / 160;
        const scale = (1 - p) * (isMetal ? 1.3 : 0.85);
        flashRef.current.scale.set(scale, scale, scale);
        const fMat = flashRef.current.material as THREE.MeshBasicMaterial;
        fMat.opacity = (1 - p) * 0.95;
      } else {
        flashRef.current.visible = false;
      }
    }

    // Micro debris particles ejecting on impact (active for 220ms)
    if (debrisRef.current) {
      if (age < 220) {
        const dp = age / 220;
        debrisRef.current.position.z = dp * 0.04;
        debrisRef.current.scale.setScalar(1 - dp * 0.7);
      } else {
        debrisRef.current.visible = false;
      }
    }
  });

  return (
    <group position={position} quaternion={quaternion}>
      {/* Permanent Decal Plane lying flush on surface */}
      <mesh ref={meshRef}>
        <planeGeometry args={[size, size]} />
        <meshBasicMaterial
          map={texture}
          transparent
          opacity={0.96}
          depthWrite={false}
          polygonOffset
          polygonOffsetFactor={-2}
          polygonOffsetUnits={-2}
        />
      </mesh>

      {/* Instant Micro Impact Flash/Spark for 160ms */}
      <mesh ref={flashRef} position={[0, 0, 0.015]}>
        <sphereGeometry args={[isMetal ? 0.045 : 0.035, 6, 6]} />
        <meshBasicMaterial
          color={isMetal ? '#fef08a' : decal.surfaceType === 'wood' ? '#f59e0b' : '#cbd5e1'}
          transparent
          opacity={0.9}
        />
      </mesh>

      {/* Subtle Micro Debris Specks for 220ms */}
      <group ref={debrisRef} position={[0, 0, 0.01]}>
        <mesh position={[-0.03, 0.02, 0]}>
          <boxGeometry args={[0.008, 0.008, 0.008]} />
          <meshBasicMaterial color="#334155" />
        </mesh>
        <mesh position={[0.025, -0.02, 0]}>
          <boxGeometry args={[0.007, 0.007, 0.007]} />
          <meshBasicMaterial color="#475569" />
        </mesh>
        <mesh position={[0.01, 0.03, 0]}>
          <boxGeometry args={[0.006, 0.006, 0.006]} />
          <meshBasicMaterial color="#1e293b" />
        </mesh>
      </group>
    </group>
  );
};

export const DecalManager: React.FC<DecalManagerProps> = ({ decals }) => {
  // Lazily create and cache multiple procedural surface variants (6 concrete, 3 metal, 3 wood, 3 stone, 3 ground)
  const textures = useMemo(() => {
    return {
      concrete: [0, 1, 2, 3, 4, 5].map((v) => createDecalTexture('concrete', v)),
      stone: [0, 1, 2, 3].map((v) => createDecalTexture('stone', v)),
      ground: [0, 1, 2].map((v) => createDecalTexture('ground', v)),
      metal: [0, 1, 2].map((v) => createDecalTexture('metal', v)),
      wood: [0, 1, 2].map((v) => createDecalTexture('wood', v)),
    };
  }, []);

  // Filter expired decals periodically
  useFrame(() => {
    gameState.clearExpiredDecals();
  });

  return (
    <group>
      {decals.map((decal) => (
        <SingleImpactDecal
          key={decal.id}
          decal={decal}
          textures={textures}
        />
      ))}
    </group>
  );
};
