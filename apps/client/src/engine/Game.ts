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
import { AssetLoader, type AssetManifest } from './AssetLoader';
import { AudioManager } from './AudioManager';
import { Graphics } from './Graphics';
import { mobileGraphics } from './Performance';
import { Enemy } from '../combat/Enemy';
import { RPGPanels } from '../ui/RPGPanels';
import { ALL_NPCS, nearbyNpc, nearbyResident } from '@aetheria/shared';
import { SCENERY_NPCS, Townsfolk } from '../world/Townsfolk';
import { Tutorial } from '../ui/Tutorial';
import type { LoadingScreen } from '../ui/LoadingScreen';

export class Game {
  private world = new World();
  private camera = new FollowCamera();
  private renderer: T.WebGLRenderer;
  private physics!: PhysicsWorld;
  private localPhysics?: PhysicsPlayer;
  private assets = new AssetLoader();
  private hud = new HUD();
  private tutorial = new Tutorial();
  private audio = new AudioManager();
  private vfx = new VFXSystem(
    this.world.scene,
    (id, base, tip) => this.warriors.get(id)?.weaponPose(base, tip) ?? false,
    ({ strength, duration }) => this.camera.shake(strength, duration),
  );
  private network = new NetworkManager();
  private input: InputController;
  private panels = new RPGPanels(
    () => this.network.room?.state?.players?.get(this.network.id),
    () => this.network.room?.state?.players ?? [],
    () => this.network.room?.state,
  );
  private travelRevision = 0;
  private hitStop = 0;
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
  private townsfolk: Townsfolk[] = [];
  private alive = true;
  private initialized = false;
  constructor(private loading: LoadingScreen) {
    this.renderer = new T.WebGLRenderer({
      canvas: document.getElementById('game') as HTMLCanvasElement,
      antialias: !mobileGraphics(),
      powerPreference: 'high-performance',
    });
    this.renderer.shadowMap.type = T.PCFShadowMap;
    this.renderer.toneMapping = T.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.graphics = new Graphics(this.renderer, this.world.scene, this.camera.camera, (low) => {
      this.world.setQuality(low);
      this.vfx.setQuality(low);
    });
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
      if (p && (nearbyNpc(p.x, p.z) || nearbyResident(p.x, p.z, 3, Date.now())))
        this.network.interact();
      else this.hud.toast('Avvicinati a un abitante: custode, Banditore, Quartiermastro o Araldo.');
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
    this.network.onTrade = (view) => this.panels.tradeUpdate(view);
    this.network.onTradeRequest = (request) => this.panels.tradeRequest(request);
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
    this.hud.onDialogueChoice = (choice) => {
      const type = choice.startsWith('daily:')
        ? 'daily-answer'
        : choice === 'relic' || choice === 'bones' || choice === 'silence'
          ? 'grove-answer'
          : 'frontier-answer';
      this.network.send(type, choice);
    };
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
    this.loading.stage('Preparazione della fisica…', 35);
    await this.loading.paint();
    await this.prepare(initializePhysics());
    this.physics = new PhysicsWorld();
    this.loading.stage('Caricamento delle risorse…', 55);
    await this.loading.paint();
    const manifestUrl = `${import.meta.env.BASE_URL}assets/manifest.json`;
    const controller = new AbortController();
    const manifest = (await this.prepare(
      fetch(manifestUrl, { signal: controller.signal }).then((r) => {
        if (!r.ok) throw new Error('Manifest degli asset non disponibile.');
        return r.json();
      }),
    ).catch((error) => {
      controller.abort();
      throw error;
    })) as AssetManifest;
    const override = import.meta.env.VITE_WARRIOR_URL as string | undefined;
    if (override) manifest.characters = { ...manifest.characters, warrior: override };
    try {
      this.loading.stage('Caricamento dei modelli 3D…', 62);
      await this.assets.loadManifest(manifest, (ratio) =>
        this.loading.stage('Caricamento dei modelli 3D…', 62 + ratio * 18),
      );
      this.spawnTownsfolk();
    } catch (error) {
      console.warn('Modelli GLB non disponibili: uso le figure provvisorie.', error);
      this.hud.toast('Modelli 3D non disponibili: uso le figure provvisorie.');
    }
    try {
      await this.world.loadCity(this.graphics.low, (ratio) =>
        this.loading.stage('Costruzione di Lumengate…', 80 + ratio * 5),
      );
    } catch (error) {
      console.warn('Scenografia della città non disponibile.', error);
    }
    try {
      const name = localStorage.getItem('aetheria3d.name');
      if (name) (document.getElementById('name') as HTMLInputElement).value = name;
      const cls = localStorage.getItem('aetheria3d.class');
      if (cls && ['GUARDIAN', 'AETHER_BLADE', 'VOID_KNIGHT'].includes(cls))
        (document.getElementById('hero-class') as HTMLSelectElement).value = cls;
    } catch {}
    this.loading.stage('Preparazione dell’interfaccia e della scena…', 85);
    await this.loading.paint();
    await this.prepare(
      Promise.allSettled(Array.from(document.images, (image) => image.decode())),
      8000,
    ).catch(() => {});
    await this.prepare(this.renderer.compileAsync(this.world.scene, this.camera.camera));
    this.initialized = true;
    this.hud.ready();
    this.loading.stage('Lumengate è pronta', 100);
    await this.loading.paint();
    this.loading.hide();
  }
  private async prepare<T>(work: Promise<T>, milliseconds = 20000) {
    let timeout: ReturnType<typeof setTimeout> | undefined;
    return Promise.race([
      work,
      new Promise<never>((_, reject) => {
        timeout = setTimeout(
          () => reject(new Error('Il caricamento ha impiegato troppo tempo.')),
          milliseconds,
        );
      }),
    ]).finally(() => clearTimeout(timeout));
  }
  private async join() {
    if (!this.initialized || this.joining || this.connected) return;
    this.joining = true;
    const button = document.getElementById('enter') as HTMLButtonElement;
    button.disabled = true;
    button.textContent = 'Apertura del varco…';
    document.getElementById('error')!.textContent = '';
    this.audio.unlock();
    this.loading.show('Apertura del varco');
    this.loading.stage('Connessione a Lumengate…', 15);
    try {
      await this.loading.paint();
      this.cleanupPlayers();
      this.pending = [];
      this.seq = 0;
      this.lastAck = -1;
      const name =
        (document.getElementById('name') as HTMLInputElement).value.trim() || 'Viandante';
      await this.network.connect(
        name,
        (document.getElementById('hero-class') as HTMLSelectElement).value,
        () => this.loading.stage('Sincronizzazione del personaggio…', 45),
      );
      this.loading.stage('Preparazione dell’ingresso in città…', 70);
      const p = this.network.room!.state.players.get(this.network.id)!;
      this.localPhysics = this.physics.createPlayer(p.x, p.z);
      this.position.set(p.x, p.y - PLAYER_HEIGHT, p.z);
      this.connected = true;
      this.alive = p.hp > 0;
      this.input.setMenuOpen(false);
      this.accumulator = 0;
      this.input.setEnabled(false);
      try {
        localStorage.setItem('aetheria3d.name', p.name);
      } catch {}
      this.camera.update(this.position, 1, true);
      await this.loading.paint();
      this.loading.stage('Preparazione degli eroi e delle creature…', 85);
      await this.prepare(this.renderer.compileAsync(this.world.scene, this.camera.camera));
      this.loading.stage('Il varco è aperto', 100);
      await this.loading.paint();
      if (!this.connected) throw new Error('Connessione interrotta durante il caricamento.');
      this.hud.entered(p.name);
      this.tutorial.show();
      this.input.setEnabled(this.alive);
      this.loading.hide();
    } catch (error) {
      console.error(error);
      this.connected = false;
      this.input.setEnabled(false);
      this.cleanupPlayers();
      void this.network.room?.leave();
      const detail = error instanceof Error ? error.message : '';
      const message =
        detail.includes('già connesso') || detail.includes('caricamento')
          ? detail
          : 'Impossibile entrare a Lumengate. Controlla la connessione e riprova.';
      this.hud.error(message);
      this.loading.fail(message, () => this.loading.hide(), 'Torna all’ingresso');
    } finally {
      this.joining = false;
    }
  }
  private spawnTownsfolk() {
    for (const npc of ALL_NPCS) {
      // Frontier service NPCs are objects handled by the world; the beacon and
      // the sunken altar are scenery, not rigged people.
      if (npc.service === 'frontier' || SCENERY_NPCS.has(npc.id)) continue;
      const folk = new Townsfolk(this.assets, npc, this.graphics.low);
      this.townsfolk.push(folk);
      this.world.scene.add(folk.root);
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
      this.input.setEnabled(this.alive && !this.joining);
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
    for (const hit of e.hits) {
      this.enemies.get(hit.targetId)?.hit();
      if (hit.killed) this.vfx.death(hit.x, hit.z);
    }
    // Heavy blows freeze the presentation for a couple of frames: the classic
    // hit-stop that makes a skill read as impactful without slowing the server.
    const heavy = e.kind === 'skill' || (e.hit && e.damage >= 100);
    if (heavy) this.hitStop = Math.max(this.hitStop, e.kind === 'skill' ? 0.11 : 0.06);
    if (e.kind === 'skill') this.camera.punch(e.heroClass === 'VOID_KNIGHT' ? 3 : 2.4);
    this.hud.combat(e, this.network.id, this.camera.camera);
    if (e.hit) this.audio.hit(e.kind === 'skill');
  }
  private frame(now: number) {
    // The opaque loading screen needs no continuous world rendering during boot.
    if (!this.initialized && !this.connected) return;
    const elapsed = (now - (this.previous || now)) / 1000,
      dt = Math.min(0.1, elapsed);
    this.previous = now;
    if (elapsed > 0) this.fps = T.MathUtils.lerp(this.fps, 1 / elapsed, 0.1);
    // Presentation time runs in slow motion during a hit-stop; simulation,
    // prediction and networking always keep the real elapsed time.
    const present = this.hitStop > 0 ? 0.22 : 1;
    this.hitStop = Math.max(0, this.hitStop - dt);
    const sdt = dt * present;
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
          sdt,
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
          mesh = new Enemy(e.type, this.graphics.low, this.assets);
          mesh.root.position.set(e.x, 0, e.z);
          this.world.scene.add(mesh.root);
          this.enemies.set(id, mesh);
        }
        mesh.update(e, sdt, now / 1000, Date.now());
      });
      for (const [id, e] of this.enemies)
        if (!state.enemies.has(id)) {
          e.dispose();
          this.enemies.delete(id);
        }
      for (const folk of this.townsfolk)
        folk.update(sdt, now / 1000, this.position.x, this.position.z);
      this.camera.update(this.position, dt, false);
    } else this.camera.update(new T.Vector3(0, 0, -2), sdt);
    this.world.followRegion(this.position.x, this.position.z);
    this.world.update(now / 1000, state?.dummyHp ?? 240);
    this.vfx.update(sdt);
    this.hud.update(
      this.connected ? state : undefined,
      this.network.id,
      this.camera.camera,
      this.position.x,
      this.position.z,
      this.fps,
    );
    const hero = this.connected ? state?.players.get(this.network.id) : undefined;
    if (hero && state)
      this.tutorial.update({
        questState: hero.questState,
        questKills: hero.questKills,
        frontierState: hero.frontierState,
        frontierKills: hero.frontierKills,
        groveState: hero.groveState,
        groveKills: hero.groveKills,
        x: hero.x,
        z: hero.z,
        dummyHp: state.dummyHp,
      });
    this.world.updateOcclusion(this.camera.camera, this.position, dt);
    this.graphics.render(dt);
  }
}
