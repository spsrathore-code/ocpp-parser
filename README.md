# OCPP Suite

A mega-repo for an **OCPP 1.6J tool suite** for Ador Digatron DC fast chargers (QUENCH).

## Tools

| Tool | Status | Location |
|---|---|---|
| **Parser** (log analysis & diagnostics) | ✅ Live | `src/app/` → deployed at https://spsrathore-code.github.io/ocpp-parser/ |
| **OCPP Validation Engine** (type-aware validation) | 📋 Specced | `docs/TYPEVALIDATION.md` |
| **CMS (CSMS)** | ⏳ Planned | — |
| **Charger Emulator** | ⏳ Planned (SAP simulator candidate) | — |
| **Training Emulator** | ⏳ Planned | — |

The five tools share one OCPP core (types, schemas, validation).

## Repository map

- **`specs/`** — `vision.md`, `requirements.md` (single source of truth), `roadmap.md`, `tasks.md`
- **`src/`** — code: `app/` (parser), `schemas/ocpp-1.6/` (56 OCPP 1.6J schemas); future: `services/`, `models/`, `utils/`
- **`docs/`** — design docs (incl. the Validation Engine spec)
- **`knowledge/`** — project standard, operating principles, diagnostics & lessons
- **`tests/` · `data/` · `assets/` · `scripts/` · `archive/` · `scratchpad/`**

## Start here

- **New to the project?** Read `specs/requirements.md`.
- **Working with AI?** `CLAUDE.md` is the AI entry point.
- **What changed?** `CHANGELOG.md`.

**Protocol:** OCPP 1.6J · **Target hardware:** DC fast chargers (QUENCH).
