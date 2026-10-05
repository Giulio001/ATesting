import * as T from 'three';
import type { NpcDefinition } from '@aetheria/shared';
import { residentPose } from '@aetheria/shared';
import { AnimationController } from '../animation/AnimationController';
import { TOWNSFOLK_CLIPS } from '../animation/clips';
import { instanceMaterials, type AssetLoader } from '../engine/AssetLoader';
import { residentCloth } from './TownsfolkTexture';

/** Named service NPCs keep a stable outfit even though their id is data, not a model. */
const SERVICE_MODEL: Record<string, { model: string; tint?: number; scale?: number }> = {
  gatewarden: { model: 'man_king', scale: 1.0, tint: 0xd8c98a },
  quartermaster: { model: 'man_worker', tint: 0x7d6644 },
  herald: { model: 'man_hooded', tint: 0x8a5f9f },
  blacksmith: { model: 'man_worker', tint: 0x6d5a4a, scale: 1.05 },
  'bounty-board': { model: 'man_hooded', tint: 0x8c5f3f },
  'grove-keeper': { model: 'woman_witch', tint: 0x3f8c6a },
};

/** NPCs that are scenery, not people: the client must not dress them with a rig. */
export const SCENERY_NPCS = new Set(['frontier-beacon', 'grove-altar']);

const BUBBLE_W = 512;
const BUBBLE_H = 168;

function paintBubble(c: CanvasRenderingContext2D, text: string, tint: string) {
  c.clearRect(0, 0, BUBBLE_W, BUBBLE_H);
  c.fillStyle = 'rgba(14,18,22,0.88)';
  c.strokeStyle = tint;
  c.lineWidth = 5;
  const radius = 26;
  const top = 6,
    bottom = BUBBLE_H - 34,
    left = 8,
    right = BUBBLE_W - 8;
  c.beginPath();
  c.moveTo(left + radius, top);
  c.arcTo(right, top, right, bottom, radius);
  c.arcTo(right, bottom, left, bottom, radius);
  c.arcTo(left, bottom, left, top, radius);
  c.arcTo(left, top, right, top, radius);
  c.closePath();
  c.fill();
  c.stroke();
  c.beginPath();
  c.moveTo(BUBBLE_W / 2 - 18, bottom - 2);
  c.lineTo(BUBBLE_W / 2, BUBBLE_H - 4);
  c.lineTo(BUBBLE_W / 2 + 18, bottom - 2);
  c.closePath();
  c.fillStyle = 'rgba(14,18,22,0.88)';
  c.fill();
  c.fillStyle = '#f4ecd8';
  c.font = '600 30px "Segoe UI", system-ui, sans-serif';
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  const words = text.split(' ');
  const lines: string[] = [];
  let line = '';
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (c.measureText(candidate).width > BUBBLE_W - 70 && line) {
      lines.push(line);
      line = word;
    } else line = candidate;
  }
  if (line) lines.push(line);
  const visible = lines.slice(0, 3);
  const startY = BUBBLE_H / 2 - 14 - (visible.length - 1) * 19;
  visible.forEach((value, index) => c.fillText(value, BUBBLE_W / 2, startY + index * 38));
}

export class Townsfolk {
  readonly root = new T.Group();
  private animation?: AnimationController;
  private bubble?: T.Sprite;
  private bubbleCanvas?: HTMLCanvasElement;
  private bubbleTexture?: T.CanvasTexture;
  private bubbleUntil = 0;
  private nextLineAt = 0;
  private nextWaveAt = 0;
  private moving = false;
  private disposed = false;
  private phase: number;

  constructor(
    assets: AssetLoader,
    private npc: NpcDefinition,
    low: boolean,
  ) {
    this.phase = (npc.id.length * 1.618 + npc.x) % 7;
    const outfit =
      npc.service === 'resident'
        ? { model: npc.model ?? 'man_farmer', tint: npc.tint }
        : SERVICE_MODEL[npc.id];
    const instance = outfit ? assets.instantiate(outfit.model) : undefined;
    this.root.position.set(npc.x, 0, npc.z);
    if (!instance) {
      const post = new T.Mesh(
        new T.CylinderGeometry(0.2, 0.26, 1.15, 8),
        new T.MeshStandardMaterial({ color: 0x8a939f, flatShading: true }),
      );
      post.position.y = 0.58;
      post.castShadow = !low;
      const head = new T.Mesh(
        new T.SphereGeometry(0.19, 10, 8),
        new T.MeshStandardMaterial({ color: 0xc2b591, flatShading: true }),
      );
      head.position.y = 1.3;
      head.castShadow = !low;
      this.root.add(post, head);
      return;
    }
    const model = instance.root;
    if (outfit?.scale) model.scale.multiplyScalar(outfit.scale);
    const tintColor = new T.Color(outfit?.tint ?? 0xffffff);
    const cloth = residentCloth(outfit?.tint ?? 0xffffff);
    for (const material of instanceMaterials(model)) {
      if (!(material instanceof T.MeshStandardMaterial)) continue;
      material.map = cloth;
      material.color.lerp(tintColor, 0.35);
      material.roughness = Math.min(1, material.roughness * 0.5 + 0.55);
      material.metalness = Math.min(material.metalness, 0.12);
      material.needsUpdate = true;
    }
    model.traverse((object) => {
      const mesh = object as T.Mesh;
      if (!mesh.isMesh) return;
      mesh.castShadow = !low;
      mesh.receiveShadow = !low;
    });
    this.root.add(model);
    this.animation = new AnimationController(model, instance.clips, TOWNSFOLK_CLIPS);
    this.animation.play('Idle', true);
    this.nextLineAt = this.phase + 3;
    this.nextWaveAt = this.phase + 6;
  }

