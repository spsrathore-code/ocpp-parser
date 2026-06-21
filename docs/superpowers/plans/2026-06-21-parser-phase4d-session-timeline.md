# Parser Phase 4d — Session Timeline & Telemetry Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Faithfully port the per-transaction **Session Timeline & Telemetry** modal (Section 13, FR-207–234) from the legacy v2026.05.14 parser into the TS+Vite revamp — a 4-tab modal (Session · Energy · Status · Telemetry) opened by a "📊 Timeline" button on each Transaction Summary row.

**Architecture:** New `src/app/render/timeline/` module. A pure data shaper (`getTimelineDataForTx`) reshapes one transaction's data into a `TimelineData` bundle; a modal shell (`createSessionTimelineModal`) builds the dark-themed modal + 4-tab bar and manages Chart.js instance lifecycle; four tab renderers consume `TimelineData`. Tabs 1 (Session) & 3 (Status) are pure HTML/CSS (segmented bar / swimlanes via positioned divs); Tabs 2 (Energy) & 4 (Telemetry) use the already-bundled lazy `chart.js`. The "📊 Timeline" button is added to the Transaction Summary rows (beside the existing "View Chart"), wired by threading `messages` into that section renderer.

**Tech Stack:** TypeScript, Vite, Vitest with `// @vitest-environment jsdom` for renderer/data tests, lazy `chart.js` (no new dependency — **no** annotation plugin; marker lines are CSS).

## Global Constraints

- No source file > 2000 lines.
- **Faithful parity** with v2026.05.14 (user standing rule — do NOT compact; reproduce the legacy output in full). Source of truth for the port: `archive/parser-v2026.05.14/OCPP_Parser_Complete_2026.05.14.html`, function block **lines 7386–7931**. See [[feedback_faithful_parity_no_compaction]].
- **FR-234 (additive only):** no existing analysis/parse function or rendering pipeline behavior changed. Permitted existing-code edits: `transactionSummary.ts` gains the "📊 Timeline" button + a delegated handler and an additive `messages` parameter; `renderResults.ts` threads `messages` into the Transaction Summary section call. The `analyze()` pipeline is untouched.
- **Legacy is canonical on the marker set.** The spec FR-215 lists **11** markers including #8 "Phantom Connection (red dashed)". The legacy v2026.05.14 implementation renders **10** markers and has **no Phantom marker**. Per the project's source-canonical rule (cf. the 21-vs-24 protocol-check drift), **port the 10 legacy markers faithfully**; do NOT invent a Phantom marker. Record this drift in the journal.
- **Dark-themed modal by parity.** The legacy modal uses hardcoded dark inline styles and does NOT follow the app's light/dark toggle. Port it faithfully as a self-contained dark modal (inline styles / fixed dark classes). This is intentional parity, not a theming bug.
- **Data source mapping:** legacy `allTransactions` → `transactions: Transaction[]`; legacy `allMessages` → `messages: ParsedMessage[]` (each has `.timestamp`, `.direction`, `.message` = `[type,id,action,payload]`, `.responsePayload?`). `convertToIST(iso)` is in `src/app/render/format.ts` and returns `"DD/MM/YYYY HH:MM:SS IST"`.
- **Transaction field guards:** `duration` and `totalEnergy` are typed `number | 'N/A'`; `socBegin`/`socEnd` are `string` (`'N/A'` or a value). Guard with `typeof x === 'number'` / `x && x !== 'N/A'` before `.toFixed()` or arithmetic. Legacy treated these as numbers; the revamp types are stricter, so the port MUST guard (this is the one place the port diverges from the legacy source, for type-safety).
- **Window:** X-axis window = `[txStart − 10min, (txStop || txStart) + 10min]` (FR-210, FR-222a).
- **Chart.js lazy import:** `const { Chart } = await import('chart.js/auto');` — same pattern as `src/app/render/charts/txChart.ts`. Keep Chart.js out of the jsdom data tests.

---

### Task 1: Data shaper + `_tlTime` + modal shell + Timeline button

