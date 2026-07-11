# OCPP Suite

A mega-repo for an **OCPP 1.6J tool suite** for Ador Digatron DC fast chargers (QUENCH).

## Tools

| Tool | Status | Location |
|---|---|---|
| **Parser** (Client + CMS log analysis & diagnostics) | 🟢 **LIVE** | `src/app/` → deployed at https://spsrathore-code.github.io/ocpp-parser/ |
| **CMS Log Parser** (Excel CMS logs — CZ + Mahindra, customer selector) | 🟢 **LIVE** (a Parser view) | `src/app/cms/` |
| **OCPP Validation Engine** (type-aware validation L1–L3) | 🟢 **LIVE** (integrated, Phase 6) | `src/services/validation/` · `docs/TYPEVALIDATION.md` |
| **Charger Emulator** (OCPP Simulator, Tab 1) | 🟢 **LIVE** (integrated) | `src/simulator/` |
| **CMS (CSMS dashboard)** | ⏳ Planned | nav slot reserved |
| **Training Emulator** | ⏳ Planned | — |

The tools share one OCPP core (types, schemas, validation). Deploy/runbook: `docs/DEPLOY.md`.

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
