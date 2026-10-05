import { PerspectiveCamera, Vector3, MathUtils } from 'three';
export class FollowCamera {
  readonly camera = new PerspectiveCamera(42, innerWidth / innerHeight, 0.1, 110);
  private focus = new Vector3(0, 0, 0);
  private zoom = 1;
  constructor() {
    this.update(new Vector3(0, 0, 0), 1, true);
    window.addEventListener(
      'wheel',
      (e) => {
        this.zoom = MathUtils.clamp(this.zoom + e.deltaY * 0.0007, 0.65, 1.45);
      },
      { passive: true },
    );
  }
  update(position: Vector3, dt: number, snap = false) {
    this.focus.lerp(position, snap ? 1 : 1 - Math.exp(-dt * 5));
    const aspectScale = this.camera.aspect < 0.85 ? 1.23 : 1;
    this.camera.position
      .copy(this.focus)
      .add(new Vector3(10, 16, 18).multiplyScalar(this.zoom * aspectScale));
    this.camera.lookAt(this.focus.x, this.focus.y + 0.3, this.focus.z);
  }
  resize() {
    this.camera.aspect = innerWidth / innerHeight;
    this.camera.updateProjectionMatrix();
  }
}
