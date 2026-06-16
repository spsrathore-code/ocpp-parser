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
  - [ ] **3b — Static section renderers** (replace the 19 placeholders with real table/text bodies, incl. Phase-2 deferred renders).
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
