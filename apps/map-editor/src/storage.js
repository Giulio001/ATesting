const DB = 'aetheria-map-editor',
  STORE = 'documents';
let opening;
function database() {
  if (!globalThis.indexedDB) return Promise.reject(new Error('IndexedDB non disponibile.'));
  if (!opening)
    opening = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB, 1);
      request.onupgradeneeded = () => request.result.createObjectStore(STORE, { keyPath: 'id' });
      request.onsuccess = () => {
        const db = request.result;
        db.onversionchange = () => {
          db.close();
          opening = null;
        };
        resolve(db);
      };
      request.onerror = () => {
        opening = null;
        reject(request.error);
      };
    });
  return opening;
}
async function transact(mode, operation) {
  const db = await database();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, mode),
      store = tx.objectStore(STORE);
    let value;
    operation(store, (result) => (value = result));
    tx.oncomplete = () => resolve(value);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error ?? new Error('Salvataggio interrotto.'));
  });
}
export async function readDraft() {
  let draft = null;
  try {
    draft = await transact('readonly', (store, set) => {
      const r = store.get('draft');
      r.onsuccess = () => set(r.result ?? null);
    });
  } catch {}
  let legacy = null,
    time = 0;
  try {
    const text = localStorage.getItem('aetheria-map-draft-v1');
    if (text) legacy = JSON.parse(text);
    time = Number(localStorage.getItem('aetheria-map-fallback-time') ?? 0);
  } catch {}
  return legacy && (!draft || time > draft.updatedAt) ? legacy : (draft?.map ?? null);
}
export async function saveDraft(map) {
  try {
    await transact('readwrite', (store) => store.put({ id: 'draft', updatedAt: Date.now(), map }));
    try {
      localStorage.removeItem('aetheria-map-draft-v1');
      localStorage.removeItem('aetheria-map-fallback-time');
    } catch {}
    return 'IndexedDB';
  } catch (error) {
    try {
      localStorage.setItem('aetheria-map-draft-v1', JSON.stringify(map));
      localStorage.setItem('aetheria-map-fallback-time', String(Date.now()));
      return 'archivio compatibile';
    } catch {
      throw new Error('Bozza non salvata: spazio browser insufficiente. Esporta il JSON.');
    }
  }
}
export async function listCheckpoints() {
  return await transact('readonly', (store, set) => {
    const r = store.getAll();
    r.onsuccess = () =>
      set(
        r.result
          .filter((d) => d.id !== 'draft')
          .sort((a, b) => b.updatedAt - a.updatedAt)
          .map(({ id, name, updatedAt }) => ({ id, name, updatedAt })),
      );
  });
}
export async function saveCheckpoint(map) {
  const document = {
    id: crypto.randomUUID(),
    updatedAt: Date.now(),
    name: map.name,
    map: structuredClone(map),
  };
  await transact('readwrite', (store) => {
    store.put(document);
    const request = store.getAll();
    request.onsuccess = () => {
      const versions = request.result
        .filter((d) => d.id !== 'draft')
        .sort((a, b) => b.updatedAt - a.updatedAt);
      for (const d of versions.slice(5)) store.delete(d.id);
    };
  });
  return document.id;
}
export async function readCheckpoint(id) {
  return await transact('readonly', (store, set) => {
    const r = store.get(id);
    r.onsuccess = () => set(r.result?.map ?? null);
  });
}
