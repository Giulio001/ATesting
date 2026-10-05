import { Box3, Vector3, type Group, type AnimationClip } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { clone } from 'three/addons/utils/SkeletonUtils.js';
export class AssetLoader {
  private loader = new GLTFLoader();
  private warrior?: { root: Group; clips: AnimationClip[] };
  async loadWarrior(url: string, onProgress?: (event: ProgressEvent) => void) {
    let timeout: ReturnType<typeof setTimeout> | undefined;
    const gltf = await Promise.race([
      this.loader.loadAsync(url, onProgress),
      new Promise<never>((_, reject) => {
        timeout = setTimeout(() => reject(new Error('Download del modello scaduto.')), 20000);
      }),
    ]).finally(() => clearTimeout(timeout));
    const root = gltf.scene,
      box = new Box3().setFromObject(root),
      size = box.getSize(new Vector3());
    if (!Number.isFinite(size.y) || size.y <= 0)
      throw new Error('Il modello GLB non contiene una figura valida.');
    root.scale.multiplyScalar(1.85 / size.y);
    const normalized = new Box3().setFromObject(root);
    root.position.y -= normalized.min.y;
    root.traverse((o) => {
      if ('isMesh' in o) {
        o.castShadow = true;
        o.receiveShadow = true;
      }
    });
    this.warrior = { root, clips: gltf.animations };
  }
  instantiateWarrior() {
    return this.warrior
      ? { root: clone(this.warrior.root) as Group, clips: this.warrior.clips }
      : undefined;
  }
}
