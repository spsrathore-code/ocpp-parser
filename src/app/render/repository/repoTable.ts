// Stored-logs table rows (FR-187). One <tr> per RepoMeta; pure DOM construction.
// Storage badge is always "Local" while Drive is parked (Phase 4c sets "Cloud").

import { el } from '../dom';
import { convertToIST, formatBytes } from '../format';
import type { RepoMeta } from '../../repository/types';

export interface RepoRowActions {
  onLoadAnalyze: (id: number) => void;
  onTag: (id: number) => void;
  onDelete: (id: number) => void;
  onToggleSelect: (id: number, checked: boolean) => void;
}

const DASH = '—';
const BTN = 'text-xs font-semibold py-1 px-2 rounded';

function tagChips(tags: string[]): HTMLElement {
  if (tags.length === 0) return el('span', { className: 'text-gray-400', text: DASH });
  return el('span', { className: 'flex flex-wrap gap-1' }, tags.map((t) =>
    el('span', {
      className: 'text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200',
      text: t,
    })));
}

export function buildRepoRow(meta: RepoMeta, actions: RepoRowActions, selected: boolean): HTMLTableRowElement {
  const id = meta.id as number;

  const checkbox = el('input', { attrs: { type: 'checkbox', 'data-repo-select': String(id) } }) as HTMLInputElement;
  checkbox.checked = selected;
  checkbox.addEventListener('change', () => actions.onToggleSelect(id, checkbox.checked));

  const loadBtn = el('button', {
    className: `${BTN} bg-blue-600 hover:bg-blue-700 text-white`,
    text: 'Load & Analyze',
    attrs: { 'data-repo-load': String(id) },
  });
  const tagBtn = el('button', {
    className: `${BTN} bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-200`,
    text: 'Tag',
    attrs: { 'data-repo-tag': String(id) },
  });
  const delBtn = el('button', {
    className: `${BTN} bg-red-600 hover:bg-red-700 text-white`,
    text: 'Delete',
    attrs: { 'data-repo-delete': String(id) },
  });

  loadBtn.addEventListener('click', () => actions.onLoadAnalyze(id));
  tagBtn.addEventListener('click', () => actions.onTag(id));
  delBtn.addEventListener('click', () => actions.onDelete(id));

  const td = (child: Node | string, cls = '') =>
    el('td', { className: `px-3 py-2 align-top ${cls}` }, [
      typeof child === 'string' ? document.createTextNode(child) : child,
    ]);

  return el('tr', { className: 'border-b border-gray-100 dark:border-gray-700' }, [
    td(checkbox),
    el('td', {
      className: 'px-3 py-2 align-top font-medium text-gray-800 dark:text-gray-100',
      attrs: { 'data-repo-filename': '' },
      text: meta.filename,
    }),
    td(meta.siteName ? document.createTextNode(meta.siteName) : el('span', { className: 'text-gray-400', text: DASH })),
    td(meta.evseIp ? document.createTextNode(meta.evseIp) : el('span', { className: 'text-gray-400', text: DASH })),
    td(convertToIST(new Date(meta.savedAt).toISOString()), 'whitespace-nowrap'),
    td(formatBytes(meta.fileSize), 'whitespace-nowrap'),
    td(tagChips(meta.tags)),
    el('td', { className: 'px-3 py-2 align-top' }, [
      el('span', {
        className: 'text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-200',
        attrs: { 'data-repo-storage-badge': '' },
        text: 'Local',
      }),
    ]),
    el('td', { className: 'px-3 py-2 align-top' }, [
      el('div', { className: 'flex gap-1' }, [loadBtn, tagBtn, delBtn]),
    ]),
  ]) as HTMLTableRowElement;
}

export function renderRepoTableBody(
  tbody: HTMLElement,
  meta: RepoMeta[],
  actions: RepoRowActions,
  selectedIds: Set<number>,
): void {
  tbody.replaceChildren();
  if (meta.length === 0) {
    tbody.append(
      el('tr', {}, [
        el('td', {
          className: 'px-3 py-4 text-center text-gray-500',
          attrs: { colspan: '9' },
          text: 'No saved logs yet.',
        }),
      ]),
    );
    return;
  }
  for (const m of meta) {
    tbody.append(buildRepoRow(m, actions, selectedIds.has(m.id as number)));
  }
}
