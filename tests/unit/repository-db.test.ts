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
