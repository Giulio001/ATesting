import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { WorldState, PlayerState } from '@aetheria/shared/schema';
import { BAG_CAPACITY, type Item } from '@aetheria/shared';
import { Repository } from '../apps/server/src/rpg/Repository.ts';
import { RPGSystem } from '../apps/server/src/rpg/RPGSystem.ts';
import { TradeSystem } from '../apps/server/src/rpg/TradeSystem.ts';

const makeItem = (id: string, name = 'Iron Sword'): Item => ({
  id,
  kind: 'WEAPON',
  name,
  icon: 'sword_iron',
  rarity: 'COMMON',
  quantity: 1,
  level: 1,
  description: 'Test gear.',
  stats: {},
  price: 45,
});

function setup() {
  const dir = mkdtempSync(join(tmpdir(), 'aetheria-trade-')),
    file = join(dir, 'save.json'),
    state = new WorldState(),
    sent: { id: string; type: string; value: unknown }[] = [];
  const send = (id: string, type: string, value: unknown) => sent.push({ id, type, value });
  const repository = new Repository(file),
    rpg = new RPGSystem(state, { send, changed: () => {} }, Math.random, repository),
    trades = new TradeSystem(state, rpg, send);
  for (const [id, name] of [
    ['a', 'Alice'],
    ['b', 'Bob'],
  ] as const) {
    const p = new PlayerState();
    p.name = name;
    p.x = 0;
    p.z = 0;
    state.players.set(id, p);
    rpg.join(id, name, undefined, 'GUARDIAN');
  }
  return { dir, state, rpg, trades, sent, repository };
}
const lastTradeRequest = (sent: { id: string; type: string; value: unknown }[], id: string) =>
  sent.filter((m) => m.id === id && m.type === 'trade-request').at(-1)?.value as
    { id: string; fromName: string } | undefined;

test('a full trade swaps locked items and gold only at commit', () => {
  const t = setup();
  try {
    const alice = t.rpg.profiles.get('a')!,
      bob = t.rpg.profiles.get('b')!,
      blade = makeItem('trade-blade');
    alice.items.push(blade);
    const bobGold = 50;
    t.state.players.get('b')!.gold = bobGold;
    t.trades.handle('a', { action: 'request', target: 'b' });
    const invite = lastTradeRequest(t.sent, 'b');
    assert.ok(invite, 'Bob receives the invite');
    t.trades.handle('b', { action: 'accept', id: invite!.id });
    t.trades.handle('a', { action: 'offer', id: invite!.id, itemId: blade.id });
    assert.ok(t.rpg.locked.has(blade.id), 'Offered items are locked');
    t.rpg.inventory('a', { action: 'equip', id: blade.id });
    assert.notEqual(alice.equipment.WEAPON, blade.id, 'Locked items cannot be equipped');
    t.trades.handle('b', { action: 'gold', id: invite!.id, amount: 30 });
    t.trades.handle('a', { action: 'ready', id: invite!.id });
    t.trades.handle('b', { action: 'ready', id: invite!.id });
    assert.ok(!t.rpg.locked.has(blade.id), 'Commit unlocks the traded items');
    assert.ok(!alice.items.some((i) => i.id === blade.id), 'Alice gives the blade away');
    assert.ok(
      bob.items.some((i) => i.id === blade.id),
      'Bob receives the blade',
    );
    assert.equal(t.state.players.get('b')!.gold, bobGold - 30, 'Bob pays the offered gold');
    assert.equal(t.state.players.get('a')!.gold, 30, 'Alice receives the gold');
    const closing = t.sent.filter((m) => m.type === 'trade').at(-1)?.value;
    assert.equal(closing, null, 'The trade session closes after commit');
  } finally {
    rmSync(t.dir, { recursive: true, force: true });
  }
});

