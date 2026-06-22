# CLAUDE.md — AI Entry Point

> Read this first every session.
> **How to work** → `operating-principles.md`. **How the repo is organised** → `project-standard.md`. **Single source of truth for the Parser** → `specs/requirements.md`.

## What this repo is

A **mega-repo for an OCPP tool suite** (Ador Digatron · DC fast chargers · OCPP 1.6J). Five tools share one OCPP core:

| #   | Tool                                                                                      | Status                     | Where                                           |
| --- | ----------------------------------------------------------------------------------------- | -------------------------- | ----------------------------------------------- |
| 1   | **OCPP Validation Engine** — type-aware validation (L1–L3) on `typed-ocpp`                | 🟢 Built · merged into parser branch (Phase 6) | `src/services/validation/` · `docs/TYPEVALIDATION.md` |
| 2   | **CMS (CSMS)** — own central system                                                       | ⏳ Planned                  | —                                               |
| 3   | **Charger Emulator** — candidate: adopt/fork SAP `e-mobility-charging-stations-simulator` | ⏳ Planned                  | —                                               |
| 4   | **Training Emulator**                                                                     | ⏳ Planned                  | —                                               |
| 5   | **Parser** — log analysis · live; TS+Vite revamp (Phases 0–6 done; not deployed)          | ✅ Live · 🟡 revamp on branch | `src/app/` (TS, `feat/parser-revamp`) · legacy HTML on `main` |

## Canonical artifacts (don't confuse copies for sources)

- **Parser source (canonical):** `src/app/OCPP_Parser_Complete_ 21 Jan'26.html` (9,813 lines, v2026.05.14). **Edit this, never `index.html`.**
- **`index.html`** (root) = deploy copy → GitHub Pages (`https://spsrathore-code.github.io/ocpp-parser/`).
- **SSOT** (Parser requirements + status + architecture): `specs/requirements.md`.
- **Schemas (reference):** `src/schemas/ocpp-1.6/` — 56 canonical OCPP 1.6J `.json`. Runtime validation will use `typed-ocpp`'s bundled schemas (see `docs/TYPEVALIDATION.md` §6).
- **Changelog:** `CHANGELOG.md` (run-by-run).

## Hard constraints (from operating principles)

- **No source file > 2000 lines.** The Parser HTML is 9,813 → the revamp must decompose it into `src/` modules.
- **Standards first:** OCPP 1.6J / ISO 15118 compliance, interoperability, log traceability.
- **Do NOT edit the Parser HTML until the user says they are "ready."**
- Destructive or outward-facing actions: confirm first.
- **Git workflow — Branch → PR → Merge always.** Never commit directly to `main`. Create a descriptive branch first (`feat/`, `fix/`, `docs/`, `chore/` prefix), commit there, push, open a GitHub PR, then merge. `main` must always be deployable.

## Deploy (Parser)

After editing `src/app/OCPP_Parser_Complete_ 21 Jan'26.html`: copy it to root `index.html`, commit, push — GitHub Pages auto-deploys. Full steps in `specs/requirements.md` → *Deploy Workflow*.

## Skill Chain (Think → Plan → Build → Review → Test → Ship → Reflect)

All significant work uses the skill chain. See `docs/skill-chain.md` for the full
design. See `skills/WORKFLOW.md` for current feature state.

- Invoke skills via slash commands: `/office-hours`, `/spec`, `/plan-eng-review`,
  `/review`, `/cso`, `/qa`, `/ship`, `/learn`, etc.
- Each skill reads `skills/WORKFLOW.md`, prints a phase banner, checks prerequisites,
  does its work, updates WORKFLOW.md, and prints the next command.
- Build phase: run `/build-complete` when implementation is done. Forgot? `/review`
  will prompt you.
- Safety tools available any time: `/careful`, `/freeze`, `/guard`, `/unfreeze`.
- Never skip phases without recording the skip in `skills/WORKFLOW.md`.
- Session journal: say "update the journal" → appends to `knowledge/project-journal.md`.
- **Keep tracking current as you go — do NOT defer it to Ship/Reflect.** Update `specs/roadmap.md` (the live suite dashboard — the single "how far / how long" view of all 5 tools) at **every phase / sub-phase boundary**; refresh `specs/tasks.md` as items move; append to `knowledge/project-journal.md` each session. Long multi-phase builds must not run with stale trackers.

## Where things live

`specs/` plan · `src/` build (`app/` parser · `schemas/` OCPP schemas · future `services/` = validation engine) · `tests/` · `docs/` (incl. validation spec) · `knowledge/` (standards, principles, diagnostics L-001/2/3) · `data/samples/` logs · `assets/` images · `archive/` · `scratchpad/`.

## Status (22 Jun 2026)

> **Live suite dashboard: `specs/roadmap.md`** — the at-a-glance board for all 5 tools (status · phase · branch · next). Keep this section short; the dashboard is the source of truth for progress.

- **Parser revamp** — all on `feat/parser-revamp` (**pushed to GitHub; NOT merged to `main`** — `main` still has only the legacy HTML). **273 tests**, `tsc` + `vite build` clean. Done: Phases 0–3 (all 19 §19.4 sections + charts + Excel + context-viewer), **4a/4b** (Log Repository — local IndexedDB + panel), **4d** (Session Timeline modal), restored async/chunked parse, Phase 5 **parity-gate audit**, and **Phase 6 — Validation Engine integration**. **⏸️ Parked:** 3b-3b RemoteStart · 4c Drive sync · 4e API download · the **Help modal** (parity gap found at the gate). **Drift (source-canonical):** 21-vs-24 protocol checks · 10-vs-11 timeline markers.
- **Validation Engine** — Phase 1 (L1–L3) built/QA'd; **merged into `feat/parser-revamp`** (`src/services/validation/`, `8c5cc9f`) and consumed by the Parser via **direct monorepo import** (Phase 6). New **"Type-Aware Validation (L1–L3)"** section (#20): on-demand, lazy/code-split, renders the full `docs/Type Validation Metrics.md` KPI set + per-row Reason + Preview/Download log-context (yellow-highlighted discrepancy line). **L4** = engine Phase 2 (stub). Not on `main`.
- **Next:** `/review` + `/cso` + `/qa` on Phase 6 (skill-chain Review/Test not yet run); then deploy decision (Help modal + parked items). **CMS · Charger Emulator · Training Emulator** — planned.

> ⚠️ A leftover empty folder `OCPP Client Parser MD Collection/` could not be auto-deleted (it is the shell's locked working directory). It is git-ignored; delete it manually when convenient.
