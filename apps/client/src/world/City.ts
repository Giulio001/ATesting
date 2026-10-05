import * as T from 'three';
import { OBSTACLES } from '@aetheria/shared';
import type { Placement, Props } from './Props';

/** Every scenery file shipped in `public/assets/world/medieval`. */
export const PROP_KEYS = [
  'building_home_A_blue',
  'building_home_B_blue',
  'building_tavern_blue',
  'building_market_blue',
  'building_blacksmith_blue',
  'building_church_blue',
  'building_windmill_blue',
  'building_tower_A_blue',
  'building_tower_B_blue',
  'building_barracks_blue',
  'wall_straight',
  'wall_corner_A_outside',
  'fence_wood_straight',
  'fence_stone_straight',
  'building_bridge_A',
  'tent',
  'tree_single_A',
  'tree_single_B',
  'trees_A_medium',
  'trees_A_large',
  'rock_single_C',
  'rock_single_E',
  'hills_B_trees',
  'hills_C_trees',
  'mountain_A_grass_trees',
  'barrel',
  'crate_A_big',
  'crate_A_small',
  'crate_long_A',
  'sack',
  'resource_lumber',
  'resource_stone',
  'wheelbarrow',
  'weaponrack',
  'target',
  'ladder',
  'flag_blue',
  'flag_red',
] as const;

export interface CityOptions {
  low: boolean;
}

const HOUSE_MODELS = [
  'building_home_B_blue',
  'building_tavern_blue',
  'building_home_A_blue',
  'building_home_B_blue',
];

/** Deterministic scatter so the map looks the same on every device. */
function scatter(seed: number) {
  const value = Math.sin(seed * 127.1) * 43758.5453;
  return value - Math.floor(value);
}

const WALL_CENTER = 24.6;
const WALL_SCALE = 2;

function buildHouses(scene: T.Scene, props: Props, occluders: T.Object3D[]) {
  const houses = OBSTACLES.filter((o) => o.kind === 'house');
  houses.forEach((house, index) => {
    const group = props.place(HOUSE_MODELS[index % HOUSE_MODELS.length], {
      x: house.x,
      z: house.z,
      // Kept inside the collider even after the diagonal of the rotation.
      yaw: Math.atan2(-house.x, -house.z),
      fit: { x: house.hx * 1.35, z: house.hz * 1.35 },
    });
    if (!group) return;
    scene.add(group);
    occluders.push(group);
  });
}

function buildWalls(scene: T.Scene, props: Props) {
  const straight: Placement[] = [];
  const half = 22;
  const step = 4;
  for (let v = -half; v <= half; v += step) {
    straight.push({ x: v, z: -WALL_CENTER, yaw: 0, scale: WALL_SCALE });
    straight.push({ x: v, z: WALL_CENTER, yaw: 0, scale: WALL_SCALE });
    straight.push({ x: -WALL_CENTER, z: v, yaw: Math.PI / 2, scale: WALL_SCALE });
  }
  // The east side stops short of the road so the gate keeps working.
  for (let v = 6; v <= half; v += step) {
    straight.push({ x: WALL_CENTER, z: v, yaw: Math.PI / 2, scale: WALL_SCALE });
    straight.push({ x: WALL_CENTER, z: -v, yaw: Math.PI / 2, scale: WALL_SCALE });
  }
  const walls = props.instance('wall_straight', straight);
  if (walls) scene.add(walls);

  const corners = [
    { x: -WALL_CENTER, z: -WALL_CENTER, yaw: 0 },
    { x: WALL_CENTER, z: -WALL_CENTER, yaw: Math.PI / 2 },
    { x: -WALL_CENTER, z: WALL_CENTER, yaw: -Math.PI / 2 },
    { x: WALL_CENTER, z: WALL_CENTER, yaw: Math.PI },
  ];
  corners.forEach((corner) => {
    const group = props.place('wall_corner_A_outside', { ...corner, scale: 2.3 });
    if (group) scene.add(group);
  });

  // Towers punctuate the skyline; all of them sit outside the walkable square.
  const towers: Placement[] = [
    { x: -12, z: -WALL_CENTER, yaw: 0 },
    { x: 12, z: -WALL_CENTER, yaw: 0 },
    { x: -12, z: WALL_CENTER, yaw: Math.PI },
    { x: 12, z: WALL_CENTER, yaw: Math.PI },
    { x: -WALL_CENTER, z: -12, yaw: Math.PI / 2 },
    { x: -WALL_CENTER, z: 12, yaw: Math.PI / 2 },
    { x: WALL_CENTER, z: -5.6, yaw: -Math.PI / 2 },
    { x: WALL_CENTER, z: 5.6, yaw: Math.PI / 2 },
  ];
  towers.forEach((pose) => {
    const group = props.place('building_tower_A_blue', { ...pose, height: 5.2 });
    if (group) scene.add(group);
  });

  // Gate banners make the eastern opening readable from the plaza.
  for (const z of [-5.6, 5.6]) {
    const flag = props.place('flag_blue', {
      x: WALL_CENTER - 0.4,
      z,
      yaw: Math.PI / 2,
      scale: 5.4,
      lift: 3.4,
    });
    if (flag) scene.add(flag);
  }
}

