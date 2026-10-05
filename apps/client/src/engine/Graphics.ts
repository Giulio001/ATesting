import * as T from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { mobileGraphics } from './Performance';
import { skyEnvironment } from './SkyEnv';
export class Graphics {
  private composer?: EffectComposer;
  low = false;
  constructor(
    private renderer: T.WebGLRenderer,
    private scene: T.Scene,
    private camera: T.Camera,
    private onQuality: (low: boolean) => void,
  ) {
    // Outdoor sky probe instead of the indoor studio room: warm sun, real
    // horizon bounce, so stone and plaster read as natural daylight.
    scene.environment = skyEnvironment(renderer);
    scene.environmentIntensity = 0.85;
    const setting = document.getElementById('quality') as HTMLSelectElement;
    try {
      const saved = localStorage.getItem('aetheria3d.graphics');
      if (saved && ['auto', 'high', 'low'].includes(saved)) setting.value = saved;
    } catch {}
    setting.addEventListener('change', () => {
      this.configure(setting.value);
      try {
        localStorage.setItem('aetheria3d.graphics', setting.value);
      } catch {}
    });
    this.configure(setting.value);
  }
  private configure(mode: string) {
    this.low = mode === 'low' || (mode === 'auto' && mobileGraphics());
    if (this.low && this.composer) {
      this.composer.passes.forEach((pass) => pass.dispose());
      this.composer.dispose();
      this.composer = undefined;
    } else if (!this.low && !this.composer) {
      this.composer = new EffectComposer(this.renderer);
      this.composer.addPass(new RenderPass(this.scene, this.camera));
      this.composer.addPass(
        new UnrealBloomPass(new T.Vector2(innerWidth, innerHeight), 0.36, 0.5, 1.2),
      );
      this.composer.addPass(new OutputPass());
    }
    // A lightweight option keeps the same scene and gameplay, with fewer GPU passes.
    this.renderer.shadowMap.enabled = !this.low;
    if (this.low) {
      this.scene.traverse((object) => {
        if (
          (object instanceof T.DirectionalLight || object instanceof T.SpotLight) &&
          object.shadow.map
        ) {
          object.shadow.map.dispose();
          object.shadow.map = null;
          object.shadow.mapPass?.dispose();
          object.shadow.mapPass = null;
        }
      });
    }
    this.onQuality(this.low);
    this.resize();
  }
  resize() {
    // Refresh after rotation, browser zoom, or moving between displays. Always below 2.
    this.renderer.setPixelRatio(Math.min(devicePixelRatio || 1, this.low ? 1.2 : 1.6));
    this.composer?.setPixelRatio(Math.min(devicePixelRatio || 1, 1.3));
    this.renderer.setSize(innerWidth, innerHeight);
    this.composer?.setSize(innerWidth, innerHeight);
  }
  render(dt: number) {
    if (this.composer) this.composer.render(dt);
    else this.renderer.render(this.scene, this.camera);
  }
}
