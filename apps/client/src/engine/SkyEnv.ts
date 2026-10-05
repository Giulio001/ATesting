import * as T from 'three';
import { Sky } from 'three/addons/objects/Sky.js';

/**
 * One shared sun direction drives both the visible sky dome and the key light,
 * so shadows and the sun disc never disagree.
 */
export const SUN_DIRECTION = new T.Vector3(-0.34, 0.46, 0.3).normalize();

export type Region = 'lumengate' | 'frontier' | 'grove';

export interface SkyLook {
  turbidity: number;
  rayleigh: number;
  mieCoefficient: number;
  mieDirectionalG: number;
  /** Exponential fog density, matched to the horizon haze of the look. */
  fog: number;
  /** Haze colour the world fades into. */
  fogColor: number;
}

export const SKY_LOOKS: Record<Region, SkyLook> = {
  lumengate: {
    turbidity: 3.2,
    rayleigh: 1.4,
    mieCoefficient: 0.005,
    mieDirectionalG: 0.78,
    fog: 0.0105,
    fogColor: 0xb9cddd,
  },
  frontier: {
    turbidity: 7.5,
    rayleigh: 2.7,
    mieCoefficient: 0.009,
    mieDirectionalG: 0.7,
    fog: 0.017,
    fogColor: 0xa8a5bd,
  },
  grove: {
    turbidity: 10,
    rayleigh: 2.1,
    mieCoefficient: 0.013,
    mieDirectionalG: 0.62,
    fog: 0.021,
    fogColor: 0x93b0a4,
  },
};

export function applySkyLook(sky: Sky, look: SkyLook) {
  const uniforms = sky.material.uniforms;
  uniforms.turbidity.value = look.turbidity;
  uniforms.rayleigh.value = look.rayleigh;
  uniforms.mieCoefficient.value = look.mieCoefficient;
  uniforms.mieDirectionalG.value = look.mieDirectionalG;
  uniforms.sunPosition.value.copy(SUN_DIRECTION);
  uniforms.showSunDisc.value = 1;
  uniforms.cloudCoverage.value = 0.52;
  uniforms.cloudDensity.value = 0.46;
  uniforms.cloudScale.value = 0.00025;
}

/** Sky dome for the scene background; the shader pins it to the far plane. */
export function createSky(look: SkyLook = SKY_LOOKS.lumengate) {
  const sky = new Sky();
  sky.scale.setScalar(4000);
  applySkyLook(sky, look);
  return sky;
}

/**
 * Bakes the sky into a PMREM cubemap so every PBR surface is lit by real sky
 * instead of the flat indoor studio probe.
 */
export function skyEnvironment(renderer: T.WebGLRenderer): T.Texture {
  const sky = createSky();
  const generator = new T.PMREMGenerator(renderer);
  const texture = generator.fromScene(sky as unknown as T.Scene, 0.02, 1, 9000).texture;
  generator.dispose();
  sky.geometry.dispose();
  sky.material.dispose();
  return texture;
}
