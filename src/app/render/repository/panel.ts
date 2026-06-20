// Persistent "📂 Log Repository" panel (FR-184/185/188). Local-only; the Drive
// badge + Connect button render DISABLED (parked to Phase 4c). Re-renders from
// listRepoMeta() on every mutation via refreshRepository().

import { el, collapsibleSection } from '../dom';
import { listRepoMeta } from '../../repository/repository';
import { getStorageInfo, formatStorage } from '../../repository/storage';
import type { StorageInfo } from '../../repository/storage';
import type { RepoMeta } from '../../repository/types';
import { renderRepoTableBody } from './repoTable';
import type { RepoRowActions } from './repoTable';
import { buildFilterBar, filterRepoRows } from './filter';
import type { RepoFilter } from './filter';

export interface RepoPanelDeps {
  onLoadAnalyze: (id: number) => void | Promise<void>;
}

export function formatHeaderStats(
  meta: RepoMeta[],
  storage: StorageInfo | null,
): { totalText: string; storageText: string } {
  return {
    totalText: `${meta.length} logs stored`,
    storageText: storage ? formatStorage(storage) : 'Storage usage unavailable',
  };
}

export const REPO_COLUMNS = [
  '', 'Filename', 'Site Name', 'EVSE IP', 'Saved (IST)', 'Size', 'Tags', 'Storage', 'Actions',
] as const;

// Module-level refs set by createLogRepositoryPanel so refreshRepository can update them.
let totalEl: HTMLElement | null = null;
let storageEl: HTMLElement | null = null;
let tbodyEl: HTMLElement | null = null;
let panelDeps: RepoPanelDeps | null = null;

// Module state for Task 3 (filtering) and Tasks 4–5 (select/tag/delete).
let allMeta: RepoMeta[] = [];
const selectedIds = new Set<number>();
const EMPTY_FILTER: RepoFilter = { text: '', evseIp: '', from: '', to: '', tag: '' };
let currentFilter: RepoFilter = { ...EMPTY_FILTER };

// Tasks 4–5 will replace these stubs. For now only onLoadAnalyze is wired.
function buildRowActions(): RepoRowActions {
  return {
    onLoadAnalyze: (id) => panelDeps?.onLoadAnalyze(id),
    // STUB — Task 4 wires tag/delete modals
    onTag: (_id) => { /* stub: Task 4 */ },
    onDelete: (_id) => { /* stub: Task 5 */ },
    // STUB — Task 5 wires multi-select state
    onToggleSelect: (_id, _checked) => { /* stub: Task 5 */ },
  };
}

export function createLogRepositoryPanel(deps: RepoPanelDeps): HTMLElement {
  panelDeps = deps;

  totalEl = el('span', {
    className: 'font-semibold text-gray-800 dark:text-gray-200',
    text: '0 logs stored',
    attrs: { 'data-repo-total': '' },
  });
  storageEl = el('span', {
    className: 'text-gray-600 dark:text-gray-400',
    text: 'Storage usage unavailable',
    attrs: { 'data-repo-storage': '' },
  });

  const driveBadge = el('span', {
    className:
      'inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-300',
    text: '☁ Drive: not connected',
    attrs: { 'data-repo-drive-badge': '' },
  });
  // Drive Connect is disabled until Phase 4c (cloud/hosted deploy). FR-205/206.
  const connectBtn = el('button', {
    className:
      'text-xs font-semibold py-1 px-3 rounded-lg bg-gray-300 text-gray-500 dark:bg-gray-700 dark:text-gray-500 cursor-not-allowed',
    text: 'Connect',
    attrs: {
      'data-repo-drive-connect': '',
      disabled: '',
      title: 'Cloud sync arrives with the hosted deploy',
    },
  });

  const headerStats = el('div', { className: 'flex flex-wrap items-center gap-4 mb-3 text-sm' }, [
    totalEl,
    el('span', { className: 'text-gray-400', text: '·' }),
    storageEl,
    el('span', { className: 'ml-auto flex items-center gap-2' }, [driveBadge, connectBtn]),
  ]);

  // Filter bar slot (Task 3 — FR-186/195). The slot element is kept so the
  // existing panel test can query [data-repo-filter]; the built bar is appended inside it.
  const filterSlot = el('div', { attrs: { 'data-repo-filter': '' } });
  const onFilterChange = (f: RepoFilter) => {
    currentFilter = f;
    if (tbodyEl) {
      renderRepoTableBody(tbodyEl, filterRepoRows(allMeta, currentFilter), buildRowActions(), selectedIds);
    }
  };
  filterSlot.append(buildFilterBar(onFilterChange));

  const table = el('table', { className: 'min-w-full text-sm' }, [
    el('thead', { className: 'bg-gray-100 dark:bg-gray-700 text-left' }, [
      el(
        'tr',
        {},
        REPO_COLUMNS.map((c) =>
          el('th', {
            className: 'px-3 py-2 font-semibold text-gray-700 dark:text-gray-200 whitespace-nowrap',
            text: c,
          }),
        ),
      ),
    ]),
    el('tbody', { attrs: { 'data-repo-tbody': '' } }),
  ]);
  tbodyEl = table.querySelector<HTMLElement>('[data-repo-tbody]');

  const body = el('div', {}, [
    headerStats,
    filterSlot,
    el('div', { className: 'overflow-x-auto' }, [table]),
  ]);

  // collapsibleSection(title, emoji, body, opts?) — body starts OPEN (FR-184).
  return collapsibleSection('Log Repository', '📂', body);
}

export async function refreshRepository(): Promise<void> {
  const [meta, storage] = await Promise.all([listRepoMeta(), getStorageInfo()]);
  const stats = formatHeaderStats(meta, storage);
  if (totalEl) totalEl.textContent = stats.totalText;
  if (storageEl) storageEl.textContent = stats.storageText;
  allMeta = meta;
  if (tbodyEl) {
    renderRepoTableBody(tbodyEl, filterRepoRows(allMeta, currentFilter), buildRowActions(), selectedIds);
  }
}

export async function initLogRepository(
  mount: HTMLElement,
  deps: RepoPanelDeps,
): Promise<HTMLElement> {
  const panel = createLogRepositoryPanel(deps);
  mount.append(panel);
  await refreshRepository();
  return panel;
}
