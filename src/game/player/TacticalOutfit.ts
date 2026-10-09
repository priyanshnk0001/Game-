import * as THREE from 'three';
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js';

// Cache texture loader and shared textures across all player instances
const textureLoader = new THREE.TextureLoader();

function loadTacticalTexture(url: string): THREE.Texture {
  const tex = textureLoader.load(url);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.generateMipmaps = true;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.magFilter = THREE.LinearFilter;
  return tex;
}

// Classic PUBG Lone Survivor Outfit PBR Textures
const combatShirtTexture = loadTacticalTexture('/textures/player/combat_shirt.png');
const combatPantsBootsTexture = loadTacticalTexture('/textures/player/combat_pants_boots.png');
const combatArmsGlovesTexture = loadTacticalTexture('/textures/player/combat_arms_gloves.png');
const tacticalVestGearTexture = loadTacticalTexture('/textures/player/tactical_vest_gear.png');

export const combatShirtMaterial = new THREE.MeshStandardMaterial({
  map: combatShirtTexture,
  roughness: 0.75,
  metalness: 0.02,
  envMapIntensity: 0.9,
  name: 'PUBGWhiteShirtMat',
});

export const combatPantsBootsMaterial = new THREE.MeshStandardMaterial({
  map: combatPantsBootsTexture,
  roughness: 0.70,
  metalness: 0.04,
  envMapIntensity: 0.9,
  name: 'PUBGBlueJeansMat',
});

export const combatArmsGlovesMaterial = new THREE.MeshStandardMaterial({
  map: combatArmsGlovesTexture,
  roughness: 0.65,
  metalness: 0.05,
  envMapIntensity: 0.9,
  name: 'PUBGRolledSleevesGlovesMat',
});

export const tacticalGearMaterial = new THREE.MeshStandardMaterial({
  map: tacticalVestGearTexture,
  roughness: 0.55,
  metalness: 0.18,
  envMapIntensity: 1.1,
  name: 'PUBGGearBackpackHelmetMat',
});

// Helper to create curved box geometry conforming to body curves
function createCurvedBox(
  w: number,
  h: number,
  d: number,
  wSeg: number,
  hSeg: number,
  dSeg: number,
  curveZ: number = 0,
  taperY: number = 0
): THREE.BufferGeometry {
  const geom = new THREE.BoxGeometry(w, h, d, wSeg, hSeg, dSeg);
  const pos = geom.attributes.position;
  const halfW = w * 0.5;
  const halfH = h * 0.5;

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);

    let newZ = z;
    let newX = x;

    if (curveZ !== 0 && halfW > 0.0001) {
      const fx = x / halfW;
      newZ -= (fx * fx) * curveZ;
    }

    if (taperY !== 0 && halfH > 0.0001) {
      const fy = (y + halfH) / h;
      newX *= (1 - fy * taperY);
    }

    pos.setXYZ(i, newX, y, newZ);
  }

  geom.computeVertexNormals();
  return geom;
}

