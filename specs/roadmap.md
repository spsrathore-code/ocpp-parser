# Roadmap

> Status as of 6 June 2026. The suite is built as one mega-repo; tools may ship independently.

## Now — live

- **Parser** — OCPP 1.6J log analyzer, live at https://spsrathore-code.github.io/ocpp-parser/. Full spec + status in `requirements.md`.

## Next — foundation

- **Repo standardisation** ✅ — tree built to `../knowledge/project-standard.md` (6 Jun 2026).
- **OCPP Validation Engine** 📋 — spec in `../docs/TYPEVALIDATION.md`. First task: `typed-ocpp` browser-bundling spike (§7). Phase 1 = L1–L3; L4 protocol/state deferred.

## Then — build out

- **Parser revamp** — decompose the 9,813-line monolith (`src/app/…html`) into `src/` modules under the 2,000-line cap; add `tests/`; wire in the Validation Engine.
- **CMS (CSMS)** — Ador's own central system (Node).
- **Charger Emulator** — adopt/fork SAP `e-mobility-charging-stations-simulator` (Apache-2.0).
- **Training Emulator** — built on the emulator.

## Planned features (Parser — from `requirements.md`)

- Advanced message types (Authorize, Reservation, Firmware, Smart Charging) — build-spec = `../src/schemas/ocpp-1.6/`.
- Repeated RemoteStart panel (Section E).
- Session Timeline enhancements (Section F).
- FER-001…005 (ML anomaly detection, OCPP 2.0.1, flexible charting, multi-sheet export).

## L4 rule catalog ("laundry list") — future

Consolidate the Parser's Protocol Compliance checks + diagnostics L-001/L-002/L-003 + OCPP 1.6J spec rules into the Validation Engine's L4 extension point.
