import {
  Box3,
  Vector3,
  type AnimationClip,
  type Group,
  type Material,
  type Mesh,
  type Object3D,
  type SkinnedMesh,
} from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { clone } from 'three/addons/utils/SkeletonUtils.js';

/** A manifest entry can be a bare URL or a URL with per-model tuning. */
export interface ModelSpec {
  url: string;
  /** Rendered height in world units. Defaults to 1.85 (the Guardian's height). */
  height?: number;
  /** Yaw correction when a model does not face +Z like the procedural rig. */
  yaw?: number;
}

export interface AssetManifest {
  characters?: Record<string, string | ModelSpec>;
  enemies?: Record<string, string | ModelSpec>;
  npc?: Record<string, string | ModelSpec>;
  /** Legacy single-model field kept for existing deployments. */
  warrior?: string | null;
}

export interface CharacterInstance {
  root: Group;
  clips: AnimationClip[];
}

interface MeasuredModel {
  root: Group;
  clips: AnimationClip[];
  scale: number;
  ground: number;
  yaw: number;
}

const DEFAULT_HEIGHT = 1.85;
const SKINNED = (object: Object3D): object is SkinnedMesh =>
  (object as SkinnedMesh).isSkinnedMesh === true;

function specOf(value: string | ModelSpec): ModelSpec {
  return typeof value === 'string' ? { url: value } : value;
}

/**
 * Skeleton-aware measurement: props held in the hands or swords on the back
 * would skew a bounding-box height, so the bind-pose skeleton drives the scale
 * and only the ground offset comes from the mesh bounds.
 */
function measure(scene: Object3D, targetHeight: number) {
  scene.updateMatrixWorld(true);
  let minY = Infinity;
  let maxY = -Infinity;
  scene.traverse((object) => {
    if (!SKINNED(object)) return;
    for (const bone of object.skeleton.bones) {
      const y = new Vector3().setFromMatrixPosition(bone.matrixWorld).y;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  });
  const box = new Box3().setFromObject(scene);
  if (!Number.isFinite(minY) || maxY - minY < 0.05) {
    minY = box.min.y;
    maxY = box.max.y;
  }
  const height = Math.max(0.05, maxY - minY);
  return { scale: targetHeight / height, feet: box.min.y * (targetHeight / height) };
}

/** Independent materials per instance so hit flashes never bleed between actors. */
function cloneMaterials(root: Object3D) {
  const owned = new Set<Material>();
  root.traverse((object) => {
    const mesh = object as Mesh;
    if (!mesh.isMesh) return;
    const source = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    const copies = source.map((material) => {
      const copy = material.clone();
      owned.add(copy);
      return copy;
    });
    mesh.material = Array.isArray(mesh.material) ? copies : copies[0];
  });
  return owned;
}

export class AssetLoader {
  private loader = new GLTFLoader();
  private models = new Map<string, MeasuredModel>();

  /** Loads every GLB referenced by the manifest, once per URL. */
  async loadManifest(manifest: AssetManifest, onProgress?: (ratio: number) => void) {
    const groups: Array<Record<string, string | ModelSpec> | undefined> = [
      manifest.characters,
      manifest.enemies,
      manifest.npc,
    ];
    const entries: Array<{ key: string; spec: ModelSpec }> = [];
    for (const group of groups)
      for (const [key, value] of Object.entries(group ?? {}))
        entries.push({ key, spec: specOf(value) });
    if (manifest.warrior && !manifest.characters?.warrior)
      entries.push({ key: 'warrior', spec: { url: manifest.warrior } });

    const cache = new Map<string, { scene: Group; animations: AnimationClip[] }>();
    const urls = [...new Set(entries.map((entry) => entry.spec.url))];
    let done = 0;
    for (const url of urls) {
      const gltf = await this.loader.loadAsync(url);
      cache.set(url, { scene: gltf.scene, animations: gltf.animations });
      done++;
      onProgress?.(done / Math.max(1, urls.length));
    }
    for (const entry of entries) {
      const source = cache.get(entry.spec.url);
      if (!source) continue;
      const { scale, feet } = measure(source.scene, entry.spec.height ?? DEFAULT_HEIGHT);
      this.models.set(entry.key, {
        root: source.scene,
        clips: source.animations,
        scale,
        ground: -feet,
        yaw: entry.spec.yaw ?? 0,
      });
    }
  }

  has(key: string) {
    return this.models.has(key);
  }

  /** Clones a loaded model with independent materials and a normalised transform. */
  instantiate(key: string | undefined): CharacterInstance | undefined {
    if (!key) return undefined;
    const model = this.models.get(key);
    if (!model) return undefined;
    const root = clone(model.root) as Group;
    root.scale.setScalar(model.scale);
    root.rotation.y = model.yaw;
    root.position.y = model.ground;
    root.traverse((object) => {
      if ('isMesh' in object) {
        object.castShadow = true;
        object.receiveShadow = true;
      }
    });
    cloneMaterials(root);
    root.userData.materials = root.userData.materials ?? null;
    return { root, clips: model.clips };
  }
}

/** Collects the standard materials of an instance so callers can flash or tint them. */
export function instanceMaterials(root: Object3D) {
  const materials = new Set<Material>();
  root.traverse((object) => {
    const mesh = object as Mesh;
    if (!mesh.isMesh) return;
    for (const material of Array.isArray(mesh.material) ? mesh.material : [mesh.material])
      materials.add(material);
  });
  return [...materials];
}

/** Finds the first bone matching any of the given names, ignoring case and separators. */
export function findBone(root: Object3D, names: string[]) {
  const wanted = new Set(names.map((name) => name.toLowerCase().replace(/[^a-z]/g, '')));
  let match: Object3D | undefined;
  root.traverse((object) => {
    if (match) return;
    const key = object.name.toLowerCase().replace(/[^a-z]/g, '');
    if (wanted.has(key)) match = object;
  });
  return match;
}

/** Meshes parented under a held-item slot, used to show or hide a weapon. */
export function slotMeshes(root: Object3D, slots: string[]) {
  const bones = slots.map((name) => findBone(root, [name])).filter(Boolean) as Object3D[];
  const meshes = new Set<Mesh>();
  for (const bone of bones)
    bone.traverse((object) => {
      const mesh = object as Mesh;
      if (mesh.isMesh) meshes.add(mesh);
    });
  return [...meshes];
}
