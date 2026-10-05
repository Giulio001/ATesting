import { PerspectiveCamera, Raycaster, Plane, Vector3, Vector2 } from 'three';
import type { AttackKind, InputFrame, AbilityId } from '@aetheria/shared';
export class InputController {
  private keys = new Set<string>();
  private stick = new Vector2();
  private pointer = new Vector2();
  private aim = false;
  private yaw = Math.PI;
  private enabled = false;
  private menu = false;
  private attackHeld = false;
  private lastAuto = 0;
  private ray = new Raycaster();
  private plane = new Plane(new Vector3(0, 1, 0), 0);
  private hit = new Vector3();
  onAttack: (kind: AttackKind, yaw: number) => void = () => {};
  onAbility: (ability: AbilityId, yaw: number) => void = () => {};
  onManaPotion: () => void = () => {};
  onInteract: () => void = () => {};
  onPotion: () => void = () => {};
  onEscape: () => void = () => {};
  constructor(
    private canvas: HTMLCanvasElement,
    private camera: PerspectiveCamera,
    private position: () => Vector3,
  ) {
    addEventListener('keydown', (e) => {
      if ((e.target as HTMLElement)?.matches('input, select, textarea, [contenteditable]')) return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code))
        e.preventDefault();
      this.keys.add(e.code);
      if (!e.repeat && this.enabled) {
        if (e.code === 'Space') this.attack('slash');
        if (e.code === 'Digit1') this.attack('slash');
        if (e.code === 'KeyQ' || e.code === 'Digit2') this.ability('SLASH');
        if (e.code === 'KeyR' || e.code === 'Digit3') this.ability('GUARD');
        if (e.code === 'KeyF' || e.code === 'Digit4') this.ability('BURST');
        if (e.code === 'KeyG' && !this.menu) this.onManaPotion();
        if (e.code === 'KeyE') this.onInteract();
        if (e.code === 'KeyH' && !this.menu) this.onPotion();
      }
      if (e.code === 'Escape') this.onEscape();
    });
    addEventListener('keyup', (e) => this.keys.delete(e.code));
    addEventListener('blur', () => this.reset());
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) this.reset();
    });
    canvas.addEventListener('pointermove', (e) => {
      if (e.pointerType === 'mouse') {
        this.pointer.set((e.clientX / innerWidth) * 2 - 1, (-e.clientY / innerHeight) * 2 + 1);
        this.aim = true;
      }
    });
    canvas.addEventListener('pointerdown', (e) => {
      if (e.button === 0 && e.pointerType === 'mouse' && this.enabled) {
        this.pointer.set((e.clientX / innerWidth) * 2 - 1, (-e.clientY / innerHeight) * 2 + 1);
        this.aim = true;
        this.updateAim();
        this.attack('slash');
        this.attackHeld = true;
        canvas.setPointerCapture(e.pointerId);
      }
    });
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    document.getElementById('attack')!.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      this.attack('slash');
      this.attackHeld = true;
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    });
    addEventListener('pointerup', () => {
      this.attackHeld = false;
    });
    addEventListener('pointercancel', () => {
      this.attackHeld = false;
    });
    document.getElementById('interact')!.addEventListener('click', () => {
      if (this.enabled) this.onInteract();
    });
    document.getElementById('potion')!.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      if (this.enabled && !this.menu) this.onPotion();
    });
    document.getElementById('skill')!.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      this.ability('BURST');
    });
    for (const [id, ability] of [
      ['aether', 'SLASH'],
      ['guard', 'GUARD'],
    ] as const)
      document.getElementById(id)!.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        this.ability(ability);
      });
    document.getElementById('mana-potion')!.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      if (this.enabled && !this.menu) this.onManaPotion();
    });
    const joystick = document.getElementById('joystick')!,
      knob = joystick.firstElementChild as HTMLElement;
    let pointerId = -1;
    const move = (e: PointerEvent) => {
      if (e.pointerId !== pointerId) return;
      const r = joystick.getBoundingClientRect(),
        dx = e.clientX - r.left - r.width / 2,
        dz = e.clientY - r.top - r.height / 2;
      const length = Math.hypot(dx, dz),
        scale = Math.min(1, 40 / Math.max(1, length));
      this.stick.set((dx * scale) / 40, (dz * scale) / 40);
      knob.style.transform = `translate(${dx * scale}px,${dz * scale}px)`;
      this.aim = false;
    };
    joystick.addEventListener('pointerdown', (e) => {
      if (pointerId !== -1) return;
      pointerId = e.pointerId;
      joystick.setPointerCapture(pointerId);
      move(e);
    });
    joystick.addEventListener('pointermove', move);
    const reset = (e: PointerEvent) => {
      if (e.pointerId !== pointerId) return;
      pointerId = -1;
      this.stick.set(0, 0);
      knob.style.transform = '';
    };
    joystick.addEventListener('pointerup', reset);
    joystick.addEventListener('pointercancel', reset);
    joystick.addEventListener('lostpointercapture', reset);
  }
  setEnabled(value: boolean) {
    this.enabled = value;
    this.reset();
  }
  setMenuOpen(value: boolean) {
    this.menu = value;
    this.reset();
  }
  private reset() {
    this.keys.clear();
    this.stick.set(0, 0);
    this.attackHeld = false;
    const knob = document.querySelector<HTMLElement>('#joystick>div');
    if (knob) knob.style.transform = '';
  }
  private updateAim() {
    if (this.aim) {
      this.ray.setFromCamera(this.pointer, this.camera);
      if (this.ray.ray.intersectPlane(this.plane, this.hit)) {
        const p = this.position();
        this.yaw = Math.atan2(this.hit.x - p.x, this.hit.z - p.z);
      }
    }
  }
  private attack(kind: AttackKind) {
    if (!this.enabled || this.menu) return;
    this.lastAuto = performance.now();
    this.updateAim();
    this.onAttack(kind, this.yaw);
  }
  ability(ability: AbilityId) {
    if (!this.enabled || this.menu) return;
    this.updateAim();
    this.onAbility(ability, this.yaw);
  }
  sample(seq: number): InputFrame {
    const k = this.keys;
    if (this.attackHeld && performance.now() - this.lastAuto > 680) this.attack('slash');
    let sx =
      this.enabled && !this.menu
        ? this.stick.x +
          Number(k.has('KeyD') || k.has('ArrowRight')) -
          Number(k.has('KeyA') || k.has('ArrowLeft'))
        : 0;
    let sz =
      this.enabled && !this.menu
        ? this.stick.y +
          Number(k.has('KeyS') || k.has('ArrowDown')) -
          Number(k.has('KeyW') || k.has('ArrowUp'))
        : 0;
    const length = Math.hypot(sx, sz);
    const moving = length > 0.12;
    if (moving) {
      sx /= length;
      sz /= length;
    } else {
      sx = 0;
      sz = 0;
    }
    // Screen axes are projected onto the fixed isometric camera's ground plane.
    const x = sx * 0.874 + sz * 0.486,
      z = -sx * 0.486 + sz * 0.874;
    if (moving) {
      this.yaw = Math.atan2(x, z);
      this.aim = false;
    }
    return {
      seq,
      x,
      z,
      run: this.enabled && !this.menu && moving,
      yaw: this.yaw,
    };
  }
}
