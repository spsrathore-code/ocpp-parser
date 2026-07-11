// tests/unit/repository-actions.test.ts
// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach } from 'vitest';
import { indexedDB } from 'fake-indexeddb';
import { saveLogToRepository, listRepoMeta } from '../../src/app/repository/repository';
import { DB_NAME } from '../../src/app/repository/db';
import { loadAndAnalyzeFromRepo } from '../../src/app/render/repository/loadAnalyze';
import { deleteRepoEntry, deleteSelectedRepoEntries, deleteAllBrowserLogs } from '../../src/app/render/repository/actions';

beforeEach(async () => {
  document.body.innerHTML = '';
  await new Promise<void>((res) => { const r = indexedDB.deleteDatabase(DB_NAME); r.onsuccess = () => res(); r.onerror = () => res(); });
});

const SAMPLE = '[2,"a","Heartbeat",{}]\n';

describe('loadAndAnalyzeFromRepo (FR-189)', () => {
  it('loads stored content and renders results into the container', async () => {
    const saved = await saveLogToRepository(SAMPLE, { filename: 's.log', fileSize: SAMPLE.length });
    const container = document.createElement('div');
    await loadAndAnalyzeFromRepo(saved!.id, container);
    expect(container.children.length).toBeGreaterThan(0); // renderResults populated it
  });

  it('shows a processing indicator before the analyze completes', async () => {
    const saved = await saveLogToRepository(SAMPLE, { filename: 's.log', fileSize: SAMPLE.length });
    const container = document.createElement('div');
    const promise = loadAndAnalyzeFromRepo(saved!.id, container);
    // Synchronously — before the awaited yield/analyze — the spinner is shown.
    expect(container.querySelector('[data-role="repo-loading"]')).not.toBeNull();
    await promise;
    // After completion the spinner is replaced by the results.
    expect(container.querySelector('[data-role="repo-loading"]')).toBeNull();
    expect(container.children.length).toBeGreaterThan(0);
  });
});

describe('delete actions (FR-191/355)', () => {
  it('deleteRepoEntry removes one after confirmation', async () => {
    const saved = await saveLogToRepository('x', { filename: 'd.log', fileSize: 1 });
    const ok = await deleteRepoEntry(saved!.id, () => true);
    expect(ok).toBe(true);
    expect(await listRepoMeta()).toHaveLength(0);
  });
  it('deleteRepoEntry is a no-op when the confirm is declined', async () => {
    const saved = await saveLogToRepository('x', { filename: 'd.log', fileSize: 1 });
    expect(await deleteRepoEntry(saved!.id, () => false)).toBe(false);
    expect(await listRepoMeta()).toHaveLength(1);
  });
  it('deleteSelectedRepoEntries deletes the chosen ids', async () => {
    const a = await saveLogToRepository('a', { filename: 'a.log', fileSize: 1 });
    const b = await saveLogToRepository('b', { filename: 'b.log', fileSize: 1 });
    await saveLogToRepository('c', { filename: 'c.log', fileSize: 1 });
    const n = await deleteSelectedRepoEntries([a!.id, b!.id], () => true);
    expect(n).toBe(2);
    expect((await listRepoMeta()).map((m) => m.filename)).toEqual(['c.log']);
  });
  it('deleteAllBrowserLogs clears everything', async () => {
    await saveLogToRepository('a', { filename: 'a.log', fileSize: 1 });
    await saveLogToRepository('b', { filename: 'b.log', fileSize: 1 });
    expect(await deleteAllBrowserLogs(() => true)).toBe(2);
    expect(await listRepoMeta()).toHaveLength(0);
  });
});
