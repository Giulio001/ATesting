import * as T from 'three';
import { OBSTACLES, DUMMY } from '@aetheria/shared';
const material = (color: number, metalness = 0, roughness = 0.85) =>
  new T.MeshStandardMaterial({ color, metalness, roughness, flatShading: true });
const stone = material(0x59656a),
  dark = material(0x253942),
  roof = material(0x243845),
  gold = material(0xb6a16c, 0.55, 0.42),
  wood = material(0x685249);
const glow = new T.MeshStandardMaterial({
  color: 0x99f2dc,
  emissive: 0x54cbb6,
  emissiveIntensity: 2,
});
export class World {
  readonly scene = new T.Scene();
  readonly dummy = new T.Group();
  private portal = new T.Group();
  private particles: T.Points;
  private flameLights: T.PointLight[] = [];
  constructor() {
    this.scene.background = new T.Color(0x273b4d);
    this.scene.fog = new T.FogExp2(0x273b4d, 0.02);
    this.scene.add(new T.HemisphereLight(0xb8cfd1, 0x2b3530, 2.1));
    const sun = new T.DirectionalLight(0xffe9bf, 3.1);
    sun.position.set(-12, 23, 10);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.left = -28;
    sun.shadow.camera.right = 28;
    sun.shadow.camera.top = 28;
    sun.shadow.camera.bottom = -28;
    sun.shadow.normalBias = 0.035;
    sun.shadow.bias = -0.00015;
    this.scene.add(sun);
    const fill = new T.DirectionalLight(0x86b5dc, 1.3);
    fill.position.set(16, 9, -15);
    this.scene.add(fill);
    this.mesh(new T.CylinderGeometry(36, 38, 2, 64), material(0x344641), this.scene, 0, -1.04, 0);
    this.mesh(new T.CylinderGeometry(10, 10, 0.08, 64), stone, this.scene, 0, -0.12, 0);
    // A single instanced draw for the hand-laid paving stones.
    const paving = new T.InstancedMesh(
      new T.BoxGeometry(0.93, 0.06, 0.93),
      material(0x6f7c7e),
      841,
    );
    const transform = new T.Object3D();
    let idx = 0;
    for (let x = -14; x <= 14; x++)
      for (let z = -14; z <= 14; z++) {
        transform.position.set(x, -0.04, z);
        transform.rotation.y = 0;
        transform.updateMatrix();
        paving.setMatrixAt(idx, transform.matrix);
        const noise = this.noise(x + 22, z + 33);
        paving.setColorAt(idx++, new T.Color().setHSL(0.53, 0.08, 0.25 + noise * 0.12));
      }
    paving.receiveShadow = true;
    this.scene.add(paving);
    const ring = this.mesh(new T.RingGeometry(7.7, 7.85, 96), gold, this.scene, 0, 0.012, 0);
    ring.rotation.x = -Math.PI / 2;
    for (let a = 0; a < 8; a++) {
      const rune = this.mesh(
        new T.BoxGeometry(0.3, 0.025, 1.1),
        gold,
        this.scene,
        Math.sin((a * Math.PI) / 4) * 7.1,
        0.009,
        Math.cos((a * Math.PI) / 4) * 7.1,
      );
      rune.rotation.y = (a * Math.PI) / 4;
    }
    for (const o of OBSTACLES) {
      const g = new T.Group();
      g.position.set(o.x, 0, o.z);
      this.scene.add(g);
      if (o.kind === 'house') this.house(g, o.hx, o.hz, o.height);
      if (o.kind === 'wall') this.tower(g);
      if (o.kind === 'tree') this.tree(g, o.height);
      if (o.kind === 'rock') {
        const r = this.mesh(new T.DodecahedronGeometry(o.height), stone, g, 0, o.height * 0.4, 0);
        r.scale.set(0.85, 0.7, 0.75);
        r.rotation.set(0.3, o.x, 0.2);
      }
      if (o.kind === 'shrine') this.shrine(g);
    }
    // Background walls and distant citadel stay outside the playable square.
    for (let x = -25; x <= 25; x += 5) {
      this.mesh(new T.BoxGeometry(4.85, 3.7, 1.4), dark, this.scene, x, 1.85, -25);
      for (let dx = -1.8; dx < 2.1; dx += 1.2)
        this.mesh(new T.BoxGeometry(0.6, 0.6, 1.4), stone, this.scene, x + dx, 4, -25);
    }
    for (let i = 0; i < 5; i++) {
      const g = new T.Group();
      g.position.set((i - 2) * 8, 0, -31 - Math.abs(i - 2) * 2);
      g.scale.setScalar(1.2 + (i === 2 ? 0.55 : 0));
      this.tower(g);
      this.scene.add(g);
    }
    for (const [x, z] of [
      [-6, -7],
      [6, -7],
      [-7, 7],
      [7, 7],
      [-4, -15],
      [4, -15],
    ])
      this.lantern(x, z);
    for (let i = 0; i < 120; i++) {
      const a = i * 2.399,
        r = 15.5 + this.noise(i, 31) * 8.2;
      const x = Math.cos(a) * r,
        z = Math.sin(a) * r;
      if (OBSTACLES.some((o) => Math.abs(x - o.x) < o.hx + 1 || Math.abs(z - o.z) < o.hz + 1))
        continue;
      const plant = this.mesh(
        new T.ConeGeometry(0.17, 0.65, 3),
        material(i % 4 === 0 ? 0x859c92 : 0x526b62),
        this.scene,
        x,
        0.26,
        z,
      );
      plant.rotation.y = a;
    }
    this.makeDummy();
    const geometry = new T.BufferGeometry();
    const positions = new Float32Array(150 * 3);
    for (let i = 0; i < 150; i++) {
      positions[i * 3] = (this.noise(i, 3) - 0.5) * 45;
      positions[i * 3 + 1] = 0.5 + this.noise(i, 7) * 8;
      positions[i * 3 + 2] = (this.noise(i, 11) - 0.5) * 45;
    }
    geometry.setAttribute('position', new T.BufferAttribute(positions, 3));
    this.particles = new T.Points(
      geometry,
      new T.PointsMaterial({
        color: 0xbde4d1,
        size: 0.045,
        transparent: true,
        opacity: 0.65,
        depthWrite: false,
      }),
    );
    this.scene.add(this.particles);
  }
  private noise(x: number, z: number) {
    const n = Math.sin(x * 127.1 + z * 311.7) * 43758.5453;
    return n - Math.floor(n);
  }
  private mesh(
    geometry: T.BufferGeometry,
    mat: T.Material,
    parent: T.Object3D,
    x = 0,
    y = 0,
    z = 0,
  ) {
    const m = new T.Mesh(geometry, mat);
    m.position.set(x, y, z);
    m.castShadow = true;
    m.receiveShadow = true;
    parent.add(m);
    return m;
  }
  private house(g: T.Group, hx: number, hz: number, h: number) {
    this.mesh(new T.BoxGeometry(hx * 2, h * 0.65, hz * 2), stone, g, 0, h * 0.325);
    this.mesh(new T.BoxGeometry(hx * 2 + 0.2, 0.24, hz * 2 + 0.2), dark, g, 0, 0.12);
    this.mesh(new T.BoxGeometry(hx * 2 + 0.35, 0.2, hz * 2 + 0.35), gold, g, 0, h * 0.65);
    const r = this.mesh(
      new T.ConeGeometry(Math.max(hx, hz) * 1.58, h * 0.42, 4),
      roof,
      g,
      0,
      h * 0.85,
    );
    r.rotation.y = Math.PI / 4;
    r.scale.z = hz / hx;
    this.mesh(new T.BoxGeometry(0.35, h * 0.27, 0.4), dark, g, hx * 0.5, h * 0.95, 0);
    for (let x = -hx + 0.2; x < hx; x += 1.6) {
      this.mesh(new T.BoxGeometry(0.7, 1.1, 0.08), dark, g, x, h * 0.37, hz + 0.05);
      this.mesh(
        new T.BoxGeometry(0.46, 0.8, 0.09),
        new T.MeshStandardMaterial({
          color: 0xeec480,
          emissive: 0xdca66a,
          emissiveIntensity: 0.65,
        }),
        g,
        x,
        h * 0.37,
        hz + 0.1,
      );
      this.mesh(new T.BoxGeometry(0.045, 1.05, 0.1), gold, g, x, h * 0.37, hz + 0.17);
    }
    this.mesh(new T.BoxGeometry(1.1, 2.1, 0.08), wood, g, 0, 1.05, hz + 0.13);
    for (const x of [-hx + 0.1, hx - 0.1])
      this.mesh(new T.BoxGeometry(0.2, h * 0.65, 0.25), dark, g, x, h * 0.325, hz + 0.05);
    const banner = this.mesh(
      new T.BoxGeometry(0.75, 1.7, 0.06),
      material(0x315a69),
      g,
      hx - 0.9,
      h * 0.35,
      hz + 0.22,
    );
    this.mesh(new T.BoxGeometry(0.38, 0.06, 0.08), gold, banner, 0, -0.05, 0.05);
  }
  private tower(g: T.Group) {
    this.mesh(new T.CylinderGeometry(1.2, 1.4, 6.5, 8), dark, g, 0, 3.25);
    this.mesh(new T.CylinderGeometry(1.4, 1.4, 0.3, 8), gold, g, 0, 6.5);
    this.mesh(new T.ConeGeometry(1.8, 3.4, 8), roof, g, 0, 8.25);
    this.mesh(new T.SphereGeometry(0.13, 8, 8), gold, g, 0, 10);
    this.mesh(new T.BoxGeometry(0.42, 1.4, 0.08), glow, g, 0, 4.3, 1.22);
  }
  private tree(g: T.Group, h: number) {
    this.mesh(new T.CylinderGeometry(0.28, 0.5, h, 6), wood, g, 0, h * 0.5);
    for (let i = 0; i < 3; i++)
      this.mesh(
        new T.ConeGeometry(2.1 - i * 0.4, h * 0.65, 7),
        material(i === 1 ? 0x456257 : 0x344e48),
        g,
        0,
        h * 0.58 + i * 0.8,
      );
  }
  private shrine(g: T.Group) {
    this.mesh(new T.CylinderGeometry(2.1, 2.3, 0.8, 10), dark, g, 0, 0.4);
    this.mesh(new T.CylinderGeometry(1.9, 2, 0.2, 10), gold, g, 0, 0.91);
    this.portal.position.y = 2.7;
    g.add(this.portal);
    const crystal = this.mesh(
      new T.OctahedronGeometry(1.25),
      new T.MeshStandardMaterial({
        color: 0x9fbaed,
        emissive: 0x655ad5,
        emissiveIntensity: 1.6,
        metalness: 0.5,
        roughness: 0.2,
      }),
      this.portal,
    );
    crystal.scale.y = 1.6;
    for (const rot of [-0.5, 0.5]) {
      const ring = this.mesh(new T.TorusGeometry(1.65, 0.06, 8, 64), gold, this.portal);
      ring.rotation.x = rot;
      ring.rotation.y = Math.PI / 2;
    }
    const light = new T.PointLight(0x9985ff, 8, 9, 2);
    light.position.y = 2.4;
    g.add(light);
  }
  private lantern(x: number, z: number) {
    const g = new T.Group();
    g.position.set(x, 0, z);
    this.scene.add(g);
    this.mesh(new T.CylinderGeometry(0.14, 0.23, 2.8, 6), dark, g, 0, 1.4);
    this.mesh(new T.BoxGeometry(0.58, 0.7, 0.58), dark, g, 0, 3);
    this.mesh(new T.SphereGeometry(0.23, 8, 8), glow, g, 0, 3);
    for (const dx of [-0.25, 0.25])
      for (const dz of [-0.25, 0.25])
        this.mesh(new T.BoxGeometry(0.04, 0.7, 0.04), gold, g, dx, 3, dz);
    this.mesh(new T.ConeGeometry(0.5, 0.35, 4), roof, g, 0, 3.55);
    const light = new T.PointLight(0x8fe8d3, 3, 5, 2);
    light.position.y = 3;
    g.add(light);
    this.flameLights.push(light);
  }
  private makeDummy() {
    this.dummy.position.set(DUMMY.x, 0, DUMMY.z);
    this.scene.add(this.dummy);
    this.mesh(new T.CylinderGeometry(0.8, 0.95, 0.12, 12), dark, this.dummy, 0, 0.06);
    this.mesh(new T.CylinderGeometry(0.13, 0.18, 2, 8), wood, this.dummy, 0, 1);
    this.mesh(new T.BoxGeometry(1.6, 0.15, 0.18), wood, this.dummy, 0, 1.4);
    this.mesh(new T.CylinderGeometry(0.33, 0.26, 0.8, 8), material(0x9c8660), this.dummy, 0, 1.35);
    this.mesh(new T.SphereGeometry(0.25, 8, 8), material(0xa9916e), this.dummy, 0, 2);
    const target = this.mesh(
      new T.TorusGeometry(0.2, 0.035, 6, 24),
      gold,
      this.dummy,
      0,
      1.45,
      0.33,
    );
    target.rotation.x = -0.1;
    const ring = this.mesh(
      new T.RingGeometry(1, 1.04, 64),
      new T.MeshBasicMaterial({
        color: 0xd8bc77,
        transparent: true,
        opacity: 0.65,
        side: T.DoubleSide,
      }),
      this.dummy,
      0,
      0.014,
    );
    ring.rotation.x = -Math.PI / 2;
  }
  update(time: number, hp: number) {
    this.portal.rotation.y = time * 0.28;
    this.portal.position.y = 2.7 + Math.sin(time * 1.4) * 0.12;
    this.particles.rotation.y = time * 0.012;
    this.flameLights.forEach((l, i) => (l.intensity = 3 + Math.sin(time * 4 + i) * 0.3));
    this.dummy.scale.y = T.MathUtils.lerp(this.dummy.scale.y, hp <= 0 ? 0.15 : 1, 0.1);
  }
}
