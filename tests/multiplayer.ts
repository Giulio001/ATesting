import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import assert from 'node:assert/strict';
import { Client, type Room } from 'colyseus.js';
import type { WorldState } from '@aetheria/shared/schema';
import {
  DUMMY,
  ATTACKS,
  type CombatEvent,
  type RPGSnapshot,
  CUSTODIAN,
  NPCS,
  ENEMY_SPAWNS,
} from '@aetheria/shared';

const port = 2589;
const saveDir = mkdtempSync(join(tmpdir(), 'aetheria3d-integration-'));
const entry = process.argv.includes('--built')
  ? ['apps/server/dist/index.js']
  : ['--import', 'tsx', 'apps/server/src/index.ts'];
const server = spawn(process.execPath, entry, {
  cwd: process.cwd(),
  env: {
    ...process.env,
    PORT: String(port),
    HOST: '127.0.0.1',
    DATA_FILE: join(saveDir, 'save.json'),
  },
  stdio: ['ignore', 'pipe', 'pipe'],
});
let output = '';
server.stdout.on('data', (d) => {
  output += d.toString();
});
server.stderr.on('data', (d) => {
  output += d.toString();
});
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
async function until(check: () => boolean | Promise<boolean>, message: string, timeout = 8000) {
  const end = Date.now() + timeout;
  while (Date.now() < end) {
    if (await check()) return;
    await delay(30);
  }
  throw new Error(`${message}\n${output}`);
}
let a: Room<WorldState> | undefined, b: Room<WorldState> | undefined;
try {
  await until(async () => {
    try {
      return (await fetch(`http://127.0.0.1:${port}/health`)).ok;
    } catch {
      return false;
    }
  }, 'Server did not start');
  const client = new Client(`ws://127.0.0.1:${port}`);
  a = await client.joinOrCreate<WorldState>('lumengate', { name: 'QA Guardian' });
  b = await client.joinOrCreate<WorldState>('lumengate', { name: 'QA Visitor' });
  const events: CombatEvent[] = [];
  let snapshot: RPGSnapshot | undefined,
    token = '';
  for (const room of [a, b]) {
    for (const kind of [
      'damage',
      'reward',
      'dialogue',
      'service',
      'guard',
      'notice',
      'chat',
      'profile',
      'rpg',
    ])
      room.onMessage(kind, () => {});
  }
  a.onMessage('rpg', (s: RPGSnapshot) => (snapshot = s));
  a.onMessage('profile', (p: { token: string }) => (token = p.token));
  a.send('rpg-request');
  await until(() => !!snapshot && !!token, 'Profile was not sent');
  a.onMessage('combat', (e: CombatEvent) => events.push(e));
  b.onMessage('combat', () => {});
  a.onMessage('respawn', () => {});
  b.onMessage('respawn', () => {});
  await until(
    () => a!.state.players.size === 2 && b!.state.players.size === 2,
    'Both clients must see both players',
  );
  let seq = 0;
  const position = () => a!.state.players.get(a!.sessionId)!;
  const initialX = position().x;
  // Clients send intention only; the room chooses displacement.
  for (let i = 0; i < 30; i++) {
    a.send('input', { seq: ++seq, x: 999, z: 0, run: false, yaw: Math.PI / 2 });
    await delay(34);
  }
  await until(() => position().ack === seq, 'Movement was not acknowledged');
  assert.ok(
    position().x - initialX > 5.4 && position().x - initialX < 5.8,
    `Running speed is server limited even with run:false: displacement ${position().x - initialX}, ack ${position().ack}`,
  );
  await until(
    () => Math.abs(b!.state.players.get(a!.sessionId)!.x - position().x) < 0.02,
    'Remote player position did not synchronize',
  );
  const oldAck = position().ack;
  a.send('input', { seq: 99999, x: 'invalid', z: 0, run: false, yaw: 0 });
  await delay(100);
  assert.equal(position().ack, oldAck);
  // Walk into striking distance of the dummy without teleport messages.
  for (let i = 0; i < 130; i++) {
    const p = position(),
      dx = DUMMY.x - p.x,
      dz = DUMMY.z - p.z,
      len = Math.hypot(dx, dz);
    if (len < 1.75) break;
    a.send('input', { seq: ++seq, x: dx / len, z: dz / len, run: true, yaw: Math.atan2(dx, dz) });
    await delay(35);
  }
  await until(() => position().ack === seq, 'Approach was not acknowledged');
  const p = position(),
    yaw = Math.atan2(DUMMY.x - p.x, DUMMY.z - p.z);
  const hp = a.state.dummyHp;
  const damage = (kind: keyof typeof ATTACKS) =>
    Math.round(ATTACKS[kind].damage * (1 + position().attackBonus / 50));
  a.send('attack', { kind: 'slash', yaw });
  await until(
    () => events.some((e) => e.kind === 'slash' && e.hit),
    'Authoritative slash did not hit',
  );
  await until(
    () => a!.state.dummyHp === hp - damage('slash') && b!.state.dummyHp === a!.state.dummyHp,
    'Dummy damage did not synchronize',
  );
  for (let i = 0; i < 20; i++) a.send('attack', { kind: 'slash', yaw });
  await delay(100);
  assert.equal(a.state.dummyHp, hp - damage('slash'), 'Attack cooldown rejects repeated hits');
  await delay(500);
  a.send('attack', { kind: 'skill', yaw });
  await until(() => events.some((e) => e.kind === 'skill' && e.hit), 'Skill did not hit');
  await until(
    () => b!.state.dummyHp === Math.max(0, hp - damage('slash') - damage('skill')),
    'Skill damage did not synchronize',
  );
  const skillHp = a.state.dummyHp;
  await delay(800);
  a.send('attack', { kind: 'skill', yaw });
  await delay(120);
  assert.equal(a.state.dummyHp, skillHp, 'Skill cooldown is server enforced');
  // Idle input cannot continue moving a disconnected or unfocused player.
  const idleX = position().x,
    idleZ = position().z;
  await delay(450);
  assert.ok(Math.hypot(position().x - idleX, position().z - idleZ) < 0.02);
  await b.leave();
  b = undefined;
  await until(() => a!.state.players.size === 1, 'Departed player was not removed');
  // Kill and verify the shared dummy respawns in the same room.
  while (a.state.dummyHp > 0) {
    a.send('attack', { kind: 'slash', yaw });
    await delay(720);
  }
  assert.ok(a.state.respawnAt > Date.now());
  await until(() => a!.state.dummyHp === DUMMY.maxHp, 'Dummy did not respawn', 7500);
  // The real protocol also validates RPG state, NPC proximity, skills and persistence.
  const approach = async (tx: number, tz: number, stop = 1.8) => {
    for (let i = 0; i < 250; i++) {
      const p = position(),
        dx = tx - p.x,
        dz = tz - p.z,
        len = Math.hypot(dx, dz);
      if (len < stop) break;
      a!.send('input', {
        seq: ++seq,
        x: dx / len,
        z: dz / len,
        run: false,
        yaw: Math.atan2(dx, dz),
      });
      await delay(35);
    }
    await until(() => position().ack === seq, 'Approach not acknowledged');
    assert.ok(
      Math.hypot(position().x - tx, position().z - tz) < stop + 0.3,
      'NPC must be reachable',
    );
  };
  a.send('buy', 'shop-sword');
  await delay(120);
  assert.equal(snapshot!.items.length, 4, 'Out-of-range purchase rejected');
  a.send('inventory', { action: 'equip', id: 'forged-item' });
  await delay(120);
  assert.equal(snapshot!.equipment.WEAPON, 'starter-sword');
  // Waypoints bypass the solid central fountain.
  await approach(4, 3);
  await approach(-2.3, 3);
  await approach(CUSTODIAN.x, CUSTODIAN.z, 2);
  a.send('interact');
  await until(() => position().questState === 1, 'Quest was not accepted');
  a.send('ability', { ability: 'GUARD', yaw: 0 });
  await until(() => position().guardUntil > Date.now(), 'Guard did not activate');
  const ready = position().guardReadyAt;
  a.send('ability', { ability: 'GUARD', yaw: 0 });
  await delay(100);
  assert.equal(position().guardReadyAt, ready, 'Guard cooldown rejects spam');
  await approach(-3, 9);
  await approach(-3, 12);
  for (const spawn of ENEMY_SPAWNS.filter((e) => e.type === 'shard')) {
    for (let i = 0; i < 250 && a.state.enemies.get(spawn.id)!.hp > 0; i++) {
      const target = a.state.enemies.get(spawn.id)!,
        p = position(),
        dx = target.x - p.x,
        dz = target.z - p.z,
        len = Math.hypot(dx, dz);
      if (p.hp === 0) throw new Error('Guardian died in integration encounter');
      if (len > 1.8)
        a.send('input', {
          seq: ++seq,
          x: dx / len,
          z: dz / len,
          run: false,
          yaw: Math.atan2(dx, dz),
        });
      a.send('attack', { kind: 'slash', yaw: Math.atan2(dx, dz) });
      a.send('ability', { ability: 'BURST', yaw: Math.atan2(dx, dz) });
      if (p.hp < p.maxHp * 0.65) a.send('potion');
      await delay(100);
    }
    assert.equal(a.state.enemies.get(spawn.id)!.hp, 0, 'Enemy must be defeated');
  }
  await until(() => position().questState === 2, 'Three kills must complete quest objective');
  await approach(-3, 8);
  await approach(-2.3, 3);
  await approach(CUSTODIAN.x, CUSTODIAN.z, 2);
  a.send('interact');
  await until(() => position().questState === 3, 'Quest reward was not claimed');
  const gold = position().gold;
  assert.ok(gold >= 111);
  assert.ok(
    snapshot!.items.some((i) => i.kind === 'MATERIAL'),
    'Kills must grant real loot',
  );
  const herald = NPCS.find((n) => n.id === 'herald')!;
  await approach(4, 3);
  await approach(herald.x, herald.z, 2);
  a.send('clan', { action: 'create', name: 'QA Guardians' });
  await until(() => !!snapshot?.clan, 'Clan was not created');
  await until(() => position().gold === gold - 100, 'Clan creation cost must synchronize');
  assert.equal(position().gold, gold - 100, 'Clan creation charges original cost');
  const clanId = snapshot!.clan!.id,
    profileId = snapshot!.profileId;
  await a.leave();
  a = undefined;
  a = await client.joinOrCreate<WorldState>('lumengate', { name: 'QA Guardian', token });
  for (const kind of [
    'combat',
    'respawn',
    'damage',
    'reward',
    'dialogue',
    'service',
    'guard',
    'notice',
    'chat',
    'profile',
  ])
    a.onMessage(kind, () => {});
  snapshot = undefined;
  a.onMessage('rpg', (s: RPGSnapshot) => (snapshot = s));
  a.send('rpg-request');
  await until(() => !!snapshot && a!.state.players.has(a!.sessionId), 'Reconnect not ready');
  assert.equal(snapshot!.profileId, profileId);
  assert.equal(snapshot!.clan!.id, clanId);
  assert.equal(position().questState, 3);
  assert.equal(position().gold, gold - 100);
  b = await client.joinOrCreate<WorldState>('lumengate', { name: 'QA Recruit' });
  let recruit: RPGSnapshot | undefined;
  for (const kind of [
    'combat',
    'respawn',
    'damage',
    'reward',
    'dialogue',
    'service',
    'guard',
    'notice',
    'chat',
    'profile',
  ])
    b.onMessage(kind, () => {});
  b.onMessage('rpg', (s: RPGSnapshot) => (recruit = s));
  b.send('rpg-request');
  await until(() => !!recruit, 'Recruit inventory missing');
  b.send('clan', { action: 'request', clanId: '__proto__' });
  await delay(80);
  b.send('clan', { action: 'accept', profileId: profileId });
  await delay(80);
  assert.equal(recruit!.clan, null, 'Non-founder cannot approve membership');
  b.send('clan', { action: 'request', clanId });
  await until(() => snapshot!.clan!.requests.length === 1, 'Founder must receive request');
  a.send('clan', { action: 'accept', profileId: recruit!.profileId });
  await until(
    () => recruit!.clan?.members === 2 && snapshot!.clan?.members === 2,
    'Membership not synchronized',
  );
  const clanMessages: string[] = [];
  b.onMessage('chat', (e: { text: string }) => clanMessages.push(e.text));
  a.send('chat', { channel: 'GUILD', text: 'Clan QA ready' });
  await until(() => clanMessages.includes('Clan QA ready'), 'Guild chat failed');
  a.send('inventory', { action: 'unequip', slot: 'WEAPON' });
  await until(
    () => !snapshot!.equipment.WEAPON && position().attackBonus === 0,
    'Unequip must remove stats',
  );
  a.send('inventory', { action: 'equip', id: 'starter-sword' });
  await until(
    () => snapshot!.equipment.WEAPON === 'starter-sword' && position().attackBonus === 3,
    'Equip must restore real stats',
  );
  console.log(
    'PASS: original running, authoritative combat, Guardian skills, NPC quest/loot, inventory ownership, clan creation and character persistence.',
  );
  console.log(
    'PASS: two clients, server-limited movement, state synchronization, malformed input, slash/skill cooldowns, idle stop, leave cleanup, dummy defeat and respawn.',
  );
} catch (error) {
  console.error(error);
  console.error(output);
  process.exitCode = 1;
} finally {
  await a?.leave();
  await b?.leave();
  server.kill('SIGTERM');
  await new Promise<void>((resolve) => {
    if (server.exitCode !== null) resolve();
    else server.once('exit', () => resolve());
  });
  rmSync(saveDir, { recursive: true, force: true });
}