// Seamless skin weight transfer from reference body SkinnedMesh to custom gear geometry
function transferSkinWeights(
  targetGeom: THREE.BufferGeometry,
  refMesh: THREE.SkinnedMesh
): void {
  const refPos = refMesh.geometry.attributes.position;
  const refIndex = refMesh.geometry.attributes.skinIndex;
  const refWeight = refMesh.geometry.attributes.skinWeight;
  const targetPos = targetGeom.attributes.position;
  const count = targetPos.count;

  const skinIndices = new Uint16Array(count * 4);
  const skinWeights = new Float32Array(count * 4);
  const p = new THREE.Vector3();
  const refP = new THREE.Vector3();

  for (let i = 0; i < count; i++) {
    p.fromBufferAttribute(targetPos, i);

    let d0 = Infinity;
    let d1 = Infinity;
    let idx0 = 0;
    let idx1 = 0;

    for (let j = 0; j < refPos.count; j++) {
      refP.fromBufferAttribute(refPos, j);
      const dSq = p.distanceToSquared(refP);
      if (dSq < d0) {
        d1 = d0; idx1 = idx0;
        d0 = dSq; idx0 = j;
      } else if (dSq < d1) {
        d1 = dSq; idx1 = j;
      }
    }

    const dist0 = Math.sqrt(d0);
    const dist1 = Math.sqrt(d1);

    if (dist0 < 0.005 || dist1 === Infinity) {
      for (let k = 0; k < 4; k++) {
        skinIndices[i * 4 + k] = refIndex.getComponent(idx0, k);
        skinWeights[i * 4 + k] = refWeight.getComponent(idx0, k);
      }
    } else {
      const w0 = 1 / (dist0 + 0.001);
      const w1 = 1 / (dist1 + 0.001);
      const sumW = w0 + w1;

      const bMap = new Map<number, number>();
      const addBone = (rIdx: number, factor: number) => {
        for (let k = 0; k < 4; k++) {
          const b = refIndex.getComponent(rIdx, k);
          const w = refWeight.getComponent(rIdx, k);
          if (w > 0.005) {
            bMap.set(b, (bMap.get(b) || 0) + w * factor);
          }
        }
      };

      addBone(idx0, w0 / sumW);
      addBone(idx1, w1 / sumW);

      const sorted = Array.from(bMap.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 4);

      let total = 0;
      for (const [, w] of sorted) total += w;
      if (total < 0.0001) total = 1;

      for (let k = 0; k < 4; k++) {
        if (k < sorted.length) {
          skinIndices[i * 4 + k] = sorted[k][0];
          skinWeights[i * 4 + k] = sorted[k][1] / total;
        } else {
          skinIndices[i * 4 + k] = 0;
          skinWeights[i * 4 + k] = 0;
        }
      }
    }
  }

  targetGeom.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(skinIndices, 4));
  targetGeom.setAttribute('skinWeight', new THREE.Float32BufferAttribute(skinWeights, 4));
}

// Build 3D Classic PUBG Backpack, Shoulder Straps & Necktie Geometry (Torso)
function buildTacticalVestGeometry(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];

  // 1. Level 3 Desert Digital Camo Tactical Backpack (Main Body)
  const backpackMain = createCurvedBox(0.24, 0.31, 0.075, 4, 6, 2, -0.012);
  backpackMain.translate(0, 1.285, -0.155);
  parts.push(backpackMain);

  // Outer front secondary zippered pocket
  const backpackPocket = new THREE.BoxGeometry(0.21, 0.20, 0.035);
  backpackPocket.translate(0, 1.265, -0.198);
  parts.push(backpackPocket);

  // 4 rows of horizontal MOLLE webbing ribbons across backpack pocket
  for (let row = 0; row < 4; row++) {
    const y = 1.185 + row * 0.045;
    const molle = new THREE.BoxGeometry(0.19, 0.014, 0.006);
    molle.translate(0, y, -0.218);
    parts.push(molle);
  }

  // Top grab handle loop
  const grabHandle = new THREE.BoxGeometry(0.08, 0.016, 0.024);
  grabHandle.translate(0, 1.455, -0.150);
  parts.push(grabHandle);

  // 2. Padded Desert Camo Backpack Shoulder Straps
  // Left strap
  const leftStrap = new THREE.BoxGeometry(0.046, 0.018, 0.26);
  leftStrap.rotateX(0.05);
  leftStrap.translate(0.086, 1.442, 0.005);
  parts.push(leftStrap);

  // Right strap
  const rightStrap = new THREE.BoxGeometry(0.046, 0.018, 0.26);
  rightStrap.rotateX(0.05);
  rightStrap.translate(-0.086, 1.442, 0.005);
  parts.push(rightStrap);

  // 3. 3D Slim Black Necktie hanging down the front of the white shirt
  const necktie = new THREE.BoxGeometry(0.038, 0.26, 0.006);
  necktie.translate(0, 1.275, 0.138);
  parts.push(necktie);

  // Tie knot at collar
  const tieKnot = new THREE.BoxGeometry(0.034, 0.034, 0.015);
  tieKnot.translate(0, 1.425, 0.132);
  parts.push(tieKnot);

  // 4. White shirt open collar lapels (3D relief)
  [-1, 1].forEach((side) => {
    const lapel = new THREE.BoxGeometry(0.035, 0.045, 0.010);
    lapel.rotateZ(side * 0.35);
    lapel.translate(side * 0.052, 1.458, 0.115);
    parts.push(lapel);
  });

  const merged = BufferGeometryUtils.mergeGeometries(parts, false);
  return merged;
}

