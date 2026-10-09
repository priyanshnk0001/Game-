import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

function createPNG(width, height, getPixel) {
  const scanlines = Buffer.alloc(height * (width * 4 + 1));
  let offset = 0;
  for (let y = 0; y < height; y++) {
    scanlines[offset++] = 0;
    for (let x = 0; x < width; x++) {
      const [r, g, b, a] = getPixel(x, y);
      scanlines[offset++] = r;
      scanlines[offset++] = g;
      scanlines[offset++] = b;
      scanlines[offset++] = a !== undefined ? a : 255;
    }
  }

  const idatData = zlib.deflateSync(scanlines, { level: 6 });

  function chunk(type, data) {
    const typeBuf = Buffer.from(type);
    const lenBuf = Buffer.alloc(4);
    lenBuf.writeUInt32BE(data.length);
    const crcBuf = Buffer.alloc(4);
    const toCrc = Buffer.concat([typeBuf, data]);
    let crc = 0xFFFFFFFF;
    for (let i = 0; i < toCrc.length; i++) {
      crc ^= toCrc[i];
      for (let j = 0; j < 8; j++) {
        crc = (crc >>> 1) ^ (crc & 1 ? 0xEDB88320 : 0);
      }
    }
    crc = (crc ^ 0xFFFFFFFF) >>> 0;
    crcBuf.writeUInt32BE(crc);
    return Buffer.concat([lenBuf, typeBuf, data, crcBuf]);
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const header = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  return Buffer.concat([
    header,
    chunk('IHDR', ihdr),
    chunk('IDAT', idatData),
    chunk('IEND', Buffer.alloc(0))
  ]);
}

function hash(x, y) {
  const n = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453123;
  return n - Math.floor(n);
}

function clamp(v, min, max) {
  return Math.min(max, Math.max(min, v));
}

// Desert digital camo helper for backpack & straps
function desertCamo(x, y) {
  const bx = Math.floor(x / 16);
  const by = Math.floor(y / 16);
  const r = hash(bx * 7.1, by * 13.3);
  if (r < 0.35) return [198, 185, 158]; // Sand beige
  if (r < 0.65) return [145, 132, 108]; // Desert khaki
  if (r < 0.85) return [98, 86, 70];    // Brown pixel
  return [168, 156, 130];              // Light sand
}

// Colors for Classic PUBG Lone Survivor Outfit
const SHIRT_WHITE = [242, 244, 247];    // Crisp white dress shirt
const PURE_WHITE = [255, 255, 255];     // Pure white buttons
const SHIRT_SHADOW = [218, 222, 228];   // Shirt crease / shadow
const TIE_BLACK = [22, 23, 26];         // Black slim necktie
const TIE_SHEEN = [42, 45, 50];         // Tie silk specular
const BELT_LEATHER = [28, 29, 32];      // Black leather belt
const BUCKLE_SILVER = [215, 220, 226];  // Polished chrome buckle
const SADDLE_BROWN = [105, 62, 35];     // Thigh holster harness leather
const SADDLE_DARK = [75, 42, 22];       // Leather strap edge
const DENIM_BLUE = [48, 78, 122];       // PUBG Classic Blue Jeans
const DENIM_DARK = [35, 58, 94];        // Denim shadow
const DENIM_LIGHT = [62, 96, 146];      // Denim highlight / wash
const KNEE_PAD_BLUE = [42, 65, 98];     // Knee pad blue fabric
const SKIN_TONE = [210, 168, 146];      // Forearm & finger skin
const SKIN_SHADOW = [185, 142, 122];    // Skin shadow
const GLOVE_BLACK = [24, 25, 28];       // Black leather fingerless glove
const BOOT_DARK = [26, 28, 30];         // Combat shoe leather
const HELMET_GUNMETAL = [36, 40, 44];   // Spetsnaz Level 3 helmet steel

console.log('Generating 1. Classic PUBG Lone Survivor combat_shirt.png...');
{
  const W = 2048, H = 2048;
  const diffuse = createPNG(W, H, (x, y) => {
    const u = x / W;
    const v = y / H;
    const noise = (hash(x, y) - 0.5) * 6;
    const distCenter = Math.abs(u - 0.5);

    // 1. Open Collar at Neck (v: 0.00 to 0.09)
    if (v < 0.09) {
      // V-neck skin opening in center
      if (distCenter < (v * 0.45)) {
        return [SKIN_TONE[0] + noise, SKIN_TONE[1] + noise, SKIN_TONE[2] + noise, 255];
      }
      // Collar Lapels (spread open)
      const isLapelEdge = Math.abs(distCenter - (v * 0.45)) < 0.008;
      if (isLapelEdge) return [SHIRT_SHADOW[0], SHIRT_SHADOW[1], SHIRT_SHADOW[2], 255];
      return [SHIRT_WHITE[0] + noise, SHIRT_WHITE[1] + noise, SHIRT_WHITE[2] + noise, 255];
    }

    // 2. Black Leather Belt & Holster Harness (v: 0.70 to 0.83)
    if (v >= 0.70 && v < 0.83) {
      const beltV = (v - 0.70) / 0.13;
      // Belt stitching top and bottom
      if (beltV < 0.08 || beltV > 0.92) {
        return [SHIRT_SHADOW[0], SHIRT_SHADOW[1], SHIRT_SHADOW[2], 255];
      }
      // Main Center Silver Belt Buckle (u: 0.45 to 0.55)
      if (u >= 0.45 && u <= 0.55) {
        const bu = (u - 0.45) / 0.10;
        const isFrame = (bu < 0.15 || bu > 0.85 || beltV < 0.15 || beltV > 0.85);
        if (isFrame) return [BUCKLE_SILVER[0], BUCKLE_SILVER[1], BUCKLE_SILVER[2], 255];
        // Buckle pin in center
        if (Math.abs(bu - 0.5) < 0.06) return [BUCKLE_SILVER[0], BUCKLE_SILVER[1], BUCKLE_SILVER[2], 255];
        return [BELT_LEATHER[0], BELT_LEATHER[1], BELT_LEATHER[2], 255];
      }
      // Diagonal Brown Holster Harness Strap (crossing over left side, u in [0.28, 0.42])
      const strapCenter = 0.32 + (beltV - 0.5) * 0.15;
      if (Math.abs(u - strapCenter) < 0.025) {
        // Harness silver buckle on strap
        if (beltV > 0.35 && beltV < 0.65) {
          return [BUCKLE_SILVER[0], BUCKLE_SILVER[1], BUCKLE_SILVER[2], 255];
        }
        return [SADDLE_BROWN[0], SADDLE_BROWN[1], SADDLE_BROWN[2], 255];
      }
      return [BELT_LEATHER[0] + noise, BELT_LEATHER[1] + noise, BELT_LEATHER[2] + noise, 255];
    }

    // 3. Waistband transition to jeans (v: 0.83 to 1.00)
    if (v >= 0.83) {
      // Diagonal holster brown leather strap continuing down left thigh (u ~ 0.36 to 0.42)
      if (Math.abs(u - 0.38 - (v - 0.83) * 0.2) < 0.022) {
        return [SADDLE_BROWN[0], SADDLE_BROWN[1], SADDLE_BROWN[2], 255];
      }
      return [DENIM_BLUE[0] + noise, DENIM_BLUE[1] + noise, DENIM_BLUE[2] + noise, 255];
    }

    // 4. White Collared Shirt Torso (v: 0.09 to 0.70)
    // Desert Camo Backpack Shoulder Straps (over left and right chest: u ~ 0.22 and 0.78)
    const isStrapL = Math.abs(u - 0.22) < 0.035;
    const isStrapR = Math.abs(u - 0.78) < 0.035;
    if (isStrapL || isStrapR) {
      const strapCol = desertCamo(x, y);
      // Strap border stitching
      const edge = (isStrapL ? Math.abs(u - 0.22) : Math.abs(u - 0.78)) > 0.028;
      if (edge) return [SADDLE_DARK[0], SADDLE_DARK[1], SADDLE_DARK[2], 255];
      return [strapCol[0], strapCol[1], strapCol[2], 255];
    }

    // Slim Black Necktie hanging down center (v: 0.09 to 0.68)
    const tieWidth = 0.018 + (v - 0.09) * 0.022; // subtle taper
    if (distCenter < tieWidth && v <= 0.68) {
      // Tie knot at top
      if (v < 0.14) {
        return [TIE_BLACK[0] + 15, TIE_BLACK[1] + 15, TIE_BLACK[2] + 15, 255];
      }
      // Tie silk diagonal weave texture
      const weave = ((x + y) % 6 < 3) ? TIE_SHEEN : TIE_BLACK;
      // Pointed tie tip at bottom (v: 0.65 to 0.68)
      if (v > 0.65) {
        const tipV = (0.68 - v) / 0.03;
        if (distCenter > tieWidth * tipV) {
          return [SHIRT_WHITE[0], SHIRT_WHITE[1], SHIRT_WHITE[2], 255];
        }
      }
      return [weave[0], weave[1], weave[2], 255];
    }

    // Shirt Center Placket (behind tie) with small buttons
    if (distCenter < 0.008) {
      // Small white buttons every 120 pixels
      if (y % 140 < 12) {
        return [PURE_WHITE[0], PURE_WHITE[1], PURE_WHITE[2], 255];
      }
      return [SHIRT_SHADOW[0], SHIRT_SHADOW[1], SHIRT_SHADOW[2], 255];
    }

    // Left and Right Chest Flap Pockets (v: 0.24 to 0.38, u in [0.28, 0.42] and [0.58, 0.72])
    const isPocketL = (u >= 0.28 && u <= 0.42 && v >= 0.24 && v <= 0.38);
    const isPocketR = (u >= 0.58 && u <= 0.72 && v >= 0.24 && v <= 0.38);
    if (isPocketL || isPocketR) {
      // Flap cover at top of pocket (v: 0.24 to 0.28)
      if (v <= 0.28) {
        // Pocket flap button in center
        const pcu = isPocketL ? Math.abs(u - 0.35) : Math.abs(u - 0.65);
        if (pcu < 0.012 && Math.abs(v - 0.27) < 0.01) {
          return [PURE_WHITE[0], PURE_WHITE[1], PURE_WHITE[2], 255];
        }
        return [SHIRT_SHADOW[0], SHIRT_SHADOW[1], SHIRT_SHADOW[2], 255];
      }
      // Pocket seam border
      const pEdge = isPocketL ? (u < 0.288 || u > 0.412 || v > 0.372) : (u < 0.588 || u > 0.712 || v > 0.372);
      if (pEdge) return [SHIRT_SHADOW[0], SHIRT_SHADOW[1], SHIRT_SHADOW[2], 255];
    }

    // Soft organic shirt folds and fabric shadows
    const fold = Math.sin(v * 16) * 6 + Math.sin(u * 12) * 5;
    return [
      clamp(SHIRT_WHITE[0] + fold + noise, 0, 255),
      clamp(SHIRT_WHITE[1] + fold + noise, 0, 255),
      clamp(SHIRT_WHITE[2] + fold + noise, 0, 255),
      255
    ];
  });
  fs.writeFileSync('public/textures/player/combat_shirt.png', diffuse);

  // Clear emissive for non-glowing realistic clothes
  const emissive = createPNG(W, H, () => [0, 0, 0, 255]);
  fs.writeFileSync('public/textures/player/combat_shirt_emissive.png', emissive);
  console.log('Saved combat_shirt.png (Classic PUBG White Shirt & Tie)');
}

console.log('Generating 2. Classic PUBG Lone Survivor combat_pants_boots.png...');
{
  const W = 2048, H = 2048;
  const diffuse = createPNG(W, H, (x, y) => {
    const u = x / W;
    const v = y / H;
    const noise = (hash(x, y) - 0.5) * 6;

    // Denim twill texture pattern
    const denimTwill = ((x + y) % 4 < 2) ? 6 : -6;

    // 1. Classic Blue Cargo Jeans (v: 0.00 to 0.72)
    if (v < 0.72) {
      // Left Thigh Drop-Leg Holster Rig (u ~ 0.15 to 0.35, v in [0.08, 0.30])
      const isHolsterZone = (u >= 0.16 && u <= 0.34 && v >= 0.08 && v <= 0.30);
      if (isHolsterZone) {
        // Brown leather backing & harness frame
        const isFrame = (u < 0.18 || u > 0.32 || v < 0.10 || v > 0.28);
        if (isFrame) return [SADDLE_BROWN[0] + noise, SADDLE_BROWN[1] + noise, SADDLE_BROWN[2] + noise, 255];
        // Silver buckles on holster straps
        if (Math.abs(v - 0.14) < 0.012 || Math.abs(v - 0.24) < 0.012) {
          if (u > 0.28) return [BUCKLE_SILVER[0], BUCKLE_SILVER[1], BUCKLE_SILVER[2], 255];
        }
        // Black kydex holster pouch
        return [BELT_LEATHER[0] + noise, BELT_LEATHER[1] + noise, BELT_LEATHER[2] + noise, 255];
      }

      // Knee Pads with Dual Brown Leather Buckled Straps (v: 0.32 to 0.44)
      const isKneeL = (Math.abs(u - 0.25) < 0.13);
      const isKneeR = (Math.abs(u - 0.75) < 0.13);
      if ((isKneeL || isKneeR) && v >= 0.32 && v <= 0.44) {
        // Top brown leather strap across knee pad (v: 0.33 to 0.355)
        const isTopStrap = (v >= 0.332 && v <= 0.352);
        // Bottom brown leather strap across knee pad (v: 0.405 to 0.428)
        const isBotStrap = (v >= 0.408 && v <= 0.428);

        if (isTopStrap || isBotStrap) {
          // Silver buckles on outer edges of straps
          const edgeDist = Math.abs((u % 0.5) - 0.25);
          if (edgeDist > 0.095 && edgeDist < 0.125) {
            return [BUCKLE_SILVER[0], BUCKLE_SILVER[1], BUCKLE_SILVER[2], 255];
          }
          return [SADDLE_BROWN[0] + noise, SADDLE_BROWN[1] + noise, SADDLE_BROWN[2] + noise, 255];
        }

        // Blue knee pad cushion body
        const pleat = (y % 16 < 3) ? -10 : 8;
        return [
          clamp(KNEE_PAD_BLUE[0] + pleat + noise, 0, 255),
          clamp(KNEE_PAD_BLUE[1] + pleat + noise, 0, 255),
          clamp(KNEE_PAD_BLUE[2] + pleat + noise, 0, 255),
          255
        ];
      }

      // Right Thigh Cargo Pocket (u in [0.70, 0.88], v in [0.15, 0.28])
      const isCargoR = (u >= 0.70 && u <= 0.88 && v >= 0.15 && v <= 0.28);
      if (isCargoR) {
        const isFlap = (v >= 0.15 && v <= 0.185);
        if (isFlap) return [DENIM_DARK[0], DENIM_DARK[1], DENIM_DARK[2], 255];
      }

      // Jeans Double-Needle Seams (Gold/Tan Stitching)
      const isOutseam = (Math.abs(u - 0.02) < 0.005 || Math.abs(u - 0.98) < 0.005 || Math.abs(u - 0.5) < 0.005);
      if (isOutseam) {
        return (y % 10 < 5) ? [210, 165, 95, 255] : [DENIM_DARK[0], DENIM_DARK[1], DENIM_DARK[2], 255];
      }

      // Denim washed shading
      const wash = Math.sin(u * 10) * 8;
      return [
        clamp(DENIM_BLUE[0] + denimTwill + wash + noise, 0, 255),
        clamp(DENIM_BLUE[1] + denimTwill + wash + noise, 0, 255),
        clamp(DENIM_BLUE[2] + denimTwill + wash + noise, 0, 255),
        255
      ];
    }

    // 2. Tucked cuff transition (v: 0.72 to 0.75)
    if (v >= 0.72 && v < 0.75) {
      return [DENIM_DARK[0] + noise, DENIM_DARK[1] + noise, DENIM_DARK[2] + noise, 255];
    }

    // 3. Dark Tactical Combat Boots (v: 0.75 to 1.00)
    // Lugged boot outsole (v: 0.88 to 1.00)
    if (v >= 0.88) {
      const tread = ((x + y) % 20 < 8) ? -12 : 10;
      return [
        clamp(BOOT_DARK[0] + tread + noise, 0, 255),
        clamp(BOOT_DARK[1] + tread + noise, 0, 255),
        clamp(BOOT_DARK[2] + tread + noise, 0, 255),
        255
      ];
    }

    // Boot leather upper & lacing
    const distCenterL = Math.abs(u - 0.25);
    const distCenterR = Math.abs(u - 0.75);
    const inLaces = (distCenterL < 0.035 || distCenterR < 0.035);
    if (inLaces) {
      const isLaceCross = (y % 24 < 6);
      if (isLaceCross) return [SADDLE_BROWN[0], SADDLE_BROWN[1], SADDLE_BROWN[2], 255];
      return [BOOT_DARK[0], BOOT_DARK[1], BOOT_DARK[2], 255];
    }

    return [
      clamp(BOOT_DARK[0] + noise, 0, 255),
      clamp(BOOT_DARK[1] + noise, 0, 255),
      clamp(BOOT_DARK[2] + noise, 0, 255),
      255
    ];
  });
  fs.writeFileSync('public/textures/player/combat_pants_boots.png', diffuse);

  const emissive = createPNG(W, H, () => [0, 0, 0, 255]);
  fs.writeFileSync('public/textures/player/combat_pants_boots_emissive.png', emissive);
  console.log('Saved combat_pants_boots.png (Classic PUBG Blue Jeans & Holster)');
}

console.log('Generating 3. Classic PUBG Lone Survivor combat_arms_gloves.png...');
{
  const W = 2048, H = 2048;
  const diffuse = createPNG(W, H, (x, y) => {
    const u = x / W;
    const v = y / H;
    const noise = (hash(x, y) - 0.5) * 6;

    // 1. Rolled-Up White Shirt Sleeves (v: 0.00 to 0.36)
    if (v < 0.36) {
      // Rolled cuff fold at the bottom of the sleeve (v: 0.30 to 0.36)
      if (v >= 0.30) {
        // Brown button retention strap loop on sleeve cuff
        const isStrapLoop = (Math.abs((u % 0.5) - 0.25) < 0.02);
        if (isStrapLoop) {
          if (v > 0.34) return [BUCKLE_SILVER[0], BUCKLE_SILVER[1], BUCKLE_SILVER[2], 255];
          return [SADDLE_BROWN[0], SADDLE_BROWN[1], SADDLE_BROWN[2], 255];
        }
        const cuffFold = Math.sin((v - 0.30) / 0.06 * Math.PI) * 12;
        return [
          clamp(SHIRT_SHADOW[0] + cuffFold + noise, 0, 255),
          clamp(SHIRT_SHADOW[1] + cuffFold + noise, 0, 255),
          clamp(SHIRT_SHADOW[2] + cuffFold + noise, 0, 255),
          255
        ];
      }
      return [SHIRT_WHITE[0] + noise, SHIRT_WHITE[1] + noise, SHIRT_WHITE[2] + noise, 255];
    }

    // 2. Bare Skin Forearms (v: 0.36 to 0.64)
    if (v < 0.64) {
      const skinShade = Math.sin((v - 0.36) / 0.28 * Math.PI) * 6;
      return [
        clamp(SKIN_TONE[0] + skinShade + noise, 0, 255),
        clamp(SKIN_TONE[1] + skinShade + noise, 0, 255),
        clamp(SKIN_TONE[2] + skinShade + noise, 0, 255),
        255
      ];
    }

    // 3. Black Leather Fingerless Tactical Gloves (v: 0.64 to 1.00)
    // Leather Wrist Cuff with Silver Buckle (v: 0.64 to 0.70)
    if (v >= 0.64 && v < 0.70) {
      // Silver wrist strap buckle
      if (Math.abs((u % 0.5) - 0.25) < 0.025 && v >= 0.655 && v <= 0.685) {
        return [BUCKLE_SILVER[0], BUCKLE_SILVER[1], BUCKLE_SILVER[2], 255];
      }
      return [GLOVE_BLACK[0] + noise, GLOVE_BLACK[1] + noise, GLOVE_BLACK[2] + noise, 255];
    }

    // Fingerless Glove Body (knuckles to fingers, v: 0.70 to 0.88)
    if (v < 0.88) {
      // Knuckle padding ribs
      const rib = (y % 16 < 4) ? 10 : -6;
      return [
        clamp(GLOVE_BLACK[0] + rib + noise, 0, 255),
        clamp(GLOVE_BLACK[1] + rib + noise, 0, 255),
        clamp(GLOVE_BLACK[2] + rib + noise, 0, 255),
        255
      ];
    }

    // Finger tips exposed (Fingerless cutouts, v: 0.88 to 1.00)
    // Cutout hem border
    if (v < 0.90) {
      return [GLOVE_BLACK[0] - 10, GLOVE_BLACK[1] - 10, GLOVE_BLACK[2] - 10, 255];
    }
    // Exposed finger skin with fingernails
    return [SKIN_TONE[0] + noise, SKIN_TONE[1] + noise, SKIN_TONE[2] + noise, 255];
  });
  fs.writeFileSync('public/textures/player/combat_arms_gloves.png', diffuse);

  const emissive = createPNG(W, H, () => [0, 0, 0, 255]);
  fs.writeFileSync('public/textures/player/combat_arms_gloves_emissive.png', emissive);
  console.log('Saved combat_arms_gloves.png (Rolled Sleeves & Fingerless Gloves)');
}

console.log('Generating 4. Classic PUBG Lone Survivor tactical_vest_gear.png...');
{
  const W = 1024, H = 1024;
  const diffuse = createPNG(W, H, (x, y) => {
    const u = x / W;
    const v = y / H;
    const noise = (hash(x, y) - 0.5) * 6;

    // Top half: Desert Digital Camo Backpack with Webbing (v: 0.0 to 0.5)
    if (v < 0.5) {
      // Horizontal MOLLE Webbing ribbons
      const isMolle = (y % 48 < 16);
      if (isMolle) {
        // Stitch bar-tack
        const barTack = (x % 56 < 4);
        if (barTack) return [SADDLE_DARK[0], SADDLE_DARK[1], SADDLE_DARK[2], 255];
        return [125, 115, 95, 255]; // Webbing ribbon
      }
      // Desert digital camo background
      const camo = desertCamo(x, y);
      return [camo[0] + noise, camo[1] + noise, camo[2] + noise, 255];
    }

    // Bottom half: Spetsnaz Level 3 Helmet Steel, Holster Leather & Knee Straps (v: 0.5 to 1.0)
    // Left side: Dark Gunmetal Steel for Helmet & Visor (u < 0.5)
    if (u < 0.5) {
      // Helmet metallic specular texture
      const steel = ((hash(x * 3, y * 3) - 0.5) * 8);
      // Dark visor glass opening
      if (v > 0.70 && v < 0.85 && u > 0.10 && u < 0.40) {
        return [14, 15, 17, 255]; // Tinted ballistic glass
      }
      return [
        clamp(HELMET_GUNMETAL[0] + steel, 0, 255),
        clamp(HELMET_GUNMETAL[1] + steel, 0, 255),
        clamp(HELMET_GUNMETAL[2] + steel, 0, 255),
        255
      ];
    }

    // Right side: Saddle Brown Leather for Holster & Knee Straps (u >= 0.5)
    const isBuckle = (Math.abs(u - 0.75) < 0.08 && Math.abs(v - 0.75) < 0.08);
    if (isBuckle) {
      return [BUCKLE_SILVER[0], BUCKLE_SILVER[1], BUCKLE_SILVER[2], 255];
    }
    const leatherGrain = ((hash(x * 2, y * 2) - 0.5) * 8);
    return [
      clamp(SADDLE_BROWN[0] + leatherGrain, 0, 255),
      clamp(SADDLE_BROWN[1] + leatherGrain, 0, 255),
      clamp(SADDLE_BROWN[2] + leatherGrain, 0, 255),
      255
    ];
  });
  fs.writeFileSync('public/textures/player/tactical_vest_gear.png', diffuse);

  const emissive = createPNG(W, H, () => [0, 0, 0, 255]);
  fs.writeFileSync('public/textures/player/tactical_vest_gear_emissive.png', emissive);
  console.log('Saved tactical_vest_gear.png (Backpack Camo, Helmet Steel & Leather)');
}

console.log('All Classic PUBG Lone Survivor Outfit textures generated successfully!');
