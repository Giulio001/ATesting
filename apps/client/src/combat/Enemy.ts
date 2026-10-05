import * as T from 'three';
import { enemyRules } from '@aetheria/shared';
import type { EnemyState } from '@aetheria/shared/schema';
import { AnimationController } from '../animation/AnimationController';
import { MONSTER_CLIPS } from '../animation/clips';
import { instanceMaterials, type AssetLoader } from '../engine/AssetLoader';

/** Every hostile type is backed by a rigged, animated GLB model. */
const ENEMY_MODEL: Record<string, string> = {
  shard: 'minion',
  voidling: 'minion',
  slime: 'minion',
  spitter: 'stalker',
  sentinel: 'brute',
  champion: 'caster',
  drowned: 'stalker',
  guardian: 'brute',
};
/** Gentler multipliers than the procedural rig, because models have real sizes. */
const IMPORTED_SCALE: Record<string, number> = {
  shard: 1,
  voidling: 0.92,
  slime: 0.86,
  spitter: 0.98,
  sentinel: 1.08,
  champion: 1.3,
  drowned: 1.05,
  guardian: 1.5,
};
const TINT: Record<string, { color?: number; emissive: number; intensity: number }> = {
  shard: { emissive: 0x5a3f9e, intensity: 0.5 },
  voidling: { color: 0xcdb4ff, emissive: 0x7b45d6, intensity: 1.1 },
  slime: { color: 0x9ff0c4, emissive: 0x2f8f66, intensity: 0.7 },
  spitter: { color: 0xd0b6ff, emissive: 0x6a3fb5, intensity: 0.9 },
  sentinel: { color: 0x8e97b8, emissive: 0x3f5f9e, intensity: 0.55 },
  champion: { color: 0xffc2e4, emissive: 0xb12675, intensity: 1.6 },
  drowned: { color: 0x9fd8c6, emissive: 0x2f8f78, intensity: 0.85 },
  guardian: { color: 0x7fe0cd, emissive: 0x1f8f8a, intensity: 1.7 },
};

export class Enemy {
  readonly root = new T.Group();
  private body = new T.Group();
  private shards: T.Mesh[] = [];
  private marker!: T.Group;
  private markerFill!: T.Mesh;
  private flash = 0;
  private materials: T.MeshStandardMaterial[] = [];
  private emissive: { material: T.MeshStandardMaterial; color: number; intensity: number }[] = [];
  private animation?: AnimationController;
  private previousBehavior = '';
  private scale = 1;

  constructor(
    private type: string,
    low = false,
    assets?: AssetLoader,
  ) {
    const champion = type === 'champion' || type === 'guardian',
      slime = type === 'slime',
      spitter = type === 'spitter';
    const imported = assets?.instantiate(ENEMY_MODEL[type] ?? 'minion');
    this.scale = imported
      ? (IMPORTED_SCALE[type] ?? 1)
      : champion
        ? 1.7
        : type === 'sentinel'
          ? 1.4
          : type === 'voidling'
            ? 0.95
            : 1;
    if (imported) {
      this.body.add(imported.root);
      this.animation = new AnimationController(imported.root, imported.clips, MONSTER_CLIPS);
      this.emissive = instanceMaterials(imported.root)
        .filter(
          (material): material is T.MeshStandardMaterial =>
            material instanceof T.MeshStandardMaterial,
        )
        .map((material) => {
          const tint = TINT[type] ?? TINT.shard;
          if (tint.color) material.color.lerp(new T.Color(tint.color), 0.55);
          material.emissive.setHex(tint.emissive);
          material.emissiveIntensity = tint.intensity;
          return { material, color: tint.emissive, intensity: tint.intensity };
        });
    } else this.build(low, champion, slime, spitter);

    this.body.scale.setScalar(this.scale);
    this.root.add(this.body);
    this.buildAura(low, champion);
  }

  private build(low: boolean, champion: boolean, slime: boolean, spitter: boolean) {
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
  }

