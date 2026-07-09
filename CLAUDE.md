# CLAUDE.md — AI Entry Point

> Read this first every session.
> **How to work** → `operating-principles.md`. **How the repo is organised** → `project-standard.md`. **Single source of truth for the Parser** → `specs/requirements.md`.

## What this repo is

A **mega-repo for an OCPP tool suite** (Ador Digatron · DC fast chargers · OCPP 1.6J). Five tools share one OCPP core:

| #   | Tool                                                                                      | Status                                         | Where                                                         |
| --- | ----------------------------------------------------------------------------------------- | ---------------------------------------------- | ------------------------------------------------------------- |
| 1   | **OCPP Validation Engine** — type-aware validation (L1–L3) on `typed-ocpp`                | 🟢 Built · merged into parser branch (Phase 6) | `src/services/validation/` · `docs/TYPEVALIDATION.md`         |
| 2   | **CMS (CSMS)** — own central system                                                       | ⏳ Planned                                      | —                                                             |
| 3   | **Charger Emulator** — candidate: adopt/fork SAP `e-mobility-charging-stations-simulator` | ⏳ Planned                                      | —                                                             |
| 4   | **Training Emulator**                                                                     | ⏳ Planned                                      | —                                                             |
| 5   | **Parser** — log analysis · live; TS+Vite revamp (Phases 0–6 done; not deployed)          | ✅ Live · 🟡 revamp on branch                   | `src/app/` (TS, `feat/parser-revamp`) · legacy HTML on `main` |

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

**Legacy (live, `main`):** after editing `src/app/OCPP_Parser_Complete_ 21 Jan'26.html`, copy it to root `index.html`, commit, push — GitHub Pages auto-deploys. Full steps in `specs/requirements.md` → *Deploy Workflow*.

## How to run (revamp — `feat/parser-revamp`)

