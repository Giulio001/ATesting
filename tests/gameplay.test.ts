import test from 'node:test';
import assert from 'node:assert/strict';
import { initializePhysics, PhysicsWorld } from '@aetheria/shared/physics';
import {
  sanitizeInput,
  inAttackRange,
  hasLineOfSight,
  WORLD_BOUND,
  DT,
  RUN_SPEED,
} from '@aetheria/shared';

test('input validation rejects malformed packets and normalizes diagonal movement', () => {
  for (const value of [
    null,
    {},
    { seq: 1, x: NaN, z: 0, run: false, yaw: 0 },
    { seq: -1, x: 0, z: 0, run: false, yaw: 0 },
    { seq: 1, x: 0, z: 0, run: 'yes', yaw: 0 },
    { seq: 1, x: 0, z: 0, run: false, yaw: Infinity },
  ])
    assert.equal(sanitizeInput(value), null);
  const diagonal = sanitizeInput({ seq: 1, x: 900, z: 900, run: false, yaw: 10 * Math.PI })!;
  assert.ok(Math.abs(Math.hypot(diagonal.x, diagonal.z) - 1) < 1e-8);
  assert.ok(Math.abs(diagonal.yaw) < 1e-8);
  const analog = sanitizeInput({ seq: 2, x: 0.2, z: 0, run: false, yaw: 0 })!;
  assert.equal(analog.x, 1);
  assert.equal(analog.run, true);
});

test('sword requires distance and facing, while Ether wave has radial reach', () => {
  assert.equal(inAttackRange(3, -1, Math.PI, 'slash'), true);
  assert.equal(inAttackRange(3, -1, 0, 'slash'), false);
  assert.equal(inAttackRange(3, 1, Math.PI, 'slash'), false);
  assert.equal(inAttackRange(3, 0.8, 0, 'skill'), true);
  assert.equal(hasLineOfSight(-16, -6, -6, -6), false);
  assert.equal(hasLineOfSight(0, 2, 3, -3), false, 'Central fountain blocks attacks');
  assert.equal(hasLineOfSight(-4, 2, -4, -3), true);
});

test('Rapier blocks houses and map edges, slides along walls, and always runs regardless of legacy run flag', async () => {
  await initializePhysics();
  const physics = new PhysicsWorld();
  try {
    const player = physics.createPlayer(0, 4);
    const move = (x: number, z: number, run = false, steps = 30) => {
      for (let i = 0; i < steps; i++) {
        physics.move(player, { seq: i + 1, x, z, run, yaw: 0 });
        physics.step();
      }
    };
    move(1, 0);
    assert.ok(Math.abs(player.body.translation().x - RUN_SPEED) < 0.04);
    physics.teleport(player, 0, 0.91, 4);
    move(1, 0, true);
    assert.ok(Math.abs(player.body.translation().x - RUN_SPEED) < 0.04);
    physics.teleport(player, -6, 0.91, -6);
    move(-1, 0, false, 60);
    const blocked = player.body.translation();
    assert.ok(blocked.x > -7.48 && blocked.x < -7.3, `House collision: ${blocked.x}`);
    move(-Math.SQRT1_2, Math.SQRT1_2, false, 30);
    assert.ok(player.body.translation().z > -4, 'Slides along the house facade');
    physics.teleport(player, 22, 0.91, 0);
    move(1, 0, true, 60);
    assert.ok(player.body.translation().x < WORLD_BOUND - 0.3);
    assert.ok(Math.abs(player.body.translation().y - 0.905) < 0.035, 'Remains grounded');
    physics.remove(player);
  } finally {
    physics.dispose();
  }
});
