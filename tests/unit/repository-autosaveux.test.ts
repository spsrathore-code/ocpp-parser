// tests/unit/repository-autosaveux.test.ts
// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { indexedDB } from 'fake-indexeddb';
import { detectSiteName, showToast, showSiteNameBanner } from '../../src/app/render/repository/autoSaveUx';
import { saveLogToRepository, loadFromRepo, updateEntrySiteName } from '../../src/app/repository/repository';
import { DB_NAME } from '../../src/app/repository/db';

beforeEach(async () => {
  document.body.innerHTML = '';
  await new Promise<void>((res) => { const r = indexedDB.deleteDatabase(DB_NAME); r.onsuccess = () => res(); r.onerror = () => res(); });
});

describe('detectSiteName (FR-180)', () => {
  it('strips extension and trailing timestamp', () => {
    expect(detectSiteName('Pune_21_January_2026_09:30_AM.log')).toBe('Pune');
    expect(detectSiteName('charger.log')).toBe('charger');
  });
});

describe('showToast (FR-182)', () => {
  it('renders a toast with the message', () => {
    showToast('✅ Saved to repository: a.log');
    expect(document.body.textContent).toContain('✅ Saved to repository: a.log');
  });
});

describe('showSiteNameBanner (FR-180)', () => {
  it('pre-fills the detected site name and persists on Save', async () => {
    const saved = await saveLogToRepository('x', { filename: 'Pune_21_January_2026_09:30_AM.log', fileSize: 1 });
    const onSaved = vi.fn();
    const banner = showSiteNameBanner(saved!.id, 'Pune_21_January_2026_09:30_AM.log', onSaved);
    const input = banner.querySelector<HTMLInputElement>('[data-sitename-input]')!;
    expect(input.value).toBe('Pune');
    banner.querySelector<HTMLButtonElement>('[data-sitename-save]')!.click();
    await Promise.resolve(); await Promise.resolve();
    expect((await loadFromRepo(saved!.id))?.meta.siteName).toBe('Pune');
    expect(onSaved).toHaveBeenCalled();
  });
});
