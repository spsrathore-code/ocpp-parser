// tests/unit/repository-service.test.ts
import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach, vi } from 'vitest';
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
    expect(got?.meta.evseIp).toBe('');
    expect(got?.meta.siteName).toBe('');
    expect(got?.meta.tags).toEqual([]);
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
    const nowSpy = vi.spyOn(Date, 'now').mockReturnValueOnce(1000).mockReturnValueOnce(2000);
    await saveLogToRepository('a', { filename: 'older.log', fileSize: 1 });
    await saveLogToRepository('b', { filename: 'newer.log', fileSize: 1 });
    expect((await listRepoMeta())[0].filename).toBe('newer.log');
    nowSpy.mockRestore();
  });

  it('deleteFromRepo removes the entry', async () => {
    const saved = await saveLogToRepository('x', { filename: 'gone.log', fileSize: 1 });
    await deleteFromRepo(saved!.id);
    expect(await loadFromRepo(saved!.id)).toBeUndefined();
  });
});
