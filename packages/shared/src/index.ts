import { experienceToNextLevel } from './aetheria/progression.js';
import { MAGE_SPELL } from './rpg.js';
import { FRONTIER_SPAWNS } from './frontier.js';
export * from './frontier.js';
export { MAX_LEVEL, experienceToNextLevel } from './aetheria/progression.js';
export const TICK_RATE = 30;
export const DT = 1 / TICK_RATE;
export const PLAYER_RADIUS = 0.34;
export const PLAYER_HEIGHT = 0.91;
// Movement is always running, as in Aetheria.
export const RUN_SPEED = 5.6;
export const WORLD_BOUND = 24;
export const DUMMY = { x: 3, z: -3, maxHp: 240 };
export const SPAWN = { x: -3, z: 5 };
export const CUSTODIAN = { x: -2, z: 1, range: 2.8 };
export const BATTLE_START = 10;
export const QUEST_GOAL = 3;
export const ENEMY_SPAWNS = [
  { id: 'shard-west', type: 'shard', x: -3.5, z: 15, hp: 96 },
  { id: 'shard-east', type: 'shard', x: 3.5, z: 15, hp: 96 },
  { id: 'shard-south', type: 'shard', x: 0, z: 18, hp: 96 },
  { id: 'sentinel', type: 'sentinel', x: 0, z: 21, hp: 260 },
  ...FRONTIER_SPAWNS,
] as const;
export const ATTACKS = {
  slash: { cooldown: 650, range: 2.8, damage: 58, duration: 0.48 },
  aether: { cooldown: 2600, range: 2.5, damage: 132, duration: 0.48 },
  skill: { cooldown: 7000, range: 3.8, damage: 175, duration: 0.75 },
} as const;
export type AttackKind = keyof typeof ATTACKS;
export interface InputFrame {
  seq: number;
  x: number;
  z: number;
  run: boolean;
  yaw: number;
}
export interface CombatEvent {
  playerId: string;
  kind: AttackKind;
  x: number;
  z: number;
  yaw: number;
  hit: boolean;
  damage: number;
  hp: number;
  hits: CombatHit[];
  heroClass?: string;
  projectile?: { id: string; speed: number; range: number };
  impactOnly?: boolean;
}
export interface CombatHit {
  targetId: string;
  x: number;
  z: number;
  damage: number;
  hp: number;
  killed: boolean;
}
export interface DamageEvent {
  playerId: string;
  enemyId: string;
  damage: number;
  hp: number;
  x: number;
  z: number;
}
export interface RewardEvent {
  xp: number;
  gold: number;
  level: number;
  quest: boolean;
}
export interface DialogueEvent {
  title: string;
  text: string;
  complete: boolean;
  choices?: { id: string; label: string }[];
}
export interface Obstacle {
  x: number;
  z: number;
  hx: number;
  hz: number;
  height: number;
  kind: 'house' | 'wall' | 'shrine' | 'tree' | 'rock' | 'well' | 'gate' | 'camp' | 'beacon';
}
export const OBSTACLES: Obstacle[] = [
  { x: 36, z: -4, hx: 1.5, hz: 1.5, height: 2.2, kind: 'camp' },
  { x: 61, z: -5, hx: 1.15, hz: 1.15, height: 0.35, kind: 'beacon' },
  { x: 27, z: -14, hx: 3, hz: 10, height: 3, kind: 'wall' },
  { x: 27, z: 14, hx: 3, hz: 10, height: 3, kind: 'wall' },
  { x: 45, z: -13, hx: 1, hz: 1, height: 5, kind: 'tree' },
  { x: 47, z: 14, hx: 1, hz: 1, height: 6, kind: 'tree' },
  { x: 56, z: -14, hx: 1, hz: 1, height: 6, kind: 'tree' },
  { x: 60, z: 16, hx: 1, hz: 1, height: 5, kind: 'tree' },
  { x: 70, z: -15, hx: 1, hz: 1, height: 6, kind: 'tree' },
  { x: 75, z: 17, hx: 1, hz: 1, height: 5, kind: 'tree' },
  { x: 54, z: -2, hx: 1.3, hz: 1.1, height: 1.5, kind: 'rock' },
  { x: 59, z: 8, hx: 1.2, hz: 1.1, height: 1.4, kind: 'rock' },
  { x: 0, z: 0, hx: 1.55, hz: 1.55, height: 1.1, kind: 'well' },
  { x: -5.6, z: 10, hx: 0.5, hz: 0.5, height: 5, kind: 'gate' },
  { x: 5.6, z: 10, hx: 0.5, hz: 0.5, height: 5, kind: 'gate' },
  { x: -11, z: -6, hx: 3.2, hz: 3.1, height: 6, kind: 'house' },
  { x: 11, z: -8, hx: 3.4, hz: 3.2, height: 7, kind: 'house' },
  { x: -12, z: 7, hx: 2.8, hz: 2.7, height: 5, kind: 'house' },
  { x: 12, z: 6, hx: 2.5, hz: 2.8, height: 5.5, kind: 'house' },
  { x: 0, z: -12, hx: 2.1, hz: 1.5, height: 1, kind: 'shrine' },
  { x: -7, z: -17, hx: 1.2, hz: 1.1, height: 7, kind: 'wall' },
  { x: 7, z: -17, hx: 1.2, hz: 1.1, height: 7, kind: 'wall' },
  { x: -16, z: -16, hx: 0.6, hz: 0.6, height: 4, kind: 'tree' },
  { x: 17, z: -15, hx: 0.6, hz: 0.6, height: 5, kind: 'tree' },
  { x: -18, z: 3, hx: 0.6, hz: 0.6, height: 4, kind: 'tree' },
  { x: 17, z: 12, hx: 0.6, hz: 0.6, height: 4, kind: 'tree' },
  { x: -17, z: 15, hx: 0.6, hz: 0.6, height: 5, kind: 'tree' },
  { x: -6, z: 15, hx: 0.8, hz: 0.7, height: 1.3, kind: 'rock' },
  { x: 9, z: 15, hx: 0.9, hz: 0.7, height: 1.2, kind: 'rock' },
];
export function sanitizeInput(value: unknown): InputFrame | null {
  if (!value || typeof value !== 'object') return null;
  const v = value as Record<string, unknown>;
  if (
    !Number.isSafeInteger(v.seq) ||
    (v.seq as number) < 1 ||
    (v.seq as number) > 1e9 ||
    typeof v.x !== 'number' ||
    !Number.isFinite(v.x) ||
    typeof v.z !== 'number' ||
    !Number.isFinite(v.z) ||
    typeof v.yaw !== 'number' ||
    !Number.isFinite(v.yaw) ||
    typeof v.run !== 'boolean'
  )
    return null;
  let x = Math.max(-1, Math.min(1, v.x)),
    z = Math.max(-1, Math.min(1, v.z));
  const len = Math.hypot(x, z);
  if (len > 0.01) {
    x /= len;
    z /= len;
  } else {
    x = 0;
    z = 0;
  }
  return {
    seq: v.seq as number,
    x,
    z,
    run: Math.hypot(x, z) > 0.01,
    yaw: Math.atan2(Math.sin(v.yaw), Math.cos(v.yaw)),
  };
}
export function inAttackRange(
  x: number,
  z: number,
  yaw: number,
  kind: AttackKind,
  tx = DUMMY.x,
  tz = DUMMY.z,
  cls = 'GUARDIAN',
) {
  if (cls === 'VOID_KNIGHT' && kind === 'aether') {
    const along = (tx - x) * Math.sin(yaw) + (tz - z) * Math.cos(yaw);
    const across = Math.abs((tx - x) * Math.cos(yaw) - (tz - z) * Math.sin(yaw));
    return along >= 0 && along <= MAGE_SPELL.beamLength && across <= MAGE_SPELL.beamHalfWidth;
  }
  if (cls === 'VOID_KNIGHT' && kind === 'skill') {
    x += Math.sin(yaw) * MAGE_SPELL.novaAhead;
    z += Math.cos(yaw) * MAGE_SPELL.novaAhead;
  }
  const dx = tx - x,
    dz = tz - z;
  const distance = Math.hypot(dx, dz);
  if (distance > ATTACKS[kind].range) return false;
  if (kind === 'skill' || distance < 0.65) return true;
  return (dx * Math.sin(yaw) + dz * Math.cos(yaw)) / distance >= 0.35;
}
export function xpRequired(level: number) {
  return experienceToNextLevel(level);
}
export function attackDamage(kind: AttackKind, level: number) {
  return ATTACKS[kind].damage + (level - 1) * (kind === 'skill' ? 5 : 2);
}
export function canInteract(x: number, z: number) {
  return Math.hypot(x - CUSTODIAN.x, z - CUSTODIAN.z) <= CUSTODIAN.range;
}
export function hasLineOfSight(x: number, z: number, tx: number, tz: number) {
  return !OBSTACLES.some((o) => {
    let lo = 0,
      hi = 1;
    for (const [start, delta, min, max] of [
      [x, tx - x, o.x - o.hx, o.x + o.hx],
      [z, tz - z, o.z - o.hz, o.z + o.hz],
    ]) {
      if (Math.abs(delta) < 1e-8) {
        if (start < min || start > max) return false;
      } else {
        const a = (min - start) / delta,
          b = (max - start) / delta;
        lo = Math.max(lo, Math.min(a, b));
        hi = Math.min(hi, Math.max(a, b));
        if (lo > hi) return false;
      }
    }
    return true;
  });
}

export * from './rpg.ts';
