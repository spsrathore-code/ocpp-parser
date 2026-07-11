// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { buildRepoRow, renderRepoTableBody } from '../../src/app/render/repository/repoTable';
import type { RepoMeta } from '../../src/app/repository/types';

function meta(over: Partial<RepoMeta> = {}): RepoMeta {
  return { id: 7, filename: 'charger.log', savedAt: Date.parse('2026-01-21T09:30:00Z'), fileSize: 2048, evseIp: '', siteName: '', tags: [], driveFileId: null, source: 'upload', ...over };
}
const noop = { onLoadAnalyze() {}, onTag() {}, onDelete() {}, onToggleSelect() {} };

describe('buildRepoRow (FR-187)', () => {
  it('renders all columns; empty site/ip/tags show a dash', () => {
    const tr = buildRepoRow(meta(), noop, false);
    const cells = Array.from(tr.querySelectorAll('td')).map((td) => td.textContent);
    expect(tr.querySelector('[data-repo-filename]')?.textContent).toBe('charger.log');
    expect(cells.some((c) => c === '—')).toBe(true);           // dash for empty site/ip/tags
    expect(tr.textContent).toContain('2.0 KB');                 // size
    expect(tr.querySelector('[data-repo-storage-badge]')?.textContent).toBe('Local');
  });

  it('wires action buttons to callbacks with the row id', () => {
    const onDelete = vi.fn();
    const tr = buildRepoRow(meta({ id: 42 }), { ...noop, onDelete }, false);
    tr.querySelector<HTMLButtonElement>('[data-repo-delete]')!.click();
    expect(onDelete).toHaveBeenCalledWith(42);
  });

  it('renders tag chips when present', () => {
    const tr = buildRepoRow(meta({ tags: ['Power Failure', 'Normal'] }), noop, false);
    expect(tr.textContent).toContain('Power Failure');
    expect(tr.textContent).toContain('Normal');
  });

  it('reflects selection state in the checkbox', () => {
    const tr = buildRepoRow(meta({ id: 9 }), noop, true);
    expect(tr.querySelector<HTMLInputElement>('[data-repo-select]')!.checked).toBe(true);
  });
});

describe('renderRepoTableBody', () => {
  it('renders one row per entry', () => {
    const tbody = document.createElement('tbody');
    renderRepoTableBody(tbody, [meta({ id: 1 }), meta({ id: 2 })], noop, new Set());
    expect(tbody.querySelectorAll('tr').length).toBe(2);
  });
  it('shows an empty-state row when there are no entries', () => {
    const tbody = document.createElement('tbody');
    renderRepoTableBody(tbody, [], noop, new Set());
    expect(tbody.textContent).toContain('No saved logs yet.');
  });
});
