# Parser Phase 3b-1 — Generic table helper + 3 message-group sections — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace three of the 19 placeholder section bodies (Heartbeats, Start Transactions, Stop Transactions) with real, parity-faithful table renderers, built on a shared generic `dataTable` helper, and refactor the orchestrator so sections render via per-section functions.

**Architecture:** Port the legacy `createCollapsibleSection(title, tableId, headers, data)` (HTML 5043) into a pure `render/table.ts → dataTable(headers, rows, tableId?)` that returns a scrollable table body. Each section becomes a `render/sections/<name>.ts` exporting `(r: AnalysisResult) => HTMLElement` (the body); `renderResults` wraps it with the existing `collapsibleSection`. The three sections in this batch all use the generic table with inline row-shaping (HTML 2275–2378). Excel export and auto-collapse-on-large are deferred (3d / polish).

**Tech Stack:** TypeScript + Vite + Vitest (jsdom for render tests). No new deps.

**Spec:** `docs/superpowers/specs/2026-06-15-parser-phase3-render-design.md` · **SSOT:** `specs/requirements.md` (§19.4 order; Start/Stop offline-replay FR-279/280). Legacy source: `src/app/OCPP_Parser_Complete_ 21 Jan'26.html`.

---

## File structure (created/modified in 3b-1)

- Create `src/app/render/format.ts` — `fmtReplayDelay(ms)` (shared display formatting; grows in later batches).
- Create `src/app/render/table.ts` — `dataTable(headers, rows, tableId?)`.
- Create `src/app/render/sections/heartbeats.ts` — `renderHeartbeats(r)`.
- Create `src/app/render/sections/startTransactions.ts` — `renderStartTransactions(r)`.
- Create `src/app/render/sections/stopTransactions.ts` — `renderStopTransactions(r)`.
- Modify `src/app/render/renderResults.ts` — `SectionDef` gains `count?` + `render` (replaces `summary`); wire the three real sections; the other 16 stay placeholders.
- Tests: `tests/unit/format.test.ts`, `tests/unit/table.test.ts`, `tests/unit/sections.test.ts` (+ update `tests/unit/renderResults.test.ts`).

**Parity items deliberately deferred:** per-section "Export to Excel" button (Phase 3d), auto-collapse when >10 rows + count-rotate-chevron (polish; the section is collapsible already). Count-in-title **is** included.

---

## Task 1: Replay-delay formatter (`render/format.ts`)

**Files:**
- Create: `src/app/render/format.ts`
- Test: `tests/unit/format.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/unit/format.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { fmtReplayDelay } from '../../src/app/render/format';

describe('fmtReplayDelay — faithful port (HTML 237)', () => {
  it('formats sub-minute as seconds', () => {
    expect(fmtReplayDelay(5000)).toBe('5s');
  });
  it('drops seconds once minutes/hours/days are present', () => {
    expect(fmtReplayDelay(2 * 3600000 + 30 * 60000 + 9000)).toBe('2h 30m');
  });
  it('includes days', () => {
    expect(fmtReplayDelay(86400000 + 3600000)).toBe('1d 1h');
  });
  it('zero is 0s', () => {
    expect(fmtReplayDelay(0)).toBe('0s');
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run tests/unit/format.test.ts`
Expected: FAIL — cannot resolve `../../src/app/render/format`.

- [ ] **Step 3: Implement `src/app/render/format.ts`**

```ts
// Shared display formatting for the render layer. Ported verbatim from the
// v2026.05.14 tool. Grows as later section batches need more formatters.

/** Human-readable offline-replay delay, e.g. "2h 30m" / "5s" (HTML 237). */
export function fmtReplayDelay(ms: number): string {
  const d = Math.floor(ms / 86400000);
  const h = Math.floor((ms % 86400000) / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  const parts: string[] = [];
  if (d > 0) parts.push(`${d}d`);
  if (h > 0) parts.push(`${h}h`);
  if (m > 0) parts.push(`${m}m`);
  if (d === 0 && h === 0 && m === 0) parts.push(`${s}s`);
  return parts.join(' ') || '0s';
}
```

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run tests/unit/format.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/app/render/format.ts tests/unit/format.test.ts
git commit -m "feat(parser): fmtReplayDelay formatter (Phase 3b-1)"
```

---

## Task 2: Generic table helper (`render/table.ts`)

Port of `createCollapsibleSection`'s table-building portion (HTML 5071–5143): a sticky
S.No. first column, an optional File Name column (present when the first row has a
`fileName` key), then one column per header with `row[header] || 'N/A'` cell text
(the `||` is faithful — it renders `0`/`''` as `'N/A'`, matching the legacy). The
collapsible chrome and count come from `collapsibleSection` in `renderResults`.

**Files:**
- Create: `src/app/render/table.ts`
- Test: `tests/unit/table.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/unit/table.test.ts`:

```ts
// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { dataTable, type Row } from '../../src/app/render/table';

