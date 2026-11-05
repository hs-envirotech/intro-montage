// Tiny promise wrapper around IndexedDB for presets and recordings (local only).
type Store = 'presets' | 'recordings';

let dbP: Promise<IDBDatabase> | null = null;

function db(): Promise<IDBDatabase> {
  if (dbP) return dbP;
  dbP = new Promise((resolve, reject) => {
    const req = indexedDB.open('muse-rig', 1);
    req.onupgradeneeded = () => {
      const d = req.result;
      if (!d.objectStoreNames.contains('presets')) d.createObjectStore('presets', { keyPath: 'id' });
      if (!d.objectStoreNames.contains('recordings')) d.createObjectStore('recordings', { keyPath: 'id' });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => { dbP = null; reject(req.error); };
  });
  return dbP;
}

function run<T>(store: Store, mode: IDBTransactionMode, f: (s: IDBObjectStore) => IDBRequest): Promise<T> {
  return db().then((d) => new Promise<T>((resolve, reject) => {
    const tx = d.transaction(store, mode);
    const req = f(tx.objectStore(store));
    tx.oncomplete = () => resolve(req.result as T);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  }));
}

export const idbPut = (store: Store, value: unknown) => run<IDBValidKey>(store, 'readwrite', (s) => s.put(value));
export const idbDelete = (store: Store, key: string) => run<undefined>(store, 'readwrite', (s) => s.delete(key));
export const idbGetAll = <T>(store: Store) => run<T[]>(store, 'readonly', (s) => s.getAll());
