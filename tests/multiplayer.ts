import { spawn } from 'node:child_process';
import assert from 'node:assert/strict';
import { Client, type Room } from 'colyseus.js';
import type { WorldState } from '@aetheria/shared/schema';
import { DUMMY, ATTACKS, type CombatEvent } from '@aetheria/shared';

const port = 2589;
const entry = process.argv.includes('--built')
  ? ['apps/server/dist/index.js']
  : ['--import', 'tsx', 'apps/server/src/index.ts'];
const server = spawn(process.execPath, entry, {
  cwd: process.cwd(),
  env: { ...process.env, PORT: String(port), HOST: '127.0.0.1' },
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
    position().x - initialX > 3.2 && position().x - initialX < 3.6,
    `Walking speed is server limited: displacement ${position().x - initialX}, ack ${position().ack}`,
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
  a.send('attack', { kind: 'slash', yaw });
  await until(
    () => events.some((e) => e.kind === 'slash' && e.hit),
    'Authoritative slash did not hit',
  );
  await until(
    () => a!.state.dummyHp === hp - ATTACKS.slash.damage && b!.state.dummyHp === a!.state.dummyHp,
    'Dummy damage did not synchronize',
  );
  for (let i = 0; i < 20; i++) a.send('attack', { kind: 'slash', yaw });
  await delay(100);
  assert.equal(a.state.dummyHp, hp - ATTACKS.slash.damage, 'Attack cooldown rejects repeated hits');
  await delay(500);
  a.send('attack', { kind: 'skill', yaw });
  await until(() => events.some((e) => e.kind === 'skill' && e.hit), 'Skill did not hit');
  await until(
    () => b!.state.dummyHp === hp - ATTACKS.slash.damage - ATTACKS.skill.damage,
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
}
