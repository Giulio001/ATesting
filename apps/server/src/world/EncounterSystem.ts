import { EnemyState, type PlayerState, type WorldState } from '@aetheria/shared/schema';
import type { PhysicsWorld, PhysicsPlayer } from '@aetheria/shared/physics';
import {
  ENEMY_SPAWNS,
  MAX_LEVEL,
  BATTLE_START,
  QUEST_GOAL,
  SPAWN,
  DT,
  PLAYER_HEIGHT,
  canInteract,
  inAttackRange,
  hasLineOfSight,
  attackDamage,
  xpRequired,
  type AttackKind,
  type CombatHit,
  type DamageEvent,
  type RewardEvent,
  type DialogueEvent,
} from '@aetheria/shared';

interface EnemyRuntime {
  lastAttack: number;
  contributors: Map<string, number>;
}
interface Callbacks {
  physicsPlayer(id: string): PhysicsPlayer | undefined;
  resetPlayer(id: string): void;
  damage(event: DamageEvent): void;
  reward(id: string, event: RewardEvent): void;
  dialogue(id: string, event: DialogueEvent): void;
  loot?(id: string, elite: boolean): void;
}
export class EncounterSystem {
  private runtime = new Map<string, EnemyRuntime>();
  private lastRegen = 0;
  constructor(
    private state: WorldState,
    private physics: PhysicsWorld,
    private events: Callbacks,
  ) {
    for (const spawn of ENEMY_SPAWNS) {
      const e = new EnemyState();
      e.x = spawn.x;
      e.z = spawn.z;
      e.hp = e.maxHp = spawn.hp;
      e.type = spawn.type;
      state.enemies.set(spawn.id, e);
      this.runtime.set(spawn.id, { lastAttack: 0, contributors: new Map() });
    }
  }
  interact(id: string) {
    const p = this.state.players.get(id);
    if (!p || p.hp <= 0 || !canInteract(p.x, p.z)) return;
    p.hp = p.maxHp;
    p.mana = 100;
    p.potions = Math.max(p.potions, 3);
    let text: string;
    if (p.questState === 0) {
      p.questState = 1;
      text =
        'Le schegge del Vuoto hanno oltrepassato il confine a sud. Attraversa l’arco, sconfiggine tre e torna da me. Ti affido tre pozioni: usale con H. La luce di Lumengate ti protegge finché resti in città.';
    } else if (p.questState === 1) {
      text = `La fenditura si trova oltre l’arco a sud. Hai sconfitto ${p.questKills} di ${QUEST_GOAL} schegge. Il cerchio rosso annuncia il loro attacco: esci dall’area prima che si chiuda. Ho rifornito le tue pozioni.`;
    } else if (p.questState === 2) {
      p.questState = 3;
      this.grant(id, 100, 75, true);
      text =
        'La porta è di nuovo al sicuro. Accetta queste 75 monete e la mia riconoscenza. Nelle profondità della fenditura resta un Custode del Vuoto: affrontalo quando ti sentirai pronto. La tua prima avventura è compiuta.';
    } else {
      text =
        'Bentornato, Guardian. Ho curato le tue ferite e rifornito le pozioni. Se cerchi una prova più difficile, il Custode del Vuoto attende vicino alla fenditura. Lumengate sarà sempre il tuo rifugio.';
    }
    this.events.dialogue(id, {
      title: 'Ser Aurel · Custode della porta',
      text,
      complete: p.questState === 3,
    });
  }
  potion(id: string, now: number) {
    const p = this.state.players.get(id);
    if (!p || p.hp <= 0 || p.hp >= p.maxHp || p.potions <= 0 || now < p.potionUntil) return;
    p.potions--;
    p.hp = Math.min(p.maxHp, p.hp + 45);
    p.potionUntil = now + 3000;
  }
  strike(id: string, kind: AttackKind, yaw: number, now: number): CombatHit[] {
    const p = this.state.players.get(id);
    if (!p || p.hp <= 0 || p.z < BATTLE_START) return [];
    const hits: CombatHit[] = [];
    this.state.enemies.forEach((e, key) => {
      if (
        e.hp <= 0 ||
        !inAttackRange(p.x, p.z, yaw, kind, e.x, e.z) ||
        !hasLineOfSight(p.x, p.z, e.x, e.z)
      )
        return;
      const damage = Math.round(attackDamage(kind, p.level) * (1 + p.attackBonus / 50));
      e.hp = Math.max(0, e.hp - damage);
      if (kind === 'skill') {
        e.stunnedUntil = now + 1000;
        e.attackAt = 0;
        e.behavior = 'stunned';
      }
      this.runtime.get(key)!.contributors.set(id, now);
      hits.push({ targetId: key, x: e.x, z: e.z, damage, hp: e.hp, killed: e.hp === 0 });
      if (e.hp === 0) {
        e.behavior = 'dead';
        e.attackAt = 0;
        e.respawnAt = now + (e.type === 'sentinel' ? 45000 : 20000);
        for (const [participant, time] of this.runtime.get(key)!.contributors) {
          const hero = this.state.players.get(participant);
          if (
            !hero ||
            hero.hp <= 0 ||
            now - time > 15000 ||
            Math.hypot(hero.x - e.x, hero.z - e.z) > 12
          )
            continue;
          hero.kills++;
          if (e.type === 'shard' && hero.questState === 1) {
            hero.questKills = Math.min(QUEST_GOAL, hero.questKills + 1);
            if (hero.questKills === QUEST_GOAL) hero.questState = 2;
          }
          this.events.loot?.(participant, e.type === 'sentinel');
          this.grant(
            participant,
            e.type === 'sentinel' ? 100 : 40,
            e.type === 'sentinel' ? 40 : 12,
            false,
          );
        }
        this.runtime.get(key)!.contributors.clear();
      }
    });
    return hits;
  }
  private grant(id: string, xp: number, gold: number, quest: boolean) {
    const p = this.state.players.get(id)!;
    p.xp += xp;
    p.gold += gold;
    while (p.level < MAX_LEVEL && p.xp >= xpRequired(p.level)) {
      p.xp -= xpRequired(p.level);
      p.level++;
      p.maxHp += 10;
      p.hp = p.maxHp;
      p.mana = 100;
    }
    this.events.reward(id, { xp, gold, level: p.level, quest });
  }
  tick(now: number) {
    const regen = now - this.lastRegen >= 1000;
    if (regen) this.lastRegen = now;
    this.state.serverTime = now;
    this.state.players.forEach((p, id) => {
      if (p.hp <= 0) {
        if (now >= p.deadUntil) {
          const body = this.events.physicsPlayer(id);
          if (body) this.physics.teleport(body, SPAWN.x, PLAYER_HEIGHT, SPAWN.z);
          p.x = SPAWN.x;
          p.y = PLAYER_HEIGHT;
          p.z = SPAWN.z;
          p.deadUntil = 0;
          p.hp = p.maxHp;
          p.mana = 100;
          p.moving = p.running = false;
          this.events.resetPlayer(id);
        }
      } else {
        p.mana = Math.min(100, p.mana + DT * 6);
        p.stamina = Math.min(100, p.stamina + DT * 24);
        if (regen && p.z < BATTLE_START) p.hp = Math.min(p.maxHp, p.hp + 4);
      }
    });
    for (const spawn of ENEMY_SPAWNS) {
      const e = this.state.enemies.get(spawn.id)!,
        runtime = this.runtime.get(spawn.id)!;
      if (e.hp <= 0) {
        if (now >= e.respawnAt) {
          e.x = spawn.x;
          e.z = spawn.z;
          e.hp = e.maxHp;
          e.behavior = 'idle';
          e.respawnAt = 0;
          runtime.lastAttack = now;
        }
        continue;
      }
      if (now < e.stunnedUntil) {
        e.behavior = 'stunned';
        continue;
      }
      if (e.behavior === 'windup') {
        if (now >= e.attackAt) {
          const radius = e.type === 'sentinel' ? 2.35 : 1.7;
          this.state.players.forEach((p, id) => {
            if (p.hp <= 0 || p.z < BATTLE_START || Math.hypot(p.x - e.x, p.z - e.z) > radius)
              return;
            const raw = e.type === 'sentinel' ? 18 : 12;
            const damage = Math.max(
              1,
              Math.round(Math.max(1, raw / (1 + p.defence / 100)) * (now < p.guardUntil ? 0.4 : 1)),
            );
            p.hp = Math.max(0, p.hp - damage);
            if (p.hp === 0) {
              p.deadUntil = now + 4000;
              p.moving = p.running = false;
              this.events.resetPlayer(id);
            }
            this.events.damage({
              playerId: id,
              enemyId: spawn.id,
              damage,
              hp: p.hp,
              x: p.x,
              z: p.z,
            });
          });
          e.attackAt = 0;
          e.behavior = 'idle';
          runtime.lastAttack = now;
        }
        continue;
      }
      let nearest: PlayerState | undefined,
        distance = 8;
      this.state.players.forEach((p) => {
        if (p.hp <= 0 || p.z < BATTLE_START) return;
        const d = Math.hypot(p.x - e.x, p.z - e.z);
        if (d < distance) {
          nearest = p;
          distance = d;
        }
      });
      const leash = Math.hypot(e.x - spawn.x, e.z - spawn.z);
      if (!nearest || leash > 9) {
        const d = Math.hypot(spawn.x - e.x, spawn.z - e.z);
        if (d > 0.1) {
          e.behavior = 'return';
          this.move(e, spawn.x, spawn.z, 2.3);
        } else {
          e.behavior = 'idle';
          e.hp = e.maxHp;
          runtime.contributors.clear();
        }
        continue;
      }
      e.yaw = Math.atan2(nearest.x - e.x, nearest.z - e.z);
      const reach = e.type === 'sentinel' ? 2.05 : 1.4;
      if (distance <= reach && now - runtime.lastAttack > 1600) {
        e.behavior = 'windup';
        e.attackAt = now + (e.type === 'sentinel' ? 1100 : 850);
      } else if (distance > reach * 0.8) {
        e.behavior = 'chase';
        this.move(e, nearest.x, nearest.z, e.type === 'sentinel' ? 1.45 : 1.8);
      } else e.behavior = 'idle';
    }
  }
  private move(e: EnemyState, x: number, z: number, speed: number) {
    const dx = x - e.x,
      dz = z - e.z,
      distance = Math.hypot(dx, dz);
    if (distance < 0.001) return;
    const amount = Math.min(distance, speed * DT),
      nx = e.x + (dx / distance) * amount,
      nz = Math.max(BATTLE_START + 0.3, e.z + (dz / distance) * amount);
    // The open encounter field shares obstacle tests with player combat.
    if (hasLineOfSight(e.x, e.z, nx, nz)) {
      e.x = nx;
      e.z = nz;
    }
  }
  leave(id: string) {
    for (const r of this.runtime.values()) r.contributors.delete(id);
  }
}