// Build 3D Drop-Leg Thigh Holster, Knee Pads & Belt (Lower Body)
function buildTacticalGearGeometry(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];

  // 1. Left Thigh Drop-Leg Holster Rig (Iconic to PUBG Cover Character)
  // Diagonal leather belt strap connecting waist belt to holster
  const diagStrap = new THREE.BoxGeometry(0.026, 0.14, 0.012);
  diagStrap.rotateZ(0.25);
  diagStrap.translate(0.145, 0.895, 0.025);
  parts.push(diagStrap);

  // Main black kydex holster body on outer left thigh
  const holsterBody = new THREE.BoxGeometry(0.045, 0.135, 0.085);
  holsterBody.translate(0.165, 0.765, 0.025);
  parts.push(holsterBody);

  // Dual tactical utility / magazine pouches on the holster
  for (let i = 0; i < 2; i++) {
    const pouch = new THREE.BoxGeometry(0.028, 0.075, 0.034);
    pouch.translate(0.185, 0.765, -0.015 + i * 0.042);
    parts.push(pouch);
  }

  // Dual horizontal thigh retention straps wrapping around left thigh with buckles
  [-0.038, 0.038].forEach((offsetY) => {
    const legStrap = new THREE.BoxGeometry(0.14, 0.018, 0.16);
    legStrap.translate(0.118, 0.765 + offsetY, 0.025);
    parts.push(legStrap);

    // Silver buckle on strap
    const buckle = new THREE.BoxGeometry(0.010, 0.022, 0.024);
    buckle.translate(0.188, 0.765 + offsetY, 0.025);
    parts.push(buckle);
  });

  // 2. Knee Pads with Dual Brown Leather Buckled Straps (Left & Right Patellas)
  [-1, 1].forEach((side) => {
    const x = side * 0.122;
    const y = 0.510;
    const z = 0.082;

    // Blue cushion knee pad shell
    const cap = createCurvedBox(0.078, 0.088, 0.022, 4, 4, 2, 0.008);
    cap.translate(x, y, z);
    parts.push(cap);

    // Dual horizontal brown leather retention straps wrapping behind the knee
    [-0.032, 0.032].forEach((offsetY) => {
      const strap = new THREE.BoxGeometry(0.13, 0.016, 0.14);
      strap.translate(x, y + offsetY, z - 0.058);
      parts.push(strap);

      // Silver rectangular buckle on strap
      const buckle = new THREE.BoxGeometry(0.010, 0.020, 0.022);
      buckle.translate(x + side * 0.062, y + offsetY, z - 0.010);
      parts.push(buckle);
    });
  });

  // 3. Right Thigh Cargo Pocket
  const rightPocket = new THREE.BoxGeometry(0.032, 0.125, 0.095);
  rightPocket.translate(-0.166, 0.695, 0.015);
  parts.push(rightPocket);

  const rightFlap = new THREE.BoxGeometry(0.036, 0.032, 0.102);
  rightFlap.translate(-0.166, 0.755, 0.015);
  parts.push(rightFlap);

  // 4. Black Leather Waist Belt with Silver Buckle
  const beltRing = new THREE.CylinderGeometry(0.182, 0.180, 0.048, 16, 1, true);
  beltRing.scale(1.0, 1.0, 0.82);
  beltRing.translate(0, 1.015, 0.028);
  parts.push(beltRing);

  // Front center silver buckle
  const silverBuckle = new THREE.BoxGeometry(0.045, 0.052, 0.014);
  silverBuckle.translate(0, 1.015, 0.145);
  parts.push(silverBuckle);

  // 5. Combat Boot Soles & Cuff Rings
  [-1, 1].forEach((side) => {
    const x = side * 0.136;
    const sole = new THREE.BoxGeometry(0.096, 0.024, 0.245);
    sole.translate(x, 0.012, 0.058);
    parts.push(sole);

    const cuff = new THREE.CylinderGeometry(0.068, 0.064, 0.032, 12, 1, true);
    cuff.translate(x, 0.215, 0.016);
    parts.push(cuff);
  });

  const merged = BufferGeometryUtils.mergeGeometries(parts, false);
  return merged;
}

