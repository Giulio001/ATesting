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
import { Graphics } from './Graphics';
import { Enemy } from '../combat/Enemy';
import { RPGPanels } from '../ui/RPGPanels';
import { nearbyNpc } from '@aetheria/shared';

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
  private panels = new RPGPanels(() => this.network.room?.state?.players?.get(this.network.id));
  private travelRevision = 0;
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
  private graphics: Graphics;
  private enemies = new Map<string, Enemy>();
  private alive = true;
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
    this.graphics = new Graphics(this.renderer, this.world.scene, this.camera.camera);
    this.input = new InputController(
      this.renderer.domElement,
      this.camera.camera,
      () => this.position,
    );
    this.input.onAttack = (kind, yaw) => this.network.attack(kind, yaw);
    this.input.onInteract = () => {
      if (this.hud.dialogueOpen) {
        this.hud.closeDialogue();
        return;
      }
      const p = this.network.room?.state?.players?.get(this.network.id);
      if (p && nearbyNpc(p.x, p.z)) this.network.interact();
      else this.hud.toast('Avvicinati a un NPC: custode, Quartiermastro o Araldo dei Clan.');
    };
    this.input.onPotion = () => this.network.potion();
    this.input.onManaPotion = () => this.network.send('mana-potion');
    this.input.onAbility = (ability, yaw) => this.network.send('ability', { ability, yaw });
    this.panels.onSend = (type, value) => this.network.send(type, value);
    this.panels.onAbility = (ability) => this.input.ability(ability);
    this.panels.onReturn = () => this.network.send('recall');
    this.panels.onMenuChanged = (open) => {
      if (open) this.hud.closeDialogue();
      this.input.setMenuOpen(open || this.panels.isOpen || this.hud.dialogueOpen);
    };
    this.network.onRPG = (s) => {
      this.panels.update(s);
      (document.getElementById('hero-class') as HTMLSelectElement).value = s.heroClass;
      try {
        localStorage.setItem('aetheria3d.class', s.heroClass);
      } catch {}
    };
    this.network.onChat = (e) => this.panels.chat(e);
    this.network.onNotice = (text) => this.hud.toast(text);
    this.network.onService = (e) => this.panels.open(e.service);
    this.network.onGuard = (e) => {
      this.warriors.get(e.playerId)?.guard();
      this.vfx.guard(
        e.x,
        e.z,
        this.network.room?.state.players.get(e.playerId)?.heroClass,
        e.playerId,
      );
    };
    this.input.onEscape = () => this.hud.closeDialogue();
    this.hud.onCloseDialogue = () => this.input.setMenuOpen(this.panels.isOpen);
    this.network.onCombat = (e) => this.combat(e);
    this.network.onRespawn = () => this.hud.toast('Il manichino è pronto per un nuovo duello.');
    this.network.onState = () => this.reconcile();
    this.network.onReward = (e) => this.hud.reward(e);
    this.network.onDialogue = (e) => {
      this.hud.dialogue(e);
      this.input.setMenuOpen(true);
    };
    this.network.onDamage = (e) => {
      this.warriors.get(e.playerId)?.hit();
      this.hud.damage(e, this.network.id, this.camera.camera);
      this.vfx.damage(e.x, e.z);
      if (e.playerId === this.network.id) this.audio.hit();
    };
    this.network.onDisconnect = () => {
      if (!this.connected) return;
      this.connected = false;
      this.panels.close();
      this.input.setEnabled(false);
      this.hud.error('Connessione interrotta. Puoi rientrare nella piazza.');
    };
    addEventListener('resize', () => {
      this.graphics.resize();
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
        players: this.network.room?.state?.players?.size ?? 0,
        dummyHp: this.network.room?.state?.dummyHp ?? 240,
        enemies: [...(this.network.room?.state?.enemies?.entries() ?? [])].map(([id, e]) => ({
          id,
          x: e.x,
          z: e.z,
          hp: e.hp,
          behavior: e.behavior,
        })),
        hero: this.network.room?.state?.players?.get(this.network.id)
          ? {
              hp: this.network.room.state.players.get(this.network.id)!.hp,
              heroClass: this.network.room.state.players.get(this.network.id)!.heroClass,
              questState: this.network.room.state.players.get(this.network.id)!.questState,
              gold: this.network.room.state.players.get(this.network.id)!.gold,
              level: this.network.room.state.players.get(this.network.id)!.level,
              mana: this.network.room.state.players.get(this.network.id)!.mana,
              running: this.network.room.state.players.get(this.network.id)!.running,
              items: this.panels.snapshot?.items.length ?? 0,
              clan: this.network.room.state.players.get(this.network.id)!.clanName,
            }
          : null,
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
      } catch (error) {
        console.warn('GLB non disponibile, uso il Warrior provvisorio.', error);
        this.hud.toast('GLB non disponibile: uso il Warrior provvisorio.');
      }
    }
    try {
      const name = localStorage.getItem('aetheria3d.name');
      if (name) (document.getElementById('name') as HTMLInputElement).value = name;
      const cls = localStorage.getItem('aetheria3d.class');
      if (cls && ['GUARDIAN', 'AETHER_BLADE', 'VOID_KNIGHT'].includes(cls))
        (document.getElementById('hero-class') as HTMLSelectElement).value = cls;
    } catch {}
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
      await this.network.connect(
        name,
        (document.getElementById('hero-class') as HTMLSelectElement).value,
      );
      const p = this.network.room!.state.players.get(this.network.id)!;
      this.localPhysics = this.physics.createPlayer(p.x, p.z);
      this.position.set(p.x, p.y - PLAYER_HEIGHT, p.z);
      this.connected = true;
      this.alive = true;
      this.input.setMenuOpen(false);
      this.accumulator = 0;
      this.input.setEnabled(true);
      this.hud.entered(p.name);
      try {
        localStorage.setItem('aetheria3d.name', p.name);
      } catch {}
      this.camera.update(this.position, 1, true);
    } catch (error) {
      console.error(error);
      const detail = error instanceof Error ? error.message : '';
      this.hud.error(
        detail.includes('già connesso')
          ? detail
          : 'Server non raggiungibile. Avvia client e server con npm run dev:remote, poi riprova.',
      );
    } finally {
      this.joining = false;
    }
  }
  private cleanupPlayers() {
    this.vfx.clear();
    for (const w of this.warriors.values()) w.dispose();
    this.warriors.clear();
    for (const e of this.enemies.values()) e.dispose();
    this.enemies.clear();
    if (this.localPhysics) this.physics.remove(this.localPhysics);
    this.localPhysics = undefined;
  }
  private reconcile() {
    if (!this.connected || !this.localPhysics) return;
    const p = this.network.room?.state?.players?.get(this.network.id);
    if (!p) return;
    const lifeChanged = p.hp > 0 !== this.alive;
    const traveled = p.travelRevision !== this.travelRevision;
    if (traveled) {
      this.travelRevision = p.travelRevision;
      this.pending = [];
    }
    if (lifeChanged) {
      this.alive = p.hp > 0;
      this.pending = [];
      this.input.setEnabled(this.alive);
      if (!this.alive) {
        this.hud.closeDialogue();
        this.panels.close();
      }
    }
    if (p.ack === this.lastAck && !lifeChanged && !traveled) return;
    this.lastAck = p.ack;
    this.pending = this.pending.filter((f) => f.seq > p.ack);
    this.physics.teleport(this.localPhysics, p.x, p.y, p.z);
    for (const input of this.pending) {
      this.physics.move(this.localPhysics, input);
      this.physics.step();
    }
  }
  private combat(e: CombatEvent) {
    if (!e.impactOnly) this.warriors.get(e.playerId)?.attack(e.kind, e.yaw);
    this.vfx.combat(e);
    for (const hit of e.hits) this.enemies.get(hit.targetId)?.hit();
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
        if (!w || w.classId !== p.heroClass) {
          w?.dispose();
          w = new Warrior(this.assets, id === this.network.id, p.heroClass);
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
        w.equipment(p.weaponIcon, p.shieldIcon, p.heroClass);
        this.vfx.moveGuard(id, p.x, p.z);
        w.update(
          dt,
          local && input ? Math.hypot(input.x, input.z) > 0.01 : p.moving,
          local && input ? input.run : p.running,
          local && input ? input.yaw : p.yaw,
          p.hp <= 0,
        );
      });
      for (const [id, w] of this.warriors)
        if (!state.players.has(id)) {
          w.dispose();
          this.warriors.delete(id);
        }
      state.enemies.forEach((e, id) => {
        let mesh = this.enemies.get(id);
        if (!mesh) {
          mesh = new Enemy(e.type);
          mesh.root.position.set(e.x, 0, e.z);
          this.world.scene.add(mesh.root);
          this.enemies.set(id, mesh);
        }
        mesh.update(e, dt, now / 1000, Date.now());
      });
      for (const [id, e] of this.enemies)
        if (!state.enemies.has(id)) {
          e.dispose();
          this.enemies.delete(id);
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
    this.world.updateOcclusion(this.camera.camera, this.position, dt);
    this.graphics.render(dt);
  }
}
