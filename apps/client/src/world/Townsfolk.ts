import * as T from 'three';
import { AnimationController, type ClipAliases } from '../animation/AnimationController';
import { MAGIC_CLIPS, MELEE_CLIPS, RANGED_CLIPS } from '../animation/clips';
import { instanceMaterials, type AssetLoader } from '../engine/AssetLoader';

interface Role {
  model: string;
  clips: ClipAliases;
  scale?: number;
  tint?: number;
}

/** Lumengate's named residents, dressed with the same rigged GLBs as the heroes. */
const ROLES: Record<string, Role> = {
  gatewarden: { model: 'warrior', clips: MELEE_CLIPS, scale: 1.03 },
  quartermaster: { model: 'archer', clips: RANGED_CLIPS, scale: 0.98 },
  herald: { model: 'mage', clips: MAGIC_CLIPS, scale: 1.02 },
  blacksmith: { model: 'warrior', clips: MELEE_CLIPS, scale: 1, tint: 0x6d5a4a },
};

export class Townsfolk {
  readonly root = new T.Group();
  private animation?: AnimationController;
  private disposed = false;

  constructor(assets: AssetLoader, roleId: string, x: number, z: number, yaw: number) {
    const role = ROLES[roleId];
    const instance = role ? assets.instantiate(role.model) : undefined;
    this.root.position.set(x, 0, z);
    this.root.rotation.y = yaw;
    if (!instance) {
      // A simple carved-post placeholder keeps the plaza readable without GLBs.
      const post = new T.Mesh(
        new T.CylinderGeometry(0.22, 0.28, 1.2, 8),
        new T.MeshStandardMaterial({ color: 0x8a939f, flatShading: true }),
      );
      post.position.y = 0.6;
      post.castShadow = true;
      const head = new T.Mesh(
        new T.SphereGeometry(0.2, 10, 8),
        new T.MeshStandardMaterial({ color: 0xc2b591, flatShading: true }),
      );
      head.position.y = 1.35;
      head.castShadow = true;
      this.root.add(post, head);
      return;
    }
    const root = instance.root;
    if (role.scale) root.scale.multiplyScalar(role.scale);
    if (role.tint)
      for (const material of instanceMaterials(root))
        if (material instanceof T.MeshStandardMaterial)
          material.color.lerp(new T.Color(role.tint), 0.4);
    this.root.add(root);
    this.animation = new AnimationController(root, instance.clips, role.clips);
    this.animation.play('Idle', true);
  }

  update(dt: number, time: number, phase: number) {
    if (this.disposed) return;
    this.animation?.update(dt);
    // A tiny breathing motion differentiates idle residents without more clips.
    this.root.position.y = Math.sin(time * 1.4 + phase) * 0.012;
  }

  dispose() {
    this.disposed = true;
    this.animation?.dispose();
    this.root.removeFromParent();
  }
}
