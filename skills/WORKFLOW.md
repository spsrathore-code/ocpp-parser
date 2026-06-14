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
- [ ] **Phase 1 — Core pipeline:** parse → correlate → group → processTransactions + fixture tests vs sample logs.
- [ ] **Phase 2 — Detection/health/protocol/ws** modules.
- [ ] **Phase 3 — Render/UI** (19 sections, charts, export, theme).
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
