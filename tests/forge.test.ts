import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { RPGSystem } from '../apps/server/src/rpg/RPGSystem.ts';
import { Repository } from '../apps/server/src/rpg/Repository.ts';
import { WorldState, PlayerState } from '@aetheria/shared/schema';
import {
  NPCS,
  SHOP_ITEMS,
  itemStats,
  forgeUpgradeCost,
  forgeUpgradeMaterials,
  forgeSalvageValue,
  countMaterial,
  BAG_CAPACITY,
  type Item,
} from '@aetheria/shared';

function fixture(random = () => 0) {
  const dir = mkdtempSync(join(tmpdir(), 'aetheria-forge-')),
    file = join(dir, 'save.json');
  const storage = new Repository(file),
    state = new WorldState(),
    p = new PlayerState();
  const smith = NPCS.find((n) => n.id === 'blacksmith')!;
  Object.assign(p, { x: smith.x, z: smith.z, name: 'Smith QA', hp: 100 });
  state.players.set('qa', p);
  const notices: string[] = [];
  const rpg = new RPGSystem(
    state,
    {
      send: (_id, type, value) => {
        if (type === 'notice') notices.push(String(value));
      },
      changed() {},
    },
    random,
    storage,
  );
  rpg.join('qa', p.name, undefined);
  const profile = rpg.profiles.get('qa')!;
  p.gold = 100000;
  profile.aetherDust = 100000;
  return {
    rpg,
    p,
    profile,
    storage,
    file,
    notices,
    close: () => rmSync(dir, { recursive: true, force: true }),
  };
}
const material = (id: string, quantity: number, suffix = ''): Item => ({
  id: id + suffix,
  icon: id,
  kind: 'MATERIAL',
  name: id,
  quantity,
  rarity: 'COMMON',
  level: 1,
  description: '',
  stats: {},
  price: 0,
});

test('equipped upgrades grow intrinsic stats, charge original prices, and survive restart', () => {
  const f = fixture();
  try {
    const item = f.profile.items.find((i) => i.id === 'starter-sword')!;
    item.stats.bonusCrit = 6; // A rolled bonus must not grow with the intrinsic attack.
    const price = forgeUpgradeCost(1, 'COMMON'),
      gold = f.p.gold,
      dust = f.profile.aetherDust;
    f.rpg.forge('qa', { action: 'upgrade', id: item.id, goldCost: 0, chance: 0 });
    assert.equal(item.upgradeLevel, 1);
    assert.equal(item.stats.bonusAttack, 3);
    assert.equal(f.p.attackBonus, 3.3);
    assert.equal(itemStats(item).bonusCrit, 6);
    assert.equal(f.rpg.snapshot('qa')!.stats.bonusAttack, 3.3);
    assert.equal(f.p.gold, gold - price.goldCost);
    assert.equal(f.profile.aetherDust, dust - price.dustCost);
    const saved = new Repository(f.file).open(f.profile.token, 'Restored');
    assert.equal(saved.items.find((i) => i.id === item.id)!.upgradeLevel, 1);
    assert.equal(saved.aetherDust, dust - price.dustCost);
    assert.equal(saved.gold, gold - price.goldCost);
  } finally {
    f.close();
  }
});

test('invalid ownership, distance, death, resources and maximum upgrades cannot mutate inventory', () => {
  const f = fixture();
  try {
    const item = f.profile.items[0];
    const unchanged = () => JSON.stringify([f.profile.items, f.profile.aetherDust, f.p.gold]);
    const before = unchanged();
    for (const payload of [
      null,
      [],
      'upgrade',
      { action: 'reforge', id: item.id },
      { action: 'upgrade', id: 'another-player-item' },
      { action: 'upgrade', id: {} },
    ])
      f.rpg.forge('qa', payload);
    assert.equal(unchanged(), before);
    f.p.x = 20;
    f.rpg.forge('qa', { action: 'upgrade', id: item.id });
    assert.equal(unchanged(), before);
    f.p.x = -6;
    f.p.hp = 0;
    f.rpg.forge('qa', { action: 'upgrade', id: item.id });
    assert.equal(unchanged(), before);
    f.p.hp = 100;
    f.p.gold = 0;
    f.rpg.forge('qa', { action: 'upgrade', id: item.id });
    assert.equal(item.upgradeLevel, undefined);
    f.p.gold = 100000;
    f.profile.aetherDust = 0;
    f.rpg.forge('qa', { action: 'upgrade', id: item.id });
    assert.equal(item.upgradeLevel, undefined);
    f.profile.aetherDust = 100000;
    item.upgradeLevel = 9;
    const max = unchanged();
    f.rpg.forge('qa', { action: 'upgrade', id: item.id });
    assert.equal(unchanged(), max);
  } finally {
    f.close();
  }
});

