import * as T from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

/**
 * Static scenery loader for the CC0 KayKit Medieval Hexagon pack. Every model is
 * a single textured mesh sharing one 16 KB atlas, which keeps the city light on
 * mobile: batches are drawn with InstancedMesh and clones share geometry.
 */
export interface PropModel {
  scene: T.Group;
  size: T.Vector3;
  center: T.Vector3;
  minY: number;
}

export interface Placement {
  x: number;
  z: number;
  yaw?: number;
  /** Explicit uniform scale. Ignored when height/fit are given. */
  scale?: number;
  /** Normalise the model to this world height. */
  height?: number;
  /** Fit the model inside this footprint, preserving proportions. */
  fit?: { x: number; z: number };
  /** Extra lift above the ground plane. */
  lift?: number;
}

const firstMesh = (root: T.Object3D): T.Mesh | undefined => {
  let found: T.Mesh | undefined;
  root.traverse((object) => {
    if (found) return;
    const mesh = object as T.Mesh;
    if (mesh.isMesh && !Array.isArray(mesh.material)) found = mesh;
  });
  return found;
};

export class Props {
  private loader = new GLTFLoader();
  private models = new Map<string, PropModel>();
  private root: string;

  constructor(root = `${import.meta.env.BASE_URL}assets/world/medieval/`) {
    this.root = root.endsWith('/') ? root : `${root}/`;
  }

  get count() {
    return this.models.size;
  }

  has(key: string) {
    return this.models.has(key);
  }

  size(key: string) {
    return this.models.get(key)?.size;
  }

  async load(keys: string[], onProgress?: (ratio: number) => void) {
    let done = 0;
    for (const key of keys) {
      if (this.models.has(key)) {
        done++;
        continue;
      }
      try {
        const gltf = await this.loader.loadAsync(`${this.root}${key}.gltf`);
        const scene = gltf.scene as T.Group;
        scene.updateMatrixWorld(true);
        const box = new T.Box3().setFromObject(scene);
        const size = box.getSize(new T.Vector3());
        const center = box.getCenter(new T.Vector3());
        this.models.set(key, { scene, size, center, minY: box.min.y });
      } catch (error) {
        console.warn(`Scenografia non caricata: ${key}`, error);
      }
      done++;
      onProgress?.(done / keys.length);
    }
  }

  private scaleOf(model: PropModel, placement: Placement) {
    if (placement.height) return placement.height / Math.max(0.001, model.size.y);
    if (placement.fit)
      return Math.min(
        placement.fit.x / Math.max(0.001, model.size.x),
        placement.fit.z / Math.max(0.001, model.size.z),
      );
    return placement.scale ?? 1;
  }

  /** A single clone placed with its footprint centre on (x, z) and feet on the ground. */
  place(key: string, placement: Placement) {
    const model = this.models.get(key);
    if (!model) return undefined;
    const scale = this.scaleOf(model, placement);
    const group = new T.Group();
    group.position.set(placement.x, placement.lift ?? 0, placement.z);
    group.rotation.y = placement.yaw ?? 0;
    group.scale.setScalar(scale);
    const inner = model.scene.clone(true);
    inner.position.set(-model.center.x, -model.minY, -model.center.z);
    group.add(inner);
    group.traverse((object) => {
      const mesh = object as T.Mesh;
      if (mesh.isMesh) {
        mesh.castShadow = true;
        mesh.receiveShadow = true;
      }
    });
    return group;
  }

  /** One draw call for many copies of a single-mesh model (walls, trees, rocks). */
  instance(key: string, placements: Placement[]) {
    const model = this.models.get(key);
    if (!model || !placements.length) return undefined;
    const source = firstMesh(model.scene);
    if (!source) return undefined;
    const material = (source.material as T.Material).clone();
    const mesh = new T.InstancedMesh(source.geometry, material, placements.length);
    const offset = new T.Matrix4().makeTranslation(-model.center.x, -model.minY, -model.center.z);
    const matrix = new T.Matrix4();
    const position = new T.Vector3();
    const quaternion = new T.Quaternion();
    const uniform = new T.Vector3();
    const up = new T.Vector3(0, 1, 0);
    placements.forEach((placement, index) => {
      const s = this.scaleOf(model, placement);
      position.set(placement.x, placement.lift ?? 0, placement.z);
      quaternion.setFromAxisAngle(up, placement.yaw ?? 0);
      uniform.set(s, s, s);
      matrix.compose(position, quaternion, uniform).multiply(offset);
      mesh.setMatrixAt(index, matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
    // Instances span the whole map, so the source geometry bounds would cull the batch.
    mesh.frustumCulled = false;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
  }
}
