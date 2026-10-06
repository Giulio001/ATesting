// Portable versioned map format. No Phaser dependency: usable by an authoritative server.
export const VERSION = 1;
export const MARKERS = ['spawn', 'npc', 'enemy', 'boss', 'portal', 'zone'];
export const BUILTINS = ['grass', 'stone', 'path', 'water', 'tree', 'pillar', 'crate'];
export const clone = (value) => JSON.parse(JSON.stringify(value));
export function builtinAssets() {
  return [
    ...[['grass', 'Erba', '#3d6545', false], ['stone', 'Pietra', '#737b75', false], ['path', 'Sentiero', '#99815c', false], ['water', 'Acqua', '#365f76', true]].map(([id, name, color, solid]) => ({ id, name, kind: 'terrain', builtin: id, color, solid, width: 32, height: 32, originX: 0, originY: 0, collider: null })),
    { id: 'tree', name: 'Albero · esempio', kind: 'object', builtin: 'tree', width: 80, height: 112, originX: .5, originY: 1, collider: { x: -9, y: -12, width: 18, height: 12 } },
    { id: 'pillar', name: 'Pilastro · esempio', kind: 'object', builtin: 'pillar', width: 32, height: 64, originX: .5, originY: 1, collider: { x: -12, y: -14, width: 24, height: 14 } },
    { id: 'crate', name: 'Cassa · esempio', kind: 'object', builtin: 'crate', width: 32, height: 32, originX: .5, originY: 1, collider: { x: -16, y: -24, width: 32, height: 24 } },
  ];
}
export function newMap(width = 40, height = 28, tileSize = 32) {
  return { format: 'aetheria-map', version: VERSION, name: 'Nuova regione', width, height, tileSize, assets: builtinAssets(), terrain: Array(width * height).fill('grass'), collisions: Array(width * height).fill(false), objects: [], markers: [] };
}
function requireValue(ok, message) { if (!ok) throw new Error(message); }
const finiteRange = (n, min, max) => Number.isFinite(n) && n >= min && n <= max;
const dimension = (n) => Number.isInteger(n) && n >= 8 && n <= 256;
export function validateMap(input) {
  requireValue(input && input.format === 'aetheria-map' && input.version === VERSION, 'Formato o versione mappa non supportati.');
  requireValue(dimension(input.width) && dimension(input.height) && [16, 32, 48, 64].includes(input.tileSize), 'Dimensioni non valide (8–256 celle, tile 16/32/48/64).');
  requireValue(typeof input.name === 'string' && input.name.length <= 100, 'Nome mappa non valido.');
  requireValue(Array.isArray(input.assets) && input.assets.length > 0 && input.assets.length <= 2048, 'Catalogo asset non valido.');
  const ids = new Set();
  for (const a of input.assets) {
    requireValue(a && typeof a.id === 'string' && /^[\w-]{1,100}$/.test(a.id) && !ids.has(a.id), 'ID asset duplicato o non valido.'); ids.add(a.id);
    requireValue(typeof a.name === 'string' && a.name.length <= 100 && ['terrain', 'object'].includes(a.kind), 'Tipo/nome asset non valido.');
    requireValue(finiteRange(a.width, 1, 2048) && finiteRange(a.height, 1, 2048) && finiteRange(a.originX, 0, 1) && finiteRange(a.originY, 0, 1), 'Dimensioni/origine asset non valide.');
    requireValue(a.builtin ? BUILTINS.includes(a.builtin) : typeof a.image === 'string' && a.image.length <= 20_000_000 && /^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(a.image), 'Asset deve contenere un PNG incorporato o un esempio noto.');
    if (a.collider) requireValue(finiteRange(a.collider.x, -2048, 2048) && finiteRange(a.collider.y, -2048, 2048) && finiteRange(a.collider.width, 1, 2048) && finiteRange(a.collider.height, 1, 2048), 'Collisione asset non valida.');
  }
  const terrainIds = new Set(input.assets.filter(a => a.kind === 'terrain').map(a => a.id));
  const objectIds = new Set(input.assets.filter(a => a.kind === 'object').map(a => a.id));
  const size = input.width * input.height;
  requireValue(Array.isArray(input.terrain) && input.terrain.length === size && input.terrain.every(id => id === null || terrainIds.has(id)), 'Griglia terreno non valida o asset mancante.');
  requireValue(Array.isArray(input.collisions) && input.collisions.length === size && input.collisions.every(v => typeof v === 'boolean'), 'Griglia collisioni non valida.');
  requireValue(Array.isArray(input.objects) && input.objects.length <= 10000 && Array.isArray(input.markers) && input.markers.length <= 2000, 'Troppi elementi o elenco non valido.');
  const instanceIds = new Set();
  for (const item of [...input.objects, ...input.markers]) {
    requireValue(item && typeof item.id === 'string' && /^[\w-]{1,100}$/.test(item.id) && !instanceIds.has(item.id), 'ID elemento duplicato o non valido.'); instanceIds.add(item.id);
    requireValue(finiteRange(item.x, 0, input.width * input.tileSize) && finiteRange(item.y, 0, input.height * input.tileSize), 'Elemento fuori mappa.');
  }
  requireValue(input.objects.every(o => objectIds.has(o.asset)), 'Oggetto con asset mancante.');
  requireValue(input.markers.every(m => MARKERS.includes(m.type) && typeof m.label === 'string' && m.label.length <= 100), 'Punto gameplay non valido.');
  // Whitelist fields so imported files cannot introduce executable/prototype metadata.
  return { format: input.format, version: VERSION, name: input.name, width: input.width, height: input.height, tileSize: input.tileSize,
    assets: input.assets.map(a => ({ id: a.id, name: a.name, kind: a.kind, width: a.width, height: a.height, originX: a.originX, originY: a.originY, solid: Boolean(a.solid), collider: a.collider ? { x: a.collider.x, y: a.collider.y, width: a.collider.width, height: a.collider.height } : null, ...(a.builtin ? { builtin: a.builtin } : { image: a.image }) })),
    terrain: [...input.terrain], collisions: [...input.collisions], objects: input.objects.map(o => ({ id: o.id, asset: o.asset, x: o.x, y: o.y })), markers: input.markers.map(m => ({ id: m.id, type: m.type, label: m.label, x: m.x, y: m.y })) };
}
export function resizeMap(map, width, height, tileSize) {
  requireValue(dimension(width) && dimension(height) && [16, 32, 48, 64].includes(tileSize), 'Dimensioni non valide.');
  const next = clone(map); next.width = width; next.height = height; next.tileSize = tileSize;
  next.terrain = Array(width * height).fill(null); next.collisions = Array(width * height).fill(false);
  for (let y = 0; y < Math.min(height, map.height); y++) for (let x = 0; x < Math.min(width, map.width); x++) {
    next.terrain[y * width + x] = map.terrain[y * map.width + x]; next.collisions[y * width + x] = map.collisions[y * map.width + x];
  }
  const ratio = tileSize / map.tileSize;
  for (const key of ['objects', 'markers']) next[key] = map[key].map(o => ({ ...o, x: o.x * ratio, y: o.y * ratio })).filter(o => o.x < width * tileSize && o.y < height * tileSize);
  return next;
}
export function cell(map, x, y) {
  const cx = Math.floor(x / map.tileSize), cy = Math.floor(y / map.tileSize);
  return cx >= 0 && cy >= 0 && cx < map.width && cy < map.height ? cy * map.width + cx : -1;
}
export function paint(map, layer, cx, cy, size, value) {
  const data = map[layer];
  for (let y = cy; y < cy + size; y++) for (let x = cx; x < cx + size; x++) if (x >= 0 && y >= 0 && x < map.width && y < map.height) data[y * map.width + x] = value;
}
export function rectangle(map, layer, a, b, value) {
  for (let y = Math.min(a.y, b.y); y <= Math.max(a.y, b.y); y++) for (let x = Math.min(a.x, b.x); x <= Math.max(a.x, b.x); x++) paint(map, layer, x, y, 1, value);
}
export function floodFill(map, layer, start, value) {
  const data = map[layer], old = data[start]; if (start < 0 || old === value) return;
  const stack = [start]; data[start] = value;
  while (stack.length) {
    const i = stack.pop(), x = i % map.width, y = Math.floor(i / map.width);
    for (const n of [x > 0 ? i - 1 : -1, x < map.width - 1 ? i + 1 : -1, y > 0 ? i - map.width : -1, y < map.height - 1 ? i + map.width : -1]) if (n >= 0 && data[n] === old) { data[n] = value; stack.push(n); }
  }
}
export function objectCollider(map, object) {
  const c = map.assets.find(a => a.id === object.asset)?.collider;
  return c ? { x: object.x + c.x, y: object.y + c.y, width: c.width, height: c.height } : null;
}
export function collisionRectangles(map) {
  const solid = new Set(map.assets.filter(a => a.kind === 'terrain' && a.solid).map(a => a.id)), result = [];
  // Merge neighboring blocked cells into horizontal strips.
  for (let y = 0; y < map.height; y++) {
    let start = -1;
    for (let x = 0; x <= map.width; x++) {
      const i = y * map.width + x, blocked = x < map.width && (map.collisions[i] || solid.has(map.terrain[i]));
      if (blocked && start < 0) start = x;
      if (!blocked && start >= 0) { result.push({ x: start * map.tileSize, y: y * map.tileSize, width: (x - start) * map.tileSize, height: map.tileSize }); start = -1; }
    }
  }
  for (const o of map.objects) { const c = objectCollider(map, o); if (c) result.push(c); }
  return result;
}
export function canStand(map, x, y, radius = 9, rectangles = collisionRectangles(map)) {
  if (x - radius < 0 || y - radius < 0 || x + radius > map.width * map.tileSize || y + radius > map.height * map.tileSize) return false;
  return !rectangles.some(r => {
    const dx = x - Math.max(r.x, Math.min(x, r.x + r.width));
    const dy = y - Math.max(r.y, Math.min(y, r.y + r.height));
    return dx * dx + dy * dy < radius * radius;
  });
}
export function movePlayer(map, player, dx, dy, rectangles) {
  // Substeps prevent crossing a thin collider during a delayed frame.
  const steps = Math.max(1, Math.ceil(Math.max(Math.abs(dx), Math.abs(dy)) / 4));
  for (let i = 0; i < steps; i++) {
    if (canStand(map, player.x + dx / steps, player.y, 9, rectangles)) player.x += dx / steps;
    if (canStand(map, player.x, player.y + dy / steps, 9, rectangles)) player.y += dy / steps;
  }
  return player;
}
export function findSpawn(map, rectangles = collisionRectangles(map)) {
  const spawn = map.markers.find(m => m.type === 'spawn');
  if (spawn && canStand(map, spawn.x, spawn.y, 9, rectangles)) return { x: spawn.x, y: spawn.y };
  for (let y = 0; y < map.height; y++) for (let x = 0; x < map.width; x++) {
    const p = { x: (x + .5) * map.tileSize, y: (y + .5) * map.tileSize };
    if (canStand(map, p.x, p.y, 9, rectangles)) return p;
  }
  return null;
}
export class History {
  constructor(limit = 40) { this.limit = limit; this.undoStack = []; this.redoStack = []; }
  push(map) { this.undoStack.push(clone(map)); if (this.undoStack.length > this.limit) this.undoStack.shift(); this.redoStack = []; }
  undo(map) { if (!this.undoStack.length) return map; this.redoStack.push(clone(map)); return this.undoStack.pop(); }
  redo(map) { if (!this.redoStack.length) return map; this.undoStack.push(clone(map)); return this.redoStack.pop(); }
}
