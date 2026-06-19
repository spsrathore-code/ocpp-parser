# Workflow State

> Auto-updated by skills. Mark Build phase manually when implementation is done.
> One section per active feature. Completed features move to the archive below.
> Format: ✅ Complete | ⏳ Active | ⬜ Pending

---

## Feature: Parser Revamp (TS+Vite, feature/UI parity)  |  Started: 2026-06-14

Goal: rebuild the 9,813-line single-file parser as a modular TS+Vite app — exact
feature/UI parity with v2026.05.14, optimized, bugs fixed. Old parser stays live
until parity proven (Phase 5). Build runs as phased sub-cycles (0–5).

| Phase   | Skill(s)                                  | Status      | Date       |
|---------|-------------------------------------------|-------------|------------|
| Think   | /office-hours, /spec                      | ✅ Complete | 2026-06-14 |
| Plan    | /plan-eng-review                          | ✅ Complete | 2026-06-14 |
| Build   | /build-complete (checkpoint, not impl.)   | ⏳ Active   | 2026-06-14 |
| Review  | /review + /cso                            | ⬜ Pending  |            |
| Test    | /qa                                       | ⬜ Pending  |            |
| Ship    | /ship + /document-release + /canary       | ⬜ Pending  |            |
| Reflect | /retro + /learn                           | ⬜ Pending  |            |

