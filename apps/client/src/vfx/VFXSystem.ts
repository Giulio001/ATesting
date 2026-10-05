import * as T from 'three';
import { ATTACKS, MAGE_SPELL, type CombatEvent } from '@aetheria/shared';

type Kind = 'slash' | 'nova' | 'beam' | 'hit' | 'guard' | 'projectile' | 'rip' | 'impact' | 'decal';

/** Camera kick requested by a showy effect; throttled by the renderer side. */
export interface ShakeHint {
  strength: number;
  duration: number;
}

interface Trail {
  bases: T.Vector3[];
  tips: T.Vector3[];
  geometry: T.BufferGeometry;
  count: number;
}

interface Effect {
  root: T.Group;
  age: number;
  duration: number;
  kind: Kind;
  projectileId?: string;
  playerId?: string;
  speed?: number;
  origin?: T.Vector3;
  direction?: T.Vector3;
  launchOffset?: T.Vector3;
  range?: number;
  beamEnd?: T.Vector3;
  trail?: Trail;
  fields?: Particles[];
  spinRoot?: number;
  scaleFrom?: number;
  scaleTo?: number;
  scaleCurve?: 'out' | 'in' | 'pop';
  hold?: boolean;
}

const palette = { warrior: 0xffc878, archer: 0x83ffd0, mage: 0xb58aff };
const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);
const easeIn = (t: number) => t * t;

/* ------------------------------------------------------------------ */
/* Procedural textures: everything is painted on a canvas so the field  */
/* reads as energy instead of flat painted polygons.                    */
/* ------------------------------------------------------------------ */

let textureSize = 256;
const textureCache = new Map<string, T.CanvasTexture>();

export function configureVfxTextures(low: boolean) {
  const size = low ? 128 : 256;
  if (size === textureSize) return;
  textureSize = size;
  for (const texture of textureCache.values()) texture.dispose();
  textureCache.clear();
}

function paint(key: string, draw: (c: CanvasRenderingContext2D, s: number) => void) {
  const cached = textureCache.get(key);
  if (cached) return cached;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = textureSize;
  const c = canvas.getContext('2d')!;
  c.clearRect(0, 0, textureSize, textureSize);
  draw(c, textureSize);
  const texture = new T.CanvasTexture(canvas);
  texture.colorSpace = T.SRGBColorSpace;
  texture.anisotropy = 2;
  textureCache.set(key, texture);
  return texture;
}

/** Soft round glow used by every particle and halo. */
const glowTexture = () =>
  paint('glow', (c, s) => {
    const gradient = c.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
    gradient.addColorStop(0, 'rgba(255,255,255,1)');
    gradient.addColorStop(0.25, 'rgba(255,255,255,0.72)');
    gradient.addColorStop(0.6, 'rgba(255,255,255,0.18)');
    gradient.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = gradient;
    c.fillRect(0, 0, s, s);
  });

/** Four-point star with a hot core: sparks and shard glints. */
const sparkTexture = () =>
  paint('spark', (c, s) => {
    const gradient = c.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
    gradient.addColorStop(0, 'rgba(255,255,255,1)');
    gradient.addColorStop(0.35, 'rgba(255,255,255,0.35)');
    gradient.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = gradient;
    c.fillRect(0, 0, s, s);
    c.globalCompositeOperation = 'lighter';
    for (const angle of [0, Math.PI / 2]) {
      c.save();
      c.translate(s / 2, s / 2);
      c.rotate(angle);
      const streak = c.createLinearGradient(-s / 2, 0, s / 2, 0);
      streak.addColorStop(0, 'rgba(255,255,255,0)');
      streak.addColorStop(0.5, 'rgba(255,255,255,0.85)');
      streak.addColorStop(1, 'rgba(255,255,255,0)');
      c.fillStyle = streak;
      c.fillRect(-s / 2, -s * 0.02, s, s * 0.04);
      c.restore();
    }
  });

/** Ribbon gradient for weapon trails: u = age (old→new), v = across the blade. */
const trailTexture = () =>
  paint('trail', (c, s) => {
    const across = c.createLinearGradient(0, 0, 0, s);
    across.addColorStop(0, 'rgba(255,255,255,0)');
    across.addColorStop(0.45, 'rgba(255,255,255,0.95)');
    across.addColorStop(0.55, 'rgba(255,255,255,0.95)');
    across.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = across;
    c.fillRect(0, 0, s, s);
    const along = c.createLinearGradient(0, 0, s, 0);
    along.addColorStop(0, 'rgba(0,0,0,1)');
    along.addColorStop(0.35, 'rgba(0,0,0,0.55)');
    along.addColorStop(1, 'rgba(0,0,0,0)');
    c.globalCompositeOperation = 'destination-out';
    c.fillStyle = along;
    c.fillRect(0, 0, s, s);
  });

/** Ring/halo used by domes, guard bubbles and shockwaves. */
const haloTexture = () =>
  paint('halo', (c, s) => {
    const gradient = c.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
    gradient.addColorStop(0, 'rgba(255,255,255,0)');
    gradient.addColorStop(0.52, 'rgba(255,255,255,0)');
    gradient.addColorStop(0.74, 'rgba(255,255,255,0.85)');
    gradient.addColorStop(0.88, 'rgba(255,255,255,0.28)');
    gradient.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = gradient;
    c.fillRect(0, 0, s, s);
  });

/** Crescent energy arc with a bright leading edge. */
const crescentTexture = () =>
  paint('crescent', (c, s) => {
    const radial = c.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
    radial.addColorStop(0, 'rgba(255,255,255,0)');
    radial.addColorStop(0.5, 'rgba(255,255,255,0)');
    radial.addColorStop(0.68, 'rgba(255,255,255,1)');
    radial.addColorStop(0.86, 'rgba(255,255,255,0.5)');
    radial.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = radial;
    c.fillRect(0, 0, s, s);
    c.globalCompositeOperation = 'destination-out';
    const sweep = c.createLinearGradient(0, 0, 0, s);
    sweep.addColorStop(0, 'rgba(0,0,0,1)');
    sweep.addColorStop(0.5, 'rgba(0,0,0,0)');
    sweep.addColorStop(0.8, 'rgba(0,0,0,0.6)');
    sweep.addColorStop(1, 'rgba(0,0,0,1)');
    c.fillStyle = sweep;
    c.fillRect(0, 0, s, s);
    c.globalCompositeOperation = 'lighter';
    c.strokeStyle = 'rgba(255,255,255,0.5)';
    for (let i = 0; i < 7; i++) {
      c.lineWidth = 1 + (i % 3) * 0.6;
      c.beginPath();
      const radius = s * (0.2 + i * 0.045);
      c.arc(s / 2, s / 2, radius, -0.6 + i * 0.12, 1.4 + i * 0.1);
      c.stroke();
    }
  });