test('cancelling a trade unlocks offered items without moving them', () => {
  const t = setup();
  try {
    const alice = t.rpg.profiles.get('a')!,
      blade = makeItem('trade-cancel');
    alice.items.push(blade);
    t.trades.handle('a', { action: 'request', target: 'b' });
    const invite = lastTradeRequest(t.sent, 'b')!;
    t.trades.handle('b', { action: 'accept', id: invite.id });
    t.trades.handle('a', { action: 'offer', id: invite.id, itemId: blade.id });
    t.trades.handle('a', { action: 'cancel', id: invite.id });
    assert.ok(!t.rpg.locked.has(blade.id), 'Cancel unlocks the item');
    assert.ok(
      alice.items.some((i) => i.id === blade.id),
      'Cancel keeps the item',
    );
  } finally {
    rmSync(t.dir, { recursive: true, force: true });
  }
});

test('walking away auto-cancels the trade and releases the locks', () => {
  const t = setup();
  try {
    const alice = t.rpg.profiles.get('a')!,
      blade = makeItem('trade-away');
    alice.items.push(blade);
    t.trades.handle('a', { action: 'request', target: 'b' });
    const invite = lastTradeRequest(t.sent, 'b')!;
    t.trades.handle('b', { action: 'accept', id: invite.id });
    t.trades.handle('a', { action: 'offer', id: invite.id, itemId: blade.id });
    const bob = t.state.players.get('b')!;
    bob.x = 40;
    bob.z = 40;
    t.trades.tick(Date.now() + 1);
    assert.ok(!t.rpg.locked.has(blade.id), 'Distance cancels and unlocks');
    assert.ok(
      alice.items.some((i) => i.id === blade.id),
      'Distance keeps the item',
    );
  } finally {
    rmSync(t.dir, { recursive: true, force: true });
  }
});

test('a full bag aborts the commit instead of dropping items', () => {
  const t = setup();
  try {
    const alice = t.rpg.profiles.get('a')!,
      bob = t.rpg.profiles.get('b')!,
      blade = makeItem('trade-full');
    alice.items.push(blade);
    while (bob.items.length < BAG_CAPACITY) bob.items.push(makeItem(`filler-${bob.items.length}`));
    t.trades.handle('a', { action: 'request', target: 'b' });
    const invite = lastTradeRequest(t.sent, 'b')!;
    t.trades.handle('b', { action: 'accept', id: invite.id });
    t.trades.handle('a', { action: 'offer', id: invite.id, itemId: blade.id });
    t.trades.handle('a', { action: 'ready', id: invite.id });
    t.trades.handle('b', { action: 'ready', id: invite.id });
    assert.ok(
      alice.items.some((i) => i.id === blade.id),
      'Full bag keeps the item with its owner',
    );
    assert.ok(!bob.items.some((i) => i.id === blade.id), 'Nothing is dropped into a full bag');
    assert.ok(t.rpg.locked.has(blade.id), 'The trade stays open and the item stays locked');
  } finally {
    rmSync(t.dir, { recursive: true, force: true });
  }
});

test('starter kits and equipped gear cannot be offered', () => {
  const t = setup();
  try {
    const alice = t.rpg.profiles.get('a')!;
    t.trades.handle('a', { action: 'request', target: 'b' });
    const invite = lastTradeRequest(t.sent, 'b')!;
    t.trades.handle('b', { action: 'accept', id: invite.id });
    const starter = alice.items.find((i) => i.id === 'starter-sword')!;
    t.trades.handle('a', { action: 'offer', id: invite.id, itemId: starter.id });
    assert.ok(!t.rpg.locked.has(starter.id), 'Starter gear is refused');
    const equipped = alice.items.find((i) => i.id === alice.equipment.WEAPON)!;
    t.trades.handle('a', { action: 'offer', id: invite.id, itemId: equipped.id });
    assert.ok(!t.rpg.locked.has(equipped.id), 'Equipped gear is refused');
  } finally {
    rmSync(t.dir, { recursive: true, force: true });
  }
});