// Build 3D Iconic Spetsnaz Level 3 Altyn Helmet with Visor (Head)
function buildHelmetGeometry(headBoneIdx: number): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];

  // 1. Dome Shell (dark steel helmet)
  const dome = new THREE.SphereGeometry(0.108, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.62);
  dome.scale(0.95, 1.05, 1.05);
  dome.translate(0, 1.725, 0.015);
  parts.push(dome);

  // Lower rim / ear protection bulge
  const rim = new THREE.CylinderGeometry(0.106, 0.110, 0.045, 16, 1, true);
  rim.translate(0, 1.665, 0.015);
  parts.push(rim);

  // 2. Heavy-duty Ballistic Face Shield Visor
  const visorFrame = new THREE.BoxGeometry(0.185, 0.085, 0.032);
  visorFrame.translate(0, 1.695, 0.108);
  parts.push(visorFrame);

  // Dark tinted viewing port slit
  const glassSlit = new THREE.BoxGeometry(0.138, 0.032, 0.012);
  glassSlit.translate(0, 1.700, 0.126);
  parts.push(glassSlit);

  // 3. Visor Hinge Bolts on left and right sides
  [-1, 1].forEach((side) => {
    const hinge = new THREE.CylinderGeometry(0.012, 0.012, 0.018, 8);
    hinge.rotateZ(Math.PI / 2);
    hinge.translate(side * 0.104, 1.695, 0.035);
    parts.push(hinge);
  });

  // 4. Black Chin Strap
  const chinStrap = new THREE.BoxGeometry(0.09, 0.015, 0.07);
  chinStrap.translate(0, 1.585, 0.045);
  parts.push(chinStrap);

  const merged = BufferGeometryUtils.mergeGeometries(parts, false);

  // Skinned directly to Head bone (headBoneIdx)
  const count = merged.attributes.position.count;
  const skinIndices = new Uint16Array(count * 4);
  const skinWeights = new Float32Array(count * 4);
  for (let i = 0; i < count; i++) {
    skinIndices[i * 4] = headBoneIdx;
    skinWeights[i * 4] = 1.0;
  }
  merged.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(skinIndices, 4));
  merged.setAttribute('skinWeight', new THREE.Float32BufferAttribute(skinWeights, 4));

  return merged;
}

// Global memoized geometries with transferred skin weights
let cachedVestGeometry: THREE.BufferGeometry | null = null;
let cachedGearGeometry: THREE.BufferGeometry | null = null;
let cachedHelmetGeometry: THREE.BufferGeometry | null = null;

/**
 * Transforms the player model to wear the classic PUBG Cover Guy / Lone Survivor outfit:
 * White collared dress shirt, slim black necktie, blue denim cargo pants, knee pads with
 * brown leather buckled straps, left thigh drop-leg holster rig, desert camo Level 3 backpack,
 * black fingerless combat gloves, and the iconic Spetsnaz Level 3 Altyn helmet with visor.
 */
