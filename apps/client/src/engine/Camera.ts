import { PerspectiveCamera, Vector3, MathUtils } from 'three';

/** Base framing of the isometric follow camera, before zoom and shake. */
const BASE_OFFSET = new Vector3(8, 12.5, 14.4);
const BASE_FOV = 42;

/**
 * Follow camera with a trauma-driven shake (Perlin-ish sum of sines, so it reads
 * as a physical kick instead of a jitter) and an FOV punch reserved for the
 * heaviest abilities. Both decay on their own and never fight the follow lerp.
 */
export class FollowCamera {
  readonly camera = new PerspectiveCamera(BASE_FOV, innerWidth / innerHeight, 0.1, 110);
  private focus = new Vector3(0, 0, 0);
  private zoom = 1;
  private trauma = 0;
  private traumaDecay = 3;
  private fovKick = 0;
  private shakeOffset = new Vector3();
  private roll = 0;

  constructor() {
    this.update(new Vector3(0, 0, 0), 1, true);
    window.addEventListener(
      'wheel',
      (e) => {
        if (e.target !== document.getElementById('game')) return;
        this.zoom = MathUtils.clamp(this.zoom + e.deltaY * 0.0007, 0.65, 1.45);
      },
      { passive: true },
    );
  }

  /** Adds trauma in 0..1; the visible amplitude is squared so small hits stay subtle. */
  shake(strength: number, duration = 0.25) {
    this.trauma = Math.min(1, Math.max(this.trauma, MathUtils.clamp(strength, 0, 1)));
    this.traumaDecay = 1 / Math.max(0.08, duration);
  }

  /** Brief field-of-view expansion for novas, boss slams and heavy impacts. */
  punch(amount: number) {
    this.fovKick = Math.max(this.fovKick, amount);
  }

  update(position: Vector3, dt: number, snap = false) {
    this.focus.lerp(position, snap ? 1 : 1 - Math.exp(-dt * 5));
    const aspectScale = this.camera.aspect < 0.85 ? 1.23 : 1;
    const time = performance.now() / 1000;
    if (this.trauma > 0.001) {
      const amplitude = this.trauma * this.trauma;
      this.shakeOffset.set(
        (Math.sin(time * 47.3) + Math.sin(time * 31.7)) * 0.5,
        (Math.sin(time * 53.1) + Math.sin(time * 27.3)) * 0.5,
        (Math.sin(time * 41.9) + Math.sin(time * 61.1)) * 0.5,
      );
      this.shakeOffset.multiplyScalar(amplitude * 0.4);
      this.roll = (Math.sin(time * 37.7) + Math.sin(time * 19.3)) * 0.5 * amplitude * 0.05;
      this.trauma = Math.max(0, this.trauma - dt * this.traumaDecay);
    } else {
      this.shakeOffset.set(0, 0, 0);
      this.roll = 0;
      this.trauma = 0;
    }
    this.camera.position
      .copy(this.focus)
      .addScaledVector(BASE_OFFSET, this.zoom * aspectScale)
      .add(this.shakeOffset);
    this.camera.lookAt(this.focus.x, this.focus.y + 0.3, this.focus.z);
    if (this.roll) this.camera.rotateZ(this.roll);
    this.fovKick *= Math.exp(-dt * 7);
    if (this.fovKick < 0.01) this.fovKick = 0;
    const fov = BASE_FOV + this.fovKick;
    if (Math.abs(this.camera.fov - fov) > 0.01) {
      this.camera.fov = fov;
      this.camera.updateProjectionMatrix();
    }
  }

  resize() {
    this.camera.aspect = innerWidth / innerHeight;
    this.camera.updateProjectionMatrix();
  }
}