describe('dataTable — generic table body (port of createCollapsibleSection)', () => {
  const rows: Row[] = [
    { fileName: 'a.txt', 'Time Stamp': '2025-01-01', 'Message ID': 'm1' },
    { fileName: 'a.txt', 'Time Stamp': '2025-01-02', 'Message ID': 'm2' },
  ];
  const table = dataTable(['Time Stamp', 'Message ID'], rows, 'heartbeats-table');

  it('sets the table id', () => {
    expect(table.querySelector('table')!.id).toBe('heartbeats-table');
  });

  it('renders S.No. + File Name + header columns', () => {
    const ths = [...table.querySelectorAll('thead th')].map((th) => th.textContent);
    expect(ths).toEqual(['S.No.', 'File Name', 'Time Stamp', 'Message ID']);
  });

  it('renders one row per datum with a 1-based S.No.', () => {
    const bodyRows = table.querySelectorAll('tbody tr');
    expect(bodyRows).toHaveLength(2);
    const firstCells = [...bodyRows[0].querySelectorAll('td')].map((td) => td.textContent);
    expect(firstCells).toEqual(['1', 'a.txt', '2025-01-01', 'm1']);
  });

  it('omits the File Name column when rows lack fileName, and shows N/A for missing/zero', () => {
    const t = dataTable(['Meter Start'], [{ 'Meter Start': 0 }]);
    const ths = [...t.querySelectorAll('thead th')].map((th) => th.textContent);
    expect(ths).toEqual(['S.No.', 'Meter Start']);
    const cells = [...t.querySelectorAll('tbody td')].map((td) => td.textContent);
    expect(cells).toEqual(['1', 'N/A']); // 0 || 'N/A' === 'N/A' (faithful to legacy)
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run tests/unit/table.test.ts`
Expected: FAIL — cannot resolve `../../src/app/render/table`.

- [ ] **Step 3: Implement `src/app/render/table.ts`**

```ts
// Generic data-table body — faithful port of the table portion of the legacy
// createCollapsibleSection (HTML 5043-5143). Returns a scrollable wrapper holding
// a <table>; the collapsible card + title/count come from collapsibleSection.
// A stable `tableId` is set so Phase 3d export can target the table.

import { el } from './dom';

/** A table row: header-name → cell value. `fileName` (if present) becomes a dedicated column. */
export type Row = Record<string, unknown> & { fileName?: string };

const TH = 'px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider sticky top-0 bg-gray-50 dark:bg-gray-700 z-10';
const TH_SNO = 'px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider sticky left-0 top-0 bg-gray-50 dark:bg-gray-700 z-20';
const TD = 'px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100';
const TD_SNO = 'px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900 dark:text-gray-100 sticky left-0 bg-white dark:bg-gray-800 z-10';

/** Faithful cell text: `value || 'N/A'` (renders 0 / '' as 'N/A', matching the legacy). */
function cellText(value: unknown): string {
  return String((value as string | number | undefined) || 'N/A');
}

export function dataTable(headers: string[], rows: Row[], tableId?: string): HTMLElement {
  const hasFileName = rows.length > 0 && Object.prototype.hasOwnProperty.call(rows[0], 'fileName');

  const headRow = el('tr', {}, [
    el('th', { className: TH_SNO, text: 'S.No.', attrs: { scope: 'col' } }),
    ...(hasFileName ? [el('th', { className: TH, text: 'File Name', attrs: { scope: 'col' } })] : []),
    ...headers.map((h) => el('th', { className: TH, text: h, attrs: { scope: 'col' } })),
  ]);

  const bodyRows = rows.map((row, i) =>
    el('tr', {}, [
      el('td', { className: TD_SNO, text: String(i + 1) }),
      ...(hasFileName ? [el('td', { className: TD, text: cellText(row.fileName), attrs: { title: cellText(row.fileName) } })] : []),
      ...headers.map((h) => el('td', { className: TD, text: cellText(row[h]) })),
    ]),
  );

  const table = el('table', {
    className: 'min-w-full divide-y divide-gray-200 dark:divide-gray-700',
    attrs: tableId ? { id: tableId } : {},
  }, [
    el('thead', { className: 'bg-gray-50 dark:bg-gray-700' }, [headRow]),
    el('tbody', { className: 'bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700' }, bodyRows),
  ]);

  return el('div', { className: 'overflow-auto max-h-[500px]' }, [table]);
}
```

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run tests/unit/table.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/app/render/table.ts tests/unit/table.test.ts
git commit -m "feat(parser): generic dataTable helper (Phase 3b-1)"
```

---

## Task 3: Refactor orchestrator to per-section render functions

Change `SectionDef` from `summary: (r) => string` to `render: (r) => HTMLElement` plus an
optional `count?: (r) => number` (header shows `Title (N)` when present). All 19 stay
placeholders in this task — pure refactor, kept green — so later tasks swap them one at a time.

**Files:**
- Modify: `src/app/render/renderResults.ts`
- Modify: `tests/unit/renderResults.test.ts`

- [ ] **Step 1: Update the test to the new contract**

Replace `tests/unit/renderResults.test.ts` with:

```ts
// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { analyzeLogLines } from '../../src/app/analyze';
import { renderResults, SECTION_ORDER } from '../../src/app/render/renderResults';

function load(name: string): string[] {
  return readFileSync(join(process.cwd(), 'data', 'samples', name), 'utf8').split(/\r?\n/);
}

describe('renderResults — 19 sections in §19.4 order', () => {
  const result = analyzeLogLines(load('Sample OCPP Client Log .txt'), 'Sample OCPP Client Log .txt');

  it('declares exactly the 19 §19.4 sections in order', () => {
    expect(SECTION_ORDER.map((s) => s.title)).toEqual([
      'Debug Info', 'Boot Notifications', 'Heartbeats', 'Status Notifications',
      'Start Transactions', 'Stop Transactions', 'Transaction Summary',
      'Connector Stats', 'Transaction & Meter Values', 'Events', 'Alerts',
      'Downtime Report', 'Power Restore Missing Sync', 'Emergency Stop Release',
      'Fault Status Summary', 'Incomplete Transactions', 'Energy Dispense Check',
      'Protocol Compliance', 'WebSocket Health',
    ]);
  });

  it('renders one section element per entry, in order, into the container', () => {
    const container = document.createElement('div');
    renderResults(container, result);
    const sections = container.querySelectorAll('section');
    expect(sections).toHaveLength(19);
    expect(sections[0].textContent).toContain('Debug Info');
    expect(sections[18].textContent).toContain('WebSocket Health');
  });

  it('shows a count in the header for sections that declare one', () => {
    const container = document.createElement('div');
    renderResults(container, result);
    const heartbeats = [...container.querySelectorAll('section')].find((s) => s.textContent?.includes('Heartbeats'))!;
    // "Heartbeats (N)" — the count comes from messageGroups.Heartbeat.length
    expect(heartbeats.querySelector('button')!.textContent).toMatch(/Heartbeats \(\d+\)/);
  });

  it('clears prior content on re-render', () => {
    const container = document.createElement('div');
    renderResults(container, result);
    renderResults(container, result);
    expect(container.querySelectorAll('section')).toHaveLength(19);
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run tests/unit/renderResults.test.ts`
Expected: FAIL — the count test fails (header has no count yet) / `render` not present.

- [ ] **Step 3: Rewrite `src/app/render/renderResults.ts`**

```ts
// Render orchestrator — the legacy displayResults() (HTML 2020-2624), headless
// input. Appends the 19 sections in §19.4 order. Each section declares a `render`
// that returns its body; `collapsibleSection` provides the card + (optional) count
// in the header. Sections are swapped from placeholder to real one batch at a time.

import { el, clearChildren, collapsibleSection } from './dom';
import type { AnalysisResult } from '../analyze';
import { renderHeartbeats } from './sections/heartbeats';
import { renderStartTransactions } from './sections/startTransactions';
import { renderStopTransactions } from './sections/stopTransactions';

export interface SectionDef {
  title: string;
  emoji: string;
  /** Optional count shown as `Title (N)` in the header (parity with the legacy "(N)" titles). */
  count?: (r: AnalysisResult) => number;
  /** Builds the section body. */
  render: (r: AnalysisResult) => HTMLElement;
}

/** Placeholder body used until a section's real renderer lands. */
function placeholder(text: string): (r: AnalysisResult) => HTMLElement {
  return () => el('p', { className: 'text-sm text-gray-600 dark:text-gray-400', text });
}

/** The §19.4 render order. Real renderers replace placeholders batch by batch. */
export const SECTION_ORDER: SectionDef[] = [
  { title: 'Debug Info', emoji: '🐞', render: placeholder('Debug info — pending Phase 3b') },
  { title: 'Boot Notifications', emoji: '🔌', render: placeholder('Boot notifications — pending Phase 3b') },
  { title: 'Heartbeats', emoji: '💓', count: (r) => r.messageGroups.Heartbeat.length, render: renderHeartbeats },
  { title: 'Status Notifications', emoji: '📋', render: placeholder('Status notifications — pending Phase 3b') },
  { title: 'Start Transactions', emoji: '▶️', count: (r) => r.messageGroups.StartTransaction.length, render: renderStartTransactions },
  { title: 'Stop Transactions', emoji: '⏹️', count: (r) => r.messageGroups.StopTransaction.length, render: renderStopTransactions },
  { title: 'Transaction Summary', emoji: '📊', render: placeholder('Transaction summary — pending Phase 3b') },
  { title: 'Connector Stats', emoji: '🔌', render: placeholder('Connector stats — pending Phase 3b') },
  { title: 'Transaction & Meter Values', emoji: '⚡', render: placeholder('Meter values — pending Phase 3b') },
  { title: 'Events', emoji: '📅', render: placeholder('Events — pending Phase 3b') },
  { title: 'Alerts', emoji: '🚨', render: placeholder('Alerts — pending Phase 3b') },
  { title: 'Downtime Report', emoji: '📉', render: placeholder('Downtime report — pending Phase 3b') },
  { title: 'Power Restore Missing Sync', emoji: '🔄', render: placeholder('Power-restore sync — pending Phase 3b') },
  { title: 'Emergency Stop Release', emoji: '🛑', render: placeholder('Emergency-stop release — pending Phase 3b') },
  { title: 'Fault Status Summary', emoji: '⚠️', render: placeholder('Fault status — pending Phase 3b') },
  { title: 'Incomplete Transactions', emoji: '🧩', render: placeholder('Incomplete transactions — pending Phase 3b') },
  { title: 'Energy Dispense Check', emoji: '⚡', render: placeholder('Energy dispense — pending Phase 3b') },
  { title: 'Protocol Compliance', emoji: '✅', render: placeholder('Protocol compliance — pending Phase 3b') },
  { title: 'WebSocket Health', emoji: '🌐', render: placeholder('WebSocket health — pending Phase 3b') },
];

/** Render every section into `container` (clears prior content first). */
export function renderResults(container: HTMLElement, result: AnalysisResult): void {
  clearChildren(container);
  for (const def of SECTION_ORDER) {
    const title = def.count ? `${def.title} (${def.count(result)})` : def.title;
    container.appendChild(collapsibleSection(title, def.emoji, def.render(result)));
  }
}
```

- [ ] **Step 4: Create the three section stubs so imports resolve**

These are filled with real logic in Tasks 4–6; create minimal compiling stubs now.

Create `src/app/render/sections/heartbeats.ts`:

```ts
import { el } from '../dom';
import type { AnalysisResult } from '../../analyze';
export function renderHeartbeats(_r: AnalysisResult): HTMLElement {
  return el('p', { text: 'stub' });
}
```

Create `src/app/render/sections/startTransactions.ts`:

```ts
import { el } from '../dom';
import type { AnalysisResult } from '../../analyze';
export function renderStartTransactions(_r: AnalysisResult): HTMLElement {
  return el('p', { text: 'stub' });
}
```

Create `src/app/render/sections/stopTransactions.ts`:

```ts
import { el } from '../dom';
import type { AnalysisResult } from '../../analyze';
export function renderStopTransactions(_r: AnalysisResult): HTMLElement {
  return el('p', { text: 'stub' });
}
```

- [ ] **Step 5: Run tests + typecheck**

Run: `npx vitest run tests/unit/renderResults.test.ts && npx tsc --noEmit`
Expected: PASS (4 tests); `No errors found`.

- [ ] **Step 6: Commit**

```bash
git add src/app/render/renderResults.ts src/app/render/sections/ tests/unit/renderResults.test.ts
git commit -m "refactor(parser): orchestrator uses per-section render fns + count (Phase 3b-1)"
```

---

## Task 4: Heartbeats section (`sections/heartbeats.ts`)

Port HTML 2275–2288. Headers: `Time Stamp`, `Message ID`, `Response Time (ms)` (the
legacy always emits `'N/A'` for response time — preserved). Row carries `fileName`.

**Files:**
- Modify: `src/app/render/sections/heartbeats.ts`
- Test: `tests/unit/sections.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/unit/sections.test.ts`:

```ts
// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import type { ParsedMessage } from '../../src/app/model/types';
import type { AnalysisResult } from '../../src/app/analyze';
import { renderHeartbeats } from '../../src/app/render/sections/heartbeats';

function msg(over: Partial<ParsedMessage> & { message: unknown[] }): ParsedMessage {
  return { timestamp: '2025-08-22T00:00:00.000Z', direction: 'received', lineNumber: 1, fileName: 'log.txt', ...over } as ParsedMessage;
}

/** Minimal AnalysisResult carrying only the groups a section reads. */
function bundle(over: Partial<AnalysisResult>): AnalysisResult {
  return { messageGroups: { BootNotification: [], Heartbeat: [], StatusNotification: [], StartTransaction: [], StopTransaction: [], MeterValues: [], Other: [] }, internalTxMap: new Map(), ...over } as AnalysisResult;
}

describe('renderHeartbeats', () => {
  it('renders one row per heartbeat with timestamp, message id, and N/A response time', () => {
    const r = bundle({ messageGroups: { ...bundle({}).messageGroups, Heartbeat: [
      msg({ timestamp: '2025-08-22T01:00:00.000Z', message: [2, 'hb-1', 'Heartbeat', {}] }),
    ] } });
    const body = renderHeartbeats(r);
    const headers = [...body.querySelectorAll('thead th')].map((th) => th.textContent);
    expect(headers).toEqual(['S.No.', 'File Name', 'Time Stamp', 'Message ID', 'Response Time (ms)']);
    const cells = [...body.querySelectorAll('tbody tr td')].map((td) => td.textContent);
    expect(cells).toEqual(['1', 'log.txt', '2025-08-22T01:00:00.000Z', 'hb-1', 'N/A']);
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run tests/unit/sections.test.ts`
Expected: FAIL — heartbeats renders the `'stub'` paragraph (no `thead`).

- [ ] **Step 3: Implement `src/app/render/sections/heartbeats.ts`**

```ts
// Heartbeats section — faithful port of HTML 2275-2288. Response Time is always
// 'N/A' in the source (no client-side latency for Heartbeat); preserved for parity.

import { dataTable, type Row } from '../table';
import type { AnalysisResult } from '../../analyze';

const HEADERS = ['Time Stamp', 'Message ID', 'Response Time (ms)'];

export function renderHeartbeats(r: AnalysisResult): HTMLElement {
  const rows: Row[] = r.messageGroups.Heartbeat.map((msg) => ({
    fileName: msg.fileName,
    'Time Stamp': msg.timestamp,
    'Message ID': msg.message[1] as string,
    'Response Time (ms)': 'N/A',
  }));
  return dataTable(HEADERS, rows, 'heartbeats-table');
}
```

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run tests/unit/sections.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/render/sections/heartbeats.ts tests/unit/sections.test.ts
git commit -m "feat(parser): Heartbeats section renderer (Phase 3b-1)"
```

---

## Task 5: Start Transactions section (`sections/startTransactions.ts`)

Port HTML 2296–2321. Headers: `Time Stamp`, `Transaction ID`, `Internal TX ID`,
`Connector ID`, `ID Tag`, `Meter Start`, `Response Status`, `Tx Type`, `Replay Delay`,
`Offline Replay`. `id` (CMS txId) comes from `responsePayload.transactionId`;
internal id from `internalTxMap`. Offline-replay uses log-vs-payload Δ > `OFFLINE_REPLAY_THRESHOLD_MS`.

**Files:**
- Modify: `src/app/render/sections/startTransactions.ts`
- Test: `tests/unit/sections.test.ts` (append)

- [ ] **Step 1: Append the failing test**

Append to `tests/unit/sections.test.ts`:

```ts
import { renderStartTransactions } from '../../src/app/render/sections/startTransactions';

describe('renderStartTransactions', () => {
  it('maps CMS txId from responsePayload, internal id from the map, and marks online', () => {
    const ts = '2025-08-22T02:00:00.000Z';
    const start = msg({
      timestamp: ts,
      message: [2, 'st-1', 'StartTransaction', { timestamp: ts, connectorId: 1, idTag: 'TAG7', meterStart: 1000 }],
      responsePayload: { transactionId: 55, idTagInfo: { status: 'Accepted' } },
    });
    const r = bundle({
      messageGroups: { ...bundle({}).messageGroups, StartTransaction: [start] },
      internalTxMap: new Map([['55', 'internal_transId_abc']]),
    });
    const body = renderStartTransactions(r);
    const headers = [...body.querySelectorAll('thead th')].map((th) => th.textContent);
    expect(headers).toEqual(['S.No.', 'File Name', 'Time Stamp', 'Transaction ID', 'Internal TX ID', 'Connector ID', 'ID Tag', 'Meter Start', 'Response Status', 'Tx Type', 'Replay Delay', 'Offline Replay']);
    const cells = [...body.querySelectorAll('tbody tr td')].map((td) => td.textContent);
    expect(cells[3]).toBe('55');                 // Transaction ID
    expect(cells[4]).toBe('internal_transId_abc'); // Internal TX ID
    expect(cells[6]).toBe('TAG7');               // ID Tag
    expect(cells[9]).toContain('Online');        // Tx Type (📡 Online)
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run tests/unit/sections.test.ts`
Expected: FAIL — startTransactions still returns the stub.

- [ ] **Step 3: Implement `src/app/render/sections/startTransactions.ts`**

```ts
// Start Transactions section — faithful port of HTML 2296-2321. CMS transactionId
// is read from the StartTx responsePayload (Bug Fix #1); internal id from the map.
// Offline-replay = |logTs − payloadTs| > OFFLINE_REPLAY_THRESHOLD_MS (FR-279/280).

import { dataTable, type Row } from '../table';
import { fmtReplayDelay } from '../format';
import { OFFLINE_REPLAY_THRESHOLD_MS } from '../../model/config';
import type { AnalysisResult } from '../../analyze';

const HEADERS = ['Time Stamp', 'Transaction ID', 'Internal TX ID', 'Connector ID', 'ID Tag', 'Meter Start', 'Response Status', 'Tx Type', 'Replay Delay', 'Offline Replay'];

interface StartPayload { timestamp?: string; connectorId?: number; idTag?: string; meterStart?: number; }
interface StartResponse { transactionId?: number; idTagInfo?: { status?: string }; }
const DASH = '—';

export function renderStartTransactions(r: AnalysisResult): HTMLElement {
  const rows: Row[] = r.messageGroups.StartTransaction.map((msg) => {
    const payload = (msg.message[3] ?? {}) as StartPayload;
    const resp = (msg.responsePayload ?? null) as StartResponse | null;
    const lTs = new Date(msg.timestamp).getTime();
    const pTs = new Date(payload.timestamp ?? '').getTime();
    const delta = Math.abs(lTs - pTs);
    const isReplay = !isNaN(delta) && delta > OFFLINE_REPLAY_THRESHOLD_MS;
    const cmsTxId = resp?.transactionId;
    const intTxId = cmsTxId ? (r.internalTxMap.get(String(cmsTxId)) ?? DASH) : DASH;
    return {
      fileName: msg.fileName,
      'Time Stamp': msg.timestamp,
      'Transaction ID': cmsTxId,
      'Internal TX ID': intTxId,
      'Connector ID': payload.connectorId,
      'ID Tag': payload.idTag,
      'Meter Start': payload.meterStart,
      'Response Status': resp?.idTagInfo ? (resp.idTagInfo.status ?? 'N/A') : 'N/A',
      'Tx Type': isReplay ? '📴 Offline' : '📡 Online',
      'Replay Delay': isReplay ? fmtReplayDelay(delta) : DASH,
      'Offline Replay': isReplay
        ? `⚠ Replayed  ·  Rec: ${new Date(payload.timestamp ?? '').toISOString()}  →  Sent: ${new Date(msg.timestamp).toISOString()}`
        : DASH,
    };
  });
  return dataTable(HEADERS, rows, 'start-transactions-table');
}
```

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run tests/unit/sections.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/render/sections/startTransactions.ts tests/unit/sections.test.ts
git commit -m "feat(parser): Start Transactions section renderer (Phase 3b-1)"
```

---

## Task 6: Stop Transactions section (`sections/stopTransactions.ts`)

Port HTML 2324–2378. Headers: `Time Stamp`, `Transaction ID`, `Internal TX ID`,
`Meter Stop`, `Stop Reason`, `SoC Begin (%)`, `SoC End (%)`, `Location`, `Tx Type`,
`Replay Delay`, `Offline Replay`. CMS txId is on the **request** payload here
(`message[3].transactionId`); `txId === 0` shows the "no CMS id" marker. SoC begin/end
+ location come from `transactionData[].sampledValue[]` where `measurand === 'SoC'`.

**Files:**
- Modify: `src/app/render/sections/stopTransactions.ts`
- Test: `tests/unit/sections.test.ts` (append)

- [ ] **Step 1: Append the failing test**

Append to `tests/unit/sections.test.ts`:

```ts
import { renderStopTransactions } from '../../src/app/render/sections/stopTransactions';

describe('renderStopTransactions', () => {
  it('extracts SoC begin/end + location and resolves internal id', () => {
    const ts = '2025-08-22T03:00:00.000Z';
    const stop = msg({
      timestamp: ts,
      message: [2, 'sp-1', 'StopTransaction', {
        timestamp: ts, transactionId: 55, meterStop: 6000, reason: 'Local',
        transactionData: [{ sampledValue: [
          { measurand: 'SoC', context: 'Transaction.Begin', value: '20', location: 'EV' },
          { measurand: 'SoC', context: 'Transaction.End', value: '80', location: 'EV' },
        ] }],
      }],
    });
    const r = bundle({
      messageGroups: { ...bundle({}).messageGroups, StopTransaction: [stop] },
      internalTxMap: new Map([['55', 'internal_transId_abc']]),
    });
    const body = renderStopTransactions(r);
    const headers = [...body.querySelectorAll('thead th')].map((th) => th.textContent);
    expect(headers).toEqual(['S.No.', 'File Name', 'Time Stamp', 'Transaction ID', 'Internal TX ID', 'Meter Stop', 'Stop Reason', 'SoC Begin (%)', 'SoC End (%)', 'Location', 'Tx Type', 'Replay Delay', 'Offline Replay']);
    const cells = [...body.querySelectorAll('tbody tr td')].map((td) => td.textContent);
    expect(cells[3]).toBe('55');                 // Transaction ID
    expect(cells[4]).toBe('internal_transId_abc'); // Internal TX ID
    expect(cells[7]).toBe('20');                 // SoC Begin
    expect(cells[8]).toBe('80');                 // SoC End
    expect(cells[9]).toBe('EV');                 // Location
  });

  it('marks txId=0 with the no-CMS-id marker', () => {
    const ts = '2025-08-22T03:00:00.000Z';
    const stop = msg({ timestamp: ts, message: [2, 'sp-2', 'StopTransaction', { timestamp: ts, transactionId: 0, meterStop: 10 }] });
    const r = bundle({ messageGroups: { ...bundle({}).messageGroups, StopTransaction: [stop] }, internalTxMap: new Map() });
    const cells = [...renderStopTransactions(r).querySelectorAll('tbody tr td')].map((td) => td.textContent);
    expect(cells[4]).toContain('txId=0'); // Internal TX ID marker
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run tests/unit/sections.test.ts`
Expected: FAIL — stopTransactions still returns the stub.

- [ ] **Step 3: Implement `src/app/render/sections/stopTransactions.ts`**

```ts
// Stop Transactions section — faithful port of HTML 2324-2378. Unlike StartTx, the
// CMS transactionId is on the request payload (message[3].transactionId); txId===0
// means "no CMS id". SoC begin/end + location are scanned out of transactionData.

import { dataTable, type Row } from '../table';
import { fmtReplayDelay } from '../format';
import { OFFLINE_REPLAY_THRESHOLD_MS } from '../../model/config';
import type { AnalysisResult } from '../../analyze';

const HEADERS = ['Time Stamp', 'Transaction ID', 'Internal TX ID', 'Meter Stop', 'Stop Reason', 'SoC Begin (%)', 'SoC End (%)', 'Location', 'Tx Type', 'Replay Delay', 'Offline Replay'];
const DASH = '—';

interface SampledValue { measurand?: string; context?: string; value?: string; location?: string; }
interface StopPayload {
  timestamp?: string; transactionId?: number; meterStop?: number; reason?: string;
  transactionData?: { sampledValue?: SampledValue[] }[];
}

export function renderStopTransactions(r: AnalysisResult): HTMLElement {
  const rows: Row[] = r.messageGroups.StopTransaction.map((msg) => {
    const payload = (msg.message[3] ?? {}) as StopPayload;

    let socBegin = 'N/A';
    let socEnd = 'N/A';
    let location = 'N/A';
    if (Array.isArray(payload.transactionData)) {
      for (const data of payload.transactionData) {
        if (!Array.isArray(data.sampledValue)) continue;
        for (const sample of data.sampledValue) {
          if (sample.measurand !== 'SoC') continue;
          if (sample.context === 'Transaction.Begin') { socBegin = sample.value ?? 'N/A'; location = sample.location ?? 'N/A'; }
          else if (sample.context === 'Transaction.End') { socEnd = sample.value ?? 'N/A'; location = sample.location ?? 'N/A'; }
        }
      }
    }

    const lTs = new Date(msg.timestamp).getTime();
    const pTs = new Date(payload.timestamp ?? '').getTime();
    const delta = Math.abs(lTs - pTs);
    const isReplay = !isNaN(delta) && delta > OFFLINE_REPLAY_THRESHOLD_MS;
    const cmsTxId = payload.transactionId;
    const intTxId = cmsTxId === 0
      ? '⚠ txId=0 (No CMS ID)'
      : (r.internalTxMap.get(String(cmsTxId)) ?? DASH);

    return {
      fileName: msg.fileName,
      'Time Stamp': msg.timestamp,
      'Transaction ID': cmsTxId,
      'Internal TX ID': intTxId,
      'Meter Stop': payload.meterStop,
      'Stop Reason': payload.reason ?? 'N/A',
      'SoC Begin (%)': socBegin,
      'SoC End (%)': socEnd,
      'Location': location,
      'Tx Type': isReplay ? '📴 Offline' : '📡 Online',
      'Replay Delay': isReplay ? fmtReplayDelay(delta) : DASH,
      'Offline Replay': isReplay
        ? `⚠ Replayed  ·  Rec: ${new Date(payload.timestamp ?? '').toISOString()}  →  Sent: ${new Date(msg.timestamp).toISOString()}`
        : DASH,
    };
  });
  return dataTable(HEADERS, rows, 'stop-transactions-table');
}
```

- [ ] **Step 4: Run to verify pass + full suite + typecheck + build**

Run: `npx vitest run tests/unit/sections.test.ts && npm test && npx tsc --noEmit && npm run build`
Expected: section tests PASS; full suite green; `No errors found`; build succeeds.

- [ ] **Step 5: Commit**

```bash
git add src/app/render/sections/stopTransactions.ts tests/unit/sections.test.ts
git commit -m "feat(parser): Stop Transactions section renderer (Phase 3b-1)"
```

---

## Task 7: Trackers + manual verification

**Files:**
- Modify: `skills/WORKFLOW.md`, `specs/roadmap.md`, `specs/tasks.md`, `knowledge/project-journal.md`

- [ ] **Step 1: Manual browser check**

Run: `npm run dev`
Upload `data/samples/Sample OCPP Client Log .txt` → **Parse Files**. Confirm Heartbeats,
Start Transactions, and Stop Transactions now show real tables (S.No. + File Name +
data columns; offline/online markers); the other 16 sections still show placeholders;
section headers show counts (e.g. "Heartbeats (N)").

- [ ] **Step 2: Update trackers**

In `skills/WORKFLOW.md` and `specs/roadmap.md` mark 3b-1 done (3 of 19 section renderers: Heartbeats, Start Tx, Stop Tx + generic `dataTable`). In `specs/tasks.md` move 3b-1 to Done and promote "3b-2 — custom renderers (Debug Info, Boot, Status)" to Next. Append a dated entry to `knowledge/project-journal.md`.

- [ ] **Step 3: Commit**

```bash
git add skills/WORKFLOW.md specs/roadmap.md specs/tasks.md knowledge/project-journal.md
git commit -m "docs(parser): Phase 3b-1 complete — tracker refresh"
```

---

## Definition of done (Phase 3b-1)

- `dataTable` generic helper + `fmtReplayDelay` ported with tests.
- Orchestrator renders via per-section `render` fns with optional header counts; 3 sections real, 16 placeholders.
- Heartbeats / Start Transactions / Stop Transactions render parity-faithful tables (offline-replay markers, SoC extraction, internal-id resolution, txId=0 marker).
- Full suite green; `tsc --noEmit` clean; `vite build` succeeds; manual browser check passes.
- Trackers updated.
