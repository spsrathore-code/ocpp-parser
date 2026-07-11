# Parser Phase 3b-2 — Debug Info + Boot Notifications renderers — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace two more placeholder section bodies — Debug Info (stats panel + UTC/IST log-duration + alert-code summary) and Boot Notifications (table) — with parity-faithful renderers.

**Architecture:** Debug Info is a custom stats panel: a pure `computeDebugStats(result)` produces all counts / id lists / alert-code rollup / formatted log span, and `renderDebugInfo` builds the DOM from it (keeps the date/format logic unit-testable). Boot Notifications reuses the generic `dataTable` from 3b-1. UTC/IST timestamp formatting moves into `render/format.ts` as a shared helper.

**Tech Stack:** TypeScript + Vite + Vitest (jsdom for render tests). No new deps.

**Spec:** `docs/superpowers/specs/2026-06-15-parser-phase3-render-design.md` · **SSOT:** `specs/requirements.md`. Legacy source: `src/app/OCPP_Parser_Complete_ 21 Jan'26.html` (Debug Info 2024-2267; Boot 2632-2723).

**Scope note:** Boot's per-row **Preview/Download "context"** buttons are intentionally **deferred** to the dedicated context-viewer sub-phase (user decision 2026-06-17); the Boot table renders without those two columns here.

---

## File structure (created/modified in 3b-2)

- Modify `src/app/render/format.ts` — add `formatUtcIst(date)` + `formatLogDuration(ms)`.
- Create `src/app/render/sections/debugInfo.ts` — `computeDebugStats(r)` + `renderDebugInfo(r)`.
- Create `src/app/render/sections/bootNotifications.ts` — `renderBootNotifications(r)`.
- Modify `src/app/render/renderResults.ts` — wire the two real renderers (replace placeholders).
- Tests: extend `tests/unit/format.test.ts`; create `tests/unit/debugInfo.test.ts`; extend `tests/unit/sections.test.ts`.

---

## Task 1: Shared timestamp/duration formatters (`render/format.ts`)

Port the legacy `formatTimestamp` (HTML 2098-2113) and the duration math (HTML 2120-2124).

**Files:**
- Modify: `src/app/render/format.ts`
- Modify: `tests/unit/format.test.ts`

- [ ] **Step 1: Append failing tests**

Append to `tests/unit/format.test.ts`:

```ts
import { formatUtcIst, formatLogDuration } from '../../src/app/render/format';

describe('formatUtcIst — UTC + IST (UTC+5:30) display (HTML 2098)', () => {
  it('formats a date into utc and ist strings', () => {
    const d = new Date('2025-08-22T00:00:00.000Z');
    expect(formatUtcIst(d)).toEqual({ utc: '2025-08-22 00:00:00Z', ist: '2025-08-22 05:30:00 IST' });
  });
  it('returns N/A for null', () => {
    expect(formatUtcIst(null)).toEqual({ utc: 'N/A', ist: 'N/A' });
  });
});

describe('formatLogDuration', () => {
  it('formats milliseconds as "Xh Ym"', () => {
    expect(formatLogDuration(2 * 3600000 + 35 * 60000)).toBe('2h 35m');
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run tests/unit/format.test.ts`
Expected: FAIL — `formatUtcIst` / `formatLogDuration` not exported.

- [ ] **Step 3: Append to `src/app/render/format.ts`**

