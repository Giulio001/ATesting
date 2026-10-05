export const TICK_RATE = 30;
export const DT = 1 / TICK_RATE;
export const PLAYER_RADIUS = 0.34;
export const PLAYER_HEIGHT = 0.91;
export const WALK_SPEED = 3.4;
export const RUN_SPEED = 5.6;
export const WORLD_BOUND = 24;
export const DUMMY = { x: 3, z: -3, maxHp: 240 };
export const SPAWN = { x: -3, z: 5 };
export const ATTACKS = {
  slash: { cooldown: 650, range: 2.8, damage: 24, duration: 0.48 },
  skill: { cooldown: 5000, range: 4, damage: 65, duration: 0.75 },
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
}
export interface Obstacle {
  x: number;
  z: number;
  hx: number;
  hz: number;
  height: number;
  kind: 'house' | 'wall' | 'shrine' | 'tree' | 'rock';
}
export const OBSTACLES: Obstacle[] = [
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
  if (len > 1) {
    x /= len;
    z /= len;
  }
  return {
    seq: v.seq as number,
    x,
    z,
    run: v.run,
    yaw: Math.atan2(Math.sin(v.yaw), Math.cos(v.yaw)),
  };
}
export function inAttackRange(x: number, z: number, yaw: number, kind: AttackKind) {
  const dx = DUMMY.x - x,
    dz = DUMMY.z - z;
  const distance = Math.hypot(dx, dz);
  if (distance > ATTACKS[kind].range) return false;
  if (kind === 'skill' || distance < 0.65) return true;
  return (dx * Math.sin(yaw) + dz * Math.cos(yaw)) / distance >= 0.35;
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
