import * as T from 'three';
import { enemyRules } from '@aetheria/shared';
import type { EnemyState } from '@aetheria/shared/schema';
export class Enemy {
  readonly root = new T.Group();
  private body = new T.Group();
  private shards: T.Mesh[] = [];
  private marker: T.Group;
  private markerFill: T.Mesh;
  private flash = 0;
  private materials: T.MeshStandardMaterial[] = [];
  private scale = 1;
  constructor(private type: string, low = false) {
    const champion = type === 'champion',
      slime = type === 'slime',
      spitter = type === 'spitter';
    this.scale = champion ? 1.7 : type === 'sentinel' ? 1.4 : type === 'voidling' ? 0.95 : 1;
    const armor = new T.MeshStandardMaterial({
      color: slime ? 0x4e967c : spitter ? 0x685774 : champion ? 0x3b3145 : 0x48505f,
      metalness: slime ? 0.05 : 0.65,
      roughness: slime ? 0.18 : 0.45,
      flatShading: !slime,
      transparent: slime,
      opacity: slime ? 0.82 : 1,
    });
    const ether = new T.MeshStandardMaterial({
      color: champion ? 0xe999c3 : 0xd0a5fa,
      emissive: champion ? 0xb12675 : slime ? 0x52a995 : 0x663db1,
      emissiveIntensity: 2,
      roughness: 0.3,
    });
    this.materials = [armor, ether];
    this.body.scale.setScalar(this.scale);
    this.root.add(this.body);
    const mesh = (g: T.BufferGeometry, m: T.Material, parent: T.Object3D, x = 0, y = 0, z = 0) => {
      const o = new T.Mesh(g, m);
      o.position.set(x, y, z);
      o.castShadow = true;
      parent.add(o);
      return o;
    };
    if (slime) {
      const jelly = mesh(
        new T.SphereGeometry(0.7, low ? 12 : 20, low ? 8 : 12),
        armor,
        this.body,
        0,
        0.55,
      );
      jelly.scale.set(1, 0.75, 1);
      mesh(new T.IcosahedronGeometry(0.18, 1), ether, this.body, 0, 0.55, 0.2);
      for (const sign of [-1, 1])
        mesh(new T.SphereGeometry(0.055, 8, 6), ether, this.body, sign * 0.2, 0.7, 0.57);
    } else if (spitter) {
      const shell = mesh(new T.DodecahedronGeometry(0.55), armor, this.body, 0, 0.65);
      shell.scale.set(1.2, 0.8, 1.2);
      const mouth = mesh(new T.TorusGeometry(0.18, 0.07, 6, 12), ether, this.body, 0, 0.75, 0.48);
      mouth.rotation.x = 0.2;
      for (let i = 0; i < 5; i++) {
        const spine = mesh(
          new T.ConeGeometry(0.12, 0.7, 4),
          armor,
          this.body,
          Math.sin(i * 1.3) * 0.4,
          1.1,
          Math.cos(i * 1.3) * 0.4,
        );
        spine.rotation.z = Math.sin(i) * 0.4;
      }
    } else {
      const torso = mesh(new T.OctahedronGeometry(0.44), armor, this.body, 0, 1);
      torso.scale.set(1, 1.3, 0.65);
      mesh(new T.OctahedronGeometry(0.17), ether, this.body, 0, 1.15, 0.27);
      const head = mesh(new T.IcosahedronGeometry(0.24, 0), armor, this.body, 0, 1.7);
      head.scale.set(0.8, 1, 0.8);
      for (const sign of [-1, 1]) {
        mesh(new T.BoxGeometry(0.1, 0.045, 0.1), ether, this.body, sign * 0.08, 1.74, 0.19);
        const horn = mesh(new T.ConeGeometry(0.07, 0.4, 4), armor, this.body, sign * 0.19, 1.96);
        horn.rotation.z = -sign * 0.5;
        const shoulder = mesh(new T.OctahedronGeometry(0.24), armor, this.body, sign * 0.47, 1.34);
        shoulder.scale.y = 0.7;
        const blade = mesh(
          new T.ConeGeometry(0.14, champion ? 1.2 : 0.75, 4),
          armor,
          this.body,
          sign * 0.6,
          0.88,
        );
        blade.rotation.z = sign * 0.32;
        blade.rotation.x = Math.PI;
      }
      if (champion) {
        const crown = mesh(new T.TorusGeometry(0.35, 0.045, 6, 12), ether, this.body, 0, 2.05);
        crown.rotation.x = Math.PI / 2;
        const light = new T.PointLight(0xbf4c9e, 3, 5);
        light.visible = !low;
        light.position.y = 1.5;
        this.body.add(light);
      }
    }
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const shard = mesh(
        new T.OctahedronGeometry(0.09),
        i % 2 ? armor : ether,
        this.body,
        Math.sin(a) * 0.45,
        0.3 + (i % 3) * 0.12,
        Math.cos(a) * 0.45,
      );
      shard.scale.y = 1.8;
      this.shards.push(shard);
    }
    const shadow = mesh(
      new T.CircleGeometry(0.65, 32),
      new T.MeshBasicMaterial({
        color: 0x100d23,
        transparent: true,
        opacity: 0.4,
        depthWrite: false,
      }),
      this.root,
      0,
      0.026,
    );
    shadow.rotation.x = -Math.PI / 2;
    this.marker = new T.Group();
    this.root.add(this.marker);
    const ring = mesh(
      new T.RingGeometry(0.96, 1, 64),
      new T.MeshBasicMaterial({
        color: 0xff736c,
        transparent: true,
        opacity: 0.8,
        side: T.DoubleSide,
        depthWrite: false,
      }),
      this.marker,
      0,
      0.04,
    );
    ring.rotation.x = -Math.PI / 2;
    this.markerFill = mesh(
      new T.CircleGeometry(1, 48),
      new T.MeshBasicMaterial({
        color: champion ? 0xf35b9d : 0xff736c,
        transparent: true,
        opacity: 0.18,
        side: T.DoubleSide,
        depthWrite: false,
      }),
      this.marker,
      0,
      0.03,
    );
    this.markerFill.rotation.x = -Math.PI / 2;
  }
  hit() {
    this.flash = 0.2;
  }
  update(e: EnemyState, dt: number, time: number, serverNow: number) {
    this.root.position.lerp(new T.Vector3(e.x, 0, e.z), 1 - Math.exp(-dt * 14));
    this.body.position.y = Math.sin(time * (this.type === 'slime' ? 4 : 2) + e.x) * 0.075;
    const delta = Math.atan2(
      Math.sin(e.yaw - this.body.rotation.y),
      Math.cos(e.yaw - this.body.rotation.y),
    );
    this.body.rotation.y += delta * (1 - Math.exp(-dt * 12));
    const factor = this.scale * (e.hp <= 0 ? 0.001 : 1);
    this.body.scale.lerp(new T.Vector3(factor, factor, factor), 1 - Math.exp(-dt * 10));
    if (this.type === 'slime' && e.hp > 0) this.body.scale.y *= 1 + Math.sin(time * 4) * 0.04;
    this.shards.forEach((s, i) => {
      s.rotation.y = time * (i % 2 ? 1 : -1);
      s.position.y = 0.3 + (i % 3) * 0.12 + Math.sin(time * 3 + i) * 0.07;
    });
    this.marker.visible = e.behavior === 'windup' && e.hp > 0;
    this.marker.position.set(e.attackX - this.root.position.x, 0, e.attackZ - this.root.position.z);
    this.marker.scale.setScalar(e.attackRadius || enemyRules(e.type).radius);
    const progress = e.attackAt
      ? Math.max(0, Math.min(1, 1 - (e.attackAt - serverNow) / e.attackDuration))
      : 0;
    this.markerFill.scale.setScalar(0.1 + progress * 0.9);
    (this.markerFill.material as T.MeshBasicMaterial).opacity = 0.1 + progress * 0.3;
    this.flash = Math.max(0, this.flash - dt);
    const enraged = this.type === 'champion' && e.hp > 0 && e.hp < e.maxHp / 2;
    this.materials[0].emissive.setHex(this.flash > 0 ? 0x81608c : enraged ? 0x5d173c : 0x000000);
    this.materials[0].emissiveIntensity = this.flash > 0 ? 1 : enraged ? 0.65 : 0;
  }
  dispose() {
    this.root.traverse((o) => {
      if (o instanceof T.Mesh) {
        o.geometry.dispose();
        (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => m.dispose());
      }
    });
    this.root.removeFromParent();
  }
}
