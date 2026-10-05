import * as T from 'three';

/**
 * Procedural, deterministic PBR-ish textures generated on a canvas: a colour
 * map plus a matching bump map so stone, timber and tiles read as real surfaces
 * instead of flat painted facets. Higher resolution than the first pass (512²)
 * so curved architecture no longer looks like painted cardboard.
 */
export type TextureKind =
  | 'stone'
  | 'roof'
  | 'grass'
  | 'rift'
  | 'plaster'
  | 'wood'
  | 'cobble'
  | 'tiles'
  | 'water'
  | 'marble'
  | 'thatch'
  | 'dirt';

/**
 * Bumped at runtime: the low preset paints 256² instead of 512² so twelve
 * surfaces can be generated on a phone without a long stall.
 */
let SIZE = 512;
const cache = new Map<TextureKind, Pair>();
export function configureTextures(low: boolean) {
  const size = low ? 256 : 512;
  if (size === SIZE) return;
  SIZE = size;
  for (const pair of cache.values()) {
    pair.color.dispose();
    pair.bump.dispose();
  }
  cache.clear();
}
interface Pair {
  color: T.CanvasTexture;
  bump: T.CanvasTexture;
}
function seeded(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}
function canvas() {
  const element = document.createElement('canvas');
  element.width = element.height = SIZE;
  return element;
}
function finish(element: HTMLCanvasElement, srgb: boolean) {
  const texture = new T.CanvasTexture(element);
  texture.wrapS = texture.wrapT = T.RepeatWrapping;
  texture.anisotropy = 4;
  if (srgb) texture.colorSpace = T.SRGBColorSpace;
  return texture;
}
function shade(hex: string, amount: number) {
  const value = parseInt(hex.slice(1), 16),
    r = Math.max(0, Math.min(255, ((value >> 16) & 255) + amount)),
    g = Math.max(0, Math.min(255, ((value >> 8) & 255) + amount)),
    b = Math.max(0, Math.min(255, (value & 255) + amount));
  return `rgb(${r},${g},${b})`;
}

/** Shared base colour and speckle for every surface. */
function base(
  color: CanvasRenderingContext2D,
  bump: CanvasRenderingContext2D,
  hex: string,
  baseHeight: number,
  rand: () => number,
  speckles = 6000,
) {
  color.fillStyle = hex;
  color.fillRect(0, 0, SIZE, SIZE);
  bump.fillStyle = `rgb(${baseHeight},${baseHeight},${baseHeight})`;
  bump.fillRect(0, 0, SIZE, SIZE);
  for (let i = 0; i < speckles; i++) {
    const x = rand() * SIZE,
      y = rand() * SIZE,
      height = baseHeight + Math.round((rand() - 0.5) * 46);
    color.fillStyle = `rgba(${rand() > 0.5 ? '235,226,199' : '18,26,32'},${rand() * 0.1})`;
    color.fillRect(x, y, rand() * 5 + 1, rand() * 2 + 1);
    bump.fillStyle = `rgb(${height},${height},${height})`;
    bump.fillRect(x, y, rand() * 5 + 1, rand() * 2 + 1);
  }
}

function paintStone(
  color: CanvasRenderingContext2D,
  bump: CanvasRenderingContext2D,
  rand: () => number,
) {
  const rows = 8,
    rowHeight = SIZE / rows;
  for (let row = 0; row < rows; row++) {
    const offset = (row % 2) * (rowHeight * 0.75);
    for (let col = -1; col < 5; col++) {
      const x = col * rowHeight * 1.5 + offset,
        y = row * rowHeight,
        w = rowHeight * 1.5 - 4,
        h = rowHeight - 4;
      const tone = Math.round((rand() - 0.5) * 22);
      color.fillStyle = `rgba(${120 + tone},${128 + tone},${130 + tone},0.55)`;
      color.fillRect(x, y, w, h);
      color.strokeStyle = '#1d2b33aa';
      color.lineWidth = 3;
      color.strokeRect(x, y, w, h);
      color.strokeStyle = '#d6d8bb55';
      color.lineWidth = 1.5;
      color.beginPath();
      color.moveTo(x + 2, y + h - 3);
      color.lineTo(x + 2, y + 3);
      color.lineTo(x + w - 3, y + 3);
      color.stroke();
      const height = 150 + Math.round((rand() - 0.5) * 40);
      bump.fillStyle = `rgb(${height},${height},${height})`;
      bump.fillRect(x + 3, y + 3, w - 6, h - 6);
    }
  }
}

