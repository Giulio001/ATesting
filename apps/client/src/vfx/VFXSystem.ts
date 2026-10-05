import * as T from 'three';
import { type CombatEvent } from '@aetheria/shared';
interface Effect {
  root: T.Group;
  age: number;
  duration: number;
  kind: 'slash' | 'aether' | 'skill' | 'hit' | 'guard';
}
export class VFXSystem {
  private effects: Effect[] = [];
  constructor(private scene: T.Scene) {}
  combat(e: CombatEvent) {
    const root = new T.Group();
    root.position.set(e.x, 0.06, e.z);
    root.rotation.y = e.yaw;
    this.scene.add(root);
    if (e.kind !== 'skill') {
      const arc = new T.Mesh(
        new T.RingGeometry(0.8, 2.25, 48, 1, 0.2, Math.PI * 0.7),
        new T.MeshBasicMaterial({
          color: 0xffe4a1,
          transparent: true,
          opacity: 0.8,
          side: T.DoubleSide,
          depthWrite: false,
          blending: T.AdditiveBlending,
        }),
      );
      arc.rotation.x = -Math.PI / 2;
      arc.rotation.z = -Math.PI * 0.35;
      arc.position.y = 1.1;
      root.add(arc);
    } else {
      for (const radius of [0.8, 1]) {
        const ring = new T.Mesh(
          new T.TorusGeometry(radius, 0.04, 8, 80),
          new T.MeshBasicMaterial({
            color: 0x99ecfa,
            transparent: true,
            opacity: 1,
            blending: T.AdditiveBlending,
            depthWrite: false,
          }),
        );
        ring.rotation.x = -Math.PI / 2;
        root.add(ring);
      }
      const light = new T.PointLight(0x79dbed, 8, 7);
      light.position.y = 1;
      root.add(light);
    }
    this.effects.push({ root, age: 0, duration: e.kind === 'skill' ? 0.7 : 0.32, kind: e.kind });
    for (const hit of e.hits) {
      const sparks = new T.Group();
      sparks.position.set(hit.x, 1.2, hit.z);
      this.scene.add(sparks);
      for (let i = 0; i < 12; i++) {
        const m = new T.Mesh(
          new T.OctahedronGeometry(0.035),
          new T.MeshBasicMaterial({ color: e.kind === 'skill' ? 0xa3f2ff : 0xffdb95 }),
        );
        const a = (i / 12) * Math.PI * 2;
        m.userData.velocity = new T.Vector3(
          Math.cos(a) * 1.8,
          0.3 + (i % 3) * 0.7,
          Math.sin(a) * 1.8,
        );
        sparks.add(m);
      }
      this.effects.push({ root: sparks, age: 0, duration: 0.45, kind: 'hit' });
    }
  }
  guard(x: number, z: number) {
    const root = new T.Group();
    root.position.set(x, 1, z);
    const sphere = new T.Mesh(
      new T.SphereGeometry(1.15, 20, 12),
      new T.MeshBasicMaterial({
        color: 0x8bddff,
        transparent: true,
        opacity: 0.16,
        wireframe: true,
        depthWrite: false,
      }),
    );
    root.add(sphere);
    this.scene.add(root);
    this.effects.push({ root, age: 0, duration: 2.5, kind: 'guard' });
  }
  damage(x: number, z: number) {
    const root = new T.Group();
    root.position.set(x, 0.05, z);
    this.scene.add(root);
    const ring = new T.Mesh(
      new T.RingGeometry(0.5, 1.65, 48),
      new T.MeshBasicMaterial({
        color: 0xeb776d,
        transparent: true,
        opacity: 0.8,
        side: T.DoubleSide,
        depthWrite: false,
      }),
    );
    ring.rotation.x = -Math.PI / 2;
    root.add(ring);
    this.effects.push({ root, age: 0, duration: 0.3, kind: 'slash' });
  }
  update(dt: number) {
    for (let i = this.effects.length - 1; i >= 0; i--) {
      const e = this.effects[i];
      e.age += dt;
      const t = e.age / e.duration;
      if (e.kind === 'skill') e.root.scale.setScalar(0.5 + t * 3.5);
      if (e.kind !== 'skill') e.root.rotation.y += dt * 5;
      e.root.children.forEach((c) => {
        if (c instanceof T.Mesh) {
          (c.material as T.MeshBasicMaterial).opacity = (e.kind === 'guard' ? 0.16 : 1) * (1 - t);
          if (e.kind === 'hit') c.position.addScaledVector(c.userData.velocity, dt);
        }
        if (c instanceof T.PointLight) c.intensity = 8 * (1 - t);
      });
      if (t >= 1) {
        e.root.traverse((o) => {
          if (o instanceof T.Mesh) {
            o.geometry.dispose();
            (o.material as T.Material).dispose();
          }
        });
        this.scene.remove(e.root);
        this.effects.splice(i, 1);
      }
    }
  }
}
