# Parser Phase 4a — Log Repository Core (headless) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the headless, fully-tested **local** Log Repository core — gzip compression, IndexedDB persistence, and a save/load/delete/list service — plus an auto-save-after-parse hook, with **no Google Drive** (parked to Phase 5 hosted deploy).

**Architecture:** A new `src/app/repository/` module in four layers: `compress.ts` (gzip round-trip via `CompressionStream`), `db.ts` (low-level IndexedDB CRUD + indexes), `repository.ts` (high-level save/load/delete/list + duplicate-versioning + storage estimate/persistence), and `types.ts` (schema). Drive-specific fields (`driveFileId`) exist in the schema but stay `null`; all Drive I/O is deferred. `main.ts` gains a thin, failure-isolated auto-save call after each successful parse.

**Tech Stack:** TypeScript, Vite, Vitest (node env), Web `CompressionStream`/`DecompressionStream` (Node 22 globals), IndexedDB (`fake-indexeddb` in tests), `navigator.storage` estimate/persist.

## Global Constraints

- No source file > 2000 lines (operating principles hard constraint).
- **FR-205 / FR-206**: No existing function, section, or rendering pipeline modified; all existing sections must render identically. The only edit to existing code is an additive auto-save call in `main.ts`.
- **FR-172 / FR-173**: Local layer (IndexedDB + gzip) must function fully without internet; Drive sync is out of scope for 4a (parked).
- **FR-174**: Log content compressed with gzip `CompressionStream` before write; decompressed with `DecompressionStream` on read.
- Metadata schema fields (FR-172 §12.2) verbatim: `id` (auto-increment PK), `filename` (string), `savedAt` (number, UTC epoch ms), `fileSize` (number, raw pre-compression bytes), `evseIp` (string, `''` for uploads), `siteName` (string), `tags` (string[]), `content` (ArrayBuffer, gzip), `driveFileId` (string|null), `source` (`"upload"` | `"api"`).
- **FR-178**: All metadata fields except `content` indexed for search without decompressing.
- Tests live in `tests/unit/`; import modules from `../../src/app/...`; pattern: `import { describe, it, expect } from 'vitest'`.
- DB name: `ocpp-log-repository`; object store: `logs`.
- Test runner sees no IndexedDB in node — repo tests must `import 'fake-indexeddb/auto'` at the top, before importing `db.ts`.

---

### Task 1: Schema types + gzip compression round-trip

**Files:**
- Create: `src/app/repository/types.ts`
- Create: `src/app/repository/compress.ts`
- Test: `tests/unit/repository-compress.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `RepoMeta` = `{ id?: number; filename: string; savedAt: number; fileSize: number; evseIp: string; siteName: string; tags: string[]; driveFileId: string | null; source: 'upload' | 'api'; }`
  - `RepoEntry` = `RepoMeta & { content: ArrayBuffer }`
  - `SaveInput` = `{ filename: string; fileSize: number; evseIp?: string; siteName?: string; tags?: string[]; source?: 'upload' | 'api'; }`
  - `compressText(text: string): Promise<ArrayBuffer>`
  - `decompressToText(buf: ArrayBuffer): Promise<string>`

- [ ] **Step 1: Write the failing test**

```ts
// tests/unit/repository-compress.test.ts
import { describe, it, expect } from 'vitest';
import { compressText, decompressToText } from '../../src/app/repository/compress';