function paintPlaster(
  color: CanvasRenderingContext2D,
  bump: CanvasRenderingContext2D,
  rand: () => number,
) {
  for (let i = 0; i < 300; i++) {
    const x = rand() * SIZE,
      y = rand() * SIZE,
      r = 6 + rand() * 40,
      tone = Math.round((rand() - 0.5) * 26);
    const gradient = color.createRadialGradient(x, y, 0, x, y, r);
    gradient.addColorStop(0, `rgba(${226 + tone},${214 + tone},${190 + tone},0.28)`);
    gradient.addColorStop(1, 'rgba(226,214,190,0)');
    color.fillStyle = gradient;
    color.beginPath();
    color.arc(x, y, r, 0, Math.PI * 2);
    color.fill();
    const height = 140 + Math.round((rand() - 0.5) * 26);
    bump.fillStyle = `rgba(${height},${height},${height},0.5)`;
    bump.beginPath();
    bump.arc(x, y, r, 0, Math.PI * 2);
    bump.fill();
  }
  color.strokeStyle = '#8a7c6355';
  color.lineWidth = 1.2;
  for (let i = 0; i < 14; i++) {
    let x = rand() * SIZE,
      y = rand() * SIZE;
    color.beginPath();
    color.moveTo(x, y);
    for (let n = 0; n < 5; n++) {
      x += (rand() - 0.5) * 60;
      y += rand() * 40;
      color.lineTo(x, y);
    }
    color.stroke();
  }
}

function paintWood(
  color: CanvasRenderingContext2D,
  bump: CanvasRenderingContext2D,
  rand: () => number,
) {
  const planks = 6,
    width = SIZE / planks;
  for (let i = 0; i < planks; i++) {
    const x = i * width,
      tone = Math.round((rand() - 0.5) * 26);
    color.fillStyle = `rgb(${104 + tone},${78 + tone},${56 + tone})`;
    color.fillRect(x, 0, width - 3, SIZE);
    bump.fillStyle = `rgb(${150 + Math.round((rand() - 0.5) * 24)},0,0)`;
    const height = 150 + Math.round((rand() - 0.5) * 24);
    bump.fillStyle = `rgb(${height},${height},${height})`;
    bump.fillRect(x, 0, width - 3, SIZE);
    color.strokeStyle = '#3d2c1eaa';
    color.lineWidth = 3;
    color.strokeRect(x, 0, width - 3, SIZE);
    for (let g = 0; g < 26; g++) {
      const gy = rand() * SIZE,
        wobble = (rand() - 0.5) * 14;
      color.strokeStyle = rand() > 0.5 ? '#5b412b88' : '#c69a6b55';
      color.lineWidth = 1;
      color.beginPath();
      color.moveTo(x + 3 + wobble, gy);
      color.lineTo(x + width - 6 + wobble, gy + 3);
      color.stroke();
    }
  }
}

