import * as T from 'three';

/**
 * The CC0 villager GLBs carry no image maps, only flat per-material colours.
 * Painting a cloth weave and a wear pattern per tint gives every resident a real
 * texture again: the map multiplies the model's own colour, so skin, hair and
 * clothes keep their palette while reading as fabric instead of plastic.
 */
const CLOTH_SIZE = 192;
const cache = new Map<number, T.CanvasTexture>();

function seeded(seed: number) {
  let state = seed >>> 0 || 1;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

export function residentCloth(tint: number) {
  const cached = cache.get(tint);
  if (cached) return cached;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = CLOTH_SIZE;
  const c = canvas.getContext('2d')!;
  const rand = seeded(tint);
  // Neutral cloth base, very slightly pulled toward the resident's tint.
  const tintColor = new T.Color(tint);
  const baseR = Math.round(226 + tintColor.r * 16);
  const baseG = Math.round(220 + tintColor.g * 16);
  const baseB = Math.round(210 + tintColor.b * 16);
  c.fillStyle = `rgb(${baseR},${baseG},${baseB})`;
  c.fillRect(0, 0, CLOTH_SIZE, CLOTH_SIZE);
  // Twill weave: two thin crossing thread families.
  for (let i = 0; i < CLOTH_SIZE; i += 3) {
    c.fillStyle = i % 6 === 0 ? 'rgba(255,255,255,0.30)' : 'rgba(120,110,96,0.14)';
    c.fillRect(0, i, CLOTH_SIZE, 1);
    c.fillStyle = i % 9 === 0 ? 'rgba(255,255,255,0.22)' : 'rgba(120,110,96,0.10)';
    c.fillRect(i, 0, 1, CLOTH_SIZE);
  }
  // Slubs, dirt and a couple of patches so the surface is not uniform.
  for (let i = 0; i < 4200; i++) {
    const x = rand() * CLOTH_SIZE,
      y = rand() * CLOTH_SIZE;
    const dark = rand() > 0.42;
    c.fillStyle = dark ? `rgba(70,62,52,${rand() * 0.16})` : `rgba(255,255,255,${rand() * 0.22})`;
    c.fillRect(x, y, 1 + rand() * 3, 1 + rand() * 2);
  }
  for (let i = 0; i < 12; i++) {
    const x = rand() * CLOTH_SIZE,
      y = rand() * CLOTH_SIZE,
      radius = 3 + rand() * 7;
    const stain = c.createRadialGradient(x, y, 0, x, y, radius);
    stain.addColorStop(0, `rgba(88,72,54,${0.05 + rand() * 0.08})`);
    stain.addColorStop(1, 'rgba(88,72,54,0)');
    c.fillStyle = stain;
    c.beginPath();
    c.arc(x, y, radius, 0, Math.PI * 2);
    c.fill();
  }
  const texture = new T.CanvasTexture(canvas);
  texture.colorSpace = T.SRGBColorSpace;
  texture.wrapS = texture.wrapT = T.RepeatWrapping;
  texture.repeat.set(2, 2);
  texture.anisotropy = 2;
  cache.set(tint, texture);
  return texture;
}

export function disposeTownsfolkTextures() {
  for (const texture of cache.values()) texture.dispose();
  cache.clear();
}
