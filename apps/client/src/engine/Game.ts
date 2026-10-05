import * as T from 'three';
import { PhysicsWorld, initializePhysics, type PhysicsPlayer } from '@aetheria/shared/physics';
import { DT, PLAYER_HEIGHT, SPAWN, type InputFrame, type CombatEvent } from '@aetheria/shared';
import { World } from '../world/World';
import { Warrior } from '../player/Warrior';
import { InputController } from '../player/InputController';
import { NetworkManager } from '../network/NetworkManager';
import { VFXSystem } from '../vfx/VFXSystem';
import { HUD } from '../ui/HUD';
import { FollowCamera } from './Camera';
import { AssetLoader } from './AssetLoader';
import { AudioManager } from './AudioManager';

export class Game {
  private world = new World();
  private camera = new FollowCamera();
  private renderer: T.WebGLRenderer;
  private physics!: PhysicsWorld;
  private localPhysics?: PhysicsPlayer;
  private assets = new AssetLoader();
  private hud = new HUD();
  private audio = new AudioManager();
  private vfx = new VFXSystem(this.world.scene);
  private network = new NetworkManager();
  private input: InputController;
  private warriors = new Map<string, Warrior>();
  private pending: InputFrame[] = [];
  private seq = 0;
  private lastAck = -1;
  private position = new T.Vector3(SPAWN.x, 0, SPAWN.z);
  private accumulator = 0;
  private previous = 0;
  private fps = 60;
  private connected = false;
  private joining = false;
  constructor() {
    this.renderer = new T.WebGLRenderer({
      canvas: document.getElementById('game') as HTMLCanvasElement,
      antialias: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
    this.renderer.setSize(innerWidth, innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = T.PCFShadowMap;
    this.renderer.toneMapping = T.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.input = new InputController(
      this.renderer.domElement,
      this.camera.camera,
      () => this.position,
    );
    this.input.onAttack = (kind, yaw) => this.network.attack(kind, yaw);
    this.network.onCombat = (e) => this.combat(e);
    this.network.onRespawn = () => this.hud.toast('Il manichino è pronto per un nuovo duello.');
    this.network.onState = () => this.reconcile();
    this.network.onDisconnect = () => {
      if (!this.connected) return;
      this.connected = false;
      this.input.setEnabled(false);
      this.hud.error('Connessione interrotta. Puoi rientrare nella piazza.');
    };
    addEventListener('resize', () => {
      this.renderer.setSize(innerWidth, innerHeight);
      this.camera.resize();
    });
    addEventListener('beforeunload', () => {
      void this.network.room?.leave();
    });
    document.getElementById('enter')!.addEventListener('click', () => void this.join());
    document.getElementById('name')!.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') void this.join();
    });
    this.renderer.setAnimationLoop((t) => this.frame(t));
    // Read-only telemetry for manual QA and browser smoke tests.
    Object.defineProperty(window, '__aetheria', {
      get: () => ({
        connected: this.connected,
        id: this.network.id,
        position: { x: this.position.x, z: this.position.z },
        players: this.network.room?.state?.players.size ?? 0,
        dummyHp: this.network.room?.state?.dummyHp ?? 240,
        pending: this.pending.length,
      }),
    });
  }
  async initialize() {
    await initializePhysics();
    this.physics = new PhysicsWorld();
    const manifestUrl = `${import.meta.env.BASE_URL}assets/manifest.json`;
    const manifest = (await fetch(manifestUrl).then((r) => {
      if (!r.ok) throw new Error('Manifest degli asset non disponibile.');
      return r.json();
    })) as { warrior: string | null };
    const model = (import.meta.env.VITE_WARRIOR_URL as string | undefined) || manifest.warrior;
    if (model) {
      try {
        await this.assets.loadWarrior(model);
        document.getElementById('asset-note')!.textContent = 'Warrior · modello GLB';
      } catch (error) {
        console.warn('GLB non disponibile, uso il Warrior provvisorio.', error);
        this.hud.toast('GLB non disponibile: uso il Warrior provvisorio.');
      }
    }
    this.hud.ready();
  }
  private async join() {
    if (!this.physics || this.joining || this.connected) return;
    this.joining = true;
    const button = document.getElementById('enter') as HTMLButtonElement;
    button.disabled = true;
    button.textContent = 'Apertura del varco…';
    document.getElementById('error')!.textContent = '';
    this.audio.unlock();
    try {
      this.cleanupPlayers();
      this.pending = [];
      this.seq = 0;
      this.lastAck = -1;
      const name =
        (document.getElementById('name') as HTMLInputElement).value.trim() || 'Viandante';
      await this.network.connect(name);
      const p = this.network.room!.state.players.get(this.network.id)!;
      this.localPhysics = this.physics.createPlayer(p.x, p.z);
      this.position.set(p.x, p.y - PLAYER_HEIGHT, p.z);
      this.connected = true;
      this.accumulator = 0;
      this.input.setEnabled(true);
      this.hud.entered(p.name);
      this.camera.update(this.position, 1, true);
    } catch (error) {
      console.error(error);
      this.hud.error(
        'Server non raggiungibile. Avvia client e server con npm run dev, poi riprova.',
      );
    } finally {
      this.joining = false;
    }
  }
  private cleanupPlayers() {
    for (const w of this.warriors.values()) w.dispose();
    this.warriors.clear();
    if (this.localPhysics) this.physics.remove(this.localPhysics);
    this.localPhysics = undefined;
  }
  private reconcile() {
    if (!this.connected || !this.localPhysics) return;
    const p = this.network.room?.state.players.get(this.network.id);
    if (!p || p.ack === this.lastAck) return;
    this.lastAck = p.ack;
    this.pending = this.pending.filter((f) => f.seq > p.ack);
    this.physics.teleport(this.localPhysics, p.x, p.y, p.z);
    for (const input of this.pending) {
      this.physics.move(this.localPhysics, input);
      this.physics.step();
    }
  }
  private combat(e: CombatEvent) {
    this.warriors.get(e.playerId)?.attack(e.kind, e.yaw);
    this.vfx.combat(e);
    this.hud.combat(e, this.network.id, this.camera.camera);
    if (e.hit) this.audio.hit(e.kind === 'skill');
  }
  private frame(now: number) {
    const elapsed = (now - (this.previous || now)) / 1000,
      dt = Math.min(0.1, elapsed);
    this.previous = now;
    if (elapsed > 0) this.fps = T.MathUtils.lerp(this.fps, 1 / elapsed, 0.1);
    const state = this.network.room?.state;
    if (this.connected && this.localPhysics && !document.hidden) {
      this.accumulator += Math.min(0.25, elapsed);
      while (this.accumulator >= DT) {
        const input = this.input.sample(++this.seq);
        this.physics.move(this.localPhysics, input);
        this.physics.step();
        this.pending.push(input);
        this.network.input(input);
        this.accumulator -= DT;
        if (this.pending.length > 90) {
          this.connected = false;
          this.input.setEnabled(false);
          void this.network.room?.leave();
          this.hud.error('Il server non risponde. Rientra per riconnetterti.');
          break;
        }
      }
      const p = this.localPhysics.body.translation();
      this.position.lerp(new T.Vector3(p.x, p.y - PLAYER_HEIGHT, p.z), 1 - Math.exp(-dt * 24));
    } else this.accumulator = 0;
    if (this.connected && state) {
      state.players.forEach((p, id) => {
        let w = this.warriors.get(id);
        if (!w) {
          w = new Warrior(this.assets, id === this.network.id);
          w.root.position.set(p.x, p.y - PLAYER_HEIGHT, p.z);
          this.world.scene.add(w.root);
          this.warriors.set(id, w);
        }
        const local = id === this.network.id;
        const input = this.pending[this.pending.length - 1];
        if (local) w.root.position.copy(this.position);
        else
          w.root.position.lerp(
            new T.Vector3(p.x, p.y - PLAYER_HEIGHT, p.z),
            1 - Math.exp(-dt * 12),
          );
        w.update(
          dt,
          local && input ? Math.hypot(input.x, input.z) > 0.01 : p.moving,
          local && input ? input.run : p.running,
          local && input ? input.yaw : p.yaw,
        );
      });
      for (const [id, w] of this.warriors)
        if (!state.players.has(id)) {
          w.dispose();
          this.warriors.delete(id);
        }
      this.camera.update(this.position, dt);
    } else this.camera.update(new T.Vector3(0, 0, -2), dt);
    this.world.update(now / 1000, state?.dummyHp ?? 240);
    this.vfx.update(dt);
    this.hud.update(
      this.connected ? state : undefined,
      this.network.id,
      this.camera.camera,
      this.position.x,
      this.position.z,
      this.fps,
    );
    this.renderer.render(this.world.scene, this.camera.camera);
  }
}
