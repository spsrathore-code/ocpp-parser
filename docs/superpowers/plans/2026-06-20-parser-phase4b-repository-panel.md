# Parser Phase 4b — Log Repository Panel UI (local) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the faithful, local-only **Log Repository panel UI** on top of the Phase 4a headless service — a collapsible panel (above the upload card) with header stats, search/filter, a stored-logs table, Load & Analyze / Delete / bulk actions, a tag editor, and the auto-save UX (site-name pop-in banner, toast, duplicate prompt).

**Architecture:** New `src/app/render/repository/` module (UI) consuming the existing `src/app/repository/` service (data). Pure logic (filtering, row-shaping, formatting) is separated from DOM construction so it unit-tests cleanly; DOM uses the existing `el()` / `collapsibleSection()` / `clearChildren()` helpers and the `showContextModal` modal pattern. The panel re-renders from `listRepoMeta()` on every mutation. Google Drive UI is rendered **disabled** (parked to 4c); all Drive I/O is out of scope.

**Tech Stack:** TypeScript, Vite, Vitest with `// @vitest-environment jsdom` + `fake-indexeddb/auto` for panel tests, the Phase 4a repository service, Tailwind utility classes (Play CDN, already in `index.html`).

## Global Constraints

- No source file > 2000 lines.
- **FR-205 / FR-206 (carried from 4a):** no existing analysis/rendering pipeline behavior changed. New existing-code edits are limited to: (a) `shell.ts` adds a panel mount point above the upload card; (b) `main.ts` calls `initLogRepository(...)` and swaps the headless auto-save for the UX-aware one. The `analyze()` → `renderResults()` path is untouched.
- **Faithful parity** with v2026.05.14 (user decision 2026-06-20): reproduce the legacy panel UX in full — do not compact. See [[feedback_faithful_parity_no_compaction]].
- **Google Drive is PARKED (4c).** Render the Drive badge + Connect button **disabled** with tooltip `"Cloud sync arrives with the hosted deploy"` (aligns with FR-197's file:// disabled state). No OAuth, no upload/download, no `syncLogToDrive`/`syncAllToDrive`. The `Storage` column shows **Local** for every row (cloud state lands in 4c).
- **FR-184:** "📂 Log Repository" collapsible panel renders at page load, **above** the file-upload card, always visible.
- **FR-185:** panel header shows: Total logs stored · Storage used · Storage available · Drive connection badge (disabled) · Connect/Disconnect button (disabled).
- **FR-186:** search/filter bar covers filename, site name, EVSE IP, date range (from/to), tags.
- **FR-187:** table columns in order: Filename · Site Name · EVSE IP · Saved (IST) · Size · Tags · Storage (Local/Cloud) · Actions (Load & Analyze · Tag · Delete).
- **FR-188:** dark/light theme consistent (use the same `dark:` utility classes as existing sections).
- **FR-189:** "Load & Analyze" retrieves + decompresses from IndexedDB → existing parse pipeline (`analyzeLogLines`) → `renderResults`.
- **FR-191/192:** Delete after confirmation; the "Also delete from Google Drive?" second prompt is **deferred to 4c** (local delete is the only path now) — leave a code comment marking the 4c hook.
- **FR-193/194:** tags are a user-defined string array; preset suggestions (exact list, order): `Power Failure`, `CMS Issue`, `Phantom Connection`, `Zero Energy`, `Emergency Stop`, `EV Compatibility`, `Normal`; custom tags allowed.
- **FR-195:** tags filterable in the search bar.
- **FR-180:** after auto-save, a **non-blocking pop-in banner** prompts for site name, pre-populated from filename if detectable.
- **FR-182:** toast `"✅ Saved to repository: filename.log"` (exact text, filename substituted).
- **FR-353:** per-row checkbox selection with a live selected-count.
- **FR-355:** bulk delete (`deleteSelectedRepoEntries`) prompts once before deleting selected; `deleteAllBrowserLogs` clears all browser-stored logs (Drive copies untouched — moot while parked).
- **FR-357 / FR-183:** duplicate-on-save prompt — **Overwrite** vs **Save as new version** (wired as the `onDuplicate` callback into the auto-save flow built in 4a).
- IST formatting: reuse `convertToIST` from `src/app/render/format.ts` (already used by Transaction Summary). Size formatting: reuse/extend an existing byte formatter if present in `format.ts`; otherwise add `formatBytes` there.

---

### Task 1: Repository panel shell + header stats + mount + init/refresh

**Files:**
- Create: `src/app/render/repository/panel.ts`
- Modify: `src/app/render/shell.ts` (add a panel mount point above the upload card; export its ref)
- Modify: `src/app/main.ts` (call `initLogRepository`)
- Test: `tests/unit/repository-panel.test.ts`

**Interfaces:**
- Consumes: `el`, `collapsibleSection`, `clearChildren` from `../dom`; `listRepoMeta` from `../../repository/repository`; `getStorageInfo`, `formatStorage` from `../../repository/storage`; `RepoMeta` from `../../repository/types`.
- Produces:
  - `interface RepoPanelDeps { onLoadAnalyze: (id: number) => void | Promise<void>; }` — callbacks the panel needs from the host (Load & Analyze target). More fields added in later tasks.
  - `createLogRepositoryPanel(deps: RepoPanelDeps): HTMLElement` — builds and returns the persistent panel element (collapsible, open by default), containing a header-stats row, a (placeholder) filter bar slot, and a (placeholder) table slot.
  - `async initLogRepository(mount: HTMLElement, deps: RepoPanelDeps): Promise<HTMLElement>` — creates the panel, appends it to `mount`, runs the first `refreshRepository`, returns the panel element.
  - `async refreshRepository(): Promise<void>` — re-reads `listRepoMeta()` + `getStorageInfo()`, updates header counts and the table body. Idempotent; safe to call after every mutation.
  - `formatHeaderStats(meta: RepoMeta[], storage: import('../../repository/storage').StorageInfo | null): { totalText: string; storageText: string }` — pure: `totalText = "N logs stored"`, `storageText = formatStorage(storage)` or `"Storage usage unavailable"` when null.

- [ ] **Step 1: Write the failing test**

```ts
// tests/unit/repository-panel.test.ts
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
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/repository-panel.test.ts`
Expected: FAIL — cannot resolve `../../src/app/render/repository/panel`.

- [ ] **Step 3: Implement the panel**

```ts
// src/app/render/repository/panel.ts
// Persistent "📂 Log Repository" panel (FR-184/185/188). Local-only; the Drive
// badge + Connect button render DISABLED (parked to Phase 4c). Re-renders from
// listRepoMeta() on every mutation via refreshRepository().

import { el, collapsibleSection, clearChildren } from '../dom';
import { listRepoMeta } from '../../repository/repository';
import { getStorageInfo, formatStorage, type StorageInfo } from '../../repository/storage';
import type { RepoMeta } from '../../repository/types';

export interface RepoPanelDeps {
  onLoadAnalyze: (id: number) => void | Promise<void>;
}

export function formatHeaderStats(meta: RepoMeta[], storage: StorageInfo | null): { totalText: string; storageText: string } {
  return {
    totalText: `${meta.length} logs stored`,
    storageText: storage ? formatStorage(storage) : 'Storage usage unavailable',
  };
}

// Module-level refs set by createLogRepositoryPanel so refreshRepository can update them.
let totalEl: HTMLElement | null = null;
let storageEl: HTMLElement | null = null;
let tbodyEl: HTMLElement | null = null;
let panelDeps: RepoPanelDeps | null = null;

export function createLogRepositoryPanel(deps: RepoPanelDeps): HTMLElement {
  panelDeps = deps;

  totalEl = el('span', { className: 'font-semibold text-gray-800 dark:text-gray-200', text: '0 logs stored', attrs: { 'data-repo-total': '' } });
  storageEl = el('span', { className: 'text-gray-600 dark:text-gray-400', text: 'Storage usage unavailable', attrs: { 'data-repo-storage': '' } });

  const driveBadge = el('span', {
    className: 'inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-300',
    text: '☁ Drive: not connected', attrs: { 'data-repo-drive-badge': '' },
  });
  const connectBtn = el('button', {
    className: 'text-xs font-semibold py-1 px-3 rounded-lg bg-gray-300 text-gray-500 dark:bg-gray-700 dark:text-gray-500 cursor-not-allowed',
    text: 'Connect', attrs: { 'data-repo-drive-connect': '', disabled: '', title: 'Cloud sync arrives with the hosted deploy' },
  });

  const headerStats = el('div', { className: 'flex flex-wrap items-center gap-4 mb-3 text-sm' }, [
    totalEl, el('span', { className: 'text-gray-400', text: '·' }), storageEl,
    el('span', { className: 'ml-auto flex items-center gap-2' }, [driveBadge, connectBtn]),
  ]);

  const filterSlot = el('div', { attrs: { 'data-repo-filter': '' } });

  const table = el('table', { className: 'min-w-full text-sm' }, [
    el('thead', { className: 'bg-gray-100 dark:bg-gray-700 text-left' }, [
      el('tr', {}, REPO_COLUMNS.map((c) => el('th', { className: 'px-3 py-2 font-semibold text-gray-700 dark:text-gray-200 whitespace-nowrap', text: c }))),
    ]),
    el('tbody', { attrs: { 'data-repo-tbody': '' } }),
  ]);
  tbodyEl = table.querySelector('[data-repo-tbody]');

  const body = el('div', {}, [headerStats, filterSlot, el('div', { className: 'overflow-x-auto' }, [table])]);
  return collapsibleSection({ title: '📂 Log Repository', startOpen: true }, body);
}

export const REPO_COLUMNS = ['', 'Filename', 'Site Name', 'EVSE IP', 'Saved (IST)', 'Size', 'Tags', 'Storage', 'Actions'] as const;

export async function refreshRepository(): Promise<void> {
  const [meta, storage] = await Promise.all([listRepoMeta(), getStorageInfo()]);
  const stats = formatHeaderStats(meta, storage);
  if (totalEl) totalEl.textContent = stats.totalText;
  if (storageEl) storageEl.textContent = stats.storageText;
  if (tbodyEl && panelDeps) {
    clearChildren(tbodyEl);
    // Rows are rendered in Task 2 (renderRepoTableBody). Placeholder empty-state for now:
    if (meta.length === 0) {
      tbodyEl.append(el('tr', {}, [el('td', { className: 'px-3 py-4 text-center text-gray-500', attrs: { colspan: String(REPO_COLUMNS.length) }, text: 'No saved logs yet.' })]));
    }
  }
}

export async function initLogRepository(mount: HTMLElement, deps: RepoPanelDeps): Promise<HTMLElement> {
  const panel = createLogRepositoryPanel(deps);
  mount.append(panel);
  await refreshRepository();
  return panel;
}
```

> **Note:** `collapsibleSection` already exists in `src/app/render/dom.ts`. Read its signature first; if it has no `startOpen` option, add one (additive, default closed) or pass the title-only form and set the body open by default — match its existing API. The test only asserts the title text and the slot markers, so adapt the call to the real signature.

- [ ] **Step 4: Wire shell + main**

In `src/app/render/shell.ts`: add a panel mount `const repoMount = el('div', { attrs: { id: 'log-repository-mount' } });` and place it in `root.append(header, repoMount, uploadCard, container);` (above the upload card per FR-184). Add `repoMount` to `ShellRefs` and the returned object.

In `src/app/main.ts`: after `initTheme();`, call:
```ts
import { initLogRepository } from './render/repository/panel';
// …
void initLogRepository(repoMount, {
  onLoadAnalyze: async (id) => {
    const { loadAndAnalyzeFromRepo } = await import('./render/repository/loadAnalyze');
    await loadAndAnalyzeFromRepo(id, container);
  },
});
```
(`loadAnalyze` module is built in Task 4; until then the dynamic import is unused at runtime because no rows exist. If the implementer prefers, stub `onLoadAnalyze: () => {}` here and replace it in Task 4 — either is acceptable, note which in the report.)

- [ ] **Step 5: Run test + typecheck**

Run: `npx vitest run tests/unit/repository-panel.test.ts && npm run typecheck`
Expected: PASS (4 tests); no TS errors.

- [ ] **Step 6: Commit**

```bash
git add src/app/render/repository/panel.ts src/app/render/shell.ts src/app/main.ts tests/unit/repository-panel.test.ts
git commit -m "feat(parser): Phase 4b-1 — repository panel shell + header stats, mounted above upload (FR-184/185)"
```

---

### Task 2: Stored-logs table rows (8 columns)

**Files:**
- Create: `src/app/render/repository/repoTable.ts`
- Modify: `src/app/render/repository/panel.ts` (`refreshRepository` calls `renderRepoTableBody`)
- Modify: `src/app/render/format.ts` (add `formatBytes` if absent)
- Test: `tests/unit/repository-table.test.ts`

**Interfaces:**
- Consumes: `el` from `../dom`; `convertToIST`, `formatBytes` from `../format`; `RepoMeta` from `../../repository/types`.
- Produces:
  - `interface RepoRowActions { onLoadAnalyze: (id: number) => void; onTag: (id: number) => void; onDelete: (id: number) => void; onToggleSelect: (id: number, checked: boolean) => void; }`
  - `buildRepoRow(meta: RepoMeta, actions: RepoRowActions, selected: boolean): HTMLTableRowElement` — one `<tr>` with: checkbox (`data-repo-select` + id), Filename, Site Name (or `—`), EVSE IP (or `—`), Saved IST (`convertToIST(new Date(savedAt).toISOString())`), Size (`formatBytes(fileSize)`), Tags (chips, or `—`), Storage badge (`Local`), Actions (Load & Analyze / Tag / Delete buttons carrying `data-repo-*` + id).
  - `renderRepoTableBody(tbody: HTMLElement, meta: RepoMeta[], actions: RepoRowActions, selectedIds: Set<number>): void` — clears tbody, appends a row per entry, or an empty-state row spanning all columns when `meta` is empty.

- [ ] **Step 1: Write the failing test**

```ts
// tests/unit/repository-table.test.ts
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/repository-table.test.ts`
Expected: FAIL — cannot resolve `repoTable`.

- [ ] **Step 3: Add `formatBytes` to `format.ts` if missing**

Check `src/app/render/format.ts` for an existing byte formatter. If none, add:
```ts
/** Human-readable byte size: 2048 → "2.0 KB", 5_242_880 → "5.0 MB". */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const units = ['KB', 'MB', 'GB'];
  let v = bytes / 1024;
  let i = 0;
  while (v >= 1024 && i < units.length - 1) { v /= 1024; i += 1; }
  return `${v.toFixed(1)} ${units[i]}`;
}
```
(If a byte formatter already exists, reuse it and skip this step — note which in the report.)

- [ ] **Step 4: Implement the table**

```ts
// src/app/render/repository/repoTable.ts
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
    el('span', { className: 'text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200', text: t })));
}

export function buildRepoRow(meta: RepoMeta, actions: RepoRowActions, selected: boolean): HTMLTableRowElement {
  const id = meta.id as number;
  const checkbox = el('input', { attrs: { type: 'checkbox', 'data-repo-select': String(id) } }) as HTMLInputElement;
  checkbox.checked = selected;
  checkbox.addEventListener('change', () => actions.onToggleSelect(id, checkbox.checked));

  const loadBtn = el('button', { className: `${BTN} bg-blue-600 hover:bg-blue-700 text-white`, text: 'Load & Analyze', attrs: { 'data-repo-load': String(id) } });
  const tagBtn = el('button', { className: `${BTN} bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-200`, text: 'Tag', attrs: { 'data-repo-tag': String(id) } });
  const delBtn = el('button', { className: `${BTN} bg-red-600 hover:bg-red-700 text-white`, text: 'Delete', attrs: { 'data-repo-delete': String(id) } });
  loadBtn.addEventListener('click', () => actions.onLoadAnalyze(id));
  tagBtn.addEventListener('click', () => actions.onTag(id));
  delBtn.addEventListener('click', () => actions.onDelete(id));

  const td = (child: Node | string, cls = '') => el('td', { className: `px-3 py-2 align-top ${cls}` }, [typeof child === 'string' ? document.createTextNode(child) : child]);

  return el('tr', { className: 'border-b border-gray-100 dark:border-gray-700' }, [
    td(checkbox),
    el('td', { className: 'px-3 py-2 align-top font-medium text-gray-800 dark:text-gray-100', attrs: { 'data-repo-filename': '' }, text: meta.filename }),
    td(meta.siteName || el('span', { className: 'text-gray-400', text: DASH })),
    td(meta.evseIp || el('span', { className: 'text-gray-400', text: DASH })),
    td(convertToIST(new Date(meta.savedAt).toISOString()), 'whitespace-nowrap'),
    td(formatBytes(meta.fileSize), 'whitespace-nowrap'),
    td(tagChips(meta.tags)),
    el('td', { className: 'px-3 py-2 align-top' }, [el('span', { className: 'text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-200', attrs: { 'data-repo-storage-badge': '' }, text: 'Local' })]),
    el('td', { className: 'px-3 py-2 align-top' }, [el('div', { className: 'flex gap-1' }, [loadBtn, tagBtn, delBtn])]),
  ]);
}

export function renderRepoTableBody(tbody: HTMLElement, meta: RepoMeta[], actions: RepoRowActions, selectedIds: Set<number>): void {
  tbody.replaceChildren();
  if (meta.length === 0) {
    tbody.append(el('tr', {}, [el('td', { className: 'px-3 py-4 text-center text-gray-500', attrs: { colspan: '9' }, text: 'No saved logs yet.' })]));
    return;
  }
  for (const m of meta) tbody.append(buildRepoRow(m, actions, selectedIds.has(m.id as number)));
}
```

- [ ] **Step 5: Wire into `refreshRepository`**

In `panel.ts`, replace the placeholder empty-state logic in `refreshRepository` with a call to `renderRepoTableBody(tbodyEl, currentFiltered(meta), rowActions, selectedIds)`. Introduce module state `let allMeta: RepoMeta[] = []` (store the last fetch for filtering in Task 3) and a `selectedIds = new Set<number>()`. Build `rowActions` from `panelDeps` (`onLoadAnalyze`) and Task 4/5 callbacks (stub `onTag`/`onDelete`/`onToggleSelect` to no-ops here; they are wired in Tasks 4–5). Note the stubs in the report.

- [ ] **Step 6: Run tests + typecheck**

Run: `npx vitest run tests/unit/repository-table.test.ts tests/unit/repository-panel.test.ts && npm run typecheck`
Expected: PASS; no TS errors.

- [ ] **Step 7: Commit**

```bash
git add src/app/render/repository/repoTable.ts src/app/render/repository/panel.ts src/app/render/format.ts tests/unit/repository-table.test.ts
git commit -m "feat(parser): Phase 4b-2 — stored-logs table rows (8 cols, IST/size/tags/Local badge) (FR-187)"
```

---

### Task 3: Search / filter bar

**Files:**
- Create: `src/app/render/repository/filter.ts`
- Modify: `src/app/render/repository/panel.ts` (render the filter bar into the filter slot; re-render table on input)
- Test: `tests/unit/repository-filter.test.ts`

**Interfaces:**
- Consumes: `el` from `../dom`; `RepoMeta` from `../../repository/types`.
- Produces:
  - `interface RepoFilter { text: string; evseIp: string; from: string; to: string; tag: string }` (all optional-as-empty-string; `from`/`to` are `YYYY-MM-DD`).
  - `filterRepoRows(meta: RepoMeta[], f: RepoFilter): RepoMeta[]` — pure. `text` matches filename OR siteName (case-insensitive substring); `evseIp` substring; `tag` matches any entry tag (case-insensitive substring); `from`/`to` bound `savedAt` (inclusive, by calendar day in local time). Empty fields are ignored.
  - `buildFilterBar(onChange: (f: RepoFilter) => void): HTMLElement` — inputs for text (placeholder `Filename or site…`), EVSE IP, from-date, to-date, tag; each fires `onChange` with the current `RepoFilter` on `input`/`change`.

- [ ] **Step 1: Write the failing test**

```ts
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/repository-filter.test.ts`
Expected: FAIL — cannot resolve `filter`.

- [ ] **Step 3: Implement the filter**

```ts
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
```

> The `data-repo-f-text` attribute on the text input is required by the test; keep that exact name. Other inputs use `data-repo-f-evseIp` etc.

- [ ] **Step 4: Wire into the panel**

In `panel.ts`: render `buildFilterBar(onFilterChange)` into the `data-repo-filter` slot. Keep module state `currentFilter: RepoFilter` and `allMeta`. `onFilterChange` stores the filter and re-renders only the tbody via `renderRepoTableBody(tbodyEl, filterRepoRows(allMeta, currentFilter), rowActions, selectedIds)`. `refreshRepository` updates `allMeta`, then applies the same filtered render.

- [ ] **Step 5: Run tests + typecheck**

Run: `npx vitest run tests/unit/repository-filter.test.ts && npm run typecheck`
Expected: PASS; no TS errors.

- [ ] **Step 6: Commit**

```bash
git add src/app/render/repository/filter.ts src/app/render/repository/panel.ts tests/unit/repository-filter.test.ts
git commit -m "feat(parser): Phase 4b-3 — repository search/filter bar (filename/site/IP/date/tag) (FR-186/195)"
```

---

### Task 4: Row actions — Load & Analyze, Delete, bulk select/delete

**Files:**
- Create: `src/app/render/repository/loadAnalyze.ts`
- Create: `src/app/render/repository/actions.ts`
- Modify: `src/app/render/repository/panel.ts` (wire real `rowActions`, add bulk toolbar)
- Test: `tests/unit/repository-actions.test.ts`

**Interfaces:**
- Consumes: `loadFromRepo`, `deleteFromRepo`, `listRepoMeta` from `../../repository/repository`; `analyzeLogLines` from `../../analyze`; `renderResults` from `../renderResults`; `refreshRepository` from `./panel`.
- Produces:
  - `loadAndAnalyzeFromRepo(id: number, container: HTMLElement): Promise<void>` (FR-189) — `loadFromRepo(id)` → `analyzeLogLines(content.split(/\r?\n/), meta.filename)` → `renderResults(container, result)`; scrolls container into view.
  - `deleteRepoEntry(id: number, confirmFn?: (msg: string) => boolean): Promise<boolean>` (FR-191) — confirms (default `window.confirm`) then `deleteFromRepo` + `refreshRepository`; returns whether it deleted. (FR-192 Drive prompt deferred — marked with a `// 4c:` comment.)
  - `deleteSelectedRepoEntries(ids: number[], confirmFn?: (msg: string) => boolean): Promise<number>` (FR-355) — one confirm for the batch, deletes each, refreshes, returns count deleted.
  - `deleteAllBrowserLogs(confirmFn?: (msg: string) => boolean): Promise<number>` (FR-355) — confirms, deletes every entry from `listRepoMeta()`, refreshes, returns count.

- [ ] **Step 1: Write the failing test**

```ts
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/repository-actions.test.ts`
Expected: FAIL — cannot resolve `loadAnalyze` / `actions`.

- [ ] **Step 3: Implement loadAnalyze**

```ts
// src/app/render/repository/loadAnalyze.ts
// Load & Analyze (FR-189): decompress a stored log and run it through the SAME
// parse pipeline as a fresh upload, rendering into the results container.

import { loadFromRepo } from '../../repository/repository';
import { analyzeLogLines } from '../../analyze';
import { renderResults } from '../renderResults';

export async function loadAndAnalyzeFromRepo(id: number, container: HTMLElement): Promise<void> {
  const entry = await loadFromRepo(id);
  if (!entry) return;
  const result = analyzeLogLines(entry.content.split(/\r?\n/), entry.meta.filename);
  renderResults(container, result);
  container.scrollIntoView({ behavior: 'smooth', block: 'start' });
}
```

- [ ] **Step 4: Implement actions**

```ts
// src/app/render/repository/actions.ts
// Delete + bulk-delete actions (FR-191/355). Each confirms, mutates IndexedDB
// via the repository service, then triggers a panel refresh.

import { deleteFromRepo, listRepoMeta } from '../../repository/repository';
import { refreshRepository } from './panel';

type ConfirmFn = (msg: string) => boolean;
const ask: ConfirmFn = (msg) => window.confirm(msg);

export async function deleteRepoEntry(id: number, confirmFn: ConfirmFn = ask): Promise<boolean> {
  if (!confirmFn('Delete this log from the browser repository? This cannot be undone.')) return false;
  // 4c: if the entry has a driveFileId, also offer "Also delete from Google Drive?" here (FR-192).
  await deleteFromRepo(id);
  await refreshRepository();
  return true;
}

export async function deleteSelectedRepoEntries(ids: number[], confirmFn: ConfirmFn = ask): Promise<number> {
  if (ids.length === 0) return 0;
  if (!confirmFn(`Delete ${ids.length} selected log(s) from the browser repository?`)) return 0;
  for (const id of ids) await deleteFromRepo(id);
  await refreshRepository();
  return ids.length;
}

export async function deleteAllBrowserLogs(confirmFn: ConfirmFn = ask): Promise<number> {
  const all = await listRepoMeta();
  if (all.length === 0) return 0;
  if (!confirmFn(`Clear ALL ${all.length} browser-stored logs? (Cloud copies, when present, are left intact.)`)) return 0;
  for (const m of all) await deleteFromRepo(m.id as number);
  await refreshRepository();
  return all.length;
}
```

- [ ] **Step 5: Wire real actions + bulk toolbar into the panel**

In `panel.ts`: build `rowActions` with `onLoadAnalyze: (id) => panelDeps!.onLoadAnalyze(id)`, `onDelete: (id) => void deleteRepoEntry(id)`, `onTag: (id) => void openTagEditor(id)` (Task 5 stub for now → no-op), `onToggleSelect: (id, checked) => { checked ? selectedIds.add(id) : selectedIds.delete(id); updateSelectedCount(); }`. Add a bulk toolbar above the table: a live count (`data-repo-selected-count`), a "Delete selected" button → `deleteSelectedRepoEntries([...selectedIds])` then `selectedIds.clear()`, and a "Clear all browser logs" button → `deleteAllBrowserLogs()`. Implement `updateSelectedCount()` to write `${selectedIds.size} selected` into the count element.

- [ ] **Step 6: Run tests + typecheck**

Run: `npx vitest run tests/unit/repository-actions.test.ts && npm run typecheck`
Expected: PASS; no TS errors.

- [ ] **Step 7: Commit**

```bash
git add src/app/render/repository/loadAnalyze.ts src/app/render/repository/actions.ts src/app/render/repository/panel.ts tests/unit/repository-actions.test.ts
git commit -m "feat(parser): Phase 4b-4 — Load&Analyze + delete + bulk select/delete (FR-189/191/353/355)"
```

---

### Task 5: Tag editor modal + persist tags

**Files:**
- Create: `src/app/render/repository/tagEditor.ts`
- Modify: `src/app/repository/repository.ts` (add `updateEntryTags`)
- Modify: `src/app/render/repository/panel.ts` (wire `onTag` → open editor)
- Test: `tests/unit/repository-tags.test.ts`

**Interfaces:**
- Consumes: `el` from `../dom`; `getEntry`, `putEntry` from `../../repository/db` (for the service addition); `loadFromRepo`/`listRepoMeta` from the service; `refreshRepository` from `./panel`.
- Produces:
  - `PRESET_TAGS: readonly string[]` = the 7 presets in spec order (FR-194).
  - `updateEntryTags(id: number, tags: string[]): Promise<void>` (in `repository.ts`) — read the entry, write it back with new `tags` (content/compression untouched).
  - `openTagEditor(id: number, currentTags: string[], onSave: (tags: string[]) => void | Promise<void>): HTMLElement` — modal with 7 preset toggle-chips (pre-selected from `currentTags`) + a free-text input + Add + Save/Cancel; Save calls `onSave(selectedTags)` and closes.

- [ ] **Step 1: Write the failing test**

```ts
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/repository-tags.test.ts`
Expected: FAIL — cannot resolve `tagEditor` / `updateEntryTags`.

- [ ] **Step 3: Add `updateEntryTags` to the service**

In `src/app/repository/repository.ts`:
```ts
import { putEntry, getEntry, getAllMeta, findByFilename, deleteEntry } from './db';
// …existing exports…

/** Replace an entry's tags in place (content untouched). */
export async function updateEntryTags(id: number, tags: string[]): Promise<void> {
  const entry = await getEntry(id);
  if (!entry) return;
  await putEntry({ ...entry, tags });
}
```

- [ ] **Step 4: Implement the tag editor**

```ts
// src/app/render/repository/tagEditor.ts
// Tag editor modal (FR-356/193/194): 7 preset toggle-chips + free-text custom tag.

import { el } from '../dom';

export const PRESET_TAGS = ['Power Failure', 'CMS Issue', 'Phantom Connection', 'Zero Energy', 'Emergency Stop', 'EV Compatibility', 'Normal'] as const;

export function openTagEditor(id: number, currentTags: string[], onSave: (tags: string[]) => void | Promise<void>): HTMLElement {
  const selected = new Set(currentTags);

  const chip = (label: string) => {
    const on = () => selected.has(label);
    const b = el('button', { attrs: { type: 'button', 'data-tag-chip': label }, text: label }) as HTMLButtonElement;
    const paint = () => { b.className = `text-xs px-2 py-1 rounded-full border ${on() ? 'bg-blue-600 text-white border-blue-600' : 'bg-gray-100 text-gray-700 border-gray-300 dark:bg-gray-700 dark:text-gray-200'}`; };
    b.addEventListener('click', () => { on() ? selected.delete(label) : selected.add(label); paint(); });
    paint();
    return b;
  };

  const presetRow = el('div', { className: 'flex flex-wrap gap-2 mb-3' }, PRESET_TAGS.map(chip));
  const custom = el('input', { className: 'text-sm px-2 py-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800', attrs: { type: 'text', placeholder: 'Custom tag…', 'data-tag-custom': '' } }) as HTMLInputElement;
  const addBtn = el('button', { className: 'text-xs font-semibold py-1 px-3 rounded bg-gray-200 dark:bg-gray-700', text: 'Add', attrs: { type: 'button', 'data-tag-add': '' } });
  addBtn.addEventListener('click', () => { const v = custom.value.trim(); if (v) { selected.add(v); presetRow.append(chip(v)); custom.value = ''; } });

  const saveBtn = el('button', { className: 'text-sm font-semibold py-2 px-4 rounded-lg bg-blue-600 text-white', text: 'Save', attrs: { type: 'button', 'data-tag-save': '' } });
  const cancelBtn = el('button', { className: 'text-sm font-semibold py-2 px-4 rounded-lg bg-gray-300 dark:bg-gray-700', text: 'Cancel', attrs: { type: 'button', 'data-tag-cancel': '' } });

  const modal = el('div', { className: 'fixed inset-0 bg-black/50 flex items-center justify-center z-50', attrs: { 'data-tag-modal': String(id) } }, [
    el('div', { className: 'bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4' }, [
      el('h3', { className: 'text-lg font-semibold mb-3 text-gray-800 dark:text-gray-100', text: 'Edit Tags' }),
      presetRow,
      el('div', { className: 'flex gap-2 mb-4' }, [custom, addBtn]),
      el('div', { className: 'flex justify-end gap-2' }, [cancelBtn, saveBtn]),
    ]),
  ]);

  const close = () => modal.remove();
  cancelBtn.addEventListener('click', close);
  modal.addEventListener('click', (e) => { if (e.target === modal) close(); });
  saveBtn.addEventListener('click', async () => { await onSave([...selected]); close(); });

  document.body.append(modal);
  return modal;
}
```

- [ ] **Step 5: Wire `onTag` in the panel**

In `panel.ts`, set `onTag: async (id) => { const entry = (await listRepoMeta()).find((m) => m.id === id); openTagEditor(id, entry?.tags ?? [], async (tags) => { await updateEntryTags(id, tags); await refreshRepository(); }); }`. Import `openTagEditor` and `updateEntryTags`.

- [ ] **Step 6: Run tests + typecheck**

Run: `npx vitest run tests/unit/repository-tags.test.ts && npm run typecheck`
Expected: PASS; no TS errors.

- [ ] **Step 7: Commit**

```bash
git add src/app/render/repository/tagEditor.ts src/app/repository/repository.ts src/app/render/repository/panel.ts tests/unit/repository-tags.test.ts
git commit -m "feat(parser): Phase 4b-5 — tag editor modal (7 presets + custom) + updateEntryTags (FR-193/194/356)"
```

---

### Task 6: Auto-save UX — site-name banner, toast, duplicate prompt

**Files:**
- Create: `src/app/render/repository/autoSaveUx.ts`
- Modify: `src/app/render/repository/panel.ts` (export `refreshRepository` already; expose a host container for banners/toasts)
- Modify: `src/app/main.ts` (use the UX-aware save instead of headless `autoSaveUploadedFile`)
- Modify: `src/app/repository/repository.ts` (add `updateEntrySiteName`)
- Test: `tests/unit/repository-autosaveux.test.ts`

**Interfaces:**
- Consumes: `el` from `../dom`; `saveLogToRepository`, `updateEntrySiteName` from `../../repository/repository`; `requestPersistence` from `../../repository/storage`; `refreshRepository` from `./panel`; `DuplicateChoice` type from `../../repository/repository`.
- Produces:
  - `updateEntrySiteName(id: number, siteName: string): Promise<void>` (in `repository.ts`) — like `updateEntryTags` but for `siteName`.
  - `detectSiteName(filename: string): string` — best-effort site name from a filename (strip extension + a trailing `_DD_Month_YYYY…` timestamp if present; otherwise the base name).
  - `showToast(message: string): void` (FR-182) — transient bottom toast, auto-dismiss ~4s.
  - `showSiteNameBanner(id: number, filename: string, onSaved: () => void): HTMLElement` (FR-180) — non-blocking pop-in banner pre-filled via `detectSiteName`, with Save (→ `updateEntrySiteName` + `refreshRepository` + `onSaved`) and Dismiss.
  - `promptDuplicateChoice(filename: string): Promise<DuplicateChoice>` (FR-357) — modal returning `'overwrite' | 'new-version' | 'cancel'`.
  - `autoSaveWithUx(name: string, content: string): Promise<void>` — wraps `saveLogToRepository(content, { filename:name, fileSize, source:'upload' }, promptDuplicateChoice)`; on a non-null result shows the toast + site-name banner + refreshes; fully try/caught (never throws) per FR-205/206.

- [ ] **Step 1: Write the failing test**

```ts
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/repository-autosaveux.test.ts`
Expected: FAIL — cannot resolve `autoSaveUx`.

- [ ] **Step 3: Add `updateEntrySiteName` to the service**

```ts
// in src/app/repository/repository.ts
/** Replace an entry's siteName in place (content untouched). */
export async function updateEntrySiteName(id: number, siteName: string): Promise<void> {
  const entry = await getEntry(id);
  if (!entry) return;
  await putEntry({ ...entry, siteName });
}
```

- [ ] **Step 4: Implement the UX module**

```ts
// src/app/render/repository/autoSaveUx.ts
// Auto-save UX (faithful parity): toast (FR-182), non-blocking site-name banner
// (FR-180), and the duplicate-on-save prompt (FR-357). Wraps the headless save.

import { el } from '../dom';
import { saveLogToRepository, updateEntrySiteName, type DuplicateChoice } from '../../repository/repository';
import { refreshRepository } from './panel';

export function detectSiteName(filename: string): string {
  const base = filename.replace(/\.[^.]+$/, '');
  // Strip a trailing _DD_Month_YYYY_HH:MM_AM/PM timestamp if present.
  const m = base.match(/^(.*?)_\d{1,2}_[A-Za-z]+_\d{4}.*$/);
  return (m ? m[1] : base).trim();
}

export function showToast(message: string): void {
  const toast = el('div', { className: 'fixed bottom-4 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-sm px-4 py-2 rounded-lg shadow-lg z-50', attrs: { 'data-repo-toast': '' }, text: message });
  document.body.append(toast);
  setTimeout(() => toast.remove(), 4000);
}

export function showSiteNameBanner(id: number, filename: string, onSaved: () => void): HTMLElement {
  const input = el('input', { className: 'text-sm px-2 py-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800', attrs: { type: 'text', 'data-sitename-input': '' } }) as HTMLInputElement;
  input.value = detectSiteName(filename);
  const saveBtn = el('button', { className: 'text-sm font-semibold py-1 px-3 rounded bg-blue-600 text-white', text: 'Save site', attrs: { type: 'button', 'data-sitename-save': '' } });
  const dismiss = el('button', { className: 'text-sm font-semibold py-1 px-3 rounded bg-gray-300 dark:bg-gray-700', text: 'Dismiss', attrs: { type: 'button', 'data-sitename-dismiss': '' } });
  const banner = el('div', { className: 'fixed top-4 right-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-lg rounded-lg p-3 z-50 flex items-center gap-2', attrs: { 'data-sitename-banner': '' } }, [
    el('span', { className: 'text-sm text-gray-700 dark:text-gray-200', text: `Site for ${filename}:` }), input, saveBtn, dismiss,
  ]);
  const close = () => banner.remove();
  dismiss.addEventListener('click', close);
  saveBtn.addEventListener('click', async () => { await updateEntrySiteName(id, input.value.trim()); await refreshRepository(); onSaved(); close(); });
  document.body.append(banner);
  return banner;
}

export function promptDuplicateChoice(filename: string): Promise<DuplicateChoice> {
  return new Promise((resolve) => {
    const choose = (c: DuplicateChoice) => { modal.remove(); resolve(c); };
    const btn = (label: string, c: DuplicateChoice, cls: string) => {
      const b = el('button', { className: `text-sm font-semibold py-2 px-4 rounded-lg ${cls}`, text: label, attrs: { type: 'button', 'data-dup': c } });
      b.addEventListener('click', () => choose(c));
      return b;
    };
    const modal = el('div', { className: 'fixed inset-0 bg-black/50 flex items-center justify-center z-50', attrs: { 'data-dup-modal': '' } }, [
      el('div', { className: 'bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4' }, [
        el('h3', { className: 'text-lg font-semibold mb-2 text-gray-800 dark:text-gray-100', text: 'Duplicate filename' }),
        el('p', { className: 'text-sm text-gray-600 dark:text-gray-300 mb-4', text: `"${filename}" already exists in the repository.` }),
        el('div', { className: 'flex justify-end gap-2' }, [
          btn('Cancel', 'cancel', 'bg-gray-300 dark:bg-gray-700'),
          btn('Save as new version', 'new-version', 'bg-blue-600 text-white'),
          btn('Overwrite', 'overwrite', 'bg-amber-600 text-white'),
        ]),
      ]),
    ]);
    document.body.append(modal);
  });
}

export async function autoSaveWithUx(name: string, content: string): Promise<void> {
  try {
    const fileSize = new TextEncoder().encode(content).byteLength;
    const saved = await saveLogToRepository(content, { filename: name, fileSize, source: 'upload' }, promptDuplicateChoice);
    if (!saved) return; // cancelled
    await refreshRepository();
    showToast(`✅ Saved to repository: ${saved.filename}`);
    showSiteNameBanner(saved.id, saved.filename, () => {});
  } catch (err) {
    console.warn('Auto-save (UX) failed (non-blocking):', err);
  }
}
```

- [ ] **Step 5: Swap main.ts to the UX save**

In `src/app/main.ts`, replace the `void autoSaveUploadedFile(file.name, text)` call (from 4a) with `void autoSaveWithUx(file.name, text)` and update the import. (4a's `autoSaveUploadedFile` and its test remain for the headless path; note in the report that production now uses the UX wrapper.) Persistence-request-once still happens inside `saveLogToRepository`'s callers — call `requestPersistence()` once at app init in `main.ts` if not already (additive, guarded).

- [ ] **Step 6: Run tests + typecheck + build**

Run: `npx vitest run tests/unit/repository-autosaveux.test.ts && npm run typecheck && npm run build`
Expected: PASS; no TS errors; production build clean.

- [ ] **Step 7: Commit**

```bash
git add src/app/render/repository/autoSaveUx.ts src/app/repository/repository.ts src/app/main.ts tests/unit/repository-autosaveux.test.ts
git commit -m "feat(parser): Phase 4b-6 — auto-save UX: site-name banner + toast + duplicate prompt (FR-180/182/357)"
```

---

### Task 7: Full-suite green + tracker updates

**Files:**
- Modify: `specs/roadmap.md`, `specs/tasks.md`, `skills/WORKFLOW.md`, `knowledge/project-journal.md`

- [ ] **Step 1: Run the entire test suite + build**

Run: `npm test && npm run typecheck && npm run build`
Expected: all prior tests still pass plus the new 4b panel tests; build clean (no new chunks needed — panel is part of the main bundle). Record the new total.

- [ ] **Step 2: Update the trackers**

- `specs/roadmap.md`: mark Parser 4b done in the phase tracker + suite board "next" → 4d Session Timeline.
- `specs/tasks.md`: check off 4b; surface 4d/4e as next; carry the 4a follow-ups that were folded in (or note which remain).
- `skills/WORKFLOW.md`: add `[x] Phase 4b — Repository panel UI …` under the Phase 4 sub-phases.
- `knowledge/project-journal.md`: dated session entry (discussed/decided/implemented/next), noting Drive UI rendered disabled (4c) and the FR-192 Drive-delete prompt deferred.

- [ ] **Step 3: Commit**

```bash
git add specs/roadmap.md specs/tasks.md skills/WORKFLOW.md knowledge/project-journal.md
git commit -m "docs(parser): Phase 4b complete — repository panel UI (local); trackers refreshed"
```

---

## Self-Review

**Spec coverage (Section 12.5–12.8 + 18.5 local parts):**
- FR-184 panel above upload, collapsible, always visible → Task 1 ✅.
- FR-185 header stats + Drive badge/Connect (disabled) → Task 1 ✅.
- FR-186 search/filter (filename/site/IP/date/tags) → Task 3 ✅.
- FR-187 8-column table → Task 2 ✅.
- FR-188 theme → Tasks 1–2 (dark: classes) ✅.
- FR-189 Load & Analyze via existing pipeline → Task 4 ✅.
- FR-191 delete + confirm → Task 4 ✅; FR-192 Drive-delete prompt → **deferred to 4c** (commented hook) — noted.
- FR-193/194 tags + 7 presets + custom → Task 5 ✅.
- FR-195 tags filterable → Task 3 (`tag` criterion) ✅.
- FR-180 site-name pop-in banner → Task 6 ✅.
- FR-182 toast exact text → Task 6 ✅.
- FR-183/357 duplicate Overwrite/new-version prompt → Task 6 (`promptDuplicateChoice` wired as `onDuplicate`) ✅.
- FR-353 checkbox select + live count → Tasks 2 (checkbox) + 4 (count/bulk) ✅.
- FR-355 bulk delete + delete-all-browser → Task 4 ✅.
- FR-356 tag editor modal → Task 5 ✅.
- FR-181/196/197–204/354 Drive sync + manual sync → **PARKED to 4c** (badge disabled) — out of scope by decision.

**Placeholder scan:** none — every code/test step carries full content. Inter-task stubs (e.g. `onTag` no-op in Task 2/4 before Task 5) are explicitly flagged to be replaced and are covered by later tasks.

**Type consistency:** `RepoFilter` defined in Task 3 used unchanged; `RepoRowActions` defined in Task 2 consumed in Tasks 2/4; `RepoPanelDeps` from Task 1 extended only additively; `DuplicateChoice` reused from 4a's `repository.ts`; `updateEntryTags`/`updateEntrySiteName` added to `repository.ts` and consumed in Tasks 5/6; `refreshRepository`/`createLogRepositoryPanel`/`initLogRepository` signatures stable across tasks.

**Existing-helper checks the implementer must do first (per task):** confirm `collapsibleSection`'s real signature (Task 1), confirm `convertToIST` exists in `format.ts` and whether a byte formatter already exists before adding `formatBytes` (Task 2), confirm `renderResults`'s signature `(container, AnalysisResult)` and `analyzeLogLines(lines, fileName)` (Task 4). Adapt calls to the real APIs; the tests assert behavior, not internal call shape.
