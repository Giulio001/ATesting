// Copy this module plus model.js and textures.js into a Phaser 3 project.
import {
  validateMap,
  collisionShapes,
  objectDepth,
  renderedTile,
  canStand,
  movePlayer,
} from './model.js';
import { prepareTextures, textureKey } from './textures.js';
export async function renderMap(scene, input) {
  const map = validateMap(input);
  await prepareTextures(scene, map.assets);
  const assets = new Map(map.assets.map((a) => [a.id, a])),
    nodes = [],
    tiles = [];
  for (let y = 0; y < map.height; y++)
    for (let x = 0; x < map.width; x++) {
      const a = assets.get(renderedTile(map, x, y));
      if (!a) continue;
      const image = scene.add
        .image(x * map.tileSize, y * map.tileSize, textureKey(a))
        .setOrigin(0)
        .setDisplaySize(map.tileSize, map.tileSize)
        .setDepth(-10000);
      tiles.push(image);
      nodes.push(image);
    }
  const objects = map.objects.map((o) => {
    const a = assets.get(o.asset);
    const image = scene.add
      .image(o.x, o.y, textureKey(a))
      .setOrigin(a.originX, a.originY)
      .setDisplaySize(a.width, a.height)
      .setDepth(objectDepth(map, o));
    nodes.push(image);
    return { ...o, image };
  });
  const collisions = collisionShapes(map);
  return {
    map,
    tiles,
    objects,
    markers: map.markers,
    collisions,
    canStand: (x, y, radius = 9) => canStand(map, x, y, radius, collisions),
    movePlayer: (player, dx, dy) => movePlayer(map, player, dx, dy, collisions),
    destroy: () => nodes.forEach((n) => n.destroy()),
  };
}