describe('gzip compression round-trip (FR-174)', () => {
  it('decompress(compress(text)) === text', async () => {
    const text = 'OCPP log line\n'.repeat(500);
    const buf = await compressText(text);
    expect(buf).toBeInstanceOf(ArrayBuffer);
    expect(await decompressToText(buf)).toBe(text);
  });

  it('compresses repetitive log text smaller than the raw UTF-8 bytes', async () => {
    const text = 'StatusNotification Available\n'.repeat(1000);
    const raw = new TextEncoder().encode(text).byteLength;
    const buf = await compressText(text);
    expect(buf.byteLength).toBeLessThan(raw);
  });

  it('round-trips unicode and empty string', async () => {
    expect(await decompressToText(await compressText(''))).toBe('');
    expect(await decompressToText(await compressText('âœ… IST â†’ UTC'))).toBe('âœ… IST â†’ UTC');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/repository-compress.test.ts`
Expected: FAIL — cannot resolve `../../src/app/repository/compress`.

- [ ] **Step 3: Write the types**

```ts
// src/app/repository/types.ts
// Log Repository schema (requirements.md Â§12.2 / FR-172). `content` holds the
// gzip-compressed raw log text; every other field is indexed (FR-178).

export interface RepoMeta {
  id?: number;
  filename: string;
  savedAt: number;            // UTC epoch ms
  fileSize: number;           // raw bytes pre-compression
  evseIp: string;             // '' for file uploads
  siteName: string;
  tags: string[];
  driveFileId: string | null; // null until Drive sync (parked to Phase 5)
  source: 'upload' | 'api';
}

export interface RepoEntry extends RepoMeta {
  content: ArrayBuffer;       // gzip-compressed raw log text
}

export interface SaveInput {
  filename: string;
  fileSize: number;
  evseIp?: string;
  siteName?: string;
  tags?: string[];
  source?: 'upload' | 'api';
}
```

- [ ] **Step 4: Write the compression implementation**

```ts
// src/app/repository/compress.ts
// gzip round-trip via the Web Streams CompressionStream API (FR-174).
// Node 22 and modern browsers expose CompressionStream/DecompressionStream globally.

async function pipeThrough(data: Uint8Array, stream: GenericTransformStream): Promise<ArrayBuffer> {
  const writer = stream.writable.getWriter();
  void writer.write(data);
  void writer.close();
  const chunks: Uint8Array[] = [];
  const reader = stream.readable.getReader();
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    chunks.push(value);
  }
  const total = chunks.reduce((n, c) => n + c.byteLength, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const c of chunks) { out.set(c, offset); offset += c.byteLength; }
  return out.buffer;
}

/** Compress UTF-8 text to a gzip ArrayBuffer. */
export async function compressText(text: string): Promise<ArrayBuffer> {
  const bytes = new TextEncoder().encode(text);
  return pipeThrough(bytes, new CompressionStream('gzip'));
}

/** Decompress a gzip ArrayBuffer back to UTF-8 text. */
export async function decompressToText(buf: ArrayBuffer): Promise<string> {
  const out = await pipeThrough(new Uint8Array(buf), new DecompressionStream('gzip'));
  return new TextDecoder().decode(out);
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run tests/unit/repository-compress.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 6: Commit**

```bash
git add src/app/repository/types.ts src/app/repository/compress.ts tests/unit/repository-compress.test.ts
git commit -m "feat(parser): Phase 4a-1 — repo schema types + gzip compress round-trip (FR-174)"
```

---

### Task 2: IndexedDB low-level CRUD + indexes

**Files:**
- Create: `src/app/repository/db.ts`
- Modify: `package.json` (add `fake-indexeddb` devDependency)
- Test: `tests/unit/repository-db.test.ts`

**Interfaces:**
- Consumes: `RepoEntry`, `RepoMeta` from `./types`.
- Produces:
  - `openRepoDb(): Promise<IDBDatabase>`
  - `putEntry(entry: RepoEntry): Promise<number>` — resolves to the row `id`
  - `getEntry(id: number): Promise<RepoEntry | undefined>`
  - `getAllMeta(): Promise<RepoMeta[]>` — every record **without** the `content` field
  - `findByFilename(filename: string): Promise<RepoMeta[]>`
  - `deleteEntry(id: number): Promise<void>`
  - `DB_NAME = 'ocpp-log-repository'`, `STORE = 'logs'` exports

- [ ] **Step 1: Add the test dependency**

Run: `npm install -D fake-indexeddb`
Expected: `fake-indexeddb` added to `devDependencies`.

- [ ] **Step 2: Write the failing test**

```ts
// tests/unit/repository-db.test.ts
import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach } from 'vitest';
import { indexedDB } from 'fake-indexeddb';
import {
  openRepoDb, putEntry, getEntry, getAllMeta, findByFilename, deleteEntry, DB_NAME,
} from '../../src/app/repository/db';
import type { RepoEntry } from '../../src/app/repository/types';

function entry(over: Partial<RepoEntry> = {}): RepoEntry {
  return {
    filename: 'a.log', savedAt: 1000, fileSize: 10, evseIp: '', siteName: 'Site',
    tags: [], driveFileId: null, source: 'upload', content: new Uint8Array([1, 2, 3]).buffer,
    ...over,
  };
}

beforeEach(async () => {
  await new Promise<void>((res) => { const r = indexedDB.deleteDatabase(DB_NAME); r.onsuccess = () => res(); r.onerror = () => res(); });
});

describe('repository IndexedDB layer', () => {
  it('put then get round-trips a full entry with an assigned id', async () => {
    const id = await putEntry(entry({ filename: 'x.log' }));
    expect(typeof id).toBe('number');
    const got = await getEntry(id);
    expect(got?.filename).toBe('x.log');
    expect(new Uint8Array(got!.content)).toEqual(new Uint8Array([1, 2, 3]));
  });

  it('getAllMeta returns metadata without the content blob', async () => {
    await putEntry(entry({ filename: 'a.log' }));
    await putEntry(entry({ filename: 'b.log' }));
    const meta = await getAllMeta();
    expect(meta).toHaveLength(2);
    expect(meta[0]).not.toHaveProperty('content');
    expect(meta.map((m) => m.filename).sort()).toEqual(['a.log', 'b.log']);
  });

  it('findByFilename uses the filename index', async () => {
    await putEntry(entry({ filename: 'dup.log' }));
    await putEntry(entry({ filename: 'dup.log' }));
    await putEntry(entry({ filename: 'other.log' }));
    expect(await findByFilename('dup.log')).toHaveLength(2);
  });

  it('deleteEntry removes the row', async () => {
    const id = await putEntry(entry());
    await deleteEntry(id);
    expect(await getEntry(id)).toBeUndefined();
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run tests/unit/repository-db.test.ts`
Expected: FAIL — cannot resolve `../../src/app/repository/db`.

- [ ] **Step 4: Write the implementation**

```ts
// src/app/repository/db.ts
// Low-level IndexedDB CRUD for the Log Repository. One object store `logs`,
// keyPath `id` autoIncrement; every metadata field indexed (FR-178). Content is
// stored gzip-compressed and never decompressed for listing.

import type { RepoEntry, RepoMeta } from './types';

export const DB_NAME = 'ocpp-log-repository';
export const STORE = 'logs';
const VERSION = 1;

export function openRepoDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
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
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function tx<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return openRepoDb().then((db) => new Promise<T>((resolve, reject) => {
    const t = db.transaction(STORE, mode);
    const request = run(t.objectStore(STORE));
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    t.oncomplete = () => db.close();
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
    t.oncomplete = () => db.close();
  }));
}

export function deleteEntry(id: number): Promise<void> {
  return tx<undefined>('readwrite', (s) => s.delete(id)).then(() => undefined);
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run tests/unit/repository-db.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 6: Commit**

```bash
git add src/app/repository/db.ts tests/unit/repository-db.test.ts package.json package-lock.json
git commit -m "feat(parser): Phase 4a-2 — IndexedDB CRUD + indexes for log repository (FR-178)"
```

---

### Task 3: Repository service — save / load / delete / list + duplicate versioning

**Files:**
- Create: `src/app/repository/repository.ts`
- Test: `tests/unit/repository-service.test.ts`

**Interfaces:**
- Consumes: `compressText`/`decompressToText` (Task 1), `putEntry`/`getEntry`/`getAllMeta`/`findByFilename`/`deleteEntry` (Task 2), `RepoEntry`/`RepoMeta`/`SaveInput` (Task 1).
- Produces:
  - `type DuplicateChoice = 'overwrite' | 'new-version' | 'cancel'`
  - `nextVersionFilename(filename: string, existing: string[]): string` — pure; appends `_v2`, `_v3`â€¦ before the extension
  - `saveLogToRepository(content: string, input: SaveInput, onDuplicate?: (filename: string) => Promise<DuplicateChoice> | DuplicateChoice): Promise<{ id: number; filename: string } | null>`
  - `loadFromRepo(id: number): Promise<{ meta: RepoMeta; content: string } | undefined>`
  - `deleteFromRepo(id: number): Promise<void>`
  - `listRepoMeta(): Promise<RepoMeta[]>` — sorted by `savedAt` descending

- [ ] **Step 1: Write the failing test**

```ts
// tests/unit/repository-service.test.ts
import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach } from 'vitest';
import { indexedDB } from 'fake-indexeddb';
import {
  saveLogToRepository, loadFromRepo, deleteFromRepo, listRepoMeta, nextVersionFilename,
} from '../../src/app/repository/repository';
import { DB_NAME } from '../../src/app/repository/db';

beforeEach(async () => {
  await new Promise<void>((res) => { const r = indexedDB.deleteDatabase(DB_NAME); r.onsuccess = () => res(); r.onerror = () => res(); });
});

describe('nextVersionFilename (FR-183)', () => {
  it('appends _v2 before the extension on first collision', () => {
    expect(nextVersionFilename('charger.log', ['charger.log'])).toBe('charger_v2.log');
  });
  it('skips to _v3 when _v2 also exists', () => {
    expect(nextVersionFilename('charger.log', ['charger.log', 'charger_v2.log'])).toBe('charger_v3.log');
  });
  it('handles names without an extension', () => {
    expect(nextVersionFilename('dump', ['dump'])).toBe('dump_v2');
  });
});

describe('saveLogToRepository / loadFromRepo round-trip', () => {
  it('saves compressed content and loads it back as text', async () => {
    const text = 'StartTransaction\nMeterValues\nStopTransaction\n';
    const saved = await saveLogToRepository(text, { filename: 'a.log', fileSize: text.length });
    expect(saved).not.toBeNull();
    const got = await loadFromRepo(saved!.id);
    expect(got?.content).toBe(text);
    expect(got?.meta.filename).toBe('a.log');
    expect(got?.meta.source).toBe('upload');
    expect(got?.meta.driveFileId).toBeNull();
  });

  it('on duplicate filename with "new-version" choice, saves under _v2', async () => {
    await saveLogToRepository('one', { filename: 'd.log', fileSize: 3 });
    const second = await saveLogToRepository('two', { filename: 'd.log', fileSize: 3 }, () => 'new-version');
    expect(second?.filename).toBe('d_v2.log');
    expect((await listRepoMeta()).map((m) => m.filename).sort()).toEqual(['d.log', 'd_v2.log']);
  });

  it('on duplicate with "overwrite" choice, replaces the existing row', async () => {
    const first = await saveLogToRepository('one', { filename: 'd.log', fileSize: 3 });
    const second = await saveLogToRepository('two', { filename: 'd.log', fileSize: 3 }, () => 'overwrite');
    expect(second?.id).toBe(first!.id);
    expect((await loadFromRepo(first!.id))?.content).toBe('two');
    expect(await listRepoMeta()).toHaveLength(1);
  });

  it('on duplicate with "cancel" choice, returns null and saves nothing new', async () => {
    await saveLogToRepository('one', { filename: 'd.log', fileSize: 3 });
    const second = await saveLogToRepository('two', { filename: 'd.log', fileSize: 3 }, () => 'cancel');
    expect(second).toBeNull();
    expect(await listRepoMeta()).toHaveLength(1);
  });

  it('listRepoMeta sorts newest first', async () => {
    await saveLogToRepository('a', { filename: 'older.log', fileSize: 1 });
    await new Promise((r) => setTimeout(r, 2));
    await saveLogToRepository('b', { filename: 'newer.log', fileSize: 1 });
    expect((await listRepoMeta())[0].filename).toBe('newer.log');
  });

  it('deleteFromRepo removes the entry', async () => {
    const saved = await saveLogToRepository('x', { filename: 'gone.log', fileSize: 1 });
    await deleteFromRepo(saved!.id);
    expect(await loadFromRepo(saved!.id)).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/repository-service.test.ts`
Expected: FAIL — cannot resolve `../../src/app/repository/repository`.

- [ ] **Step 3: Write the implementation**

```ts
// src/app/repository/repository.ts
// High-level Log Repository service (local only; Drive sync parked to Phase 5).
// Compresses on save, decompresses on load, and resolves duplicate filenames via
// an injected callback (FR-183). UI prompts live in Phase 4b; the service is headless.

import { compressText, decompressToText } from './compress';
import { putEntry, getEntry, getAllMeta, findByFilename, deleteEntry } from './db';
import type { RepoEntry, RepoMeta, SaveInput } from './types';

export type DuplicateChoice = 'overwrite' | 'new-version' | 'cancel';

/** Append `_v2`, `_v3`â€¦ before the extension until the name is unique. */
export function nextVersionFilename(filename: string, existing: string[]): string {
  const taken = new Set(existing);
  const dot = filename.lastIndexOf('.');
  const base = dot > 0 ? filename.slice(0, dot) : filename;
  const ext = dot > 0 ? filename.slice(dot) : '';
  let n = 2;
  let candidate = `${base}_v${n}${ext}`;
  while (taken.has(candidate)) { n += 1; candidate = `${base}_v${n}${ext}`; }
  return candidate;
}

/**
 * Save raw log text. Compresses content, fills schema defaults, and on a filename
 * collision asks `onDuplicate` (default: silently version as `_v2`). Returns the
 * saved id + final filename, or `null` if cancelled.
 */
export async function saveLogToRepository(
  content: string,
  input: SaveInput,
  onDuplicate: (filename: string) => Promise<DuplicateChoice> | DuplicateChoice = () => 'new-version',
): Promise<{ id: number; filename: string } | null> {
  const collisions = await findByFilename(input.filename);
  let filename = input.filename;
  let overwriteId: number | undefined;

  if (collisions.length > 0) {
    const choice = await onDuplicate(input.filename);
    if (choice === 'cancel') return null;
    if (choice === 'overwrite') {
      overwriteId = collisions[0].id;
    } else {
      const all = (await getAllMeta()).map((m) => m.filename);
      filename = nextVersionFilename(input.filename, all);
    }
  }

  const entry: RepoEntry = {
    ...(overwriteId !== undefined ? { id: overwriteId } : {}),
    filename,
    savedAt: Date.now(),
    fileSize: input.fileSize,
    evseIp: input.evseIp ?? '',
    siteName: input.siteName ?? '',
    tags: input.tags ?? [],
    driveFileId: null,
    source: input.source ?? 'upload',
    content: await compressText(content),
  };
  const id = await putEntry(entry);
  return { id, filename };
}

/** Read + decompress one entry by id. */
export async function loadFromRepo(id: number): Promise<{ meta: RepoMeta; content: string } | undefined> {
  const entry = await getEntry(id);
  if (!entry) return undefined;
  const { content, ...meta } = entry;
  return { meta, content: await decompressToText(content) };
}

export function deleteFromRepo(id: number): Promise<void> {
  return deleteEntry(id);
}

/** All stored metadata, newest first. */
export async function listRepoMeta(): Promise<RepoMeta[]> {
  return (await getAllMeta()).sort((a, b) => b.savedAt - a.savedAt);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/repository-service.test.ts`
Expected: PASS (9 tests).

- [ ] **Step 5: Commit**

```bash
git add src/app/repository/repository.ts tests/unit/repository-service.test.ts
git commit -m "feat(parser): Phase 4a-3 — repository save/load/delete/list + duplicate versioning (FR-183)"
```

---

### Task 4: Storage estimate + persistence helpers

**Files:**
- Create: `src/app/repository/storage.ts`
- Test: `tests/unit/repository-storage.test.ts`

**Interfaces:**
- Consumes: nothing (wraps `navigator.storage`).
- Produces:
  - `type StorageInfo = { usage: number; quota: number; available: number; lowSpace: boolean }`
  - `getStorageInfo(): Promise<StorageInfo | null>` — `null` when the API is unavailable (FR-176)
  - `LOW_SPACE_BYTES = 500 * 1024 * 1024` — < 500 MB remaining triggers `lowSpace` (FR-177)
  - `requestPersistence(): Promise<boolean>` — `false` when the API is unavailable (FR-175)
  - `formatStorage(info: StorageInfo): string` — `"Using X MB of Y GB available"` (FR-176)

- [ ] **Step 1: Write the failing test**

```ts
// tests/unit/repository-storage.test.ts
import { describe, it, expect, afterEach } from 'vitest';
import { getStorageInfo, requestPersistence, formatStorage, LOW_SPACE_BYTES } from '../../src/app/repository/storage';

const realNavigator = globalThis.navigator;
afterEach(() => { Object.defineProperty(globalThis, 'navigator', { value: realNavigator, configurable: true }); });

function mockNavigator(storage: unknown) {
  Object.defineProperty(globalThis, 'navigator', { value: { storage }, configurable: true });
}

describe('getStorageInfo (FR-176/177)', () => {
  it('returns null when navigator.storage.estimate is unavailable', async () => {
    mockNavigator(undefined);
    expect(await getStorageInfo()).toBeNull();
  });

  it('computes available + lowSpace from estimate()', async () => {
    mockNavigator({ estimate: async () => ({ usage: 1_000_000, quota: 2_000_000_000 }) });
    const info = await getStorageInfo();
    expect(info?.available).toBe(2_000_000_000 - 1_000_000);
    expect(info?.lowSpace).toBe(false);
  });

  it('flags lowSpace when remaining < 500 MB', async () => {
    mockNavigator({ estimate: async () => ({ usage: 100, quota: 100 + LOW_SPACE_BYTES - 1 }) });
    expect((await getStorageInfo())?.lowSpace).toBe(true);
  });
});

describe('requestPersistence (FR-175)', () => {
  it('returns false when persist() is unavailable', async () => {
    mockNavigator({});
    expect(await requestPersistence()).toBe(false);
  });
  it('delegates to navigator.storage.persist()', async () => {
    mockNavigator({ persist: async () => true });
    expect(await requestPersistence()).toBe(true);
  });
});

describe('formatStorage (FR-176)', () => {
  it('formats "Using X MB of Y GB available"', () => {
    const s = formatStorage({ usage: 5 * 1024 * 1024, quota: 2 * 1024 * 1024 * 1024, available: 0, lowSpace: false });
    expect(s).toBe('Using 5.0 MB of 2.0 GB available');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/repository-storage.test.ts`
Expected: FAIL — cannot resolve `../../src/app/repository/storage`.

- [ ] **Step 3: Write the implementation**

```ts
// src/app/repository/storage.ts
// Thin guards over navigator.storage for quota display + persistence (FR-175/176/177).
// All methods degrade gracefully when the Storage API is absent (e.g. older browsers).

export interface StorageInfo {
  usage: number;
  quota: number;
  available: number;
  lowSpace: boolean;
}

export const LOW_SPACE_BYTES = 500 * 1024 * 1024; // 500 MB (FR-177)

export async function getStorageInfo(): Promise<StorageInfo | null> {
  const storage = (globalThis.navigator as Navigator | undefined)?.storage;
  if (!storage || typeof storage.estimate !== 'function') return null;
  const { usage = 0, quota = 0 } = await storage.estimate();
  const available = Math.max(0, quota - usage);
  return { usage, quota, available, lowSpace: available < LOW_SPACE_BYTES };
}

export async function requestPersistence(): Promise<boolean> {
  const storage = (globalThis.navigator as Navigator | undefined)?.storage;
  if (!storage || typeof storage.persist !== 'function') return false;
  return storage.persist();
}

export function formatStorage(info: StorageInfo): string {
  const mb = (info.usage / (1024 * 1024)).toFixed(1);
  const gb = (info.quota / (1024 * 1024 * 1024)).toFixed(1);
  return `Using ${mb} MB of ${gb} GB available`;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/repository-storage.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add src/app/repository/storage.ts tests/unit/repository-storage.test.ts
git commit -m "feat(parser): Phase 4a-4 — storage estimate + persistence helpers (FR-175/176/177)"
```

---

### Task 5: Auto-save-after-parse hook + wire into main.ts

**Files:**
- Create: `src/app/repository/autoSave.ts`
- Modify: `src/app/main.ts` (additive call inside the existing parse loop)
- Test: `tests/unit/repository-autosave.test.ts`

**Interfaces:**
- Consumes: `saveLogToRepository` (Task 3), `requestPersistence` (Task 4).
- Produces:
  - `autoSaveUploadedFile(name: string, content: string): Promise<void>` — fire-and-forget save of one uploaded file (`source: 'upload'`, `evseIp: ''`, `siteName: ''`, `tags: []`); swallows errors so repository failures never block analysis (FR-179, FR-205).

> **Why a helper, not inline:** `main.ts` runs against the live DOM at import time and is not unit-testable; isolating the save logic in `autoSave.ts` keeps it covered and keeps the `main.ts` edit a one-liner. The FR-180 site-name prompt, FR-182 toast, and FR-184 panel are Phase 4b.

- [ ] **Step 1: Write the failing test**

```ts
// tests/unit/repository-autosave.test.ts
import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach } from 'vitest';
import { indexedDB } from 'fake-indexeddb';
import { autoSaveUploadedFile } from '../../src/app/repository/autoSave';
import { listRepoMeta } from '../../src/app/repository/repository';
import { DB_NAME } from '../../src/app/repository/db';

beforeEach(async () => {
  await new Promise<void>((res) => { const r = indexedDB.deleteDatabase(DB_NAME); r.onsuccess = () => res(); r.onerror = () => res(); });
});

describe('autoSaveUploadedFile (FR-179)', () => {
  it('persists an uploaded file with source "upload" and raw byte size', async () => {
    const content = 'StatusNotification\n';
    await autoSaveUploadedFile('charger.log', content);
    const meta = await listRepoMeta();
    expect(meta).toHaveLength(1);
    expect(meta[0].filename).toBe('charger.log');
    expect(meta[0].source).toBe('upload');
    expect(meta[0].fileSize).toBe(new TextEncoder().encode(content).byteLength);
  });

  it('never throws even if persistence is unavailable', async () => {
    await expect(autoSaveUploadedFile('x.log', 'data')).resolves.toBeUndefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/repository-autosave.test.ts`
Expected: FAIL — cannot resolve `../../src/app/repository/autoSave`.

- [ ] **Step 3: Write the implementation**

```ts
// src/app/repository/autoSave.ts
// Auto-save every successfully-parsed upload to the local repository (FR-179).
// Failure-isolated: a repository error must never interrupt the analysis pipeline.

import { saveLogToRepository } from './repository';
import { requestPersistence } from './storage';

let persistenceRequested = false;

export async function autoSaveUploadedFile(name: string, content: string): Promise<void> {
  try {
    if (!persistenceRequested) { persistenceRequested = true; await requestPersistence(); }
    const fileSize = new TextEncoder().encode(content).byteLength;
    await saveLogToRepository(content, { filename: name, fileSize, source: 'upload' });
  } catch (err) {
    console.warn('Auto-save to repository failed (non-blocking):', err);
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/repository-autosave.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Wire the hook into `main.ts`**

In `src/app/main.ts`, add the import alongside the others:

```ts
import { autoSaveUploadedFile } from './repository/autoSave';
```

Then inside the existing `for (const file of files)` loop, after `names.push(file.name);`, capture the text once and save it. Replace the loop body so the already-read text is reused (no second `file.text()` call):

```ts
      for (const file of files) {
        const text = await file.text();
        const lines = text.split(/\r?\n/);
        parts.push(parseLines(lines, file.name));
        allLines.push(...lines);
        names.push(file.name);
        void autoSaveUploadedFile(file.name, text);
      }
```

- [ ] **Step 6: Verify typecheck + production build are clean**

Run: `npm run typecheck && npm run build`
Expected: no TS errors; `vite build` succeeds (repository chunk included).

- [ ] **Step 7: Commit**

```bash
git add src/app/repository/autoSave.ts src/app/main.ts tests/unit/repository-autosave.test.ts
git commit -m "feat(parser): Phase 4a-5 — auto-save uploads to repository, wired into main.ts (FR-179)"
```

---

### Task 6: Full-suite green + tracker updates

**Files:**
- Modify: `specs/roadmap.md` (mark 4a; 4c parked note)
- Modify: `specs/tasks.md` (advance Phase 4 items)
- Modify: `skills/WORKFLOW.md` (Phase 4a sub-phase entry)
- Modify: `CHANGELOG.md` (run entry)
- Modify: `knowledge/project-journal.md` (session entry)

- [ ] **Step 1: Run the entire test suite**

Run: `npm test`
Expected: all prior tests still pass **plus** the 24 new repository tests (135 â†’ 159). Zero failures.

- [ ] **Step 2: Update the trackers**

- `specs/roadmap.md`: Phase 4 line â†’ note 4a (repository core) done, 4c (Drive) parked to Phase 5 hosted deploy.
- `specs/tasks.md`: check off 4a sub-items; list 4b/4d/4e as next.
- `skills/WORKFLOW.md`: add `[x] Phase 4a â€” Repository core (local IndexedDB + gzip, save/load/delete/list, storage helpers, auto-save hook). 4c Drive PARKED. NNN tests.`
- `CHANGELOG.md`: new run entry summarising Phase 4a.
- `knowledge/project-journal.md`: dated session entry (discussed / decided / implemented / next).

- [ ] **Step 3: Commit**

```bash
git add specs/roadmap.md specs/tasks.md skills/WORKFLOW.md CHANGELOG.md knowledge/project-journal.md
git commit -m "docs(parser): Phase 4a complete â€” repository core (local); 4c Drive parked; trackers refreshed"
```

---

## Self-Review

**Spec coverage (Section 12 local-layer FRs):**
- FR-172 hybrid (local half) â†’ Tasks 1â€“3 ✅ · cloud half parked (documented).
- FR-173 local works offline â†’ entire module is offline ✅.
- FR-174 gzip compress/decompress â†’ Task 1 ✅.
- FR-175 persist() â†’ Task 4 + invoked in Task 5 ✅.
- FR-176 estimate display / FR-177 < 500 MB warning â†’ Task 4 ✅.
- FR-178 metadata indexed (no content) â†’ Task 2 indexes + `getAllMeta` strips content ✅.
- FR-179 auto-save after parse â†’ Task 5 ✅.
- FR-180 site-name prompt / FR-182 toast â†’ **deferred to 4b** (UI) â€” noted.
- FR-183 duplicate Overwrite / Save-as-new-version â†’ Task 3 (`nextVersionFilename` + choice) ✅; the *prompt* UI is 4b, logic is here.
- FR-184â€“188 panel UI, FR-189/190 Load&Analyze wiring, FR-191/192 delete prompts, FR-193â€“196 tagging UI â†’ **Phase 4b** (UI) â€” out of 4a scope by design.
- FR-197â€“206 Google Drive â†’ **parked to Phase 5** per user decision; schema `driveFileId` kept (`null`).
- FR-205/206 no existing code modified / sections render identically â†’ only additive `main.ts` line; verified by Task 6 full-suite green.

**Placeholder scan:** none â€” every code/test step carries full content.

**Type consistency:** `RepoMeta`/`RepoEntry`/`SaveInput` defined in Task 1 and consumed unchanged in Tasks 2â€“5. `saveLogToRepository(content, input, onDuplicate?)` signature is identical across Task 3 (def) and Task 5 (use, via `autoSave`). `DB_NAME` exported in Task 2, reused in test `beforeEach` hooks. `loadFromRepo` returns `{ meta, content }` consistently.

**Note on a deviation from the legacy function table (Â§12.10):** the SSOT lists `saveLogToRepository(filename, content, metadata)`. This plan uses `saveLogToRepository(content, input)` where `input` carries `filename` â€” cleaner typing, same behaviour. The legacy 4-function surface (`initLogRepository`, `createLogRepositoryPanel`, `loadAndAnalyzeFromRepo`) is UI-bound and lands in Phase 4b; the panel will expose `loadAndAnalyzeFromRepo(id)` wrapping `loadFromRepo` + the existing parse pipeline (FR-189).