**Files:**
- Create: `src/app/render/timeline/timelineData.ts`
- Create: `src/app/render/timeline/sessionTimeline.ts`
- Modify: `src/app/render/sections/transactionSummary.ts` (Timeline button + delegated handler + additive `messages` param)
- Modify: `src/app/render/renderResults.ts` (thread `messages` into the Transaction Summary section)
- Test: `tests/unit/timelineData.test.ts`

**Interfaces:**
- Consumes: `Transaction`, `ParsedMessage` from `../../model/types`; `convertToIST` from `../format`.
- Produces:
  - ```ts
    export interface TlPoint { t: number; v: number; ctx: string; unit: string }
    export interface TlMarker { t: number; label: string; color: string; tip: string }
    export interface TlSwimlaneEvent { t: number; status: string; info: string }
    export interface TlSwimlane { connectorId: number; events: TlSwimlaneEvent[] }
    export interface TlMeterValues { soc: TlPoint[]; energy: TlPoint[]; power: TlPoint[]; tempInlet: TlPoint[]; tempOutlet: TlPoint[]; tempBody: TlPoint[] }
    export interface TimelineData {
      tx: Transaction; winStart: number; winEnd: number; txStart: number; txStop: number | null;
      markers: TlMarker[]; mv: TlMeterValues; swimlanes: TlSwimlane[];
    }
    export function getTimelineDataForTx(txId: number, transactions: Transaction[], messages: ParsedMessage[]): TimelineData | null;
    export function tlTime(ts: number, short: boolean): string; // "HH:MM" (short) or "HH:MM:SS IST"
    ```
  - `createSessionTimelineModal(txId: number, transactions: Transaction[], messages: ParsedMessage[]): void` — builds + appends the dark modal with a 4-tab bar (Session·Energy·Status·Telemetry, default Session), tab switching that destroys/rebuilds Chart.js instances, and a close button/backdrop. In this task the tab bodies render a placeholder (`"<tab> — rendered in 4d-N"`); real renderers land in Tasks 2–5.
  - `wireTimelineButtons(root: HTMLElement, transactions: Transaction[], messages: ParsedMessage[]): void` — delegated `.view-timeline-btn` click handler that reads `data-txid` and calls `createSessionTimelineModal`.

**Faithful-port source:** `getTimelineDataForTx` ← legacy **7388–7507**; `_tlTime` ← **7510–7517**; `createSessionTimelineModal` shell + tab bar + chart lifecycle ← **7865–7931**. Port the logic faithfully with the field guards and the `startMsg` adaptation below.

**Adaptations from the legacy source (apply exactly):**
1. `allTransactions.find(t => String(t.id) === String(txId))` → `transactions.find(t => t.id === txId)`.
2. `allMessages` → the `messages` parameter. The StatusNotification filter, Authorize scan, and BootNotification scan all read `m.message?.[2]` (action), `m.direction === 'sent'`, `m.timestamp`, `m.message?.[3]` (payload).
3. **Auth-status (legacy used `tx.startMsg?.responsePayload?.idTagInfo?.status`)** — the revamp `Transaction` has no `startMsg`. Derive it: find the StartTransaction message for this tx — `messages.find(m => m.message?.[2] === 'StartTransaction' && (m.responsePayload as any)?.transactionId === txId)` — and read `(startMsg?.responsePayload as any)?.idTagInfo?.status`. The primary path (Authorize message near `txStart`) is unchanged.
4. Field guards (see Global Constraints): the **shaper itself only stores raw tx + numeric `mv` points**, so guards mostly matter in the tab renderers; but the anomaly check `tx.totalEnergy * 1000 < 500` (used in Session tab) needs `typeof tx.totalEnergy === 'number'`. Keep the shaper returning `tx` as-is.

- [ ] **Step 1: Write the failing test**

