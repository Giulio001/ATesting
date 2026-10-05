import * as T from 'three';
import { OBSTACLES } from '@aetheria/shared';
import { paintedTexture, paintedBump, tiled, tiledBump } from './Art';

/**
 * Curved, textured medieval architecture. Everything here is smooth-shaded PBR
 * geometry (barrel roofs, round towers, arches, lathes) so Lumengate reads as a
 * real city rather than a kit of stacked boxes.
 */
export interface Materials {
  stone: T.MeshStandardMaterial;
  stoneWarm: T.MeshStandardMaterial;
  plaster: T.MeshStandardMaterial;
  plasterWarm: T.MeshStandardMaterial;
  timber: T.MeshStandardMaterial;
  wood: T.MeshStandardMaterial;
  tile: T.MeshStandardMaterial;
  slate: T.MeshStandardMaterial;
  thatch: T.MeshStandardMaterial;
  cobble: T.MeshStandardMaterial;
  marble: T.MeshStandardMaterial;
  brass: T.MeshStandardMaterial;
  iron: T.MeshStandardMaterial;
  glass: T.MeshStandardMaterial;
  teal: T.MeshStandardMaterial;
  cream: T.MeshStandardMaterial;
  water: T.MeshStandardMaterial;
  leaf: T.MeshStandardMaterial;
  leafDark: T.MeshStandardMaterial;
}

function surface(
  kind: Parameters<typeof paintedTexture>[0],
  repeat: [number, number],
  options: T.MeshStandardMaterialParameters = {},
) {
  const map = tiled(kind, repeat[0], repeat[1]),
    bump = tiledBump(kind, repeat[0], repeat[1]);
  const material = new T.MeshStandardMaterial({ map, bumpMap: bump, ...options });
  // Remembered so the low-quality preset can flatten the relief again.
  material.userData.bumpScale = options.bumpScale ?? 0;
  return material;
}

export function createMaterials(): Materials {
  return {
    stone: surface('stone', [3, 2], { color: 0xb9c0c0, roughness: 0.96, bumpScale: 0.06 }),
    stoneWarm: surface('stone', [3, 2], { color: 0xc9bfa8, roughness: 0.95, bumpScale: 0.05 }),
    plaster: surface('plaster', [2, 2], { color: 0xf0e7d4, roughness: 0.94, bumpScale: 0.03 }),
    plasterWarm: surface('plaster', [2, 2], { color: 0xe6cfa8, roughness: 0.94, bumpScale: 0.03 }),
    timber: surface('wood', [2, 3], { color: 0x6b4a30, roughness: 0.9, bumpScale: 0.05 }),
    wood: surface('wood', [1, 2], { color: 0x8a6440, roughness: 0.88, bumpScale: 0.04 }),
    tile: surface('tiles', [3, 2], { color: 0x9a5b45, roughness: 0.82, bumpScale: 0.09 }),
    slate: surface('tiles', [3, 2], { color: 0x5f7382, roughness: 0.8, bumpScale: 0.09 }),
    thatch: surface('thatch', [2, 2], { color: 0xb5945a, roughness: 1, bumpScale: 0.12 }),
    cobble: surface('cobble', [10, 10], { color: 0xbfc0bb, roughness: 1, bumpScale: 0.14 }),
    marble: surface('marble', [2, 2], {
      color: 0xe8e2d2,
      roughness: 0.55,
      metalness: 0.05,
      bumpScale: 0.03,
    }),
    brass: new T.MeshStandardMaterial({ color: 0xc8a862, metalness: 0.75, roughness: 0.32 }),
    iron: new T.MeshStandardMaterial({ color: 0x3a4149, metalness: 0.7, roughness: 0.44 }),
    glass: new T.MeshStandardMaterial({
      color: 0xffd79a,
      emissive: 0xe6a35a,
      emissiveIntensity: 0.9,
      roughness: 0.25,
      metalness: 0.1,
    }),
    teal: new T.MeshStandardMaterial({ color: 0x2f6470, roughness: 0.8 }),
    cream: new T.MeshStandardMaterial({ color: 0xe6d6ae, roughness: 0.85 }),
    water: new T.MeshStandardMaterial({
      color: 0x4aa3ad,
      map: tiled('water', 3, 3),
      bumpMap: tiledBump('water', 3, 3),
      bumpScale: 0.12,
      roughness: 0.08,
      metalness: 0.35,
      transparent: true,
      opacity: 0.86,
    }),
    leaf: new T.MeshStandardMaterial({ color: 0x4f7a52, roughness: 0.95, flatShading: false }),
    leafDark: new T.MeshStandardMaterial({ color: 0x35583f, roughness: 1 }),
  };
}

