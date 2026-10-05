import { PerspectiveCamera, Raycaster, Plane, Vector3, Vector2 } from 'three';
import type { AttackKind, InputFrame } from '@aetheria/shared';
export class InputController {
  private keys = new Set<string>();
  private stick = new Vector2();
  private runHeld = false;
  private pointer = new Vector2();
  private aim = false;
  private yaw = Math.PI;
  private enabled = false;
  private ray = new Raycaster();
  private plane = new Plane(new Vector3(0, 1, 0), 0);
  private hit = new Vector3();
  onAttack: (kind: AttackKind, yaw: number) => void = () => {};
  constructor(
    private canvas: HTMLCanvasElement,
    private camera: PerspectiveCamera,
    private position: () => Vector3,
  ) {
    addEventListener('keydown', (e) => {
      if ((e.target as HTMLElement)?.matches('input')) return;
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code))
        e.preventDefault();
      this.keys.add(e.code);
      if (!e.repeat && this.enabled) {
        if (e.code === 'Space') this.attack('slash');
        if (e.code === 'KeyQ') this.attack('skill');
      }
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
      }
    });
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    document.getElementById('attack')!.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      this.attack('slash');
    });
    document.getElementById('skill')!.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      this.attack('skill');
    });
    const run = document.getElementById('run')!;
    run.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      run.setPointerCapture(e.pointerId);
      this.runHeld = true;
      run.classList.add('active');
    });
    for (const event of ['pointerup', 'pointercancel', 'lostpointercapture'])
      run.addEventListener(event, () => {
        this.runHeld = false;
        run.classList.remove('active');
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
  private reset() {
    this.keys.clear();
    this.stick.set(0, 0);
    this.runHeld = false;
    const knob = document.querySelector<HTMLElement>('#joystick>div');
    if (knob) knob.style.transform = '';
    document.getElementById('run')!.classList.remove('active');
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
    if (!this.enabled) return;
    this.updateAim();
    this.onAttack(kind, this.yaw);
  }
  sample(seq: number): InputFrame {
    const k = this.keys;
    let sx = this.enabled
      ? this.stick.x +
        Number(k.has('KeyD') || k.has('ArrowRight')) -
        Number(k.has('KeyA') || k.has('ArrowLeft'))
      : 0;
    let sz = this.enabled
      ? this.stick.y +
        Number(k.has('KeyS') || k.has('ArrowDown')) -
        Number(k.has('KeyW') || k.has('ArrowUp'))
      : 0;
    const length = Math.hypot(sx, sz);
    if (length > 1) {
      sx /= length;
      sz /= length;
    }
    // Screen axes are projected onto the fixed isometric camera's ground plane.
    const x = sx * 0.874 + sz * 0.486,
      z = -sx * 0.486 + sz * 0.874;
    if (length > 0.01) {
      this.yaw = Math.atan2(x, z);
      this.aim = false;
    }
    return {
      seq,
      x,
      z,
      run: this.enabled && (this.runHeld || k.has('ShiftLeft') || k.has('ShiftRight')),
      yaw: this.yaw,
    };
  }
}
