import { validateMap, clone } from './model.js';
// Same-origin packaged PNGs only. Projects embed their crops, so exported JSON
// remains portable and never needs GitHub credentials or external URLs.
export async function addGameLibrary(map) {
  const base = `${import.meta.env.BASE_URL}game-assets/`;
  const response = await fetch(base + 'catalog.json');
  if (!response.ok) throw new Error('Biblioteca Aetheria non disponibile.');
  const catalog = await response.json(),
    sources = new Map(),
    next = clone(map);
  try {
    for (const entry of catalog.assets) {
      if (next.assets.some((a) => a.id === entry.id)) continue;
      if (!/^[\w/-]+\.png$/.test(entry.source) || entry.source.includes('..'))
        throw new Error('Percorso biblioteca non valido.');
      let source = sources.get(entry.source);
      if (!source) {
        const image = await fetch(base + entry.source);
        if (!image.ok) throw new Error(`Asset non disponibile: ${entry.name}`);
        source = await createImageBitmap(await image.blob());
        sources.set(entry.source, source);
      }
      const crop = entry.crop ?? [0, 0, source.width, source.height];
      const canvas = document.createElement('canvas');
      canvas.width = crop[2];
      canvas.height = crop[3];
      const context = canvas.getContext('2d');
      context.drawImage(source, ...crop, 0, 0, crop[2], crop[3]);
      const { source: _source, crop: _crop, ...asset } = entry;
      next.assets.push({ ...asset, image: canvas.toDataURL('image/png') });
    }
    for (const group of catalog.autotiles)
      if (!next.autotiles.some((g) => g.id === group.id)) next.autotiles.push(group);
    validateMap(next);
    if (JSON.stringify(next).length > 40_000_000)
      throw new Error('Biblioteca supera il limite progetto di 40 MB.');
    next.review = { status: 'draft' };
    return next;
  } finally {
    for (const image of sources.values()) image.close();
  }
}