function mesh(
  geometry: T.BufferGeometry,
  material: T.Material,
  parent: T.Object3D,
  x = 0,
  y = 0,
  z = 0,
  cast = true,
) {
  const m = new T.Mesh(geometry, material);
  m.position.set(x, y, z);
  m.castShadow = cast;
  m.receiveShadow = true;
  parent.add(m);
  return m;
}

/** A half-cylinder roof over a rectangular footprint: the ridge runs along X. */
function barrelRoof(
  parent: T.Object3D,
  length: number,
  radius: number,
  material: T.Material,
  y: number,
) {
  const roof = mesh(
    new T.CylinderGeometry(radius, radius, length, 30, 1, false, 0, Math.PI),
    material,
    parent,
    0,
    y,
    0,
  );
  roof.rotation.z = Math.PI / 2;
  return roof;
}

function cone(
  parent: T.Object3D,
  radius: number,
  height: number,
  material: T.Material,
  y: number,
  segments = 24,
) {
  const c = mesh(new T.ConeGeometry(radius, height, segments), material, parent, 0, y, 0);
  return c;
}

/** Ring of merlons around a circle (used on towers). */
function battlements(
  parent: T.Object3D,
  radius: number,
  y: number,
  material: T.Material,
  count = 12,
) {
  const merlon = new T.BoxGeometry(radius * 0.42, 0.5, radius * 0.34);
  const instanced = new T.InstancedMesh(merlon, material, count),
    transform = new T.Object3D();
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2;
    transform.position.set(Math.sin(angle) * radius, y, Math.cos(angle) * radius);
    transform.rotation.y = angle;
    transform.updateMatrix();
    instanced.setMatrixAt(i, transform.matrix);
  }
  instanced.castShadow = true;
  instanced.receiveShadow = true;
  parent.add(instanced);
  return instanced;
}

/** Round stone tower with corbels, battlements and a tiled spire. */
function roundTower(
  parent: T.Object3D,
  mats: Materials,
  x: number,
  z: number,
  radius: number,
  height: number,
  spire = true,
) {
  const tower = new T.Group();
  tower.position.set(x, 0, z);
  parent.add(tower);
  mesh(
    new T.CylinderGeometry(radius * 0.94, radius, height, 26, 1),
    mats.stone,
    tower,
    0,
    height / 2,
  );
  for (const [ringY, thickness] of [
    [height * 0.52, 0.1],
    [height * 0.98, 0.14],
  ] as const) {
    const corbel = mesh(
      new T.TorusGeometry(radius * 0.97, thickness, 8, 34),
      mats.stoneWarm,
      tower,
      0,
      ringY,
    );
    corbel.rotation.x = Math.PI / 2;
  }
  battlements(tower, radius * 0.96, height + 0.28, mats.stoneWarm, 14);
  if (spire) {
    cone(tower, radius * 1.06, height * 0.62, mats.slate, height + height * 0.31, 26);
    mesh(new T.SphereGeometry(0.16, 12, 10), mats.brass, tower, 0, height + height * 0.62 + 0.1);
    const vane = mesh(
      new T.BoxGeometry(0.06, 0.7, 0.06),
      mats.brass,
      tower,
      0,
      height + height * 0.62 + 0.5,
    );
    vane.rotation.z = 0.24;
  }
  for (let i = 0; i < 3; i++) {
    const angle = (i / 3) * Math.PI * 2;
    const slit = mesh(
      new T.BoxGeometry(0.16, 1.1, 0.16),
      mats.iron,
      tower,
      Math.sin(angle) * radius * 0.96,
      height * 0.66,
      Math.cos(angle) * radius * 0.96,
    );
    slit.rotation.y = angle;
  }
  return tower;
}

