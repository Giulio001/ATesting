import { clone, validateMap } from './model.js';
import {
  filterCatalog,
  frameCount,
  frameCrop,
  checkedCrop,
  croppedAsset,
} from './catalog-model.js';
const $ = (id) => document.getElementById(id);
const sourceURL = (e) => '/__aetheria_asset/' + e.path.split('/').map(encodeURIComponent).join('/');
export async function installFullCatalog(importAsset, status) {
  const opener = document.createElement('button');
  opener.id = 'full-game-assets';
  opener.textContent = 'Catalogo completo Aetheria';
  $('game-assets').after(opener);
  document.body.insertAdjacentHTML(
    'beforeend',
    `<dialog id="full-catalog"><header><div><h2>Biblioteca completa Aetheria</h2><p id="fc-summary"></p></div><button id="fc-close">Chiudi</button></header><div class="fc-filters"><label>Categoria<select id="fc-category"></select></label><label>Cerca<input id="fc-search" type="search" placeholder="Alberi, portali, castelli…" /></label></div><div class="fc-body"><div class="fc-results"><div class="row"><button id="fc-prev">←</button><span id="fc-count"></span><button id="fc-next">→</button></div><div id="fc-grid"></div></div><section><h2 id="fc-title">Scegli un elemento</h2><p id="fc-path" class="hint"></p><canvas id="fc-preview" hidden></canvas><audio id="fc-audio" controls hidden></audio><div id="fc-fields" hidden><label>Fotogramma/cella<input id="fc-frame" type="number" min="0" value="0" /></label><label id="fc-named-label" hidden>Elemento dell’atlante<select id="fc-named"></select></label><label>Importa come<select id="fc-kind"><option value="object">Oggetto</option><option value="terrain">Terreno</option></select></label><div class="row"><label>X<input id="fc-x" type="number" /></label><label>Y<input id="fc-y" type="number" /></label></div><div class="row"><label>Larghezza<input id="fc-w" type="number" /></label><label>Altezza<input id="fc-h" type="number" /></label></div></div><p id="fc-note" role="status">Gli originali vengono scaricati al primo utilizzo e conservati sul computer.</p><button id="fc-add" disabled>Aggiungi alla mappa</button><button id="fc-download" disabled>Scarica originale</button></section></div></dialog>`,
  );
  const dialog = $('full-catalog');
  let catalog,
    page = 0,
    generation = 0,
    selected,
    bitmap,
    crop,
    version = 0,
    importing = false;
  function clear() {
    bitmap?.close();
    bitmap = null;
    $('fc-audio').pause();
    $('fc-audio').removeAttribute('src');
  }
  async function image(e) {
    const response = await fetch(sourceURL(e));
    if (!response.ok) throw Error(await response.text());
    const blob = await response.blob();
    let b;
    if (e.path.endsWith('.svg')) {
      const url = URL.createObjectURL(blob),
        img = new Image();
      try {
        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = reject;
          img.src = url;
        });
        b = await createImageBitmap(img);
      } finally {
        URL.revokeObjectURL(url);
      }
    } else b = await createImageBitmap(blob);
    e.width = b.width;
    e.height = b.height;
    if (!e.frameWidth || !e.frameHeight) {
      let n = /\/player_archer\/|\/void_mage_c\/|\/pets\//.test(e.path)
        ? 128
        : /\/player_swordsman\//.test(e.path)
          ? 64
          : /\/player_paperdoll\/|\/player_classes_v[23]\//.test(e.path)
            ? 48
            : null;
      e.frameWidth = n && b.width % n === 0 && b.height % n === 0 ? n : b.width;
      e.frameHeight = n && b.width % n === 0 && b.height % n === 0 ? n : b.height;
    }
    if (e.width % e.frameWidth || e.height % e.frameHeight) {
      e.frameWidth = e.width;
      e.frameHeight = e.height;
    }
    return b;
  }
  function paint() {
    if (!bitmap) return;
    const c = $('fc-preview'),
      scale = Math.min(1, 450 / bitmap.width, 320 / bitmap.height);
    c.width = Math.round(bitmap.width * scale);
    c.height = Math.round(bitmap.height * scale);
    const ctx = c.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(bitmap, 0, 0, c.width, c.height);
    ctx.strokeStyle = '#ffe39b';
    ctx.lineWidth = 2;
    ctx.strokeRect(crop[0] * scale, crop[1] * scale, crop[2] * scale, crop[3] * scale);
  }
  function setCrop(c) {
    crop = c;
    ['x', 'y', 'w', 'h'].forEach((k, i) => ($('fc-' + k).value = c[i]));
    paint();
  }
  async function select(e) {
    if (importing) return;
    const v = ++version;
    clear();
    selected = e;
    crop = null;
    $('fc-title').textContent = e.name;
    $('fc-path').textContent = e.path;
    $('fc-note').textContent = 'Caricamento originale…';
    $('fc-add').disabled = true;
    $('fc-download').disabled = false;
    $('fc-preview').hidden = e.media !== 'image' || e.unavailable;
    $('fc-fields').hidden = e.media !== 'image' || e.unavailable;
    $('fc-audio').hidden = e.media !== 'audio';
    try {
      if (e.unavailable) {
        $('fc-note').textContent =
          'Questa vecchia anteprima non è leggibile nel repository originale. Puoi scaricarla.';
        return;
      }
      if (e.media === 'audio') {
        $('fc-audio').src = sourceURL(e);
        $('fc-note').textContent = 'Anteprima audio. Puoi scaricare l’originale.';
        return;
      }
      if (e.media !== 'image') {
        $('fc-note').textContent = 'File originale disponibile per il download.';
        return;
      }
      const b = await image(e);
      if (v !== version || !dialog.open) {
        b.close();
        return;
      }
      bitmap = b;
      $('fc-frame').value = 0;
      $('fc-frame').max = frameCount(e) - 1;
      $('fc-kind').value = e.kind;
      $('fc-named-label').hidden = !e.frames;
      $('fc-named').replaceChildren();
      for (const [n, f] of (e.frames ?? []).entries()) {
        const o = document.createElement('option');
        o.value = n;
        o.textContent = f.name;
        $('fc-named').append(o);
      }
      setCrop(frameCrop(e));
      $('fc-add').disabled = false;
      $('fc-note').textContent =
        `${e.width} × ${e.height} px · ${frameCount(e)} celle/pose. Le animazioni si importano come pose statiche.`;
    } catch (err) {
      if (v === version) $('fc-note').textContent = err.message;
    }
  }
  async function render() {
    const g = ++generation,
      items = filterCatalog(catalog.entries, $('fc-category').value, $('fc-search').value),
      pages = Math.max(1, Math.ceil(items.length / 24));
    page = Math.min(page, pages - 1);
    $('fc-count').textContent = `${items.length} elementi · ${page + 1}/${pages}`;
    $('fc-prev').disabled = !page;
    $('fc-next').disabled = page === pages - 1;
    const grid = $('fc-grid');
    grid.replaceChildren();
    grid.setAttribute('aria-busy', 'true');
    const jobs = [];
    for (const e of items.slice(page * 24, page * 24 + 24)) {
      const button = document.createElement('button'),
        canvas = document.createElement('canvas'),
        label = document.createElement('span');
      button.className = 'fc-card';
      button.title = e.path;
      canvas.width = 100;
      canvas.height = 80;
      label.textContent = e.name;
      button.append(canvas, label);
      button.onclick = () => select(e);
      grid.append(button);
      jobs.push(async () => {
        if (g !== generation || !dialog.open) return;
        const ctx = canvas.getContext('2d');
        if (e.media !== 'image' || e.unavailable) {
          ctx.fillStyle = '#d9b96d';
          ctx.font = '32px sans-serif';
          ctx.fillText(e.media === 'audio' ? '♫' : '▤', 35, 54);
          return;
        }
        let b;
        try {
          b = await image(e);
          if (g !== generation) return;
          const c = frameCrop(e),
            scale = Math.min(100 / c[2], 80 / c[3]);
          ctx.imageSmoothingEnabled = false;
          ctx.drawImage(
            b,
            ...c,
            (100 - c[2] * scale) / 2,
            (80 - c[3] * scale) / 2,
            c[2] * scale,
            c[3] * scale,
          );
        } catch (err) {
          button.title = e.path + ' · ' + err.message;
          ctx.fillStyle = '#e7a795';
          ctx.fillText('!', 45, 40);
        } finally {
          b?.close();
        }
      });
    }
    let i = 0;
    await Promise.all(
      Array.from({ length: 4 }, async () => {
        while (i < jobs.length) await jobs[i++]();
      }),
    );
    if (g === generation) grid.setAttribute('aria-busy', 'false');
  }
  opener.onclick = async () => {
    try {
      if (document.body.classList.contains('testing')) return;
      catalog ??= await fetch('./full-catalog/catalog.json').then((r) => {
        if (!r.ok) throw Error('Catalogo non disponibile.');
        return r.json();
      });
      $('fc-category').replaceChildren();
      for (const category of ['Tutte', ...new Set(catalog.entries.map((e) => e.category))]) {
        const o = document.createElement('option');
        o.value = category === 'Tutte' ? '' : category;
        o.textContent = category;
        $('fc-category').append(o);
      }
      $('fc-category').value = 'Terreni';
      $('fc-summary').textContent =
        `${catalog.entries.length} file originali · 3355 file grafici e 39 audio`;
      page = 0;
      dialog.showModal();
      render();
    } catch (e) {
      status(e.message);
    }
  };
  $('fc-close').onclick = () => dialog.close();
  dialog.addEventListener('close', () => {
    generation++;
    version++;
    clear();
  });
  $('fc-category').onchange = $('fc-search').oninput = () => {
    page = 0;
    render();
  };
  $('fc-prev').onclick = () => {
    page--;
    render();
  };
  $('fc-next').onclick = () => {
    page++;
    render();
  };
  $('fc-frame').onchange = () => {
    try {
      setCrop(frameCrop(selected, +$('fc-frame').value));
      $('fc-named').value = $('fc-frame').value;
    } catch (e) {
      $('fc-note').textContent = e.message;
    }
  };
  $('fc-named').onchange = () => {
    $('fc-frame').value = $('fc-named').value;
    $('fc-frame').onchange();
  };
  for (const k of ['x', 'y', 'w', 'h'])
    $('fc-' + k).oninput = () => {
      crop = ['x', 'y', 'w', 'h'].map((k) => +$('fc-' + k).value);
      paint();
    };
  $('fc-preview').onclick = (e) => {
    if (!selected?.tileGrid) return;
    const box = e.currentTarget.getBoundingClientRect(),
      x = ((e.clientX - box.left) / box.width) * selected.width,
      y = ((e.clientY - box.top) / box.height) * selected.height;
    const n =
      Math.floor(y / selected.frameHeight) * Math.floor(selected.width / selected.frameWidth) +
      Math.floor(x / selected.frameWidth);
    try {
      $('fc-frame').value = n;
      setCrop(frameCrop(selected, n));
    } catch {}
  };
  $('fc-add').onclick = async () => {
    if (importing || !bitmap) return;
    importing = true;
    $('fc-add').disabled = true;
    try {
      checkedCrop(selected, crop);
      const c = document.createElement('canvas');
      c.width = crop[2];
      c.height = crop[3];
      c.getContext('2d').drawImage(bitmap, ...crop, 0, 0, crop[2], crop[3]);
      await importAsset(croppedAsset(selected, crop, c.toDataURL('image/png'), $('fc-kind').value));
      $('fc-note').textContent =
        'Asset aggiunto alla palette. Puoi continuare o chiudere la biblioteca.';
    } catch (e) {
      $('fc-note').textContent = e.message;
    } finally {
      importing = false;
      $('fc-add').disabled = !bitmap;
    }
  };
  $('fc-download').onclick = async () => {
    try {
      const r = await fetch(sourceURL(selected));
      if (!r.ok) throw Error(await r.text());
      const url = URL.createObjectURL(await r.blob()),
        a = document.createElement('a');
      a.href = url;
      a.download = selected.path.split('/').at(-1);
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) {
      $('fc-note').textContent = e.message;
    }
  };
}