  get id() {
    return this.npc.id;
  }

  get name() {
    return this.npc.name;
  }

  private ensureBubble() {
    if (this.bubble) return;
    this.bubbleCanvas = document.createElement('canvas');
    this.bubbleCanvas.width = BUBBLE_W;
    this.bubbleCanvas.height = BUBBLE_H;
    this.bubbleTexture = new T.CanvasTexture(this.bubbleCanvas);
    this.bubbleTexture.colorSpace = T.SRGBColorSpace;
    const material = new T.SpriteMaterial({
      map: this.bubbleTexture,
      transparent: true,
      depthWrite: false,
      toneMapped: false,
    });
    this.bubble = new T.Sprite(material);
    this.bubble.scale.set(2.35, 0.77, 1);
    this.bubble.position.y = 2.28;
    this.bubble.renderOrder = 5;
    this.bubble.visible = false;
    this.root.add(this.bubble);
  }

  /** Shows a short speech bubble above the resident. */
  say(text: string, seconds = 4.5) {
    if (!text) return;
    this.ensureBubble();
    const context = this.bubbleCanvas!.getContext('2d')!;
    const accent = new T.Color(this.npc.tint ?? 0xf0d38a);
    paintBubble(
      context,
      text,
      `rgba(${Math.round(accent.r * 255)},${Math.round(accent.g * 255)},${Math.round(accent.b * 255)},0.9)`,
    );
    this.bubbleTexture!.needsUpdate = true;
    this.bubble!.visible = true;
    (this.bubble!.material as T.SpriteMaterial).opacity = 1;
    this.bubbleUntil = performance.now() + seconds * 1000;
  }

  update(dt: number, time: number, focusX: number, focusZ: number) {
    if (this.disposed) return;
    const pose = residentPose(this.npc, Date.now() / 1000);
    this.root.position.x = pose.x;
    this.root.position.z = pose.z;
    this.root.rotation.y = pose.yaw;
    this.moving = pose.moving;
    this.root.position.y = pose.moving
      ? Math.abs(Math.sin(time * 6 + this.phase)) * 0.035
      : Math.sin(time * 1.4 + this.phase) * 0.012;
    if (this.animation) {
      this.animation.play(pose.moving ? 'Run' : 'Idle');
      this.animation.update(dt);
      if (!pose.moving && time > this.nextWaveAt && this.animation.can('Skill01')) {
        this.animation.play('Skill01', true);
        this.nextWaveAt = time + 9 + this.phase * 1.7;
      }
    }
    if (!this.bubble) return;
    const material = this.bubble.material as T.SpriteMaterial;
    const visible = performance.now() < this.bubbleUntil;
    if (visible) {
      const remaining = this.bubbleUntil - performance.now();
      material.opacity = Math.min(1, remaining / 400);
    } else if (this.bubble.visible) {
      this.bubble.visible = false;
      material.opacity = 0;
    }
    // Residents only chat when the hero is close enough to notice them.
    const distance = Math.hypot(focusX - pose.x, focusZ - pose.z);
    const lines = this.npc.lines ?? [];
    if (lines.length && distance < 11 && time > this.nextLineAt) {
      this.say(lines[Math.floor((time * 0.37 + this.phase) * 3) % lines.length], 4.5);
      this.nextLineAt = time + 9 + ((this.phase * 3.1) % 6);
    }
  }

  dispose() {
    this.disposed = true;
    this.animation?.dispose();
    if (this.bubble) {
      (this.bubble.material as T.SpriteMaterial).dispose();
      this.bubbleTexture?.dispose();
    }
    this.root.removeFromParent();
  }
}