/** Curved tiled roof with overhanging eaves and a stone chimney. */
function cottageRoof(
  parent: T.Object3D,
  mats: Materials,
  hx: number,
  hz: number,
  wallTop: number,
  ridge: number,
) {
  const overhang = 0.35;
  const group = new T.Group();
  group.position.y = wallTop;
  parent.add(group);
  barrelRoof(group, (hx + overhang) * 2, hz + overhang, mats.tile, 0);
  const ridgeCap = mesh(
    new T.CylinderGeometry(0.12, 0.12, (hx + overhang) * 2.02, 10, 1),
    mats.tile,
    group,
    0,
    hz + overhang - 0.02,
    0,
  );
  ridgeCap.rotation.z = Math.PI / 2;
  for (const side of [-1, 1]) {
    const eave = mesh(
      new T.BoxGeometry((hx + overhang) * 2, 0.16, 0.34),
      mats.timber,
      group,
      0,
      0.02,
      side * (hz + overhang),
    );
    eave.castShadow = true;
  }
  const chimney = mesh(
    new T.CylinderGeometry(0.28, 0.34, ridge + 1.1, 8),
    mats.stone,
    parent,
    hx * 0.55,
    wallTop + ridge * 0.4 + 0.3,
    -hz * 0.4,
  );
  mesh(new T.BoxGeometry(0.7, 0.16, 0.7), mats.stoneWarm, chimney, 0, ridge + 0.62, 0);
  return group;
}

/** Timber-framed plaster cottage anchored to a shared collider. */
function cottage(
  parent: T.Object3D,
  mats: Materials,
  x: number,
  z: number,
  hx: number,
  hz: number,
  h: number,
  yaw: number,
) {
  const house = new T.Group();
  house.position.set(x, 0, z);
  house.rotation.y = yaw;
  parent.add(house);
  const wallTop = h * 0.68,
    ridge = h * 0.42;
  mesh(new T.BoxGeometry(hx * 2, wallTop, hz * 2), mats.plaster, house, 0, wallTop / 2);
  // Stone plinth and upper timber band read as real framing, not paint.
  mesh(new T.BoxGeometry(hx * 2 + 0.12, 0.5, hz * 2 + 0.12), mats.stone, house, 0, 0.25);
  mesh(
    new T.BoxGeometry(hx * 2 + 0.06, 0.16, hz * 2 + 0.06),
    mats.timber,
    house,
    0,
    wallTop - 0.08,
  );
  mesh(new T.BoxGeometry(hx * 2 + 0.06, 0.14, hz * 2 + 0.06), mats.timber, house, 0, 0.52);
  for (const side of [-1, 1]) {
    mesh(
      new T.BoxGeometry(0.16, wallTop, 0.14),
      mats.timber,
      house,
      side * (hx - 0.1),
      wallTop / 2,
      hz + 0.03,
    );
    const brace = mesh(
      new T.BoxGeometry(0.14, wallTop * 0.9, 0.13),
      mats.timber,
      house,
      side * hx * 0.55,
      wallTop / 2,
      hz + 0.03,
    );
    brace.rotation.z = side * 0.62;
  }
  mesh(new T.BoxGeometry(hx * 2, 0.15, 0.14), mats.timber, house, 0, wallTop * 0.62, hz + 0.03);
  mesh(new T.BoxGeometry(0.16, wallTop, 0.14), mats.timber, house, 0, wallTop / 2, hz + 0.03);
  cottageRoof(house, mats, hx, hz, wallTop, ridge);
  // Arched plank door.
  const doorWidth = 0.95,
    doorHeight = 2,
    springLine = doorHeight - doorWidth / 2;
  const shape = new T.Shape();
  shape.moveTo(-doorWidth / 2, 0);
  shape.lineTo(-doorWidth / 2, springLine);
  shape.absarc(0, springLine, doorWidth / 2, Math.PI, 0, true);
  shape.lineTo(doorWidth / 2, 0);
  shape.lineTo(-doorWidth / 2, 0);
  const door = mesh(
    new T.ExtrudeGeometry(shape, { depth: 0.14, bevelEnabled: false, curveSegments: 12 }),
    mats.timber,
    house,
    0.5,
    0,
    hz + 0.01,
  );
  door.castShadow = true;
  const frame = mesh(
    new T.TorusGeometry(doorWidth / 2 + 0.1, 0.09, 8, 20, Math.PI),
    mats.stoneWarm,
    house,
    -0.0,
    springLine + 0.0,
    hz + 0.16,
  );
  frame.scale.set(1.18, 1.12, 1);
  // Shuttered windows on both storeys.
  for (const [wx, wy] of [
    [-hx * 0.55, wallTop * 0.62],
    [hx * 0.62, wallTop * 0.62],
  ] as const) {
    mesh(new T.BoxGeometry(0.86, 0.96, 0.08), mats.stoneWarm, house, wx, wy, hz + 0.02);
    mesh(new T.BoxGeometry(0.6, 0.7, 0.06), mats.glass, house, wx, wy, hz + 0.07);
    for (const side of [-1, 1])
      mesh(new T.BoxGeometry(0.24, 0.72, 0.05), mats.teal, house, wx + side * 0.34, wy, hz + 0.1);
  }
  const windowRow = mesh(
    new T.BoxGeometry(hx * 1.5, 0.9, 0.07),
    mats.stoneWarm,
    house,
    0,
    wallTop * 0.62,
    -hz - 0.02,
  );
  windowRow.rotation.y = Math.PI;
  mesh(new T.BoxGeometry(hx * 1.1, 0.66, 0.06), mats.glass, house, 0, wallTop * 0.62, -hz - 0.07);
  return house;
}

