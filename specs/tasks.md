# Tasks — current work items

> Living list of granular work. **Suite-level status is in `specs/roadmap.md`** (the
> dashboard); this file is the finer-grained active task list. Done items also flow
> to `knowledge/project-journal.md` and (for shipped parser changes) `CHANGELOG.md`.
> **Last updated:** 2026-06-14

## Done

- [x] SSOT consolidation (`requirements.md`), repo standardisation, OCPP schema strategy (§19.7), Validation Engine spec (`docs/TYPEVALIDATION.md`).
- [x] Skill chain implemented (28 skills).
- [x] **Validation Engine Phase 1 (L1–L3)** — spike (typed-ocpp browser bundle), build, `/review`+`/cso` (R1 fixed + 2 regression tests), `/qa` (788 real frames, 0 bugs). 25 tests; ESM+CJS+browser. PR pushed.
- [x] Global `~/.claude/` streamlined — `operating-principles.md` + `project-standard.md` as canon, thin `CLAUDE.md`.
- [x] **Parser revamp Phase 0** — Vite+TS scaffold, data model ported (§19.3), old parser archived (`archive/parser-v2026.05.14/`).
- [x] Suite tracking established — `specs/roadmap.md` dashboard, journal caught up, `CLAUDE.md` status refreshed.

## Next

- [ ] **Merge the Validation Engine PR → `main`** (manual via GitHub; `gh` CLI absent): https://github.com/spsrathore-code/ocpp-parser/pull/new/feat/validation-engine
- [ ] **Parser revamp Phase 1** — core pipeline (`parse → correlate → group → processTransactions`) + golden-master fixture tests vs `data/samples/`.

## Later

- [ ] Parser revamp **Phases 2–5** — detection/health/protocol/ws → render/UI (19 sections) → repository/timeline/api-download → parity gate + deploy swap.
- [ ] **Engine ↔ Parser integration** (after the revamp reaches parity).
- [ ] **Validation Engine Phase 2** — L4 rule catalog (Protocol Compliance + diagnostics L-001/2/3 + OCPP 1.6J rules) into the `registerProtocolRules` extension point.
- [ ] **CMS**, **Charger Emulator** (SAP candidate), **Training Emulator**.

## Housekeeping

- [ ] Delete the leftover empty `OCPP Client Parser MD Collection/` (git-ignored; locked CWD blocked auto-delete).
- [ ] Remove the project-copy `operating-principles.md` / `project-standard.md` once the global `~/.claude/` canon is finalised.
