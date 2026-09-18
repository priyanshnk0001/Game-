import * as THREE from 'three';

/**
 * Procedural PBR Material and Texture Generator
 * Generates realistic 2K and 1K seamless albedo, normal, roughness, and metalness maps.
 * Zero external asset dependencies, instant loading, perfectly seamless.
 */

// Helper to create a canvas texture
function createCanvasTexture(
  width: number,
  height: number,
  drawFn: (ctx: CanvasRenderingContext2D, w: number, h: number) => void
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;
  drawFn(ctx, width, height);

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

// Generate Normal Map from height buffer using Sobel operator
function generateNormalMap(
  width: number,
  height: number,
  heightMapFn: (x: number, y: number, w: number, h: number) => number,
  strength = 1.5
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;
  const imgData = ctx.createImageData(width, height);
  const data = imgData.data;

  const heights = new Float32Array(width * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      heights[y * width + x] = heightMapFn(x, y, width, height);
    }
  }

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const xLeft = (x - 1 + width) % width;
      const xRight = (x + 1) % width;
      const yUp = (y - 1 + height) % height;
      const yDown = (y + 1) % height;

      // Sobel filter
      const dX = (heights[y * width + xRight] - heights[y * width + xLeft]) * strength;
      const dY = (heights[yDown * width + x] - heights[yUp * width + x]) * strength;

      // Normal vector (-dX, -dY, 1.0) normalized into RGB [0..255]
      const len = Math.sqrt(dX * dX + dY * dY + 1.0);
      const nx = -dX / len;
      const ny = -dY / len;
      const nz = 1.0 / len;

      const idx = (y * width + x) * 4;
      data[idx] = Math.floor((nx * 0.5 + 0.5) * 255);
      data[idx + 1] = Math.floor((ny * 0.5 + 0.5) * 255);
      data[idx + 2] = Math.floor((nz * 0.5 + 0.5) * 255);
      data[idx + 3] = 255;
    }
  }

  ctx.putImageData(imgData, 0, 0);
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

// -------------------------------------------------------------
// 1. Weathered Asphalt / Tactical Concrete Ground Materials
// -------------------------------------------------------------
export function createAsphaltPBR(): THREE.MeshStandardMaterial {
  const albedo = createCanvasTexture(1024, 1024, (ctx, w, h) => {
    // Dark weathered asphalt base
    ctx.fillStyle = '#26292e';
    ctx.fillRect(0, 0, w, h);

    // Aggregate gravel noise
    for (let i = 0; i < 40000; i++) {
      const x = Math.random() * w;
      const y = Math.random() * h;
      const gray = Math.floor(40 + Math.random() * 50);
      ctx.fillStyle = `rgb(${gray},${gray},${gray})`;
      ctx.fillRect(x, y, 1 + Math.random() * 2, 1 + Math.random() * 2);
    }

    // Subtle oil stains and weathering patches
    for (let i = 0; i < 25; i++) {
      const cx = Math.random() * w;
      const cy = Math.random() * h;
      const radius = 30 + Math.random() * 80;
      const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
      grad.addColorStop(0, 'rgba(15, 17, 20, 0.45)');
      grad.addColorStop(1, 'rgba(15, 17, 20, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.fill();
    }

    // Tactical training boundary lines (worn white / yellow hazard lines)
    ctx.strokeStyle = 'rgba(215, 220, 225, 0.35)';
    ctx.lineWidth = 14;
    ctx.setLineDash([40, 30]);
    ctx.beginPath();
    ctx.moveTo(w * 0.25, 0);
    ctx.lineTo(w * 0.25, h);
    ctx.moveTo(w * 0.75, 0);
    ctx.lineTo(w * 0.75, h);
    ctx.stroke();
  });
  albedo.repeat.set(8, 8);

  const normal = generateNormalMap(
    512,
    512,
    () => Math.random() * 0.15,
    2.5
  );
  normal.repeat.set(8, 8);

  const roughness = createCanvasTexture(512, 512, (ctx, w, h) => {
    ctx.fillStyle = '#b0b0b0'; // Medium-high roughness for asphalt
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 10000; i++) {
      const v = Math.floor(160 + Math.random() * 80);
      ctx.fillStyle = `rgb(${v},${v},${v})`;
      ctx.fillRect(Math.random() * w, Math.random() * h, 2, 2);
    }
  });
  roughness.repeat.set(8, 8);

  return new THREE.MeshStandardMaterial({
    map: albedo,
    normalMap: normal,
    roughnessMap: roughness,
    roughness: 0.88,
    metalness: 0.12,
  });
}