/** Rune band with ticks, used on beams, barriers and nova pillars. */
const runeTexture = () =>
  paint('rune', (c, s) => {
    const half = s / 2;
    c.strokeStyle = 'rgba(255,255,255,0.9)';
    c.lineWidth = s * 0.02;
    for (const radius of [0.3, 0.42]) {
      c.beginPath();
      c.arc(half, half, s * radius, 0, Math.PI * 2);
      c.stroke();
    }
    c.lineWidth = s * 0.015;
    for (let i = 0; i < 16; i++) {
      const angle = (i / 16) * Math.PI * 2;
      c.beginPath();
      c.moveTo(half + Math.cos(angle) * s * 0.3, half + Math.sin(angle) * s * 0.3);
      c.lineTo(
        half + Math.cos(angle) * s * (i % 2 ? 0.42 : 0.36),
        half + Math.sin(angle) * s * (i % 2 ? 0.42 : 0.36),
      );
      c.stroke();
    }
    c.fillStyle = 'rgba(255,255,255,0.85)';
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2 + 0.3;
      c.save();
      c.translate(half + Math.cos(angle) * s * 0.36, half + Math.sin(angle) * s * 0.36);
      c.rotate(angle);
      c.fillRect(-s * 0.02, -s * 0.05, s * 0.04, s * 0.1);
      c.restore();
    }
  });

/** Hex mesh for the guard dome. */
const hexTexture = () =>
  paint('hex', (c, s) => {
    c.strokeStyle = 'rgba(255,255,255,0.75)';
    c.lineWidth = 1.4;
    const size = s / 9;
    for (let row = -1; row < 10; row++)
      for (let col = -1; col < 10; col++) {
        const cx = col * size * 1.5 + (row % 2 ? size * 0.75 : 0);
        const cy = row * size * 0.87;
        c.beginPath();
        for (let i = 0; i < 6; i++) {
          const angle = (i / 6) * Math.PI * 2;
          const x = cx + Math.cos(angle) * size * 0.5,
            y = cy + Math.sin(angle) * size * 0.5;
          if (i === 0) c.moveTo(x, y);
          else c.lineTo(x, y);
        }
        c.closePath();
        c.stroke();
      }
  });

/** Scorched ground decal with a cracked rim. */
const scorchTexture = () =>
  paint('scorch', (c, s) => {
    const half = s / 2;
    const gradient = c.createRadialGradient(half, half, 0, half, half, half);
    gradient.addColorStop(0, 'rgba(24,16,12,0.85)');
    gradient.addColorStop(0.4, 'rgba(30,22,18,0.6)');
    gradient.addColorStop(0.72, 'rgba(46,34,26,0.3)');
    gradient.addColorStop(1, 'rgba(60,44,32,0)');
    c.fillStyle = gradient;
    c.fillRect(0, 0, s, s);
    c.strokeStyle = 'rgba(90,66,44,0.55)';
    for (let i = 0; i < 22; i++) {
      const angle = (i / 22) * Math.PI * 2 + (i % 3) * 0.1;
      c.lineWidth = 1 + (i % 3);
      c.beginPath();
      c.moveTo(half + Math.cos(angle) * s * 0.16, half + Math.sin(angle) * s * 0.16);
      c.lineTo(
        half + Math.cos(angle + 0.06) * s * (0.3 + (i % 5) * 0.03),
        half + Math.sin(angle + 0.06) * s * (0.3 + (i % 5) * 0.03),
      );
      c.stroke();
    }
  });

/** Dust puff for impacts and landings. */
const dustTexture = () =>
  paint('dust', (c, s) => {
    const gradient = c.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
    gradient.addColorStop(0, 'rgba(255,255,255,0.5)');
    gradient.addColorStop(0.5, 'rgba(255,255,255,0.22)');
    gradient.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = gradient;
    c.fillRect(0, 0, s, s);
  });

/* ------------------------------------------------------------------ */
/* GPU particle field: one Points object per burst.                     */
/* ------------------------------------------------------------------ */

const PARTICLE_VERTEX = `
attribute vec3 pcolor;
attribute float palpha;
attribute float psize;
varying vec3 vColor;
varying float vAlpha;
void main() {
  vColor = pcolor;
  vAlpha = palpha;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_PointSize = psize * (340.0 / max(0.001, -mv.z));
  gl_Position = projectionMatrix * mv;
}`;

const PARTICLE_FRAGMENT = `
uniform sampler2D uMap;
varying vec3 vColor;
varying float vAlpha;
void main() {
  vec4 tex = texture2D(uMap, gl_PointCoord);
  float alpha = tex.a * vAlpha;
  if (alpha < 0.01) discard;
  gl_FragColor = vec4(vColor, 1.0) * tex * vAlpha;
}`;

class Particles {
  readonly points: T.Points;
  private pos: T.BufferAttribute;
  private col: T.BufferAttribute;
  private alphaA: T.BufferAttribute;
  private sizeA: T.BufferAttribute;
  private vel: Float32Array;
  private life: Float32Array;
  private maxLife: Float32Array;
  private delay: Float32Array;
  private spin: Float32Array;
  private gravity: number;
  private drag: number;
  readonly count: number;
  private remaining: number;