```ts
/** A timestamp rendered in both UTC and IST (UTC+5:30). */
export interface UtcIst {
  utc: string;
  ist: string;
}

/** Format a date as `{ utc: 'YYYY-MM-DD HH:MM:SSZ', ist: 'YYYY-MM-DD HH:MM:SS IST' }` (HTML 2098). */
export function formatUtcIst(timestamp: Date | null): UtcIst {
  if (!timestamp) return { utc: 'N/A', ist: 'N/A' };
  const utcDate = timestamp.toISOString().split('T')[0];
  const utcTime = timestamp.toISOString().split('T')[1].split('.')[0] + 'Z';
  const ist = new Date(timestamp.getTime() + 5.5 * 60 * 60 * 1000);
  const istDate = ist.toISOString().split('T')[0];
  const istTime = ist.toISOString().split('T')[1].split('.')[0];
  return { utc: `${utcDate} ${utcTime}`, ist: `${istDate} ${istTime} IST` };
}

/** Log span as "Xh Ym" (HTML 2120). */
export function formatLogDuration(ms: number): string {
  const hours = Math.floor(ms / (1000 * 60 * 60));
  const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
  return `${hours}h ${minutes}m`;
}
```

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run tests/unit/format.test.ts`
Expected: PASS (7 tests total).

- [ ] **Step 5: Commit**

```bash
git add src/app/render/format.ts tests/unit/format.test.ts
git commit -m "feat(parser): UTC/IST + log-duration formatters (Phase 3b-2)"
```

---

## Task 2: Debug Info section (`sections/debugInfo.ts`)

Port HTML 2024-2255. `computeDebugStats` is pure (counts, transaction ids, unique event
types, alert-code rollup, log span). **Faithful quirk preserved:** transaction ids are read
from the StartTx **request** payload (`message[3].transactionId`), exactly as the legacy
Debug panel does (this differs from Bug Fix #1's tx-object id, which is unchanged).

**Files:**
- Create: `src/app/render/sections/debugInfo.ts`
- Test: `tests/unit/debugInfo.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/unit/debugInfo.test.ts`:

```ts
// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import type { ParsedMessage, ParsedAlert, ParsedEvent } from '../../src/app/model/types';
import type { AnalysisResult } from '../../src/app/analyze';
import { computeDebugStats, renderDebugInfo } from '../../src/app/render/sections/debugInfo';

function msg(ts: string, message: unknown[]): ParsedMessage {
  return { timestamp: ts, direction: 'received', message, lineNumber: 1, fileName: 'log.txt' } as ParsedMessage;
}
function bundle(over: Partial<AnalysisResult>): AnalysisResult {
  return {
    messages: [], events: [], alerts: [], rawLogLines: [], filesProcessed: ['log.txt'],
    messageGroups: { BootNotification: [], Heartbeat: [], StatusNotification: [], StartTransaction: [], StopTransaction: [], MeterValues: [], Other: [] },
    ...over,
  } as AnalysisResult;
}

describe('computeDebugStats', () => {
  it('counts groups and formats the log span across all timestamp sources', () => {
    const r = bundle({
      messages: [msg('2025-08-22T00:00:00.000Z', [2, 'a', 'Heartbeat', {}]), msg('2025-08-22T02:00:00.000Z', [2, 'b', 'Heartbeat', {}])],
      events: [{ timestamp: '2025-08-22T01:00:00.000Z', type: 'info' } as ParsedEvent],
      alerts: [{ timestamp: '2025-08-22T00:30:00.000Z', code: 'E01', message: 'Overtemp' } as ParsedAlert,
               { timestamp: '2025-08-22T00:40:00.000Z', code: 'E01', message: 'Overtemp' } as ParsedAlert],
      messageGroups: { ...bundle({}).messageGroups, Heartbeat: [msg('x', []), msg('y', [])], BootNotification: [msg('z', [])] },
    });
    const s = computeDebugStats(r);
    expect(s.counts.heartbeats).toBe(2);
    expect(s.counts.bootNotifications).toBe(1);
    expect(s.counts.alerts).toBe(2);
    expect(s.uniqueEventTypes).toEqual(['info']);
    expect(s.alertCodes).toEqual([{ code: 'E01', count: 2, description: 'Overtemp' }]);
    expect(s.startUtc).toBe('2025-08-22 00:00:00Z');
    expect(s.endUtc).toBe('2025-08-22 02:00:00Z');
    expect(s.duration).toBe('2h 0m');
  });

  it('reports N/A span when there are no timestamps', () => {
    const s = computeDebugStats(bundle({}));
    expect(s.startUtc).toBe('N/A');
    expect(s.duration).toBe('N/A');
  });
});

