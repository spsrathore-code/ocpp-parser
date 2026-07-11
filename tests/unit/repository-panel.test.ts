// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach } from 'vitest';
import { indexedDB } from 'fake-indexeddb';
import { createLogRepositoryPanel, formatHeaderStats } from '../../src/app/render/repository/panel';
import { DB_NAME } from '../../src/app/repository/db';

beforeEach(async () => {
  document.body.innerHTML = '';
  await new Promise<void>((res) => { const r = indexedDB.deleteDatabase(DB_NAME); r.onsuccess = () => res(); r.onerror = () => res(); });
});

describe('formatHeaderStats (FR-185)', () => {
  it('summarises log count and storage', () => {
    const s = formatHeaderStats(
      [{ filename: 'a', savedAt: 1, fileSize: 1, evseIp: '', siteName: '', tags: [], driveFileId: null, source: 'upload' }],
      { usage: 5 * 1024 * 1024, quota: 2 * 1024 * 1024 * 1024, available: 0, lowSpace: false },
    );
    expect(s.totalText).toBe('1 logs stored');
    expect(s.storageText).toBe('Using 5.0 MB of 2.0 GB available');
  });
  it('handles null storage estimate', () => {
    expect(formatHeaderStats([], null).storageText).toBe('Storage usage unavailable');
  });
});

describe('createLogRepositoryPanel (FR-184/185)', () => {
  it('renders a collapsible "Log Repository" panel with a disabled Drive Connect button', () => {
    const panel = createLogRepositoryPanel({ onLoadAnalyze: () => {} });
    expect(panel.textContent).toContain('Log Repository');
    const connect = panel.querySelector<HTMLButtonElement>('[data-repo-drive-connect]');
    expect(connect).not.toBeNull();
    expect(connect!.disabled).toBe(true);
    expect(connect!.title).toBe('Cloud sync arrives with the hosted deploy');
    // header stat slots exist
    expect(panel.querySelector('[data-repo-total]')).not.toBeNull();
    expect(panel.querySelector('[data-repo-storage]')).not.toBeNull();
    // table + filter slots exist for later tasks
    expect(panel.querySelector('[data-repo-tbody]')).not.toBeNull();
    expect(panel.querySelector('[data-repo-filter]')).not.toBeNull();
    // panel is open by default (FR-184)
    expect(panel.querySelector('[data-collapsible-body]')?.classList.contains('hidden')).toBe(false);
  });
});