function buildLandmarks(scene: T.Scene, props: Props) {
  const landmarks: (Placement & { key: string })[] = [
    { key: 'building_church_blue', x: -33, z: -6, yaw: 0.5, height: 9.5 },
    { key: 'building_windmill_blue', x: -34, z: 13, yaw: -0.4, height: 8 },
    { key: 'building_barracks_blue', x: -3, z: -35, yaw: Math.PI, height: 8.4 },
    { key: 'building_blacksmith_blue', x: 16, z: 33, yaw: Math.PI, height: 5.4 },
    { key: 'building_market_blue', x: 30, z: 20, yaw: -0.6, height: 5 },
    { key: 'building_tower_B_blue', x: 27.5, z: -21, yaw: 0.3, height: 7.4 },
  ];
  for (const { key, ...pose } of landmarks) {
    const group = props.place(key, pose);
    if (group) scene.add(group);
  }
}

function buildNature(scene: T.Scene, props: Props, low: boolean) {
  const trees: Placement[] = [];
  const pines: Placement[] = [];
  const rocks: Placement[] = [];
  const hills: Placement[] = [];
  const mountains: Placement[] = [];

  // Ring of woodland hugging the outside of the walls.
  const ringCount = low ? 60 : 120;
  for (let i = 0; i < ringCount; i++) {
    const angle = (i / ringCount) * Math.PI * 2;
    const radius = 30 + scatter(i * 3 + 1) * 16;
    const x = Math.sin(angle) * radius;
    const z = Math.cos(angle) * radius;
    if (Math.abs(z) < 5 && x > 24) continue;
    const pose: Placement = {
      x,
      z,
      yaw: scatter(i * 5) * Math.PI * 2,
      scale: 1.6 + scatter(i * 7) * 1.1,
    };
    (i % 2 ? trees : pines).push(pose);
  }
  // Frontier woodland framing the road and the arena.
  const frontierCount = low ? 40 : 90;
  for (let i = 0; i < frontierCount; i++) {
    const x = 30 + scatter(i * 11 + 3) * 48;
    const z = (scatter(i * 13 + 5) - 0.5) * 46;
    if (Math.abs(z) < 7) continue;
    const pose: Placement = {
      x,
      z,
      yaw: scatter(i * 17) * Math.PI * 2,
      scale: 1.5 + scatter(i * 19),
    };
    (i % 3 === 0 ? pines : trees).push(pose);
  }
  for (let i = 0; i < (low ? 14 : 32); i++) {
    const x = 32 + scatter(i * 23 + 7) * 46;
    const z = (scatter(i * 29 + 11) - 0.5) * 44;
    if (Math.abs(z) < 8) continue;
    if (i % 4 === 0) hills.push({ x, z, yaw: scatter(i) * 6, scale: 1.5 });
    else if (i % 4 === 1) mountains.push({ x, z, yaw: scatter(i * 2) * 6, scale: 1.4 });
    else rocks.push({ x, z, yaw: scatter(i * 3) * 6, scale: 2.4 + scatter(i * 4) });
  }
  // Solid trees at the obstacle positions keep the collider and the model in sync.
  OBSTACLES.filter((o) => o.kind === 'tree').forEach((tree, index) => {
    (index % 2 ? pines : trees).push({
      x: tree.x,
      z: tree.z,
      yaw: scatter(index * 31) * 6,
      scale: 2.6,
    });
  });
  OBSTACLES.filter((o) => o.kind === 'rock').forEach((rock, index) => {
    rocks.push({ x: rock.x, z: rock.z, yaw: scatter(index * 37) * 6, scale: rock.height * 4 });
  });

  for (const [key, list] of [
    ['trees_A_medium', trees],
    ['tree_single_A', pines],
    ['rock_single_E', rocks],
    ['hills_B_trees', hills],
    ['mountain_A_grass_trees', mountains],
  ] as const) {
    const batch = props.instance(key, list);
    if (batch) scene.add(batch);
  }
}

function buildStreetProps(scene: T.Scene, props: Props) {
  const small: [string, Placement][] = [
    ['barrel', { x: -7.6, z: -3.4, scale: 2.2, yaw: 0.4 }],
    ['barrel', { x: -8.6, z: -2.4, scale: 2.2, yaw: 1.1 }],
    ['crate_A_big', { x: -9.2, z: -3.1, scale: 2.4, yaw: 0.7 }],
    ['crate_A_small', { x: -6.8, z: -3.9, scale: 2.4, yaw: 0.2 }],
    ['resource_stone', { x: -9.6, z: -1.6, scale: 3, yaw: 0.9 }],
    ['resource_lumber', { x: -8.9, z: -1.2, scale: 2.6, yaw: -0.5 }],
    ['wheelbarrow', { x: -9.9, z: 0.2, scale: 2.6, yaw: 2.1 }],
    ['weaponrack', { x: 4.4, z: -1.4, scale: 3, yaw: -0.4 }],
    ['target', { x: 5.6, z: -2.6, scale: 3.4, yaw: -0.9 }],
    ['crate_long_A', { x: 2.2, z: -4.6, scale: 2.6, yaw: 0.3 }],
    ['sack', { x: 8.6, z: 4.4, scale: 3.4, yaw: 0.8 }],
    ['barrel', { x: 9.4, z: 5.2, scale: 2.2, yaw: 0.1 }],
  ];
  for (const [key, pose] of small) {
    const group = props.place(key, pose);
    if (group) scene.add(group);
  }
}

/** Decorates Lumengate and the frontier with the medieval GLB kit. */
export function buildCity(scene: T.Scene, props: Props, options: CityOptions) {
  const occluders: T.Object3D[] = [];
  buildHouses(scene, props, occluders);
  buildWalls(scene, props);
  buildLandmarks(scene, props);
  buildNature(scene, props, options.low);
  buildStreetProps(scene, props);
  return occluders;
}
