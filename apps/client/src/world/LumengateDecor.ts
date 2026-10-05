import * as T from 'three';

// Repeated ornaments share geometry and material in a single draw per batch.
function batch(
  parent: T.Object3D,
  geometry: T.BufferGeometry,
  material: T.Material,
  poses: T.Object3D[],
) {
  if (!poses.length) return;
  const mesh = new T.InstancedMesh(geometry, material, poses.length);
  poses.forEach((pose, i) => {
    pose.updateMatrix();
    mesh.setMatrixAt(i, pose.matrix);
  });
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

function pose(x: number, y: number, z: number, yaw = 0) {
  const transform = new T.Object3D();
  transform.position.set(x, y, z);
  transform.rotation.y = yaw;
  return transform;
}

export function decoratePlaza(scene: T.Scene) {
  const ivory = new T.MeshStandardMaterial({ color: 0xc2b591, roughness: 0.9 });
  const teal = new T.MeshStandardMaterial({ color: 0x345e64, roughness: 0.85 });
  const brass = new T.MeshStandardMaterial({ color: 0xc5aa72, metalness: 0.45, roughness: 0.5 });
  const creamTiles: T.Object3D[] = [],
    tealTiles: T.Object3D[] = [],
    inlays: T.Object3D[] = [];
  for (let i = 0; i < 64; i++) {
    const angle = (i / 64) * Math.PI * 2;
    const tile = pose(Math.sin(angle) * 3.25, 0.032, Math.cos(angle) * 3.25, angle);
    (i % 2 ? creamTiles : tealTiles).push(tile);
  }
  batch(scene, new T.BoxGeometry(0.29, 0.018, 0.55), ivory, creamTiles);
  batch(scene, new T.BoxGeometry(0.29, 0.018, 0.55), teal, tealTiles);
  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2;
    inlays.push(pose(Math.sin(angle) * 4.4, 0.034, Math.cos(angle) * 4.4, angle + Math.PI / 4));
  }
  batch(scene, new T.BoxGeometry(0.3, 0.018, 0.3), brass, inlays);
  for (const radius of [2.86, 3.64, 5.15]) {
    const ring = new T.Mesh(new T.RingGeometry(radius, radius + 0.035, 64), brass);
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.045;
    ring.receiveShadow = true;
    scene.add(ring);
  }
  // Flat inlays mark the route to the eastern bridge without adding obstacles.
  const route = Array.from({ length: 10 }, (_, i) => pose(9 + i * 1.35, 0.032, 0, Math.PI / 4));
  batch(scene, new T.BoxGeometry(0.22, 0.018, 0.22), brass, route);
}

export function decorateHouse(root: T.Group, hx: number, hz: number, height: number) {
  const boxes: T.Object3D[] = [],
    foliage: T.Object3D[] = [],
    flowers: T.Object3D[] = [];
  const y = height * 0.37 - 0.7;
  for (let x = -hx + 0.2; x < hx; x += 1.6) {
    // Raised window boxes leave the ground-level routes clear.
    boxes.push(pose(x, y, hz + 0.2));
    for (let i = 0; i < 3; i++) {
      foliage.push(pose(x + (i - 1) * 0.22, y + 0.15, hz + 0.23));
      const flower = pose(x + (i - 1) * 0.22, y + 0.28, hz + 0.28, i);
      flower.scale.set(1, 0.55, 1);
      flowers.push(flower);
    }
  }
  batch(
    root,
    new T.BoxGeometry(0.82, 0.18, 0.32),
    new T.MeshStandardMaterial({ color: 0x7a574b, roughness: 1 }),
    boxes,
  );
  batch(
    root,
    new T.IcosahedronGeometry(0.17, 0),
    new T.MeshStandardMaterial({ color: 0x527764, roughness: 1, flatShading: true }),
    foliage,
  );
  batch(
    root,
    new T.OctahedronGeometry(0.09),
    new T.MeshStandardMaterial({
      color: root.position.x < 0 ? 0xd9b482 : 0xb9a4cc,
      roughness: 0.9,
    }),
    flowers,
  );

  // A gold diamond and border give the existing city banners a readable crest.
  const trim = new T.MeshStandardMaterial({ color: 0xc5aa72, metalness: 0.35, roughness: 0.55 });
  const diamond = new T.Mesh(new T.BoxGeometry(0.26, 0.26, 0.035), trim);
  diamond.position.set(hx - 0.9, height * 0.35 + 0.32, hz + 0.27);
  diamond.rotation.z = Math.PI / 4;
  root.add(diamond);
  const edges = [-0.32, 0.32].map((x) => pose(hx - 0.9 + x, height * 0.35, hz + 0.27));
  batch(root, new T.BoxGeometry(0.025, 1.6, 0.025), trim, edges);
}
