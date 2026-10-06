import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  newMap,
  groupPositions,
  alignedPositions,
  analyzeReachability,
  reviewMap,
  approveMap,
  canTraverse,
  collisionShapes,
} from '../src/model.js';
test('group movement clamps the whole group while preserving relative spacing', () => {
  const map = newMap(8, 8),
    items = [
      { id: 'a', x: 20, y: 30 },
      { id: 'b', x: 80, y: 100 },
    ];
  const moved = groupPositions(map, items, 500, -500);
  assert.deepEqual(moved, [
    { id: 'a', x: 195, y: 0 },
    { id: 'b', x: 255, y: 70 },
  ]);
  assert.equal(moved[1].x - moved[0].x, 60);
  assert.equal(moved[1].y - moved[0].y, 70);
  assert.deepEqual(items, [
    { id: 'a', x: 20, y: 30 },
    { id: 'b', x: 80, y: 100 },
  ]);
  assert.equal(groupPositions(map, items, 22, 0, 32)[0].x, 52);
});
test('alignment and distribution use anchors and keep input data unchanged', () => {
  const items = [
    { id: 'a', x: 20, y: 30 },
    { id: 'b', x: 100, y: 80 },
    { id: 'c', x: 60, y: 90 },
  ];
  assert.ok(alignedPositions(items, 'centerY').every((i) => i.y === 60));
  assert.ok(alignedPositions(items, 'left').every((i) => i.x === 20));
  assert.deepEqual(
    alignedPositions(items, 'distributeY').map((i) => i.y),
    [30, 60, 90],
  );
  assert.throws(() => alignedPositions(items.slice(0, 2), 'distributeX'));
  assert.equal(items[1].y, 80);
});
test('reachability finds a separated portal and clears the warning when a passage opens', () => {
  const m = newMap(8, 8);
  m.markers = [
    { id: 's', type: 'spawn', label: 'Ingresso', x: 48, y: 48 },
    { id: 'p', type: 'portal', label: 'Uscita', destination: 'frontier', x: 208, y: 208 },
  ];
  for (let x = 0; x < 8; x++) m.collisions[4 * 8 + x] = true;
  assert.deepEqual(
    analyzeReachability(m).unreachable.map((m) => m.id),
    ['p'],
  );
  assert.ok(reviewMap(m).some((i) => i.code === 'unreachable-marker' && i.severity === 'warning'));
  assert.equal(approveMap(m).review.status, 'approved'); // estimates are warnings, not false hard failures
  m.collisions[4 * 8 + 3] = false;
  assert.equal(analyzeReachability(m).unreachable.length, 0);
  assert.ok(!reviewMap(m).some((i) => i.code === 'unreachable-marker'));
});
test('path sampling rejects thin polygon barriers despite free endpoints', () => {
  const m = newMap(8, 8);
  m.markers = [{ id: 's', type: 'spawn', label: '', x: 48, y: 48 }];
  m.objects = [
    {
      id: 'barrier',
      asset: 'tree',
      layer: 'objects',
      x: 120,
      y: 0,
      collider: {
        type: 'polygon',
        points: [
          { x: 0, y: 0 },
          { x: 2, y: 0 },
          { x: 2, y: 256 },
          { x: 0, y: 256 },
        ],
      },
    },
  ];
  assert.equal(canTraverse(m, { x: 100, y: 100 }, { x: 145, y: 100 }, collisionShapes(m)), false);
  assert.equal(analyzeReachability(m).reachable[3 * 8 + 5], 0);
  m.markers = [];
  assert.equal(analyzeReachability(m), null);
});