  constructor(
    count: number,
    texture: T.Texture,
    options: { gravity?: number; drag?: number; sparkle?: boolean } = {},
  ) {
    this.count = count;
    this.remaining = count;
    this.gravity = options.gravity ?? 0;
    this.drag = options.drag ?? 0.9;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const alphas = new Float32Array(count);
    const sizes = new Float32Array(count);
    this.vel = new Float32Array(count * 3);
    this.life = new Float32Array(count);
    this.maxLife = new Float32Array(count);
    this.delay = new Float32Array(count);
    this.spin = new Float32Array(count);
    const geometry = new T.BufferGeometry();
    geometry.setAttribute(
      'position',
      (this.pos = new T.BufferAttribute(positions, 3).setUsage(T.DynamicDrawUsage)),
    );
    geometry.setAttribute(
      'pcolor',
      (this.col = new T.BufferAttribute(colors, 3).setUsage(T.DynamicDrawUsage)),
    );
    geometry.setAttribute(
      'palpha',
      (this.alphaA = new T.BufferAttribute(alphas, 1).setUsage(T.DynamicDrawUsage)),
    );
    geometry.setAttribute(
      'psize',
      (this.sizeA = new T.BufferAttribute(sizes, 1).setUsage(T.DynamicDrawUsage)),
    );
    geometry.setDrawRange(0, count);
    const material = new T.ShaderMaterial({
      uniforms: { uMap: { value: texture } },
      vertexShader: PARTICLE_VERTEX,
      fragmentShader: PARTICLE_FRAGMENT,
      transparent: true,
      depthWrite: false,
      blending: T.AdditiveBlending,
    });
    this.points = new T.Points(geometry, material);
    this.points.frustumCulled = false;
    this.points.renderOrder = 3;
  }

  spawn(
    index: number,
    x: number,
    y: number,
    z: number,
    velocity: T.Vector3,
    color: T.Color,
    size: number,
    life: number,
    delay = 0,
    spin = 0,
  ) {
    if (index >= this.count) return;
    this.pos.setXYZ(index, x, y, z);
    this.col.setXYZ(index, color.r, color.g, color.b);
    this.vel[index * 3] = velocity.x;
    this.vel[index * 3 + 1] = velocity.y;
    this.vel[index * 3 + 2] = velocity.z;
    this.sizeA.setX(index, size);
    this.alphaA.setX(index, 0);
    this.life[index] = life;
    this.maxLife[index] = life;
    this.delay[index] = delay;
    this.spin[index] = spin;
  }

  /** Advances every particle; returns false once the whole field is spent. */
  update(dt: number): boolean {
    let alive = 0;
    const drag = Math.pow(this.drag, dt * 60);
    for (let i = 0; i < this.count; i++) {
      if (this.delay[i] > 0) {
        this.delay[i] -= dt;
        alive++;
        continue;
      }
      if (this.life[i] <= 0) continue;
      this.life[i] -= dt;
      const k = i * 3;
      this.vel[k] *= drag;
      this.vel[k + 1] = this.vel[k + 1] * drag - this.gravity * dt;
      this.vel[k + 2] *= drag;
      this.pos.setXYZ(
        i,
        this.pos.getX(i) + this.vel[k] * dt,
        this.pos.getY(i) + this.vel[k + 1] * dt,
        this.pos.getZ(i) + this.vel[k + 2] * dt,
      );
      const ratio = Math.max(0, this.life[i] / this.maxLife[i]);
      this.alphaA.setX(i, ratio < 0.2 ? ratio * 5 : Math.min(1, ratio * 1.6));
      if (this.spin[i]) {
        const twist = this.spin[i] * dt;
        const x = this.pos.getX(i),
          z = this.pos.getZ(i);
        this.pos.setXYZ(
          i,
          x * Math.cos(twist) - z * Math.sin(twist),
          this.pos.getY(i),
          x * Math.sin(twist) + z * Math.cos(twist),
        );
      }
      alive++;
    }
    this.pos.needsUpdate = true;
    this.col.needsUpdate = true;
    this.alphaA.needsUpdate = true;
    this.sizeA.needsUpdate = true;
    this.remaining = alive;
    return alive > 0;
  }

  dispose() {
    this.points.geometry.dispose();
    (this.points.material as T.Material).dispose();
  }
}

/* ------------------------------------------------------------------ */
/* VFX system                                                           */
/* ------------------------------------------------------------------ */

export class VFXSystem {
  private effects: Effect[] = [];
  private low = false;
  private weaponBase = new T.Vector3();
  private weaponTip = new T.Vector3();
  private shaken = 0;
  private lastShakeAt = -Infinity;

  constructor(
    private scene: T.Scene,
    private weaponPose: (id: string, base: T.Vector3, tip: T.Vector3) => boolean,
    private onShake?: (hint: ShakeHint) => void,
  ) {}

  setQuality(low: boolean) {
    this.low = low;
    configureVfxTextures(low);
    if (low) {
      for (const effect of this.effects) {
        for (const child of [...effect.root.children]) {
          if (child instanceof T.PointLight) effect.root.remove(child);
        }
      }
      while (this.effects.length > 48) this.remove(0);
    }
  }

  private segments(count: number) {
    return this.low ? Math.max(4, Math.floor(count / 2)) : count;
  }

  private count(high: number, low: number) {
    return this.low ? low : high;
  }

  private shake(strength: number, duration: number) {
    if (!this.onShake) return;
    const now = performance.now();
    if (now - this.lastShakeAt < 90 && strength < this.shaken) return;
    if (strength < this.shaken) return;
    this.shaken = Math.max(this.shaken * 0.6, strength);
    this.lastShakeAt = now;
    this.onShake({ strength, duration });
  }

  private mesh(
    root: T.Group,
    geometry: T.BufferGeometry,
    color: number,
    opacity = 1,
    options: {
      map?: T.Texture;
      blending?: T.Blending;
      depthWrite?: boolean;
      side?: T.Side;
      colorScale?: number;
    } = {},
  ) {
    const material = new T.MeshBasicMaterial({
      color,
      map: options.map,
      transparent: true,
      opacity,
      side: options.side ?? T.DoubleSide,
      blending: options.blending ?? T.AdditiveBlending,
      depthWrite: options.depthWrite ?? false,
      toneMapped: false,
    });
    material.color.multiplyScalar(options.colorScale ?? 1.8);
    const mesh = new T.Mesh(geometry, material);
    mesh.userData.opacity = opacity;
    mesh.renderOrder = 3;
    root.add(mesh);
    return mesh;
  }

  private light(root: T.Group, color: number, intensity: number, distance = 6) {
    if (this.low) return;
    if (
      this.effects.reduce(
        (n, e) => n + e.root.children.filter((c) => c instanceof T.PointLight).length,
        0,
      ) >= 6
    )
      return;
    const light = new T.PointLight(color, intensity, distance, 2);
    light.position.y = 1.2;
    light.userData.intensity = intensity;
    root.add(light);
  }

  private add(root: T.Group, kind: Kind, duration: number, extra: Partial<Effect> = {}) {
    if (this.effects.length >= (this.low ? 48 : 96)) this.remove(0);
    this.scene.add(root);
    const effect: Effect = { root, kind, duration, age: 0, ...extra };
    this.effects.push(effect);
    return effect;
  }

