import { Room, type Client } from '@colyseus/core';
import { WorldState, PlayerState } from '@aetheria/shared/schema';
import { initializePhysics, PhysicsWorld, type PhysicsPlayer } from '@aetheria/shared/physics';
import {
  ATTACKS,
  DUMMY,
  DT,
  SPAWN,
  sanitizeInput,
  inAttackRange,
  hasLineOfSight,
  attackDamage,
  type InputFrame,
  type AttackKind,
  type CombatEvent,
} from '@aetheria/shared';
import { RPGSystem } from '../rpg/RPGSystem.ts';
import { ABILITIES, nearbyNpc, type AbilityId } from '@aetheria/shared';
import { EncounterSystem } from '../world/EncounterSystem.ts';

interface Session {
  physics: PhysicsPlayer;
  queue: InputFrame[];
  lastSeq: number;
  lastInput: number;
  lastAttack: number;
  lastSkill: number;
  actionUntil: number;
  lastInteract: number;
}
export class LumengateRoom extends Room<WorldState> {
  maxClients = 16;
  private physics!: PhysicsWorld;
  private sessions = new Map<string, Session>();
  private encounters!: EncounterSystem;
  private rpg!: RPGSystem;
  private static rooms = new Set<LumengateRoom>();
  private lastSave = 0;
  async onCreate() {
    await initializePhysics();
    this.physics = new PhysicsWorld();
    this.setState(new WorldState());
    LumengateRoom.rooms.add(this);
    this.rpg = new RPGSystem(this.state, {
      send: (id, type, value) => this.clients.find((c) => c.sessionId === id)?.send(type, value),
      changed: () => {
        for (const room of LumengateRoom.rooms) room.rpg?.all();
      },
    });
    this.encounters = new EncounterSystem(this.state, this.physics, {
      physicsPlayer: (id) => this.sessions.get(id)?.physics,
      resetPlayer: (id) => {
        const s = this.sessions.get(id);
        if (s) {
          s.queue.length = 0;
          s.actionUntil = 0;
        }
      },
      damage: (e) => this.broadcast('damage', e),
      reward: (id, e) => {
        this.clients.find((c) => c.sessionId === id)?.send('reward', e);
        this.rpg.checkpoint(id);
        this.rpg.send(id);
      },
      loot: (id, elite) => this.rpg.loot(id, elite),
      dialogue: (id, e) => this.clients.find((c) => c.sessionId === id)?.send('dialogue', e),
    });
    this.setPatchRate(1000 / 15);
    this.onMessage('input', (client, value: unknown) => {
      const session = this.sessions.get(client.sessionId),
        input = sanitizeInput(value);
      if (!session || !input || input.seq <= session.lastSeq || session.queue.length >= 10) return;
      session.lastSeq = input.seq;
      session.lastInput = Date.now();
      session.queue.push(input);
    });
    this.onMessage('attack', (client, value: unknown) => {
      if (!value || typeof value !== 'object') return;
      const v = value as Record<string, unknown>;
      if (
        (v.kind !== 'slash' && v.kind !== 'skill' && v.kind !== 'aether') ||
        typeof v.yaw !== 'number' ||
        !Number.isFinite(v.yaw)
      )
        return;
      this.attack(client, v.kind, Math.atan2(Math.sin(v.yaw), Math.cos(v.yaw)));
    });
    this.onMessage('interact', (client) => {
      const s = this.sessions.get(client.sessionId),
        now = Date.now();
      if (!s || now - s.lastInteract < 700) return;
      s.lastInteract = now;
      const p = this.state.players.get(client.sessionId)!;
      const npc = nearbyNpc(p.x, p.z);
      if (npc?.service === 'quest') {
        this.encounters.interact(client.sessionId);
        this.rpg.checkpoint(client.sessionId);
        this.rpg.send(client.sessionId);
      } else if (npc)
        this.clients
          .find((c) => c.sessionId === client.sessionId)
          ?.send('service', { npc: npc.id, service: npc.service });
    });
    this.onMessage('potion', (client) => {
      this.encounters.potion(client.sessionId, Date.now());
      this.rpg.checkpoint(client.sessionId);
    });
    this.onMessage('mana-potion', (client) => {
      const p = this.state.players.get(client.sessionId)!;
      const now = Date.now();
      if (p.hp > 0 && p.mana < 100 && p.manaPotions > 0 && now >= p.manaPotionUntil) {
        p.mana = Math.min(100, p.mana + 50);
        p.manaPotions--;
        p.manaPotionUntil = now + 3000;
        this.rpg.checkpoint(client.sessionId);
      }
    });
    this.onMessage('ability', (client, value) => {
      if (!value || typeof value !== 'object') return;
      const v = value as Record<string, unknown>;
      if (
        !['SLASH', 'GUARD', 'BURST'].includes(String(v.ability)) ||
        typeof v.yaw !== 'number' ||
        !Number.isFinite(v.yaw)
      )
        return;
      this.ability(client, v.ability as AbilityId, v.yaw);
    });
    this.onMessage('rpg-request', (c) => {
      const profile = this.rpg.profiles.get(c.sessionId);
      if (profile) c.send('profile', { token: profile.token });
      this.rpg.send(c.sessionId);
    });
    this.onMessage('recall', (c) => {
      const p = this.state.players.get(c.sessionId)!,
        s = this.sessions.get(c.sessionId)!;
      if (p.hp <= 0) return;
      if (
        [...this.state.enemies.values()].some(
          (e) => e.hp > 0 && Math.hypot(e.x - p.x, e.z - p.z) < 8,
        )
      ) {
        c.send('notice', 'Allontanati dai nemici prima di tornare in città.');
        return;
      }
      this.physics.teleport(s.physics, SPAWN.x, p.y, SPAWN.z);
      s.queue.length = 0;
      p.x = SPAWN.x;
      p.z = SPAWN.z;
      p.travelRevision++;
      c.send('notice', 'Bentornato a Lumengate.');
    });
    this.onMessage('inventory', (c, v) => this.rpg.inventory(c.sessionId, v));
    this.onMessage('buy', (c, v) => this.rpg.buy(c.sessionId, v));
    this.onMessage('clan', (c, v) => this.rpg.clan(c.sessionId, v));
    this.onMessage('chat', (c, v) => {
      const chat = this.rpg.chat(c.sessionId, v);
      if (!chat) return;
      for (const target of this.clients) {
        if (
          chat.message.channel === 'GLOBAL' ||
          this.rpg.profiles.get(target.sessionId)?.clanId === chat.clanId
        )
          target.send('chat', chat.message);
      }
    });
    this.setSimulationInterval(() => this.tick(), DT * 1000);
  }
  onJoin(client: Client, options: { name?: unknown; token?: unknown }) {
    const p = new PlayerState(),
      index = this.sessions.size;
    p.x = SPAWN.x + (index % 4) * 1.1;
    p.z = SPAWN.z + Math.floor(index / 4) * 1.1;
    p.yaw = Math.PI;
    p.name =
      typeof options.name === 'string'
        ? options.name
            .replace(/[<>\u0000-\u001f]/g, '')
            .trim()
            .slice(0, 18) || 'Viandante'
        : 'Viandante';
    this.state.players.set(client.sessionId, p);
    try {
      this.rpg.join(client.sessionId, p.name, options.token);
    } catch (error) {
      this.state.players.delete(client.sessionId);
      throw error;
    }
    this.sessions.set(client.sessionId, {
      physics: this.physics.createPlayer(p.x, p.z),
      queue: [],
      lastSeq: 0,
      lastInput: 0,
      lastAttack: 0,
      lastSkill: 0,
      actionUntil: 0,
      lastInteract: 0,
    });
  }
  onLeave(client: Client) {
    const s = this.sessions.get(client.sessionId);
    if (s) this.physics.remove(s.physics);
    this.rpg.leave(client.sessionId);
    this.sessions.delete(client.sessionId);
    this.encounters.leave(client.sessionId);
    this.state.players.delete(client.sessionId);
  }
  onDispose() {
    LumengateRoom.rooms.delete(this);
    for (const id of this.sessions.keys()) this.rpg.checkpoint(id);
    this.physics?.dispose();
  }
  private tick() {
    const now = Date.now();
    for (const [id, session] of this.sessions) {
      const p = this.state.players.get(id)!;
      const input = session.queue.shift();
      const frame = input ?? { seq: p.ack, x: 0, z: 0, run: false, yaw: p.yaw };
      // Old input is never held forever: a tab losing focus stops immediately.
      if (p.hp <= 0 || now - session.lastInput > 400) {
        frame.x = 0;
        frame.z = 0;
        session.queue.length = 0;
      }
      this.physics.move(session.physics, frame);
      if (input) {
        p.ack = input.seq;
        if (now > session.actionUntil) p.yaw = input.yaw;
      }
      p.moving = Math.hypot(frame.x, frame.z) > 0.01;
      p.running = p.moving;
    }
    this.physics.step();
    for (const [id, s] of this.sessions) {
      const t = s.physics.body.translation(),
        p = this.state.players.get(id)!;
      p.x = t.x;
      p.y = t.y;
      p.z = t.z;
    }
    this.encounters.tick(now);
    if (now - this.lastSave > 5000) {
      this.lastSave = now;
      for (const id of this.sessions.keys()) this.rpg.checkpoint(id);
    }
    if (this.state.dummyHp === 0 && now >= this.state.respawnAt) {
      this.state.dummyHp = DUMMY.maxHp;
      this.state.respawnAt = 0;
      this.broadcast('respawn');
    }
  }
  private ability(client: Client, ability: AbilityId, yaw: number) {
    if (ability !== 'GUARD') {
      this.attack(client, ability === 'SLASH' ? 'aether' : 'skill', yaw);
      return;
    }
    const p = this.state.players.get(client.sessionId),
      now = Date.now();
    if (!p || p.hp <= 0 || now < p.guardReadyAt || p.mana < 12 || p.stamina < 30) return;
    p.mana -= 12;
    p.stamina -= 30;
    p.guardReadyAt = now + 6500;
    p.guardUntil = now + 2500;
    this.broadcast('guard', { playerId: client.sessionId, x: p.x, z: p.z, until: p.guardUntil });
  }
  private attack(client: Client, kind: AttackKind, yaw: number) {
    const s = this.sessions.get(client.sessionId),
      p = this.state.players.get(client.sessionId);
    if (!s || !p || p.hp <= 0) return;
    const now = Date.now(),
      config = ATTACKS[kind];
    if (
      now < s.actionUntil ||
      now - (kind === 'skill' ? s.lastSkill : s.lastAttack) < config.cooldown
    )
      return;
    if (kind === 'slash') {
      if (p.stamina < 25 || !this.rpg.profiles.get(client.sessionId)?.equipment.WEAPON) return;
      p.stamina -= 25;
    } else {
      const ability = kind === 'aether' ? 'SLASH' : 'BURST';
      const rules = ABILITIES[ability];
      const ready = kind === 'aether' ? p.slashReadyAt : p.skillUntil;
      if (
        now < ready ||
        p.mana < rules.cost ||
        !this.rpg.profiles.get(client.sessionId)?.equipment.WEAPON
      )
        return;
      p.mana -= rules.cost;
      if (kind === 'aether') p.slashReadyAt = now + rules.cooldown;
      else p.skillUntil = now + rules.cooldown;
    }
    if (kind === 'skill') s.lastSkill = now;
    else s.lastAttack = now;
    s.actionUntil = now + config.duration * 1000;
    p.yaw = yaw;
    const hit =
      this.state.dummyHp > 0 &&
      inAttackRange(p.x, p.z, yaw, kind) &&
      hasLineOfSight(p.x, p.z, DUMMY.x, DUMMY.z);
    const damage = Math.round(attackDamage(kind, p.level) * (1 + p.attackBonus / 50));
    const hits = this.encounters.strike(client.sessionId, kind, yaw, now);
    if (hit) {
      this.state.dummyHp = Math.max(0, this.state.dummyHp - damage);
      hits.push({
        targetId: 'dummy',
        x: DUMMY.x,
        z: DUMMY.z,
        damage,
        hp: this.state.dummyHp,
        killed: this.state.dummyHp === 0,
      });
      if (this.state.dummyHp === 0) this.state.respawnAt = now + 6000;
    }
    const event: CombatEvent = {
      playerId: client.sessionId,
      kind,
      x: p.x,
      z: p.z,
      yaw,
      hit: hits.length > 0,
      damage: hits.reduce((sum, h) => sum + h.damage, 0),
      hp: this.state.dummyHp,
      hits,
    };
    this.broadcast('combat', event);
  }
}
