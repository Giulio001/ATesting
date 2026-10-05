import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DAILY_POOL,
  DAILY_SLOTS,
  dayIndex,
  nextDailyReset,
  dailyRotation,
  slotProgress,
  withSlotProgress,
  slotDone,
  markSlotDone,
  dailyCounts,
  RESIDENTS,
  NPCS,
  nearbyNpc,
  nearbyResident,
  residentPose,
} from '@aetheria/shared';

const DAY = 86_400_000;
// 2026-10-05 06:00 UTC: safely inside the 05:00 reset window.
const NOON = Date.UTC(2026, 9, 5, 6, 0, 0);

test('daily rotation rolls over at 05:00 UTC and is deterministic', () => {
  const beforeReset = Date.UTC(2026, 9, 5, 4, 59, 59);
  const afterReset = Date.UTC(2026, 9, 5, 5, 0, 0);
  assert.equal(dayIndex(afterReset), dayIndex(beforeReset) + 1);
  const day = dayIndex(NOON);
  assert.deepEqual(
    dailyRotation(day).map((q) => q.id),
    dailyRotation(day).map((q) => q.id),
    'same day must pick the same quests',
  );
  assert.equal(dailyRotation(day).length, DAILY_SLOTS);
  const ids = dailyRotation(day).map((q) => q.id);
  assert.equal(new Set(ids).size, DAILY_SLOTS, 'a rotation never repeats a quest');
  for (const quest of dailyRotation(day)) assert.ok(DAILY_POOL.includes(quest));
});

test('rotations differ across days and reset countdown lands on the next window', () => {
  const rotations = new Set(
    Array.from({ length: 12 }, (_, i) =>
      dailyRotation(dayIndex(NOON) + i)
        .map((q) => q.id)
        .join('|'),
    ),
  );
  assert.ok(rotations.size > 1, 'the pool should reshuffle between days');
  assert.equal(nextDailyReset(NOON % DAY === 0 ? NOON : NOON) - Date.UTC(2026, 9, 6, 5, 0, 0), 0);
});

test('slot progress is packed per slot without bleeding', () => {
  let packed = 0;
  packed = withSlotProgress(packed, 0, 7);
  packed = withSlotProgress(packed, 1, 200);
  packed = withSlotProgress(packed, 2, 3);
  assert.equal(slotProgress(packed, 0), 7);
  assert.equal(slotProgress(packed, 1), 200);
  assert.equal(slotProgress(packed, 2), 3);
  packed = withSlotProgress(packed, 1, 4);
  assert.equal(slotProgress(packed, 0), 7);
  assert.equal(slotProgress(packed, 1), 4);
  assert.equal(slotProgress(packed, 2), 3);
  assert.equal(withSlotProgress(packed, 0, 999), withSlotProgress(packed, 0, 255));
});

test('done mask is an idempotent bitmask', () => {
  let mask = 0;
  assert.equal(slotDone(mask, 1), false);
  mask = markSlotDone(mask, 1);
  assert.equal(slotDone(mask, 1), true);
  assert.equal(slotDone(mask, 0), false);
  assert.equal(markSlotDone(mask, 1), mask);
});

test('daily kill filters respect kind, targets and boss overrides', () => {
  const kill = DAILY_POOL.find((q) => q.kind === 'kill')!;
  assert.equal(dailyCounts(kill, kill.targets![0], false, false), true);
  assert.equal(dailyCounts(kill, 'unrelated', false, false), false);
  const elite = DAILY_POOL.find((q) => q.kind === 'elite')!;
  assert.equal(dailyCounts(elite, 'sentinel', true, false), true);
  assert.equal(dailyCounts(elite, 'champion', true, true), false, 'bosses are not elite taglie');
  assert.equal(dailyCounts(elite, 'shard', false, false), false);
  const boss = DAILY_POOL.find((q) => q.kind === 'boss')!;
  assert.equal(dailyCounts(boss, 'guardian', true, true), true);
  assert.equal(dailyCounts(boss, 'shard', false, false), false);
  const any = DAILY_POOL.find((q) => q.kind === 'any')!;
  assert.equal(dailyCounts(any, 'anything', false, false), true);
});

test('residents patrol deterministically and stay on their route', () => {
  assert.ok(RESIDENTS.length >= 12, 'the city should feel populated');
  for (const npc of RESIDENTS) {
    const a = residentPose(npc, 1234.5);
    const b = residentPose(npc, 1234.5);
    assert.deepEqual(a, b, `${npc.id} must be a pure function of time`);
    const box = npc.route ?? [[npc.x, npc.z]];
    for (const t of [0, 3.3, 17.9, 61.2, 480.5]) {
      const pose = residentPose(npc, t);
      const minX = Math.min(...box.map((p) => p[0])) - 0.01;
      const maxX = Math.max(...box.map((p) => p[0])) + 0.01;
      const minZ = Math.min(...box.map((p) => p[1])) - 0.01;
      const maxZ = Math.max(...box.map((p) => p[1])) + 0.01;
      assert.ok(pose.x >= minX && pose.x <= maxX, `${npc.id} x out of route at t=${t}`);
      assert.ok(pose.z >= minZ && pose.z <= maxZ, `${npc.id} z out of route at t=${t}`);
      assert.ok(Number.isFinite(pose.yaw));
    }
  }
});

test('service NPCs and residents keep separate interaction channels', () => {
  const gate = nearbyNpc(-2, 1);
  assert.equal(gate?.id, 'gatewarden');
  assert.equal(nearbyNpc(14, -16), undefined);
  const watchman = RESIDENTS.find((n) => n.id === 'watchman-orson')!;
  const pose = residentPose(watchman, Date.now() / 1000);
  assert.equal(nearbyResident(pose.x, pose.z, 1, Date.now())?.id, 'watchman-orson');
  for (const npc of NPCS)
    assert.ok(npc.service !== 'resident', 'service list must not contain ambient residents');
});
