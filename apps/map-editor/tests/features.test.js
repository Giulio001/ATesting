import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  newMap,
  validateMap,
  collisionShapes,
  canStand,
  movePlayer,
  objectCollider,
  objectDepth,
  editableLayer,
  autotileMask,
  renderedTile,
  canonicalTile,
  reviewMap,
  approveMap,
  validateShape,
  clone,
} from '../src/model.js';
const object = (id, x = 120, y = 120) => ({ id, asset: 'tree', x, y, layer: 'objects' });
test('version 1 maps migrate without changing layout or adding autotiling', () => {
  const legacy = JSON.parse(
    readFileSync(new URL('../examples/lumengate-study.json', import.meta.url)),
  );
  assert.equal(legacy.version, 1);
  const migrated = validateMap(legacy);
  assert.equal(migrated.version, 2);
  assert.equal(migrated.layers.length, 7);
  assert.deepEqual(migrated.terrain, legacy.terrain);
  assert.deepEqual(migrated.autotiles, []);
  assert.ok(migrated.objects.every((o) => o.layer === 'objects'));
  assert.equal(migrated.markers.find((m) => m.type === 'portal').destination, '');
});
test('hidden and locked layers prevent editing but retain collision in gameplay', () => {
  const m = newMap(8, 8);
  m.objects.push(object('a'));
  const before = collisionShapes(m);
  m.layers.find((l) => l.id === 'objects').visible = false;
  m.layers.find((l) => l.id === 'terrain').locked = true;
  assert.equal(editableLayer(m, 'objects'), false);
  assert.equal(editableLayer(m, 'terrain'), false);
  assert.deepEqual(collisionShapes(m), before);
  assert.ok(objectDepth(m, { layer: 'details', y: 50 }) < 0);
  assert.ok(objectDepth(m, { layer: 'overhead', y: 10 }) > m.height * m.tileSize);
  assert.equal(objectDepth(m, { layer: 'buildings', y: 50 }), 50);
});
test('instance rectangles, disabled collision and inheritance are independent', () => {
  const m = newMap(8, 8);
  const a = object('a'),
    b = object('b', 180, 120);
  m.objects.push(a, b);
  a.collider = { x: -30, y: -20, width: 60, height: 20 };
  assert.equal(objectCollider(m, a).width, 60);
  assert.equal(objectCollider(m, b).width, 18);
  a.collider = null;
  assert.equal(objectCollider(m, a), null);
  delete a.collider;
  assert.equal(objectCollider(m, a).width, 18);
  const restored = validateMap({ ...m, objects: [{ ...a, collider: null }, b] });
  assert.equal(restored.objects[0].collider, null);
  assert.equal(restored.objects[1].collider, undefined);
});
test('exact polygon collision permits the space outside its triangle, follows movement and survives export', () => {
  const m = newMap(8, 8),
    o = object('poly', 100, 100);
  o.collider = {
    type: 'polygon',
    points: [
      { x: 0, y: 0 },
      { x: 80, y: 0 },
      { x: 0, y: 80 },
    ],
  };
  m.objects.push(o);
  let shapes = collisionShapes(m);
  assert.equal(canStand(m, 110, 110, 5, shapes), false);
  assert.equal(canStand(m, 170, 170, 5, shapes), true);
  o.x += 30;
  shapes = collisionShapes(m);
  assert.equal(shapes[0].points[0].x, 130);
  assert.equal(canStand(m, 110, 110, 5, shapes), true);
  assert.deepEqual(validateMap(m).objects[0].collider, o.collider);
  const p = { x: 30, y: 130 };
  movePlayer(m, p, 180, 0, shapes);
  assert.ok(p.x < 130);
});
test('concave polygon cutout remains passable; malformed and crossing polygons are rejected', () => {
  const shape = {
    type: 'polygon',
    points: [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      { x: 100, y: 100 },
      { x: 70, y: 100 },
      { x: 70, y: 30 },
      { x: 30, y: 30 },
      { x: 30, y: 100 },
      { x: 0, y: 100 },
    ],
  };
  validateShape(shape);
  const m = newMap(8, 8);
  m.objects.push({ ...object('u', 32, 32), collider: shape });
  assert.equal(canStand(m, 82, 100, 5, collisionShapes(m)), true);
  assert.equal(canStand(m, 42, 80, 5, collisionShapes(m)), false);
  for (const points of [
    [
      { x: 0, y: 0 },
      { x: 50, y: 50 },
      { x: 0, y: 50 },
      { x: 50, y: 0 },
    ],
    [
      { x: 0, y: 0 },
      { x: 1, y: 1 },
      { x: 2, y: 2 },
    ],
    [
      { x: 0, y: 0 },
      { x: 0, y: 0 },
      { x: 1, y: 1 },
    ],
  ])
    assert.throws(() => validateShape({ type: 'polygon', points }));
});
test('all 16 cardinal autotile masks resolve and changing neighbors updates the rendered tile', () => {
  for (let mask = 0; mask < 16; mask++) {
    const m = newMap(8, 8),
      x = 3,
      y = 3,
      i = y * m.width + x;
    m.terrain[i] = 'path';
    for (const [dx, dy, bit] of [
      [0, -1, 1],
      [1, 0, 2],
      [0, 1, 4],
      [-1, 0, 8],
    ])
      if (mask & bit) m.terrain[(y + dy) * m.width + x + dx] = 'path';
    assert.equal(autotileMask(m, x, y), mask);
    assert.equal(renderedTile(m, x, y), m.autotiles[0].tiles[mask]);
    assert.equal(canonicalTile(m, m.autotiles[0].tiles[mask]), 'path');
  }
  const m = newMap(8, 8);
  m.terrain[0] = 'water';
  assert.equal(autotileMask(m, 0, 0), 0);
  m.terrain[1] = 'water';
  assert.equal(autotileMask(m, 0, 0), 2);
  m.terrain[1] = 'grass';
  assert.equal(autotileMask(m, 0, 0), 0);
});
test('approval catches blocked spawn, missing destinations/assets and accepts a complete draft', () => {
  assert.ok(reviewMap(null).some((i) => i.code === 'invalid-map'));
  assert.ok(reviewMap({ assets: {}, objects: null }).some((i) => i.code === 'invalid-map'));
  const m = newMap(8, 8);
  assert.ok(reviewMap(m).some((i) => i.code === 'spawn-count'));
  assert.throws(() => approveMap(m));
  m.markers.push(
    { id: 's', type: 'spawn', label: 'Ingresso', x: 48, y: 48 },
    { id: 'p', type: 'portal', label: 'Frontiera', destination: '', x: 100, y: 100 },
  );
  m.collisions[9] = true;
  const issues = reviewMap(m);
  assert.ok(issues.some((i) => i.code === 'blocked-spawn'));
  assert.ok(issues.some((i) => i.code === 'portal-destination'));
  m.collisions[9] = false;
  m.markers[1].destination = 'bleeding_wilds';
  assert.equal(reviewMap(m).length, 0);
  assert.equal(approveMap(m).review.status, 'approved');
  const bad = clone(m);
  bad.objects.push({ ...object('bad'), asset: 'missing' });
  assert.ok(reviewMap(bad).some((i) => i.code === 'missing-asset'));
  assert.throws(() => approveMap(bad));
});
test('catalog provides valid crops, unique real asset IDs and three complete cardinal groups', () => {
  const root = new URL('../public/game-assets/', import.meta.url),
    catalog = JSON.parse(readFileSync(new URL('catalog.json', root)));
  assert.equal(catalog.assets.length, 69);
  assert.equal(new Set(catalog.assets.map((a) => a.id)).size, 69);
  assert.equal(catalog.autotiles.length, 3);
  for (const a of catalog.assets) {
    const file = readFileSync(new URL(a.source, root));
    const w = file.readUInt32BE(16),
      h = file.readUInt32BE(20);
    if (a.crop) {
      const [x, y, cw, ch] = a.crop;
      assert.ok(x >= 0 && y >= 0 && x + cw <= w && y + ch <= h, a.name);
    }
    if (a.collider) validateShape(a.collider);
  }
  assert.ok(
    catalog.autotiles.every(
      (g) =>
        g.tiles.length === 16 && g.tiles.every((id) => catalog.assets.some((a) => a.id === id)),
    ),
  );
});
