import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { createServer } from 'node:http';
import { catalogMiddleware } from '../catalog-server.js';
import {
  filterCatalog,
  frameCount,
  frameCrop,
  checkedCrop,
  croppedAsset,
} from '../src/catalog-model.js';
import { newMap, validateMap } from '../src/model.js';
const catalog = JSON.parse(
  await readFile(new URL('../public/full-catalog/catalog.json', import.meta.url), 'utf8'),
);
const metadata = JSON.parse(
  await readFile(new URL('../public/full-catalog/metadata.json', import.meta.url), 'utf8'),
);
test('complete runtime catalogue has unique IDs and all embedded originals match source SHA', () => {
  assert.equal(catalog.entries.length, 3437);
  assert.equal(new Set(catalog.entries.map((e) => e.id)).size, 3437);
  assert.equal(catalog.entries.filter((e) => e.media === 'image').length, 3355);
  assert.equal(catalog.entries.filter((e) => e.media === 'audio').length, 39);
  assert.equal(Object.keys(metadata).length, 45);
  for (const [path, text] of Object.entries(metadata)) {
    const b = Buffer.from(text);
    assert.equal(
      createHash('sha1').update(`blob ${b.length}\0`).update(b).digest('hex'),
      catalog.entries.find((e) => e.path === path).sha,
      path,
    );
  }
});
test('search includes paths and atlas frame names; crop rejects out-of-bounds rectangles', () => {
  const e = {
    id: 'game-example',
    name: 'Example',
    path: 'objects/tree.png',
    category: 'Natura',
    kind: 'object',
    width: 96,
    height: 64,
    frameWidth: 32,
    frameHeight: 32,
  };
  assert.equal(frameCount(e), 6);
  assert.deepEqual(frameCrop(e, 4), [32, 32, 32, 32]);
  assert.throws(() => frameCrop(e, 6));
  assert.throws(() => checkedCrop(e, [95, 0, 32, 32]));
  assert.throws(() => checkedCrop(e, [0, 0, 1.5, 32]));
  assert.equal(filterCatalog([e], 'Natura', 'TREE').length, 1);
  assert.equal(filterCatalog([e], 'Audio', '').length, 0);
  const atlas = { ...e, frames: [{ name: 'Fontana', crop: [0, 0, 32, 64], origin: [0.5, 0.75] }] };
  assert.equal(filterCatalog([atlas], '', 'fontana').length, 1);
  assert.equal(frameCount(atlas), 1);
  assert.deepEqual(frameCrop(atlas), [0, 0, 32, 64]);
});
test('imported PNG keeps atlas origin and source provenance across JSON export', () => {
  const e = {
    id: 'game-example',
    name: 'Fontana',
    path: 'objects/fountain.png',
    category: 'Arredi',
    kind: 'object',
    width: 32,
    height: 64,
    frames: [{ name: 'front', crop: [0, 0, 32, 64], origin: [0.5, 0.75] }],
  };
  const map = newMap(8, 8);
  const a = croppedAsset(e, frameCrop(e), 'data:image/png;base64,iVBORw0KGgo=');
  map.assets.push(a);
  const restored = validateMap(JSON.parse(JSON.stringify(map))).assets.find((x) => x.id === a.id);
  assert.equal(restored.sourcePath, e.path);
  assert.equal(restored.category, e.category);
  assert.equal(restored.originY, 0.75);
  assert.equal(restored.image, a.image);
  assert.throws(() => croppedAsset(e, frameCrop(e), a.image, 'audio'));
});
test('catalogue endpoint serves embedded source bytes and rejects unknown paths and writes', async () => {
  const middleware = catalogMiddleware();
  const server = createServer((req, res) =>
    middleware(req, res, () => {
      res.statusCode = 404;
      res.end();
    }),
  );
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  try {
    const root = `http://127.0.0.1:${server.address().port}/__aetheria_asset/`;
    const path = Object.keys(metadata)[0];
    const response = await fetch(root + path);
    assert.equal(response.status, 200);
    assert.equal(await response.text(), metadata[path]);
    assert.equal((await fetch(root + 'not-an-asset.png')).status, 404);
    assert.equal((await fetch(root + path, { method: 'POST' })).status, 405);
    const head = await fetch(root + path, { method: 'HEAD' });
    assert.equal(head.status, 200);
    assert.equal(await head.text(), '');
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
