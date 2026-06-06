# Project Journal

Chronological record of significant decisions and sessions. Detailed change history is in `../CHANGELOG.md`; this is the higher-level narrative.

## 2026-06-06 — SSOT consolidation, suite direction, repo standardisation

- **Consolidated** ~18 scattered MD files into a single source of truth (`specs/requirements.md`, formerly `OCPP_Parser_Master.md`), reconciled against the actual tool source (v2.7): documented the downtime engine + 4 fault types, Events/Alerts/Debug sections, the architecture & data model, and the diagnostic knowledge base (L-001 Phantom, L-002 Missing Stop, L-003 Stuck-in-Preparing).
- **Direction set:** this is an **OCPP suite mega-repo** — Validation Engine, CMS, Charger Emulator, Training Emulator, Parser.
- **Validation Engine decided:** adopt **`typed-ocpp`** (MIT) for type-aware L1–L3 validation; spec written (`docs/TYPEVALIDATION.md`). `typed-ocpp` bundled schemas = runtime source; the 56 local `.json` = canonical reference + CI diff-check.
- **Emulator find:** SAP `e-mobility-charging-stations-simulator` recorded as the Charger-Emulator candidate.
- **Repo standardised** to `knowledge/project-standard.md`: full tree built, all artifacts placed, governance files (`CLAUDE.md`, `README.md`, `.gitignore`) authored.
- **Note:** the legacy `OCPP Client Parser MD Collection/` folder was emptied but couldn't be auto-deleted (it is the shell's locked working directory) — git-ignored; delete manually.
