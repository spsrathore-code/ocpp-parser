# Overview

The **OCPP Suite** is a set of tools for working with OCPP 1.6J DC fast chargers (Ador Digatron / QUENCH), built in one mega-repo around a shared OCPP core.

## Who it's for

- **Field & support engineers** — diagnose charger issues from logs (the Parser).
- **Firmware & CMS developers** — validate protocol compliance and test charger↔CMS behaviour (Validation Engine, CMS, Emulators).
- **Trainees** — learn correct OCPP flows (Training Emulator).

## What exists today

The **Parser** is live (`src/app/`, deployed to GitHub Pages). It ingests raw OCPP client logs and produces structured analysis: transactions, meter values, status flows, downtime/fault detection, protocol-compliance checks, and WebSocket health.

The other four tools (Validation Engine, CMS, Charger Emulator, Training Emulator) are planned — see `../specs/roadmap.md`.

## Key documents

- `../specs/requirements.md` — the single source of truth (Parser).
- `./architecture.md` — system design.
- `./TYPEVALIDATION.md` — the Validation Engine design spec.