function paintCobble(
  color: CanvasRenderingContext2D,
  bump: CanvasRenderingContext2D,
  rand: () => number,
) {
  color.fillStyle = '#2c2f31';
  color.fillRect(0, 0, SIZE, SIZE);
  bump.fillStyle = '#2a2a2a';
  bump.fillRect(0, 0, SIZE, SIZE);
  for (let i = 0; i < 180; i++) {
    const x = rand() * SIZE,
      y = rand() * SIZE,
      rx = 12 + rand() * 16,
      ry = 10 + rand() * 14,
      angle = rand() * Math.PI,
      tone = Math.round((rand() - 0.5) * 40);
    color.save();
    color.translate(x, y);
    color.rotate(angle);
    const gradient = color.createRadialGradient(0, 0, 0, 0, 0, Math.max(rx, ry));
    gradient.addColorStop(0, `rgb(${150 + tone},${150 + tone},${144 + tone})`);
    gradient.addColorStop(1, `rgb(${92 + tone},${94 + tone},${92 + tone})`);
    color.fillStyle = gradient;
    color.beginPath();
    color.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
    color.fill();
    color.restore();
    bump.save();
    bump.translate(x, y);
    bump.rotate(angle);
    const heightGradient = bump.createRadialGradient(0, 0, 0, 0, 0, Math.max(rx, ry));
    heightGradient.addColorStop(0, '#f2f2f2');
    heightGradient.addColorStop(0.7, '#b4b4b4');
    heightGradient.addColorStop(1, '#3a3a3a');
    bump.fillStyle = heightGradient;
    bump.beginPath();
    bump.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
    bump.fill();
    bump.restore();
  }
}

function paintTiles(
  color: CanvasRenderingContext2D,
  bump: CanvasRenderingContext2D,
  rand: () => number,
) {
  const rows = 12,
    tileW = SIZE / 9,
    tileH = SIZE / rows;
  for (let row = 0; row < rows; row++) {
    const offset = (row % 2) * (tileW / 2);
    for (let col = -1; col < 10; col++) {
      const x = col * tileW + offset,
        y = row * tileH,
        tone = Math.round((rand() - 0.5) * 26);
      color.save();
      color.beginPath();
      color.moveTo(x, y);
      color.quadraticCurveTo(x + tileW / 2, y - tileH * 0.55, x + tileW, y);
      color.quadraticCurveTo(x + tileW / 2, y + tileH * 0.75, x, y);
      color.closePath();
      const gradient = color.createLinearGradient(x, y, x, y + tileH);
      gradient.addColorStop(0, `rgb(${96 + tone},${74 + tone},${64 + tone})`);
      gradient.addColorStop(1, `rgb(${52 + tone},${38 + tone},${34 + tone})`);
      color.fillStyle = gradient;
      color.fill();
      color.strokeStyle = '#21161388';
      color.lineWidth = 2;
      color.stroke();
      color.restore();
      bump.save();
      bump.beginPath();
      bump.moveTo(x, y);
      bump.quadraticCurveTo(x + tileW / 2, y - tileH * 0.55, x + tileW, y);
      bump.quadraticCurveTo(x + tileW / 2, y + tileH * 0.75, x, y);
      bump.closePath();
      const heightGradient = bump.createLinearGradient(x, y - tileH * 0.4, x, y + tileH * 0.6);
      heightGradient.addColorStop(0, '#f4f4f4');
      heightGradient.addColorStop(1, '#4a4a4a');
      bump.fillStyle = heightGradient;
      bump.fill();
      bump.strokeStyle = '#1c1c1c';
      bump.lineWidth = 2;
      bump.stroke();
      bump.restore();
    }
  }
}

function paintMarble(
  color: CanvasRenderingContext2D,
  bump: CanvasRenderingContext2D,
  rand: () => number,
) {
  for (let i = 0; i < 22; i++) {
    let x = rand() * SIZE,
      y = rand() * SIZE;
    color.strokeStyle = rand() > 0.5 ? '#b9b2a299' : '#8f8a7e88';
    color.lineWidth = 1 + rand() * 3;
    const points: [number, number][] = [[x, y]];
    for (let n = 0; n < 7; n++) {
      x += (rand() - 0.5) * 90;
      y += (rand() - 0.5) * 90;
      points.push([x, y]);
    }
    color.beginPath();
    color.moveTo(points[0][0], points[0][1]);
    for (const [px, py] of points.slice(1)) color.lineTo(px, py);
    color.stroke();
    // The same vein, carved into the height map.
    const height = 150 + Math.round((rand() - 0.5) * 16);
    bump.strokeStyle = `rgb(${height},${height},${height})`;
    bump.lineWidth = 2;
    bump.beginPath();
    bump.moveTo(points[0][0], points[0][1]);
    for (const [px, py] of points.slice(1)) bump.lineTo(px, py);
    bump.stroke();
  }
}