  /** Shadow, telegraph rings and the champion's aura, shared by both model paths. */
  private buildAura(low: boolean, champion: boolean) {
    const shadow = new T.Mesh(
      new T.CircleGeometry(0.65, 32),
      new T.MeshBasicMaterial({
        color: 0x100d23,
        transparent: true,
        opacity: 0.4,
        depthWrite: false,
      }),
    );
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.026;
    this.root.add(shadow);

    if (champion) {
      const light = new T.PointLight(0xbf4c9e, 3, 5);
      light.visible = !low;
      light.position.y = 1.5;
      this.body.add(light);
    }

    this.marker = new T.Group();
    this.root.add(this.marker);
    const ring = new T.Mesh(
      new T.RingGeometry(0.96, 1, 64),
      new T.MeshBasicMaterial({
        color: 0xff736c,
        transparent: true,
        opacity: 0.8,
        side: T.DoubleSide,
        depthWrite: false,
      }),
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.04;
    this.marker.add(ring);
    this.markerFill = new T.Mesh(
      new T.CircleGeometry(1, 48),
      new T.MeshBasicMaterial({
        color: champion ? 0xf35b9d : 0xff736c,
        transparent: true,
        opacity: 0.18,
        side: T.DoubleSide,
        depthWrite: false,
      }),
    );
    this.markerFill.rotation.x = -Math.PI / 2;
    this.markerFill.position.y = 0.03;
    this.marker.add(this.markerFill);
  }

  hit() {
    this.flash = 0.2;
  }

  update(e: EnemyState, dt: number, time: number, serverNow: number) {
    this.root.position.lerp(new T.Vector3(e.x, 0, e.z), 1 - Math.exp(-dt * 14));
    if (!this.animation)
      this.body.position.y = Math.sin(time * (this.type === 'slime' ? 4 : 2) + e.x) * 0.075;
    const delta = Math.atan2(
      Math.sin(e.yaw - this.body.rotation.y),
      Math.cos(e.yaw - this.body.rotation.y),
    );
    this.body.rotation.y += delta * (1 - Math.exp(-dt * 12));
    const factor = this.scale * (e.hp <= 0 ? 0.001 : 1);
    this.body.scale.lerp(new T.Vector3(factor, factor, factor), 1 - Math.exp(-dt * 10));
    if (!this.animation && this.type === 'slime' && e.hp > 0)
      this.body.scale.y *= 1 + Math.sin(time * 4) * 0.04;
    this.shards.forEach((s, i) => {
      s.rotation.y = time * (i % 2 ? 1 : -1);
      s.position.y = 0.3 + (i % 3) * 0.12 + Math.sin(time * 3 + i) * 0.07;
    });

    const dying = e.hp <= 0;
    const windup = e.behavior === 'windup' && !dying;
    const stunned = e.behavior === 'stunned' && !dying;
    const moving = !dying && (e.behavior === 'chase' || e.behavior === 'return');
    if (this.animation) {
      // One-shot states only retrigger on a behaviour change; looping states are
      // safe to request every frame because the controller ignores repeats.
      if (dying) this.animation.play('Death');
      else if (windup) {
        if (this.previousBehavior !== 'windup') this.animation.play('Attack01', true);
      } else if (stunned) {
        if (this.previousBehavior !== 'stunned') this.animation.play('Hit', true);
      } else if (moving) this.animation.play('Run');
      else this.animation.play('Idle');
      this.animation.update(dt);
    }
    this.previousBehavior = e.behavior;

    this.marker.visible = windup;
    this.marker.position.set(e.attackX - this.root.position.x, 0, e.attackZ - this.root.position.z);
    this.marker.scale.setScalar(e.attackRadius || enemyRules(this.type).radius);
    const progress = e.attackAt
      ? Math.max(0, Math.min(1, 1 - (e.attackAt - serverNow) / e.attackDuration))
      : 0;
    this.markerFill.scale.setScalar(0.1 + progress * 0.9);
    (this.markerFill.material as T.MeshBasicMaterial).opacity = 0.1 + progress * 0.3;

    this.flash = Math.max(0, this.flash - dt);
    const enraged =
      (this.type === 'champion' || this.type === 'guardian') && !dying && e.hp < e.maxHp / 2;
    if (this.materials.length) {
      this.materials[0].emissive.setHex(this.flash > 0 ? 0x81608c : enraged ? 0x5d173c : 0x000000);
      this.materials[0].emissiveIntensity = this.flash > 0 ? 1 : enraged ? 0.65 : 0;
    }
    for (const entry of this.emissive) {
      if (this.flash > 0) {
        entry.material.emissive.setHex(0xc98cff);
        entry.material.emissiveIntensity = 1.4;
      } else {
        entry.material.emissive.setHex(entry.color);
        entry.material.emissiveIntensity = entry.intensity * (enraged ? 1.7 : 1);
      }
    }
  }

  dispose() {
    this.animation?.dispose();
    if (!this.animation)
      this.root.traverse((o) => {
        if (o instanceof T.Mesh) {
          o.geometry.dispose();
          (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => m.dispose());
        }
      });
    else for (const entry of this.emissive) entry.material.dispose();
    this.root.removeFromParent();
  }
}