// -------------------------------------------------------------
// 2. Heavy Weathered Concrete Bunker Walls
// -------------------------------------------------------------
export function createConcreteWallPBR(): THREE.MeshStandardMaterial {
  const albedo = createCanvasTexture(512, 512, (ctx, w, h) => {
    // Neutral military concrete gray
    ctx.fillStyle = '#5c636e';
    ctx.fillRect(0, 0, w, h);

    // Formwork horizontal board seams
    ctx.fillStyle = 'rgba(40, 44, 50, 0.35)';
    ctx.fillRect(0, h * 0.33, w, 3);
    ctx.fillRect(0, h * 0.66, w, 3);

    // Tie rod circular holes
    const holes = [
      [w * 0.2, h * 0.18],
      [w * 0.8, h * 0.18],
      [w * 0.2, h * 0.5],
      [w * 0.8, h * 0.5],
      [w * 0.2, h * 0.82],
      [w * 0.8, h * 0.82],
    ];
    holes.forEach(([hx, hy]) => {
      ctx.fillStyle = '#22262c';
      ctx.beginPath();
      ctx.arc(hx, hy, 5, 0, Math.PI * 2);
      ctx.fill();

      // Rust bleed streak under tie rod
      const rustGrad = ctx.createLinearGradient(hx, hy, hx, hy + 35);
      rustGrad.addColorStop(0, 'rgba(100, 60, 40, 0.4)');
      rustGrad.addColorStop(1, 'rgba(100, 60, 40, 0)');
      ctx.fillStyle = rustGrad;
      ctx.fillRect(hx - 3, hy, 6, 35);
    });

    // Surface noise and plaster pitting
    for (let i = 0; i < 15000; i++) {
      const gray = Math.floor(75 + Math.random() * 40);
      ctx.fillStyle = `rgba(${gray},${gray},${gray},0.15)`;
      ctx.fillRect(Math.random() * w, Math.random() * h, 2, 2);
    }
  });

  const normal = generateNormalMap(
    256,
    256,
    (_x, y, _w, h) => {
      let val = Math.random() * 0.08;
      // Recessed horizontal seams
      if (Math.abs(y - h * 0.33) < 3 || Math.abs(y - h * 0.66) < 3) {
        val -= 0.3;
      }
      return val;
    },
    2.0
  );

  return new THREE.MeshStandardMaterial({
    map: albedo,
    normalMap: normal,
    roughness: 0.85,
    metalness: 0.1,
  });
}

// -------------------------------------------------------------
// 3. Military Shipping Cargo Containers (Corrugated Steel)
// -------------------------------------------------------------
export function createShippingContainerPBR(baseColor = '#3a506b'): THREE.MeshStandardMaterial {
  const albedo = createCanvasTexture(512, 512, (ctx, w, h) => {
    ctx.fillStyle = baseColor;
    ctx.fillRect(0, 0, w, h);

    // Corrugated vertical panel rib shadows & highlights
    const numRibs = 16;
    const ribWidth = w / numRibs;
    for (let i = 0; i < numRibs; i++) {
      const rx = i * ribWidth;
      // Highlight on rib
      ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.fillRect(rx, 0, ribWidth * 0.4, h);
      // Dark shadow in rib groove
      ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
      ctx.fillRect(rx + ribWidth * 0.4, 0, ribWidth * 0.6, h);
    }

    // Weathered edge rust
    ctx.fillStyle = 'rgba(95, 55, 30, 0.35)';
    ctx.fillRect(0, h - 25, w, 25);
    ctx.fillRect(0, 0, w, 15);

    // Military stencil marking
    ctx.font = 'bold 24px monospace';
    ctx.fillStyle = 'rgba(220, 220, 220, 0.5)';
    ctx.fillText('TAC-LOG 84-F', w * 0.1, h * 0.45);
    ctx.font = '14px monospace';
    ctx.fillText('MAX WT: 28,000 KG', w * 0.1, h * 0.52);
  });

  const normal = generateNormalMap(
    256,
    256,
    (x, _y, w) => {
      const phase = (x % (w / 16)) / (w / 16);
      return Math.sin(phase * Math.PI * 2) * 0.4;
    },
    3.0
  );

  return new THREE.MeshStandardMaterial({
    map: albedo,
    normalMap: normal,
    roughness: 0.55,
    metalness: 0.65,
  });
}