function paintThatch(
  color: CanvasRenderingContext2D,
  bump: CanvasRenderingContext2D,
  rand: () => number,
) {
  for (let i = 0; i < 2600; i++) {
    const x = rand() * SIZE,
      y = rand() * SIZE,
      length = 12 + rand() * 26,
      tone = Math.round((rand() - 0.5) * 40);
    color.strokeStyle = `rgb(${176 + tone},${146 + tone},${92 + tone})`;
    color.lineWidth = 1.4;
    color.beginPath();
    color.moveTo(x, y);
    color.lineTo(x + (rand() - 0.5) * 8, y - length);
    color.stroke();
    const height = 120 + Math.round(rand() * 90);
    bump.strokeStyle = `rgb(${height},${height},${height})`;
    bump.lineWidth = 1.4;
    bump.beginPath();
    bump.moveTo(x, y);
    bump.lineTo(x + (rand() - 0.5) * 8, y - length);
    bump.stroke();
  }
}

function paintWater(
  color: CanvasRenderingContext2D,
  bump: CanvasRenderingContext2D,
  rand: () => number,
) {
  for (let i = 0; i < 90; i++) {
    const radius = 20 + rand() * 90,
      x = rand() * SIZE,
      y = rand() * SIZE;
    color.strokeStyle = rand() > 0.5 ? '#8fd8de44' : '#1d556055';
    color.lineWidth = 2 + rand() * 4;
    color.beginPath();
    color.arc(x, y, radius, 0, Math.PI * 1.6);
    color.stroke();
    const height = 128 + Math.round((rand() - 0.5) * 60);
    bump.strokeStyle = `rgb(${height},${height},${height})`;
    bump.lineWidth = 3;
    bump.beginPath();
    bump.arc(x, y, radius, 0, Math.PI * 1.6);
    bump.stroke();
  }
}

function paintDirt(
  color: CanvasRenderingContext2D,
  bump: CanvasRenderingContext2D,
  rand: () => number,
) {
  for (let i = 0; i < 900; i++) {
    const x = rand() * SIZE,
      y = rand() * SIZE,
      r = 3 + rand() * 16,
      tone = Math.round((rand() - 0.5) * 30);
    color.fillStyle = `rgba(${96 + tone},${78 + tone},${58 + tone},0.5)`;
    color.beginPath();
    color.arc(x, y, r, 0, Math.PI * 2);
    color.fill();
    const height = 132 + Math.round((rand() - 0.5) * 30);
    bump.fillStyle = `rgba(${height},${height},${height},0.5)`;
    bump.beginPath();
    bump.arc(x, y, r, 0, Math.PI * 2);
    bump.fill();
  }
}

const SEEDS: Record<TextureKind, number> = {
  stone: 7251,
  roof: 9173,
  grass: 3311,
  rift: 5501,
  plaster: 1123,
  wood: 4421,
  cobble: 2711,
  tiles: 8837,
  water: 6421,
  marble: 9973,
  thatch: 3391,
  dirt: 7789,
};

