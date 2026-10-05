import { pathToFileURL } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// The procedural textures are canvas-only, so provide a tiny deterministic 2D
// context stub: enough for Art.ts to paint and for CanvasTexture to wrap it.
const gradient = () => ({ addColorStop() {} });
const context = new Proxy(
  {},
  {
    get(target, property) {
      if (property in target) return target[property];
      if (
        property === 'createLinearGradient' ||
        property === 'createRadialGradient' ||
        property === 'createConicGradient' ||
        property === 'createPattern'
      )
        return () => (property === 'createPattern' ? {} : gradient());
      return () => {};
    },
    set(target, property, value) {
      target[property] = value;
      return true;
    },
  },
);
globalThis.document = {
  createElement: () => ({ width: 0, height: 0, getContext: () => context }),
};

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const THREE = await import('three');
const { buildTown } = await import(
  pathToFileURL(join(root, 'apps/client/src/world/Architecture.ts')).href
);
const { paintedTexture, configureTextures } = await import(
  pathToFileURL(join(root, 'apps/client/src/world/Art.ts')).href
);
const { OBSTACLES } = await import('@aetheria/shared');

const houses = OBSTACLES.filter((o) => o.kind === 'house').length;
const failures = [];

// The low preset must paint smaller canvases, or phones stall on the textures.
configureTextures(false);
if (paintedTexture('stone').image.width !== 512)
  failures.push('high preset is not 512px: ' + paintedTexture('stone').image.width);
configureTextures(true);
if (paintedTexture('stone').image.width !== 256)
  failures.push('low preset is not 256px: ' + paintedTexture('stone').image.width);

function inspect(low) {
  const scene = new THREE.Scene();
  const occluders = [];
  const started = Date.now();
  const materials = buildTown(scene, occluders, low);
  const buildMs = Date.now() - started;
  let meshes = 0;
  let triangles = 0;
  let curved = 0;
  let flatShaded = 0;
  let bumpy = 0;
  const materialSet = new Set();
  scene.traverse((object) => {
    if (!object.isMesh) return;
    meshes++;
    const geometry = object.geometry;
    const type = geometry.type ?? '';
    if (/Cylinder|Cone|Torus|Sphere|Lathe|Extrude|Circle/.test(type)) curved++;
    const arrays = Array.isArray(object.material) ? object.material : [object.material];
    for (const material of arrays) {
      materialSet.add(material);
      if (material.flatShading) flatShaded++;
      if (material.bumpMap) bumpy++;
      const position = geometry.attributes.position;
      if (position) {
        for (let i = 0; i < position.array.length; i++)
          if (!Number.isFinite(position.array[i])) {
            failures.push('non-finite vertex in ' + type);
            break;
          }
      }
      const count = geometry.index ? geometry.index.count : (position?.count ?? 0);
      triangles += (count / 3) * (object.isInstancedMesh ? object.count : 1);
    }
  });
  const box = new THREE.Box3().setFromObject(scene);
  const size = box.getSize(new THREE.Vector3());
  console.log(
    `[${low ? 'low ' : 'high'}] ${buildMs}ms meshes:${meshes} triangles:${Math.round(
      triangles,
    )} curved:${curved} materials:${materialSet.size} bumpy:${bumpy} flat:${flatShaded} occluders:${
      occluders.length
    } bbox:${size
      .toArray()
      .map((n) => +n.toFixed(1))
      .join(',')}`,
  );
  return { scene, materials, occluders, meshes, triangles, curved, flatShaded, bumpy, size };
}

const low = inspect(true);
const high = inspect(false);

if (low.meshes < 200) failures.push(`too few meshes: ${low.meshes}`);
if (low.triangles < 45000) failures.push(`too few triangles: ${Math.round(low.triangles)}`);
if (high.triangles <= low.triangles) failures.push('high quality does not add detail');
if (low.curved < 80) failures.push(`not enough curved primitives: ${low.curved}`);
if (low.flatShaded > 0) failures.push(`flat-shaded materials left: ${low.flatShaded}`);
if (low.bumpy < 10) failures.push(`materials without bump maps: ${low.bumpy}`);
if (low.occluders.length !== houses)
  failures.push(`occluders ${low.occluders.length} != houses ${houses}`);
if (low.materials.stone.bumpMap === undefined) failures.push('stone has no bump map');

// The town must enclose the playable plaza and the four OBSTACLES houses.
if (low.size.x < 40 || low.size.z < 40) failures.push('town footprint too small');
for (const house of OBSTACLES.filter((o) => o.kind === 'house')) {
  if (Math.abs(house.x) > low.size.x / 2 + 1 || Math.abs(house.z) > low.size.z / 2 + 1)
    failures.push(`house outside bounds: ${house.x},${house.z}`);
}

if (failures.length) {
  console.error('FAILURES:');
  for (const failure of failures) console.error(' -', failure);
  process.exit(1);
}
console.log('ALL OK');
