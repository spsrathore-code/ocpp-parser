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

- [x] **Parser revamp Phase 3b-5a — Energy Dispense + Incomplete + Fault Status**: render-only over existing analyzers; pure `computeFaultSummary`. +6 tests (114 total).

## Next

- [ ] **Merge the Validation Engine PR → `main`** (manual via GitHub; `gh` CLI absent): https://github.com/spsrathore-code/ocpp-parser/pull/new/feat/validation-engine
- [ ] **Parser revamp Phase 3b-5b — Downtime Report + Power-Restore Missing Sync + Emergency-Stop Release** (Downtime's per-row Preview/Download → context-viewer). jsdom-tested.
- [ ] **Parser revamp Phase 3b-5c — Protocol Compliance + WebSocket Health** renderers (over existing `r.protocol` / `r.wsHealth`).
- [ ] **Parser revamp Phase 3b-3b — Repeated-RemoteStart diagnostic**: raw-line scan + RemoteStart↔Authorize↔runtime-block↔OpenAPI correlation → ⚠ card + per-row "N× RS" pill + problem-session panel. Likely a dedicated analysis module.

## Later

- [ ] Parser revamp **context-viewer** — shared Preview/Download "log context" modal + download; retro-fit into Boot/Events/Alerts/Downtime.
- [ ] Parser revamp **Phase 3c/3d** — Chart.js charts → SheetJS Excel export.
- [ ] Parser revamp **Phases 4–5** — repository/timeline/api-download → parity gate + deploy swap.
- [ ] **Engine ↔ Parser integration** (after the revamp reaches parity).
- [ ] **Validation Engine Phase 2** — L4 rule catalog (Protocol Compliance + diagnostics L-001/2/3 + OCPP 1.6J rules) into the `registerProtocolRules` extension point.
- [ ] **CMS**, **Charger Emulator** (SAP candidate), **Training Emulator**.

## Housekeeping

- [ ] Delete the leftover empty `OCPP Client Parser MD Collection/` (git-ignored; locked CWD blocked auto-delete).
- [ ] Remove the project-copy `operating-principles.md` / `project-standard.md` once the global `~/.claude/` canon is finalised.
