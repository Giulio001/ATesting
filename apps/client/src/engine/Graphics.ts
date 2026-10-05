import * as T from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
export class Graphics {
  private composer: EffectComposer;
  private bloom: UnrealBloomPass;
  private mode = 'auto';
  private post = false;
  constructor(
    private renderer: T.WebGLRenderer,
    scene: T.Scene,
    camera: T.Camera,
  ) {
    const environment = new RoomEnvironment(),
      generator = new T.PMREMGenerator(renderer);
    scene.environment = generator.fromScene(environment, 0.04).texture;
    scene.environmentIntensity = 0.45;
    environment.dispose();
    generator.dispose();
    this.composer = new EffectComposer(renderer);
    this.composer.addPass(new RenderPass(scene, camera));
    this.bloom = new UnrealBloomPass(new T.Vector2(innerWidth, innerHeight), 0.38, 0.45, 1.15);
    this.composer.addPass(this.bloom);
    this.composer.addPass(new OutputPass());
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
    this.mode = mode;
    const low = mode === 'low' || (mode === 'auto' && matchMedia('(pointer: coarse)').matches);
    this.post = !low;
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, low ? 1.2 : 1.6));
    this.composer.setPixelRatio(Math.min(devicePixelRatio, low ? 1 : 1.3));
    // A lightweight option keeps the same scene and gameplay, with fewer GPU passes.
    this.renderer.shadowMap.enabled = !low;
    this.resize();
  }
  resize() {
    this.renderer.setSize(innerWidth, innerHeight);
    this.composer.setSize(innerWidth, innerHeight);
  }
  render(dt: number) {
    if (this.post) this.composer.render(dt);
    else {
      const pass = this.composer.passes[0] as RenderPass;
      this.renderer.render(pass.scene, pass.camera);
    }
  }
}
