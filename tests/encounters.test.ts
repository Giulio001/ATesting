import test from 'node:test';
import assert from 'node:assert/strict';
import { WorldState, PlayerState } from '@aetheria/shared/schema';
import { initializePhysics, PhysicsWorld } from '@aetheria/shared/physics';
import {
  CUSTODIAN,
  ENEMY_SPAWNS,
  QUEST_GOAL,
  xpRequired,
  BATTLE_START,
  type DamageEvent,
  type RewardEvent,
} from '@aetheria/shared';
import { EncounterSystem } from '../apps/server/src/world/EncounterSystem.ts';

async function setup() {
  await initializePhysics();
  const state = new WorldState(),
    physics = new PhysicsWorld();
  const hero = new PlayerState();
  hero.x = CUSTODIAN.x;
  hero.z = CUSTODIAN.z;
  state.players.set('hero', hero);
  const damages: DamageEvent[] = [],
    rewards: RewardEvent[] = [];
  const encounter = new EncounterSystem(state, physics, {
    physicsPlayer: () => undefined,
    resetPlayer: () => {},
    damage: (e) => damages.push(e),
    reward: (_id, e) => rewards.push(e),
    dialogue: () => {},
  });
  return { state, physics, hero, encounter, damages, rewards };
}
test('quest is proximity gated, counts server kills, levels up and pays only once', async () => {
  const s = await setup();
  try {
    s.hero.x = 20;
    s.encounter.interact('hero');
    assert.equal(s.hero.questState, 0);
    s.hero.x = CUSTODIAN.x;
    s.encounter.interact('hero');
    assert.equal(s.hero.questState, 1);
    s.hero.xp = xpRequired(1) - 100;
    let now = 10000;
    for (const spawn of ENEMY_SPAWNS.filter((e) => e.type === 'shard')) {
      const enemy = s.state.enemies.get(spawn.id)!;
      s.hero.x = enemy.x;
      s.hero.z = enemy.z - 0.3;
      for (let i = 0; i < 4; i++) s.encounter.strike('hero', 'slash', 0, (now += 700));
      assert.equal(enemy.hp, 0);
    }
    assert.equal(s.hero.questKills, QUEST_GOAL);
    assert.equal(s.hero.questState, 2);
    assert.equal(s.hero.level, 2);
    assert.equal(s.hero.maxHp, 110);
    assert.equal(s.hero.gold, 36);
    s.hero.x = CUSTODIAN.x;
    s.hero.z = CUSTODIAN.z;
    s.encounter.interact('hero');
    assert.equal(s.hero.questState, 3);
    assert.equal(s.hero.gold, 111);
    s.encounter.interact('hero');
    assert.equal(s.hero.gold, 111);
    assert.equal(s.rewards.filter((r) => r.quest).length, 1);
  } finally {
    s.physics.dispose();
  }
});
test('enemy windup can be dodged, deals damage on impact, and never hurts players in town', async () => {
  const s = await setup();
  try {
    const enemy = s.state.enemies.get('shard-west')!;
    s.hero.x = enemy.x;
    s.hero.z = enemy.z - 0.6;
    s.encounter.tick(10000);
    assert.equal(enemy.behavior, 'windup');
    assert.ok(enemy.attackAt > 10000);
    s.hero.x += 4;
    s.encounter.tick(enemy.attackAt + 1);
    assert.equal(s.hero.hp, 100);
    assert.equal(s.damages.length, 0);
    s.hero.x = enemy.x;
    s.hero.z = enemy.z - 0.5;
    s.encounter.tick(13000);
    const attackAt = enemy.attackAt;
    s.encounter.tick(attackAt + 1);
    assert.ok(s.hero.hp < 100);
    assert.ok(s.damages.length > 0);
    s.hero.z = BATTLE_START - 1;
    const safeHp = s.hero.hp;
    s.encounter.tick(20000);
    s.encounter.tick(21000);
    assert.ok(s.hero.hp >= safeHp);
  } finally {
    s.physics.dispose();
  }
});
test('potions consume a charge and obey cooldown; dead players cannot hit and respawn safely', async () => {
  const s = await setup();
  try {
    s.hero.hp = 20;
    s.encounter.potion('hero', 10000);
    assert.equal(s.hero.hp, 65);
    assert.equal(s.hero.potions, 2);
    s.encounter.potion('hero', 11000);
    assert.equal(s.hero.potions, 2);
    s.encounter.potion('hero', 14000);
    assert.equal(s.hero.hp, 100);
    s.encounter.potion('hero', 20000);
    assert.equal(s.hero.potions, 1);
    s.hero.hp = 0;
    s.hero.deadUntil = 30000;
    s.hero.z = 15;
    assert.deepEqual(s.encounter.strike('hero', 'skill', 0, 25000), []);
    s.encounter.tick(29999);
    assert.equal(s.hero.hp, 0);
    s.encounter.tick(30001);
    assert.equal(s.hero.hp, s.hero.maxHp);
    assert.ok(s.hero.z < BATTLE_START);
    assert.equal(s.hero.deadUntil, 0);
  } finally {
    s.physics.dispose();
  }
});
test('cooperative contributors receive credit and defeated enemies respawn', async () => {
  const s = await setup();
  try {
    const enemy = s.state.enemies.get('shard-west')!,
      partner = new PlayerState();
    partner.x = enemy.x;
    partner.z = enemy.z - 0.4;
    partner.questState = 1;
    s.state.players.set('partner', partner);
    s.hero.x = enemy.x;
    s.hero.z = enemy.z - 0.4;
    s.hero.questState = 1;
    s.encounter.strike('hero', 'slash', 0, 10000);
    s.encounter.strike('partner', 'skill', 0, 11000);
    s.encounter.strike('hero', 'slash', 0, 12000);
    assert.equal(enemy.hp, 0);
    assert.equal(s.hero.questKills, 1);
    assert.equal(partner.questKills, 1);
    assert.equal(partner.gold, 12);
    s.encounter.strike('hero', 'slash', 0, 13000);
    assert.equal(s.hero.gold, 12);
    s.hero.z = 5;
    partner.z = 5;
    s.encounter.tick(enemy.respawnAt + 1);
    assert.equal(enemy.hp, enemy.maxHp);
    assert.equal(enemy.behavior, 'idle');
  } finally {
    s.physics.dispose();
  }
});
