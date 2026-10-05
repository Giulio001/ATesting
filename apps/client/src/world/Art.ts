import * as T from 'three';
// Original deterministic painted textures, generated locally without downloads.
export function paintedTexture(kind: 'stone' | 'roof' | 'grass' | 'rift') {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 256;
  const c = canvas.getContext('2d')!;
  let seed = 7251;
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  const color =
    kind === 'stone'
      ? '#7f898b'
      : kind === 'roof'
        ? '#486272'
        : kind === 'grass'
          ? '#415e4b'
          : '#313244';
  c.fillStyle = color;
  c.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 3500; i++) {
    const x = rand() * 256,
      y = rand() * 256;
    c.fillStyle = `rgba(${rand() > 0.5 ? '235,226,199' : '13,25,32'},${rand() * 0.12})`;
    c.fillRect(x, y, rand() * 6 + 1, rand() * 2 + 1);
  }
  if (kind === 'stone')
    for (let row = 0; row < 8; row++)
      for (let col = -1; col < 5; col++) {
        const x = col * 64 + (row % 2) * 32,
          y = row * 32;
        c.strokeStyle = '#1e354a55';
        c.lineWidth = 2;
        c.strokeRect(x + 1, y + 1, 62, 30);
        c.strokeStyle = '#d5d7ba66';
        c.lineWidth = 1;
        c.beginPath();
        c.moveTo(x + 2, y + 29);
        c.lineTo(x + 2, y + 3);
        c.lineTo(x + 60, y + 3);
        c.stroke();
      }
  if (kind === 'roof')
    for (let row = 0; row < 16; row++)
      for (let col = -1; col < 6; col++) {
        const x = col * 48 + (row % 2) * 24,
          y = row * 16;
        c.strokeStyle = '#142d4455';
        c.strokeRect(x, y, 46, 15);
        c.fillStyle = '#aac1c035';
        c.fillRect(x + 2, y + 2, 42, 2);
      }
  if (kind === 'grass')
    for (let i = 0; i < 800; i++) {
      const x = rand() * 256,
        y = rand() * 256;
      c.strokeStyle = rand() > 0.5 ? '#a4ad7233' : '#112b3433';
      c.beginPath();
      c.moveTo(x, y);
      c.lineTo(x + rand() * 5 - 2, y - 3 - rand() * 6);
      c.stroke();
    }
  if (kind === 'rift')
    for (let i = 0; i < 28; i++) {
      let x = 128,
        y = 128;
      const angle = rand() * Math.PI * 2;
      c.strokeStyle = i % 4 === 0 ? '#876dc477' : '#090e22aa';
      c.lineWidth = rand() * 2 + 1;
      c.beginPath();
      c.moveTo(x, y);
      for (let n = 0; n < 8; n++) {
        x += Math.cos(angle) * 12 + rand() * 14 - 7;
        y += Math.sin(angle) * 12 + rand() * 14 - 7;
        c.lineTo(x, y);
      }
      c.stroke();
    }
  const texture = new T.CanvasTexture(canvas);
  texture.colorSpace = T.SRGBColorSpace;
  texture.wrapS = texture.wrapT = T.RepeatWrapping;
  texture.anisotropy = 4;
  return texture;
}
