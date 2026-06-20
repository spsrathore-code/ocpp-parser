// src/app/repository/db.ts
// Low-level IndexedDB CRUD for the Log Repository. One object store `logs`,
// keyPath `id` autoIncrement; every metadata field indexed (FR-178). Content is
// stored gzip-compressed and never decompressed for listing.

import type { RepoEntry, RepoMeta } from './types';

export const DB_NAME = 'ocpp-log-repository';
export const STORE = 'logs';
const VERSION = 1;

// Cached connection singleton — opened once and reused for the app's lifetime.
// Cleared by onversionchange / onclose so deleteDatabase (e.g. in tests) can
// proceed without deadlocking.
let dbPromise: Promise<IDBDatabase> | null = null;

export function openRepoDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: 'id', autoIncrement: true });
        store.createIndex('filename', 'filename', { unique: false });
        store.createIndex('savedAt', 'savedAt', { unique: false });
        store.createIndex('evseIp', 'evseIp', { unique: false });
        store.createIndex('siteName', 'siteName', { unique: false });
        store.createIndex('source', 'source', { unique: false });
        store.createIndex('tags', 'tags', { unique: false, multiEntry: true });
      }
    };
    req.onsuccess = () => {
      const db = req.result;
      // Another tab (or test beforeEach) deleted / upgraded the DB — close and
      // clear the cache so the next call opens a fresh connection.
      db.onversionchange = () => {
        db.close();
        dbPromise = null;
      };
      db.onclose = () => {
        dbPromise = null;
      };
      resolve(db);
    };
    req.onerror = () => {
      dbPromise = null;
      reject(req.error);
    };
  });

  return dbPromise;
}

function tx<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return openRepoDb().then((db) => new Promise<T>((resolve, reject) => {
    const t = db.transaction(STORE, mode);
    const request = run(t.objectStore(STORE));
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    // Connection is now reused — do not close it on transaction complete.
  }));
}

export async function putEntry(entry: RepoEntry): Promise<number> {
  const key = await tx<IDBValidKey>('readwrite', (s) => s.put(entry));
  return key as number;
}

export function getEntry(id: number): Promise<RepoEntry | undefined> {
  return tx<RepoEntry | undefined>('readonly', (s) => s.get(id));
}

function stripContent(rec: RepoEntry): RepoMeta {
  const { content: _content, ...meta } = rec;
  return meta;
}

export function getAllMeta(): Promise<RepoMeta[]> {
  return tx<RepoEntry[]>('readonly', (s) => s.getAll()).then((rows) => rows.map(stripContent));
}

export function findByFilename(filename: string): Promise<RepoMeta[]> {
  return openRepoDb().then((db) => new Promise<RepoMeta[]>((resolve, reject) => {
    const t = db.transaction(STORE, 'readonly');
    const req = t.objectStore(STORE).index('filename').getAll(filename);
    req.onsuccess = () => resolve((req.result as RepoEntry[]).map(stripContent));
    req.onerror = () => reject(req.error);
    // Connection is now reused — do not close it on transaction complete.
  }));
}

export function deleteEntry(id: number): Promise<void> {
  return tx<undefined>('readwrite', (s) => s.delete(id));
}

/**
 * Read-modify-write in a single readwrite transaction.
 * Avoids the two-hop get+put race condition in tests and production.
 * `patch` receives the stored entry and returns the updated version to write.
 * No-ops if the entry does not exist.
 */
export function patchEntry(id: number, patch: (entry: RepoEntry) => RepoEntry): Promise<void> {
  return openRepoDb().then(
    (db) =>
      new Promise<void>((resolve, reject) => {
        const t = db.transaction(STORE, 'readwrite');
        const store = t.objectStore(STORE);
        const getReq = store.get(id);
        getReq.onsuccess = () => {
          const entry: RepoEntry | undefined = getReq.result;
          if (!entry) { resolve(); return; }
          const putReq = store.put(patch(entry));
          putReq.onsuccess = () => resolve();
          putReq.onerror = () => reject(putReq.error);
        };
        getReq.onerror = () => reject(getReq.error);
      }),
  );
}
