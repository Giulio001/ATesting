import { randomUUID } from 'node:crypto';
import { hasLineOfSight, WORLD_BOUND, type CombatEvent, type CombatHit } from '@aetheria/shared';

interface Shot {
  event: CombatEvent;
  x: number;
  z: number;
  travelled: number;
  damage: number;
}
interface Target {
  id: string;
  x: number;
  z: number;
  radius: number;
}
export class ProjectileSystem {
  private shots: Shot[] = [];
  constructor(
    private callbacks: {
      alive(id: string): boolean;
      targets(id: string): Target[];
      hit(
        id: string,
        target: string,
        event: CombatEvent,
        damage: number,
        now: number,
      ): CombatHit | null;
      broadcast(event: CombatEvent): void;
    },
  ) {}
  spawn(event: CombatEvent, speed: number, range: number, damage: number) {
    const shotEvent = { ...event, projectile: { id: randomUUID(), speed, range }, hits: [] };
    this.shots.push({ event: shotEvent, x: event.x, z: event.z, travelled: 0, damage });
    this.callbacks.broadcast(shotEvent);
  }
  tick(dt: number, now: number) {
    for (let i = this.shots.length - 1; i >= 0; i--) {
      const shot = this.shots[i],
        projectile = shot.event.projectile!;
      const step = Math.min(projectile.speed * dt, projectile.range - shot.travelled);
      const dx = Math.sin(shot.event.yaw) * step,
        dz = Math.cos(shot.event.yaw) * step;
      let target: Target | undefined,
        nearest = 1.01;
      for (const candidate of this.callbacks.targets(shot.event.playerId)) {
        // Intersect the whole swept segment so small, fast projectiles cannot skip targets.
        const ux = Math.sin(shot.event.yaw),
          uz = Math.cos(shot.event.yaw);
        const rx = candidate.x - shot.x,
          rz = candidate.z - shot.z;
        const along = rx * ux + rz * uz;
        const perpendicularSq = rx * rx + rz * rz - along * along;
        if (perpendicularSq > candidate.radius ** 2) continue;
        const extent = Math.sqrt(Math.max(0, candidate.radius ** 2 - perpendicularSq));
        if (along + extent < 0 || along - extent > step) continue;
        const t = Math.max(0, along - extent) / Math.max(step, 1e-8);
        if (t < nearest && hasLineOfSight(shot.x, shot.z, shot.x + dx * t, shot.z + dz * t)) {
          target = candidate;
          nearest = t;
        }
      }
      const alive = this.callbacks.alive(shot.event.playerId);
      const blocked = !hasLineOfSight(shot.x, shot.z, shot.x + dx, shot.z + dz);
      shot.x += dx * (target ? nearest : 1);
      shot.z += dz * (target ? nearest : 1);
      shot.travelled += step;
      if (
        target ||
        blocked ||
        !alive ||
        shot.travelled >= projectile.range ||
        Math.abs(shot.x) > WORLD_BOUND ||
        Math.abs(shot.z) > WORLD_BOUND
      ) {
        const hit =
          target && alive
            ? this.callbacks.hit(shot.event.playerId, target.id, shot.event, shot.damage, now)
            : null;
        this.callbacks.broadcast({
          ...shot.event,
          x: shot.x,
          z: shot.z,
          impactOnly: true,
          hits: hit ? [hit] : [],
          hit: !!hit,
          damage: hit?.damage ?? 0,
        });
        this.shots.splice(i, 1);
      }
    }
  }
}
