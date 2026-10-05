import { Client, getStateCallbacks, type Room } from 'colyseus.js';
import type { RPGSnapshot, ChatMessage } from '@aetheria/shared';
import type { WorldState } from '@aetheria/shared/schema';
import type {
  InputFrame,
  CombatEvent,
  AttackKind,
  DamageEvent,
  RewardEvent,
  DialogueEvent,
} from '@aetheria/shared';
export class NetworkManager {
  room?: Room<WorldState>;
  onCombat: (event: CombatEvent) => void = () => {};
  onDisconnect: () => void = () => {};
  onRespawn: () => void = () => {};
  onState: () => void = () => {};
  onDamage: (event: DamageEvent) => void = () => {};
  onReward: (event: RewardEvent) => void = () => {};
  onDialogue: (event: DialogueEvent) => void = () => {};
  onRPG: (snapshot: RPGSnapshot) => void = () => {};
  onChat: (e: ChatMessage) => void = () => {};
  onNotice: (text: string) => void = () => {};
  onService: (e: { npc: string; service: string }) => void = () => {};
  onGuard: (e: { playerId: string; x: number; z: number; until: number }) => void = () => {};
  send(type: string, value?: unknown) {
    this.room?.send(type, value);
  }
  get id() {
    return this.room?.sessionId ?? '';
  }
  async connect(name: string, heroClass = 'GUARDIAN') {
    const override = import.meta.env.VITE_SERVER_URL as string | undefined;
    const endpoint =
      override || `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/multiplayer`;
    const client = new Client(endpoint);
    let token: string | null = null;
    try {
      token = localStorage.getItem('aetheria3d.profile');
    } catch {}
    this.room = await client.joinOrCreate<WorldState>('lumengate', { name, token, heroClass });
    this.room.onMessage('profile', (e: { token: string }) => {
      try {
        localStorage.setItem('aetheria3d.profile', e.token);
      } catch {}
    });
    this.room.onMessage('rpg', this.onRPG);
    this.room.onMessage('chat', this.onChat);
    this.room.onMessage('notice', this.onNotice);
    this.room.onMessage('service', this.onService);
    this.room.onMessage('guard', this.onGuard);
    this.room.send('rpg-request');
    this.room.onMessage('combat', this.onCombat);
    this.room.onMessage('respawn', this.onRespawn);
    this.room.onMessage('damage', this.onDamage);
    this.room.onMessage('reward', this.onReward);
    this.room.onMessage('dialogue', this.onDialogue);
    this.room.onLeave(() => this.onDisconnect());
    this.room.onError(() => this.onDisconnect());
    this.room.onStateChange(() => this.onState());
    // The SDK installs the schema decoder before delivering state callbacks.
    getStateCallbacks(this.room);
    await new Promise<void>((resolve, reject) => {
      if (this.room!.state?.players?.has(this.id)) {
        resolve();
        return;
      }
      const timeout = setTimeout(() => {
        this.room?.leave();
        reject(new Error('Il server non ha inviato lo stato iniziale.'));
      }, 8000);
      const listener = () => {
        if (this.room!.state?.players?.has(this.id)) {
          clearTimeout(timeout);
          this.room!.onStateChange.remove(listener);
          resolve();
        }
      };
      this.room!.onStateChange(listener);
    });
  }
  input(frame: InputFrame) {
    this.room?.send('input', frame);
  }
  attack(kind: AttackKind, yaw: number) {
    this.room?.send('attack', { kind, yaw });
  }
  interact() {
    this.room?.send('interact');
  }
  potion() {
    this.room?.send('potion');
  }
}
