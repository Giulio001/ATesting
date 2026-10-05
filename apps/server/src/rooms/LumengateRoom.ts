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
  type InputFrame,
  type AttackKind,
  type CombatEvent,
} from '@aetheria/shared';

interface Session {
  physics: PhysicsPlayer;
  queue: InputFrame[];
  lastSeq: number;
  lastInput: number;
  lastAttack: number;
  lastSkill: number;
  actionUntil: number;
}
export class LumengateRoom extends Room<WorldState> {
  maxClients = 16;
  private physics!: PhysicsWorld;
  private sessions = new Map<string, Session>();
  async onCreate() {
    await initializePhysics();
    this.physics = new PhysicsWorld();
    this.setState(new WorldState());
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
        (v.kind !== 'slash' && v.kind !== 'skill') ||
        typeof v.yaw !== 'number' ||
        !Number.isFinite(v.yaw)
      )
        return;
      this.attack(client, v.kind, Math.atan2(Math.sin(v.yaw), Math.cos(v.yaw)));
    });
    this.setSimulationInterval(() => this.tick(), DT * 1000);
  }
  onJoin(client: Client, options: { name?: unknown }) {
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
    this.sessions.set(client.sessionId, {
      physics: this.physics.createPlayer(p.x, p.z),
      queue: [],
      lastSeq: 0,
      lastInput: 0,
      lastAttack: 0,
      lastSkill: 0,
      actionUntil: 0,
    });
  }
  onLeave(client: Client) {
    const s = this.sessions.get(client.sessionId);
    if (s) this.physics.remove(s.physics);
    this.sessions.delete(client.sessionId);
    this.state.players.delete(client.sessionId);
  }
  onDispose() {
    this.physics?.dispose();
  }
  private tick() {
    const now = Date.now();
    for (const [id, session] of this.sessions) {
      const p = this.state.players.get(id)!;
      const input = session.queue.shift();
      const frame = input ?? { seq: p.ack, x: 0, z: 0, run: false, yaw: p.yaw };
      // Old input is never held forever: a tab losing focus stops immediately.
      if (now - session.lastInput > 400) {
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
      p.running = p.moving && frame.run;
    }
    this.physics.step();
    for (const [id, s] of this.sessions) {
      const t = s.physics.body.translation(),
        p = this.state.players.get(id)!;
      p.x = t.x;
      p.y = t.y;
      p.z = t.z;
    }
    if (this.state.dummyHp === 0 && now >= this.state.respawnAt) {
      this.state.dummyHp = DUMMY.maxHp;
      this.state.respawnAt = 0;
      this.broadcast('respawn');
    }
  }
  private attack(client: Client, kind: AttackKind, yaw: number) {
    const s = this.sessions.get(client.sessionId),
      p = this.state.players.get(client.sessionId);
    if (!s || !p) return;
    const now = Date.now(),
      config = ATTACKS[kind];
    if (
      now < s.actionUntil ||
      now - (kind === 'skill' ? s.lastSkill : s.lastAttack) < config.cooldown
    )
      return;
    if (kind === 'skill') s.lastSkill = now;
    else s.lastAttack = now;
    s.actionUntil = now + config.duration * 1000;
    p.yaw = yaw;
    const hit =
      this.state.dummyHp > 0 &&
      inAttackRange(p.x, p.z, yaw, kind) &&
      hasLineOfSight(p.x, p.z, DUMMY.x, DUMMY.z);
    if (hit) {
      this.state.dummyHp = Math.max(0, this.state.dummyHp - config.damage);
      if (this.state.dummyHp === 0) this.state.respawnAt = now + 6000;
    }
    const event: CombatEvent = {
      playerId: client.sessionId,
      kind,
      x: p.x,
      z: p.z,
      yaw,
      hit,
      damage: hit ? config.damage : 0,
      hp: this.state.dummyHp,
    };
    this.broadcast('combat', event);
  }
}
