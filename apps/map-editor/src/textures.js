// Small hand-authored placeholders; replace them with the game's PNG assets.
export function builtinCanvas(id, variant) {
  const size = id === 'tree' ? [80, 112] : id === 'pillar' ? [32, 64] : [32, 32];
  const c = document.createElement('canvas');
  [c.width, c.height] = size;
  const g = c.getContext('2d');
  g.imageSmoothingEnabled = false;
  const rect = (x, y, w, h, color) => {
    g.fillStyle = color;
    g.fillRect(x, y, w, h);
  };
  if (id === 'grass') {
    rect(0, 0, 32, 32, '#3d6545');
    for (const [x, y] of [
      [3, 8],
      [20, 4],
      [12, 23],
      [25, 20],
    ]) {
      rect(x, y, 2, 4, '#507956');
      rect(x + 2, y + 2, 2, 2, '#2e5439');
    }
  }
  if (id === 'stone') {
    rect(0, 0, 32, 32, '#6d7772');
    rect(1, 1, 14, 14, '#89918a');
    rect(17, 1, 14, 14, '#7d8780');
    rect(1, 17, 30, 14, '#7d8580');
    rect(3, 3, 10, 1, '#a4aba3');
  }
  if (id === 'path') {
    rect(0, 0, 32, 32, '#99815c');
    rect(4, 6, 4, 2, '#ad9670');
    rect(23, 20, 3, 2, '#776844');
    rect(12, 27, 5, 1, '#b6a078');
  }
  if (id === 'water') {
    rect(0, 0, 32, 32, '#365f76');
    rect(3, 8, 15, 2, '#4d8192');
    rect(16, 23, 13, 2, '#4d8192');
  }
  if (id === 'tree') {
    rect(33, 62, 14, 50, '#493c30');
    rect(39, 62, 5, 48, '#78603e');
    rect(30, 105, 21, 7, '#493c30');
    rect(12, 27, 56, 43, '#223e30');
    rect(6, 35, 68, 28, '#223e30');
    rect(17, 12, 47, 51, '#315b3a');
    rect(25, 4, 29, 46, '#3f7044');
    rect(17, 24, 17, 22, '#4f8150');
  }
  if (id === 'pillar') {
    rect(3, 54, 26, 10, '#414b49');
    rect(7, 10, 18, 45, '#8c9992');
    rect(9, 10, 4, 43, '#b0bab1');
    rect(22, 10, 3, 44, '#5e6f67');
    rect(3, 4, 26, 10, '#a6afa4');
    rect(5, 1, 22, 4, '#c0c4af');
  }
  if (id === 'crate') {
    rect(0, 0, 32, 32, '#493c2c');
    rect(2, 2, 28, 28, '#967347');
    rect(5, 5, 22, 22, '#685333');
    rect(7, 6, 2, 20, '#a88756');
    rect(15, 6, 2, 20, '#a88756');
    rect(23, 6, 2, 20, '#a88756');
    rect(3, 14, 26, 4, '#ab8653');
  }
  if (variant !== undefined && id === 'path') {
    rect(0, 0, 32, 32, '#3d6545');
    rect(8, 8, 16, 16, '#99815c');
    if (variant & 1) rect(8, 0, 16, 16, '#99815c');
    if (variant & 2) rect(16, 8, 16, 16, '#99815c');
    if (variant & 4) rect(8, 16, 16, 16, '#99815c');
    if (variant & 8) rect(0, 8, 16, 16, '#99815c');
    rect(12, 12, 3, 2, '#ad9670');
    rect(20, 20, 2, 1, '#776844');
  }
  if (variant !== undefined && id === 'water') {
    if (!(variant & 1)) {
      rect(0, 0, 32, 3, '#3d6545');
      rect(3, 3, 26, 2, '#5fb0c2');
    }
    if (!(variant & 2)) {
      rect(29, 0, 3, 32, '#3d6545');
      rect(27, 3, 2, 26, '#5fb0c2');
    }
    if (!(variant & 4)) {
      rect(0, 29, 32, 3, '#3d6545');
      rect(3, 27, 26, 2, '#5fb0c2');
    }
    if (!(variant & 8)) {
      rect(0, 0, 3, 32, '#3d6545');
      rect(3, 3, 2, 26, '#5fb0c2');
    }
  }
  return c;
}
const keys = new WeakMap();
export function textureKey(a) {
  if (keys.has(a)) return keys.get(a);
  const source = a.builtin ? `${a.builtin}:${a.variant ?? 'plain'}` : a.image;
  let hash = 2166136261;
  for (let i = 0; i < source.length; i++) hash = Math.imul(hash ^ source.charCodeAt(i), 16777619);
  const key = `map-asset-${a.id}-${source.length}-${hash >>> 0}`;
  keys.set(a, key);
  return key;
}
export async function prepareTextures(scene, assets) {
  await Promise.all(
    assets.map(async (a) => {
      const key = textureKey(a);
      if (scene.textures.exists(key)) return;
      if (a.builtin) scene.textures.addCanvas(key, builtinCanvas(a.builtin, a.variant));
      else {
        const img = new Image();
        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = () => reject(new Error(`PNG illeggibile: ${a.name}`));
          img.src = a.image;
        });
        if (img.width > 8192 || img.height > 8192) throw new Error('PNG troppo grande.');
        scene.textures.addImage(key, img);
      }
    }),
  );
}
