# Vision

## Why this project exists

Ador Digatron operates and supports DC fast chargers (QUENCH) speaking **OCPP 1.6J**. Diagnosing field issues, validating protocol compliance, and testing charger↔CMS behaviour today rely on scattered tools and manual log reading.

The goal is a single **OCPP tool suite** built on one shared OCPP core, so that protocol knowledge (types, schemas, validation, state rules) is defined **once** and reused everywhere.

## The five tools

1. **OCPP Validation Engine** — type-aware validation (frame + schema + request↔response matching); the shared core every other tool consumes.
2. **CMS (CSMS)** — Ador's own central management system.
3. **Charger Emulator** — simulate charge points against the CMS.
4. **Training Emulator** — teach correct vs. incorrect OCPP flows.
5. **Parser** — analyse real charger logs for faults, downtime, and compliance (already live).

## Principles

- **Standards first** — OCPP 1.6J / ISO 15118 compliance and interoperability over custom behaviour.
- **Shared core** — validation and OCPP types are not re-implemented per tool.
- **Don't reinvent** — adopt proven libraries (`typed-ocpp` for validation; SAP simulator as the emulator candidate) where they fit.

See `requirements.md` for the detailed Parser spec and `../docs/TYPEVALIDATION.md` for the Validation Engine design.