function render(kind: TextureKind) {
  const cached = cache.get(kind);
  if (cached) return cached;
  const colorElement = canvas(),
    bumpElement = canvas(),
    color = colorElement.getContext('2d')!,
    bump = bumpElement.getContext('2d')!,
    rand = seeded(SEEDS[kind]);
  switch (kind) {
    case 'stone':
      base(color, bump, '#828b8d', 150, rand);
      paintStone(color, bump, rand);
      break;
    case 'roof':
      base(color, bump, '#4a616f', 150, rand);
      paintStone(color, bump, rand);
      break;
    case 'plaster':
      base(color, bump, '#d9cdb2', 140, rand, 4200);
      paintPlaster(color, bump, rand);
      break;
    case 'wood':
      base(color, bump, '#6b4f36', 150, rand, 2400);
      paintWood(color, bump, rand);
      break;
    case 'cobble':
      base(color, bump, '#3a3d3e', 40, rand, 1800);
      paintCobble(color, bump, rand);
      break;
    case 'tiles':
      base(color, bump, '#6a4a3c', 150, rand, 900);
      paintTiles(color, bump, rand);
      break;
    case 'marble':
      base(color, bump, '#cec7b6', 150, rand, 2600);
      paintMarble(color, bump, rand);
      break;
    case 'thatch':
      base(color, bump, '#a98a52', 130, rand, 1200);
      paintThatch(color, bump, rand);
      break;
    case 'water':
      base(color, bump, '#2f6f78', 128, rand, 900);
      paintWater(color, bump, rand);
      break;
    case 'dirt':
      base(color, bump, '#6b573f', 132, rand, 3200);
      paintDirt(color, bump, rand);
      break;
    case 'grass':
      base(color, bump, '#41604b', 140, rand, 3400);
      for (let i = 0; i < 1600; i++) {
        const x = rand() * SIZE,
          y = rand() * SIZE;
        color.strokeStyle = rand() > 0.5 ? '#a4ad7233' : '#112b3433';
        color.beginPath();
        color.moveTo(x, y);
        color.lineTo(x + rand() * 6 - 3, y - 5 - rand() * 10);
        color.stroke();
        const height = 130 + Math.round(rand() * 60);
        bump.strokeStyle = `rgb(${height},${height},${height})`;
        bump.beginPath();
        bump.moveTo(x, y);
        bump.lineTo(x + rand() * 6 - 3, y - 5 - rand() * 10);
        bump.stroke();
      }
      break;
    case 'rift':
      base(color, bump, '#313244', 140, rand, 2000);
      for (let i = 0; i < 34; i++) {
        let x = SIZE / 2,
          y = SIZE / 2;
        const angle = rand() * Math.PI * 2;
        color.strokeStyle = i % 4 === 0 ? '#8f74cc88' : '#090e22cc';
        color.lineWidth = rand() * 3 + 1;
        bump.strokeStyle = '#0d0d0d';
        bump.lineWidth = color.lineWidth;
        color.beginPath();
        bump.beginPath();
        color.moveTo(x, y);
        bump.moveTo(x, y);
        for (let n = 0; n < 8; n++) {
          x += Math.cos(angle) * 24 + rand() * 26 - 13;
          y += Math.sin(angle) * 24 + rand() * 26 - 13;
          color.lineTo(x, y);
          bump.lineTo(x, y);
        }
        color.stroke();
        bump.stroke();
      }
      break;
  }
  const pair: Pair = {
    color: finish(colorElement, true),
    bump: finish(bumpElement, false),
  };
  cache.set(kind, pair);
  return pair;
}

/** Albedo map for a surface kind. */
export function paintedTexture(kind: TextureKind) {
  return render(kind).color;
}
/** Matching bump map, so the same surface catches the light. */
export function paintedBump(kind: TextureKind) {
  return render(kind).bump;
}
/** A clone with its own repeat, sharing the generated canvas. */
export function tiled(kind: TextureKind, x = 1, y = 1) {
  const texture = paintedTexture(kind).clone();
  texture.needsUpdate = true;
  texture.repeat.set(x, y);
  return texture;
}
export function tiledBump(kind: TextureKind, x = 1, y = 1) {
  const texture = paintedBump(kind).clone();
  texture.needsUpdate = true;
  texture.repeat.set(x, y);
  return texture;
}
