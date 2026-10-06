import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  newMap,
  validateMap,
  paint,
  rectangle,
  floodFill,
  resizeMap,
  collisionRectangles,
  canStand,
  findSpawn,
  movePlayer,
  History,
} from '../src/model.js';
test('JSON round trip preserves terrain, PNG references, objects and gameplay', () => {
  const map = newMap(8, 8);
  map.objects.push({ id: 'tree-1', asset: 'tree', x: 100, y: 150, layer: 'objects' });
  map.markers.push({ id: 'spawn-1', type: 'spawn', label: 'Entrata', x: 16, y: 16 });
  const restored = validateMap(JSON.parse(JSON.stringify(map)));
  assert.deepEqual(restored.terrain, map.terrain);
  assert.deepEqual(restored.objects, map.objects);
  assert.deepEqual(restored.markers, map.markers);
  assert.deepEqual(validateMap(restored), restored);
});
test('reject corrupt grids, unsafe PNG sources, broken references and invalid colliders', () => {
  for (const mutate of [
    (m) => m.terrain.pop(),
    (m) => m.objects.push({ id: 'x', asset: 'missing', x: 10, y: 10 }),
    (m) => (m.assets[4].collider.width = -1),
    (m) => (m.assets[0].builtin = 'unknown'),
    (m) => {
      delete m.assets[0].builtin;
      m.assets[0].image = 'javascript:alert(1)';
    },
    (m) => (m.collisions[0] = 1),
    (m) => (m.width = 999),
  ]) {
    const map = newMap(8, 8);
    mutate(map);
    assert.throws(() => validateMap(map));
  }
});
test('brush clips edges; rectangle and fill respect connected regions', () => {
  const m = newMap(8, 8);
  paint(m, 'terrain', 7, 7, 5, 'stone');
  assert.equal(m.terrain.filter((a) => a === 'stone').length, 1);
  rectangle(m, 'terrain', { x: 3, y: 0 }, { x: 3, y: 7 }, 'water');
  floodFill(m, 'terrain', 0, 'path');
  assert.equal(m.terrain[2], 'path');
  assert.equal(m.terrain[3], 'water');
  assert.equal(m.terrain[4], 'grass');
  floodFill(m, 'collisions', 0, true);
  assert.equal(m.collisions.filter(Boolean).length, 64);
});
test('resize preserves row layout and scales gameplay positions with tile size', () => {
  const m = newMap(10, 10);
  m.terrain[11] = 'stone';
  m.collisions[11] = true;
  m.markers.push(
    { id: 'a', type: 'npc', label: 'NPC', x: 48, y: 48 },
    { id: 'b', type: 'boss', label: 'Boss', x: 300, y: 300 },
  );
  const r = resizeMap(m, 8, 8, 64);
  assert.equal(r.terrain[9], 'stone');
  assert.equal(r.collisions[9], true);
  assert.deepEqual(
    r.markers.map((m) => m.x),
    [96],
  );
  validateMap(r);
});
test('solid terrain, painted collision and trunk share server-compatible rectangles', () => {
  const m = newMap(8, 8);
  m.terrain[0] = 'water';
  m.collisions[1] = true;
  m.objects.push({ id: 'a', asset: 'tree', x: 100, y: 150 });
  const rects = collisionRectangles(m);
  assert.deepEqual(rects[0], { x: 0, y: 0, width: 64, height: 32 });
  assert.equal(canStand(m, 100, 145, 9, rects), false);
  assert.equal(canStand(m, 100, 90, 9, rects), true);
  assert.equal(canStand(m, 4, 60, 9, rects), false);
});
test('movement cannot tunnel through a thin object and diagonal displacement stays blocked', () => {
  const m = newMap(8, 8);
  m.assets.find((a) => a.id === 'pillar').collider = { x: 0, y: 0, width: 2, height: 200 };
  m.objects.push({ id: 'wall', asset: 'pillar', x: 100, y: 32 });
  const p = { x: 32, y: 64 };
  movePlayer(m, p, 150, 0, collisionRectangles(m));
  assert.ok(p.x <= 91);
  assert.equal(p.y, 64);
});
test('blocked spawn falls back to free ground; fully blocked map cannot start', () => {
  const m = newMap(8, 8);
  m.markers.push({ id: 's', type: 'spawn', label: '', x: 16, y: 16 });
  m.collisions[0] = true;
  assert.deepEqual(findSpawn(m), { x: 48, y: 16 });
  m.collisions.fill(true);
  assert.equal(findSpawn(m), null);
});
test('history restores strokes, clears redo after a new edit and remains bounded', () => {
  const h = new History(2);
  let m = newMap(8, 8);
  h.push(m);
  m.terrain[0] = 'stone';
  h.push(m);
  m.terrain[0] = 'water';
  m = h.undo(m);
  assert.equal(m.terrain[0], 'stone');
  m = h.redo(m);
  assert.equal(m.terrain[0], 'water');
  m = h.undo(m);
  h.push(m);
  assert.equal(h.redoStack.length, 0);
  h.push(m);
  h.push(m);
  assert.equal(h.undoStack.length, 2);
});
