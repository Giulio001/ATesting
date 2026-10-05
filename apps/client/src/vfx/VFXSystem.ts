import * as T from 'three';
import { MAGE_SPELL, type CombatEvent } from '@aetheria/shared';
type Kind = 'slash' | 'nova' | 'beam' | 'hit' | 'guard' | 'projectile';
interface Effect {
  root: T.Group;
  age: number;
  duration: number;
  kind: Kind;
  projectileId?: string;
  playerId?: string;
  speed?: number;
}
const palette = { warrior: 0xffc878, archer: 0x83ffd0, mage: 0xb58aff };
export class VFXSystem {
  private effects: Effect[] = [];
  constructor(private scene: T.Scene) {}
  private mesh(root: T.Group, geometry: T.BufferGeometry, color: number, opacity = 1) {
    const material = new T.MeshBasicMaterial({
      color,
      transparent: true,
      opacity,
      side: T.DoubleSide,
      blending: T.AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
    });
    material.color.multiplyScalar(1.8);
    const mesh = new T.Mesh(geometry, material);
    mesh.userData.opacity = opacity;
    root.add(mesh);
    return mesh;
  }
  private light(root: T.Group, color: number, intensity: number, distance = 6) {
    // Bound temporary lights during crowded multiplayer fights.
    if (
      this.effects.reduce(
        (n, e) => n + e.root.children.filter((c) => c instanceof T.PointLight).length,
        0,
      ) >= 6
    )
      return;
    const light = new T.PointLight(color, intensity, distance, 2);
    light.position.y = 1.2;
    light.userData.intensity = intensity;
    root.add(light);
  }
  private add(root: T.Group, kind: Kind, duration: number, extra: Partial<Effect> = {}) {
    if (this.effects.length >= 96) this.remove(0);
    this.scene.add(root);
    this.effects.push({ root, kind, duration, age: 0, ...extra });
  }
  private remove(index: number) {
    this.effects[index].root.traverse((o) => {
      if (o instanceof T.Mesh) {
        o.geometry.dispose();
        (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => m.dispose());
      }
    });
    this.scene.remove(this.effects[index].root);
    this.effects.splice(index, 1);
  }
  private sparks(x: number, z: number, color: number) {
    const root = new T.Group();
    root.position.set(x, 1.05, z);
    for (let i = 0; i < 16; i++) {
      const spark = this.mesh(root, new T.OctahedronGeometry(i % 4 ? 0.035 : 0.07), color);
      const a = i * 2.399;
      spark.userData.velocity = new T.Vector3(
        Math.cos(a) * (1.2 + (i % 3)),
        0.5 + (i % 4) * 0.45,
        Math.sin(a) * (1.2 + (i % 3)),
      );
    }
    const flash = this.mesh(root, new T.SphereGeometry(0.24, 12, 8), color, 0.6);
    flash.userData.flash = true;
    this.light(root, color, 7, 4);
    this.add(root, 'hit', 0.48);
  }
  combat(e: CombatEvent) {
    const mage = e.heroClass === 'VOID_KNIGHT',
      archer = e.heroClass === 'AETHER_BLADE';
    const color = mage
      ? palette.mage
      : archer
        ? palette.archer
        : e.kind === 'skill'
          ? 0x8adfff
          : palette.warrior;
    if (e.impactOnly) {
      const index = this.effects.findIndex((fx) => fx.projectileId === e.projectile?.id);
      if (index >= 0) this.remove(index);
    } else {
      const root = new T.Group();
      root.position.set(e.x, 0.06, e.z);
      root.rotation.y = e.yaw;
      if (e.projectile) {
        root.position.y = 1.15;
        if (archer) {
          const shaft = this.mesh(root, new T.CylinderGeometry(0.018, 0.018, 0.75, 5), color);
          shaft.rotation.x = Math.PI / 2;
          const head = this.mesh(root, new T.ConeGeometry(0.07, 0.18, 4), 0xeefff7);
          head.rotation.x = Math.PI / 2;
          head.position.z = 0.42;
        } else {
          this.mesh(root, new T.IcosahedronGeometry(0.12, 1), 0xefddff);
          this.mesh(root, new T.SphereGeometry(0.23, 12, 8), color, 0.3);
        }
        const length = e.kind === 'slash' ? 0.8 : 1.5;
        for (let i = 0; i < 8; i++) {
          const mote = this.mesh(
            root,
            new T.SphereGeometry(0.06 * (1 - i / 10), 6, 4),
            color,
            0.65 * (1 - i / 9),
          );
          mote.position.set(Math.sin(i * 2.4) * 0.03, Math.cos(i * 2.4) * 0.03, (-i * length) / 8);
        }
        if (mage || e.kind !== 'slash') this.light(root, color, 3, 3);
        this.add(root, 'projectile', e.projectile.range / e.projectile.speed + 0.25, {
          projectileId: e.projectile.id,
          speed: e.projectile.speed,
        });
      } else if (mage && e.kind === 'aether') {
        const length = MAGE_SPELL.beamLength;
        for (const [width, opacity] of [
          [0.055, 1],
          [0.16, 0.45],
          [0.34, 0.1],
        ]) {
          const beam = this.mesh(
            root,
            new T.CylinderGeometry(width, width, length, 12),
            color,
            opacity,
          );
          beam.rotation.x = Math.PI / 2;
          beam.position.set(0, 1.1, length / 2);
        }
        for (let i = 0; i < 5; i++) {
          const rune = this.mesh(
            root,
            new T.TorusGeometry(0.25 + i * 0.04, 0.018, 6, 24),
            color,
            0.65,
          );
          rune.position.set(0, 1.1, 0.5 + i * 1.3);
          rune.userData.spin = 1;
        }
        this.light(root, color, 10, 8);
        this.add(root, 'beam', 0.45);
      } else if (e.kind === 'skill') {
        for (const [radius, thickness] of [
          [1, 0.035],
          [0.83, 0.02],
        ]) {
          const ring = this.mesh(root, new T.TorusGeometry(radius, thickness, 8, 64), color, 0.9);
          ring.rotation.x = -Math.PI / 2;
          ring.position.y = 0.12;
        }
        const dome = this.mesh(
          root,
          new T.SphereGeometry(1, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2),
          color,
          0.12,
        );
        dome.scale.y = 0.45;
        for (let i = 0; i < 18; i++) {
          const shard = this.mesh(root, new T.OctahedronGeometry(0.03), color, 0.8);
          shard.position.set(
            Math.sin(i * 2.399) * 0.7,
            0.15 + (i % 3) * 0.07,
            Math.cos(i * 2.399) * 0.7,
          );
        }
        this.light(root, color, 15, 9);
        this.add(root, 'nova', 0.72);
      } else {
        for (let i = 0; i < 3; i++) {
          const arc = this.mesh(
            root,
            new T.RingGeometry(1 + i * 0.15, 2.1 + i * 0.1, 48, 1, 0.2, Math.PI * 0.7),
            i ? color : 0xfff0cd,
            0.8 / (i + 1),
          );
          arc.rotation.x = -Math.PI / 2;
          arc.rotation.z = -Math.PI * 0.35;
          arc.position.y = 1.05 + i * 0.035;
        }
        this.light(root, color, e.kind === 'aether' ? 9 : 4);
        this.add(root, 'slash', 0.3);
      }
    }
    for (const hit of e.hits) this.sparks(hit.x, hit.z, color);
  }
  guard(x: number, z: number, cls = 'GUARDIAN', playerId = '') {
    const index = this.effects.findIndex((e) => e.kind === 'guard' && e.playerId === playerId);
    if (index >= 0) this.remove(index);
    const color =
      cls === 'VOID_KNIGHT' ? palette.mage : cls === 'AETHER_BLADE' ? palette.archer : 0x8bddff;
    const root = new T.Group();
    root.position.set(x, 1, z);
    this.mesh(root, new T.SphereGeometry(1.1, 24, 16), color, 0.1);
    const grid = this.mesh(root, new T.IcosahedronGeometry(1.12, 1), color, 0.25);
    (grid.material as T.MeshBasicMaterial).wireframe = true;
    for (let i = 0; i < 2; i++) {
      const ring = this.mesh(root, new T.TorusGeometry(1.12, 0.018, 6, 48), color, 0.45);
      ring.rotation.x = Math.PI / 2 + i * 0.65;
      ring.userData.spin = i ? -0.6 : 0.6;
    }
    this.light(root, color, 4, 4);
    this.add(root, 'guard', 2.5, { playerId });
  }
  moveGuard(id: string, x: number, z: number) {
    for (const e of this.effects)
      if (e.kind === 'guard' && e.playerId === id) e.root.position.set(x, 1, z);
  }
  damage(x: number, z: number) {
    this.sparks(x, z, 0xeb776d);
  }
  clear() {
    while (this.effects.length) this.remove(this.effects.length - 1);
  }
  update(dt: number) {
    for (let i = this.effects.length - 1; i >= 0; i--) {
      const e = this.effects[i];
      e.age += dt;
      const t = Math.min(1, e.age / e.duration),
        fade = 1 - t;
      if (e.kind === 'projectile') e.root.translateZ((e.speed ?? 0) * dt);
      if (e.kind === 'nova') e.root.scale.setScalar(0.3 + Math.sin((t * Math.PI) / 2) * 3.5);
      if (e.kind === 'slash') e.root.rotation.y += dt * 3.5;
      if (e.kind === 'guard') e.root.rotation.y += dt * 0.35;
      for (const c of e.root.children) {
        if (c instanceof T.Mesh) {
          (c.material as T.MeshBasicMaterial).opacity =
            (c.userData.opacity ?? 1) *
            (e.kind === 'projectile' ? 1 : e.kind === 'guard' ? Math.min(1, fade * 5) : fade);
          if (c.userData.spin) c.rotation.z += dt * c.userData.spin * 3;
          if (e.kind === 'hit' && c.userData.velocity) {
            c.position.addScaledVector(c.userData.velocity, dt);
            c.userData.velocity.y -= dt * 4;
          }
          if (c.userData.flash) c.scale.setScalar(0.5 + t * 2);
        }
        if (c instanceof T.PointLight)
          c.intensity = c.userData.intensity * (e.kind === 'projectile' ? 1 : fade ** 2);
      }
      if (t >= 1) this.remove(i);
    }
  }
}
