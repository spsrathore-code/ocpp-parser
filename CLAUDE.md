# CLAUDE.md — AI Entry Point

> Read this first every session.
> **How to work** → `operating-principles.md`. **How the repo is organised** → `project-standard.md`. **Single source of truth for the Parser** → `specs/requirements.md`.

## What this repo is

A **mega-repo for an OCPP tool suite** (Ador Digatron · DC fast chargers · OCPP 1.6J). Five tools share one OCPP core:

| # | Tool | Status | Where |
|---|---|---|---|
| 1 | **OCPP Validation Engine** — type-aware validation (L1–L3) on `typed-ocpp` | 📋 Specced, not built | `docs/TYPEVALIDATION.md` |
| 2 | **CMS (CSMS)** — own central system | ⏳ Planned | — |
| 3 | **Charger Emulator** — candidate: adopt/fork SAP `e-mobility-charging-stations-simulator` | ⏳ Planned | — |
| 4 | **Training Emulator** | ⏳ Planned | — |
| 5 | **Parser** — log analysis (the only tool with code today) | ✅ Live | `src/app/OCPP_Parser_Complete_ 21 Jan'26.html` |

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

## Where things live

`specs/` plan · `src/` build (`app/` parser · `schemas/` OCPP schemas · future `services/` = validation engine) · `tests/` · `docs/` (incl. validation spec) · `knowledge/` (standards, principles, diagnostics L-001/2/3) · `data/samples/` logs · `assets/` images · `archive/` · `scratchpad/`.

## Status (6 Jun 2026)

Repo standardised to `knowledge/project-standard.md`. Nothing in the suite is implemented yet **except the live Parser**. Next when building: the Validation Engine — start with the `typed-ocpp` browser-bundling spike (`docs/TYPEVALIDATION.md` §7).

> ⚠️ A leftover empty folder `OCPP Client Parser MD Collection/` could not be auto-deleted (it is the shell's locked working directory). It is git-ignored; delete it manually when convenient.