function gatehouse(
  parent: T.Object3D,
  mats: Materials,
  x: number,
  z: number,
  yaw: number,
  height: number,
  span: number,
) {
  const gate = new T.Group();
  gate.position.set(x, 0, z);
  gate.rotation.y = yaw;
  parent.add(gate);
  for (const side of [-1, 1]) {
    mesh(
      new T.BoxGeometry(1.5, height, 1.6),
      mats.stone,
      gate,
      side * (span / 2 + 0.75),
      height / 2,
    );
    mesh(
      new T.TorusGeometry(0.5, 0.09, 8, 20, Math.PI),
      mats.stoneWarm,
      gate,
      side * (span / 2 + 0.75),
      height * 0.7,
      0.85,
    );
  }
  const arch = mesh(
    new T.TorusGeometry(span / 2, 0.42, 12, 32, Math.PI),
    mats.stone,
    gate,
    0,
    height * 0.72,
    0,
  );
  arch.scale.set(1, 1.05, 1);
  mesh(new T.BoxGeometry(span + 3, height * 0.28, 1.7), mats.stone, gate, 0, height * 0.86);
  battlements(gate, 0, height + 0.15, mats.stoneWarm, 1);
  const merlons = new T.InstancedMesh(new T.BoxGeometry(0.6, 0.55, 0.55), mats.stoneWarm, 9),
    transform = new T.Object3D();
  for (let i = 0; i < 9; i++) {
    transform.position.set(-span / 2 - 1.5 + i * ((span + 3) / 8), height + 0.2, 0);
    transform.updateMatrix();
    merlons.setMatrixAt(i, transform.matrix);
  }
  merlons.castShadow = true;
  gate.add(merlons);
  for (const side of [-1, 1]) {
    const banner = mesh(
      new T.BoxGeometry(0.5, 1.9, 0.05),
      mats.teal,
      gate,
      side * (span / 2 + 0.75),
      height * 0.55,
      0.9,
    );
    mesh(new T.BoxGeometry(0.26, 0.26, 0.04), mats.brass, banner, 0, 0.2, 0.04).rotation.z =
      Math.PI / 4;
    const pole = mesh(
      new T.CylinderGeometry(0.05, 0.05, 2.8, 8),
      mats.timber,
      gate,
      side * (span / 2 + 0.75),
      height * 0.55,
      0.95,
    );
    pole.rotation.x = 0;
  }
  return gate;
}

