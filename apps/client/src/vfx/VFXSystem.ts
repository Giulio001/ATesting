import * as T from 'three';
import { ATTACKS, MAGE_SPELL, type CombatEvent } from '@aetheria/shared';
type Kind = 'slash' | 'nova' | 'beam' | 'hit' | 'guard' | 'projectile';
interface Effect {
  root: T.Group;
  age: number;
  duration: number;
  kind: Kind;
  projectileId?: string;
  playerId?: string;
  speed?: number;
  origin?: T.Vector3;
  direction?: T.Vector3;
  launchOffset?: T.Vector3;
  range?: number;
  beamEnd?: T.Vector3;
  trail?: {
    bases: T.Vector3[];
    tips: T.Vector3[];
    geometry: T.BufferGeometry;
    count: number;
  };
}
const palette = { warrior: 0xffc878, archer: 0x83ffd0, mage: 0xb58aff };
export class VFXSystem {
  private effects: Effect[] = [];
  private low = false;
  private weaponBase = new T.Vector3();
  private weaponTip = new T.Vector3();
  constructor(
    private scene: T.Scene,
    private weaponPose: (id: string, base: T.Vector3, tip: T.Vector3) => boolean,
  ) {}
  setQuality(low: boolean) {
    this.low = low;
    if (low) {
      for (const effect of this.effects) {
        for (const child of [...effect.root.children]) {
          if (child instanceof T.PointLight) effect.root.remove(child);
        }
      }
      while (this.effects.length > 48) this.remove(0);
    }
  }
  private segments(count: number) {
    return this.low ? Math.max(4, Math.floor(count / 2)) : count;
  }
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
    // Additive meshes retain luminous spells without lighting the entire scene on mobile.
    if (this.low) return;
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
    if (this.effects.length >= (this.low ? 48 : 96)) this.remove(0);
    this.scene.add(root);
    const effect = { root, kind, duration, age: 0, ...extra };
    this.effects.push(effect);
    return effect;
  }
  private bladeTrail(e: CombatEvent, color: number) {
    const segments = this.low ? 6 : 10;
    const geometry = new T.BufferGeometry();
    geometry.setAttribute(
      'position',
      new T.BufferAttribute(new Float32Array(segments * 18), 3).setUsage(T.DynamicDrawUsage),
    );
    const colors = new Float32Array(segments * 18);
    for (let i = 0; i < segments; i++) {
      const intensity = 1 - i / segments;
      colors.fill(intensity, i * 18, (i + 1) * 18);
    }
    geometry.setAttribute('color', new T.BufferAttribute(colors, 3));
    geometry.setDrawRange(0, 0);
    const root = new T.Group();
    const mesh = this.mesh(root, geometry, color, 0.75);
    (mesh.material as T.MeshBasicMaterial).vertexColors = true;
    mesh.frustumCulled = false;
    this.light(root, color, e.kind === 'aether' ? 9 : 4);
    const effect = this.add(root, 'slash', ATTACKS[e.kind].duration, {
      playerId: e.playerId,
      trail: {
        bases: Array.from({ length: segments + 1 }, () => new T.Vector3()),
        tips: Array.from({ length: segments + 1 }, () => new T.Vector3()),
        geometry,
        count: 0,
      },
    });
    this.updateTrail(effect);
  }
  private updateTrail(effect: Effect) {
    const trail = effect.trail!;
    if (!effect.playerId || !this.weaponPose(effect.playerId, this.weaponBase, this.weaponTip)) {
      trail.count = 0;
      trail.geometry.setDrawRange(0, 0);
      return;
    }
    const base = trail.bases.pop()!,
      tip = trail.tips.pop()!;
    base.copy(this.weaponBase);
    tip.copy(this.weaponTip);
    trail.bases.unshift(base);
    trail.tips.unshift(tip);
    trail.count = Math.min(trail.count + 1, trail.bases.length);
    const positions = trail.geometry.getAttribute('position') as T.BufferAttribute;
    for (let i = 0; i < trail.count - 1; i++) {
      const base = trail.bases[i],
        tip = trail.tips[i],
        previousBase = trail.bases[i + 1],
        previousTip = trail.tips[i + 1];
      const vertex = i * 6;
      positions.setXYZ(vertex, base.x, base.y, base.z);
      positions.setXYZ(vertex + 1, tip.x, tip.y, tip.z);
      positions.setXYZ(vertex + 2, previousTip.x, previousTip.y, previousTip.z);
      positions.setXYZ(vertex + 3, base.x, base.y, base.z);
      positions.setXYZ(vertex + 4, previousTip.x, previousTip.y, previousTip.z);
      positions.setXYZ(vertex + 5, previousBase.x, previousBase.y, previousBase.z);
    }
    positions.needsUpdate = true;
    trail.geometry.setDrawRange(0, (trail.count - 1) * 6);
    for (const child of effect.root.children) {
      if (child instanceof T.PointLight) child.position.copy(this.weaponTip);
    }
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
    for (let i = 0; i < (this.low ? 8 : 16); i++) {
      const spark = this.mesh(root, new T.OctahedronGeometry(i % 4 ? 0.035 : 0.07), color);
      const a = i * 2.399;
      spark.userData.velocity = new T.Vector3(
        Math.cos(a) * (1.2 + (i % 3)),
        0.5 + (i % 4) * 0.45,
        Math.sin(a) * (1.2 + (i % 3)),
      );
    }
    const flash = this.mesh(
      root,
      new T.SphereGeometry(0.24, this.segments(12), this.segments(8)),
      color,
      0.6,
    );
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
        const origin = new T.Vector3(e.x, 1.15, e.z);
        const launchOffset = new T.Vector3();
        if (this.weaponPose(e.playerId, this.weaponBase, this.weaponTip))
          launchOffset.copy(this.weaponTip).sub(origin);
        root.position.copy(origin).add(launchOffset);
        if (archer) {
          const shaft = this.mesh(root, new T.CylinderGeometry(0.018, 0.018, 0.75, 5), color);
          shaft.rotation.x = Math.PI / 2;
          const head = this.mesh(root, new T.ConeGeometry(0.07, 0.18, 4), 0xeefff7);
          head.rotation.x = Math.PI / 2;
          head.position.z = 0.42;
        } else {
          this.mesh(root, new T.IcosahedronGeometry(0.12, 1), 0xefddff);
          this.mesh(
            root,
            new T.SphereGeometry(0.23, this.segments(12), this.segments(8)),
            color,
            0.3,
          );
        }
        const length = e.kind === 'slash' ? 0.8 : 1.5;
        const motes = this.low ? 4 : 8;
        for (let i = 0; i < motes; i++) {
          const mote = this.mesh(
            root,
            new T.SphereGeometry(0.06 * (1 - i / 10), 6, 4),
            color,
            0.65 * (1 - i / 9),
          );
          mote.position.set(
            Math.sin(i * 2.4) * 0.03,
            Math.cos(i * 2.4) * 0.03,
            (-i * length) / motes,
          );
        }
        if (mage || e.kind !== 'slash') this.light(root, color, 3, 3);
        this.add(root, 'projectile', e.projectile.range / e.projectile.speed + 0.25, {
          projectileId: e.projectile.id,
          speed: e.projectile.speed,
          range: e.projectile.range,
          origin,
          launchOffset,
          direction: new T.Vector3(Math.sin(e.yaw), 0, Math.cos(e.yaw)),
        });
      } else if (mage && e.kind === 'aether') {
        const length = MAGE_SPELL.beamLength;
        root.position.set(e.x, 1.15, e.z);
        if (this.weaponPose(e.playerId, this.weaponBase, this.weaponTip))
          root.position.copy(this.weaponTip);
        const beamEnd = new T.Vector3(
          e.x + Math.sin(e.yaw) * length,
          1.15,
          e.z + Math.cos(e.yaw) * length,
        );
        root.lookAt(beamEnd);
        root.scale.z = root.position.distanceTo(beamEnd) / length;
        for (const [width, opacity] of [
          [0.055, 1],
          [0.16, 0.45],
          [0.34, 0.1],
        ]) {
          const beam = this.mesh(
            root,
            new T.CylinderGeometry(width, width, length, this.segments(12)),
            color,
            opacity,
          );
          beam.rotation.x = Math.PI / 2;
          beam.position.set(0, 0, length / 2);
        }
        for (let i = 0; i < 5; i++) {
          const rune = this.mesh(
            root,
            new T.TorusGeometry(0.25 + i * 0.04, 0.018, this.segments(6), this.segments(24)),
            color,
            0.65,
          );
          rune.position.set(0, 0, 0.5 + i * 1.3);
          rune.userData.spin = 1;
        }
        this.light(root, color, 10, 8);
        this.add(root, 'beam', ATTACKS[e.kind].duration, { playerId: e.playerId, beamEnd });
      } else if (e.kind === 'skill') {
        for (const [radius, thickness] of [
          [1, 0.035],
          [0.83, 0.02],
        ]) {
          const ring = this.mesh(
            root,
            new T.TorusGeometry(radius, thickness, this.segments(8), this.segments(64)),
            color,
            0.9,
          );
          ring.rotation.x = -Math.PI / 2;
          ring.position.y = 0.12;
        }
        const dome = this.mesh(
          root,
          new T.SphereGeometry(
            1,
            this.segments(24),
            this.segments(12),
            0,
            Math.PI * 2,
            0,
            Math.PI / 2,
          ),
          color,
          0.12,
        );
        dome.scale.y = 0.45;
        for (let i = 0; i < (this.low ? 9 : 18); i++) {
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
        if (this.weaponPose(e.playerId, this.weaponBase, this.weaponTip)) {
          this.bladeTrail(e, color);
        } else {
          for (let i = 0; i < 3; i++) {
            const arc = this.mesh(
              root,
              new T.RingGeometry(
                1 + i * 0.15,
                2.1 + i * 0.1,
                this.segments(48),
                1,
                0.2,
                Math.PI * 0.7,
              ),
              i ? color : 0xfff0cd,
              0.8 / (i + 1),
            );
            arc.rotation.x = -Math.PI / 2;
            arc.rotation.z = -Math.PI * 0.35;
            arc.position.y = 1.05 + i * 0.035;
          }
          this.light(root, color, e.kind === 'aether' ? 9 : 4);
          this.add(root, 'slash', ATTACKS[e.kind].duration);
        }
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
    this.mesh(root, new T.SphereGeometry(1.1, this.segments(24), this.segments(16)), color, 0.1);
    const grid = this.mesh(root, new T.IcosahedronGeometry(1.12, 1), color, 0.25);
    (grid.material as T.MeshBasicMaterial).wireframe = true;
    for (let i = 0; i < 2; i++) {
      const ring = this.mesh(
        root,
        new T.TorusGeometry(1.12, 0.018, this.segments(6), this.segments(48)),
        color,
        0.45,
      );
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
      if (e.kind === 'projectile' && e.origin && e.direction && e.launchOffset) {
        e.root.position
          .copy(e.origin)
          .addScaledVector(e.direction, Math.min(e.age * (e.speed ?? 0), e.range ?? Infinity))
          .addScaledVector(e.launchOffset, Math.max(0, 1 - e.age / 0.16));
      }
      if (e.trail) this.updateTrail(e);
      if (e.beamEnd && e.playerId && this.weaponPose(e.playerId, this.weaponBase, this.weaponTip)) {
        e.root.position.copy(this.weaponTip);
        e.root.lookAt(e.beamEnd);
        e.root.scale.z = e.root.position.distanceTo(e.beamEnd) / MAGE_SPELL.beamLength;
      }
      if (e.kind === 'nova') e.root.scale.setScalar(0.3 + Math.sin((t * Math.PI) / 2) * 3.5);
      if (e.kind === 'slash' && !e.trail) e.root.rotation.y += dt * 3.5;
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