describe('renderDebugInfo', () => {
  it('renders stat numbers and the log-duration block', () => {
    const r = bundle({ messages: [msg('2025-08-22T00:00:00.000Z', [2, 'a', 'Heartbeat', {}])], messageGroups: { ...bundle({}).messageGroups, Heartbeat: [msg('x', [])] } });
    const body = renderDebugInfo(r);
    expect(body.textContent).toContain('Heartbeats');
    expect(body.textContent).toContain('Total Duration');
    expect(body.textContent).toContain('IST:');
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run tests/unit/debugInfo.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `src/app/render/sections/debugInfo.ts`**

```ts
// Debug Info section — faithful port of the legacy debug panel (HTML 2024-2255):
// summary counts, processed files, transaction-id / event-type chips, an alert-code
// rollup, and the UTC/IST log span. computeDebugStats is pure for testability.

import { el } from '../dom';
import { formatUtcIst, formatLogDuration } from '../format';
import type { AnalysisResult } from '../../analyze';

export interface AlertCodeRow { code: string; count: number; description: string; }
export interface DebugStats {
  counts: {
    startTransactions: number; meterValues: number; bootNotifications: number; heartbeats: number;
    totalMessages: number; statusNotifications: number; events: number; alerts: number;
  };
  filesProcessed: string[];
  transactionIds: number[];
  uniqueEventTypes: string[];
  alertCodes: AlertCodeRow[];
  startUtc: string; startIst: string; endUtc: string; endIst: string; duration: string;
}

const TS_RE = /\[([^\]]+)\]/;

export function computeDebugStats(r: AnalysisResult): DebugStats {
  const g = r.messageGroups;

  // Transaction ids — faithful to the legacy debug panel: request-payload field.
  const transactionIds = g.StartTransaction
    .map((m) => (m.message[3] as { transactionId?: number } | undefined)?.transactionId)
    .filter((id): id is number => !!id);

  const uniqueEventTypes = [...new Set(r.events.map((e) => e.type))];

  // Alert-code rollup (count desc), description = first non-'N/A' message for the code.
  const codeCounts = new Map<string, number>();
  for (const a of r.alerts) {
    const code = a.code || 'N/A';
    codeCounts.set(code, (codeCounts.get(code) ?? 0) + 1);
  }
  const alertCodes: AlertCodeRow[] = [...codeCounts.entries()]
    .map(([code, count]) => {
      const descs = r.alerts.filter((a) => String(a.code || 'N/A') === String(code)).map((a) => a.message || 'N/A').filter((m) => m !== 'N/A');
      return { code, count, description: descs.length > 0 ? descs[0] : 'No description available' };
    })
    .sort((a, b) => b.count - a.count);

  // Log span — message/event/alert timestamps + raw-line timestamps (avoid spread on big arrays).
  const stamps: Date[] = [
    ...r.messages.map((m) => new Date(m.timestamp)),
    ...r.events.map((e) => new Date(e.timestamp)),
    ...r.alerts.map((a) => new Date(a.timestamp)),
  ];
  for (const line of r.rawLogLines) {
    const m = line.match(TS_RE);
    if (m) { const d = new Date(m[1]); if (!isNaN(d.getTime())) stamps.push(d); }
  }
  const valid = stamps.filter((d) => !isNaN(d.getTime()));
  let start: Date | null = null;
  let end: Date | null = null;
  if (valid.length > 0) {
    start = valid.reduce((min, cur) => (cur < min ? cur : min));
    end = valid.reduce((max, cur) => (cur > max ? cur : max));
  }
  const startF = formatUtcIst(start);
  const endF = formatUtcIst(end);
  const duration = start && end ? formatLogDuration(end.getTime() - start.getTime()) : 'N/A';

  return {
    counts: {
      startTransactions: g.StartTransaction.length,
      meterValues: g.MeterValues.length,
      bootNotifications: g.BootNotification.length,
      heartbeats: g.Heartbeat.length,
      totalMessages: r.messages.length,
      statusNotifications: g.StatusNotification.length,
      events: r.events.length,
      alerts: r.alerts.length,
    },
    filesProcessed: r.filesProcessed.length > 0 ? r.filesProcessed : ['N/A'],
    transactionIds,
    uniqueEventTypes,
    alertCodes,
    startUtc: startF.utc, startIst: startF.ist, endUtc: endF.utc, endIst: endF.ist, duration,
  };
}

function statCard(value: number, label: string, color: string): HTMLElement {
  return el('div', { className: `text-center p-3 bg-${color}-50 dark:bg-${color}-900/20 rounded-lg` }, [
    el('div', { className: `text-2xl font-bold text-${color}-600 dark:text-${color}-400`, text: String(value) }),
    el('div', { className: `text-xs text-${color}-600 dark:text-${color}-400`, text: label }),
  ]);
}

export function renderDebugInfo(r: AnalysisResult): HTMLElement {
  const s = computeDebugStats(r);

  const grid1 = el('div', { className: 'grid grid-cols-2 md:grid-cols-4 gap-3' }, [
    statCard(s.counts.startTransactions, 'Transactions', 'blue'),
    statCard(s.counts.meterValues, 'Meter Values', 'green'),
    statCard(s.counts.bootNotifications, 'Boot Notifications', 'purple'),
    statCard(s.counts.heartbeats, 'Heartbeats', 'orange'),
  ]);
  const grid2 = el('div', { className: 'grid grid-cols-2 md:grid-cols-4 gap-3' }, [
    statCard(s.counts.totalMessages, 'Total Messages', 'indigo'),
    statCard(s.counts.statusNotifications, 'Status Notifications', 'pink'),
    statCard(s.counts.events, 'Events', 'teal'),
    statCard(s.counts.alerts, 'Alerts', 'red'),
  ]);

  const children: HTMLElement[] = [grid1, grid2];

  if (s.filesProcessed[0] !== 'N/A') {
    children.push(el('div', { className: 'p-3 bg-cyan-50 dark:bg-cyan-900/20 rounded-lg' }, [
      el('div', { className: 'text-sm font-medium text-cyan-700 dark:text-cyan-300 mb-2', text: `📁 Files Processed: ${s.filesProcessed.length}` }),
      el('div', { className: 'flex flex-wrap gap-2' }, s.filesProcessed.map((f) =>
        el('span', { className: 'text-xs px-2 py-1 bg-cyan-100 dark:bg-cyan-800 text-cyan-700 dark:text-cyan-200 rounded', text: f }))),
    ]));
  }

  if (s.transactionIds.length > 0) {
    children.push(el('div', { className: 'p-3 bg-gray-50 dark:bg-gray-700 rounded-lg' }, [
      el('div', { className: 'text-sm text-gray-600 dark:text-gray-400 mb-1', html: `Transaction IDs: <span class="font-mono text-gray-800 dark:text-gray-200">${s.transactionIds.join(', ')}</span>` }),
    ]));
  }
  if (s.uniqueEventTypes.length > 0) {
    children.push(el('div', { className: 'p-3 bg-gray-50 dark:bg-gray-700 rounded-lg' }, [
      el('div', { className: 'text-sm text-gray-600 dark:text-gray-400 mb-1', html: `Event Types: <span class="font-mono text-gray-800 dark:text-gray-200">${s.uniqueEventTypes.join(', ')}</span>` }),
    ]));
  }

  if (s.alertCodes.length > 0) {
    const rows = s.alertCodes.map((item) =>
      el('tr', { className: 'border-b border-gray-100 dark:border-gray-600' }, [
        el('td', { className: 'py-1 px-2 font-mono text-gray-800 dark:text-gray-200', text: item.code }),
        el('td', { className: 'py-1 px-2 text-gray-600 dark:text-gray-400', text: String(item.count) }),
        el('td', { className: 'py-1 px-2 text-gray-800 dark:text-gray-200 break-words max-w-xs', text: item.description }),
      ]));
    children.push(el('div', { className: 'p-3 bg-gray-50 dark:bg-gray-700 rounded-lg' }, [
      el('div', { className: 'text-sm font-medium text-gray-700 dark:text-gray-300 mb-3', text: `Alert Codes Summary (${s.alertCodes.length} unique codes)` }),
      el('div', { className: 'overflow-x-auto' }, [
        el('table', { className: 'min-w-full text-xs' }, [
          el('thead', {}, [el('tr', { className: 'border-b border-gray-200 dark:border-gray-600' }, [
            el('th', { className: 'text-left py-1 px-2 font-medium text-gray-600 dark:text-gray-400', text: 'Alert Code' }),
            el('th', { className: 'text-left py-1 px-2 font-medium text-gray-600 dark:text-gray-400', text: 'Count' }),
            el('th', { className: 'text-left py-1 px-2 font-medium text-gray-600 dark:text-gray-400', text: 'Description' }),
          ])]),
          el('tbody', {}, rows),
        ]),
      ]),
    ]));
  }

  children.push(el('div', { className: 'p-3 bg-gray-50 dark:bg-gray-700 rounded-lg' }, [
    el('div', { className: 'text-sm text-gray-600 dark:text-gray-400 mb-2', text: 'Log Duration Information:' }),
    el('div', { className: 'grid grid-cols-1 md:grid-cols-2 gap-4 text-xs' }, [
      el('div', {}, [
        el('div', { className: 'font-medium text-gray-700 dark:text-gray-300 mb-1', text: 'Start Time:' }),
        el('div', { className: 'font-mono text-gray-800 dark:text-gray-200', text: `UTC: ${s.startUtc}` }),
        el('div', { className: 'font-mono text-gray-800 dark:text-gray-200', text: `IST: ${s.startIst}` }),
      ]),
      el('div', {}, [
        el('div', { className: 'font-medium text-gray-700 dark:text-gray-300 mb-1', text: 'End Time:' }),
        el('div', { className: 'font-mono text-gray-800 dark:text-gray-200', text: `UTC: ${s.endUtc}` }),
        el('div', { className: 'font-mono text-gray-800 dark:text-gray-200', text: `IST: ${s.endIst}` }),
      ]),
    ]),
    el('div', { className: 'mt-2 pt-2 border-t border-gray-200 dark:border-gray-600' }, [
      el('div', { className: 'font-medium text-gray-700 dark:text-gray-300', html: `Total Duration: <span class="font-mono text-gray-800 dark:text-gray-200">${s.duration}</span>` }),
    ]),
  ]));

  return el('div', { className: 'space-y-3' }, children);
}
```

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run tests/unit/debugInfo.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/app/render/sections/debugInfo.ts tests/unit/debugInfo.test.ts
git commit -m "feat(parser): Debug Info section renderer (Phase 3b-2)"
```

---

## Task 3: Boot Notifications section (`sections/bootNotifications.ts`)

Port HTML 2632-2723 minus the Preview/Download context columns (deferred). Reuses `dataTable`.

**Files:**
- Create: `src/app/render/sections/bootNotifications.ts`
- Test: `tests/unit/sections.test.ts` (append)

- [ ] **Step 1: Append the failing test**

Append to `tests/unit/sections.test.ts`:

```ts
import { renderBootNotifications } from '../../src/app/render/sections/bootNotifications';

describe('renderBootNotifications', () => {
  it('renders vendor/model/firmware + response status', () => {
    const boot = msg({
      timestamp: '2025-08-22T00:00:00.000Z',
      message: [2, 'bn-1', 'BootNotification', { chargePointVendor: 'Ador', chargePointModel: 'DC60', firmwareVersion: '1.2.3' }],
      responsePayload: { status: 'Accepted' },
    });
    const r = bundle({ messageGroups: { ...bundle({}).messageGroups, BootNotification: [boot] } });
    const body = renderBootNotifications(r);
    const headers = [...body.querySelectorAll('thead th')].map((th) => th.textContent);
    expect(headers).toEqual(['S.No.', 'File Name', 'Time Stamp', 'Message ID', 'Charge Point Vendor', 'Charge Point Model', 'Firmware Version', 'Response Status']);
    const cells = [...body.querySelectorAll('tbody tr td')].map((td) => td.textContent);
    expect(cells).toEqual(['1', 'log.txt', '2025-08-22T00:00:00.000Z', 'bn-1', 'Ador', 'DC60', '1.2.3', 'Accepted']);
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run tests/unit/sections.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `src/app/render/sections/bootNotifications.ts`**

```ts
// Boot Notifications section — faithful port of HTML 2632-2723 (table portion),
// via the generic dataTable. The per-row Preview/Download "context" buttons are
// deferred to the dedicated context-viewer sub-phase. Missing fields render 'N/A'
// (dataTable's `|| 'N/A'`), a small improvement over the legacy raw 'undefined'.

import { dataTable, type Row } from '../table';
import type { AnalysisResult } from '../../analyze';

const HEADERS = ['Time Stamp', 'Message ID', 'Charge Point Vendor', 'Charge Point Model', 'Firmware Version', 'Response Status'];

interface BootPayload { chargePointVendor?: string; chargePointModel?: string; firmwareVersion?: string; }
interface BootResponse { status?: string; }

export function renderBootNotifications(r: AnalysisResult): HTMLElement {
  const rows: Row[] = r.messageGroups.BootNotification.map((msg) => {
    const p = (msg.message[3] ?? {}) as BootPayload;
    const resp = (msg.responsePayload ?? null) as BootResponse | null;
    return {
      fileName: msg.fileName,
      'Time Stamp': msg.timestamp,
      'Message ID': msg.message[1] as string,
      'Charge Point Vendor': p.chargePointVendor,
      'Charge Point Model': p.chargePointModel,
      'Firmware Version': p.firmwareVersion,
      'Response Status': resp ? (resp.status ?? 'N/A') : 'N/A',
    };
  });
  return dataTable(HEADERS, rows, 'boot-notifications-table');
}
```

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run tests/unit/sections.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/render/sections/bootNotifications.ts tests/unit/sections.test.ts
git commit -m "feat(parser): Boot Notifications section renderer (Phase 3b-2)"
```

---

## Task 4: Wire both renderers into the orchestrator

**Files:**
- Modify: `src/app/render/renderResults.ts`

- [ ] **Step 1: Import and wire**

In `src/app/render/renderResults.ts` add imports:

```ts
import { renderDebugInfo } from './sections/debugInfo';
import { renderBootNotifications } from './sections/bootNotifications';
```

Replace the Debug Info entry:

```ts
  { title: 'Debug Info', emoji: '🐞', render: renderDebugInfo },
```

Replace the Boot Notifications entry:

```ts
  { title: 'Boot Notifications', emoji: '🔌', count: (r) => r.messageGroups.BootNotification.length, render: renderBootNotifications },
```

- [ ] **Step 2: Run the full suite + typecheck + build**

Run: `npm test && npx tsc --noEmit && npm run build`
Expected: all tests pass; `No errors found`; build succeeds. (The renderResults 19-section test still passes — Debug Info has no count so its header stays "Debug Info"; Boot now shows "Boot Notifications (N)".)

- [ ] **Step 3: Commit**

```bash
git add src/app/render/renderResults.ts
git commit -m "feat(parser): wire Debug Info + Boot Notifications into orchestrator (Phase 3b-2)"
```

---

## Task 5: Trackers + manual verification

**Files:**
- Modify: `skills/WORKFLOW.md`, `specs/roadmap.md`, `specs/tasks.md`, `knowledge/project-journal.md`

- [ ] **Step 1: Manual browser check**

Run: `npm run dev` → upload `data/samples/Sample OCPP Client Log .txt` → confirm Debug Info shows
the stat cards + UTC/IST log-duration block, and Boot Notifications shows its table. (5 of 19 sections now real.)

- [ ] **Step 2: Update trackers**

Mark 3b-2 done in `skills/WORKFLOW.md` and `specs/roadmap.md` (5 of 19 section renderers: + Debug Info, Boot). In `specs/tasks.md` move 3b-2 to Done, promote "3b-3 — Status Notifications (full parity)" to Next. Append a dated entry to `knowledge/project-journal.md`.

- [ ] **Step 3: Commit**

```bash
git add skills/WORKFLOW.md specs/roadmap.md specs/tasks.md knowledge/project-journal.md
git commit -m "docs(parser): Phase 3b-2 complete — tracker refresh"
```

---

## Definition of done (Phase 3b-2)

- `formatUtcIst` + `formatLogDuration` ported with tests.
- Debug Info renders parity-faithful stats, alert-code rollup, and UTC/IST log span (pure `computeDebugStats` unit-tested).
- Boot Notifications renders its table via `dataTable` (Preview/Download deferred).
- Full suite green; `tsc --noEmit` clean; `vite build` succeeds; manual browser check passes.
- Trackers updated; 5 of 19 sections now real.
