import Phaser from 'phaser';
import './style.css';
import { addGameLibrary } from './game-library.js';
import {
  newMap,
  validateMap,
  resizeMap,
  clone,
  cell,
  paint,
  rectangle,
  floodFill,
  collisionShapes,
  canStand,
  movePlayer,
  findSpawn,
  History,
  OBJECT_LAYERS,
  LAYER_NAMES,
  layerState,
  editableLayer,
  objectDepth,
  renderedTile,
  canonicalTile,
  autotileGroup,
  validateShape,
  cleanShape,
  objectCollider,
  reviewMap,
  approveMap,
} from './model.js';
import { builtinCanvas, prepareTextures, textureKey } from './textures.js';
const $ = (id) => document.getElementById(id);
const id = () => crypto.randomUUID();
const history = new History(30);
let map = newMap(),
  scene,
  selectedAsset = 'grass',
  tool = 'brush',
  selection = null,
  clipboard = null,
  testing = false,
  player = null,
  blockers = [],
  pngMode = 'object',
  saved = true;
const tools = [
  ['brush', '✎ Pennello'],
  ['rect', '▧ Rettangolo'],
  ['fill', '▨ Riempi'],
  ['erase', '⌫ Gomma'],
  ['select', '↖ Seleziona'],
  ['place', '+ Posiziona'],
];
const colors = {
  spawn: 0xe9d89a,
  npc: 0x88d2a2,
  enemy: 0xdb857b,
  boss: 0xe095df,
  portal: 0x8fcbe4,
  zone: 0xccad76,
};
function status(message) {
  $('status').textContent = message;
}
function asset() {
  return map.assets.find((a) => a.id === selectedAsset);
}
function checkpoint() {
  history.push(map);
  map.review = { status: 'draft' };
  saved = false;
}
function store() {
  saved = false;
  try {
    localStorage.setItem('aetheria-map-draft-v1', JSON.stringify(map));
    status('Bozza salvata nel browser · esporta JSON per conservarla.');
  } catch {
    status('Bozza troppo grande per il browser: esporta JSON.');
  }
  $('undo').disabled = !history.undoStack.length;
  $('redo').disabled = !history.redoStack.length;
}
function finish(preserveReview = false) {
  if (!preserveReview) map.review = { status: 'draft' };
  scene?.sync();
  store();
  selectionPanel();
  layerPanel();
  $('review-state').textContent = map.review.status === 'approved' ? 'Approvata' : 'Bozza';
  $('review-results').replaceChildren();
}
function syncForm() {
  $('map-name').value = map.name;
  $('width').value = map.width;
  $('height').value = map.height;
  $('tile-size').value = map.tileSize;
}
function setTool(next) {
  if (scene && !['collider-rect', 'collider-poly'].includes(next)) scene.polygonDraft = null;
  tool = next;
  for (const button of $('tools').children)
    button.classList.toggle('active', button.dataset.tool === tool);
  const layerName = $('layer').selectedOptions[0].textContent;
  $('mode-label').textContent = testing
    ? 'Prova · WASD / frecce · Esc per uscire'
    : `${layerName} / ${tools.find((t) => t[0] === tool)?.[1] ?? (tool === 'collider-poly' ? 'Poligono: clicca vertici, Invio chiude, Esc annulla' : 'Trascina collisione rettangolare')}`;
}
for (const [name, label] of tools) {
  const button = document.createElement('button');
  button.textContent = label;
  button.dataset.tool = name;
  button.onclick = () => setTool(name);
  $('tools').append(button);
}
function assetPanel() {
  const a = asset();
  $('asset-properties').hidden = !a;
  if (!a) return;
  $('asset-title').textContent = a.name;
  for (const [field, value] of [
    ['asset-w', a.width],
    ['asset-h', a.height],
    ['origin-x', a.originX],
    ['origin-y', a.originY],
    ['col-x', a.collider?.x ?? -8],
    ['col-y', a.collider?.y ?? -8],
    ['col-w', a.collider?.width ?? 16],
    ['col-h', a.collider?.height ?? 8],
  ])
    $(field).value = value;
  $('asset-collider-note').textContent =
    a.collider?.type === 'polygon'
      ? 'Collisione asset poligonale: usa una collisione per istanza per adattarla.'
      : '';
  $('asset-solid').checked = a.kind === 'terrain' ? a.solid : Boolean(a.collider);
}
function palette() {
  if (!asset()) selectedAsset = map.assets[0]?.id;
  $('palette').replaceChildren();
  for (const a of map.assets.filter(
    (a) =>
      (!autotileGroup(map, a.id) || autotileGroup(map, a.id).tiles[0] === a.id) &&
      ($('asset-filter').value === 'all' || a.kind === $('asset-filter').value),
  )) {
    const button = document.createElement('button');
    button.className = `asset ${a.id === selectedAsset ? 'active' : ''}`;
    const img = document.createElement('img');
    img.src = a.image || builtinCanvas(a.builtin, a.variant).toDataURL();
    img.alt = a.name;
    const name = document.createElement('span');
    name.textContent = a.name;
    button.append(img, name);
    button.onclick = () => {
      selectedAsset = a.id;
      $('layer').value =
        a.kind === 'terrain'
          ? 'terrain'
          : (a.defaultLayer ??
            (OBJECT_LAYERS.includes($('layer').value) ? $('layer').value : 'objects'));
      setTool(a.kind === 'terrain' ? 'brush' : 'place');
      layerPanel();
      palette();
    };
    $('palette').append(button);
  }
  assetPanel();
}
function selectedItem() {
  return selection ? map[selection.list].find((i) => i.id === selection.id) : null;
}
function selectionPanel() {
  const item = selectedItem();
  if (!item) selection = null;
  $('selection-fields').hidden = !item;
  $('selection-info').textContent = item
    ? item.type
      ? `${item.type} · ${item.label || item.id}`
      : map.assets.find((a) => a.id === item.asset)?.name
    : 'Usa Seleziona e clicca un oggetto o punto gameplay.';
  $('instance-collision').hidden = !item?.asset;
  if (item?.asset) {
    $('item-layer').value = item.layer ?? 'objects';
    $('instance-mode').value =
      item.collider === undefined
        ? 'inherit'
        : item.collider === null
          ? 'none'
          : item.collider.type === 'polygon'
            ? 'polygon'
            : 'rectangle';
    const c = item.collider ?? assetsFor(item).collider;
    for (const [field, v] of [
      ['instance-x', c?.x ?? -8],
      ['instance-y', c?.y ?? -8],
      ['instance-w', c?.width ?? 16],
      ['instance-h', c?.height ?? 8],
    ])
      $(field).value = v;
    $('instance-points').value =
      c?.type === 'polygon' ? c.points.map((p) => `${p.x}, ${p.y}`).join('\n') : '';
  }
  $('item-destination').disabled = item?.type !== 'portal';
  $('item-destination').value = item?.destination ?? '';
  if (item) {
    $('item-x').value = item.x;
    $('item-y').value = item.y;
    $('item-label').value = item.label ?? '';
    $('item-label').disabled = !item.type;
  }
}
function hit(x, y) {
  if ($('layer').value === 'markers') {
    const item = [...map.markers]
      .reverse()
      .find((m) => Math.hypot(m.x - x, m.y - y) < 16 / scene.cameras.main.zoom);
    return item ? { list: 'markers', id: item.id } : null;
  }
  const item = [...map.objects]
    .filter(
      (o) =>
        (o.layer ?? 'objects') === $('layer').value &&
        layerState(map, o.layer ?? 'objects').visible,
    )
    .sort((a, b) => objectDepth(map, b) - objectDepth(map, a))
    .find((o) => {
      const a = map.assets.find((a) => a.id === o.asset),
        left = o.x - a.width * a.originX,
        top = o.y - a.height * a.originY;
      return x >= left && x <= left + a.width && y >= top && y <= top + a.height;
    });
  return item ? { list: 'objects', id: item.id } : null;
}
function snapped(x, y) {
  const step = $('snap').checked ? map.tileSize : 1;
  return {
    x: Math.max(0, Math.min(map.width * map.tileSize - 1, Math.round(x / step) * step)),
    y: Math.max(0, Math.min(map.height * map.tileSize - 1, Math.round(y / step) * step)),
  };
}
function valueForLayer() {
  return $('layer').value === 'collisions'
    ? tool !== 'erase'
    : tool === 'erase'
      ? null
      : asset()?.kind === 'terrain'
        ? canonicalTile(map, selectedAsset)
        : null;
}
function removeSelection() {
  if (testing || !selectedItem() || !itemEditable(selectedItem())) return;
  checkpoint();
  map[selection.list] = map[selection.list].filter((i) => i.id !== selection.id);
  selection = null;
  finish();
}
class EditorScene extends Phaser.Scene {
  constructor() {
    super('editor');
    this.polygonDraft = null;
    this.tileNodes = [];
    this.objectNodes = new Map();
    this.markerNodes = [];
    this.drag = null;
  }
  async create() {
    scene = this;
    this.input.mouse.disableContextMenu();
    // Browser shortcuts/form fields must retain their keyboard events.
    this.held = new Set();
    window.addEventListener('keydown', (e) => {
      if (!isField(e.target)) this.held.add(e.code);
    });
    window.addEventListener('keyup', (e) => this.held.delete(e.code));
    window.addEventListener('blur', () => {
      this.held.clear();
      this.endStroke();
    });
    this.overlay = this.add.graphics().setDepth(1e8);
    this.avatar = this.add.graphics().setVisible(false);
    this.avatar
      .fillStyle(0x191f30)
      .fillRect(-10, -32, 20, 30)
      .fillStyle(0xd6bb79)
      .fillRect(-6, -35, 12, 10)
      .fillStyle(0x829abb)
      .fillRect(-9, -23, 18, 15)
      .fillStyle(0xd6bb79)
      .fillRect(-10, -16, 20, 3);
    this.input.on('pointerdown', (p) => this.startStroke(p));
    this.input.on('pointermove', (p) => this.moveStroke(p));
    this.input.on('pointerup', () => this.endStroke());
    this.input.on('pointerupoutside', () => this.endStroke());
    window.addEventListener('pointerup', () => this.endStroke());
    this.input.on('wheel', (p, _objects, _dx, dy) => {
      if (testing) return;
      const cam = this.cameras.main,
        before = cam.getWorldPoint(p.x, p.y);
      cam.setZoom(Phaser.Math.Clamp(cam.zoom * (dy > 0 ? 0.9 : 1.1), 0.15, 4));
      cam.preRender();
      const after = cam.getWorldPoint(p.x, p.y);
      cam.scrollX += before.x - after.x;
      cam.scrollY += before.y - after.y;
      $('zoom').textContent = `${Math.round(cam.zoom * 100)}%`;
    });
    await prepareTextures(this, map.assets);
    this.sync();
    this.fit();
    status('Pronto · dipingi il terreno o importa i tuoi PNG.');
  }
  fit() {
    const cam = this.cameras.main;
    cam.setZoom(
      Math.max(
        0.15,
        Math.min(
          1.5,
          (this.scale.width - 50) / (map.width * map.tileSize),
          (this.scale.height - 50) / (map.height * map.tileSize),
        ),
      ),
    );
    cam.centerOn((map.width * map.tileSize) / 2, (map.height * map.tileSize) / 2);
    $('zoom').textContent = `${Math.round(cam.zoom * 100)}%`;
  }
  sync() {
    const count = map.width * map.height;
    for (let i = count; i < this.tileNodes.length; i++) this.tileNodes[i]?.destroy();
    this.tileNodes.length = count;
    const assets = new Map(map.assets.map((a) => [a.id, a]));
    for (let i = 0; i < count; i++) {
      const a = assets.get(renderedTile(map, i % map.width, Math.floor(i / map.width)));
      if (!a) {
        this.tileNodes[i]?.destroy();
        this.tileNodes[i] = null;
        continue;
      }
      const node =
        this.tileNodes[i] ?? this.add.image(0, 0, textureKey(a)).setOrigin(0).setDepth(-10000);
      node
        .setTexture(textureKey(a))
        .setPosition((i % map.width) * map.tileSize, Math.floor(i / map.width) * map.tileSize)
        .setDisplaySize(map.tileSize, map.tileSize);
      node.setVisible(testing || layerState(map, 'terrain').visible);
      this.tileNodes[i] = node;
    }
    const ids = new Set(map.objects.map((o) => o.id));
    for (const [id, node] of this.objectNodes)
      if (!ids.has(id)) {
        node.destroy();
        this.objectNodes.delete(id);
      }
    for (const o of map.objects) {
      const a = assets.get(o.asset),
        node = this.objectNodes.get(o.id) ?? this.add.image(o.x, o.y, textureKey(a));
      node
        .setTexture(textureKey(a))
        .setPosition(o.x, o.y)
        .setOrigin(a.originX, a.originY)
        .setDisplaySize(a.width, a.height)
        .setDepth(objectDepth(map, o))
        .setVisible(testing || layerState(map, o.layer ?? 'objects').visible);
      this.objectNodes.set(o.id, node);
    }
    this.markerNodes.forEach((n) => n.destroy());
    this.markerNodes = [];
    for (const m of map.markers) {
      const label = this.add
        .text(m.x + 13, m.y - 8, m.label || m.type, {
          fontSize: '11px',
          fontFamily: 'system-ui',
          color: '#e7eee6',
          backgroundColor: '#13261ddd',
          padding: { x: 4, y: 3 },
        })
        .setDepth(1e8 + 1)
        .setVisible(!testing && layerState(map, 'markers').visible);
      this.markerNodes.push(label);
    }
    this.drawOverlay();
  }
  drawOverlay() {
    const g = this.overlay;
    g.clear();
    if (!testing && $('show-grid').checked) {
      g.lineStyle(1 / this.cameras.main.zoom, 0xc1dac8, 0.1);
      for (let x = 0; x <= map.width; x++)
        g.lineBetween(x * map.tileSize, 0, x * map.tileSize, map.height * map.tileSize);
      for (let y = 0; y <= map.height; y++)
        g.lineBetween(0, y * map.tileSize, map.width * map.tileSize, y * map.tileSize);
    }
    g.lineStyle(2 / this.cameras.main.zoom, 0xa4b99c, 0.7).strokeRect(
      0,
      0,
      map.width * map.tileSize,
      map.height * map.tileSize,
    );
    if ($('show-collisions').checked && (testing || layerState(map, 'collisions').visible))
      for (const shape of collisionShapes(map)) drawShape(g, shape, 0xee8980, 0.24);
    const selected = selectedItem();
    if (!testing && selected?.asset) {
      const shape = objectCollider(map, selected);
      if (shape) drawShape(g, shape, 0xffde89, 0.35);
    }
    if (!testing) {
      for (const m of map.markers.filter(() => layerState(map, 'markers').visible))
        g.fillStyle(colors[m.type], 0.9)
          .fillCircle(m.x, m.y, 8)
          .lineStyle(2, colors[m.type])
          .strokeCircle(m.x, m.y, 11);
      const item = selectedItem();
      if (item?.asset) {
        const a = assetsFor(item);
        g.lineStyle(2, 0xffe2a0).strokeRect(
          item.x - a.width * a.originX,
          item.y - a.height * a.originY,
          a.width,
          a.height,
        );
        g.fillStyle(0xffe2a0).fillCircle(item.x, item.y, 3);
      } else if (item) g.lineStyle(2, 0xffe2a0).strokeCircle(item.x, item.y, 16);
      if (this.polygonDraft) {
        const object = map.objects.find((o) => o.id === this.polygonDraft.id);
        if (object) {
          const points = this.polygonDraft.points.map((p) => ({
            x: p.x + object.x,
            y: p.y + object.y,
          }));
          g.lineStyle(2, 0xffe2a0).strokePoints(points, false);
          for (const p of points) g.fillStyle(0xffe2a0).fillCircle(p.x, p.y, 4);
        }
      }
      if (this.drag?.colliderRect) drawShape(g, this.drag.preview, 0xffde89, 0.3);
      if (this.drag?.rect) {
        const a = this.drag.startCell,
          b = this.drag.endCell;
        g.fillStyle(0xe9c884, 0.2).fillRect(
          Math.min(a.x, b.x) * map.tileSize,
          Math.min(a.y, b.y) * map.tileSize,
          (Math.abs(a.x - b.x) + 1) * map.tileSize,
          (Math.abs(a.y - b.y) + 1) * map.tileSize,
        );
      }
    }
  }
  world(p) {
    return this.cameras.main.getWorldPoint(p.x, p.y);
  }
  startStroke(p) {
    if (testing) return;
    if (p.middleButtonDown() || p.rightButtonDown() || this.held.has('Space')) {
      this.drag = { pan: true, x: p.x, y: p.y };
      return;
    }
    const point = this.world(p),
      index = cell(map, point.x, point.y);
    if (index < 0) return;
    const layer = $('layer').value;
    if (!editableLayer(map, layer)) {
      status('Livello nascosto o bloccato: attiva visibilità e sbloccalo.');
      return;
    }
    if (tool === 'collider-poly' || tool === 'collider-rect') {
      const item = selectedItem();
      if (!item?.asset || !itemEditable(item)) {
        status('Seleziona prima un oggetto modificabile.');
        return;
      }
      if (tool === 'collider-poly') {
        if (!this.polygonDraft || this.polygonDraft.id !== item.id)
          this.polygonDraft = { id: item.id, points: [] };
        if (this.polygonDraft.points.length >= 32) {
          status('Massimo 32 vertici. Premi Invio per chiudere.');
          return;
        }
        this.polygonDraft.points.push({
          x: Math.round(point.x - item.x),
          y: Math.round(point.y - item.y),
        });
        this.drawOverlay();
        status('Clicca i vertici del contorno; Invio chiude, Esc annulla.');
      } else
        this.drag = {
          colliderRect: true,
          id: item.id,
          start: point,
          preview: { x: point.x, y: point.y, width: 1, height: 1 },
        };
      return;
    }
    if (tool === 'select') {
      selection = hit(point.x, point.y);
      selectionPanel();
      if (selection) {
        const item = selectedItem();
        checkpoint();
        this.drag = { select: true, dx: point.x - item.x, dy: point.y - item.y };
      }
      this.drawOverlay();
      return;
    }
    if (tool === 'erase' && [...OBJECT_LAYERS, 'markers'].includes(layer)) {
      selection = hit(point.x, point.y);
      removeSelection();
      return;
    }
    if (OBJECT_LAYERS.includes(layer) || layer === 'markers') {
      if (!['place', 'brush'].includes(tool)) {
        status('Usa Posiziona o Seleziona su questo livello.');
        return;
      }
      if (OBJECT_LAYERS.includes(layer) && asset()?.kind !== 'object') {
        status('Seleziona un asset oggetto.');
        return;
      }
      if (
        (OBJECT_LAYERS.includes(layer) ? map.objects : map.markers).length >=
        (layer === 'markers' ? 2000 : 10000)
      ) {
        status('Limite elementi raggiunto.');
        return;
      }
      checkpoint();
      const pos = snapped(point.x, point.y);
      const list = layer === 'markers' ? 'markers' : 'objects';
      const item =
        list === 'objects'
          ? { id: id(), asset: selectedAsset, layer, ...pos }
          : {
              id: id(),
              type: $('marker-type').value,
              label: $('marker-label').value.trim(),
              ...($('marker-type').value === 'portal'
                ? { destination: $('marker-destination').value.trim() }
                : {}),
              ...pos,
            };
      // A map has one canonical player entrance.
      if (item.type === 'spawn') map.markers = map.markers.filter((m) => m.type !== 'spawn');
      map[list].push(item);
      selection = { list, id: item.id };
      finish();
      return;
    }
    if (
      tool === 'place' ||
      (layer === 'terrain' && tool !== 'erase' && asset()?.kind !== 'terrain')
    ) {
      status('Seleziona un terreno e usa il pennello.');
      return;
    }
    checkpoint();
    const c = { x: index % map.width, y: Math.floor(index / map.width) };
    if (tool === 'fill') {
      floodFill(map, layer, index, valueForLayer());
      finish();
      return;
    }
    this.drag = {
      layer,
      value: valueForLayer(),
      startCell: c,
      endCell: c,
      rect: tool === 'rect',
      last: c,
    };
    if (!this.drag.rect) paint(map, layer, c.x, c.y, +$('brush-size').value, this.drag.value);
    this.sync();
  }
  moveStroke(p) {
    const point = this.world(p);
    $('coords').textContent =
      `X ${Math.round(point.x)} · Y ${Math.round(point.y)} · cella ${Math.floor(point.x / map.tileSize)}, ${Math.floor(point.y / map.tileSize)}`;
    if (!this.drag || testing) return;
    if (this.drag.pan) {
      this.cameras.main.scrollX -= (p.x - this.drag.x) / this.cameras.main.zoom;
      this.cameras.main.scrollY -= (p.y - this.drag.y) / this.cameras.main.zoom;
      this.drag.x = p.x;
      this.drag.y = p.y;
      return;
    }
    if (this.drag.colliderRect) {
      this.drag.preview = {
        x: Math.round(Math.min(this.drag.start.x, point.x)),
        y: Math.round(Math.min(this.drag.start.y, point.y)),
        width: Math.max(1, Math.round(Math.abs(point.x - this.drag.start.x))),
        height: Math.max(1, Math.round(Math.abs(point.y - this.drag.start.y))),
      };
      this.drawOverlay();
      return;
    }
    if (this.drag.select) {
      Object.assign(selectedItem(), snapped(point.x - this.drag.dx, point.y - this.drag.dy));
      this.sync();
      return;
    }
    const i = cell(map, point.x, point.y);
    if (i < 0) return;
    const c = { x: i % map.width, y: Math.floor(i / map.width) };
    this.drag.endCell = c;
    if (!this.drag.rect) {
      const a = this.drag.last,
        steps = Math.max(Math.abs(a.x - c.x), Math.abs(a.y - c.y), 1);
      for (let n = 0; n <= steps; n++)
        paint(
          map,
          this.drag.layer,
          Math.round(a.x + ((c.x - a.x) * n) / steps),
          Math.round(a.y + ((c.y - a.y) * n) / steps),
          +$('brush-size').value,
          this.drag.value,
        );
      this.drag.last = c;
      this.sync();
    } else this.drawOverlay();
  }
  endStroke() {
    if (!this.drag) return;
    const d = this.drag;
    this.drag = null;
    if (d.colliderRect) {
      const item = map.objects.find((o) => o.id === d.id);
      if (item)
        try {
          const shape = { ...d.preview, x: d.preview.x - item.x, y: d.preview.y - item.y };
          validateShape(shape);
          checkpoint();
          item.collider = cleanShape(shape);
          finish();
          status('Collisione modificata solo per questa istanza.');
        } catch (e) {
          status(e.message);
        }
      return;
    }
    if (d.rect) rectangle(map, d.layer, d.startCell, d.endCell, d.value);
    if (!d.pan) finish();
  }
  update(_time, delta) {
    if (!testing || !player) return;
    const x =
      Number(this.held.has('KeyD') || this.held.has('ArrowRight')) -
      Number(this.held.has('KeyA') || this.held.has('ArrowLeft'));
    const y =
      Number(this.held.has('KeyS') || this.held.has('ArrowDown')) -
      Number(this.held.has('KeyW') || this.held.has('ArrowUp'));
    const length = Math.hypot(x, y) || 1,
      speed = (150 * Math.min(delta, 60)) / 1000;
    movePlayer(map, player, (x / length) * speed, (y / length) * speed, blockers);
    this.avatar.setPosition(player.x, player.y).setDepth(player.y + 0.1);
    this.cameras.main.centerOn(player.x, player.y);
  }
}
function assetsFor(item) {
  return map.assets.find((a) => a.id === item.asset);
}
function isField(target) {
  return ['INPUT', 'SELECT', 'TEXTAREA'].includes(target?.tagName);
}
function toggleTest() {
  if (!scene) return;
  scene.endStroke();
  if (!testing) {
    blockers = collisionShapes(map);
    player = findSpawn(map, blockers);
    if (!player) {
      status('Nessuna posizione libera: correggi le collisioni.');
      return;
    }
    const spawn = map.markers.find((m) => m.type === 'spawn');
    status(
      spawn && !canStand(map, spawn.x, spawn.y, 9, blockers)
        ? 'Ingresso bloccato: prova da una cella libera. WASD / frecce.'
        : 'Prova attiva · WASD / frecce · Esc per uscire.',
    );
  }
  testing = !testing;
  document.body.classList.toggle('testing', testing);
  scene.avatar.setVisible(testing);
  scene.held.clear();
  $('test').textContent = testing ? '■ Torna all’editor' : '▶ Prova mappa';
  if (testing) scene.cameras.main.setZoom(1.5);
  else {
    scene.fit();
    status('Modalità editor.');
  }
  scene.sync();
  setTool(tool);
}
async function loadMap(next) {
  const validated = validateMap(next);
  if (!scene) return;
  await prepareTextures(scene, validated.assets);
  if (validated.review.status === 'approved' && reviewMap(validated).length)
    validated.review.status = 'draft';
  if (testing) toggleTest();
  scene.polygonDraft = null;
  checkpoint();
  map = validated;
  selection = null;
  syncForm();
  palette();
  finish(true);
  scene.fit();
}
$('layer').onchange = () => {
  scene?.endStroke();
  setTool([...OBJECT_LAYERS, 'markers'].includes($('layer').value) ? 'place' : 'brush');
  layerPanel();
};
$('marker-type').onchange = () => {
  $('layer').value = 'markers';
  setTool('place');
};
$('asset-filter').onchange = palette;
for (const name of ['show-grid', 'show-collisions']) $(name).onchange = () => scene?.drawOverlay();
$('fit').onclick = () => scene?.fit();
$('test').onclick = toggleTest;
async function applyHistory(method) {
  if (testing || !scene) return;
  scene.endStroke();
  scene.polygonDraft = null;
  const next = history[method](map);
  await prepareTextures(scene, next.assets);
  map = next;
  selection = null;
  syncForm();
  palette();
  finish(true);
}
$('undo').onclick = () => applyHistory('undo');
$('redo').onclick = () => applyHistory('redo');
$('map-name').onchange = () => {
  if (testing) return;
  checkpoint();
  map.name = $('map-name').value.trim();
  finish();
};
$('resize').onclick = () => {
  if (testing || !scene) return;
  try {
    const next = resizeMap(map, +$('width').value, +$('height').value, +$('tile-size').value);
    if (
      (next.width < map.width || next.height < map.height) &&
      !confirm('Ridurre la mappa elimina le celle e gli elementi esterni. Continuare?')
    )
      return;
    checkpoint();
    map = next;
    selection = null;
    finish();
    scene.fit();
  } catch (e) {
    status(e.message);
    syncForm();
  }
};
$('new').onclick = async () => {
  if (
    !scene ||
    (!saved && !confirm('Creare una nuova mappa? Esporta JSON per conservare la mappa attuale.'))
  )
    return;
  try {
    await loadMap(newMap());
  } catch (e) {
    status(e.message);
  }
};
$('load').onclick = () => $('json-file').click();
$('json-file').onchange = async (e) => {
  const file = e.target.files[0];
  e.target.value = '';
  if (!file) return;
  try {
    if (file.size > 40_000_000) throw new Error('JSON troppo grande (massimo 40 MB).');
    const next = validateMap(JSON.parse(await file.text()));
    if (!saved && !confirm('Aprire questa mappa sostituirà la bozza attuale. Continuare?')) return;
    await loadMap(next);
    status('Mappa importata.');
  } catch (e) {
    status(`Importazione fallita: ${e.message}`);
  }
};
$('save').onclick = () => {
  if (!scene) return;
  scene.endStroke();
  try {
    const checked = validateMap(map),
      blob = new Blob([JSON.stringify(checked, null, 2)], { type: 'application/json' });
    if (blob.size > 40_000_000) throw new Error('Il progetto supera 40 MB: usa PNG più piccoli.');
    const url = URL.createObjectURL(blob),
      a = document.createElement('a');
    a.href = url;
    a.download = `${map.name.replace(/[^a-z0-9_-]+/gi, '-').slice(0, 80) || 'aetheria-map'}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    saved = true;
    status('JSON esportato con PNG, collisioni e punti gameplay.');
  } catch (e) {
    status(e.message);
  }
};
$('apply-asset').onclick = () => {
  if (testing || !asset()) return;
  const target = asset(),
    group = autotileGroup(map, target.id),
    ids = group ? group.tiles : [target.id];
  if (
    (target.kind === 'terrain' &&
      !editableLayer(map, 'terrain') &&
      map.terrain.some((id) => ids.includes(id))) ||
    (target.kind === 'object' && map.objects.some((o) => o.asset === target.id && !itemEditable(o)))
  ) {
    status('Asset usato su un livello nascosto o bloccato: sbloccalo prima di modificare l’asset.');
    return;
  }
  try {
    const next = clone(map),
      a = next.assets.find((a) => a.id === selectedAsset);
    Object.assign(a, {
      width: +$('asset-w').value,
      height: +$('asset-h').value,
      originX: +$('origin-x').value,
      originY: +$('origin-y').value,
    });
    const solid = $('asset-solid').checked;
    if (a.kind === 'terrain') {
      const group = autotileGroup(next, a.id);
      for (const variant of next.assets.filter((v) =>
        group ? group.tiles.includes(v.id) : v.id === a.id,
      ))
        variant.solid = solid;
    } else
      a.collider =
        solid && a.collider?.type === 'polygon'
          ? a.collider
          : solid
            ? {
                x: +$('col-x').value,
                y: +$('col-y').value,
                width: +$('col-w').value,
                height: +$('col-h').value,
              }
            : null;
    validateMap(next);
    checkpoint();
    map = next;
    finish();
    status('Asset aggiornato in tutte le sue istanze.');
  } catch (e) {
    status(e.message);
  }
};
$('delete-item').onclick = removeSelection;
$('apply-item').onclick = () => {
  if (testing || !selectedItem() || !itemEditable(selectedItem())) return;
  const x = +$('item-x').value,
    y = +$('item-y').value;
  if (
    !Number.isFinite(x) ||
    !Number.isFinite(y) ||
    x < 0 ||
    y < 0 ||
    x >= map.width * map.tileSize ||
    y >= map.height * map.tileSize
  ) {
    status('Posizione fuori mappa.');
    return;
  }
  checkpoint();
  const item = selectedItem();
  Object.assign(item, { x, y });
  if (item.type) item.label = $('item-label').value;
  if (item.type === 'portal') item.destination = $('item-destination').value.trim();
  finish();
};
$('import-png').onclick = () => {
  pngMode = 'object';
  $('png-file').click();
};
$('import-autotile').onclick = () => {
  pngMode = 'autotile';
  $('png-file').click();
};
$('import-tiles').onclick = () => {
  pngMode = 'terrain';
  $('png-file').click();
};
$('png-file').onchange = async (e) => {
  const files = [...e.target.files];
  e.target.value = '';
  if (testing || !scene || !files.length) return;
  try {
    const imported = [],
      groups = [];
    for (const file of files) {
      if (file.type !== 'image/png' || file.size > 10_000_000)
        throw new Error('Usa PNG inferiori a 10 MB.');
      const buffer = await file.arrayBuffer(),
        signature = new Uint8Array(buffer, 0, 8);
      if ([137, 80, 78, 71, 13, 10, 26, 10].some((v, i) => signature[i] !== v))
        throw new Error('File non è un PNG valido.');
      const view = new DataView(buffer),
        w = view.getUint32(16),
        h = view.getUint32(20);
      if (w > 8192 || h > 8192) throw new Error('PNG massimo 8192 × 8192.');
      const image = await createImageBitmap(file),
        name = file.name.replace(/\.png$/i, '').slice(0, 70);
      try {
        const data = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
        if (pngMode === 'object') {
          if (w > 2048 || h > 2048) throw new Error('Oggetto PNG massimo 2048 × 2048.');
          imported.push({
            id: id(),
            name,
            kind: 'object',
            image: data,
            width: w,
            height: h,
            originX: 0.5,
            originY: 1,
            collider: null,
          });
        } else {
          const t = map.tileSize;
          if (pngMode === 'autotile' && (w !== t * 4 || h !== t * 4))
            throw new Error(
              `Autotile: usa un foglio 4 × 4, ${t * 4} × ${t * 4} px, ordinato per maschera 0–15.`,
            );
          const start = imported.length;
          if (w % t || h % t)
            throw new Error(
              `Il tileset deve avere dimensioni multiple di ${t} px, senza margini/spaziatura.`,
            );
          if (((w / t) * h) / t + imported.length + map.assets.length > 2048)
            throw new Error('Tileset troppo grande: massimo 2048 asset totali.');
          const c = document.createElement('canvas');
          c.width = c.height = t;
          const ctx = c.getContext('2d');
          for (let y = 0; y < h; y += t)
            for (let x = 0; x < w; x += t) {
              ctx.clearRect(0, 0, t, t);
              ctx.drawImage(image, x, y, t, t, 0, 0, t, t);
              imported.push({
                id: id(),
                name: `${name} ${x / t},${y / t}`,
                kind: 'terrain',
                image: c.toDataURL(),
                width: t,
                height: t,
                originX: 0,
                originY: 0,
                collider: null,
                solid: false,
              });
            }
          if (pngMode === 'autotile')
            groups.push({ id: id(), name, tiles: imported.slice(start).map((a) => a.id) });
        }
      } finally {
        image.close();
      }
    }
    const next = clone(map);
    next.assets.push(...imported);
    next.autotiles.push(...groups);
    validateMap(next);
    if (JSON.stringify(next).length > 40_000_000)
      throw new Error('Progetto oltre 40 MB: riduci gli asset.');
    await prepareTextures(scene, imported);
    checkpoint();
    map = next;
    selectedAsset = imported[0].id;
    $('asset-filter').value = 'all';
    $('layer').value = pngMode !== 'object' ? 'terrain' : 'objects';
    setTool(pngMode !== 'object' ? 'brush' : 'place');
    palette();
    finish();
    status(`${imported.length} asset importati. Imposta la collisione prima di posizionarli.`);
  } catch (e) {
    status(`Importazione PNG fallita: ${e.message}`);
  }
};
window.addEventListener('keydown', (e) => {
  if (isField(e.target)) return;
  if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code))
    e.preventDefault();
  if (e.code === 'Escape' && scene?.polygonDraft) {
    scene.polygonDraft = null;
    scene.drawOverlay();
    setTool('select');
    status('Poligono annullato.');
    return;
  }
  if (e.code === 'Enter' && scene?.polygonDraft) {
    e.preventDefault();
    commitPolygon();
    return;
  }
  if (e.code === 'Escape' && testing) {
    toggleTest();
    return;
  }
  if (testing) return;
  const mod = e.ctrlKey || e.metaKey;
  if (mod && e.code === 'KeyZ') {
    e.preventDefault();
    applyHistory(e.shiftKey ? 'redo' : 'undo');
  }
  if (mod && e.code === 'KeyY') {
    e.preventDefault();
    applyHistory('redo');
  }
  if (e.code === 'Delete' || e.code === 'Backspace') {
    e.preventDefault();
    removeSelection();
  }
  if (mod && e.code === 'KeyC' && selectedItem()) {
    e.preventDefault();
    clipboard = { list: selection.list, item: clone(selectedItem()) };
    status('Elemento copiato.');
  }
  if (
    mod &&
    e.code === 'KeyV' &&
    clipboard &&
    editableLayer(
      map,
      clipboard.item.layer ?? (clipboard.list === 'markers' ? 'markers' : 'objects'),
    ) &&
    map[clipboard.list].length < (clipboard.list === 'objects' ? 10000 : 2000)
  ) {
    e.preventDefault();
    if (clipboard.item.asset && !map.assets.some((a) => a.id === clipboard.item.asset)) {
      status('Asset copiato assente dalla mappa attuale.');
      return;
    }
    checkpoint();
    const item = {
      ...clone(clipboard.item),
      id: id(),
      ...snapped(clipboard.item.x + map.tileSize, clipboard.item.y + map.tileSize),
    };
    if (item.type === 'spawn') map.markers = map.markers.filter((m) => m.type !== 'spawn');
    map[clipboard.list].push(item);
    selection = { list: clipboard.list, id: item.id };
    finish();
  }
});

function itemEditable(item) {
  return editableLayer(map, item.type ? 'markers' : (item.layer ?? 'objects'));
}
function drawShape(g, s, color, alpha) {
  g.fillStyle(color, alpha).lineStyle(1, color, 0.85);
  if (s.type === 'polygon') {
    g.fillPoints(s.points, true);
    g.strokePoints(s.points, true);
  } else {
    g.fillRect(s.x, s.y, s.width, s.height);
    g.strokeRect(s.x, s.y, s.width, s.height);
  }
}
function layerPanel() {
  $('layer-controls').replaceChildren();
  for (const l of map.layers) {
    const row = document.createElement('div');
    row.className = 'layer-row';
    const name = document.createElement('button');
    name.textContent = LAYER_NAMES[l.id];
    name.classList.toggle('active', $('layer').value === l.id);
    name.onclick = () => {
      $('layer').value = l.id;
      $('layer').onchange();
      layerPanel();
    };
    const visible = document.createElement('input');
    visible.type = 'checkbox';
    visible.checked = l.visible;
    visible.title = 'Visibilità ' + LAYER_NAMES[l.id];
    visible.setAttribute('aria-label', visible.title);
    const lock = document.createElement('input');
    lock.type = 'checkbox';
    lock.checked = l.locked;
    lock.title = 'Blocca ' + LAYER_NAMES[l.id];
    lock.setAttribute('aria-label', lock.title);
    for (const [field, input] of [
      ['visible', visible],
      ['locked', lock],
    ])
      input.onchange = () => {
        if (testing) {
          input.checked = l[field];
          return;
        }
        scene?.endStroke();
        checkpoint();
        l[field] = input.checked;
        selection = null;
        finish();
      };
    row.append(name, visible, lock);
    $('layer-controls').append(row);
  }
}
function commitPolygon() {
  const draft = scene?.polygonDraft;
  if (!draft) return;
  const item = map.objects.find((o) => o.id === draft.id);
  if (!item || !itemEditable(item)) return;
  try {
    const shape = { type: 'polygon', points: draft.points };
    validateShape(shape);
    checkpoint();
    item.collider = cleanShape(shape);
    scene.polygonDraft = null;
    setTool('select');
    finish();
    status('Poligono applicato solo a questa istanza.');
  } catch (e) {
    status(e.message);
  }
}
$('draw-instance-rect').onclick = () => {
  if (!testing && selectedItem()?.asset && itemEditable(selectedItem())) {
    scene.endStroke();
    setTool('collider-rect');
    status('Trascina il rettangolo sulla base dell’oggetto.');
  }
};
$('draw-instance-poly').onclick = () => {
  if (!testing && selectedItem()?.asset && itemEditable(selectedItem())) {
    scene.endStroke();
    scene.polygonDraft = null;
    setTool('collider-poly');
    status('Clicca vertici in ordine; Invio chiude, Esc annulla.');
  }
};
$('apply-instance').onclick = () => {
  const item = selectedItem();
  if (testing || !item?.asset || !itemEditable(item)) return;
  try {
    const nextLayer = $('item-layer').value;
    if (!editableLayer(map, nextLayer))
      throw new Error('Il livello di destinazione è nascosto o bloccato.');
    const mode = $('instance-mode').value;
    let shape;
    if (mode === 'none') shape = null;
    if (mode === 'rectangle')
      shape = validateShape({
        x: +$('instance-x').value,
        y: +$('instance-y').value,
        width: +$('instance-w').value,
        height: +$('instance-h').value,
      });
    if (mode === 'polygon')
      shape = validateShape({
        type: 'polygon',
        points: $('instance-points')
          .value.trim()
          .split('\n')
          .map((line) => {
            const values = line.split(',').map(Number);
            if (values.length !== 2) throw new Error('Un vertice per riga: X, Y.');
            return { x: values[0], y: values[1] };
          }),
      });
    checkpoint();
    item.layer = nextLayer;
    if (mode === 'inherit') delete item.collider;
    else item.collider = shape === null ? null : cleanShape(shape);
    finish();
    status('Istanza aggiornata; le altre restano invariate.');
  } catch (e) {
    status(e.message);
  }
};
function showReview() {
  scene?.endStroke();
  const issues = reviewMap(map);
  $('review-results').replaceChildren();
  if (!issues.length) {
    $('review-results').textContent = 'Controlli superati: puoi approvare la mappa.';
  }
  for (const issue of issues) {
    const button = document.createElement('button');
    button.className = 'review-issue';
    button.textContent = issue.message;
    button.onclick = () => {
      const item =
        map.markers.find((m) => m.id === issue.item) ??
        map.objects.find((o) => o.id === issue.item);
      if (item) {
        selection = { list: item.type ? 'markers' : 'objects', id: item.id };
        $('layer').value = item.type ? 'markers' : item.layer;
        setTool('select');
        scene.cameras.main.centerOn(item.x, item.y);
        selectionPanel();
        scene.drawOverlay();
      }
    };
    $('review-results').append(button);
  }
  status(issues.length ? `${issues.length} problemi da correggere.` : 'Controlli superati.');
  return issues;
}
$('review-check').onclick = showReview;
$('approve').onclick = () => {
  if (testing) return;
  try {
    const next = approveMap(map);
    history.push(map);
    map = next;
    finish(true);
    status('Mappa approvata. Esporta il JSON; nuove modifiche la riportano in bozza.');
  } catch {
    showReview();
  }
};
$('game-assets').onclick = async () => {
  if (testing || !scene) return;
  const button = $('game-assets');
  button.disabled = true;
  status('Caricamento asset reali di Aetheria…');
  try {
    const next = await addGameLibrary(map);
    await prepareTextures(scene, next.assets);
    checkpoint();
    map = next;
    selectedAsset = 'aetheria-nexus_grass_fill-0';
    $('layer').value = 'terrain';
    setTool('brush');
    palette();
    finish();
    status('Biblioteca Aetheria caricata: terreni, strade, acqua, arredi, edifici e lampioni.');
  } catch (e) {
    status(e.message);
  } finally {
    button.disabled = false;
  }
};
try {
  const draft = localStorage.getItem('aetheria-map-draft-v1');
  if (draft && draft.length <= 40_000_000) {
    map = validateMap(JSON.parse(draft));
    saved = false;
  }
} catch {
  status('Bozza non valida: aperta una nuova mappa.');
}
syncForm();
palette();
layerPanel();
$('review-state').textContent = map.review.status === 'approved' ? 'Approvata' : 'Bozza';
setTool('brush');
new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'canvas',
  backgroundColor: '#0c1711',
  pixelArt: true,
  antialias: false,
  scale: {
    mode: Phaser.Scale.RESIZE,
    width: $('canvas').clientWidth,
    height: $('canvas').clientHeight,
  },
  scene: EditorScene,
  input: { keyboard: { capture: [] } },
});
// Explicit host observer covers sidebar/responsive layout changes as well as window resizing.
new ResizeObserver(() => {
  if (scene) scene.scale.resize($('canvas').clientWidth, $('canvas').clientHeight);
}).observe($('canvas'));
window.addEventListener('beforeunload', (e) => {
  if (!saved) {
    e.preventDefault();
    e.returnValue = '';
  }
});
