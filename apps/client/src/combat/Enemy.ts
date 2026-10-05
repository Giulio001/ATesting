import * as T from 'three';
import type { EnemyState } from '@aetheria/shared/schema';
export class Enemy {
  readonly root = new T.Group();
  private body = new T.Group();
  private shards: T.Mesh[] = [];
  private marker: T.Mesh;
  private flash = 0;
  private materials: T.MeshStandardMaterial[] = [];
  private elite: boolean;
  constructor(type: string) {
    this.elite = type === 'sentinel';
    const scale = this.elite ? 1.4 : 1;
    const armor = new T.MeshStandardMaterial({
      color: this.elite ? 0x43415b : 0x48505f,
      metalness: 0.65,
      roughness: 0.45,
      flatShading: true,
    });
    const ether = new T.MeshStandardMaterial({
      color: 0xd0a5fa,
      emissive: this.elite ? 0xa02d9c : 0x663db1,
      emissiveIntensity: 2,
      roughness: 0.3,
    });
    this.materials = [armor, ether];
    this.body.scale.setScalar(scale);
    this.root.add(this.body);
    const mesh = (g: T.BufferGeometry, m: T.Material, parent: T.Object3D, x = 0, y = 0, z = 0) => {
      const o = new T.Mesh(g, m);
      o.position.set(x, y, z);
      o.castShadow = true;
      parent.add(o);
      return o;
    };
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
      const blade = mesh(new T.ConeGeometry(0.14, 0.75, 4), armor, this.body, sign * 0.6, 0.88);
      blade.rotation.z = sign * 0.32;
      blade.rotation.x = Math.PI;
    }
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const shard = mesh(
        new T.OctahedronGeometry(0.12),
        i % 2 ? armor : ether,
        this.body,
        Math.sin(a) * 0.36,
        0.35 + (i % 3) * 0.12,
        Math.cos(a) * 0.36,
      );
      shard.scale.y = 1.8;
      this.shards.push(shard);
    }
    const shadow = mesh(
      new T.CircleGeometry(0.5, 32),
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
    this.marker = mesh(
      new T.RingGeometry(0.9, 1, 64),
      new T.MeshBasicMaterial({
        color: 0xeb7772,
        transparent: true,
        opacity: 0.75,
        side: T.DoubleSide,
        depthWrite: false,
      }),
      this.root,
      0,
      0.04,
    );
    this.marker.rotation.x = -Math.PI / 2;
  }
  hit() {
    this.flash = 0.2;
  }
  update(e: EnemyState, dt: number, time: number, serverNow: number) {
    this.root.position.lerp(new T.Vector3(e.x, 0, e.z), 1 - Math.exp(-dt * 14));
    this.body.position.y = Math.sin(time * 2 + e.x) * 0.075;
    const delta = Math.atan2(
      Math.sin(e.yaw - this.body.rotation.y),
      Math.cos(e.yaw - this.body.rotation.y),
    );
    this.body.rotation.y += delta * (1 - Math.exp(-dt * 12));
    const factor = (this.elite ? 1.4 : 1) * (e.hp <= 0 ? 0.001 : 1);
    this.body.scale.lerp(new T.Vector3(factor, factor, factor), 1 - Math.exp(-dt * 10));
    this.shards.forEach((s, i) => {
      s.rotation.y = time * (i % 2 ? 1 : -1);
      s.position.y = 0.3 + (i % 3) * 0.12 + Math.sin(time * 3 + i) * 0.07;
    });
    this.marker.visible = e.behavior === 'windup' && e.hp > 0;
    const radius = this.elite ? 2.35 : 1.7,
      progress = e.attackAt
        ? Math.max(0, 1 - (e.attackAt - serverNow) / (this.elite ? 1100 : 850))
        : 0;
    this.marker.scale.setScalar(radius);
    (this.marker.material as T.MeshBasicMaterial).opacity = 0.35 + progress * 0.5;
    this.flash = Math.max(0, this.flash - dt);
    this.materials[0].emissive.setHex(this.flash > 0 ? 0x81608c : 0x000000);
    this.materials[0].emissiveIntensity = this.flash > 0 ? 1 : 0;
  }
  dispose() {
    this.root.traverse((o) => {
      if (o instanceof T.Mesh) {
        o.geometry.dispose();
        const m = Array.isArray(o.material) ? o.material : [o.material];
        m.forEach((v) => v.dispose());
      }
    });
    this.root.removeFromParent();
  }
}