  private remove(index: number) {
    const effect = this.effects[index];
    effect.root.traverse((o) => {
      if (o instanceof T.Points) {
        o.geometry.dispose();
        (o.material as T.Material).dispose();
      } else if (o instanceof T.Mesh) {
        o.geometry.dispose();
        (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => m.dispose());
      }
    });
    this.scene.remove(effect.root);
    this.effects.splice(index, 1);
  }

  /* --------------------------- building blocks --------------------------- */

  private burst(
    root: T.Group,
    options: {
      count: number;
      color: number;
      origin: T.Vector3;
      speed: number;
      spread?: number;
      up?: number;
      gravity?: number;
      size?: number;
      life?: number;
      texture?: T.Texture;
      drag?: number;
      sparkle?: boolean;
      delay?: number;
    },
  ): Particles {
    const field = new Particles(options.count, options.texture ?? glowTexture(), {
      gravity: options.gravity ?? 0,
      drag: options.drag ?? 0.86,
    });
    const color = new T.Color(options.color);
    const direction = new T.Vector3();
    for (let i = 0; i < options.count; i++) {
      const angle = i * 2.399 + (options.spread ? Math.random() * 0.35 : 0);
      const lift = options.spread === 0 ? 0 : Math.random() * (options.spread ?? 1);
      direction
        .set(Math.cos(angle), lift, Math.sin(angle))
        .normalize()
        .multiplyScalar(options.speed * (0.55 + Math.random() * 0.75));
      direction.y += options.up ?? 0;
      const shade = 0.75 + Math.random() * 0.5;
      field.spawn(
        i,
        options.origin.x + direction.x * 0.05,
        options.origin.y + Math.random() * 0.1,
        options.origin.z + direction.z * 0.05,
        direction,
        new T.Color(color.r * shade, color.g * shade, color.b * shade),
        (options.size ?? 0.34) * (0.6 + Math.random() * 0.9),
        (options.life ?? 0.7) * (0.7 + Math.random() * 0.6),
        options.delay ? Math.random() * options.delay : 0,
      );
    }
    root.add(field.points);
    return field;
  }