### Build sub-phases
- [x] **Phase 0 — Scaffold:** Vite+TS project, test harness, build-to-static, ported data model (§19.3 → `src/app/model/types.ts`). Old parser archived to `archive/parser-v2026.05.14/`.
- [x] **Phase 1 — Core pipeline:** parse → correlate → group → processTransactions ported (`src/app/parse/`). 25 tests (synthetic + real-sample: 2 tx). config + Transaction type parity-revised.
- [x] **Phase 2 — Detection/health/protocol/ws** modules (complete).
  - [x] **2a — Detection** (`src/app/detect/`): `downtimeConfig` (4 fault types), `detectDowntimes` (+ same-pass WS event harvest, returned not globalised), `missingSync` (Power-Restore + Emergency-Stop sync flags), `incompleteTransactions`. +12 tests (37 total).
  - [x] **2b — WebSocket health** (`src/app/ws/`): `analyzeWebSocketHealth` (two-pointer PING↔PONG match, adaptive interval, stall + missed-PONG detection, Healthy/Warning/Critical status) consuming the harvested `wsEvents`. +4 tests (41 total). Render (`createWebSocketHealthSection`) deferred to Phase 3.
  - [x] **2c — Protocol compliance** (`src/app/protocol/`): `runProtocolValidation` (5 groups / 21 system checks + 10-stage per-tx lifecycle + compliance summary) + `detectPhantomConnectionPattern` (L-001). internalTxMap + rawLogLines passed in, not globalised. +7 tests (48 total). *(Source has 21 checks, not the doc's 24 — doc drift, source canonical.)* Render deferred to Phase 3.
  - [x] **2d — Health aggregation** (`src/app/health/`): `aggregateConnectorStats` (per-connector rollup of the 4 health flags — zero-energy / temp-high / meter-diff / current-mismatch — + numeric-only power avg/peak + normal remainder, FR-131) and `analyzeEnergyDispense` (recorded vs summed energy reconciliation per connector, non-numeric meter readings excluded, FR-127/128/129). Thresholds promoted to `model/config.ts`. +4 tests (52 total). Render (`createConnectorStatsSection` / `createEnergyDispenseSection`) deferred to Phase 3.
- [~] **Phase 3 — Render/UI** (19 sections, charts, export, theme) — in progress; spec `docs/superpowers/specs/2026-06-15-parser-phase3-render-design.md`, sub-phased 3a→3d.
  - [x] **3a — Shell + theme + orchestrator + DOM helper** (`src/app/render/` + `src/app/analyze.ts`): typed `el()`/`collapsibleSection()` DOM helper; `AnalysisResult` bundle (`analyze`/`analyzeLogLines`/`mergeParsed`) = headless `displayResults`; `initTheme` (dark/light + localStorage); `renderShell` (header/upload/container); `renderResults` orchestrator rendering the 19 §19.4 sections (placeholder bodies) in order; `main.ts` wires upload→parse→merge→analyze→render; Tailwind Play CDN in `index.html`. +13 tests (66 total), typecheck + `vite build` clean. *(Plan deviation: `WsHealth.connectionStatus`, not `.status`.)* Plan: `docs/superpowers/plans/2026-06-15-parser-phase3a-shell.md`.
  - [~] **3b — Static section renderers** (replace the 19 placeholders with real table/text bodies, incl. Phase-2 deferred renders). Batched by renderer type.
    - [x] **3b-1 — generic table + 3 message-group sections**: `render/table.ts` (`dataTable` = port of `createCollapsibleSection`, sticky S.No./File Name cols, faithful `|| 'N/A'` cells), `render/format.ts` (`fmtReplayDelay`), orchestrator refactor (per-section `render` fns + optional header count), and real renderers for **Heartbeats**, **Start Transactions**, **Stop Transactions** (offline-replay markers, SoC extraction, internal-id resolution, txId=0 marker). +13 tests (79 total); `tsc` + `vite build` clean. Plan `docs/superpowers/plans/2026-06-16-parser-phase3b1-generic-tables.md`.
    - [x] **3b-2 — Debug Info + Boot Notifications**: `render/sections/debugInfo.ts` (pure `computeDebugStats` — counts / tx-id + event-type chips / alert-code rollup / UTC+IST log span; `renderDebugInfo` builds the stats panel) + `render/sections/bootNotifications.ts` (via `dataTable`). `formatUtcIst` + `formatLogDuration` added to `format.ts`. +6 tests (86 total); `tsc` + `vite build` clean. Plan `docs/superpowers/plans/2026-06-18-parser-phase3b2-debug-boot.md`.
    - [~] **3b-3 — Status Notifications** (own sub-phase).
      - [x] **3b-3a** (`render/sections/statusNotifications.ts`): pure `computeStatusAnalytics` (summary counts, status distribution, per-connector session-flow classification, error-code rollup) + `renderStatusNotifications` (5 summary cards, distribution bars, session-flow cards + per-connector table, error-code table, filter bar [Connector/Status/Error/Vendor/Info + Session Flow], filterable 10-col main table with Faulted highlight). +6 tests (92 total); `tsc` + `vite build` clean. *(Implemented directly, no separate plan doc — mega-section, inline execution.)*
      - [ ] **3b-3b — Repeated-RemoteStart diagnostic** (raw-line scan + RemoteStart↔Authorize↔runtime-block↔OpenAPI correlation): the ⚠ Repeat-RemoteStart summary card + per-row "N× RS" pill/amber highlight + threshold-driven problem-session panel. Likely its own analysis module.
    - [~] **3b-4 — transaction-centric**: [x] **3b-4a** Connector Stats (`sections/connectorStats.ts`, draws Phase-2d `r.connectorStats`) + Transaction Summary (`sections/transactionSummary.ts`: 8 cards, live zero-energy threshold, filter, 26-col table; `computeTxFlags` pure; `convertToIST` added to `format.ts`; Chart/Timeline col → 3c/Phase 4). · [x] **3b-4b** Events + Alerts (`sections/events.ts`, `sections/alerts.ts`: filterable tables, per-column text filters; Download-Context button → context-viewer). · [x] **3b-4c** Transaction & Meter Values (`sections/meterValues.ts`: selector → pivoted 33-col table + Date/Tx-ID filters; pure `pivotMeterValues`/`buildTxInfo`; **summary cards + internal-tx banner + Detailed Statistics now populated** via `getTransactionMetrics`/`identifyZUCSessions`/`calculateTransactionStats` — follow-up fix after user found cards blank; only the Chart.js Analysis Graphs + ZUC selector option remain → 3c). **3b-4 complete.** 124 tests.
    - [x] **3b-5 — analysis sections** (render-only; analyzers already in `analyze.ts`): [x] **3b-5a** Energy Dispense + Incomplete + Fault Status · [x] **3b-5b** Downtime Report + Power-Restore Sync + Emergency-Stop Release (`downtimeReport.ts`, `syncFlags.ts`) · [x] **3b-5c** Protocol Compliance + WebSocket Health (`protocolCompliance.ts`, `webSocketHealth.ts`). **All 19 §19.4 sections now have real renderers. 122 tests; `tsc` + `vite build` clean.**
- **3b static renders COMPLETE.**
    - [x] **context-viewer** (`render/contextViewer.ts`): shared ±25-line log-context Preview/Download — one delegated `data-ctx-*` click handler wired on the container; retrofit into Boot (Preview+Download), Events/Alerts (Download), Downtime + Power-Restore + Emergency-Stop (Preview+Download range). `dataTable` gained html-column support. 129 tests.
- **3b-3b Repeated-RemoteStart diagnostic — ⏸️ PARKED 2026-06-19** (user decision; resume later). Full resume notes (legacy line ranges + algorithm + recommended architecture): `docs/superpowers/specs/2026-06-19-PARKED-remotestart-diagnostic.md`. The rest of Status is done.
- [x] **Phase 3c — Charts (Chart.js)** complete: `npm i chart.js@4` (lazy-imported → code-split chunk). `render/charts/txChart.ts` (per-tx SoC+Power dual-axis, Transaction Summary "View Chart" modal — Chart col back to 27) + `render/charts/meterValueGraphs.ts` (6 line graphs **faithful**: hover tooltips via interaction, dashed Present series, point-hover styling, per-unit tooltips, SoC x-axis on graph 3, dual y-axes on graph 6) + per-graph 🔍 Enlarge modal + 📥 PNG download + ZUC selector option. 132 tests. *(First graph pass was lossy — user caught missing hover/dash; re-ported faithfully in 3c-c.)* Status RemoteStart card rides with parked 3b-3b.
- Remaining for Phase 3: **3d Excel export** (SheetJS per-section buttons). Then Phase 4 (repository/timeline/api-download) + Phase 5 (parity gate + deploy swap).
    - [ ] **(cross-cutting) context-viewer** sub-phase: shared Preview/Download "log context" modal + download, retro-fit into Boot/Events/Alerts/Downtime (deferred per 2026-06-17 decision).
  - [ ] **3c — Charts** (Chart.js per-tx + in-section).
  - [ ] **3d — Excel export** (SheetJS per-section buttons).
- [ ] **Phase 4 — Repository / timeline / api-download.**
- [ ] **Phase 5 — Parity gate + deploy swap.**

### Key outputs
- **Think:** `specs/requirements.md` (1,860-line SSOT) + §19 architecture
- **Plan:** architecture locked 2026-06-14 — §19.6 module map, TS+Vite, golden-master parity tests, 6-phase roadmap (this file)
- **Build:** branch `feat/parser-revamp`; app under `src/app/` (Vite, root `index.html` shell)
- **Review:** [findings summary]
- **Test:** [pass/fail summary, regression test path]
- **Ship:** [PR link]
- **Reflect:** [journal entry date]

---

## Completed features

| Feature | Completed | PR |
|---|---|---|
| _(none yet)_ | — | — |
