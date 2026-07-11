// src/app/render/repository/filter.ts
// Client-side search/filter over already-loaded repository metadata (FR-186/195).
// Pure filterRepoRows + a filter-bar builder that emits the current criteria.

import { el } from '../dom';
import type { RepoMeta } from '../../repository/types';

export interface RepoFilter { text: string; evseIp: string; from: string; to: string; tag: string }

function dayBounds(ymd: string, end: boolean): number {
  const [y, m, d] = ymd.split('-').map(Number);
  return new Date(y, m - 1, d, end ? 23 : 0, end ? 59 : 0, end ? 59 : 0, end ? 999 : 0).getTime();
}

export function filterRepoRows(meta: RepoMeta[], f: RepoFilter): RepoMeta[] {
  const text = f.text.trim().toLowerCase();
  const ip = f.evseIp.trim().toLowerCase();
  const tag = f.tag.trim().toLowerCase();
  const fromTs = f.from ? dayBounds(f.from, false) : -Infinity;
  const toTs = f.to ? dayBounds(f.to, true) : Infinity;
  return meta.filter((m) => {
    if (text && !(`${m.filename} ${m.siteName}`.toLowerCase().includes(text))) return false;
    if (ip && !m.evseIp.toLowerCase().includes(ip)) return false;
    if (tag && !m.tags.some((t) => t.toLowerCase().includes(tag))) return false;
    if (m.savedAt < fromTs || m.savedAt > toTs) return false;
    return true;
  });
}

export function buildFilterBar(onChange: (f: RepoFilter) => void): HTMLElement {
  const mk = (key: keyof RepoFilter, placeholder: string, type = 'text') =>
    el('input', { className: 'text-sm px-2 py-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800', attrs: { type, placeholder, [`data-repo-f-${key === 'text' ? 'text' : key}`]: '' } }) as HTMLInputElement;
  const text = mk('text', 'Filename or site…');
  const evseIp = mk('evseIp', 'EVSE IP…');
  const from = mk('from', '', 'date');
  const to = mk('to', '', 'date');
  const tag = mk('tag', 'Tag…');
  const emit = () => onChange({ text: text.value, evseIp: evseIp.value, from: from.value, to: to.value, tag: tag.value });
  for (const i of [text, evseIp, from, to, tag]) { i.addEventListener('input', emit); i.addEventListener('change', emit); }
  return el('div', { className: 'flex flex-wrap gap-2 mb-3' }, [text, evseIp, from, to, tag]);
}
