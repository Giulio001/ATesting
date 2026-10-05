import * as T from 'three';
import { ATTACKS, type AttackKind } from '@aetheria/shared';
import { AnimationController } from '../animation/AnimationController';
import type { AssetLoader } from '../engine/AssetLoader';

export class Warrior {
  readonly root = new T.Group();
  private body = new T.Group();
  private rightArm = new T.Group();
  private leftArm = new T.Group();
  private rightLeg = new T.Group();
  private leftLeg = new T.Group();
  private cape!: T.Mesh;
  private animation?: AnimationController;
  private phase = 0;
  private attackTime = 0;
  private kind: AttackKind = 'slash';
  private combo = 0;
  private disposed = false;
  constructor(assets: AssetLoader, local = false) {
    const imported = assets.instantiateWarrior();
    if (imported) {
      this.body.add(imported.root);
      this.animation = new AnimationController(imported.root, imported.clips);
    } else this.build(local);
    this.root.add(this.body);
    const ring = new T.Mesh(
      new T.RingGeometry(0.46, 0.51, 48),
      new T.MeshBasicMaterial({
        color: local ? 0x9ae9d4 : 0xd3b77e,
        transparent: true,
        opacity: 0.75,
        side: T.DoubleSide,
      }),
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.012;
    this.root.add(ring);
  }
  private build(local: boolean) {
    const armor = new T.MeshStandardMaterial({
      color: local ? 0x8eafb9 : 0x8a939f,
      metalness: 0.65,
      roughness: 0.35,
      flatShading: true,
    });
    const gold = new T.MeshStandardMaterial({
      color: 0xc4a66a,
      metalness: 0.6,
      roughness: 0.38,
      flatShading: true,
    });
    const cloth = new T.MeshStandardMaterial({
      color: local ? 0x244d68 : 0x51426b,
      roughness: 1,
      flatShading: true,
    });
    const dark = new T.MeshStandardMaterial({
      color: 0x233543,
      metalness: 0.4,
      roughness: 0.6,
      flatShading: true,
    });
    const mesh = (
      geo: T.BufferGeometry,
      mat: T.Material,
      parent: T.Object3D,
      x = 0,
      y = 0,
      z = 0,
    ) => {
      const m = new T.Mesh(geo, mat);
      m.position.set(x, y, z);
      m.castShadow = true;
      m.receiveShadow = true;
      parent.add(m);
      return m;
    };
    mesh(new T.CylinderGeometry(0.3, 0.24, 0.56, 6), armor, this.body, 0, 1.12);
    mesh(new T.BoxGeometry(0.54, 0.12, 0.36), gold, this.body, 0, 0.88);
    mesh(new T.ConeGeometry(0.36, 0.33, 6), cloth, this.body, 0, 0.7).rotation.z = Math.PI;
    mesh(new T.BoxGeometry(0.17, 0.22, 0.1), gold, this.body, 0, 1.2, 0.28).rotation.z =
      Math.PI / 4;
    mesh(new T.CylinderGeometry(0.22, 0.24, 0.4, 8), armor, this.body, 0, 1.63);
    mesh(new T.BoxGeometry(0.35, 0.065, 0.1), dark, this.body, 0, 1.67, 0.21);
    mesh(new T.BoxGeometry(0.04, 0.3, 0.08), gold, this.body, 0, 1.61, 0.26);
    mesh(new T.ConeGeometry(0.12, 0.35, 4), gold, this.body, 0, 1.92).scale.z = 0.4;
    this.cape = mesh(new T.BoxGeometry(0.54, 0.85, 0.07), cloth, this.body, 0, 0.93, -0.29);
    this.cape.rotation.x = 0.12;
    for (const [arm, sign] of [
      [this.leftArm, -1],
      [this.rightArm, 1],
    ] as const) {
      arm.position.set(sign * 0.38, 1.32, 0);
      this.body.add(arm);
      const shoulder = mesh(new T.SphereGeometry(0.22, 6, 4), gold, arm);
      shoulder.scale.set(1, 0.65, 1.1);
      mesh(new T.CylinderGeometry(0.11, 0.12, 0.52, 6), armor, arm, 0, -0.25);
      mesh(new T.BoxGeometry(0.19, 0.15, 0.2), dark, arm, 0, -0.53);
    }
    for (const [leg, sign] of [
      [this.leftLeg, -1],
      [this.rightLeg, 1],
    ] as const) {
      leg.position.set(sign * 0.15, 0.78, 0);
      this.body.add(leg);
      mesh(new T.CylinderGeometry(0.13, 0.105, 0.66, 6), armor, leg, 0, -0.33);
      mesh(new T.BoxGeometry(0.23, 0.15, 0.38), dark, leg, 0, -0.67, 0.07);
      mesh(new T.BoxGeometry(0.21, 0.09, 0.15), gold, leg, 0, -0.34, 0.1);
    }
    const sword = new T.Group();
    sword.position.set(0, -0.53, 0.12);
    sword.rotation.x = -0.25;
    this.rightArm.add(sword);
    mesh(new T.CylinderGeometry(0.035, 0.035, 0.25, 6), dark, sword, 0, 0);
    mesh(new T.BoxGeometry(0.36, 0.05, 0.13), gold, sword, 0, 0.14);
    const blade = mesh(new T.ConeGeometry(0.1, 1.04, 4), armor, sword, 0, 0.65);
    blade.scale.z = 0.45;
    const shield = new T.Group();
    shield.position.set(-0.08, -0.24, 0.16);
    shield.rotation.y = -0.18;
    this.leftArm.add(shield);
    const front = mesh(new T.CylinderGeometry(0.31, 0.27, 0.09, 6), gold, shield);
    front.rotation.x = Math.PI / 2;
    front.scale.z = 1.25;
    const center = mesh(new T.CylinderGeometry(0.25, 0.23, 0.11, 6), cloth, shield, 0, 0, 0.03);
    center.rotation.x = Math.PI / 2;
    center.scale.z = 1.25;
    mesh(new T.BoxGeometry(0.06, 0.36, 0.1), gold, shield, 0, 0, 0.11);
    mesh(new T.BoxGeometry(0.24, 0.055, 0.1), gold, shield, 0, 0.03, 0.11);
  }
  attack(kind: AttackKind, yaw: number) {
    this.kind = kind;
    this.attackTime = ATTACKS[kind].duration;
    this.combo = (this.combo + 1) % 3;
    this.body.rotation.y = yaw;
    this.animation?.play(kind === 'skill' ? 'Skill01' : (`Attack0${this.combo + 1}` as 'Attack01'));
  }
  update(dt: number, moving: boolean, running: boolean, yaw: number) {
    if (this.disposed) return;
    const active = this.attackTime > 0;
    this.attackTime = Math.max(0, this.attackTime - dt);
    this.phase += dt * (moving ? (running ? 11 : 7) : 2);
    if (!active) {
      const delta = Math.atan2(
        Math.sin(yaw - this.body.rotation.y),
        Math.cos(yaw - this.body.rotation.y),
      );
      this.body.rotation.y += delta * (1 - Math.exp(-dt * 18));
      this.animation?.play(moving ? (running ? 'Run' : 'Walk') : 'Idle');
    }
    if (this.animation) {
      this.animation.update(dt);
      return;
    }
    const stride = moving ? (running ? 0.75 : 0.48) : 0;
    const wave = Math.sin(this.phase) * stride;
    this.leftLeg.rotation.x = wave;
    this.rightLeg.rotation.x = -wave;
    this.leftArm.rotation.x = -wave * 0.55;
    this.rightArm.rotation.x = wave * 0.55 - 0.1;
    this.rightArm.rotation.z = -0.12;
    this.rightArm.rotation.y = 0;
    this.body.position.y = moving
      ? Math.abs(Math.sin(this.phase)) * 0.045
      : Math.sin(this.phase) * 0.009;
    this.cape.rotation.x = 0.12 + (running ? 0.24 : 0.06) + Math.sin(this.phase) * 0.04;
    if (active) {
      const t = 1 - this.attackTime / ATTACKS[this.kind].duration;
      if (this.kind === 'skill') {
        this.rightArm.rotation.x = -1.5 + Math.sin(t * Math.PI) * 1.2;
        this.leftArm.rotation.x = -0.8;
        this.body.position.y += Math.sin(t * Math.PI) * 0.07;
      } else {
        this.rightArm.rotation.x = -1.1;
        this.rightArm.rotation.z = -0.7 + Math.sin(t * Math.PI) * 1.8;
        this.rightArm.rotation.y = -1.2 + t * 2.6;
        this.leftArm.rotation.x = -0.45;
      }
    }
  }
  dispose() {
    this.disposed = true;
    this.animation?.dispose();
    // Imported assets share geometry/materials through SkeletonUtils.clone.
    if (!this.animation)
      this.body.traverse((o) => {
        if (o instanceof T.Mesh) {
          o.geometry.dispose();
          const mats = Array.isArray(o.material) ? o.material : [o.material];
          mats.forEach((m) => m.dispose());
        }
      });
    this.root.traverse((o) => {
      if (o instanceof T.Mesh && o.parent === this.root) {
        o.geometry.dispose();
        (o.material as T.Material).dispose();
      }
    });
    this.root.removeFromParent();
  }
}