```ts
// tests/unit/timelineData.test.ts
// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { getTimelineDataForTx, tlTime } from '../../src/app/render/timeline/timelineData';
import type { Transaction, ParsedMessage } from '../../src/app/model/types';

// Synthetic: one tx on connector 1, with a Preparing→Charging→Finishing status arc,
// MeterValues carrying SoC + Energy + Power + Temperature(Inlet), and a Stop.
const T0 = Date.parse('2026-01-21T10:00:00Z');
const min = (n: number) => T0 + n * 60_000;

function sn(connectorId: number, status: string, tOffsetMin: number, extra: Record<string, unknown> = {}): ParsedMessage {
  return { timestamp: new Date(min(tOffsetMin)).toISOString(), direction: 'sent',
    message: [2, 'id', 'StatusNotification', { connectorId, status, ...extra }] } as unknown as ParsedMessage;
}
function mvMsg(tOffsetMin: number, sampled: Array<Record<string, unknown>>): ParsedMessage {
  return { timestamp: new Date(min(tOffsetMin)).toISOString(), direction: 'sent',
    message: [2, 'id', 'MeterValues', { connectorId: 1, meterValue: [{ timestamp: new Date(min(tOffsetMin)).toISOString(), sampledValue: sampled }] }] } as unknown as ParsedMessage;
}

const tx: Transaction = {
  id: 555, startTime: new Date(min(0)).toISOString(), stopTime: new Date(min(30)).toISOString(),
  connectorId: 1, idTag: 'TAG1', meterStart: 1000, meterStop: 6000, stopReason: 'Local',
  totalEnergy: 5, duration: 30, socBegin: '20', socEnd: '80',
  meterValues: [
    mvMsg(1, [{ measurand: 'SoC', value: '20', context: 'Transaction.Begin' }, { measurand: 'Energy.Active.Import.Register', value: '1000', unit: 'Wh' }, { measurand: 'Power.Active.Import', value: '7000', unit: 'W' }, { measurand: 'Temperature', value: '40', location: 'Inlet' }]),
    mvMsg(29, [{ measurand: 'SoC', value: '80', context: 'Transaction.End' }, { measurand: 'Energy.Active.Import.Register', value: '6000', unit: 'Wh' }]),
  ],
  isOfflineReplay: false, logTimestamp: new Date(min(0)).toISOString(), replayDelayMs: 0, internalTransactionId: null,
};
const messages: ParsedMessage[] = [
  sn(1, 'Available', -8), sn(1, 'Preparing', -2), sn(1, 'Charging', 1), sn(1, 'Finishing', 31), sn(1, 'Available', 33),
  ...tx.meterValues,
];

describe('getTimelineDataForTx (FR-210/211/215/222)', () => {
  const data = getTimelineDataForTx(555, [tx], messages)!;

  it('returns null for an unknown tx', () => {
    expect(getTimelineDataForTx(999, [tx], messages)).toBeNull();
  });

  it('windows 10 min before start and after stop', () => {
    expect(data.winStart).toBe(min(0) - 10 * 60_000);
    expect(data.winEnd).toBe(min(30) + 10 * 60_000);
  });

  it('builds ordered markers incl. Start/Charging/Stop/Finishing/Available', () => {
    const labels = data.markers.map((m) => m.label);
    expect(labels.some((l) => l.includes('Available'))).toBe(true);
    expect(labels.some((l) => l.includes('Preparing'))).toBe(true);
    expect(labels.some((l) => l.includes('Charging'))).toBe(true);
    expect(labels.some((l) => l.includes('StartTransaction'))).toBe(true);
    expect(labels.some((l) => l.includes('Stop'))).toBe(true);
    expect(labels.some((l) => l.includes('Finishing'))).toBe(true);
    // markers are time-sorted
    const ts = data.markers.map((m) => m.t);
    expect(ts).toEqual([...ts].sort((a, b) => a - b));
    // no Phantom marker (legacy parity — 10-marker set)
    expect(labels.some((l) => l.includes('Phantom'))).toBe(false);
  });

  it('breaks MeterValues into measurand tracks', () => {
    expect(data.mv.soc.map((p) => p.v)).toEqual([20, 80]);
    expect(data.mv.energy.map((p) => p.v)).toEqual([1000, 6000]);
    expect(data.mv.power.map((p) => p.v)).toEqual([7000]);
    expect(data.mv.tempInlet.map((p) => p.v)).toEqual([40]);
    expect(data.mv.soc[0].ctx).toContain('Begin');
  });

  it('builds a swimlane for connector 1', () => {
    expect(data.swimlanes.map((s) => s.connectorId)).toContain(1);
    const lane = data.swimlanes.find((s) => s.connectorId === 1)!;
    expect(lane.events.map((e) => e.status)).toEqual(['Available', 'Preparing', 'Charging', 'Finishing', 'Available']);
  });
});

describe('tlTime', () => {
  it('formats short HH:MM and full HH:MM:SS IST', () => {
    const ts = Date.parse('2026-01-21T10:00:00Z');
    expect(tlTime(ts, true)).toMatch(/^\d{2}:\d{2}$/);
    expect(tlTime(ts, false)).toMatch(/IST$/);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/timelineData.test.ts`
