import { Vector3, type Camera } from 'three';
import { DUMMY, OBSTACLES, WORLD_BOUND, type CombatEvent } from '@aetheria/shared';
import type { WorldState } from '@aetheria/shared/schema';
const $ = (id: string) => document.getElementById(id)!;
export class HUD {
  private dummyLabel = document.createElement('div');
  private labels = new Map<string, HTMLElement>();
  private skillUntil = 0;
  private toastTimeout?: ReturnType<typeof setTimeout>;
  private damageNodes: { el: HTMLElement; until: number }[] = [];
  private map = ($('minimap') as HTMLCanvasElement).getContext('2d')!;
  private point = new Vector3();
  private complete = false;
  constructor() {
    this.dummyLabel.className = 'world-label dummy-label';
    this.dummyLabel.innerHTML =
      'MANICHINO DI ADDESTRAMENTO<span class="hp-bar"><i></i></span><small>240 / 240</small>';
    $('world-labels').append(this.dummyLabel);
    if (matchMedia('(pointer: coarse)').matches) {
      $('attack').querySelector('small')!.textContent = 'ATTACCO';
      $('skill').querySelector('small')!.textContent = 'SKILL';
      $('run').querySelector('small')!.textContent = 'TIENI PREMUTO';
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
    $('player-name').textContent = name;
    $('connection').classList.add('online');
    this.toast('Benvenuto a Lumengate. Raggiungi il manichino dorato.');
  }
  error(message: string) {
    $('entry').classList.remove('hidden');
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
    this.toastTimeout = setTimeout(() => $('toast').classList.remove('visible'), 3500);
  }
  combat(e: CombatEvent, localId: string, camera: Camera) {
    if (e.playerId === localId && e.kind === 'skill') this.skillUntil = performance.now() + 5000;
    if (!e.hit) {
      if (e.playerId === localId)
        this.toast('Avvicinati al manichino e rivolgi la lama verso di lui.');
      return;
    }
    const el = document.createElement('div');
    el.className = `damage ${e.kind}`;
    el.textContent = `−${e.damage}`;
    this.project(el, DUMMY.x, 2.3, DUMMY.z, camera);
    $('world-labels').append(el);
    this.damageNodes.push({ el, until: performance.now() + 1000 });
    if (e.playerId === localId && !this.complete) {
      this.complete = true;
      $('objective').textContent = '◆';
      $('quest-text').textContent = 'Primo colpo riuscito';
      this.toast('Il primo giuramento è compiuto. Prova l’Onda d’Ether con Q.');
    }
    if (e.hp === 0) this.toast('Manichino sconfitto · si ricompone tra 6 secondi');
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
    this.project(this.dummyLabel, DUMMY.x, 2.65, DUMMY.z, camera);
    (this.dummyLabel.querySelector('i') as HTMLElement).style.width =
      `${(hp / DUMMY.maxHp) * 100}%`;
    this.dummyLabel.querySelector('small')!.textContent =
      hp === 0 ? 'Si ricompone…' : `${hp} / ${DUMMY.maxHp}`;
    const online = state?.players.size ?? 0;
    $('population').textContent = online
      ? `${online} Guardian nella piazza`
      : 'Piazza di addestramento';
    if (state)
      $('connection').querySelector('span')!.textContent = `Multiplayer · ${online} online`;
    $('fps').textContent = `${Math.round(fps)} FPS`;
    const remaining = Math.max(0, (this.skillUntil - performance.now()) / 1000),
      cd = $('cooldown');
    cd.style.display = remaining > 0 ? 'grid' : 'none';
    cd.textContent = remaining.toFixed(1);
    const activeIds = new Set<string>();
    state?.players.forEach((p, key) => {
      if (key === id) return;
      activeIds.add(key);
      let label = this.labels.get(key);
      if (!label) {
        label = document.createElement('div');
        label.className = 'world-label';
        $('world-labels').append(label);
        this.labels.set(key, label);
      }
      label.textContent = p.name;
      this.project(label, p.x, 2.1, p.z, camera);
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
  private project(el: HTMLElement, x: number, y: number, z: number, camera: Camera) {
    this.point.set(x, y, z).project(camera);
    el.style.left = `${(this.point.x * 0.5 + 0.5) * innerWidth}px`;
    el.style.top = `${(-this.point.y * 0.5 + 0.5) * innerHeight}px`;
    el.style.visibility =
      this.point.z > 1 ||
      this.point.z < -1 ||
      Math.abs(this.point.x) > 1 ||
      Math.abs(this.point.y) > 1
        ? 'hidden'
        : 'visible';
  }
  private drawMap(state: WorldState | undefined, id: string, x: number, z: number) {
    const c = this.map,
      s = 180 / (WORLD_BOUND * 2 + 8),
      origin = 90;
    c.clearRect(0, 0, 180, 180);
    c.fillStyle = '#13252b';
    c.fillRect(0, 0, 180, 180);
    c.fillStyle = '#42575a';
    c.fillRect(origin - 14 * s, origin - 14 * s, 28 * s, 28 * s);
    c.strokeStyle = '#8a836455';
    c.lineWidth = 1;
    c.beginPath();
    c.arc(90, 90, 7.8 * s, 0, Math.PI * 2);
    c.stroke();
    c.fillStyle = '#1d333c';
    for (const o of OBSTACLES)
      c.fillRect(origin + (o.x - o.hx) * s, origin + (o.z - o.hz) * s, o.hx * 2 * s, o.hz * 2 * s);
    c.fillStyle = '#d9be7c';
    c.beginPath();
    c.arc(origin + DUMMY.x * s, origin + DUMMY.z * s, 3, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = '#a294dd';
    c.fillRect(origin - 2, origin - 12 * s - 2, 4, 4);
    state?.players.forEach((p, key) => {
      if (key === id) return;
      c.fillStyle = '#d3bc8f';
      c.beginPath();
      c.arc(origin + p.x * s, origin + p.z * s, 2.5, 0, Math.PI * 2);
      c.fill();
    });
    c.fillStyle = '#b5f3dd';
    c.shadowColor = '#92e9d0';
    c.shadowBlur = 8;
    c.beginPath();
    c.arc(origin + x * s, origin + z * s, 3, 0, Math.PI * 2);
    c.fill();
    c.shadowBlur = 0;
    c.fillStyle = '#d3c497';
    c.font = '9px Georgia';
    c.textAlign = 'center';
    c.fillText('N', 90, 14);
  }
}
