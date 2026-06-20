// tests/unit/repository-filter.test.ts
// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { filterRepoRows, buildFilterBar, type RepoFilter } from '../../src/app/render/repository/filter';
import type { RepoMeta } from '../../src/app/repository/types';

const EMPTY: RepoFilter = { text: '', evseIp: '', from: '', to: '', tag: '' };
function meta(over: Partial<RepoMeta>): RepoMeta {
  return { id: 1, filename: 'a.log', savedAt: Date.parse('2026-01-10T00:00:00Z'), fileSize: 1, evseIp: '', siteName: '', tags: [], driveFileId: null, source: 'upload', ...over };
}
const rows = [
  meta({ id: 1, filename: 'pune-charger.log', siteName: 'Pune', evseIp: '10.0.0.1', tags: ['Power Failure'], savedAt: Date.parse('2026-01-10T08:00:00Z') }),
  meta({ id: 2, filename: 'delhi.log', siteName: 'Delhi', evseIp: '10.0.0.2', tags: ['Normal'], savedAt: Date.parse('2026-02-15T08:00:00Z') }),
];

describe('filterRepoRows (FR-186/195)', () => {
  it('returns all rows for an empty filter', () => { expect(filterRepoRows(rows, EMPTY)).toHaveLength(2); });
  it('matches filename or site name, case-insensitively', () => {
    expect(filterRepoRows(rows, { ...EMPTY, text: 'pune' }).map((r) => r.id)).toEqual([1]);
    expect(filterRepoRows(rows, { ...EMPTY, text: 'DELHI' }).map((r) => r.id)).toEqual([2]);
  });
  it('matches EVSE IP substring', () => { expect(filterRepoRows(rows, { ...EMPTY, evseIp: '0.0.2' }).map((r) => r.id)).toEqual([2]); });
  it('matches a tag', () => { expect(filterRepoRows(rows, { ...EMPTY, tag: 'power' }).map((r) => r.id)).toEqual([1]); });
  it('bounds by date range inclusive', () => {
    expect(filterRepoRows(rows, { ...EMPTY, from: '2026-02-01', to: '2026-02-28' }).map((r) => r.id)).toEqual([2]);
  });
});

describe('buildFilterBar', () => {
  it('fires onChange with the current criteria when text input changes', () => {
    const onChange = vi.fn();
    const bar = buildFilterBar(onChange);
    const input = bar.querySelector<HTMLInputElement>('[data-repo-f-text]')!;
    input.value = 'pune';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ text: 'pune' }));
  });
});
