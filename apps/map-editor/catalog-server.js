import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
const publicRoot = fileURLToPath(new URL('./public/full-catalog/', import.meta.url));
const cacheRoot = fileURLToPath(new URL('../../.catalog-cache/', import.meta.url));
const sha = (b) => createHash('sha1').update(`blob ${b.length}\0`).update(b).digest('hex');
let init;
const pending = new Map();
let active = 0;
const waiters = [];
async function library() {
  return (init ??= Promise.all(
    ['catalog.json', 'metadata.json'].map((n) =>
      readFile(join(publicRoot, n), 'utf8').then(JSON.parse),
    ),
  ).then(([c, m]) => ({ entries: new Map(c.entries.map((e) => [e.path, e])), metadata: m })));
}
async function bytes(entry, metadata) {
  const file = join(cacheRoot, entry.sha);
  try {
    const b = await readFile(file);
    if (sha(b) === entry.sha) return b;
  } catch {}
  let b;
  if (Object.hasOwn(metadata, entry.path)) b = Buffer.from(metadata[entry.path], 'utf8');
  else {
    if (active >= 6) await new Promise((resolve) => waiters.push(resolve));
    active++;
    try {
      const response = await fetch(
        'https://www.aetheriammorpg.online/assets/' +
          entry.path.split('/').map(encodeURIComponent).join('/'),
        { signal: AbortSignal.timeout(45000) },
      );
      if (!response.ok) throw Error('Originale non disponibile sul server del gioco.');
      b = Buffer.from(await response.arrayBuffer());
    } finally {
      active--;
      waiters.shift()?.();
    }
  }
  if (sha(b) !== entry.sha)
    throw Error('Il file sul server del gioco è diverso dalla revisione del catalogo.');
  await mkdir(cacheRoot, { recursive: true });
  await writeFile(file, b);
  return b;
}
export function catalogMiddleware() {
  return async (req, res, next) => {
    if (!req.url?.startsWith('/__aetheria_asset/')) return next();
    try {
      if (!['GET', 'HEAD'].includes(req.method)) {
        res.statusCode = 405;
        return res.end();
      }
      const path = decodeURIComponent(req.url.split('?')[0].slice('/__aetheria_asset/'.length));
      const lib = await library(),
        entry = lib.entries.get(path);
      if (!entry) {
        res.statusCode = 404;
        return res.end('Asset non presente nel catalogo.');
      }
      if (!pending.has(path))
        pending.set(
          path,
          bytes(entry, lib.metadata).finally(() => pending.delete(path)),
        );
      const body = await pending.get(path);
      const ext = path.split('.').at(-1).toLowerCase();
      const mime =
        {
          png: 'image/png',
          webp: 'image/webp',
          svg: 'image/svg+xml',
          mp3: 'audio/mpeg',
          wav: 'audio/wav',
          json: 'application/json',
          md: 'text/plain',
          txt: 'text/plain',
        }[ext] ?? 'application/octet-stream';
      res.setHeader('Content-Type', mime);
      res.setHeader('Content-Length', body.length);
      res.setHeader('Cache-Control', 'public,max-age=3600');
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.end(req.method === 'HEAD' ? undefined : body);
    } catch (e) {
      res.statusCode = 502;
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.end(e.message);
    }
  };
}
export function catalogPlugin() {
  return {
    name: 'aetheria-complete-catalog',
    configureServer(server) {
      server.middlewares.use(catalogMiddleware());
    },
    configurePreviewServer(server) {
      server.middlewares.use(catalogMiddleware());
    },
  };
}
