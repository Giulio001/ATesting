import { Vector3, type Camera } from 'three';
import {
  DUMMY,
  CUSTODIAN,
  NPCS,
  RESIDENTS,
  residentPose,
  nearbyNpc,
  OBSTACLES,
  WORLD_BOUND,
  isHostile,
  regionName,
  FRONTIER,
  FRONTIER_TITLES,
  FRONTIER_STORY,
  frontierObjective,
  GROVE,
  GROVE_TITLES,
  GROVE_STORY,
  groveObjective,
  enemyRules,
  canInteract,
  xpRequired,
  CLASS_NAMES,
  heroClass,
  classAbilities,
  itemIconUrl,
  type CombatEvent,
  type DamageEvent,
  type RewardEvent,
  type DialogueEvent,
} from '@aetheria/shared';
import type { WorldState } from '@aetheria/shared/schema';
const $ = (id: string) => document.getElementById(id)!;
export class HUD {
  private dummyLabel = document.createElement('div');
  private serviceLabels: HTMLElement[] = [];
  private npcLabel = document.createElement('div');
  private labels = new Map<string, HTMLElement>();
  private toastTimeout?: ReturnType<typeof setTimeout>;
  private damageNodes: { el: HTMLElement; until: number }[] = [];
  private map = ($('minimap') as HTMLCanvasElement).getContext('2d')!;
  private point = new Vector3();
  private lastQuest = -1;
  private hurtUntil = 0;
  onDialogueChoice: (id: string) => void = () => {};
  onCloseDialogue: () => void = () => {};
  get dialogueOpen() {
    return !$('dialogue').classList.contains('hidden');
  }
  constructor() {
    this.dummyLabel.className = 'world-label dummy-label';
    this.dummyLabel.innerHTML =
      'MANICHINO<span class="hp-bar"><i></i></span><small>240 / 240</small>';
    this.npcLabel.className = 'world-label npc-label';
    this.npcLabel.innerHTML = 'SER AUREL<small>Custode della porta</small>';
    $('world-labels').append(this.dummyLabel, this.npcLabel);
    for (const npc of NPCS.slice(1)) {
      const el = document.createElement('div');
      el.className = 'world-label npc-label';
      el.innerHTML = '<span></span><small></small>';
      el.querySelector('span')!.textContent = npc.name;
      el.querySelector('small')!.textContent = npc.role;
      $('world-labels').append(el);
      this.serviceLabels.push(el);
    }
    $('dialogue-close').addEventListener('click', () => this.closeDialogue());
    if (matchMedia('(pointer: coarse)').matches) {
      for (const [id, label] of [
        ['attack', 'ATTACCO'],
        ['skill', 'IMPULSO'],
        ['aether', 'TAGLIO'],
        ['guard', 'GUARDIA'],
        ['mana-potion', 'MANA'],
        ['potion', 'CURA'],
        ['interact', 'CUSTODE'],
      ])
        $(id).querySelector('small')!.textContent = label;
    }
  }
  ready() {
    const b = $('enter') as HTMLButtonElement;
    b.disabled = false;
    b.textContent = 'Entra a Lumengate →';
    $('connection').querySelector('span')!.textContent = 'Mondo pronto';
  }
  entered(name: string) {
    $('entry').classList.add('hidden');
    document.body.classList.add('playing');
    $('player-name').textContent = name;
    $('connection').classList.add('online');
    this.lastQuest = -1;
    this.toast(
      'Benvenuto a Lumengate. Ser Aurel ti attende alla fontana; il ponte a est conduce alla Frontiera.',
    );
  }
  error(message: string) {
    this.closeDialogue();
    $('entry').classList.remove('hidden');
    $('death').classList.add('hidden');
    document.body.classList.remove('playing');
    $('error').textContent = message;
    const b = $('enter') as HTMLButtonElement;
    b.disabled = false;
    b.textContent = 'Riprova →';
    $('connection').classList.remove('online');
    $('connection').querySelector('span')!.textContent = 'Disconnesso';
  }
  toast(message: string) {
    clearTimeout(this.toastTimeout);
    $('toast').textContent = message;
    $('toast').classList.add('visible');
    this.toastTimeout = setTimeout(() => $('toast').classList.remove('visible'), 4000);
  }
  dialogue(e: DialogueEvent) {
    $('dialogue-choices').replaceChildren();
    for (const choice of e.choices ?? []) {
      const button = document.createElement('button');
      button.textContent = choice.label;
      button.addEventListener('click', () => this.onDialogueChoice(choice.id));
      $('dialogue-choices').append(button);
    }
    $('dialogue-title').textContent = e.title;
    $('dialogue-text').textContent = e.text;
    $('dialogue-close').textContent = e.complete ? 'Per Lumengate →' : 'Ho capito →';
    $('dialogue').classList.remove('hidden');
    ($('dialogue-close') as HTMLButtonElement).focus();
  }
  closeDialogue() {
    $('dialogue').classList.add('hidden');
    this.onCloseDialogue();
  }
  reward(e: RewardEvent) {
    this.toast(
      `${e.quest ? 'Giuramento compiuto' : 'Creatura sconfitta'} · +${e.xp} EXP · +${e.gold} oro${e.level > 1 ? ` · livello ${e.level}` : ''}`,
    );
  }
  combat(e: CombatEvent, localId: string, camera: Camera) {
    for (const hit of e.hits)
      this.floatText(
        `−${hit.damage}`,
        hit.x,
        2.2,
        hit.z,
        camera,
        e.kind === 'skill' ? 'skill' : '',
      );
    if (e.playerId === localId && !e.hit && !e.projectile && e.heroClass !== 'VOID_KNIGHT')
      this.toast(
        'Avvicinati e rivolgi la lama verso il bersaglio. Le creature si affrontano oltre la porta sud.',
      );
    if (e.hits.some((h) => h.targetId === 'dummy' && h.killed))
      this.toast('Manichino sconfitto · si ricompone tra 6 secondi');
  }
  damage(e: DamageEvent, localId: string, camera: Camera) {
    this.floatText(`−${e.damage}`, e.x, 2.2, e.z, camera, 'incoming');
    if (e.playerId === localId) this.hurtUntil = performance.now() + 400;
  }
  private floatText(text: string, x: number, y: number, z: number, camera: Camera, kind: string) {
    const el = document.createElement('div');
    el.className = `damage ${kind}`;
    el.textContent = text;
    this.project(el, x, y, z, camera);
    $('world-labels').append(el);
    this.damageNodes.push({ el, until: performance.now() + 1000 });
  }
  update(
    state: WorldState | undefined,
    id: string,
    camera: Camera,
    x: number,
    z: number,
    fps: number,
  ) {
    const hp = state?.dummyHp ?? DUMMY.maxHp;
    this.project(this.dummyLabel, DUMMY.x, 2.55, DUMMY.z, camera);
    (this.dummyLabel.querySelector('i') as HTMLElement).style.width =
      `${(hp / DUMMY.maxHp) * 100}%`;
    this.dummyLabel.querySelector('small')!.textContent =
      hp === 0 ? 'Si ricompone…' : `${hp} / ${DUMMY.maxHp}`;
    this.project(this.npcLabel, CUSTODIAN.x, 2.35, CUSTODIAN.z, camera);
    this.serviceLabels.forEach((el, i) => {
      const n = NPCS[i + 1];
      this.project(el, n.x, 2.3, n.z, camera);
    });
    const online = state?.players.size ?? 0;
    $('population').textContent = online ? `${online} viandanti online` : 'Lumengate';
    if (state)
      $('connection').querySelector('span')!.textContent = `Multiplayer · ${online} online`;
    $('fps').textContent = `${Math.round(fps)} FPS`;
    const p = state?.players.get(id),
      serverNow = Date.now();
    if (p) {
      const danger = isHostile(p.x, p.z);
      $('location').querySelector('h2')!.textContent = regionName(p.x, p.z);
      $('map-panel').querySelector('span')!.textContent = regionName(p.x, p.z).toUpperCase();
      $('player-status').textContent = danger
        ? 'Zona ostile · schiva i cerchi rossi'
        : `${regionName(p.x, p.z)} · rifugio sicuro`;
      $('player-status').classList.toggle('danger', danger);
      $('player-level').textContent =
        `${CLASS_NAMES[heroClass(p.heroClass)].toUpperCase()} · LIVELLO ${p.level}`;
      const abilities = classAbilities(p.heroClass);
      for (const [button, ability] of [
        ['aether', abilities.SLASH],
        ['guard', abilities.GUARD],
        ['skill', abilities.BURST],
      ] as const) {
        const labels =
          p.heroClass === 'VOID_KNIGHT'
            ? { aether: 'Raggio', guard: 'Barriera', skill: 'Nova' }
            : p.heroClass === 'AETHER_BLADE'
              ? { aether: 'Freccia', guard: 'Guardia', skill: 'Raffica' }
              : { aether: 'Taglio', guard: 'Guardia', skill: 'Impulso' };
        $(button).querySelector('b')!.textContent = labels[button];
        $(button).title = `${ability.name} · ${ability.key}`;
        const image = $(button).querySelector('img')!;
        const source = itemIconUrl(ability.icon);
        if (image.getAttribute('src') !== source) image.setAttribute('src', source);
      }
      $('attack').querySelector('b')!.textContent =
        p.heroClass === 'AETHER_BLADE'
          ? 'Freccia'
          : p.heroClass === 'VOID_KNIGHT'
            ? 'Dardo'
            : 'Fendente';
      const attackImage = $('attack').querySelector('img')!;
      const attackSource = itemIconUrl(
        p.heroClass === 'AETHER_BLADE'
          ? 'bow_reinforced'
          : p.heroClass === 'VOID_KNIGHT'
            ? 'scepter_oak'
            : 'sword_aether',
      );
      if (attackImage.getAttribute('src') !== attackSource)
        attackImage.setAttribute('src', attackSource);
      document.querySelector<HTMLElement>('.health>span')!.style.width =
        `${(p.hp / p.maxHp) * 100}%`;
      document.querySelector('.health>small')!.textContent = `${p.hp} / ${p.maxHp}`;
      document.querySelector<HTMLElement>('.mana>span')!.style.width = `${p.mana}%`;
      document.querySelector('.mana>small')!.textContent = `${Math.floor(p.mana)} / 100 ETHER`;
      document.querySelector<HTMLElement>('.experience>span')!.style.width =
        `${Math.min(100, (p.xp / Math.max(1, xpRequired(p.level))) * 100)}%`;
      $('gold').textContent = `◆ ${p.gold} oro`;
      $('xp').textContent = `${p.xp} / ${xpRequired(p.level)} EXP`;
      document.querySelector<HTMLElement>('.stamina>span')!.style.width = `${p.stamina}%`;
      $('mana-potion-count').textContent = `Mana · ${p.manaPotions}`;
      this.cooldown('aether-cooldown', p.slashReadyAt, serverNow);
      this.cooldown('guard-cooldown', p.guardReadyAt, serverNow);
      this.cooldown('mana-potion-cooldown', p.manaPotionUntil, serverNow);
      $('aether').classList.toggle('unavailable', p.mana < 18);
      $('guard').classList.toggle(
        'unavailable',
        p.mana < abilities.GUARD.cost || (p.heroClass !== 'VOID_KNIGHT' && p.stamina < 30),
      );
      $('mana-potion').classList.toggle('unavailable', p.manaPotions === 0 || p.mana >= 100);
      $('potion-count').textContent = `Cura · ${p.potions}`;
      this.cooldown('cooldown', p.skillUntil, serverNow);
      this.cooldown('potion-cooldown', p.potionUntil, serverNow);
      $('skill').classList.toggle('unavailable', p.mana < 52);
      $('potion').classList.toggle('unavailable', p.potions === 0 || p.hp === p.maxHp);
      const nearby = nearbyNpc(p.x, p.z);
      $('interact').classList.toggle('nearby', !!nearby);
      $('hotbar').classList.toggle('near-npc', !!nearby);
      $('interact').querySelector('b')!.textContent =
        nearby?.id === 'frontier-beacon'
          ? 'Esamina'
          : nearby?.id === 'grove-altar'
            ? 'Tocca'
            : nearby?.service === 'shop'
              ? 'Negozia'
              : nearby?.service === 'clan'
                ? 'Clan'
                : nearby?.service === 'forge'
                  ? 'Forgia'
                  : 'Parla';
      $('death').classList.toggle('hidden', p.hp > 0);
      if (p.hp === 0)
        $('death-count').textContent = String(
          Math.max(1, Math.ceil((p.deadUntil - serverNow) / 1000)),
        );
      if (p.questState !== this.lastQuest) {
        const titles = [
          'Il primo giuramento',
          'Schegge oltre la porta',
          'Ritorna dal custode',
          'La porta è al sicuro',
        ];
        const descriptions = [
          'Parla con Ser Aurel vicino alla fontana. Premi E quando ti avvicini.',
          'Attraversa l’arco a sud. Sconfiggi tre schegge e schiva le loro aree rosse.',
          'Hai respinto le tre schegge. Torna alla fontana e parla con Ser Aurel per la ricompensa.',
          'Giuramento compiuto. Cerca il Custode del Vuoto vicino alla fenditura per una prova più difficile.',
        ];
        $('quest').querySelector('h3')!.textContent = titles[p.questState];
        $('quest-description').textContent = descriptions[p.questState];
        $('objective').textContent = p.questState === 3 ? '◆' : '◇';
        if (this.lastQuest === 1 && p.questState === 2)
          this.toast('Tre schegge sconfitte. Torna da Ser Aurel e riscuoti la ricompensa.');
        this.lastQuest = p.questState;
      }
      $('quest-text').textContent =
        p.questState === 0
          ? 'Parla con il custode · E'
          : p.questState === 1
            ? `Schegge sconfitte · ${p.questKills} / 3`
            : p.questState === 2
              ? 'Riscuoti la ricompensa · E'
              : 'Affronta il Custode del Vuoto';
      if (p.questState === 3) {
        $('quest').querySelector('h3')!.textContent = FRONTIER_TITLES[p.frontierState];
        $('objective').textContent = p.frontierState === 5 ? '◆' : '◇';
        $('quest-description').textContent = frontierObjective(p.frontierState, p.frontierKills);
        $('quest-text').textContent =
          p.frontierState === 1
            ? `Creature corrotte · ${p.frontierKills} / 5`
            : p.frontierState === 4
              ? 'Riscuoti da Ser Aurel · E'
              : p.frontierState === 5
                ? 'Frontiera completata'
                : 'Segui la traccia della Frontiera';
        $('asset-note').textContent =
          `Ricompensa · ${FRONTIER_STORY.reward.gold} oro + ${FRONTIER_STORY.reward.xp} EXP + 10 polvere`;
      }
      if (p.frontierState >= 5 || p.groveState > 0) {
        $('quest').querySelector('h3')!.textContent = GROVE_TITLES[p.groveState];
        $('objective').textContent = p.groveState === 5 ? '◆' : '◇';
        $('quest-description').textContent = groveObjective(p.groveState, p.groveKills);
        $('quest-text').textContent =
          p.groveState === 1
            ? `Creature annegate · ${p.groveKills} / 6`
            : p.groveState === 4
              ? 'Riscuoti dal Custode del Bosco · E'
              : p.groveState === 5
                ? 'Bosco Sommerso completato'
                : 'Segui la reliquia del Bosco Sommerso';
        $('asset-note').textContent =
          `Ricompensa · ${GROVE_STORY.reward.gold} oro + ${GROVE_STORY.reward.xp} EXP + 14 polvere`;
      }
    }
    $('damage-screen').style.opacity = String(
      Math.max(0, (this.hurtUntil - performance.now()) / 400) * 0.7,
    );
    const activeIds = new Set<string>();
    state?.players.forEach((hero, key) => {
      if (key === id) return;
      activeIds.add(key);
      let label = this.labels.get(key);
      if (!label) {
        label = document.createElement('div');
        label.className = 'world-label';
        $('world-labels').append(label);
        this.labels.set(key, label);
      }
      label.textContent = `${hero.name} · Lv.${hero.level}${hero.clanName ? ' · [' + hero.clanName + ']' : ''}`;
      this.project(label, hero.x, 2.1, hero.z, camera);
    });
    state?.enemies.forEach((enemy, key) => {
      const labelId = `enemy:${key}`;
      activeIds.add(labelId);
      let label = this.labels.get(labelId);
      if (!label) {
        label = document.createElement('div');
        label.className = `world-label enemy-label ${enemy.type === 'sentinel' ? 'elite' : ''}`;
        label.innerHTML = '<span></span><div class="hp-bar"><i></i></div><small></small>';
        $('world-labels').append(label);
        this.labels.set(labelId, label);
      }
      label.querySelector('span')!.textContent = enemyRules(enemy.type).name.toUpperCase();
      (label.querySelector('i') as HTMLElement).style.width = `${(enemy.hp / enemy.maxHp) * 100}%`;
      label.querySelector('small')!.textContent = `${enemy.hp} / ${enemy.maxHp}`;
      this.project(label, enemy.x, enemyRules(enemy.type).elite ? 3 : 2.25, enemy.z, camera);
      if (enemy.hp <= 0 || Math.hypot(enemy.x - x, enemy.z - z) > 14)
        label.style.visibility = 'hidden';
    });
    for (const [key, label] of this.labels)
      if (!activeIds.has(key)) {
        label.remove();
        this.labels.delete(key);
      }
    this.damageNodes = this.damageNodes.filter((d) => {
      if (performance.now() > d.until) {
        d.el.remove();
        return false;
      }
      return true;
    });
    this.drawMap(state, id, x, z);
  }
  private cooldown(id: string, until: number, now: number) {
    const remaining = Math.max(0, (until - now) / 1000),
      el = $(id);
    el.style.display = remaining > 0 ? 'grid' : 'none';
    el.textContent = remaining.toFixed(1);
  }
  private project(el: HTMLElement, x: number, y: number, z: number, camera: Camera) {
    this.point.set(x, y, z).project(camera);
    el.style.left = `${(this.point.x * 0.5 + 0.5) * innerWidth}px`;
    el.style.top = `${(-this.point.y * 0.5 + 0.5) * innerHeight}px`;
    el.style.visibility =
      this.point.z > 1 ||
      this.point.z < -1 ||
      Math.abs(this.point.x) > 0.98 ||
      Math.abs(this.point.y) > 0.94
        ? 'hidden'
        : 'visible';
  }
  private drawMap(state: WorldState | undefined, id: string, x: number, z: number) {
    const c = this.map,
      s = 180 / (WORLD_BOUND * 2 + 8),
      origin = 90,
      centerX = x >= 86 ? 112 : x >= 30 ? 54 : 0;
    c.clearRect(0, 0, 180, 180);
    c.fillStyle = '#16312e';
    c.fillRect(0, 0, 180, 180);
    if (centerX) {
      c.fillStyle = x >= 86 ? '#2b4740' : '#483b52';
      c.fillRect(0, 0, 180, 180);
    }
    if (!centerX) {
      c.fillStyle = '#425d62';
      c.fillRect(origin - 14 * s, origin - 14 * s, 28 * s, 28 * s);
      c.fillStyle = '#403349';
      c.beginPath();
      c.ellipse(origin, origin + 17 * s, 7 * s, 7.7 * s, 0, 0, Math.PI * 2);
      c.fill();
      c.strokeStyle = '#aaad8766';
      c.lineWidth = 1;
      c.beginPath();
      c.arc(90, 90, 7.8 * s, 0, Math.PI * 2);
      c.stroke();
    } else {
      c.strokeStyle = '#b5a17d';
      c.lineWidth = 2;
      c.beginPath();
      c.moveTo(0, 90);
      c.lineTo(135, 90);
      c.stroke();
    }
    c.fillStyle = '#23353e';
    for (const o of OBSTACLES)
      c.fillRect(
        origin + (o.x - centerX - o.hx) * s,
        origin + (o.z - o.hz) * s,
        o.hx * 2 * s,
        o.hz * 2 * s,
      );
    const dot = (px: number, pz: number, color: string, r = 3) => {
      c.fillStyle = color;
      c.beginPath();
      c.arc(origin + (px - centerX) * s, origin + pz * s, r, 0, Math.PI * 2);
      c.fill();
    };

    dot(DUMMY.x, DUMMY.z, '#d9be7c', 2);
    for (const npc of NPCS) dot(npc.x, npc.z, '#f4d48f', 3);
    const seconds = Date.now() / 1000;
    for (const npc of RESIDENTS) {
      const pose = residentPose(npc, seconds);
      dot(pose.x, pose.z, '#e8dfc0', 2);
    }
    if (centerX) dot(FRONTIER.beacon.x, FRONTIER.beacon.z, '#b797fa', 4);
    if (x >= 86) {
      dot(GROVE.altar.x, GROVE.altar.z, '#7de8c2', 4);
      dot(GROVE.boss.x, GROVE.boss.z, '#7de8c2', 5);
    } else {
      c.fillStyle = '#a294e1';
      c.fillRect(origin - 2, origin - 12 * s - 2, 4, 4);
    }
    state?.enemies.forEach((e) => {
      if (e.hp > 0)
        dot(
          e.x,
          e.z,
          enemyRules(e.type).elite ? '#eb91e2' : '#ec8d83',
          enemyRules(e.type).elite ? 3 : 2,
        );
    });
    state?.players.forEach((p, key) => {
      if (key !== id) dot(p.x, p.z, '#d3bc8f', 2.5);
    });
    c.shadowColor = '#92e9d0';
    c.shadowBlur = 8;
    dot(x, z, '#b5f3dd', 3);
    c.shadowBlur = 0;
    c.fillStyle = '#d3c497';
    c.font = '9px Georgia';
    c.textAlign = 'center';
    c.fillText('N', 90, 14);
  }
}