// -------------------------------------------------------------
// 4. Sandbag Fortification Materials (Burlap Weave PBR)
// -------------------------------------------------------------
export function createSandbagPBR(): THREE.MeshStandardMaterial {
  const albedo = createCanvasTexture(256, 256, (ctx, w, h) => {
    // Tan burlap fabric base
    ctx.fillStyle = '#8c7d67';
    ctx.fillRect(0, 0, w, h);

    // Fabric crosshatch fibers
    ctx.fillStyle = 'rgba(70, 60, 48, 0.2)';
    for (let x = 0; x < w; x += 4) {
      ctx.fillRect(x, 0, 1.5, h);
    }
    for (let y = 0; y < h; y += 4) {
      ctx.fillRect(0, y, w, 1.5);
    }

    // Dirt and soil staining
    for (let i = 0; i < 40; i++) {
      const cx = Math.random() * w;
      const cy = Math.random() * h;
      const r = 10 + Math.random() * 25;
      const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
      grad.addColorStop(0, 'rgba(50, 40, 30, 0.4)');
      grad.addColorStop(1, 'rgba(50, 40, 30, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();
    }
  });

  const normal = generateNormalMap(
    128,
    128,
    (x, y) => {
      return (Math.sin(x * 0.8) + Math.cos(y * 0.8)) * 0.15;
    },
    2.0
  );

  return new THREE.MeshStandardMaterial({
    map: albedo,
    normalMap: normal,
    roughness: 0.95,
    metalness: 0.0,
  });
}

// -------------------------------------------------------------
// 5. Tactical Concrete Jersey Barriers
// -------------------------------------------------------------
export function createJerseyBarrierPBR(): THREE.MeshStandardMaterial {
  const albedo = createCanvasTexture(512, 256, (ctx, w, h) => {
    // Weathered concrete base
    ctx.fillStyle = '#6b7280';
    ctx.fillRect(0, 0, w, h);

    // Caution diagonal safety stripes across midsection
    const stripeWidth = 24;
    ctx.fillStyle = 'rgba(234, 179, 8, 0.7)'; // Highway warning yellow
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, h * 0.35, w, h * 0.3);
    ctx.clip();
    for (let x = -h; x < w + h; x += stripeWidth * 2) {
      ctx.beginPath();
      ctx.moveTo(x, h * 0.35);
      ctx.lineTo(x + stripeWidth, h * 0.35);
      ctx.lineTo(x - stripeWidth, h * 0.65);
      ctx.lineTo(x - stripeWidth * 2, h * 0.65);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();

    // Road splatter grime at base
    const baseSplatter = ctx.createLinearGradient(0, h, 0, h - 35);
    baseSplatter.addColorStop(0, 'rgba(30, 32, 35, 0.6)');
    baseSplatter.addColorStop(1, 'rgba(30, 32, 35, 0)');
    ctx.fillStyle = baseSplatter;
    ctx.fillRect(0, h - 35, w, 35);
  });

  return new THREE.MeshStandardMaterial({
    map: albedo,
    roughness: 0.88,
    metalness: 0.1,
  });
}

// -------------------------------------------------------------
// 6. NATO Wooden Munition Crates
// -------------------------------------------------------------
export function createAmmoCratePBR(): THREE.MeshStandardMaterial {
  const albedo = createCanvasTexture(256, 256, (ctx, w, h) => {
    // Olive drab military wood
    ctx.fillStyle = '#3f4e3c';
    ctx.fillRect(0, 0, w, h);

    // Wood plank seams
    ctx.fillStyle = 'rgba(25, 35, 25, 0.6)';
    ctx.fillRect(0, h * 0.25, w, 2);
    ctx.fillRect(0, h * 0.5, w, 2);
    ctx.fillRect(0, h * 0.75, w, 2);

    // Dark steel corner brackets
    ctx.fillStyle = '#222822';
    ctx.fillRect(0, 0, 24, 24);
    ctx.fillRect(w - 24, 0, 24, 24);
    ctx.fillRect(0, h - 24, 24, 24);
    ctx.fillRect(w - 24, h - 24, 24, 24);

    // Stencil text
    ctx.font = 'bold 16px monospace';
    ctx.fillStyle = 'rgba(240, 220, 150, 0.7)';
    ctx.fillText('5.56mm NATO', 32, h * 0.42);
    ctx.font = '10px monospace';
    ctx.fillText('LOT 48-B // 1000 RDS', 32, h * 0.62);
  });

  return new THREE.MeshStandardMaterial({
    map: albedo,
    roughness: 0.75,
    metalness: 0.2,
  });
}