Expected: FAIL — cannot resolve `timelineData`.

- [ ] **Step 3: Implement `timelineData.ts`**

Port `getTimelineDataForTx` (legacy 7388–7507) and `_tlTime` (7510–7517) into `src/app/render/timeline/timelineData.ts`, exporting the types above and `tlTime`. Apply adaptations 1–4. The MeterValues breakdown, the 10 markers (Available-before, Preparing, Auth, Start, Charging, E-Stop, Reboot, Stop, Finishing, Available-after), `markers.sort`, and the swimlanes block are ported as-is with the global→param mapping. Use the test fixture's measurand strings (`SoC`, `Energy.Active.Import.Register`, `Power.Active.Import`, `Temperature` + `location`) exactly as the legacy matches them.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/timelineData.test.ts`
Expected: PASS.

- [ ] **Step 5: Implement the modal shell + button wiring**

In `src/app/render/timeline/sessionTimeline.ts`, port `createSessionTimelineModal` (legacy 7865–7931): build a fixed dark modal appended to `document.body`, a 4-tab bar (Session·Energy·Status·Telemetry, default Session active), a tab-switch handler that **destroys existing Chart.js instances** before rendering the next tab (keep a `charts: {destroy():void}[]` list + a `pushChart`), and close via a × button + backdrop click. Tab bodies render a placeholder string for now. Add `wireTimelineButtons(root, transactions, messages)` — a delegated `.view-timeline-btn` handler mirroring the existing `.view-chart-btn` handler in `transactionSummary.ts`.

In `src/app/render/sections/transactionSummary.ts`:
- Add an additive parameter `messages: ParsedMessage[]` to the section's exported render function (thread it through; default `[]` if the signature is widely called, but prefer updating the one caller in `renderResults.ts`).
- In the row builder, add the Timeline button beside View Chart (legacy 3939): `<button type="button" class="view-timeline-btn bg-indigo-600 hover:bg-indigo-700 text-white py-1 px-3 rounded text-xs ml-1" data-txid="${tx.id}">📊 Timeline</button>`.
- After building `root`, call `wireTimelineButtons(root, transactions, messages)`.

In `src/app/render/renderResults.ts`: pass `result.messages` into the Transaction Summary section render call (additive; confirm the existing call site and its exact argument list first).

- [ ] **Step 6: Verify typecheck + build + a smoke test**

Add to `tests/unit/timelineData.test.ts` (or a new `sessionTimeline.test.ts`, jsdom) a smoke test:
```ts
// @vitest-environment jsdom
import { createSessionTimelineModal } from '../../src/app/render/timeline/sessionTimeline';
it('opens a modal with a 4-tab bar', () => {
  createSessionTimelineModal(555, [tx], messages); // reuse the fixture
  const modal = document.querySelector('[data-timeline-modal]');
  expect(modal).not.toBeNull();
  expect(modal!.textContent).toContain('Session');
  expect(modal!.textContent).toContain('Energy');
  expect(modal!.textContent).toContain('Status');
  expect(modal!.textContent).toContain('Telemetry');
});
```
Run: `npx vitest run tests/unit/timelineData.test.ts && npm run typecheck && npm run build`
Expected: PASS; no TS errors; build clean.

