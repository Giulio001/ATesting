import { EnemyState, type PlayerState, type WorldState } from '@aetheria/shared/schema';
import type { PhysicsWorld, PhysicsPlayer } from '@aetheria/shared/physics';
import {
  ENEMY_SPAWNS,
  FRONTIER,
  FRONTIER_STORY,
  GROVE,
  GROVE_STORY,
  isHostile,
  enemyRules,
  nearbyNpc,
  nearbyResident,
  dailyRotation,
  dailyCounts,
  dayIndex,
  slotProgress,
  slotDone,
  withSlotProgress,
  markSlotDone,
  type DailyQuest,
  type NpcDefinition,
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

const spawnRegion = (x: number) => (x >= 86 ? 2 : x >= 30 ? 1 : 0);
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
  frontierReward?(id: string): boolean;
  groveReward?(id: string): boolean;
  /** Toast for daily progress and other system messages. */
  notice?(id: string, text: string): void;
  /** Grants the non-gold parts of a daily reward (Aether Dust) and persists. */
  daily?(id: string, quest: DailyQuest, slot: number): void;
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
    if (!p || p.hp <= 0) return;
    const npc = nearbyNpc(p.x, p.z);
    if (npc?.id === 'frontier-beacon') {
      this.beacon(id);
      return;
    }
    if (npc?.id === 'grove-keeper') {
      this.groveKeeper(id);
      return;
    }
    if (npc?.id === 'grove-altar') {
      this.groveAltar(id);
      return;
    }
    if (npc?.service === 'daily') {
      this.dailyBoard(id);
      return;
    }
    if (!npc) {
      const resident = nearbyResident(p.x, p.z);
      if (resident) {
        this.residentChat(id, resident);
        return;
      }
    }
    if (npc?.id === 'frontier-scout') {
      p.hp = p.maxHp;
      p.mana = 100;
      this.events.dialogue(id, {
        title: 'Esploratore della Frontiera',
        text: 'Il sentiero a est conduce al faro. Le pozze degli Sputaschegge colpiscono il punto in cui ti trovavi: continua a muoverti. Il Campione Cavo protegge la radura oltre il faro. Torna qui per curarti o segui il ponte a ovest per Lumengate.',
        complete: false,
      });
      return;
    }
    if (!canInteract(p.x, p.z)) return;
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
    } else if (p.frontierState === 0) {
      p.frontierState = 1;
      text =
        FRONTIER_STORY.offer +
        ' Segui il sentiero a est: il passo collega la città alla Frontiera.';
    } else if (p.frontierState === 4) {
      if (this.events.frontierReward?.(id) === false) {
        text = 'Libera una casella nello zaino per i materiali della ricompensa, poi torna da me.';
      } else {
        p.frontierState = 5;
        p.potions = Math.min(99, p.potions + FRONTIER_STORY.reward.potions);
        this.grant(id, FRONTIER_STORY.reward.xp, FRONTIER_STORY.reward.gold, true);
        text =
          'La tua scoperta conferma che una stessa corruzione lega le creature della Frontiera. Il Campione è caduto e il faro risponde allo Scudo di Lumengate. Accetta oro, esperienza, polvere e materiali: la strada verso il Bosco Sommerso sarà la prossima tappa.';
      }
    } else if (p.frontierState > 0 && p.frontierState < 4) {
      text =
        p.frontierState === 1
          ? `Nelle Terre Sanguinanti hai sconfitto ${p.frontierKills}/5 creature. Segui il sentiero a est.`
          : p.frontierState === 2
            ? 'Hai raccolto cinque tracce. Esamina la bruciatura presso il faro e interpreta il segno comune.'
            : 'La scoperta è conservata. Affronta il Campione Cavo nella radura a est del faro, poi torna da me.';
    } else {
      text =
        'Bentornato, viandante. Ho curato le tue ferite e rifornito le pozioni. Se cerchi una prova più difficile, il Custode del Vuoto attende vicino alla fenditura. Lumengate sarà sempre il tuo rifugio.';
    }
    this.events.dialogue(id, {
      title: 'Ser Aurel · Custode della porta',
      text,
      complete: p.questState === 3,
    });
  }
  private beacon(id: string) {
    const p = this.state.players.get(id)!;
    this.events.dialogue(id, {
      title: 'Faro d’Aether · Una traccia nel mondo',
      text:
        p.frontierState < 2
          ? 'La bruciatura viola vibra nella luce. Il Custode ti ha chiesto di raccogliere cinque tracce dalle creature di queste terre.'
          : p.frontierState === 2
            ? FRONTIER_STORY.clue
            : FRONTIER_STORY.discovery,
      complete: p.frontierState >= 3,
      choices:
        p.frontierState === 2
          ? [
              { id: 'corruption', label: 'La stessa corruzione' },
              { id: 'wounds', label: 'Ferite di armi diverse' },
              { id: 'weather', label: 'Il maltempo' },
            ]
          : undefined,
    });
  }
  answerFrontier(id: string, value: unknown) {
    const p = this.state.players.get(id);
    if (!p || p.hp <= 0 || p.frontierState !== 2 || nearbyNpc(p.x, p.z)?.id !== 'frontier-beacon')
      return;
    if (value === 'corruption') {
      p.frontierState = 3;
      this.events.dialogue(id, {
        title: 'Scoperta conservata',
        text: FRONTIER_STORY.discovery,
        complete: true,
      });
    } else if (value === 'wounds' || value === 'weather') {
      this.beacon(id);
    }
  }
  private groveKeeper(id: string) {
    const p = this.state.players.get(id)!;
    p.hp = p.maxHp;
    p.mana = 100;
    p.potions = Math.max(p.potions, 3);
    let text: string;
    if (p.groveState === 0) {
      p.groveState = 1;
      text = `${GROVE_STORY.offer} Segui il sentiero a est oltre la Frontiera.`;
    } else if (p.groveState === 4) {
      if (this.events.groveReward?.(id) === false) {
        text = 'Libera una casella nello zaino per i materiali della ricompensa, poi torna da me.';
      } else {
        p.groveState = 5;
        p.potions = Math.min(99, p.potions + GROVE_STORY.reward.potions);
        this.grant(id, GROVE_STORY.reward.xp, GROVE_STORY.reward.gold, true);
        text = `${GROVE_STORY.discovery} Accetta oro, esperienza, polvere e gelatine: il Custode ti ha affidato la reliquia del bosco.`;
      }
    } else if (p.groveState > 0 && p.groveState < 4) {
      text =
        p.groveState === 1
          ? `Le creature annegate infestano il bosco: ${p.groveKills}/6 liberate. Segui i canali a est.`
          : p.groveState === 2
            ? 'Sei creature liberate. Tocca l’altare sommerso e interpreta la reliquia.'
            : 'La reliquia è risvegliata. Affronta il Guardiano Annegato presso l’altare, poi torna da me.';
    } else {
      text =
        'Il bosco sommerso tace. La reliquia è al sicuro e le acque scorrono di nuovo limpide. Lumengate ti è debitrice.';
    }
    this.events.dialogue(id, {
      title: 'Custode del Bosco · Guardiano del Bosco Sommerso',
      text,
      complete: p.groveState === 5,
    });
  }
  private groveAltar(id: string) {
    const p = this.state.players.get(id)!;
    this.events.dialogue(id, {
      title: 'Altare Sommerso · La reliquia del bosco',
      text:
        p.groveState < 2
          ? 'Una reliquia verde pulsa sotto l’acqua. Serve che le creature annegate siano liberate prima che risponda.'
          : p.groveState === 2
            ? GROVE_STORY.clue
            : GROVE_STORY.discovery,
      complete: p.groveState >= 3,
      choices:
        p.groveState === 2
          ? [
              { id: 'relic', label: 'La reliquia risponde' },
              { id: 'bones', label: 'Le ossa sono troppo antiche' },
              { id: 'silence', label: 'Il bosco è senza vita' },
            ]
          : undefined,
    });
  }
  answerGrove(id: string, value: unknown) {
    const p = this.state.players.get(id);
    if (!p || p.hp <= 0 || p.groveState !== 2 || nearbyNpc(p.x, p.z)?.id !== 'grove-altar') return;
    if (value === 'relic') {
      p.groveState = 3;
      this.events.dialogue(id, {
        title: 'Reliquia risvegliata',
        text: GROVE_STORY.clue,
        complete: true,
      });
    } else this.groveAltar(id);
  }
  /** Rolls the daily board over when the UTC day changes. */
  private refreshDaily(id: string, p: PlayerState, now: number) {
    const day = dayIndex(now);
    if (p.dailyDay === day) return;
    const returning = p.dailyDay !== 0;
    p.dailyDay = day;
    p.dailyProgress = 0;
    p.dailyDone = 0;
    if (returning) this.events.notice?.(id, 'Nuove taglie giornaliere alla Bacheca.');
  }

  /** Counts one kill toward the active dailies and warns when a taglia is ready. */
  private progressDaily(id: string, type: string, elite: boolean) {
    const p = this.state.players.get(id);
    if (!p) return;
    this.refreshDaily(id, p, Date.now());
    const boss = type === 'champion' || type === 'guardian';
    dailyRotation(p.dailyDay).forEach((quest, slot) => {
      if (slotDone(p.dailyDone, slot)) return;
      if (slotProgress(p.dailyProgress, slot) >= quest.goal) return;
      if (!dailyCounts(quest, type, elite, boss)) return;
      const value = Math.min(quest.goal, slotProgress(p.dailyProgress, slot) + 1);
      p.dailyProgress = withSlotProgress(p.dailyProgress, slot, value);
      if (value >= quest.goal)
        this.events.notice?.(id, `Taglia pronta: «${quest.title}». Riscuotila dal Banditore.`);
    });
  }

  /** A townsperson answers with a flavour line and points at the daily board. */
  private residentChat(id: string, npc: NpcDefinition) {
    this.refreshDaily(id, this.state.players.get(id)!, Date.now());
    const lines = npc.lines ?? [];
    const line = lines.length
      ? lines[Math.abs(dayIndex(Date.now()) * 7 + npc.id.length) % lines.length]
      : '';
    const tail =
      ' Le taglie del giorno si leggono alla Bacheca, accanto alla fontana: cambiano ogni mattina.';
    this.events.dialogue(id, {
      title: `${npc.name} · ${npc.role}`,
      text: line ? `${line}${tail}` : `Buongiorno, viandante.${tail}`,
      complete: false,
    });
  }

  /** The bounty board: lists the three dailies and offers to claim finished ones. */
  private dailyBoard(id: string) {
    const p = this.state.players.get(id)!;
    this.refreshDaily(id, p, Date.now());
    const quests = dailyRotation(p.dailyDay);
    const text = quests
      .map((quest, slot) => {
        const progress = Math.min(quest.goal, slotProgress(p.dailyProgress, slot));
        const state = slotDone(p.dailyDone, slot)
          ? 'riscossa'
          : progress >= quest.goal
            ? 'pronta da riscuotere'
            : `${progress}/${quest.goal}`;
        const reward = `${quest.gold} oro · ${quest.xp} EXP · ${quest.dust} Polvere d’Aether${quest.potions ? ` · ${quest.potions} pozioni` : ''}`;
        return `${slot + 1}. ${quest.title} — ${state}\n${quest.description}\nRicompensa: ${reward}`;
      })
      .join('\n\n');
    const claimable = quests
      .map((quest, slot) => ({ quest, slot }))
      .filter(
        ({ quest, slot }) =>
          !slotDone(p.dailyDone, slot) && slotProgress(p.dailyProgress, slot) >= quest.goal,
      );
    this.events.dialogue(id, {
      title: 'Banditore delle Taglie · Missioni giornaliere',
      text: `${text}\n\nLe taglie si rinnovano ogni giorno alle 05:00 UTC.`,
      complete: quests.every((_, slot) => slotDone(p.dailyDone, slot)),
      choices: claimable.length
        ? claimable.map(({ quest, slot }) => ({
            id: `daily:${slot}`,
            label: `Riscuoti: ${quest.title}`,
          }))
        : undefined,
    });
  }

  answerDaily(id: string, value: unknown) {
    const p = this.state.players.get(id);
    if (!p || p.hp <= 0) return;
    const npc = nearbyNpc(p.x, p.z) ?? nearbyResident(p.x, p.z);
    if (npc?.service !== 'daily') return;
    const slot =
      typeof value === 'string' && value.startsWith('daily:') ? Number(value.slice(6)) : -1;
    this.refreshDaily(id, p, Date.now());
    const quest = dailyRotation(p.dailyDay)[slot];
    if (!quest || slotDone(p.dailyDone, slot) || slotProgress(p.dailyProgress, slot) < quest.goal) {
      this.dailyBoard(id);
      return;
    }
    p.dailyDone = markSlotDone(p.dailyDone, slot);
    if (quest.potions) p.potions = Math.min(99, p.potions + quest.potions);
    this.grant(id, quest.xp, quest.gold, true);
    this.events.daily?.(id, quest, slot);
    this.events.dialogue(id, {
      title: 'Taglia riscossa',
      text: `«${quest.title}» è compiuta. Tieni la ricompensa, avventuriero: domani la Bacheca ne offrirà altre.`,
      complete: true,
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
    if (!p || p.hp <= 0 || !isHostile(p.x, p.z)) return [];
    const hits: CombatHit[] = [];
    this.state.enemies.forEach((e, key) => {
      if (
        e.hp <= 0 ||
        !inAttackRange(p.x, p.z, yaw, kind, e.x, e.z, p.heroClass) ||
        !hasLineOfSight(p.x, p.z, e.x, e.z)
      )
        return;
      const hit = this.hitTarget(
        id,
        key,
        kind,
        Math.round(attackDamage(kind, p.level) * (1 + p.attackBonus / 50)),
        now,
      );
      if (hit) hits.push(hit);
    });
    return hits;
  }
  hitTarget(
    id: string,
    key: string,
    kind: AttackKind,
    damage: number,
    now: number,
  ): CombatHit | null {
    const p = this.state.players.get(id),
      e = this.state.enemies.get(key);
    if (
      !p ||
      p.hp <= 0 ||
      !e ||
      e.hp <= 0 ||
      !isHostile(p.x, p.z) ||
      (e.type === 'champion' && p.frontierState < 3) ||
      (e.type === 'guardian' && p.groveState < 3)
    )
      return null;
    e.hp = Math.max(0, e.hp - damage);
    if (kind === 'skill') {
      e.stunnedUntil = now + 1000;
      e.attackAt = 0;
      e.behavior = 'stunned';
    }
    this.runtime.get(key)!.contributors.set(id, now);

    if (e.hp === 0) {
      e.behavior = 'dead';
      e.attackAt = 0;
      e.respawnAt = now + enemyRules(e.type).respawn;
      for (const [participant, time] of this.runtime.get(key)!.contributors) {
        const hero = this.state.players.get(participant);
        if (
          !hero ||
          hero.hp <= 0 ||
          now - time > 15000 ||
          (participant !== id && Math.hypot(hero.x - e.x, hero.z - e.z) > 12)
        )
          continue;
        hero.kills++;
        if (e.type === 'shard' && hero.questState === 1) {
          hero.questKills = Math.min(QUEST_GOAL, hero.questKills + 1);
          if (hero.questKills === QUEST_GOAL) hero.questState = 2;
        }
        if (spawnRegion(e.x) === 1 && hero.frontierState === 1 && e.type !== 'champion') {
          hero.frontierKills = Math.min(FRONTIER.goal, hero.frontierKills + 1);
          if (hero.frontierKills === FRONTIER.goal) hero.frontierState = 2;
        }
        if (e.type === 'champion' && hero.frontierState === 3) hero.frontierState = 4;
        if (spawnRegion(e.x) === 2 && hero.groveState === 1 && e.type !== 'guardian') {
          hero.groveKills = Math.min(GROVE.goal, hero.groveKills + 1);
          if (hero.groveKills === GROVE.goal) hero.groveState = 2;
        }
        if (e.type === 'guardian' && hero.groveState === 3) hero.groveState = 4;
        const rules = enemyRules(e.type);
        this.events.loot?.(participant, rules.elite);
        this.grant(participant, rules.xp, rules.gold, false);
        this.progressDaily(participant, e.type, rules.elite);
      }
      this.runtime.get(key)!.contributors.clear();
    }
    return { targetId: key, x: e.x, z: e.z, damage, hp: e.hp, killed: e.hp === 0 };
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
      this.refreshDaily(id, p, now);
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
        if (regen && !isHostile(p.x, p.z)) p.hp = Math.min(p.maxHp, p.hp + 4);
      }
    });
    for (const spawn of ENEMY_SPAWNS) {
      const e = this.state.enemies.get(spawn.id)!,
        runtime = this.runtime.get(spawn.id)!;
      const rules = enemyRules(e.type);
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
          const radius = e.attackRadius;
          this.state.players.forEach((p, id) => {
            if (
              p.hp <= 0 ||
              !isHostile(p.x, p.z) ||
              Math.hypot(p.x - e.attackX, p.z - e.attackZ) > radius ||
              !hasLineOfSight(e.x, e.z, p.x, p.z)
            )
              return;
            const raw = rules.damage * (e.type === 'champion' && e.hp < e.maxHp / 2 ? 1.25 : 1);
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
        distance = runtime.contributors.size ? 24 : 8;
      this.state.players.forEach((p) => {
        if (p.hp <= 0 || !isHostile(p.x, p.z) || spawnRegion(p.x) !== spawnRegion(e.x)) return;
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
      const reach = rules.reach;
      if (distance <= reach && now - runtime.lastAttack > 1600) {
        e.behavior = 'windup';
        e.attackX = e.type === 'spitter' ? nearest.x : e.x;
        e.attackZ = e.type === 'spitter' ? nearest.z : e.z;
        e.attackRadius = rules.radius * (e.type === 'champion' && e.hp < e.maxHp / 2 ? 1.3 : 1);
        e.attackDuration = rules.windup;
        e.attackAt = now + rules.windup;
      } else if (distance > reach * 0.8) {
        e.behavior = 'chase';
        this.move(e, nearest.x, nearest.z, rules.speed);
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
      nz =
        e.x >= 30
          ? e.z + (dz / distance) * amount
          : Math.max(BATTLE_START + 0.3, e.z + (dz / distance) * amount);
    // The open encounter field shares obstacle tests with player combat.
    if (isHostile(nx, nz) && hasLineOfSight(e.x, e.z, nx, nz)) {
      e.x = nx;
      e.z = nz;
    }
  }
  leave(id: string) {
    for (const r of this.runtime.values()) r.contributors.delete(id);
  }
}
