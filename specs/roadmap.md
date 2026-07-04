# OCPP Suite — Roadmap & Live Progress Dashboard

> **The single at-a-glance view of where the whole suite stands.** Update this at
> every phase boundary (it is the "how far have we come / how far to go" board).
> Per-branch phase detail lives in `skills/WORKFLOW.md`; per-tool detail in each
> tool's spec. The suite is one mega-repo; tools ship independently.
>
> **Last updated:** 2026-06-23

## Suite status board

| # | Tool | Status | Phase | Branch | Next milestone |
|---|---|---|---|---|---|
| 1 | **Validation Engine** (L1–L3) | 🟢 Built · **integrated into Parser (Phase 6)** | Done (L1–L3) | merged into `feat/parser-revamp` (`src/services/validation/`); not on `main` | L4 (Phase 2) catalog; eventually land on `main` |
| 2 | **Parser — revamp** (TS+Vite) | 🟡 In build (Phase 3 + 4a/4b/4d + 6 done; §4 compliance Reviewed+QA'd; 3b-3b/4c/4e parked) | Build→Review | `feat/parser-revamp` | `/review`+`/qa` Phase 6 · fix cross-file id-collision bug · deploy decision (Help modal + parked + `vite base`) |
| — | Parser — *legacy v2026.05.14* | 🟢 Live | — | `main` / GitHub Pages | Stays live until revamp reaches parity (Phase 5) |
| 3 | **CMS (CSMS)** | ⚪ Planned | — | — | Starts after Parser revamp |
| 4 | **Charger Emulator** (OCPP Simulator) | 🟡 In build — OCPP Simulator (Tab 1) integrated: Phases 0–4 done | Build | `feat/ocpp-simulator` | Optional training polish (Phase 5) · Review/QA · then Tabs 2/3 (own specs) |
| 5 | **Training Emulator** | ⚪ Planned | — | — | Built on the emulator |

Legend: 🟢 done/live · 🟡 in progress · ⚪ not started.

### Charger Emulator — OCPP Simulator integration (detail)

Branch `feat/ocpp-simulator`. First tool-to-tool integration: the standalone OCPP
Simulator (Tab 1 of the reference HTML) rebuilt as TS+Vite modules under
`src/simulator/`, consuming the Validation Engine and Parser directly. Spec
`docs/superpowers/specs/2026-07-03-ocpp-simulator-integration-design.md` ·
plan `docs/superpowers/plans/2026-07-03-ocpp-simulator-integration.md` ·
requirements `specs/ocpp-simulator/requirements.md` (R1–R9).

**Unified single tool (2026-07-04 decision, supersedes "separate page").** The
simulator is **one view inside the Parser app**, not a separate `simulator.html`.
A **two-tier navigation shell** (grouped by function) hosts all suite views and
reserves homes for the future ones:

| Tier 1 | Tier 2 view | Status |
|---|---|---|
| **Parser** | Client Log Parser · CMS Log Parser | ✅ built · ⏳ future (ref Tab 3) |
| **Emulator** | OCPP Simulator · Transaction Flow Simulator | ✅ built · ⏳ future (ref Tab 2) |
| **CMS** | CSMS dashboard | ⏳ future (Tool #2; slot reserved) |

Future views are disabled "coming soon" placeholders until built. Per-view state
persists across switches (CP-Mode WebSocket survives). Design §4.1.

- [x] **Phase 0 — Scaffold** (MPA Vite entry; reference HTML archived; `CZ CMS Logs Sample.xlsx` → `data/samples/`).
- [x] **Phase 1 — Schema-driven catalog** — all **28 OCPP 1.6J operations** built from `typed-ocpp`'s `OCPP16.schemas` (R8), categorized by **Feature Profile + Direction** (R6/R7); schema-driven parameter forms.
- [x] **Phase 2 — Simulator Only** — offline run validated by the Validation Engine (`validateMessage`); schema-derived faked response (R2/R5).
- [x] **Phase 3 — CP Mode** — injectable WebSocket client; connect/send/listen/heartbeat with `ExchangeTracker` correlation (R1/R3).
- [x] **Phase 4 — Parser handoff** — session → Parser log lines → `analyzeLogLines` + `renderResults`; round-trip verified (Start→Stop ⇒ 1 transaction, id 555) (R4).
- [x] **Phase 5 — Training polish** — defaults/descriptions overlay, per-profile lesson blurbs.
- [ ] **Phase 6 — Unify into nav shell (2026-07-04)** — remove `simulator.html`; add the two-tier nav shell in `src/app/nav/`; mount Parser + OCPP Simulator as views; declare future views as disabled placeholders; revert Vite to single-entry.
- **State:** 358 tests green (81 files; +33 simulator), `tsc` + `vite build` clean. Not merged. Tabs 2 (Flow replay) & 3 (CMS parser) out of scope — own specs later.

## Validation Engine — detail

- **Spike** (typed-ocpp browser bundling) — ✅ 13 Jun. Isomorphic path confirmed (829 kb, no Node built-ins).
- **Phase 1** (L1 frame · L2 schema · L3 correlation) — ✅ **built, reviewed, QA'd.**
  - `/review` + `/cso`: 1 bug found & fixed (R1 — MessageId reuse) + 2 regression tests; no security fixes needed.
  - `/qa`: 788 real frames across 2 sample logs → 0 crashes, 0 false violations, all matched.
  - 25 tests green; ESM+CJS+browser build green. Package: `@ador/ocpp-validation`.
- **Phase 2** (L4 protocol/state rule catalog) — ⏳ deferred; extension point (`registerProtocolRules`) stubbed.
- **Parser integration** — ⏳ scheduled after the Parser revamp = **Parser Phase 6** (see Parser revamp phase tracker below for the full integration scope).
- Spec: `docs/TYPEVALIDATION.md` · Plan: `docs/superpowers/plans/2026-06-13-validation-engine-phase1.md`.

## Parser revamp — phase tracker

Goal: rebuild the 9,813-line single-file parser as modular TS+Vite — exact feature/UI
parity with v2026.05.14, optimized, bugs fixed. Spec: `specs/requirements.md` (SSOT).

- [x] **Phase 0 — Scaffold** (Vite+TS, ported data model §19.3, old parser archived to `archive/parser-v2026.05.14/`).
- [x] **Phase 1 — Core pipeline** (parse → correlate → group → processTransactions) — `src/app/parse/`, 25 tests incl. real-sample parity (2 tx).
- [x] **Phase 2 — Detection / health / protocol / ws** modules (complete).
  - [x] 2a Detection — `src/app/detect/` (downtime engine + 4 fault types + WS event harvest + missing-sync + incomplete-tx).
  - [x] 2b WebSocket health (§14) — `src/app/ws/` (`analyzeWebSocketHealth`).
  - [x] 2c Protocol compliance (§11) — `src/app/protocol/` (`runProtocolValidation` 21 checks + per-tx lifecycle + phantom).
  - [x] 2d Health aggregation (§10) — `src/app/health/` (`aggregateConnectorStats` FR-131 + `analyzeEnergyDispense` FR-127/128/129). 52 tests total; render deferred to Phase 3.
- [x] **Phase 3 — Render/UI** (19 sections, charts, export, theme) — **COMPLETE** (modulo ⏸️ parked 3b-3b); spec `docs/superpowers/specs/2026-06-15-parser-phase3-render-design.md`. 135 tests.
  - [x] 3a Shell + theme + orchestrator + DOM helper — `src/app/render/` + `analyze.ts`; 19 §19.4 sections render as placeholders; upload→parse→render round-trip works. 66 tests.
  - [x] 3b Static section renderers — **all 19 §19.4 sections rendered** (3b-1 generic tables · 3b-2 Debug/Boot · 3b-3a Status · 3b-4 tx-centric · 3b-5 analysis: Energy Dispense, Incomplete, Fault Status, Downtime, Power-Restore Sync, Emergency-Stop Release, Protocol, WS Health). 122 tests. Remaining 3b parity: [x] context-viewer (Preview/Download, 129 tests) · ⏸️ 3b-3b RemoteStart diagnostic **PARKED** (`docs/superpowers/specs/2026-06-19-PARKED-remotestart-diagnostic.md`).
  - [x] 3c Charts (Chart.js): per-tx View Chart + Meter Values 6 graphs (faithful: hover/dash/dual-axis) + Enlarge/PNG-download + ZUC (chart.js lazy/code-split).
  - [x] 3d Excel export (SheetJS): per-section "Export to Excel" header buttons on 17 table sections (xlsx lazy/code-split). 135 tests.
- [~] **Phase 4 — Repository / timeline / api-download.**
  - [x] 4a Log Repository **core** (local, headless) — `src/app/repository/`: gzip compress (FR-174), IndexedDB CRUD + 6 indexes (FR-178), save/load/delete/list + `_v2` versioning (FR-183), storage estimate/persist (FR-175/176/177), failure-isolated auto-save wired into `main.ts` (FR-179). +25 tests (160). Plan `docs/superpowers/plans/2026-06-20-parser-phase4a-repository-core.md`.
  - [x] 4b Repository **panel UI** (local) — `src/app/render/repository/`: collapsible panel above upload (FR-184), header stats + disabled Drive badge (FR-185), search/filter bar (FR-186/195), 9-col stored-logs table (FR-187), Load&Analyze via existing pipeline (FR-189), delete + bulk select/delete/clear-all (FR-191/353/355), tag editor modal 7 presets+custom (FR-193/194/356), auto-save UX: site-name banner + toast + duplicate prompt (FR-180/182/357). +26 tests (186). Drive sync (4c) stays parked. Plan `docs/superpowers/plans/2026-06-20-parser-phase4b-repository-panel.md`.
  - [ ] 4c Google **Drive sync** — ⏸️ **PARKED** → Phase 5 hosted deploy (needs https + OAuth). FR-197–206.
  - [x] 4d **Session Timeline** per-tx 4-tab modal — `src/app/render/timeline/`: pure `getTimelineDataForTx` + dark modal (`createSessionTimelineModal`) + "📊 Timeline" button on tx rows. Tabs: **Session** (HTML/CSS segmented bar + 10 markers + stage chips + metadata/anomaly badges), **Energy** (Chart.js SoC+Energy dual-axis, context points), **Status** (HTML/CSS connector swimlanes + marker lines + legend), **Telemetry** (Chart.js power + temp w/ breach points). +37 tests (223). Faithful port of legacy 7386–7931. **Drift recorded: legacy has 10 markers (NO Phantom); spec FR-215 says 11 — source-canonical, ported the 10.** Modal is dark-only by parity. Plan `docs/superpowers/plans/2026-06-21-parser-phase4d-session-timeline.md`.
  - [ ] 4e **API download** (EVSE folder-save + progress) — ⏸️ **PARKED 2026-06-21** (user decision). §18.4, A.1.
- [ ] **Phase 5 — Parity gate + deploy swap** (point GitHub Pages at the new build; wire 4c Drive sync once hosted).
- [x] **Phase 6 — Validation Engine integration** (L1–L3 build done 2026-06-22; **`/review`+`/qa` pending**). New **Type-Aware Validation (L1–L3)** section (#20) — on-demand button lazy-loads the in-repo engine (`src/services/validation`, co-located via merge `8c5cc9f`; consumed by **direct monorepo import**, not the npm-package framing) and renders the `ValidationReport` over the parser's already-parsed frames. Engine code-splits (typed-ocpp ~509 kB lazy chunk; main bundle 200 kB). 56 local `.json` = reference/CI diff-check (`requirements.md §19.7`, guarded by `schema-drift.test.ts`). Topology note: integrated by merging the engine **into the parser branch** (not engine→`main`) since deploy is deferred; parity gaps (Help/3b-3b/4c/4e) parked, not blocking. **L4** = engine Phase 2 (stub), seeded *from* the Parser's Protocol Compliance Report + L-001/2/3 (`TYPEVALIDATION.md §9`). Arch `docs/superpowers/specs/2026-06-22-parser-phase6-validation-integration-arch.md`. The section renders the **full `docs/Type Validation Metrics.md` KPI set** (§1 overall health · §2 L1 by frame-type · §3 L2 incl. missing/type/enum + top action · §4 L3 match rate · §5 orphan rate · §6 latency Avg/Min/Max/P95/P99 + timeout rate + status · §7 action-wise Calls/Success/Errors/RTT · §9 weighted compliance score) via a pure `validationMetrics.ts` (no engine change). Per-row **Reason** + **Preview/Download** log-context (offending line highlighted **yellow** in the preview; `RESULT_MISMATCH` reason e.g. `/idTagInfo/expiryDate must be string` for charger `expiryDate:null`). **273 tests.**
- [x] **🐞 Large/multi-file upload crash — FIXED** (2026-06-23, `6b22e00`) — uploading a big log (e.g. `MH0135`, 315k lines / 130,845 WS pings) or a multi-file selection containing one showed **no results**. Root cause: unbounded-array spread into variadic calls (`push(...lines)`, `Math.max(...validLatencies)` in `wsHealth`, …) overflows V8's arg cap; `main.ts`'s catch-less `try/finally` hid the throw. Fixed with loop-based `concatChunks`/`appendAll`/`maxOf`/`minOf` (`src/app/parse/concatChunks.ts`) applied across the whole large-log path + a `catch` that surfaces errors. +3 tests (325). **Still open:** cross-file message-ID collisions corrupt correlation (separate bug, drops a tx; not yet fixed).
- [x] **§4 CP-Initiated Operations Compliance** (2026-06-23) — first **dedicated spec-cited compliance sub-report** strengthening Protocol Compliance. New **pluggable rule-pack framework** (`src/app/compliance/`) + the full OCPP 1.6J **§4** pack: **all 46 business-case rules** (`docs/business_case_compliance_check.md`) tier-tagged 🟢 deterministic / 🟡 heuristic / 🔴 indeterminate, with severity-weighted compliance score (Critical 4 / Major 2 / Minor 1; indeterminate excluded). Rendered as a **sibling top-level section** after Protocol Compliance (new `SECTION_ORDER` entry — **no edit to `protocolCompliance.ts`**), Excel export + Preview/Download context (yellow highlight) reused. Parallel to the existing 21 heuristic checks (not replacing). **+49 tests (322 total)**, `tsc`+build clean; real-sample smoke clean. Spec `docs/superpowers/specs/2026-06-23-cp-initiated-compliance-design.md` · plan `docs/superpowers/plans/2026-06-23-cp-initiated-compliance.md`. **Next packs (future):** §5 CS-Initiated, §3, etc. reuse the framework.

## Planned features (Parser — from `requirements.md`)

- Advanced message types (Authorize, Reservation, Firmware, Smart Charging) — build-spec = `src/schemas/ocpp-1.6/`.
- Repeated RemoteStart panel (Section E).
- Session Timeline enhancements (Section F).
- FER-001…005 (ML anomaly detection, OCPP 2.0.1, flexible charting, multi-sheet export).

## L4 rule catalog ("laundry list") — future

Consolidate the Parser's Protocol Compliance checks + diagnostics L-001/L-002/L-003 +
OCPP 1.6J spec rules into the Validation Engine's L4 extension point. Sources collected
in `scratchpad/drafts/Revamp Proposal.txt`.
