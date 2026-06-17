# OCPP Suite — Roadmap & Live Progress Dashboard

> **The single at-a-glance view of where the whole suite stands.** Update this at
> every phase boundary (it is the "how far have we come / how far to go" board).
> Per-branch phase detail lives in `skills/WORKFLOW.md`; per-tool detail in each
> tool's spec. The suite is one mega-repo; tools ship independently.
>
> **Last updated:** 2026-06-15

## Suite status board

| # | Tool | Status | Phase | Branch | Next milestone |
|---|---|---|---|---|---|
| 1 | **Validation Engine** (L1–L3) | 🟢 Phase 1 built · PR open | Ship | `feat/validation-engine` (pushed; PR pending merge) | Merge PR → `main`; then L4 (Phase 2) |
| 2 | **Parser — revamp** (TS+Vite) | 🟡 In build (Phase 3b-1 of 6 done) | Build | `feat/parser-revamp` | Phase 3b-2 — custom renderers (Debug Info, Boot, Status) |
| — | Parser — *legacy v2026.05.14* | 🟢 Live | — | `main` / GitHub Pages | Stays live until revamp reaches parity (Phase 5) |
| 3 | **CMS (CSMS)** | ⚪ Planned | — | — | Starts after Parser revamp |
| 4 | **Charger Emulator** | ⚪ Planned (adopt/fork SAP sim) | — | — | Evaluate SAP `e-mobility-charging-stations-simulator` |
| 5 | **Training Emulator** | ⚪ Planned | — | — | Built on the emulator |

Legend: 🟢 done/live · 🟡 in progress · ⚪ not started.

## Validation Engine — detail

- **Spike** (typed-ocpp browser bundling) — ✅ 13 Jun. Isomorphic path confirmed (829 kb, no Node built-ins).
- **Phase 1** (L1 frame · L2 schema · L3 correlation) — ✅ **built, reviewed, QA'd.**
  - `/review` + `/cso`: 1 bug found & fixed (R1 — MessageId reuse) + 2 regression tests; no security fixes needed.
  - `/qa`: 788 real frames across 2 sample logs → 0 crashes, 0 false violations, all matched.
  - 25 tests green; ESM+CJS+browser build green. Package: `@ador/ocpp-validation`.
- **Phase 2** (L4 protocol/state rule catalog) — ⏳ deferred; extension point (`registerProtocolRules`) stubbed.
- **Parser integration** — ⏳ scheduled after the Parser revamp.
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
- [~] **Phase 3 — Render/UI** (19 sections, charts, export, theme) — sub-phased; spec `docs/superpowers/specs/2026-06-15-parser-phase3-render-design.md`.
  - [x] 3a Shell + theme + orchestrator + DOM helper — `src/app/render/` + `analyze.ts`; 19 §19.4 sections render as placeholders; upload→parse→render round-trip works. 66 tests.
  - [~] 3b Static section renderers (batched): [x] 3b-1 generic `dataTable` + Heartbeats/Start/Stop (79 tests) · [ ] 3b-2 Debug/Boot/Status · [ ] 3b-3 tx-centric · [ ] 3b-4 analysis sections.
  - [ ] 3c Charts (Chart.js) · [ ] 3d Excel export (SheetJS).
- [ ] **Phase 4 — Repository / timeline / api-download.**
- [ ] **Phase 5 — Parity gate + deploy swap** (point GitHub Pages at the new build).

## Planned features (Parser — from `requirements.md`)

- Advanced message types (Authorize, Reservation, Firmware, Smart Charging) — build-spec = `src/schemas/ocpp-1.6/`.
- Repeated RemoteStart panel (Section E).
- Session Timeline enhancements (Section F).
- FER-001…005 (ML anomaly detection, OCPP 2.0.1, flexible charting, multi-sheet export).

## L4 rule catalog ("laundry list") — future

Consolidate the Parser's Protocol Compliance checks + diagnostics L-001/L-002/L-003 +
OCPP 1.6J spec rules into the Validation Engine's L4 extension point. Sources collected
in `scratchpad/drafts/Revamp Proposal.txt`.
