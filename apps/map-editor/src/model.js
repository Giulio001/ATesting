// Portable versioned map format. No Phaser dependency: usable by an authoritative server.
export const VERSION = 2;
export const LAYER_NAMES = {
  terrain: 'Terreno',
  details: 'Dettagli',
  buildings: 'Edifici',
  objects: 'Oggetti',
  overhead: 'Sopra il personaggio',
  collisions: 'Collisioni',
  markers: 'Gameplay',
};
export const OBJECT_LAYERS = ['details', 'buildings', 'objects', 'overhead'];
export function defaultLayers() {
  return Object.keys(LAYER_NAMES).map((id) => ({ id, visible: true, locked: false }));
}
export function layerState(map, id) {
  return map.layers?.find((l) => l.id === id) ?? { id, visible: true, locked: false };
}
export function editableLayer(map, id) {
  const l = layerState(map, id);
  return l.visible && !l.locked;
}
export function objectDepth(map, object) {
  return object.layer === 'details'
    ? -8000
    : object.layer === 'overhead'
      ? map.height * map.tileSize + 10000
      : object.y;
}
export const MARKERS = ['spawn', 'npc', 'enemy', 'boss', 'portal', 'zone'];
export const BUILTINS = ['grass', 'stone', 'path', 'water', 'tree', 'pillar', 'crate'];
export const clone = (value) => JSON.parse(JSON.stringify(value));
export function builtinAssets() {
  return [
    ...[
      ['grass', 'Erba', '#3d6545', false],
      ['stone', 'Pietra', '#737b75', false],
      ['path', 'Sentiero', '#99815c', false],
      ['water', 'Acqua', '#365f76', true],
    ].map(([id, name, color, solid]) => ({
      id,
      name,
      kind: 'terrain',
      builtin: id,
      color,
      solid,
      width: 32,
      height: 32,
      originX: 0,
      originY: 0,
      collider: null,
    })),
    {
      id: 'tree',
      name: 'Albero · esempio',
      kind: 'object',
      builtin: 'tree',
      width: 80,
      height: 112,
      originX: 0.5,
      originY: 1,
      collider: { x: -9, y: -12, width: 18, height: 12 },
    },
    {
      id: 'pillar',
      name: 'Pilastro · esempio',
      kind: 'object',
      builtin: 'pillar',
      width: 32,
      height: 64,
      originX: 0.5,
      originY: 1,
      collider: { x: -12, y: -14, width: 24, height: 14 },
    },
    {
      id: 'crate',
      name: 'Cassa · esempio',
      kind: 'object',
      builtin: 'crate',
      width: 32,
      height: 32,
      originX: 0.5,
      originY: 1,
      collider: { x: -16, y: -24, width: 32, height: 24 },
    },
  ];
}
export function newMap(width = 40, height = 28, tileSize = 32) {
  const assets = builtinAssets();
  const autotiles = ['path', 'water'].map((group) => {
    assets.find((a) => a.id === group).variant = 0;
    for (let mask = 1; mask < 16; mask++)
      assets.push({
        ...assets.find((a) => a.id === group),
        id: `${group}-v${mask}`,
        variant: mask,
      });
    return {
      id: group,
      name: group === 'path' ? 'Sentiero' : 'Acqua',
      tiles: [group, ...Array.from({ length: 15 }, (_, i) => `${group}-v${i + 1}`)],
    };
  });
  return {
    format: 'aetheria-map',
    version: VERSION,
    name: 'Nuova regione',
    width,
    height,
    tileSize,
    layers: defaultLayers(),
    autotiles,
    review: { status: 'draft' },
    assets,
    terrain: Array(width * height).fill('grass'),
    collisions: Array(width * height).fill(false),
    objects: [],
    markers: [],
  };
}
function requireValue(ok, message) {
  if (!ok) throw new Error(message);
}
const finiteRange = (n, min, max) => Number.isFinite(n) && n >= min && n <= max;
const dimension = (n) => Number.isInteger(n) && n >= 8 && n <= 256;
export function validateMap(input) {
  requireValue(
    input && input.format === 'aetheria-map' && [1, VERSION].includes(input.version),
    'Formato o versione mappa non supportati.',
  );
  requireValue(
    dimension(input.width) && dimension(input.height) && [16, 32, 48, 64].includes(input.tileSize),
    'Dimensioni non valide (8–256 celle, tile 16/32/48/64).',
  );
  requireValue(
    typeof input.name === 'string' && input.name.length <= 100,
    'Nome mappa non valido.',
  );
  requireValue(
    Array.isArray(input.assets) && input.assets.length > 0 && input.assets.length <= 2048,
    'Catalogo asset non valido.',
  );
  const legacy = input.version === 1;
  if (legacy)
    input = {
      ...input,
      layers: defaultLayers(),
      autotiles: [],
      review: { status: 'draft' },
      objects: input.objects?.map((o) => ({ ...o, layer: 'objects' })),
    };
  requireValue(
    Array.isArray(input.layers) &&
      input.layers.length === 7 &&
      new Set(input.layers.map((l) => l?.id)).size === 7 &&
      input.layers.every(
        (l) =>
          Object.hasOwn(LAYER_NAMES, l.id) &&
          typeof l.visible === 'boolean' &&
          typeof l.locked === 'boolean',
      ),
    'Livelli non validi.',
  );
  requireValue(
    input.review && ['draft', 'approved'].includes(input.review.status),
    'Stato revisione non valido.',
  );
  const ids = new Set();
  for (const a of input.assets) {
    requireValue(
      a && typeof a.id === 'string' && /^[\w-]{1,100}$/.test(a.id) && !ids.has(a.id),
      'ID asset duplicato o non valido.',
    );
    ids.add(a.id);
    requireValue(
      typeof a.name === 'string' && a.name.length <= 100 && ['terrain', 'object'].includes(a.kind),
      'Tipo/nome asset non valido.',
    );
    requireValue(
      finiteRange(a.width, 1, 2048) &&
        finiteRange(a.height, 1, 2048) &&
        finiteRange(a.originX, 0, 1) &&
        finiteRange(a.originY, 0, 1),
      'Dimensioni/origine asset non valide.',
    );
    requireValue(
      a.builtin
        ? BUILTINS.includes(a.builtin)
        : typeof a.image === 'string' &&
            a.image.length <= 20_000_000 &&
            /^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(a.image),
      'Asset deve contenere un PNG incorporato o un esempio noto.',
    );
    if (a.variant !== undefined)
      requireValue(
        Number.isInteger(a.variant) && finiteRange(a.variant, 0, 15),
        'Variante autotile non valida.',
      );
    if (a.collider) validateShape(a.collider);
  }
  const terrainIds = new Set(input.assets.filter((a) => a.kind === 'terrain').map((a) => a.id));
  const objectIds = new Set(input.assets.filter((a) => a.kind === 'object').map((a) => a.id));
  requireValue(
    Array.isArray(input.autotiles) && input.autotiles.length <= 128,
    'Gruppi autotile non validi.',
  );
  const groupIds = new Set(),
    groupedTiles = new Set();
  for (const group of input.autotiles) {
    requireValue(
      typeof group.id === 'string' &&
        /^[\w-]{1,100}$/.test(group.id) &&
        !groupIds.has(group.id) &&
        typeof group.name === 'string' &&
        group.name.length <= 100 &&
        Array.isArray(group.tiles) &&
        group.tiles.length === 16 &&
        group.tiles.every((t) => terrainIds.has(t)),
      'Gruppo autotile richiede 16 terreni validi.',
    );
    groupIds.add(group.id);
    for (const tile of new Set(group.tiles)) {
      requireValue(!groupedTiles.has(tile), 'Un terreno appartiene a più gruppi autotile.');
      groupedTiles.add(tile);
    }
    requireValue(
      new Set(group.tiles.map((t) => Boolean(input.assets.find((a) => a.id === t).solid))).size ===
        1,
      'Le varianti autotile devono avere la stessa collisione.',
    );
  }
  const size = input.width * input.height;
  requireValue(
    Array.isArray(input.terrain) &&
      input.terrain.length === size &&
      input.terrain.every((id) => id === null || terrainIds.has(id)),
    'Griglia terreno non valida o asset mancante.',
  );
  requireValue(
    Array.isArray(input.collisions) &&
      input.collisions.length === size &&
      input.collisions.every((v) => typeof v === 'boolean'),
    'Griglia collisioni non valida.',
  );
  requireValue(
    Array.isArray(input.objects) &&
      input.objects.length <= 10000 &&
      Array.isArray(input.markers) &&
      input.markers.length <= 2000,
    'Troppi elementi o elenco non valido.',
  );
  const instanceIds = new Set();
  for (const item of [...input.objects, ...input.markers]) {
    requireValue(
      item &&
        typeof item.id === 'string' &&
        /^[\w-]{1,100}$/.test(item.id) &&
        !instanceIds.has(item.id),
      'ID elemento duplicato o non valido.',
    );
    instanceIds.add(item.id);
    requireValue(
      finiteRange(item.x, 0, input.width * input.tileSize) &&
        finiteRange(item.y, 0, input.height * input.tileSize),
      'Elemento fuori mappa.',
    );
  }
  requireValue(
    input.objects.every(
      (o) => objectIds.has(o.asset) && OBJECT_LAYERS.includes(o.layer ?? 'objects'),
    ),
    'Oggetto con asset mancante o livello non valido.',
  );
  for (const o of input.objects)
    if (o.collider !== undefined && o.collider !== null) validateShape(o.collider);
  requireValue(
    input.markers.every(
      (m) => MARKERS.includes(m.type) && typeof m.label === 'string' && m.label.length <= 100,
    ),
    'Punto gameplay non valido.',
  );
  // Whitelist fields so imported files cannot introduce executable/prototype metadata.
  return {
    format: input.format,
    version: VERSION,
    name: input.name,
    width: input.width,
    height: input.height,
    tileSize: input.tileSize,
    layers: input.layers.map((l) => ({ id: l.id, visible: l.visible, locked: l.locked })),
    autotiles: input.autotiles.map((g) => ({ id: g.id, name: g.name, tiles: [...g.tiles] })),
    review: { status: input.review.status },
    assets: input.assets.map((a) => ({
      id: a.id,
      name: a.name,
      kind: a.kind,
      width: a.width,
      height: a.height,
      originX: a.originX,
      originY: a.originY,
      solid: Boolean(a.solid),
      collider: a.collider ? cleanShape(a.collider) : null,
      ...(a.variant === undefined ? {} : { variant: a.variant }),
      ...(OBJECT_LAYERS.includes(a.defaultLayer) ? { defaultLayer: a.defaultLayer } : {}),
      ...(a.builtin ? { builtin: a.builtin } : { image: a.image }),
    })),
    terrain: [...input.terrain],
    collisions: [...input.collisions],
    objects: input.objects.map((o) => ({
      id: o.id,
      asset: o.asset,
      x: o.x,
      y: o.y,
      layer: o.layer ?? 'objects',
      ...(o.collider === undefined
        ? {}
        : { collider: o.collider === null ? null : cleanShape(o.collider) }),
    })),
    markers: input.markers.map((m) => ({
      id: m.id,
      type: m.type,
      label: m.label,
      x: m.x,
      y: m.y,
      ...(m.type === 'portal'
        ? { destination: typeof m.destination === 'string' ? m.destination.slice(0, 100) : '' }
        : {}),
    })),
  };
}
export function resizeMap(map, width, height, tileSize) {
  requireValue(
    dimension(width) && dimension(height) && [16, 32, 48, 64].includes(tileSize),
    'Dimensioni non valide.',
  );
  const next = clone(map);
  next.width = width;
  next.height = height;
  next.tileSize = tileSize;
  next.terrain = Array(width * height).fill(null);
  next.collisions = Array(width * height).fill(false);
  for (let y = 0; y < Math.min(height, map.height); y++)
    for (let x = 0; x < Math.min(width, map.width); x++) {
      next.terrain[y * width + x] = map.terrain[y * map.width + x];
      next.collisions[y * width + x] = map.collisions[y * map.width + x];
    }
  const ratio = tileSize / map.tileSize;
  for (const key of ['objects', 'markers'])
    next[key] = map[key]
      .map((o) => ({ ...o, x: o.x * ratio, y: o.y * ratio }))
      .filter((o) => o.x < width * tileSize && o.y < height * tileSize);
  return next;
}
export function cell(map, x, y) {
  const cx = Math.floor(x / map.tileSize),
    cy = Math.floor(y / map.tileSize);
  return cx >= 0 && cy >= 0 && cx < map.width && cy < map.height ? cy * map.width + cx : -1;
}
export function paint(map, layer, cx, cy, size, value) {
  const data = map[layer];
  for (let y = cy; y < cy + size; y++)
    for (let x = cx; x < cx + size; x++)
      if (x >= 0 && y >= 0 && x < map.width && y < map.height) data[y * map.width + x] = value;
}
export function rectangle(map, layer, a, b, value) {
  for (let y = Math.min(a.y, b.y); y <= Math.max(a.y, b.y); y++)
    for (let x = Math.min(a.x, b.x); x <= Math.max(a.x, b.x); x++)
      paint(map, layer, x, y, 1, value);
}
export function floodFill(map, layer, start, value) {
  const data = map[layer],
    old = data[start];
  if (start < 0 || old === value) return;
  const stack = [start];
  data[start] = value;
  while (stack.length) {
    const i = stack.pop(),
      x = i % map.width,
      y = Math.floor(i / map.width);
    for (const n of [
      x > 0 ? i - 1 : -1,
      x < map.width - 1 ? i + 1 : -1,
      y > 0 ? i - map.width : -1,
      y < map.height - 1 ? i + map.width : -1,
    ])
      if (n >= 0 && data[n] === old) {
        data[n] = value;
        stack.push(n);
      }
  }
}
export function objectCollider(map, object) {
  const c =
    object.collider === undefined
      ? map.assets.find((a) => a.id === object.asset)?.collider
      : object.collider;
  if (!c) return null;
  if (c.type === 'polygon')
    return {
      type: 'polygon',
      points: c.points.map((p) => ({ x: object.x + p.x, y: object.y + p.y })),
    };
  return { x: object.x + c.x, y: object.y + c.y, width: c.width, height: c.height };
}
export function collisionShapes(map) {
  const solid = new Set(map.assets.filter((a) => a.kind === 'terrain' && a.solid).map((a) => a.id)),
    result = [];
  // Merge neighboring blocked cells into horizontal strips.
  for (let y = 0; y < map.height; y++) {
    let start = -1;
    for (let x = 0; x <= map.width; x++) {
      const i = y * map.width + x,
        blocked = x < map.width && (map.collisions[i] || solid.has(map.terrain[i]));
      if (blocked && start < 0) start = x;
      if (!blocked && start >= 0) {
        result.push({
          x: start * map.tileSize,
          y: y * map.tileSize,
          width: (x - start) * map.tileSize,
          height: map.tileSize,
        });
        start = -1;
      }
    }
  }
  for (const o of map.objects) {
    const c = objectCollider(map, o);
    if (c) result.push(c);
  }
  return result;
}
export function canStand(map, x, y, radius = 9, rectangles = collisionShapes(map)) {
  if (
    x - radius < 0 ||
    y - radius < 0 ||
    x + radius > map.width * map.tileSize ||
    y + radius > map.height * map.tileSize
  )
    return false;
  return !rectangles.some((r) => {
    if (r.type === 'polygon') return circleTouchesPolygon(x, y, radius, r.points);
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
export function findSpawn(map, rectangles = collisionShapes(map)) {
  const spawn = map.markers.find((m) => m.type === 'spawn');
  if (spawn && canStand(map, spawn.x, spawn.y, 9, rectangles)) return { x: spawn.x, y: spawn.y };
  for (let y = 0; y < map.height; y++)
    for (let x = 0; x < map.width; x++) {
      const p = { x: (x + 0.5) * map.tileSize, y: (y + 0.5) * map.tileSize };
      if (canStand(map, p.x, p.y, 9, rectangles)) return p;
    }
  return null;
}
export class History {
  constructor(limit = 40) {
    this.limit = limit;
    this.undoStack = [];
    this.redoStack = [];
  }
  push(map) {
    this.undoStack.push(clone(map));
    if (this.undoStack.length > this.limit) this.undoStack.shift();
    this.redoStack = [];
  }
  undo(map) {
    if (!this.undoStack.length) return map;
    this.redoStack.push(clone(map));
    return this.undoStack.pop();
  }
  redo(map) {
    if (!this.redoStack.length) return map;
    this.undoStack.push(clone(map));
    return this.redoStack.pop();
  }
}

export function cleanShape(shape) {
  return shape.type === 'polygon'
    ? { type: 'polygon', points: shape.points.map((p) => ({ x: p.x, y: p.y })) }
    : { x: shape.x, y: shape.y, width: shape.width, height: shape.height };
}
function cross(a, b, c) {
  return (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
}
function intersects(a, b, c, d) {
  const c1 = cross(a, b, c),
    c2 = cross(a, b, d),
    c3 = cross(c, d, a),
    c4 = cross(c, d, b);
  const on = (p, q, r) =>
    Math.abs(cross(p, q, r)) < 1e-8 &&
    r.x >= Math.min(p.x, q.x) &&
    r.x <= Math.max(p.x, q.x) &&
    r.y >= Math.min(p.y, q.y) &&
    r.y <= Math.max(p.y, q.y);
  return (c1 * c2 < 0 && c3 * c4 < 0) || on(a, b, c) || on(a, b, d) || on(c, d, a) || on(c, d, b);
}
export function validateShape(s) {
  if (s?.type === 'polygon') {
    requireValue(
      Array.isArray(s.points) &&
        s.points.length >= 3 &&
        s.points.length <= 32 &&
        s.points.every((p) => finiteRange(p?.x, -2048, 2048) && finiteRange(p?.y, -2048, 2048)),
      'Poligono: usa da 3 a 32 vertici entro ±2048 px.',
    );
    const p = s.points,
      n = p.length;
    let area = 0;
    for (let i = 0; i < n; i++) {
      const a = p[i],
        b = p[(i + 1) % n];
      requireValue(a.x !== b.x || a.y !== b.y, 'Vertici consecutivi duplicati.');
      area += a.x * b.y - b.x * a.y;
      for (let j = i + 1; j < n; j++)
        if (j !== i + 1 && !(i === 0 && j === n - 1))
          requireValue(
            !intersects(a, b, p[j], p[(j + 1) % n]),
            'Il poligono si interseca: ridisegna il contorno.',
          );
    }
    requireValue(Math.abs(area) > 1, 'Il poligono non ha area.');
  } else
    requireValue(
      s &&
        (!s.type || s.type === 'rectangle') &&
        finiteRange(s.x, -2048, 2048) &&
        finiteRange(s.y, -2048, 2048) &&
        finiteRange(s.width, 1, 2048) &&
        finiteRange(s.height, 1, 2048),
      'Collisione rettangolare non valida.',
    );
  return s;
}
function segmentDistanceSquared(x, y, a, b) {
  const dx = b.x - a.x,
    dy = b.y - a.y,
    l = dx * dx + dy * dy;
  const t = l ? Math.max(0, Math.min(1, ((x - a.x) * dx + (y - a.y) * dy) / l)) : 0;
  return (x - a.x - t * dx) ** 2 + (y - a.y - t * dy) ** 2;
}
export function circleTouchesPolygon(x, y, radius, points) {
  let inside = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const a = points[i],
      b = points[j];
    if (segmentDistanceSquared(x, y, a, b) < radius * radius) return true;
    if (a.y > y !== b.y > y && x < ((b.x - a.x) * (y - a.y)) / (b.y - a.y) + a.x) inside = !inside;
  }
  return inside;
}
// Compatibility helper returns bounding rectangles for polygon footprints. Use
// collisionShapes + canStand for exact polygons; do not use these boxes as physics.
export function collisionRectangles(map) {
  return collisionShapes(map).map((s) => {
    if (s.type !== 'polygon') return s;
    const xs = s.points.map((p) => p.x),
      ys = s.points.map((p) => p.y);
    const x = Math.min(...xs),
      y = Math.min(...ys);
    return { x, y, width: Math.max(...xs) - x, height: Math.max(...ys) - y };
  });
}
export function autotileGroup(map, tile) {
  return map.autotiles?.find((g) => g.tiles.includes(tile));
}
export function canonicalTile(map, tile) {
  return autotileGroup(map, tile)?.tiles[0] ?? tile;
}
export function autotileMask(map, x, y) {
  const group = autotileGroup(map, map.terrain[y * map.width + x]);
  if (!group) return 0;
  let mask = 0;
  for (const [dx, dy, bit] of [
    [0, -1, 1],
    [1, 0, 2],
    [0, 1, 4],
    [-1, 0, 8],
  ]) {
    const nx = x + dx,
      ny = y + dy;
    if (
      nx >= 0 &&
      ny >= 0 &&
      nx < map.width &&
      ny < map.height &&
      group.tiles.includes(map.terrain[ny * map.width + nx])
    )
      mask |= bit;
  }
  return mask;
}
export function renderedTile(map, x, y) {
  const tile = map.terrain[y * map.width + x],
    group = autotileGroup(map, tile);
  return group ? group.tiles[autotileMask(map, x, y)] : tile;
}
export function reviewMap(input) {
  const issues = [];
  const add = (code, message, item = null) =>
    issues.push({ severity: 'error', code, message, item });
  const assets = new Set(Array.isArray(input?.assets) ? input.assets.map((a) => a?.id) : []);
  for (const o of Array.isArray(input?.objects) ? input.objects : [])
    if (o && !assets.has(o.asset))
      add('missing-asset', `Asset mancante per l'oggetto ${o.id}.`, o.id);
  for (let i = 0; i < (Array.isArray(input?.terrain) ? input.terrain.length : 0); i++)
    if (input.terrain[i] && !assets.has(input.terrain[i])) {
      add('missing-asset', `Asset mancante nella cella ${i}.`);
      break;
    }
  let map;
  try {
    map = validateMap(input);
  } catch (e) {
    add('invalid-map', e.message);
    return issues;
  }
  const shapes = collisionShapes(map),
    spawns = map.markers.filter((m) => m.type === 'spawn');
  if (spawns.length !== 1) add('spawn-count', 'Serve esattamente un ingresso giocatore.');
  for (const m of spawns)
    if (!canStand(map, m.x, m.y, 9, shapes))
      add(
        'blocked-spawn',
        'Ingresso giocatore bloccato da una collisione o troppo vicino al bordo.',
        m.id,
      );
  for (const m of map.markers.filter((m) => m.type === 'portal')) {
    if (!m.destination?.trim())
      add('portal-destination', `Portale “${m.label || m.id}” senza destinazione.`, m.id);
    if (!canStand(map, m.x, m.y, 9, shapes))
      add('blocked-portal', `Portale “${m.label || m.id}” non attraversabile.`, m.id);
  }
  const reachability = analyzeReachability(map);
  for (const marker of reachability?.unreachable ?? [])
    issues.push({
      severity: 'warning',
      code: 'unreachable-marker',
      message: `“${marker.label || marker.id}” potrebbe essere irraggiungibile dall’ingresso. Verifica il percorso in Prova mappa.`,
      item: marker.id,
    });
  return issues;
}
export function approveMap(map) {
  const issues = reviewMap(map);
  const errors = issues.filter((i) => i.severity === 'error');
  requireValue(!errors.length, `Approvazione bloccata: ${errors.length} problemi.`);
  const next = validateMap(map);
  next.review = { status: 'approved' };
  return next;
}

// Editor operations use one shared displacement, preserving relative placement.
export function selectionBounds(items) {
  if (!items.length) return null;
  const xs = items.map((i) => i.x),
    ys = items.map((i) => i.y);
  return {
    minX: Math.min(...xs),
    maxX: Math.max(...xs),
    minY: Math.min(...ys),
    maxY: Math.max(...ys),
  };
}
export function groupPositions(map, items, dx, dy, step = 1) {
  const b = selectionBounds(items);
  if (!b) return [];
  dx = Math.round(dx / step) * step;
  dy = Math.round(dy / step) * step;
  dx = Math.max(-b.minX, Math.min(dx, map.width * map.tileSize - 1 - b.maxX));
  dy = Math.max(-b.minY, Math.min(dy, map.height * map.tileSize - 1 - b.maxY));
  return items.map((i) => ({ id: i.id, x: i.x + dx, y: i.y + dy }));
}
export function alignedPositions(items, operation) {
  if (items.length < 2) return [];
  const b = selectionBounds(items),
    output = items.map((i) => ({ id: i.id, x: i.x, y: i.y }));
  const align = {
    left: ['x', b.minX],
    right: ['x', b.maxX],
    top: ['y', b.minY],
    bottom: ['y', b.maxY],
    centerX: ['x', (b.minX + b.maxX) / 2],
    centerY: ['y', (b.minY + b.maxY) / 2],
  };
  if (align[operation]) {
    const [axis, value] = align[operation];
    for (const i of output) i[axis] = value;
  } else if (['distributeX', 'distributeY'].includes(operation) && items.length >= 3) {
    const axis = operation === 'distributeX' ? 'x' : 'y';
    const sorted = [...output].sort((a, b) => a[axis] - b[axis]);
    const first = sorted[0][axis],
      last = sorted.at(-1)[axis];
    sorted.forEach((i, n) => (i[axis] = first + ((last - first) * n) / (sorted.length - 1)));
  } else throw new Error('Operazione di allineamento non valida o selezione insufficiente.');
  return output;
}
export function canTraverse(map, a, b, shapes = collisionShapes(map), radius = 9) {
  const steps = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / 4));
  for (let n = 0; n <= steps; n++)
    if (
      !canStand(
        map,
        a.x + ((b.x - a.x) * n) / steps,
        a.y + ((b.y - a.y) * n) / steps,
        radius,
        shapes,
      )
    )
      return false;
  return true;
}
export function analyzeReachability(map) {
  const spawn = map.markers.find((m) => m.type === 'spawn'),
    shapes = collisionShapes(map),
    size = map.width * map.height;
  if (!spawn || !canStand(map, spawn.x, spawn.y, 9, shapes)) return null;
  const buckets = Array.from({ length: size }, () => []);
  for (const shape of shapes) {
    const bounds =
      shape.type === 'polygon'
        ? {
            x: Math.min(...shape.points.map((p) => p.x)),
            y: Math.min(...shape.points.map((p) => p.y)),
            right: Math.max(...shape.points.map((p) => p.x)),
            bottom: Math.max(...shape.points.map((p) => p.y)),
          }
        : { x: shape.x, y: shape.y, right: shape.x + shape.width, bottom: shape.y + shape.height };
    const x0 = Math.max(0, Math.floor((bounds.x - 9) / map.tileSize)),
      x1 = Math.min(map.width - 1, Math.floor((bounds.right + 9) / map.tileSize));
    const y0 = Math.max(0, Math.floor((bounds.y - 9) / map.tileSize)),
      y1 = Math.min(map.height - 1, Math.floor((bounds.bottom + 9) / map.tileSize));
    for (let y = y0; y <= y1; y++)
      for (let x = x0; x <= x1; x++) buckets[y * map.width + x].push(shape);
  }
  const point = (i) => ({
    x: ((i % map.width) + 0.5) * map.tileSize,
    y: (Math.floor(i / map.width) + 0.5) * map.tileSize,
  });
  const walkable = new Uint8Array(size),
    reachable = new Uint8Array(size);
  for (let i = 0; i < size; i++) {
    const p = point(i);
    walkable[i] = Number(canStand(map, p.x, p.y, 9, buckets[i]));
  }
  const cx = Math.floor(spawn.x / map.tileSize),
    cy = Math.floor(spawn.y / map.tileSize),
    queue = [];
  for (let y = Math.max(0, cy - 1); y <= Math.min(map.height - 1, cy + 1); y++)
    for (let x = Math.max(0, cx - 1); x <= Math.min(map.width - 1, cx + 1); x++) {
      const i = y * map.width + x;
      if (walkable[i] && canTraverse(map, spawn, point(i), shapes)) {
        reachable[i] = 1;
        queue.push(i);
      }
    }
  for (let head = 0; head < queue.length; head++) {
    const i = queue[head],
      x = i % map.width,
      y = Math.floor(i / map.width);
    for (const n of [
      x > 0 ? i - 1 : -1,
      x < map.width - 1 ? i + 1 : -1,
      y > 0 ? i - map.width : -1,
      y < map.height - 1 ? i + map.width : -1,
    ])
      if (n >= 0 && walkable[n] && !reachable[n]) {
        const candidates = [...new Set([...buckets[i], ...buckets[n]])];
        if (canTraverse(map, point(i), point(n), candidates)) {
          reachable[n] = 1;
          queue.push(n);
        }
      }
  }
  const unreachable = [];
  for (const marker of map.markers.filter((m) =>
    ['portal', 'npc', 'boss', 'enemy'].includes(m.type),
  )) {
    const x = Math.floor(marker.x / map.tileSize),
      y = Math.floor(marker.y / map.tileSize);
    let found = false;
    for (let ny = Math.max(0, y - 1); ny <= Math.min(map.height - 1, y + 1) && !found; ny++)
      for (let nx = Math.max(0, x - 1); nx <= Math.min(map.width - 1, x + 1); nx++) {
        const i = ny * map.width + nx;
        if (
          reachable[i] &&
          (marker.type !== 'portal' || canTraverse(map, point(i), marker, shapes))
        ) {
          found = true;
          break;
        }
      }
    if (!found) unreachable.push(marker);
  }
  return { walkable, reachable, unreachable, count: queue.length };
}