/** Square rampart with round towers, battlements and the east/south openings. */
function ramparts(parent: T.Object3D, mats: Materials, half: number, height: number) {
  const thickness = 1.5,
    segments: { x: number; z: number; len: number; axis: 'x' | 'z' }[] = [];
  // North, west and south are solid curtain walls; only the east road is open,
  // exactly where the shared collider box leaves its gap (|z| < 4).
  segments.push({ x: 0, z: -half, len: half * 2, axis: 'x' });
  segments.push({ x: -half, z: 0, len: half * 2, axis: 'z' });
  segments.push({ x: 0, z: half, len: half * 2, axis: 'x' });
  const eastLen = half - 4;
  for (const sign of [-1, 1])
    segments.push({ x: half, z: sign * (4 + eastLen / 2), len: eastLen, axis: 'z' });

  const merlons: T.Object3D[] = [];
  for (const segment of segments) {
    const along = segment.axis === 'x' ? segment.len : thickness,
      depth = segment.axis === 'x' ? thickness : segment.len;
    const wall = mesh(
      new T.BoxGeometry(along, height, depth),
      mats.stone,
      parent,
      segment.x,
      height / 2,
      segment.z,
    );
    mesh(
      new T.BoxGeometry(along + 0.12, 0.18, depth + 0.12),
      mats.stoneWarm,
      wall,
      0,
      height / 2 - 0.02,
    );
    // Curved buttresses every few metres.
    for (let offset = -segment.len / 2 + 1.6; offset < segment.len / 2; offset += 4.2) {
      const px = segment.axis === 'x' ? segment.x + offset : segment.x,
        pz = segment.axis === 'x' ? segment.z : segment.z + offset;
      const buttress = mesh(
        new T.CylinderGeometry(0.55, 0.95, height * 0.9, 14, 1),
        mats.stoneWarm,
        parent,
        px,
        height * 0.45,
        pz,
      );
      buttress.scale.set(1, 1, segment.axis === 'x' ? 1 : 1);
    }
    const count = Math.max(2, Math.floor(segment.len / 1.5));
    for (let i = 0; i <= count; i++) {
      const t = -segment.len / 2 + (segment.len * i) / count;
      const pose = new T.Object3D();
      pose.position.set(
        segment.axis === 'x' ? segment.x + t : segment.x,
        height + 0.32,
        segment.axis === 'x' ? segment.z : segment.z + t,
      );
      pose.rotation.y = segment.axis === 'x' ? 0 : Math.PI / 2;
      merlons.push(pose);
    }
  }
  const instanced = new T.InstancedMesh(
    new T.BoxGeometry(0.7, 0.62, 1.5),
    mats.stoneWarm,
    merlons.length,
  );
  merlons.forEach((pose, i) => {
    pose.updateMatrix();
    instanced.setMatrixAt(i, pose.matrix);
  });
  instanced.castShadow = true;
  instanced.receiveShadow = true;
  parent.add(instanced);

  const towers: [number, number][] = [
    [-half, -half],
    [half, -half],
    [-half, half],
    [half, half],
    [-half * 0.52, -half],
    [half * 0.52, -half],
    [-half, 0],
    [half, 11],
    [half, -11],
    [-12, half],
    [12, half],
  ];
  for (const [tx, tz] of towers) roundTower(parent, mats, tx, tz, 2.1, 7.4);
}

/** Church with nave, apse, rose window and a spire. */
function church(parent: T.Object3D, mats: Materials, x: number, z: number, yaw: number) {
  const group = new T.Group();
  group.position.set(x, 0, z);
  group.rotation.y = yaw;
  parent.add(group);
  const naveH = 6.4;
  mesh(new T.BoxGeometry(4.4, naveH, 9), mats.stoneWarm, group, 0, naveH / 2);
  barrelRoof(group, 9.4, 2.5, mats.slate, naveH);
  // Rounded apse.
  const apse = mesh(
    new T.CylinderGeometry(2.5, 2.5, naveH * 0.92, 20, 1),
    mats.stoneWarm,
    group,
    0,
    naveH * 0.46,
    -4.6,
  );
  cone(group, 2.75, 1.7, mats.slate, naveH * 0.92 + 0.6, 24);
  apse.scale.set(1, 1, 1);
  // Buttresses along the nave.
  for (const side of [-1, 1])
    for (const bz of [-2.6, 0, 2.6]) {
      const buttress = mesh(
        new T.BoxGeometry(0.7, naveH * 0.9, 0.9),
        mats.stone,
        group,
        side * 2.5,
        naveH * 0.45,
        bz,
      );
      buttress.rotation.z = side * 0.06;
    }
  // Bell tower and spire.
  const towerH = 11;
  roundTower(group, mats, 0, 6.4, 2.4, towerH, false);
  cone(group, 2.6, 5.6, mats.slate, towerH + 2.8, 26);
  mesh(new T.SphereGeometry(0.2, 12, 10), mats.brass, group, 0, towerH + 5.7);
  const cross = new T.Group();
  cross.position.y = towerH + 6.3;
  group.add(cross);
  mesh(new T.BoxGeometry(0.09, 1.1, 0.09), mats.brass, cross, 0, 0.5);
  mesh(new T.BoxGeometry(0.62, 0.09, 0.09), mats.brass, cross, 0, 0.7);
  // Rose window.
  const rose = mesh(
    new T.TorusGeometry(1.15, 0.16, 10, 28),
    mats.stoneWarm,
    group,
    0,
    naveH * 0.62,
    4.52,
  );
  mesh(new T.CircleGeometry(1.05, 28), mats.glass, rose, 0, 0, -0.02);
  const spokes = new T.InstancedMesh(new T.BoxGeometry(0.08, 2.0, 0.06), mats.stoneWarm, 6),
    transform = new T.Object3D();
  for (let i = 0; i < 6; i++) {
    transform.rotation.z = (i / 6) * Math.PI;
    transform.updateMatrix();
    spokes.setMatrixAt(i, transform.matrix);
  }
  rose.add(spokes);
  // Arched entrance.
  const shape = new T.Shape();
  shape.moveTo(-1.1, 0);
  shape.lineTo(-1.1, 2.3);
  shape.absarc(0, 2.3, 1.1, Math.PI, 0, true);
  shape.lineTo(1.1, 0);
  shape.lineTo(-1.1, 0);
  mesh(
    new T.ExtrudeGeometry(shape, { depth: 0.2, bevelEnabled: false, curveSegments: 14 }),
    mats.timber,
    group,
    0,
    0,
    4.55,
  );
  return group;
}

