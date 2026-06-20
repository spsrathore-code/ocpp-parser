# Tasks — current work items

> Living list of granular work. **Suite-level status is in `specs/roadmap.md`** (the
> dashboard); this file is the finer-grained active task list. Done items also flow
> to `knowledge/project-journal.md` and (for shipped parser changes) `CHANGELOG.md`.
> **Last updated:** 2026-06-15

## Done

- [x] SSOT consolidation (`requirements.md`), repo standardisation, OCPP schema strategy (§19.7), Validation Engine spec (`docs/TYPEVALIDATION.md`).
- [x] Skill chain implemented (28 skills).
- [x] **Validation Engine Phase 1 (L1–L3)** — spike (typed-ocpp browser bundle), build, `/review`+`/cso` (R1 fixed + 2 regression tests), `/qa` (788 real frames, 0 bugs). 25 tests; ESM+CJS+browser. PR pushed.
- [x] Global `~/.claude/` streamlined — `operating-principles.md` + `project-standard.md` as canon, thin `CLAUDE.md`.
- [x] **Parser revamp Phase 0** — Vite+TS scaffold, data model ported (§19.3), old parser archived (`archive/parser-v2026.05.14/`).
- [x] Suite tracking established — `specs/roadmap.md` dashboard, journal caught up, `CLAUDE.md` status refreshed.
- [x] **Parser revamp Phase 1** — core pipeline (`parse → correlate → group → processTransactions`), 25 tests incl. real-sample parity.
- [x] **Parser revamp Phase 2a — Detection** (`src/app/detect/`): downtime engine + 4 fault-type config + same-pass WS event harvest (returned, not globalised) + missing-sync (Power-Restore / Emergency-Stop) + incomplete-transactions. +12 tests.
- [x] **Parser revamp Phase 2b — WebSocket health** (`src/app/ws/`): `analyzeWebSocketHealth` (two-pointer PING↔PONG match, adaptive interval, stall/missed-PONG, health status) over the harvested `wsEvents`. +4 tests.
- [x] **Parser revamp Phase 2c — Protocol compliance** (`src/app/protocol/`): `runProtocolValidation` (5 groups / 21 system checks + 10-stage per-tx lifecycle + compliance summary) + `detectPhantomConnectionPattern` (L-001). internalTxMap + rawLogLines passed in. +7 tests (48 total); typecheck clean. *(Source = 21 checks; doc's "24" is drift — reconcile FR-142 later.)*
- [x] **Parser revamp Phase 2d — Health aggregation** (`src/app/health/`): `aggregateConnectorStats` (per-connector rollup of 4 health flags + numeric-only power avg/peak + normal remainder, FR-131) + `analyzeEnergyDispense` (recorded-vs-summed energy reconciliation per connector, non-numeric meter readings excluded, FR-127/128/129). Thresholds promoted to `model/config.ts`. +4 tests (52 total); typecheck clean. Render deferred to Phase 3. **Phase 2 complete.**

- [x] **Parser revamp Phase 3a — Shell + theme + orchestrator + DOM helper** (`src/app/render/` + `src/app/analyze.ts`): typed DOM helper (`el`/`collapsibleSection`), `AnalysisResult` bundle (headless `displayResults`), dark/light theme, app shell (header/upload/container), `renderResults` rendering the 19 §19.4 sections as placeholders, `main.ts` upload→parse→merge→analyze→render, Tailwind Play CDN. +13 tests (66 total); `tsc` + `vite build` clean. Spec + plan under `docs/superpowers/`.

- [x] **Parser revamp Phase 3b-1 — generic table + 3 message-group sections**: `render/table.ts` (`dataTable`, port of `createCollapsibleSection`), `render/format.ts` (`fmtReplayDelay`), orchestrator refactor (per-section `render` fns + header count), and real renderers for Heartbeats / Start Transactions / Stop Transactions (offline-replay markers, SoC extraction, internal-id resolution, txId=0 marker). +13 tests (79 total); `tsc` + `vite build` clean.

- [x] **Parser revamp Phase 3b-2 — Debug Info + Boot Notifications**: `debugInfo.ts` (pure `computeDebugStats` — counts / chips / alert-code rollup / UTC+IST log span + `renderDebugInfo`) + `bootNotifications.ts` (via `dataTable`); `formatUtcIst` + `formatLogDuration` in `format.ts`. +6 tests (86 total). Boot Preview/Download deferred to the context-viewer sub-phase (2026-06-17 decision).

- [x] **Parser revamp Phase 3b-3a — Status Notifications** (table + distribution + session-flow + error-code rollup + filter bar): pure `computeStatusAnalytics` + `renderStatusNotifications`. +6 tests (92 total). RemoteStart diagnostic split to 3b-3b.

- [x] **Parser revamp Phase 3b-4a — Connector Stats + Transaction Summary**: `connectorStats.ts` (draws Phase-2d aggregation, 'N (P%)' flag cells) + `transactionSummary.ts` (8 cards, live zero-energy threshold, filter, 26-col table, `computeTxFlags` pure, `convertToIST`). +7 tests (99 total). Chart/Timeline col → 3c/Phase 4, export → 3d.

- [x] **Parser revamp Phase 3b-4b — Events + Alerts**: filterable tables with per-column text filters (Events: Type/Outlet; Alerts: Outlet/Code/Message), JSON payload cell. Download-Context buttons deferred to context-viewer. +4 tests (103 total).

- [x] **Parser revamp Phase 3b-4c — Transaction & Meter Values**: selector → pivoted 33-col meter-values table + Date/Tx-ID filters; pure `pivotMeterValues` + `buildTxInfo`. Summary-card population, ZUC option, Analysis Graphs deferred to 3c. +5 tests (108 total). **3b-4 (tx-centric) complete.**

- [x] **Parser revamp Phase 3b-5 — analysis section renderers (8)**: Energy Dispense, Incomplete, Fault Status (5a) · Downtime Report, Power-Restore Sync, Emergency-Stop Release (5b) · Protocol Compliance, WebSocket Health (5c). All render-only over existing analyzers; pure `computeFaultSummary`. **All 19 §19.4 sections now rendered.** 122 tests; `tsc` + `vite build` clean.

- [x] **Parser revamp context-viewer** (`render/contextViewer.ts`): shared ±25-line log-context Preview/Download — one delegated handler; retrofit into Boot/Events/Alerts/Downtime/Power-Restore/Emergency-Stop; `dataTable` html-column support. +5 tests (129 total).
- [x] **Parser revamp Phase 3c — Charts (Chart.js)**: per-tx "View Chart" modal (Transaction Summary) + Meter Values "Transaction Analysis Graphs" (6) + ZUC selector option. `chart.js@4` lazy-imported (code-split). Pure `buildTxChartData`/`extractGraphData` unit-tested. +3 tests (132 total). Per-graph Enlarge/PNG-download deferred.

- [x] **Parser revamp Phase 3d — Excel export (SheetJS)**: `export/exportToExcel.ts` (`xlsx` lazy/code-split) + `exportButton`; `collapsibleSection` `headerAction` slot; "Export to Excel" on 17 table sections via `SECTION_ORDER.exportTable`. +4 tests (135 total). **🎉 Phase 3 complete (modulo parked 3b-3b).**

## Next

- [ ] **Merge the Validation Engine PR → `main`** (manual via GitHub; `gh` CLI absent): https://github.com/spsrathore-code/ocpp-parser/pull/new/feat/validation-engine
- [x] **Parser revamp Phase 4a — Log Repository core (local, headless)**: `src/app/repository/` — gzip compress (FR-174), IndexedDB CRUD + 6 indexes (FR-178), save/load/delete/list + `_v2` duplicate versioning (FR-183), storage estimate/persist (FR-175/176/177), failure-isolated auto-save wired into `main.ts` (FR-179). +25 tests (160). Plan `docs/superpowers/plans/2026-06-20-parser-phase4a-repository-core.md`.
- [ ] **Parser revamp Phase 4b — Repository panel UI**: collapsible panel, search/tags, checkbox bulk-select, Load&Analyze, delete/site-name prompts + toast. FR-180/182/184–196, 353–355.
  - _4a hardening follow-ups (from final review, non-blocking) to fold into 4b:_ (1) surface `fileSize` as true UTF-8 bytes in the UI (autoSave already correct; some tests pass `.length`); (2) `await`/`.catch` the writer promises in `compress.ts` before loading arbitrary/older entries (avoid stray unhandledRejection on corrupt input); (3) add an explicit `closeRepoDb()` reset helper + a true failure-injection auto-save test; (4) revisit module-level `persistenceRequested` if persistence becomes test-asserted.
- [ ] **Parser revamp Phase 4d — Session Timeline**: per-tx 4-tab modal (Session/Energy/Status/Telemetry). FR-207–234.
- [ ] **Parser revamp Phase 4e — API download**: EVSE folder-save + download progress. §18.4, A.1.

## Parked

- ⏸️ **Parser revamp Phase 3b-3b — Repeated-RemoteStart diagnostic** (PARKED 2026-06-19, user decision). Status section's auth-contention analysis (⚠ Repeat-RemoteStart card + per-row "N× RS" pill + threshold problem-session panel). Full resume notes: `docs/superpowers/specs/2026-06-19-PARKED-remotestart-diagnostic.md`.
- ⏸️ **Parser revamp Phase 4c — Google Drive sync** (PARKED 2026-06-20, user decision). OAuth 2.0 + Drive upload/download/sidecar/team-folder (FR-197–206). Untestable from `file://` — needs the hosted `https://` URL + OAuth client-id; do during the Phase 5 hosted deploy. Schema already carries `driveFileId` (null until wired).

## Later

- [ ] Parser revamp **Phases 4–5** — repository/timeline/api-download → parity gate + deploy swap.
- [ ] **Engine ↔ Parser integration** (after the revamp reaches parity).
- [ ] **Validation Engine Phase 2** — L4 rule catalog (Protocol Compliance + diagnostics L-001/2/3 + OCPP 1.6J rules) into the `registerProtocolRules` extension point.
- [ ] **CMS**, **Charger Emulator** (SAP candidate), **Training Emulator**.

## Housekeeping

- [ ] Delete the leftover empty `OCPP Client Parser MD Collection/` (git-ignored; locked CWD blocked auto-delete).
- [ ] Remove the project-copy `operating-principles.md` / `project-standard.md` once the global `~/.claude/` canon is finalised.
