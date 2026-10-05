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
  private leftKnee = new T.Group();
  private rightKnee = new T.Group();
  private cape!: T.Mesh;
  private animation?: AnimationController;
  private phase = 0;
  private attackTime = 0;
  private guardTime = 0;
  private sword?: T.Group;
  private shield?: T.Group;
  private bow?: T.Group;
  private staff?: T.Group;
  private importedBlade?: T.Mesh;
  private importedBase = new T.Vector3();
  private importedTip = new T.Vector3();
  private bladeMat?: T.MeshStandardMaterial;
  private equipmentKey = '';
  private kind: AttackKind = 'slash';
  private combo = 0;
  private disposed = false;
  private hurtTime = 0;
  private armor?: T.MeshStandardMaterial;
  constructor(
    assets: AssetLoader,
    local = false,
    readonly classId = 'GUARDIAN',
  ) {
    const imported = classId === 'GUARDIAN' ? assets.instantiateWarrior() : null;
    if (imported) {
      this.body.add(imported.root);
      this.animation = new AnimationController(imported.root, imported.clips);
      imported.root.traverse((object) => {
        if (
          !this.importedBlade &&
          object instanceof T.Mesh &&
          !(object instanceof T.SkinnedMesh) &&
          /sword|blade/i.test(object.name)
        ) {
          object.geometry.computeBoundingBox();
          const box = object.geometry.boundingBox!;
          const size = box.getSize(new T.Vector3());
          const axis = size.y >= size.x && size.y >= size.z ? 'y' : size.x >= size.z ? 'x' : 'z';
          box.getCenter(this.importedBase);
          this.importedTip.copy(this.importedBase);
          this.importedBase[axis] = box.min[axis];
          this.importedTip[axis] = box.max[axis];
          this.importedBlade = object;
        }
      });
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
      color:
        this.classId === 'AETHER_BLADE'
          ? 0x718969
          : this.classId === 'VOID_KNIGHT'
            ? 0x7770a7
            : local
              ? 0x8eafb9
              : 0x8a939f,
      metalness: this.classId === 'GUARDIAN' ? 0.65 : 0.2,
      roughness: 0.35,
      flatShading: true,
    });
    this.armor = armor;
    const gold = new T.MeshStandardMaterial({
      color: 0xc4a66a,
      metalness: 0.6,
      roughness: 0.38,
      flatShading: true,
    });
    const cloth = new T.MeshStandardMaterial({
      color:
        this.classId === 'AETHER_BLADE'
          ? 0x243f2b
          : this.classId === 'VOID_KNIGHT'
            ? 0x32234f
            : local
              ? 0x244d68
              : 0x51426b,
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
    const chest = mesh(new T.SphereGeometry(0.29, 12, 8), armor, this.body, 0, 1.22, 0.045);
    chest.scale.set(1, 0.9, 0.72);
    for (const sign of [-1, 1]) {
      const trim = mesh(
        new T.BoxGeometry(0.035, 0.4, 0.07),
        gold,
        this.body,
        sign * 0.16,
        1.21,
        0.23,
      );
      trim.rotation.z = sign * 0.15;
    }
    for (let i = 0; i < 3; i++)
      mesh(
        new T.BoxGeometry(0.49 - i * 0.03, 0.05, 0.035),
        gold,
        this.body,
        0,
        1.03 + i * 0.09,
        0.225,
      );
    mesh(new T.BoxGeometry(0.54, 0.12, 0.36), gold, this.body, 0, 0.88);
    mesh(new T.ConeGeometry(0.36, 0.33, 6), cloth, this.body, 0, 0.7).rotation.z = Math.PI;
    mesh(new T.BoxGeometry(0.17, 0.22, 0.1), gold, this.body, 0, 1.2, 0.28).rotation.z =
      Math.PI / 4;
    mesh(new T.CylinderGeometry(0.22, 0.24, 0.4, 8), armor, this.body, 0, 1.63);
    mesh(new T.BoxGeometry(0.35, 0.065, 0.1), dark, this.body, 0, 1.67, 0.21);
    const eyes = new T.MeshStandardMaterial({
      color: 0xaadfe3,
      emissive: 0x5dbfc9,
      emissiveIntensity: 1.5,
    });
    for (const sign of [-1, 1])
      mesh(new T.BoxGeometry(0.1, 0.027, 0.035), eyes, this.body, sign * 0.1, 1.672, 0.268);
    mesh(new T.BoxGeometry(0.04, 0.3, 0.08), gold, this.body, 0, 1.61, 0.26);
    mesh(new T.ConeGeometry(0.12, 0.35, 4), gold, this.body, 0, 1.92).scale.z = 0.4;
    if (this.classId !== 'GUARDIAN') {
      const hood = mesh(
        new T.SphereGeometry(0.31, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.7),
        cloth,
        this.body,
        0,
        1.78,
        -0.04,
      );
      hood.rotation.x = -0.18;
      if (this.classId === 'VOID_KNIGHT') {
        mesh(new T.ConeGeometry(0.32, 0.62, 8), cloth, this.body, 0, 2.03);
        mesh(new T.ConeGeometry(0.38, 0.8, 10), cloth, this.body, 0, 0.61).rotation.z = Math.PI;
      } else {
        const quiver = mesh(
          new T.CylinderGeometry(0.12, 0.1, 0.7, 8),
          dark,
          this.body,
          0.3,
          1.08,
          -0.34,
        );
        quiver.rotation.z = -0.2;
        for (let i = 0; i < 3; i++)
          mesh(
            new T.CylinderGeometry(0.014, 0.014, 0.45, 5),
            gold,
            this.body,
            0.25 + i * 0.05,
            1.55,
            -0.34,
          );
      }
    }
    cloth.side = T.DoubleSide;
    const capeGeometry = new T.PlaneGeometry(0.64, 0.94, 4, 6),
      vertices = capeGeometry.getAttribute('position');
    for (let i = 0; i < vertices.count; i++) {
      const t = (0.47 - vertices.getY(i)) / 0.94;
      vertices.setX(i, vertices.getX(i) * (0.72 + t * 0.35));
      vertices.setZ(i, -Math.sin(t * Math.PI) * 0.14);
    }
    capeGeometry.computeVertexNormals();
    this.cape = mesh(capeGeometry, cloth, this.body, 0, 1.01, -0.29);
    this.cape.rotation.x = 0.12;
    for (const [arm, sign] of [
      [this.leftArm, -1],
      [this.rightArm, 1],
    ] as const) {
      arm.position.set(sign * 0.38, 1.32, 0);
      this.body.add(arm);
      const shoulder = mesh(new T.SphereGeometry(0.22, 6, 4), gold, arm);
      shoulder.scale.set(1, 0.65, 1.1);
      const ridge = mesh(new T.ConeGeometry(0.13, 0.21, 4), armor, arm, sign * 0.09, 0.11, -0.02);
      ridge.rotation.z = -sign * 0.35;
      mesh(new T.CylinderGeometry(0.11, 0.12, 0.52, 6), armor, arm, 0, -0.25);
      mesh(new T.BoxGeometry(0.19, 0.15, 0.2), dark, arm, 0, -0.53);
    }
    for (const [leg, sign] of [
      [this.leftLeg, -1],
      [this.rightLeg, 1],
    ] as const) {
      leg.position.set(sign * 0.15, 0.78, 0);
      this.body.add(leg);
      mesh(new T.CapsuleGeometry(0.11, 0.2, 4, 8), armor, leg, 0, -0.19);
      const knee = sign === -1 ? this.leftKnee : this.rightKnee;
      knee.position.y = -0.36;
      leg.add(knee);
      mesh(new T.CylinderGeometry(0.115, 0.09, 0.3, 8), armor, knee, 0, -0.13);
      mesh(new T.BoxGeometry(0.23, 0.15, 0.38), dark, knee, 0, -0.31, 0.07);
      mesh(new T.BoxGeometry(0.21, 0.09, 0.15), gold, leg, 0, -0.34, 0.1);
    }
    const sword = new T.Group();
    this.sword = sword;
    this.bladeMat = armor.clone();
    sword.position.set(0, -0.53, 0.12);
    sword.rotation.x = -0.25;
    this.rightArm.add(sword);
    mesh(new T.CylinderGeometry(0.035, 0.035, 0.25, 6), dark, sword, 0, 0);
    mesh(new T.BoxGeometry(0.36, 0.05, 0.13), gold, sword, 0, 0.14);
    const blade = mesh(new T.ConeGeometry(0.1, 1.04, 4), this.bladeMat, sword, 0, 0.65);
    blade.scale.z = 0.45;
    mesh(new T.BoxGeometry(0.025, 0.69, 0.055), eyes, sword, 0, 0.59, 0.035);
    mesh(new T.SphereGeometry(0.06, 8, 8), gold, sword, 0, -0.13);
    const shield = new T.Group();
    this.shield = shield;
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
    const bow = new T.Group();
    this.bow = bow;
    bow.position.set(-0.08, -0.4, 0.2);
    this.leftArm.add(bow);
    const curve = new T.CatmullRomCurve3([
      new T.Vector3(0, -0.6, 0),
      new T.Vector3(0, -0.3, 0.22),
      new T.Vector3(0, 0, 0.3),
      new T.Vector3(0, 0.3, 0.22),
      new T.Vector3(0, 0.6, 0),
    ]);
    mesh(new T.TubeGeometry(curve, 20, 0.035, 6, false), gold, bow);
    mesh(new T.CylinderGeometry(0.007, 0.007, 1.2, 4), eyes, bow);
    const staff = new T.Group();
    this.staff = staff;
    staff.position.set(0, -0.45, 0.15);
    this.rightArm.add(staff);
    mesh(new T.CylinderGeometry(0.033, 0.04, 1.65, 8), dark, staff, 0, 0.15);
    mesh(new T.TorusGeometry(0.18, 0.028, 6, 20), gold, staff, 0, 1.02);
    const crystal = new T.MeshStandardMaterial({
      color: 0xba8cff,
      emissive: 0x9f5dff,
      emissiveIntensity: 2.8,
      roughness: 0.18,
      metalness: 0.35,
    });
    mesh(new T.OctahedronGeometry(0.14), crystal, staff, 0, 1.02);
  }
  equipment(weapon: string, shield: string, cls = this.classId) {
    const key = weapon + '|' + shield;
    if (key === this.equipmentKey) return;
    this.equipmentKey = key;
    if (this.sword) this.sword.visible = !!weapon && cls === 'GUARDIAN';
    if (this.shield) this.shield.visible = !!shield && cls === 'GUARDIAN';
    if (this.bow) this.bow.visible = !!weapon && cls === 'AETHER_BLADE';
    if (this.staff) this.staff.visible = !!weapon && cls === 'VOID_KNIGHT';
    if (this.bladeMat) {
      this.bladeMat.color.setHex(
        weapon.includes('steel') ? 0xc3dcec : weapon.includes('rough') ? 0x777b84 : 0x9fb2bf,
      );
      this.bladeMat.metalness = weapon.includes('steel') ? 0.85 : 0.55;
    }
  }
  attack(kind: AttackKind, yaw: number) {
    this.kind = kind;
    this.attackTime = ATTACKS[kind].duration;
    this.combo = (this.combo + 1) % 3;
    this.body.rotation.y = yaw;
    this.animation?.play(kind === 'skill' ? 'Skill01' : (`Attack0${this.combo + 1}` as 'Attack01'));
    if (!this.animation) this.applyAttackPose(0);
  }
  weaponPose(base: T.Vector3, tip: T.Vector3) {
    if (this.disposed) return false;
    const weapon =
      this.classId === 'AETHER_BLADE'
        ? this.bow
        : this.classId === 'VOID_KNIGHT'
          ? this.staff
          : (this.sword ?? this.importedBlade);
    if (!weapon || !weapon.visible) return false;
    if (weapon === this.importedBlade) {
      base.copy(this.importedBase);
      tip.copy(this.importedTip);
    } else if (this.classId === 'AETHER_BLADE') {
      base.set(0, 0, 0);
      tip.set(0, 0, 0.3);
    } else if (this.classId === 'VOID_KNIGHT') {
      base.set(0, 0.15, 0);
      tip.set(0, 1.02, 0);
    } else {
      base.set(0, 0.15, 0);
      tip.set(0, 1.17, 0);
    }
    weapon.updateWorldMatrix(true, false);
    base.applyMatrix4(weapon.matrixWorld);
    tip.applyMatrix4(weapon.matrixWorld);
    return true;
  }
  hit() {
    this.hurtTime = 0.3;
    this.animation?.play('Hit');
  }
  guard() {
    this.guardTime = 2.5;
    this.animation?.play('Block');
  }
  update(dt: number, moving: boolean, running: boolean, yaw: number, dead = false) {
    if (this.disposed) return;
    const active = this.attackTime > 0;
    this.attackTime = Math.max(0, this.attackTime - dt);
    this.guardTime = Math.max(0, this.guardTime - dt);
    running = moving;
    this.phase += dt * (moving ? 11 : 2);
    this.hurtTime = Math.max(0, this.hurtTime - dt);
    if (this.armor) {
      this.armor.emissive.setHex(this.hurtTime > 0 ? 0x6d3029 : 0x000000);
      this.armor.emissiveIntensity = this.hurtTime > 0 ? 0.8 : 0;
    }
    this.body.rotation.z = T.MathUtils.lerp(
      this.body.rotation.z,
      dead ? Math.PI / 2 : 0,
      1 - Math.exp(-dt * 8),
    );
    if (dead) {
      this.animation?.play('Death');
      this.animation?.update(dt);
      return;
    }
    if (!active) {
      const delta = Math.atan2(
        Math.sin(yaw - this.body.rotation.y),
        Math.cos(yaw - this.body.rotation.y),
      );
      this.body.rotation.y += delta * (1 - Math.exp(-dt * 18));
      this.animation?.play(this.guardTime > 0 ? 'Block' : moving ? 'Run' : 'Idle');
    }
    if (this.animation) {
      this.animation.update(dt);
      return;
    }
    const stride = moving ? (running ? 0.75 : 0.48) : 0;
    const wave = Math.sin(this.phase) * stride;
    this.leftLeg.rotation.x = wave;
    this.rightLeg.rotation.x = -wave;
    this.leftKnee.rotation.x = -Math.max(0, wave) * 0.7;
    this.rightKnee.rotation.x = -Math.max(0, -wave) * 0.7;
    this.leftArm.rotation.x = -wave * 0.55;
    this.leftArm.rotation.z = 0;
    this.rightArm.rotation.x = wave * 0.55 - 0.1;
    this.rightArm.rotation.z = -0.12;
    this.rightArm.rotation.y = 0;
    this.body.position.y = moving
      ? Math.abs(Math.sin(this.phase)) * 0.045
      : Math.sin(this.phase) * 0.009;
    if (this.guardTime > 0) this.leftArm.rotation.x = -1.3;
    this.cape.rotation.x = 0.12 + (running ? 0.24 : 0.06) + Math.sin(this.phase) * 0.04;
    const capeVertices = this.cape.geometry.getAttribute('position');
    for (let i = 0; i < capeVertices.count; i++) {
      const t = (0.47 - capeVertices.getY(i)) / 0.94;
      capeVertices.setZ(
        i,
        -Math.sin(t * Math.PI) * 0.14 +
          Math.sin(this.phase * 1.2 + t * 4) * t * (running ? 0.07 : 0.025),
      );
    }
    capeVertices.needsUpdate = true;
    if (active) {
      const t = 1 - this.attackTime / ATTACKS[this.kind].duration;
      this.applyAttackPose(t);
    }
  }
  private applyAttackPose(t: number) {
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
    if (this.classId === 'AETHER_BLADE') {
      this.leftArm.rotation.x = -1.25;
      this.leftArm.rotation.z = -0.18;
      this.rightArm.rotation.x = -1.1;
      this.rightArm.rotation.y = -0.65;
      this.rightArm.rotation.z = -0.25 - Math.sin(t * Math.PI) * 0.3;
    } else if (this.classId === 'VOID_KNIGHT') {
      this.rightArm.rotation.x = -0.55 - Math.sin(t * Math.PI) * 0.5;
      this.rightArm.rotation.z = -0.25;
      this.leftArm.rotation.x = -0.7;
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