- [ ] **Step 7: Commit**

```bash
git add src/app/render/timeline/ src/app/render/sections/transactionSummary.ts src/app/render/renderResults.ts tests/unit/timelineData.test.ts
git commit -m "feat(parser): Phase 4d-1 — timeline data shaper + modal shell + Timeline button (FR-210/211/231/232/233)"
```

---

### Task 2: Tab 1 — Session (HTML/CSS)

**Files:**
- Create: `src/app/render/timeline/tabSession.ts`
- Modify: `src/app/render/timeline/sessionTimeline.ts` (call `renderSessionTab`)
- Test: `tests/unit/timelineTabs.test.ts`

**Interfaces:**
- Consumes: `TimelineData`, `tlTime` from `./timelineData`.
- Produces: `renderSessionTab(container: HTMLElement, data: TimelineData): void` — metadata card (TX ID·Connector·ID Tag·Duration·Energy·SoC begin→end·Stop Reason, FR-216) + anomaly badges (Emergency Stop / Mid-Session Reboot / Zero Energy, FR-217) + the segmented timeline bar (proportional gap segments + 26px event blocks with hover tips + charging-duration label) + connector lines + per-marker stage chips. Faithful port of legacy **7519–~7648**.

**Faithful-port source:** legacy `_renderSessionTab` (starts 7519). Read the full function (through the stage-chips block) and port it. Apply the `typeof tx.totalEnergy === 'number'` guard for the Zero-Energy anomaly and the `socBegin`/`socEnd`/`duration` display guards.

- [ ] **Step 1: Write the failing test** (jsdom; reuse the Task-1 fixture — extract it to a shared helper or redefine):

```ts
// tests/unit/timelineTabs.test.ts  (Session portion)
// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { getTimelineDataForTx } from '../../src/app/render/timeline/timelineData';
import { renderSessionTab } from '../../src/app/render/timeline/tabSession';
// ...rebuild the `tx` + `messages` fixture from Task 1 (or import a shared fixture)...

describe('renderSessionTab (FR-216/217)', () => {
  it('renders the metadata card and stage chips for the markers', () => {
    const data = getTimelineDataForTx(555, [tx], messages)!;
    const container = document.createElement('div');
    renderSessionTab(container, data);
    expect(container.textContent).toContain('TX ID');
    expect(container.textContent).toContain('555');
    expect(container.textContent).toContain('Connector');
    expect(container.textContent).toContain('StartTransaction'); // a stage chip label
    // duration/energy rendered with guards (no "NaN"/"undefined")
    expect(container.textContent).not.toContain('NaN');
    expect(container.textContent).not.toContain('undefined');
  });
});
```

- [ ] **Step 2–4: RED → port `tabSession.ts` → GREEN.** Run `npx vitest run tests/unit/timelineTabs.test.ts`.
- [ ] **Step 5:** Wire `renderSessionTab` into the modal's Session tab (replace the placeholder). `npm run typecheck`.
- [ ] **Step 6: Commit** `feat(parser): Phase 4d-2 — Session tab (metadata card, segmented bar, stage chips) (FR-214/215/216/217)`

---

### Task 3: Tab 2 — Energy (Chart.js)

**Files:**
- Create: `src/app/render/timeline/tabEnergy.ts`
- Modify: `src/app/render/timeline/sessionTimeline.ts` (call `renderEnergyTab`, register its Chart in the lifecycle)
- Test: `tests/unit/timelineTabs.test.ts` (Energy portion — data-prep assertions; Chart.js is lazy so assert the pure point-building, not the canvas)

