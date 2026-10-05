import { readFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

// GLTFLoader expects a browser-ish environment; the assets are static, so a
// tiny file-backed fetch plus image stubs are enough to parse them in Node.
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const publicDir = join(root, 'apps/client/public');
const publicUrl = pathToFileURL(publicDir).href + '/';

globalThis.self = globalThis;
globalThis.ProgressEvent = class {
  constructor(type) {
    this.type = type;
  }
};
globalThis.fetch = async (input) => {
  const url = typeof input === 'string' ? input : input.url;
  const resolved = new URL(url, `file://${publicDir}/`);
  const file = resolved.protocol === 'file:' ? resolved : new URL(publicUrl + resolved.pathname);
  const data = await readFile(file);
  return new Response(data, {
    status: 200,
    headers: { 'Content-Type': 'application/octet-stream' },
  });
};
globalThis.createImageBitmap = async () => ({ width: 64, height: 64, close() {} });

const THREE = await import('three');
const { Props } = await import(pathToFileURL(join(root, 'apps/client/src/world/Props.ts')).href);
const { PROP_KEYS, buildCity } = await import(
  pathToFileURL(join(root, 'apps/client/src/world/City.ts')).href
);
const { OBSTACLES } = await import('@aetheria/shared');

const props = new Props(pathToFileURL(join(publicDir, 'assets/world/medieval/')).href + '/');
const failures = [];
await props.load([...PROP_KEYS]);
console.log('loaded models:', props.count, '/', PROP_KEYS.length);
for (const key of PROP_KEYS) if (!props.has(key)) failures.push(key);

for (const key of PROP_KEYS) {
  const size = props.size(key);
  if (size && (size.x <= 0 || size.y <= 0 || size.z <= 0)) failures.push('degenerate size ' + key);
}

const scene = new THREE.Scene();
const started = Date.now();
const occluders = buildCity(scene, props, { low: true });
console.log('buildCity ms:', Date.now() - started, 'occluders:', occluders.length);

let meshes = 0;
let triangles = 0;
scene.traverse((object) => {
  if (!object.isMesh) return;
  meshes++;
  const geometry = object.geometry;
  const count = geometry.index ? geometry.index.count : (geometry.attributes.position?.count ?? 0);
  triangles += (count / 3) * (object.isInstancedMesh ? object.count : 1);
});
const box = new THREE.Box3().setFromObject(scene);
const size = box.getSize(new THREE.Vector3());
console.log('meshes:', meshes, 'triangles:', Math.round(triangles));
console.log(
  'bbox size:',
  size
    .toArray()
    .map((n) => +n.toFixed(1))
    .join(','),
);

// Ground coverage: disc r=38 plus the two terrain slabs added for the woodland
// ring and the frontier (purple plain x37..187, meadow x-142..38, z +-150).
const covered = (x, z) => {
  if (Math.hypot(x, z) <= 38) return true;
  if (x >= 37 && x <= 187 && Math.abs(z) <= 150) return true;
  if (x >= -142 && x <= 38 && Math.abs(z) <= 150) return true;
  return false;
};
const floating = [];
scene.traverse((object) => {
  if (!object.isMesh || object.isInstancedMesh) return;
  const bounds = new THREE.Box3().setFromObject(object);
  if (!Number.isFinite(bounds.min.x) || bounds.min.y > 1.5) return;
  const points = [
    [bounds.min.x, bounds.min.z],
    [bounds.min.x, bounds.max.z],
    [bounds.max.x, bounds.min.z],
    [bounds.max.x, bounds.max.z],
    [(bounds.min.x + bounds.max.x) / 2, (bounds.min.z + bounds.max.z) / 2],
  ];
  if (points.some(([x, z]) => !covered(x, z))) floating.push(object.name || object.type);
});
scene.traverse((object) => {
  if (!object.isInstancedMesh) return;
  const matrix = new THREE.Matrix4();
  const position = new THREE.Vector3();
  let offMap = 0;
  for (let i = 0; i < object.count; i++) {
    object.getMatrixAt(i, matrix);
    position.setFromMatrixPosition(matrix);
    if (!covered(position.x, position.z)) offMap++;
  }
  if (offMap) floating.push(`instanced ${object.count}x with ${offMap} off-map`);
});
if (floating.length)
  failures.push('props off-map: ' + floating.length + ' -> ' + floating.slice(0, 8).join(', '));
if (size.x > 400 || size.z > 400) failures.push('world bbox too large: ' + size.toArray());

console.log(
  'obstacles:',
  JSON.stringify(OBSTACLES.reduce((a, o) => ((a[o.kind] = (a[o.kind] ?? 0) + 1), a), {})),
);
if (failures.length) {
  console.error('FAILURES: ' + failures.join(' | '));
  process.exit(1);
}
console.log('ALL OK');
