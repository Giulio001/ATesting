import { Client, getStateCallbacks, type Room } from 'colyseus.js';
import type { WorldState } from '@aetheria/shared/schema';
import type { InputFrame, CombatEvent, AttackKind } from '@aetheria/shared';
export class NetworkManager {
  room?: Room<WorldState>;
  onCombat: (event: CombatEvent) => void = () => {};
  onDisconnect: () => void = () => {};
  onRespawn: () => void = () => {};
  onState: () => void = () => {};
  get id() {
    return this.room?.sessionId ?? '';
  }
  async connect(name: string) {
    const override = import.meta.env.VITE_SERVER_URL as string | undefined;
    const endpoint =
      override || `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/multiplayer`;
    const client = new Client(endpoint);
    this.room = await client.joinOrCreate<WorldState>('lumengate', { name });
    this.room.onMessage('combat', this.onCombat);
    this.room.onMessage('respawn', this.onRespawn);
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
}