**Interfaces:**
- Consumes: `TimelineData`, `tlTime`.
- Produces:
  - `buildEnergySeries(data: TimelineData): { socPts: {x:number;y:number;ctx:string}[]; energyPts: {x:number;y:number}[] }` — pure; SoC points carry context for point-color; energy points are cumulative kWh (legacy converts Wh→kWh as needed — port exactly).
  - `renderEnergyTab(container: HTMLElement, data: TimelineData, pushChart: (c: {destroy():void}) => void): Promise<void>` — lazy-loads Chart.js, builds the dual-axis (ySoC left 0–100, yEnergy right) line chart with context-coloured SoC points + dashed energy line + IST tooltip. Faithful port of legacy **~7650–7739**.

**Faithful-port source:** legacy `_renderEnergyTab` (the SoC/energy series prep just above line 7700, then the `new Chart(...)` block 7700–7738).

- [ ] **Step 1:** Failing test on `buildEnergySeries` (pure): SoC points = [{20,Begin},{80,End}], energy points = [1000→ (kWh per legacy), 6000→…] with correct x timestamps. Assert context strings drive the expected first/last point.
- [ ] **Step 2–4:** RED → port → GREEN. (Test the pure `buildEnergySeries`; do not instantiate Chart.js in the test.)
- [ ] **Step 5:** Wire `renderEnergyTab` into the Energy tab; ensure its Chart is pushed to the lifecycle list so tab-switching destroys it. `npm run typecheck && npm run build` (Chart.js stays code-split).
- [ ] **Step 6: Commit** `feat(parser): Phase 4d-3 — Energy tab (SoC+Energy dual-axis, context points) (FR-218/219/220)`

---

### Task 4: Tab 3 — Status (HTML/CSS swimlanes)

**Files:**
- Create: `src/app/render/timeline/tabStatus.ts`
- Modify: `src/app/render/timeline/sessionTimeline.ts` (call `renderStatusTab`)
- Test: `tests/unit/timelineTabs.test.ts` (Status portion)

**Interfaces:**
- Consumes: `TimelineData`, `tlTime`.
- Produces: `renderStatusTab(container: HTMLElement, data: TimelineData): void` — one swimlane per connector with colour-coded status blocks (width ∝ duration), vertical marker lines across all lanes, hover tips (`Status · info \n time`), an empty-state (`"No StatusNotification data in this window."`), and a status-colour legend. Faithful port of legacy **7741–7791** (`statusColors` map included).

- [ ] **Step 1:** Failing test: render into a container, assert one lane row per connector (`C1`), status block text present for wide blocks (e.g. `Charging`), and the legend lists the statuses. Empty-data case shows the empty-state string.
- [ ] **Step 2–4:** RED → port `tabStatus.ts` → GREEN.
- [ ] **Step 5:** Wire into the Status tab. `npm run typecheck`.
- [ ] **Step 6: Commit** `feat(parser): Phase 4d-4 — Status tab (connector swimlanes + marker lines + legend) (FR-222/223/225/226)`

---

### Task 5: Tab 4 — Telemetry (Chart.js)

**Files:**
- Create: `src/app/render/timeline/tabTelemetry.ts`
- Modify: `src/app/render/timeline/sessionTimeline.ts` (call `renderTelemetryTab`)
- Test: `tests/unit/timelineTabs.test.ts` (Telemetry portion)

**Interfaces:**
- Consumes: `TimelineData`.
- Produces: `renderTelemetryTab(container: HTMLElement, data: TimelineData, pushChart: (c:{destroy():void})=>void): Promise<void>` — a Power (kW) chart and a Temperature (°C) chart (Inlet/Outlet/Body curves) with threshold-breach points marked red (thresholds Inlet 60 / Outlet 65 / Body 60), separated by a divider; the empty-state `"Insufficient telemetry data for this transaction."` when neither power nor temp samples exist (FR-230). Faithful port of legacy **7793–7863**.