/** Windmill with a curved stone body and a cross of sails. */
function windmill(parent: T.Object3D, mats: Materials, x: number, z: number, yaw: number) {
  const group = new T.Group();
  group.position.set(x, 0, z);
  group.rotation.y = yaw;
  parent.add(group);
  mesh(new T.CylinderGeometry(1.9, 2.6, 7, 22, 1), mats.stoneWarm, group, 0, 3.5);
  cone(group, 2.9, 2.4, mats.thatch, group.children[0].position.y + 3.5 + 1.2, 24);
  const hub = new T.Group();
  hub.position.set(0, 5.2, 2.5);
  group.add(hub);
  mesh(new T.CylinderGeometry(0.22, 0.22, 0.6, 12), mats.timber, hub, 0, 0, 0).rotation.x =
    Math.PI / 2;
  for (let i = 0; i < 4; i++) {
    const arm = new T.Group();
    arm.rotation.z = (i / 4) * Math.PI * 2 + 0.35;
    hub.add(arm);
    mesh(new T.BoxGeometry(0.16, 4.2, 0.12), mats.timber, arm, 0, 2.1, 0);
    mesh(new T.BoxGeometry(1.5, 2.1, 0.06), mats.cream, arm, 0.75, 2.2, 0.02);
  }
  mesh(new T.BoxGeometry(0.9, 1.4, 0.12), mats.timber, group, 0, 0.7, 2.62);
  return group;
}

/** Curved arch bridge with balustrades and lanterns. */
export function buildBridge(parent: T.Object3D, mats: Materials, x: number, z: number) {
  const bridge = new T.Group();
  bridge.position.set(x, 0, z);
  parent.add(bridge);
  const span = 12,
    width = 6;
  const deck = mesh(new T.BoxGeometry(span, 0.28, width), mats.cobble, bridge, 0, 0.02);
  deck.receiveShadow = true;
  for (const side of [-1, 1]) {
    const z0 = (side * width) / 2;
    // Two stone arches under the deck.
    for (const offset of [-2.8, 2.8]) {
      const arch = mesh(
        new T.TorusGeometry(1.9, 0.48, 10, 26, Math.PI),
        mats.stone,
        bridge,
        offset,
        -0.2,
        z0,
      );
      arch.rotation.y = Math.PI / 2;
      arch.scale.set(1, 1.1, 1);
    }
    mesh(new T.BoxGeometry(span, 0.5, 0.4), mats.stoneWarm, bridge, 0, 0.62, z0);
    mesh(new T.BoxGeometry(span, 0.16, 0.5), mats.stoneWarm, bridge, 0, 0.88, z0);
    const posts = new T.InstancedMesh(new T.BoxGeometry(0.28, 0.9, 0.28), mats.stoneWarm, 7),
      transform = new T.Object3D();
    for (let i = 0; i < 7; i++) {
      transform.position.set(-span / 2 + 1 + i * ((span - 2) / 6), 1.15, z0);
      transform.updateMatrix();
      posts.setMatrixAt(i, transform.matrix);
    }
    posts.castShadow = true;
    bridge.add(posts);
  }
  return bridge;
}