  private groundWave(
    root: T.Group,
    x: number,
    z: number,
    color: number,
    options: {
      radius?: number;
      duration?: number;
      texture?: T.Texture;
      opacity?: number;
      y?: number;
    } = {},
  ) {
    const radius = options.radius ?? 1.6;
    const ring = this.mesh(
      root,
      new T.RingGeometry(radius * 0.55, radius, this.segments(56), 1),
      color,
      options.opacity ?? 0.85,
      { map: options.texture ?? haloTexture() },
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(x, options.y ?? 0.06, z);
    ring.userData.grow = options.duration ?? 0.6;
    ring.userData.growTo = 2.6;
    return ring;
  }

  private decal(x: number, z: number, color: number, radius: number, duration: number) {
    const root = new T.Group();
    root.position.set(x, 0.035, z);
    const mark = this.mesh(root, new T.PlaneGeometry(radius * 2, radius * 2), color, 0.65, {
      map: scorchTexture(),
      blending: T.NormalBlending,
      depthWrite: false,
      colorScale: 1,
    });
    mark.rotation.x = -Math.PI / 2;
    mark.renderOrder = 1;
    this.add(root, 'decal', duration);
  }

  private sparks(x: number, z: number, color: number, power = 1) {
    const root = new T.Group();
    root.position.set(x, 1.05, z);
    const origin = new T.Vector3();
    const field = this.burst(root, {
      count: this.count(Math.round(18 * power), Math.round(9 * power)),
      color,
      origin,
      speed: 2.4 * power,
      spread: 0.5,
      up: 0.6,
      gravity: 7,
      size: 0.3,
      life: 0.5,
      texture: sparkTexture(),
      drag: 0.9,
    });
    const flash = this.mesh(
      root,
      new T.SphereGeometry(0.3 * power, this.segments(12), this.segments(8)),
      color,
      0.55,
      { map: glowTexture() },
    );
    flash.userData.flash = true;
    flash.userData.flashTo = 1.9 * power;
    const effect = this.add(root, 'hit', 0.42 * power, { fields: [field] });
    return effect;
  }

  /** Generic impact burst, reusable by hits, deaths and NPC ambience. */
  impact(x: number, z: number, color: number, power = 1) {
    const effect = this.sparks(x, z, color, power);
    this.groundWave(effect.root, 0, 0, color, {
      radius: 0.9 * power,
      duration: 0.45,
      opacity: 0.7,
      y: -0.99,
    });
    if (power > 1.05) this.shake(0.28 * power, 0.2);
  }

  private bladeTrail(e: CombatEvent, color: number) {
    const segments = this.low ? 6 : 12;
    const geometry = new T.BufferGeometry();
    geometry.setAttribute(
      'position',
      new T.BufferAttribute(new Float32Array(segments * 18), 3).setUsage(T.DynamicDrawUsage),
    );
    geometry.setAttribute(
      'uv',
      new T.BufferAttribute(new Float32Array(segments * 12), 2).setUsage(T.DynamicDrawUsage),
    );
    geometry.setDrawRange(0, 0);
    const root = new T.Group();
    const mesh = this.mesh(root, geometry, color, 0.9, { map: trailTexture() });
    mesh.frustumCulled = false;
    this.light(root, color, e.kind === 'aether' ? 9 : 4);
    const effect = this.add(root, 'slash', ATTACKS[e.kind].duration + 0.06, {
      playerId: e.playerId,
      trail: {
        bases: Array.from({ length: segments + 1 }, () => new T.Vector3()),
        tips: Array.from({ length: segments + 1 }, () => new T.Vector3()),
        geometry,
        count: 0,
      },
    });
    this.updateTrail(effect);
  }

  private updateTrail(effect: Effect) {
    const trail = effect.trail!;
    if (!effect.playerId || !this.weaponPose(effect.playerId, this.weaponBase, this.weaponTip)) {
      trail.count = 0;
      trail.geometry.setDrawRange(0, 0);
      return;
    }
    const base = trail.bases.pop()!,
      tip = trail.tips.pop()!;
    base.copy(this.weaponBase);
    tip.copy(this.weaponTip);
    trail.bases.unshift(base);
    trail.tips.unshift(tip);
    trail.count = Math.min(trail.count + 1, trail.bases.length);
    const positions = trail.geometry.getAttribute('position') as T.BufferAttribute;
    const uvs = trail.geometry.getAttribute('uv') as T.BufferAttribute;
    const span = Math.max(1, trail.bases.length - 1);
    for (let i = 0; i < trail.count - 1; i++) {
      const base = trail.bases[i],
        tip = trail.tips[i],
        previousBase = trail.bases[i + 1],
        previousTip = trail.tips[i + 1];
      const vertex = i * 6;
      positions.setXYZ(vertex, base.x, base.y, base.z);
      positions.setXYZ(vertex + 1, tip.x, tip.y, tip.z);
      positions.setXYZ(vertex + 2, previousTip.x, previousTip.y, previousTip.z);
      positions.setXYZ(vertex + 3, base.x, base.y, base.z);
      positions.setXYZ(vertex + 4, previousTip.x, previousTip.y, previousTip.z);
      positions.setXYZ(vertex + 5, previousBase.x, previousBase.y, previousBase.z);
      const u = 1 - i / span,
        next = 1 - (i + 1) / span;
      uvs.setXY(vertex, u, 0);
      uvs.setXY(vertex + 1, u, 1);
      uvs.setXY(vertex + 2, next, 1);
      uvs.setXY(vertex + 3, u, 0);
      uvs.setXY(vertex + 4, next, 1);
      uvs.setXY(vertex + 5, next, 0);
    }
    positions.needsUpdate = true;
    uvs.needsUpdate = true;
    trail.geometry.setDrawRange(0, (trail.count - 1) * 6);
    for (const child of effect.root.children)
      if (child instanceof T.PointLight) child.position.copy(this.weaponTip);
  }

  /* ------------------------------ effects ------------------------------ */

  combat(e: CombatEvent) {
    const mage = e.heroClass === 'VOID_KNIGHT',
      archer = e.heroClass === 'AETHER_BLADE';
    const color = mage
      ? palette.mage
      : archer
        ? palette.archer
        : e.kind === 'skill'
          ? 0x8adfff
          : palette.warrior;
    if (e.impactOnly) {
      const index = this.effects.findIndex((fx) => fx.projectileId === e.projectile?.id);
      if (index >= 0) this.remove(index);
      this.projectileImpact(e.x, e.z, color, e.hit);
      return;
    }
    const root = new T.Group();
    root.position.set(e.x, 0.06, e.z);
    root.rotation.y = e.yaw;
    if (e.projectile) {
      this.projectile(e, root, color, archer, mage);
    } else if (mage && e.kind === 'aether') {
      this.beam(e, root, color);
    } else if (e.kind === 'skill') {
      this.nova(e, root, color, mage);
    } else {
      this.slash(e, root, color, mage, archer);
    }
  }

  /** Slash: weapon trail plus a thrown crescent, ground scar and sparks. */
  private slash(e: CombatEvent, root: T.Group, color: number, mage: boolean, archer: boolean) {
    if (this.weaponPose(e.playerId, this.weaponBase, this.weaponTip)) this.bladeTrail(e, color);
    const arc = this.mesh(
      root,
      new T.RingGeometry(0.85, 2.5, this.segments(48), 1, 0.25, Math.PI * 1.15),
      e.kind === 'skill' ? 0xfff0cd : color,
      0.95,
      { map: crescentTexture(), colorScale: 2.2 },
    );
    arc.rotation.x = -Math.PI / 2;
    arc.position.y = 0.85;
    arc.userData.spin = 0.6;
    arc.userData.grow = 0.32;
    arc.userData.growTo = 1.5;
    for (let i = 0; i < this.count(3, 2); i++) {
      const ghost = this.mesh(
        root,
        new T.RingGeometry(0.9 + i * 0.18, 2.3 + i * 0.2, this.segments(40), 1, 0.3, Math.PI),
        color,
        0.3 / (i + 1),
        { map: crescentTexture(), colorScale: 1.6 },
      );
      ghost.rotation.x = -Math.PI / 2;
      ghost.rotation.z = -0.5 + i * 0.4;
      ghost.position.y = 0.6 + i * 0.25;
      ghost.userData.spin = -0.4 - i * 0.2;
    }
    this.groundWave(root, 0, 0, color, { radius: 1.35, duration: 0.34, opacity: 0.5 });
    this.burst(root, {
      count: this.count(14, 7),
      color,
      origin: new T.Vector3(0, 0.7, 0),
      speed: 1.6,
      spread: 0.6,
      gravity: 4,
      size: 0.3,
      life: 0.4,
      texture: sparkTexture(),
    });
    this.light(root, color, e.kind === 'aether' ? 9 : 5, 6);
    this.shake(e.kind === 'skill' ? 0.2 : 0.12, 0.16);
    this.add(root, 'slash', ATTACKS[e.kind].duration);
    if (mage || archer) this.softCasterRing(e, color);
  }

  private softCasterRing(e: CombatEvent, color: number) {
    const ring = new T.Group();
    ring.position.set(e.x, 0.08, e.z);
    const disc = this.mesh(ring, new T.CircleGeometry(1.1, this.segments(40)), color, 0.4, {
      map: runeTexture(),
      colorScale: 1.6,
    });
    disc.rotation.x = -Math.PI / 2;
    disc.userData.spin = 0.8;
    this.add(ring, 'impact', 0.55);
  }

  /** Nova: expanding shockwave, light pillar, shards and a scorched crater. */
  private nova(e: CombatEvent, root: T.Group, color: number, mage: boolean) {
    root.position.set(e.x, 0.06, e.z);
    root.rotation.y = e.yaw;
    const wave = this.groundWave(root, 0, 0, color, {
      radius: 1.2,
      duration: 0.55,
      opacity: 0.95,
      texture: runeTexture(),
    });
    wave.userData.growTo = 4.4;
    const inner = this.mesh(
      root,
      new T.RingGeometry(0.3, 0.95, this.segments(40), 1),
      mage ? 0xfff0ff : 0xfff3d4,
      0.9,
      { map: haloTexture() },
    );
    inner.rotation.x = -Math.PI / 2;
    inner.position.y = 0.1;
    inner.userData.grow = 0.42;
    inner.userData.growTo = 2.2;
    const dome = this.mesh(
      root,
      new T.SphereGeometry(1, this.segments(32), this.segments(16), 0, Math.PI * 2, 0, Math.PI / 2),
      color,
      0.22,
      { map: hexTexture(), side: T.DoubleSide },
    );
    dome.scale.y = 0.4;
    const pillar = this.mesh(
      root,
      new T.CylinderGeometry(0.55, 1.15, 5.5, this.segments(20), 1, true),
      color,
      0.3,
      { map: haloTexture(), side: T.DoubleSide },
    );
    pillar.position.y = 2.75;
    pillar.userData.grow = 0.6;
    pillar.userData.growTo = 1.2;
    for (let i = 0; i < this.count(22, 11); i++) {
      const shard = this.mesh(
        root,
        new T.OctahedronGeometry(0.05 + (i % 3) * 0.03),
        i % 4 === 0 ? 0xffffff : color,
        0.9,
        { map: sparkTexture(), colorScale: 2 },
      );
      const angle = i * 2.399;
      shard.position.set(Math.cos(angle) * 0.5, 0.2 + (i % 3) * 0.14, Math.sin(angle) * 0.5);
      shard.userData.velocity = new T.Vector3(
        Math.cos(angle) * (1.6 + (i % 4) * 0.7),
        1.4 + (i % 5) * 0.7,
        Math.sin(angle) * (1.6 + (i % 4) * 0.7),
      );
      shard.userData.spin = 3 + (i % 4);
    }
    const debris = this.burst(root, {
      count: this.count(28, 14),
      color,
      origin: new T.Vector3(0, 0.35, 0),
      speed: 3.4,
      spread: 0.9,
      up: 1.5,
      gravity: 6,
      size: 0.36,
      life: 0.85,
      texture: sparkTexture(),
      drag: 0.92,
    });
    this.decal(e.x, e.z, color, 2.1, 3.2);
    this.light(root, color, 16, 10);
    this.shake(mage ? 0.4 : 0.34, 0.3);
    this.add(root, 'nova', 0.78, { fields: [debris] });
  }

  /** Mage beam: layered cylinder, rune rings and a scorch at the impact point. */
  private beam(e: CombatEvent, root: T.Group, color: number) {
    const length = MAGE_SPELL.beamLength;
    root.position.set(e.x, 1.15, e.z);
    if (this.weaponPose(e.playerId, this.weaponBase, this.weaponTip))
      root.position.copy(this.weaponTip);
    const beamEnd = new T.Vector3(
      e.x + Math.sin(e.yaw) * length,
      1.15,
      e.z + Math.cos(e.yaw) * length,
    );
    root.lookAt(beamEnd);
    root.scale.z = root.position.distanceTo(beamEnd) / length;
    for (const [width, opacity, tint] of [
      [0.05, 1, 0xffffff],
      [0.13, 0.5, color],
      [0.3, 0.16, color],
      [0.52, 0.06, color],
    ] as const) {
      const layer = this.mesh(
        root,
        new T.CylinderGeometry(width, width * 1.15, length, this.segments(16), 1, true),
        tint,
        opacity,
        { map: width > 0.3 ? glowTexture() : undefined, side: T.DoubleSide },
      );
      layer.rotation.x = Math.PI / 2;
      layer.position.set(0, 0, length / 2);
      layer.userData.flicker = 12;
    }
    for (let i = 0; i < this.count(6, 4); i++) {
      const rune = this.mesh(
        root,
        new T.TorusGeometry(0.24 + i * 0.03, 0.014, this.segments(6), this.segments(28)),
        color,
        0.7,
        { map: glowTexture() },
      );
      rune.position.set(0, 0, 0.7 + i * 1.15);
      rune.userData.spin = 1;
    }
    const burst = new T.Group();
    const field = this.burst(burst, {
      count: this.count(22, 11),
      color,
      origin: new T.Vector3(),
      speed: 2.6,
      spread: 0.7,
      gravity: 5,
      size: 0.34,
      life: 0.6,
      texture: sparkTexture(),
      delay: 0.35,
    });
    root.add(burst);
    burst.position.set(0, 0, length);
    const core = this.mesh(
      burst,
      new T.SphereGeometry(0.42, this.segments(16), this.segments(10)),
      0xffffff,
      0.9,
      {
        map: glowTexture(),
      },
    );
    core.userData.flash = true;
    core.userData.flashTo = 1.7;
    this.decal(beamEnd.x, beamEnd.z, color, 1.1, 2.4);
    const extra = this.burst(root, {
      count: this.count(16, 8),
      color,
      origin: new T.Vector3(0, 0, length * 0.4),
      speed: 1.1,
      spread: 1,
      gravity: 1,
      size: 0.26,
      life: 0.6,
      texture: sparkTexture(),
      delay: 0.5,
    });
    this.light(root, color, 11, 9);
    this.shake(0.24, 0.22);
    this.add(root, 'beam', ATTACKS[e.kind].duration, {
      playerId: e.playerId,
      beamEnd,
      fields: [field, extra],
    });
  }

  /** Arrow / orb travelling projectile with a trailing ribbon of light. */
  private projectile(e: CombatEvent, root: T.Group, color: number, archer: boolean, mage: boolean) {
    const origin = new T.Vector3(e.x, 1.15, e.z);
    const launchOffset = new T.Vector3();
    if (this.weaponPose(e.playerId, this.weaponBase, this.weaponTip))
      launchOffset.copy(this.weaponTip).sub(origin);
    root.position.copy(origin).add(launchOffset);
    const field = new Particles(this.count(26, 13), glowTexture(), { gravity: -0.6, drag: 0.94 });
    if (archer) {
      const shaft = this.mesh(root, new T.CylinderGeometry(0.02, 0.02, 0.8, 6), color, 0.95, {
        map: glowTexture(),
        colorScale: 2.4,
      });
      shaft.rotation.x = Math.PI / 2;
      const head = this.mesh(root, new T.ConeGeometry(0.07, 0.22, 8), 0xffffff, 1, {
        map: sparkTexture(),
        colorScale: 2.4,
      });
      head.rotation.x = Math.PI / 2;
      head.position.z = 0.48;
      for (const side of [-1, 1]) {
        const fletch = this.mesh(root, new T.PlaneGeometry(0.16, 0.1), color, 0.9, {
          map: glowTexture(),
        });
        fletch.position.set(side * 0.05, side * 0.05, -0.34);
        fletch.rotation.z = side * 0.6;
      }
      for (let i = 0; i < field.count; i++)
        field.spawn(
          i,
          (Math.random() - 0.5) * 0.05,
          (Math.random() - 0.5) * 0.05,
          -0.3 - i * 0.05,
          new T.Vector3((Math.random() - 0.5) * 0.25, 0.05, -0.6),
          new T.Color(color),
          0.22 * (0.6 + Math.random() * 0.6),
          0.32 + Math.random() * 0.12,
          i * 0.012,
        );
    } else {
      const core = this.mesh(root, new T.IcosahedronGeometry(0.19, 1), 0xffffff, 0.95, {
        map: glowTexture(),
        colorScale: 2.4,
      });
      core.userData.spinFast = 6;
      const shell = this.mesh(
        root,
        new T.SphereGeometry(0.38, this.segments(16), this.segments(10)),
        color,
        0.28,
        {
          map: glowTexture(),
        },
      );
      shell.userData.pulse = 9;
      for (let i = 0; i < field.count; i++) {
        const angle = (i / field.count) * Math.PI * 2;
        field.spawn(
          i,
          Math.cos(angle) * 0.22,
          Math.sin(angle) * 0.22,
          -0.2 - i * 0.045,
          new T.Vector3(Math.cos(angle) * 0.5, Math.sin(angle) * 0.5, -0.5),
          new T.Color(color),
          0.24 * (0.6 + Math.random() * 0.7),
          0.4 + Math.random() * 0.15,
          i * 0.014,
        );
      }
    }
    if (mage || !archer) this.light(root, color, 4, 4);
    const effect = this.add(root, 'projectile', e.projectile!.range / e.projectile!.speed + 0.25, {
      projectileId: e.projectile!.id,
      speed: e.projectile!.speed,
      range: e.projectile!.range,
      origin,
      launchOffset,
      direction: new T.Vector3(Math.sin(e.yaw), 0, Math.cos(e.yaw)),
      fields: [field],
    });
    return effect;
  }

  /** Detonation when a projectile reaches its target. */
  private projectileImpact(x: number, z: number, color: number, hit: boolean) {
    const root = new T.Group();
    root.position.set(x, 1.05, z);
    const field = this.burst(root, {
      count: this.count(26, 13),
      color,
      origin: new T.Vector3(),
      speed: 3,
      spread: 0.9,
      gravity: 8,
      size: 0.34,
      life: 0.55,
      texture: sparkTexture(),
    });
    const flash = this.mesh(
      root,
      new T.SphereGeometry(0.34, this.segments(16), this.segments(10)),
      0xffffff,
      0.85,
      {
        map: glowTexture(),
      },
    );
    flash.userData.flash = true;
    flash.userData.flashTo = 2.4;
    this.groundWave(root, 0, 0, color, { radius: 1.1, duration: 0.42, y: -0.99 });
    if (hit) {
      this.decal(x, z, color, 1.1, 2.2);
      this.light(root, color, 8, 6);
      this.shake(0.2, 0.18);
    } else {
      this.burst(root, {
        count: this.count(12, 6),
        color: 0x8b8778,
        origin: new T.Vector3(),
        speed: 1.4,
        spread: 0.4,
        gravity: 2,
        size: 0.5,
        life: 0.6,
        texture: dustTexture(),
        drag: 0.8,
      });
    }
    this.add(root, 'impact', 0.5, { fields: [field] });
  }

  /* --------------------------- support effects --------------------------- */

  guard(x: number, z: number, cls = 'GUARDIAN', playerId = '') {
    const index = this.effects.findIndex((e) => e.kind === 'guard' && e.playerId === playerId);
    if (index >= 0) this.remove(index);
    const color =
      cls === 'VOID_KNIGHT' ? palette.mage : cls === 'AETHER_BLADE' ? palette.archer : 0x8bddff;
    const root = new T.Group();
    root.position.set(x, 1, z);
    const bubble = this.mesh(
      root,
      new T.SphereGeometry(1.18, this.segments(28), this.segments(18)),
      color,
      0.16,
      {
        map: hexTexture(),
        side: T.BackSide,
      },
    );
    bubble.userData.pulse = 5;
    const shell = this.mesh(
      root,
      new T.SphereGeometry(1.24, this.segments(24), this.segments(14)),
      color,
      0.1,
      {
        map: glowTexture(),
        side: T.BackSide,
      },
    );
    for (let i = 0; i < 2; i++) {
      const rune = this.mesh(
        root,
        new T.RingGeometry(1.05 + i * 0.12, 1.2 + i * 0.12, this.segments(48), 1),
        color,
        0.6,
        { map: runeTexture() },
      );
      rune.rotation.x = -Math.PI / 2 + i * 0.3;
      rune.userData.spin = i ? -0.6 : 0.6;
    }
    for (let i = 0; i < this.count(6, 3); i++) {
      const plate = this.mesh(root, new T.PlaneGeometry(0.24, 0.36), color, 0.5, {
        map: hexTexture(),
      });
      const angle = (i / 6) * Math.PI * 2;
      plate.position.set(Math.cos(angle) * 0.9, 0.1 + (i % 3) * 0.35, Math.sin(angle) * 0.9);
      plate.lookAt(
        root.position.x + Math.cos(angle) * 3,
        plate.position.y,
        root.position.z + Math.sin(angle) * 3,
      );
    }
    const motes = this.burst(root, {
      count: this.count(14, 7),
      color,
      origin: new T.Vector3(0, -0.4, 0),
      speed: 0.5,
      spread: 0.3,
      up: 0.9,
      size: 0.22,
      life: 1.6,
      texture: glowTexture(),
      drag: 0.98,
      delay: 1.4,
    });
    this.light(root, color, 4, 4);
    this.add(root, 'guard', 2.5, { playerId, fields: [motes] });
  }

  moveGuard(id: string, x: number, z: number) {
    for (const e of this.effects)
      if (e.kind === 'guard' && e.playerId === id) e.root.position.set(x, 1, z);
  }

  damage(x: number, z: number) {
    const red = 0xeb776d;
    const root = new T.Group();
    root.position.set(x, 0.05, z);
    const ring = this.mesh(root, new T.RingGeometry(0.34, 0.62, this.segments(40)), red, 0.85, {
      map: haloTexture(),
    });
    ring.rotation.x = -Math.PI / 2;
    ring.userData.grow = 0.4;
    ring.userData.growTo = 1.7;
    const field = this.burst(root, {
      count: this.count(16, 8),
      color: red,
      origin: new T.Vector3(0, 0.9, 0),
      speed: 1.9,
      spread: 0.7,
      gravity: 6,
      size: 0.3,
      life: 0.45,
      texture: sparkTexture(),
    });
    this.add(root, 'hit', 0.5, { fields: [field] });
  }

  /** Dissolve burst played where a creature dies. */
  death(x: number, z: number, color = 0xb58aff) {
    const root = new T.Group();
    root.position.set(x, 0.12, z);
    for (const [radius, thickness] of [
      [0.55, 0.05],
      [0.88, 0.028],
    ]) {
      const ring = this.mesh(
        root,
        new T.TorusGeometry(radius, thickness, this.segments(8), this.segments(48)),
        color,
        0.9,
        { map: glowTexture() },
      );
      ring.rotation.x = -Math.PI / 2;
      ring.userData.grow = 0.7;
      ring.userData.growTo = 2.6;
    }
    const core = this.mesh(
      root,
      new T.SphereGeometry(0.45, this.segments(16), this.segments(10)),
      color,
      0.4,
      {
        map: glowTexture(),
        side: T.BackSide,
      },
    );
    core.userData.flash = true;
    core.userData.flashTo = 2.2;
    for (let i = 0; i < this.count(14, 7); i++) {
      const shard = this.mesh(root, new T.OctahedronGeometry(0.05 + (i % 3) * 0.02), color, 0.9, {
        map: sparkTexture(),
        colorScale: 2,
      });
      const angle = i * 2.399;
      shard.userData.velocity = new T.Vector3(
        Math.cos(angle) * (0.8 + (i % 3) * 0.5),
        0.9 + (i % 4) * 0.5,
        Math.sin(angle) * (0.8 + (i % 3) * 0.5),
      );
      shard.userData.spin = 2 + (i % 3);
    }
    const wisps = this.burst(root, {
      count: this.count(20, 10),
      color,
      origin: new T.Vector3(0, 0.5, 0),
      speed: 0.5,
      spread: 0.2,
      up: 1.5,
      gravity: -1.1,
      size: 0.3,
      life: 1.2,
      texture: glowTexture(),
      drag: 0.97,
    });
    this.decal(x, z, color, 1.3, 3.4);
    this.light(root, color, 9, 6);
    this.shake(0.22, 0.22);
    this.add(root, 'rip', 0.9, { fields: [wisps] });
  }

  clear() {
    while (this.effects.length) this.remove(this.effects.length - 1);
    this.shaken = 0;
  }

  update(dt: number) {
    this.shaken = Math.max(0, this.shaken - dt * 2.4);
    for (let i = this.effects.length - 1; i >= 0; i--) {
      const e = this.effects[i];
      e.age += dt;
      const t = Math.min(1, e.age / e.duration),
        fade = 1 - t;
      if (e.kind === 'projectile' && e.origin && e.direction && e.launchOffset) {
        e.root.position
          .copy(e.origin)
          .addScaledVector(e.direction, Math.min(e.age * (e.speed ?? 0), e.range ?? Infinity))
          .addScaledVector(e.launchOffset, Math.max(0, 1 - e.age / 0.16));
      }
      if (e.trail) this.updateTrail(e);
      if (e.beamEnd && e.playerId && this.weaponPose(e.playerId, this.weaponBase, this.weaponTip)) {
        e.root.position.copy(this.weaponTip);
        e.root.lookAt(e.beamEnd);
        e.root.scale.z = e.root.position.distanceTo(e.beamEnd) / MAGE_SPELL.beamLength;
      }
      if (e.kind === 'nova') e.root.scale.setScalar(0.35 + easeOut(t) * 3.4);
      if (e.kind === 'rip') e.root.scale.setScalar(0.75 + easeOut(t) * 1.5);
      if (e.kind === 'impact') e.root.scale.setScalar(0.6 + easeOut(t) * 1.1);
      if (e.spinRoot) e.root.rotation.y += dt * e.spinRoot;
      if (e.kind === 'guard') e.root.rotation.y += dt * 0.35;
      if (e.fields) {
        e.fields = e.fields.filter((field) => {
          if (field.update(dt)) return true;
          field.points.removeFromParent();
          field.dispose();
          return false;
        });
        if (!e.fields.length) e.fields = undefined;
      }
      if (e.kind === 'decal') {
        for (const c of e.root.children) {
          if (c instanceof T.Mesh)
            (c.material as T.MeshBasicMaterial).opacity = (c.userData.opacity ?? 1) * fade ** 0.5;
        }
        if (t >= 1) this.remove(i);
        continue;
      }
      for (const c of e.root.children) {
        if (c instanceof T.Points) continue;
        if (c instanceof T.Mesh) {
          const material = c.material as T.MeshBasicMaterial;
          const hold = c.userData.hold ?? 1;
          const fadeFactor =
            e.kind === 'projectile'
              ? Math.min(1, fade * 4)
              : e.kind === 'guard'
                ? Math.min(1, fade * 5)
                : fade ** hold;
          material.opacity = (c.userData.opacity ?? 1) * fadeFactor;
          if (c.userData.spin) c.rotation.z += dt * c.userData.spin * 3;
          if (c.userData.vertexSpin) c.rotation.y += dt * c.userData.vertexSpin;
          if (c.userData.spinFast) {
            c.rotation.y += dt * c.userData.spinFast;
            c.rotation.x += dt * c.userData.spinFast * 0.7;
          }
          if (c.userData.pulse) {
            const scale = 1 + Math.sin(e.age * c.userData.pulse * 3) * 0.05;
            c.scale.setScalar(scale);
          }
          if (c.userData.grow) {
            const ratio = Math.min(1, e.age / c.userData.grow);
            c.scale.setScalar(1 + easeOut(ratio) * ((c.userData.growTo ?? 1.6) - 1));
          }
          if (c.userData.flash) c.scale.setScalar(0.5 + t * (c.userData.flashTo ?? 2));
          if (
            (e.kind === 'hit' || e.kind === 'rip' || e.kind === 'impact') &&
            c.userData.velocity
          ) {
            c.position.addScaledVector(c.userData.velocity, dt);
            c.userData.velocity.y -= dt * 4;
            if (c.userData.spin) c.rotation.x += dt * c.userData.spin;
          }
          if (c.userData.flicker) {
            material.opacity =
              (c.userData.opacity ?? 1) *
              fade *
              (0.75 + Math.sin(e.age * c.userData.flicker * 6.28) * 0.25);
          }
        }
        if (c instanceof T.PointLight)
          c.intensity = c.userData.intensity * (e.kind === 'projectile' ? 1 : fade ** 2);
      }
      if (t >= 1) this.remove(i);
    }
  }
}