- [ ] **Step 1:** Failing test: with power-only fixture, assert a "Power (kW)" label is rendered; with NO power/temp samples, assert the insufficient-data string. (Pure-enough: test the label/empty-state DOM; Chart.js canvas instantiation is exercised only when samples exist — guard the test to the empty-state + label paths to avoid needing Chart.js in jsdom, OR mock `chart.js/auto` like existing chart tests do — follow `tests/unit/txChart.test.ts`'s approach.)
- [ ] **Step 2–4:** RED → port `tabTelemetry.ts` → GREEN.
- [ ] **Step 5:** Wire into the Telemetry tab; register Charts in the lifecycle. `npm run typecheck && npm run build`.
- [ ] **Step 6: Commit** `feat(parser): Phase 4d-5 — Telemetry tab (power + temp w/ breach points) (FR-227/229/230)`

---

### Task 6: Full-suite green + tracker updates

**Files:** `specs/roadmap.md`, `specs/tasks.md`, `skills/WORKFLOW.md`, `knowledge/project-journal.md`

- [ ] **Step 1:** `npm test && npm run typecheck && npm run build` — all prior tests pass plus the new timeline tests; build clean (Chart.js still code-split). Record the new total.
- [ ] **Step 2:** Update trackers — mark 4d done in roadmap phase tracker + suite board "next" → 4e API download; check off 4d in tasks.md; add a `[x] Phase 4d` entry to WORKFLOW.md; journal entry (discussed/decided/implemented/next) **recording the 10-vs-11 marker drift** (legacy has no Phantom marker; ported faithfully) and the dark-modal-by-parity note.
- [ ] **Step 3: Commit** `docs(parser): Phase 4d complete — Session Timeline modal; trackers refreshed`

---

## Self-Review

**Spec coverage (Section 13):**
- FR-207/208/209 per-tx modal, 4 independent tabs → Tasks 1–5 ✅.
- FR-210 window start→stop (+pad) → Task 1 `winStart/winEnd` ✅.
- FR-211 derives from transactions + status + MeterValues + messages (no new parsing) → Task 1 ✅.
- FR-212 "📊 Timeline" button per row → Task 1 ✅. FR-213 modal header + 4-tab bar, default Session → Task 1 ✅.
- FR-214/215 timeline bar + markers → Task 2 ✅ (**10 markers, no Phantom — legacy-canonical drift, recorded**). FR-216 metadata card / FR-217 anomaly badges → Task 2 ✅.
- FR-218/219/220 Energy dual-curve + tooltip + context markers → Task 3 ✅. FR-221 meter-gap shaded region → **only if the legacy `_renderEnergyTab` implements it**; the read range did not show a gap region — port whatever the legacy function contains and note in the report if FR-221 is absent from the legacy source (legacy-canonical).
- FR-222/222a/223/225/226 swimlanes + marker lines + hover → Task 4 ✅.
- FR-227/229/230 telemetry power+temp, breach points, insufficient-data → Task 5 ✅. (FR-228 not listed in the spec extract — confirm none skipped.)
- FR-231/232/233/234 modal/data fns + button + additive-only → Tasks 1 + threading ✅.

**Placeholder scan:** Tasks 2–5 each replace the Task-1 tab placeholder; no residual placeholders after Task 5. The faithful-port steps cite exact legacy line ranges rather than inlining 400+ lines — this is the established chart-port pattern (Phase 3c), not a placeholder; each carries a behavioral test.

**Type consistency:** `TimelineData` + sub-types defined in Task 1 consumed unchanged by Tasks 2–5; `pushChart: (c:{destroy():void})=>void` identical in Tasks 3 & 5 and in the modal lifecycle; `getTimelineDataForTx(txId, transactions, messages)` / `createSessionTimelineModal(txId, transactions, messages)` / `wireTimelineButtons(root, transactions, messages)` signatures stable.

**Implementer first-checks (per task):** confirm the exact current signature of the Transaction Summary section render fn + its `renderResults.ts` call site before threading `messages` (Task 1); confirm `tests/unit/txChart.test.ts`'s Chart.js handling and mirror it for the Energy/Telemetry tests (Tasks 3, 5); read the full legacy function body for each tab (the cited ranges are start anchors — port to the function's real end).