export function applyTacticalOutfitToPlayer(cloned: THREE.Group): void {
  // Avoid duplicate attachment on hot reload or re-renders
  if (cloned.userData.__pubgOutfitApplied) return;
  cloned.userData.__pubgOutfitApplied = true;

  const bodyMesh = cloned.getObjectByName('Body001_1') as THREE.SkinnedMesh | undefined;
  const legsMesh = cloned.getObjectByName('Body001_2') as THREE.SkinnedMesh | undefined;
  const handsMesh = cloned.getObjectByName('Body001_3') as THREE.SkinnedMesh | undefined;

  if (!bodyMesh || !legsMesh || !handsMesh) {
    console.warn('[TacticalOutfit] Skinned meshes not found on cloned character');
    return;
  }

  // 1. Assign Classic PUBG PBR Textures to Base Skinned Meshes
  bodyMesh.material = combatShirtMaterial;
  bodyMesh.castShadow = true;
  bodyMesh.receiveShadow = true;

  legsMesh.material = combatPantsBootsMaterial;
  legsMesh.castShadow = true;
  legsMesh.receiveShadow = true;

  handsMesh.material = combatArmsGlovesMaterial;
  handsMesh.castShadow = true;
  handsMesh.receiveShadow = true;

  // 2. Generate and Cache Skinned 3D Backpack, Necktie & Straps
  if (!cachedVestGeometry) {
    const rawVestGeom = buildTacticalVestGeometry();
    transferSkinWeights(rawVestGeom, bodyMesh);
    cachedVestGeometry = rawVestGeom;
  }

  // 3. Generate and Cache Skinned 3D Drop-Leg Holster, Knee Pads & Belt
  if (!cachedGearGeometry) {
    const rawGearGeom = buildTacticalGearGeometry();
    transferSkinWeights(rawGearGeom, legsMesh);
    cachedGearGeometry = rawGearGeom;
  }

  // 4. Generate and Cache Level 3 Altyn Helmet
  if (!cachedHelmetGeometry) {
    const headIdx = bodyMesh.skeleton.bones.findIndex((b) => b.name.endsWith('Head'));
    cachedHelmetGeometry = buildHelmetGeometry(headIdx >= 0 ? headIdx : 5);
  }

  // 5. Attach Skinned Backpack & Necktie Mesh (Deforms with Torso / Spine)
  const backpackMesh = new THREE.SkinnedMesh(cachedVestGeometry, tacticalGearMaterial);
  backpackMesh.name = 'PUBGBackpackAndTie';
  backpackMesh.bind(bodyMesh.skeleton, bodyMesh.bindMatrix);
  backpackMesh.castShadow = true;
  backpackMesh.receiveShadow = true;
  cloned.add(backpackMesh);

  // 6. Attach Skinned Drop-Leg Holster, Knee Pads & Belt Mesh (Deforms with Legs)
  const holsterGearMesh = new THREE.SkinnedMesh(cachedGearGeometry, tacticalGearMaterial);
  holsterGearMesh.name = 'PUBGHolsterAndKneePads';
  holsterGearMesh.bind(legsMesh.skeleton, legsMesh.bindMatrix);
  holsterGearMesh.castShadow = true;
  holsterGearMesh.receiveShadow = true;
  cloned.add(holsterGearMesh);

  // 7. Attach Iconic Level 3 Spetsnaz Helmet Mesh (Follows Head Bone)
  const helmetMesh = new THREE.SkinnedMesh(cachedHelmetGeometry, tacticalGearMaterial);
  helmetMesh.name = 'PUBGLevel3Helmet';
  helmetMesh.bind(bodyMesh.skeleton, bodyMesh.bindMatrix);
  helmetMesh.castShadow = true;
  helmetMesh.receiveShadow = true;
  cloned.add(helmetMesh);
}