The revamp is a **bundled TS+Vite app**, not a single openable HTML file (you can't double-click it — browsers block ES modules over `file://`). It always needs a tiny local server:
- **Dev:** `npm install` (once), then `npm run dev` → `http://localhost:5173` (hot reload). Entry = root `index.html` → `src/app/main.ts`.
- **Run the prod build locally:** `npm run build` (→ `dist/`), then `npm run preview` → `http://localhost:4173`.
- **No-localhost / shareable:** host `dist/` on GitHub Pages or any static host (= the planned **Phase 5 deploy swap**; will need `vite.config` `base` set for the Pages subpath).
- Other scripts: `npm run typecheck` (`tsc --noEmit`), `npm test` (`vitest run`).
- **Want the old "open one file" UX back?** add `vite-plugin-singlefile` to inline everything into one self-contained `index.html` (not yet wired — ask to do it).

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

## Status (23 Jun 2026)

> **Live suite dashboard: `specs/roadmap.md`** — the at-a-glance board for all 5 tools (status · phase · branch · next). Keep this section short; the dashboard is the source of truth for progress.

- **Parser revamp** — all on `feat/parser-revamp` (**pushed to GitHub; NOT merged to `main`** — `main` still has only the legacy HTML). **325 tests**, `tsc` + `vite build` clean. Done: Phases 0–3 (all 19 §19.4 sections + charts + Excel + context-viewer), **4a/4b** (Log Repository — local IndexedDB + panel), **4d** (Session Timeline modal), restored async/chunked parse, Phase 5 **parity-gate audit**, and **Phase 6 — Validation Engine integration**. **⏸️ Parked:** 3b-3b RemoteStart · 4c Drive sync · 4e API download · the **Help modal** (parity gap found at the gate). **Drift (source-canonical):** 21-vs-24 protocol checks · 10-vs-11 timeline markers.
- **Validation Engine** — Phase 1 (L1–L3) built/QA'd; **merged into `feat/parser-revamp`** (`src/services/validation/`, `8c5cc9f`) and consumed by the Parser via **direct monorepo import** (Phase 6). New **"Type-Aware Validation (L1–L3)"** section (#20): on-demand, lazy/code-split, renders the full `docs/Type Validation Metrics.md` KPI set + per-row Reason + Preview/Download log-context (yellow-highlighted discrepancy line). **L4** = engine Phase 2 (stub). Not on `main`.
- **§4 CP-Initiated Compliance** (23 Jun) — new spec-cited compliance sub-report strengthening Protocol Compliance. Pluggable rule-pack framework (`src/app/compliance/`) + full OCPP 1.6J §4 pack: **46 business-case rules** (`docs/business_case_compliance_check.md`) tier-tagged 🟢 deterministic / 🟡 heuristic / 🔴 indeterminate, severity-weighted score. Rendered as a **sibling top-level section** after Protocol Compliance (new `SECTION_ORDER` entry — no `protocolCompliance.ts` edit), Excel + Preview/Download context reused. Parallel to the existing 21 heuristic checks. Spec/plan dated 2026-06-23. Framework is pack-extensible (§5 CS-Initiated etc. next). **`/review` ✅ + `/qa` ✅ done** (BOOT-002 fail→warn; AUTH-003 → indeterminate — both false-positive fixes). QA notes `scratchpad/qa-cp-compliance/QA-NOTES.md`.
- **🐞 Fixed (23 Jun) — multi-file / large-file upload showed NO results.** Root cause: spreading unbounded arrays into variadic calls (`push(...lines)`, `Math.max/min(...arr)`) overflows V8's arg cap on big logs (the `MH0135` sample = 315k lines / 130,845 WS pings; the confirmed throw was `Math.max(...validLatencies)` in `wsHealth`). `main.ts`'s catch-less `try/finally` hid it → blank. Fixed with spread-safe helpers (`src/app/parse/concatChunks.ts`: `concatChunks`/`appendAll`/`maxOf`/`minOf`), replaced every unbounded spread on the large-log path, + added a `catch` in `main.ts` that surfaces errors. +3 regression tests. **Still OPEN (separate, not yet fixed):** cross-file **message-ID collisions** corrupt correlation (two logs reusing ids 1,2,3… → a transaction can be dropped) — needs its own fix.
- **CMS Log Parser** (2026-07-09, branch `feat/cms-log-parser`) — the reference HTML's CMS parser (Tab 3) rebuilt as an Excel **ingestion adapter**, NOT a second parser: CMS `.xlsx` → `ParsedLines` → the Client parser's existing `analyze()`/`renderResults()` (all 21 sections reused). `src/app/cms/` — IST→UTC timestamps, OCPP §4/§5 direction mapping, row→CALL+CALLRESULT (Alerts **derived** from faulted StatusNotifications), CZ adapter (sheet-scoring/header-detect/CreatedOn), **pluggable multi-customer registry**, lazy-xlsx orchestrator, multi-file merge, nav view enabled (lazy-mounted → xlsx a 429 kB chunk). **Verified on `data/samples/CZ CMS Logs Sample.xlsx`** (3204 msgs, MH0055: 12 txns, 1082 meter values, 12 alerts). Events/Power-Emergency-sync/WS-Health empty-by-nature. **+31 tests (410)**, `tsc`+build clean. Phases A–C done; **Phase D docs + `/review`+`/qa` + PR** pending. Spec `docs/superpowers/specs/2026-07-08-cms-log-parser-design.md`.
- **Next:** finish CMS Log Parser (`/review`+`/qa` + PR); `/review`+`/cso`+`/qa` on **Phase 6** (validation engine — still pending); fix the cross-file id-collision bug; then deploy decision (Help modal + parked items + `vite base` for Pages). **CSMS · Charger Emulator · Training Emulator** — planned.

> ⚠️ A leftover empty folder `OCPP Client Parser MD Collection/` could not be auto-deleted (it is the shell's locked working directory). It is git-ignored; delete it manually when convenient.
