import { Schema, MapSchema, defineTypes } from '@colyseus/schema';
export class PlayerState extends Schema {
  x = 0;
  y = 0.91;
  z = 0;
  yaw = 0;
  moving = false;
  running = false;
  ack = 0;
  travelRevision = 0;
  name = 'Viandante';
  heroClass = 'GUARDIAN';
  hp = 100;
  maxHp = 100;
  mana = 100;
  potions = 3;
  xp = 0;
  level = 1;
  gold = 0;
  questState = 0;
  questKills = 0;
  frontierState = 0;
  frontierKills = 0;
  kills = 0;
  deadUntil = 0;
  skillUntil = 0;
  potionUntil = 0;
  manaPotions = 2;
  stamina = 100;
  guardUntil = 0;
  guardReadyAt = 0;
  slashReadyAt = 0;
  manaPotionUntil = 0;
  clanName = '';
  weaponIcon = 'sword_rough_iron';
  shieldIcon = 'shield_oak_buckler';
  attackBonus = 0;
  defence = 0;
}
defineTypes(PlayerState, {
  x: 'float32',
  y: 'float32',
  z: 'float32',
  yaw: 'float32',
  moving: 'boolean',
  running: 'boolean',
  ack: 'uint32',
  travelRevision: 'uint32',
  name: 'string',
  heroClass: 'string',
  hp: 'uint16',
  maxHp: 'uint16',
  mana: 'float32',
  potions: 'uint8',
  xp: 'uint32',
  level: 'uint16',
  gold: 'uint32',
  questState: 'uint8',
  questKills: 'uint8',
  frontierState: 'uint8',
  frontierKills: 'uint8',
  kills: 'uint32',
  deadUntil: 'float64',
  skillUntil: 'float64',
  potionUntil: 'float64',
  manaPotions: 'uint8',
  stamina: 'float32',
  guardUntil: 'float64',
  guardReadyAt: 'float64',
  slashReadyAt: 'float64',
  manaPotionUntil: 'float64',
  clanName: 'string',
  weaponIcon: 'string',
  shieldIcon: 'string',
  attackBonus: 'float32',
  defence: 'float32',
});
export class EnemyState extends Schema {
  x = 0;
  z = 0;
  yaw = 0;
  hp = 96;
  maxHp = 96;
  type = 'shard';
  behavior = 'idle';
  attackAt = 0;
  attackX = 0;
  attackZ = 0;
  attackRadius = 1.7;
  attackDuration = 850;
  respawnAt = 0;
  stunnedUntil = 0;
}
defineTypes(EnemyState, {
  x: 'float32',
  z: 'float32',
  yaw: 'float32',
  hp: 'uint16',
  maxHp: 'uint16',
  type: 'string',
  behavior: 'string',
  attackAt: 'float64',
  attackX: 'float32',
  attackZ: 'float32',
  attackRadius: 'float32',
  attackDuration: 'uint16',
  respawnAt: 'float64',
  stunnedUntil: 'float64',
});
export class WorldState extends Schema {
  players = new MapSchema<PlayerState>();
  dummyHp = 240;
  respawnAt = 0;
  enemies = new MapSchema<EnemyState>();
  serverTime = 0;
}
defineTypes(WorldState, {
  players: { map: PlayerState },
  enemies: { map: EnemyState },
  dummyHp: 'uint16',
  respawnAt: 'float64',
  serverTime: 'float64',
});