test('materials are required from +5; failed attempts consume split stacks and retain the gear level', () => {
  const f = fixture(() => 0.99);
  try {
    const item = f.profile.items.find((i) => i.id === 'starter-sword')!;
    item.upgradeLevel = 4;
    const before = [f.p.gold, f.profile.aetherDust];
    f.rpg.forge('qa', { action: 'upgrade', id: item.id });
    assert.equal(item.upgradeLevel, 4);
    assert.deepEqual([f.p.gold, f.profile.aetherDust], before);
    f.profile.items.push(material('aether_gel', 1));
    f.rpg.forge('qa', { action: 'upgrade', id: item.id });
    assert.equal(item.upgradeLevel, 5);
    assert.equal(countMaterial(f.profile.items, 'aether_gel'), 0);
    item.upgradeLevel = 7;
    const needs = forgeUpgradeMaterials(8, item.rarity, item.level);
    for (const need of needs) {
      for (let i = 0; i < need.quantity; i++) f.profile.items.push(material(need.id, 1, String(i)));
    }
    const gold = f.p.gold,
      dust = f.profile.aetherDust,
      cost = forgeUpgradeCost(8, item.rarity);
    f.rpg.forge('qa', { action: 'upgrade', id: item.id });
    assert.equal(item.upgradeLevel, 7);
    assert.equal(f.p.gold, gold - cost.goldCost);
    assert.equal(f.profile.aetherDust, dust - cost.dustCost);
    for (const need of needs) assert.equal(countMaterial(f.profile.items, need.id), 0);
    assert.ok(f.notices.at(-1)!.includes('fallito'));
  } finally {
    f.close();
  }
});

test('salvage protects equipped and starter gear, pays once, and keeps the result on disk', () => {
  const f = fixture();
  try {
    const dust = f.profile.aetherDust,
      starter = f.profile.items[0];
    f.rpg.forge('qa', { action: 'salvage', id: starter.id });
    f.rpg.inventory('qa', { action: 'unequip', slot: starter.kind });
    f.rpg.forge('qa', { action: 'salvage', id: starter.id });
    assert.equal(f.profile.aetherDust, dust);
    const gear = {
      ...SHOP_ITEMS.find((i) => i.id === 'shop-sword')!,
      id: 'spare-sword',
      upgradeLevel: 3,
    };
    f.profile.items.push(gear);
    f.rpg.inventory('qa', { action: 'equip', id: gear.id });
    f.rpg.forge('qa', { action: 'salvage', id: gear.id });
    assert.ok(f.profile.items.includes(gear));
    f.rpg.inventory('qa', { action: 'unequip', slot: 'WEAPON' });
    f.rpg.forge('qa', { action: 'salvage', id: gear.id });
    f.rpg.forge('qa', { action: 'salvage', id: gear.id });
    assert.equal(f.profile.aetherDust, dust + forgeSalvageValue('COMMON', 3));
    const saved = new Repository(f.file).open(f.profile.token, 'Restored');
    assert.ok(!saved.items.some((i) => i.id === gear.id));
    assert.equal(saved.aetherDust, f.profile.aetherDust);
  } finally {
    f.close();
  }
});

test('frontier kills grant persistent dust, stack materials up to the original limit, and respect bag capacity', () => {
  const f = fixture();
  try {
    const dust = f.profile.aetherDust;
    f.profile.items.push(material('aether_gel', 999));
    f.rpg.loot('qa', false);
    assert.equal(f.profile.aetherDust, dust + 1);
    assert.equal(countMaterial(f.profile.items, 'aether_gel'), 1000);
    assert.ok(
      f.profile.items.filter((i) => i.icon === 'aether_gel').every((i) => i.quantity <= 999),
    );
    while (f.profile.items.length < BAG_CAPACITY)
      f.profile.items.push(material('other', 1, String(f.profile.items.length)));
    f.rpg.loot('qa', true);
    assert.equal(f.profile.items.length, BAG_CAPACITY);
    assert.equal(f.profile.aetherDust, dust + 5);
    assert.equal(new Repository(f.file).open(f.profile.token, 'Restored').aetherDust, dust + 5);
  } finally {
    f.close();
  }
});

test('version 1 saves without forge currency migrate without losing existing progress', () => {
  const f = fixture();
  try {
    f.rpg.checkpoint('qa');
    const old = JSON.parse(readFileSync(f.file, 'utf8'));
    delete old.profiles[f.profile.id].aetherDust;
    writeFileSync(f.file, JSON.stringify(old));
    const restored = new Repository(f.file).open(f.profile.token, 'Migrated');
    assert.equal(restored.aetherDust, 0);
    assert.equal(restored.gold, f.p.gold);
    assert.deepEqual(restored.items, f.profile.items);
  } finally {
    f.close();
  }
});
