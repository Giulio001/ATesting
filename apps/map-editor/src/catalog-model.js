export function filterCatalog(entries, category = '', query = '') {
  const q = query.trim().toLocaleLowerCase('it');
  return entries.filter(
    (e) =>
      (!category || e.category === category) &&
      `${e.name} ${e.path} ${(e.frames ?? []).map((f) => f.name).join(' ')}`
        .toLocaleLowerCase('it')
        .includes(q),
  );
}
export function frameCount(e) {
  return (
    e.frames?.length ?? Math.floor(e.width / e.frameWidth) * Math.floor(e.height / e.frameHeight)
  );
}
export function frameCrop(e, n = 0) {
  if (!Number.isInteger(n) || n < 0 || n >= frameCount(e)) throw Error('Fotogramma non valido.');
  return (
    e.frames?.[n]?.crop ?? [
      (n % Math.floor(e.width / e.frameWidth)) * e.frameWidth,
      Math.floor(n / Math.floor(e.width / e.frameWidth)) * e.frameHeight,
      e.frameWidth,
      e.frameHeight,
    ]
  );
}
export function checkedCrop(e, c) {
  const [x, y, w, h] = c;
  if (
    c.length !== 4 ||
    !c.every(Number.isInteger) ||
    x < 0 ||
    y < 0 ||
    w < 1 ||
    h < 1 ||
    w > 2048 ||
    h > 2048 ||
    x + w > e.width ||
    y + h > e.height
  )
    throw Error('Scegli un ritaglio interno al foglio, fino a 2048 × 2048 px.');
  return c;
}
export function croppedAsset(e, c, image, kind = e.kind) {
  checkedCrop(e, c);
  if (!['terrain', 'object'].includes(kind)) throw Error('Tipo asset non valido.');
  const f = e.frames?.find((f) => f.crop.every((v, i) => v === c[i])),
    origin = f?.origin ?? [0.5, e.originY ?? 1];
  return {
    id: `${e.id}-${kind}-${c.join('-')}`.slice(0, 100),
    name: (f ? `${e.name} · ${f.name}` : `${e.name} [${c[0]},${c[1]}]`).slice(0, 100),
    kind,
    width: c[2],
    height: c[3],
    originX: kind === 'terrain' ? 0 : origin[0],
    originY: kind === 'terrain' ? 0 : origin[1],
    collider: null,
    solid: kind === 'terrain' && /water/.test(e.path) && !/bridge/.test(e.path),
    defaultLayer: /roof/.test(e.path)
      ? 'overhead'
      : /house|castle/.test(e.path)
        ? 'buildings'
        : 'objects',
    category: e.category,
    sourcePath: e.path,
    image,
  };
}
