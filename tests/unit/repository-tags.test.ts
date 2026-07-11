// tests/unit/repository-tags.test.ts
// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { indexedDB } from 'fake-indexeddb';
import { saveLogToRepository, loadFromRepo, updateEntryTags } from '../../src/app/repository/repository';
import { DB_NAME } from '../../src/app/repository/db';
import { openTagEditor, PRESET_TAGS } from '../../src/app/render/repository/tagEditor';

beforeEach(async () => {
  document.body.innerHTML = '';
  await new Promise<void>((res) => { const r = indexedDB.deleteDatabase(DB_NAME); r.onsuccess = () => res(); r.onerror = () => res(); });
});

describe('PRESET_TAGS (FR-194)', () => {
  it('lists the 7 presets in spec order', () => {
    expect(PRESET_TAGS).toEqual(['Power Failure', 'CMS Issue', 'Phantom Connection', 'Zero Energy', 'Emergency Stop', 'EV Compatibility', 'Normal']);
  });
});

describe('updateEntryTags', () => {
  it('persists new tags without altering content', async () => {
    const saved = await saveLogToRepository('the log text', { filename: 't.log', fileSize: 12 });
    await updateEntryTags(saved!.id, ['Power Failure', 'Custom']);
    const got = await loadFromRepo(saved!.id);
    expect(got?.meta.tags).toEqual(['Power Failure', 'Custom']);
    expect(got?.content).toBe('the log text');
  });
});

describe('openTagEditor (FR-356)', () => {
  it('pre-selects current tags and returns the chosen set on Save', () => {
    const onSave = vi.fn();
    const modal = openTagEditor(5, ['Normal'], onSave);
    // toggle a preset on
    const failChip = modal.querySelector<HTMLButtonElement>('[data-tag-chip="Power Failure"]')!;
    failChip.click();
    modal.querySelector<HTMLButtonElement>('[data-tag-save]')!.click();
    expect(onSave).toHaveBeenCalledWith(expect.arrayContaining(['Normal', 'Power Failure']));
  });
});