/** Statue on a stepped plinth, used along the plaza axis. */
export function statue(
  parent: T.Object3D,
  mats: Materials,
  x: number,
  z: number,
  yaw: number,
  scale = 1,
) {
  const group = new T.Group();
  group.position.set(x, 0, z);
  group.rotation.y = yaw;
  group.scale.setScalar(scale);
  parent.add(group);
  mesh(new T.CylinderGeometry(1.1, 1.35, 0.3, 8), mats.stone, group, 0, 0.15);
  mesh(new T.CylinderGeometry(0.85, 1.1, 0.3, 8), mats.stoneWarm, group, 0, 0.45);
  mesh(new T.CylinderGeometry(0.62, 0.78, 1.5, 10), mats.stone, group, 0, 1.35);
  mesh(new T.CylinderGeometry(0.5, 0.16, 2.4, 16), mats.stoneWarm, group, 0, 3.2);
  mesh(new T.SphereGeometry(0.26, 14, 12), mats.stoneWarm, group, 0, 4.5);
  const cloak = mesh(new T.ConeGeometry(0.6, 1.5, 14, 1, true), mats.stone, group, 0, 3.6);
  cloak.rotation.y = 0.5;
  const arm = mesh(new T.CylinderGeometry(0.11, 0.11, 1.5, 10), mats.stoneWarm, group, 0.5, 3.9);
  arm.rotation.z = -0.9;
  mesh(new T.OctahedronGeometry(0.16), mats.brass, group, 0.95, 4.4);
  return group;
}

/** Market stall with a sagging striped awning. */
export function marketStall(
  parent: T.Object3D,
  mats: Materials,
  x: number,
  z: number,
  yaw: number,
) {
  const stall = new T.Group();
  stall.position.set(x, 0, z);
  stall.rotation.y = yaw;
  parent.add(stall);
  for (const px of [-1.3, 1.3])
    mesh(new T.CylinderGeometry(0.06, 0.07, 2.3, 10), mats.timber, stall, px, 1.15, -0.5);
  mesh(new T.BoxGeometry(2.9, 0.16, 1.5), mats.wood, stall, 0, 0.92);
  mesh(new T.BoxGeometry(2.6, 0.6, 1.2), mats.timber, stall, 0, 0.5);
  // Sagging awning as a tube along a catenary-ish curve.
  for (let i = 0; i < 5; i++) {
    const px = -1.2 + i * 0.6,
      sag = 0.32 * (1 - Math.pow(px / 1.5, 2));
    const strip = mesh(
      new T.BoxGeometry(0.6, 0.04, 1.7),
      i % 2 ? mats.cream : mats.teal,
      stall,
      px,
      2.35 - sag,
      -0.1,
    );
    strip.rotation.x = 0;
  }
  const goods = new T.InstancedMesh(new T.SphereGeometry(0.12, 10, 8), mats.brass, 9),
    transform = new T.Object3D();
  for (let i = 0; i < 9; i++) {
    transform.position.set(
      -1 + (i % 3) * 1 + Math.sin(i) * 0.05,
      1.05,
      -0.35 + Math.floor(i / 3) * 0.4,
    );
    transform.updateMatrix();
    goods.setMatrixAt(i, transform.matrix);
  }
  goods.castShadow = true;
  stall.add(goods);
  return stall;
}

/** Cobbled plaza with concentric inlays and a route to the east bridge. */
function plaza(parent: T.Object3D, mats: Materials) {
  const disc = mesh(new T.CircleGeometry(15.5, 96), mats.cobble, parent, 0, 0.02, 0, false);
  disc.rotation.x = -Math.PI / 2;
  disc.receiveShadow = true;
  const rings = new T.InstancedMesh(new T.TorusGeometry(1, 0.06, 6, 40), mats.marble, 4),
    transform = new T.Object3D();
  for (let i = 0; i < 4; i++) {
    transform.scale.setScalar(3.4 + i * 3.4);
    transform.rotation.x = Math.PI / 2;
    transform.position.y = 0.055;
    transform.updateMatrix();
    rings.setMatrixAt(i, transform.matrix);
  }
  rings.receiveShadow = true;
  parent.add(rings);
  const spokes = new T.InstancedMesh(new T.BoxGeometry(0.4, 0.03, 4.2), mats.marble, 8),
    pose = new T.Object3D();
  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2;
    pose.position.set(Math.sin(angle) * 11.4, 0.05, Math.cos(angle) * 11.4);
    pose.rotation.y = angle;
    pose.updateMatrix();
    spokes.setMatrixAt(i, pose.matrix);
  }
  parent.add(spokes);
}

