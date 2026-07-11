# Parser Revamp — Phase 3 (Render/UI) Design

> **Status:** approved 2026-06-15 · **Branch:** `feat/parser-revamp` · **Spec SSOT:** `specs/requirements.md`
> Brainstormed via `superpowers:brainstorming`. Next step: `superpowers:writing-plans`.

## Context

Phases 0–2 of the parser revamp are complete: the scaffold, the core parse pipeline
(`parse → correlate → group → processTransactions`), and the analysis layer
(`detect`, `health`, `protocol`, `ws`) — 52 tests, typecheck clean. None of it is
yet visible: the root `index.html` is a bare Vite shell (`<div id="app">`), `main.ts`
is a placeholder, and there are no runtime dependencies installed.

Phase 3 builds the **render layer** — the first user-visible parity surface. It
reproduces the legacy v2026.05.14 tool's UI exactly (the goal is feature/UI parity),
wiring the existing analyzers into the DOM. In the legacy, `displayResults()` builds a
`parsedDataContainer` by appending **19 sections** in the fixed order of
`specs/requirements.md` §19.4.

This is the heaviest phase of the revamp (larger than 0–2 combined), so it is
**sub-phased** (3a–3d), each landing green + committed like 2a–2d.

## Goals / non-goals

**Goals**
- Faithful UI/feature parity with v2026.05.14 for the 19 render-order sections.
- Real end-to-end round-trip: file upload → `parseOcppLogsAsync` pipeline → rendered results.
- Per-transaction charts (Chart.js) and per-section Excel export (SheetJS).
- Dark/light theme with `localStorage` persistence.
- No source file exceeds the 2000-line hard limit; every section is independently testable.

**Non-goals (later phases)**
- **Session Timeline** per-row modal + its 4-tab charts → **Phase 4** (with repository / api-download).
- **Log Repository** (IndexedDB) + **Google Drive** integration → **Phase 4**.
- The **parity gate + deploy swap** (point GitHub Pages at the new build) → **Phase 5**.

## Architecture & module layout

The orchestrator owns ordering and wiring; each section is a pure
`(data) => HTMLElement` function with **no globals** (consistent with Phases 1–2,
which pass data in rather than reading `window.*`).

```
src/app/
  render/
    dom.ts              # el()/h() typed DOM helper + collapsibleSection() wrapper
    theme.ts            # dark/light toggle, localStorage['theme']
    shell.ts            # header, file-upload card, help modal, #parsedDataContainer mount
    renderResults.ts    # orchestrator (= legacy displayResults): calls 19 renderers in §19.4 order
    sections/
      debugInfo.ts  bootNotifications.ts  heartbeats.ts  statusNotifications.ts
      startTransactions.ts  stopTransactions.ts  transactionSummary.ts
      connectorStats.ts  transactionMeterValues.ts  events.ts  alerts.ts
      downtimeReport.ts  powerRestoreSync.ts  emergencyStopRelease.ts
      faultStatusSummary.ts  incompleteTransactions.ts  energyDispense.ts
      protocolCompliance.ts  webSocketHealth.ts
  export/
    exportToExcel.ts    # SheetJS wrapper: table/AOA → .xlsx (one helper, all sections reuse)
  charts/
    txChart.ts          # Chart.js per-transaction chart(s)
```

**Render order (§19.4)** — the orchestrator appends in exactly this sequence:
`1` Debug Info → `2` Boot Notifications → `3` Heartbeats → `4` Status Notifications →
`5` Start Transactions → `6` Stop Transactions → `7` Transaction Summary →
`8` Connector Stats → `9` Transaction & Meter Values → `10` Events → `11` Alerts →
`12` Downtime Report → `13` Power Restore Missing Sync → `14` Emergency Stop Release →
`15` Fault Status Summary → `16` Incomplete Transactions → `17` Energy Dispense Check →
`18` Protocol Compliance → `19` WebSocket Health.

## Sub-phase breakdown

| Sub-phase | Delivers | Verify |
|---|---|---|
| **3a — Shell + theme + orchestrator + DOM helper** | `dom.ts`, `theme.ts`, `shell.ts` (header / upload card / help modal), `renderResults.ts` skeleton wiring the parse→detect→health→protocol→ws pipeline to a results container; real upload→parse→render round-trip with a placeholder section list. | App runs in `vite dev`; upload a sample log → pipeline executes → container mounts. Render-helper unit tests. |
| **3b — Static sections (all 19)** | Every section's table/text body, including the renders deferred from Phase 2 (connector stats, energy dispense, protocol compliance, WebSocket health). Sections that also carry charts render their table/controls here; the chart pieces themselves come in 3c. | jsdom render tests per section against fixtures (row counts, cell text, flag colors, empty/"N/A" states). |
| **3c — Charts** | Chart.js per-transaction "View Chart" wired into the relevant section rows (FR-030/031) + any in-section charts (the §6 chart types, enumerated from source during 3c planning). | Chart data-shaping unit-tested (tx → series); canvas render verified in `vite dev`. |
| **3d — Excel export** | `export/exportToExcel.ts` SheetJS helper + per-section export buttons (FR-061–064, IST timestamps). | Export data-shaping unit-tested (rows → AOA); `.xlsx` download verified in `vite dev`. |

## Cross-cutting decisions

- **DOM helper:** a small `el(tag, props, children)` plus a `collapsibleSection(title, icon, body)`
  wrapper (UI-002 collapsible, UI-007 per-section gradient, UI-011 emoji icons). Output is
  identical to the legacy `createElement` + Tailwind `innerHTML` strings, with far less repetition
  and full type-safety.
- **Third-party libs:** `npm install chart.js xlsx` — bundled by Vite, versioned, typed, offline-capable.
- **Tailwind (decided):** keep **Tailwind via the Play CDN `<script>`** for styling *only*, even though
  chart.js/xlsx are bundled. Rationale: the legacy generates **dynamic class names**
  (`text-${colour}-600`, status-driven colors); a bundled Tailwind build purges classes it can't
  statically see, so every dynamic class would need a hand-maintained safelist. The Play CDN does
  JIT in-browser and resolves them for free — zero parity risk. Trade-off accepted: styling needs
  network at runtime and is not tree-shaken (styling only; all functional code is bundled).
- **Theme (UI-006):** `theme.ts` toggles a `dark` class on `<html>` and persists `localStorage['theme']`.

## Testing strategy

- **Vitest + jsdom** for render tests: each section renderer is fed fixture data and asserted on
  DOM structure (row counts, cell text, flag colors, empty/"N/A" states). This is the UI parity net.
- **Export / charts:** split pure data-shaping (unit-tested: rows→AOA, tx→chart series) from the
  side-effecting SheetJS/Chart.js call (thin, not unit-tested).
- The existing **52 tests stay green**; each sub-phase adds its own.

## Risks / open items

- **FR-142 drift** (protocol: source has 21 system checks, spec says 24) — pre-existing, to reconcile
  in `specs/requirements.md`; does not block Phase 3 render.
- **Chart parity:** the "6 chart types" (§6) need enumerating during 3c planning from the legacy source.
- **jsdom canvas:** Chart.js needs a real canvas; 3c keeps chart *logic* in unit tests and verifies the
  actual canvas render manually in `vite dev` (matches the legacy's `requestAnimationFrame` canvas fix).
