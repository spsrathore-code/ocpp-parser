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