/** Smooth-shaded oak with a layered canopy. */
export function oak(
  parent: T.Object3D,
  mats: Materials,
  x: number,
  z: number,
  scale: number,
  yaw = 0,
) {
  const tree = new T.Group();
  tree.position.set(x, 0, z);
  tree.rotation.y = yaw;
  tree.scale.setScalar(scale);
  parent.add(tree);
  const trunk = mesh(new T.CylinderGeometry(0.22, 0.42, 2.6, 12, 1), mats.timber, tree, 0, 1.3);
  trunk.rotation.z = 0.03;
  const canopy = [
    [0, 3.3, 0, 1.35],
    [0.8, 3.0, 0.3, 0.95],
    [-0.7, 3.1, -0.35, 0.9],
    [0.15, 4.1, -0.6, 0.85],
  ] as const;
  canopy.forEach(([cx, cy, cz, radius], index) =>
    mesh(
      new T.IcosahedronGeometry(radius, 1),
      index % 2 ? mats.leafDark : mats.leaf,
      tree,
      cx,
      cy,
      cz,
    ),
  );
  return tree;
}

/** Instanced woodland ring outside the walls. */
function woodland(parent: T.Object3D, mats: Materials, low: boolean) {
  const count = low ? 70 : 150;
  const trunks = new T.InstancedMesh(
    new T.CylinderGeometry(0.2, 0.36, 2.4, 8, 1),
    mats.timber,
    count,
  );
  const crowns = new T.InstancedMesh(new T.IcosahedronGeometry(1, 1), mats.leaf, count);
  const transform = new T.Object3D();
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2 + (i % 7) * 0.08;
    const radius = 29 + (((i * 37) % 100) / 100) * 15;
    const x = Math.sin(angle) * radius,
      z = Math.cos(angle) * radius;
    const scale = 0.9 + (((i * 53) % 100) / 100) * 0.7;
    // Keep the east road and the abbey/mill clear of trunks.
    if (Math.abs(z) < 7 && x > 24) continue;
    if (Math.hypot(x + 33, z + 6) < 10) continue;
    if (Math.hypot(x + 34, z - 13) < 9) continue;
    transform.position.set(x, 1.2 * scale, z);
    transform.scale.setScalar(scale);
    transform.rotation.y = i;
    transform.updateMatrix();
    trunks.setMatrixAt(i, transform.matrix);
    transform.position.y = 3.1 * scale;
    transform.scale.set(scale * 1.7, scale * 1.5, scale * 1.7);
    transform.updateMatrix();
    crowns.setMatrixAt(i, transform.matrix);
  }
  for (const mesh of [trunks, crowns]) {
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
  }
}

/** Assembles the whole town. */
export function buildTown(parent: T.Object3D, occluders: T.Object3D[], low: boolean) {
  const mats = createMaterials();
  plaza(parent, mats);
  ramparts(parent, mats, 24.6, 3.4);
  // One real gate, on the east road to the frontier. Its piers sit inside the
  // blocked stretch of the collider box, so nothing is walk-through.
  gatehouse(parent, mats, 24.6, 0, Math.PI / 2, 7.2, 9.8);

  const houses = OBSTACLES.filter((o) => o.kind === 'house');
  houses.forEach((house) =>
    occluders.push(
      cottage(
        parent,
        mats,
        house.x,
        house.z,
        house.hx,
        house.hz,
        house.height,
        Math.atan2(-house.x, -house.z),
      ),
    ),
  );

  church(parent, mats, -33, -6, 0.5);
  windmill(parent, mats, -34, 13, -0.4);
  statue(parent, mats, -4.4, 5.4, 0.5, 1);
  statue(parent, mats, 4.4, 5.4, -0.5, 1);
  marketStall(parent, mats, -6, 2, 0.35);
  buildBridge(parent, mats, 27, 0);

  OBSTACLES.filter((o) => o.kind === 'tree').forEach((tree, index) =>
    oak(parent, mats, tree.x, tree.z, 1.15 + (index % 3) * 0.14, index * 1.3),
  );
  OBSTACLES.filter((o) => o.kind === 'rock').forEach((rock, index) => {
    const boulder = mesh(
      new T.IcosahedronGeometry(rock.height, 1),
      mats.stone,
      parent,
      rock.x,
      rock.height * 0.45,
      rock.z,
    );
    boulder.rotation.set(index * 0.6, index, 0.2);
    boulder.scale.set(1, 0.72, 0.9);
  });
  woodland(parent, mats, low);
  return mats;
}
