# MD File Registry — OCPP Tool Suite

> **Last reviewed:** 2026-06-08
> One row per MD file. Add a row in the same commit as any new MD file. Remove a row when a file is deleted.

---

## Role definitions

| Role | What it does |
|---|---|
| `RULES` | Enforces constraints on how work happens |
| `BLUEPRINT` | Defines what to build and how |
| `RULEBOOK` | External protocol reference — consult, never edit |
| `TRACKER` | Records live state, history, decisions |
| `GUIDE` | Explains or describes to a human reader |

## Status definitions

| Status | Meaning |
|---|---|
| `ACTIVE` | In regular use — updated this month or expected soon |
| `REFERENCE-ONLY` | Read often, almost never written |
| `DORMANT` | Exists but not relevant to active work right now |
| `DRAFT` | Work in progress, not yet authoritative |

---

## Root `/`

| File | Role | Status | Purpose | Updates when |
|---|---|---|---|---|
| [CLAUDE.md](../CLAUDE.md) | `RULES` | `ACTIVE` | AI session entry point — primary instructions and hard constraints | `operating-principles.md` or `project-standard.md` change; tool status changes; new hard constraint decided |
| [README.md](../README.md) | `GUIDE` | `ACTIVE` | Human entry point — project overview and live deployment link | Major milestones ship; deployed tool URL changes |
| [CHANGELOG.md](../CHANGELOG.md) | `TRACKER` | `ACTIVE` | Run-by-run record of every code change to the Parser HTML | `/document-release` runs; any Parser HTML is committed |
| [project-standard.md](../project-standard.md) | `RULES` | `ACTIVE` | Universal repo structure rules and folder tree for all Claude projects | Repo structure changes; new file types; new governance rules |
| [operating-principles.md](../operating-principles.md) | `RULES` | `ACTIVE` | 13 operating principles governing how Claude works in this repo | New constraint decided; workflow rule added |

> Canonical location confirmed: root. `CLAUDE.md` reference corrected (2026-06-08).

---

## specs/

| File | Role | Status | Purpose | Updates when |
|---|---|---|---|---|
| [specs/requirements.md](../specs/requirements.md) | `BLUEPRINT` | `ACTIVE` | Parser SSOT — 19-section architecture, all FRs, implementation status | Any Parser feature added, changed, or removed; `/document-release` runs |
| [specs/vision.md](../specs/vision.md) | `BLUEPRINT` | `ACTIVE` | Why the OCPP tool suite exists; long-term direction across all 5 tools | Suite scope or direction changes |
| [specs/roadmap.md](../specs/roadmap.md) | `BLUEPRINT` | `DRAFT` | Planned future work across all 5 suite tools in priority order | Roadmap decisions or priorities change |
| [specs/tasks.md](../specs/tasks.md) | `TRACKER` | `ACTIVE` | Current work items — Next / In Progress / Done | `/learn` at session end; work items added or completed manually |

---

## docs/

| File | Role | Status | Purpose | Updates when |
|---|---|---|---|---|
| [docs/md-registry.md](md-registry.md) | `TRACKER` | `ACTIVE` | This file — inventory of every MD file in the repo | Any MD file added or deleted; file Role or Status changes |
| [docs/skill-chain.md](skill-chain.md) | `BLUEPRINT` | `ACTIVE` | Skill chain design — 7 phases, 30 skills, OCPP adaptations per skill | New skill added; OCPP adaptation updated; phase structure changes |
| [docs/TYPEVALIDATION.md](TYPEVALIDATION.md) | `BLUEPRINT` | `DRAFT` | Validation Engine spec — typed-ocpp integration, L1–L3 validation design | Validation Engine implementation begins or spec evolves |
| [docs/overview.md](overview.md) | `GUIDE` | `ACTIVE` | High-level business overview of the OCPP tool suite | Suite scope changes; new tool added |
| [docs/architecture.md](architecture.md) | `GUIDE` | `ACTIVE` | System architecture and component relationships across the suite | Architecture decisions; new tool or integration added |
| [docs/workflow.md](workflow.md) | `GUIDE` | `ACTIVE` | Git workflow and deploy process — Branch→PR→Merge rules | Workflow rules change; new deploy steps added |
| [docs/user-guide.md](user-guide.md) | `GUIDE` | `ACTIVE` | End-user instructions for using the Parser | Parser UI or workflow changes that affect the user |

---

## docs/superpowers/plans/

| File | Role | Status | Purpose | Updates when |
|---|---|---|---|---|
| [docs/superpowers/plans/2026-06-06-skill-chain-implementation.md](superpowers/plans/2026-06-06-skill-chain-implementation.md) | `BLUEPRINT` | `ACTIVE` | Step-by-step plan to create all 30 SKILL.md files and supporting scaffolding | Skill chain implementation is executed (tasks checked off) |
| [docs/superpowers/plans/2026-06-08-md-registry-implementation.md](superpowers/plans/2026-06-08-md-registry-implementation.md) | `BLUEPRINT` | `ACTIVE` | Step-by-step plan to create docs/md-registry.md | This implementation is executed (becomes DORMANT after) |

---

## docs/superpowers/specs/

| File | Role | Status | Purpose | Updates when |
|---|---|---|---|---|
| [docs/superpowers/specs/2026-06-07-ocpp-md-ssot-requirements.md](superpowers/specs/2026-06-07-ocpp-md-ssot-requirements.md) | `BLUEPRINT` | `DRAFT` | Pre-brainstorm requirements for OCPP MD-as-SSOT compiler architecture | Full compiler brainstorm session runs |
| [docs/superpowers/specs/2026-06-08-md-registry-design.md](superpowers/specs/2026-06-08-md-registry-design.md) | `BLUEPRINT` | `ACTIVE` | Approved design spec for this registry — columns, roles, status, maintenance rules | Implementation complete (status changes to DORMANT) |

---

## knowledge/

| File | Role | Status | Purpose | Updates when |
|---|---|---|---|---|
| [knowledge/project-journal.md](../knowledge/project-journal.md) | `TRACKER` | `ACTIVE` | Session-by-session record of discussions, decisions, and next steps | `/learn` at session end; "update the journal" command |

---

## knowledge/standards/ocpp-1.6/

> All 14 files are `RULEBOOK` / `REFERENCE-ONLY`. They are the canonical OCPP 1.6J spec converted to modular MD. Edit only to correct a transcription error — never to add project-specific interpretation.

| File | Role | Status | Purpose | Updates when |
|---|---|---|---|---|
| [knowledge/standards/ocpp-1.6/00-Table-of-Contents.md](../knowledge/standards/ocpp-1.6/00-Table-of-Contents.md) | `RULEBOOK` | `REFERENCE-ONLY` | Navigation index — links to all 14 spec files with section summaries | New spec file added to the folder |
| [knowledge/standards/ocpp-1.6/02-Terminology-and-Conventions.md](../knowledge/standards/ocpp-1.6/02-Terminology-and-Conventions.md) | `RULEBOOK` | `REFERENCE-ONLY` | 13 canonical terms, 21 abbreviations, RFC2119 conventions | Transcription error corrected |
| [knowledge/standards/ocpp-1.6/03-Introduction.md](../knowledge/standards/ocpp-1.6/03-Introduction.md) | `RULEBOOK` | `REFERENCE-ONLY` | 6 Feature Profiles, sequence diagrams, transaction lifecycle, Smart Charging (§3.13) | Transcription error corrected |
| [knowledge/standards/ocpp-1.6/04-Operations-Initiated-by-Charge-Point.md](../knowledge/standards/ocpp-1.6/04-Operations-Initiated-by-Charge-Point.md) | `RULEBOOK` | `REFERENCE-ONLY` | 10 CP operations; §4.9 9×9 status transition matrix with event descriptions | Transcription error corrected |
| [knowledge/standards/ocpp-1.6/05-Operations-Initiated-by-Central-System.md](../knowledge/standards/ocpp-1.6/05-Operations-Initiated-by-Central-System.md) | `RULEBOOK` | `REFERENCE-ONLY` | 19 CS-initiated operations including ChangeConfiguration, SetChargingProfile | Transcription error corrected |
| [knowledge/standards/ocpp-1.6/06-Messages.md](../knowledge/standards/ocpp-1.6/06-Messages.md) | `RULEBOOK` | `REFERENCE-ONLY` | 56 PDU field tables with embedded JSON schemas | Transcription error corrected |
| [knowledge/standards/ocpp-1.6/07-Types.md](../knowledge/standards/ocpp-1.6/07-Types.md) | `RULEBOOK` | `REFERENCE-ONLY` | 49 types — 38 enumerations + 11 classes; ChargePointStatus, Measurand, Reason, all values | Transcription error corrected |
| [knowledge/standards/ocpp-1.6/08-Firmware-and-Diagnostics-File-Transfer.md](../knowledge/standards/ocpp-1.6/08-Firmware-and-Diagnostics-File-Transfer.md) | `RULEBOOK` | `REFERENCE-ONLY` | Firmware update and diagnostics file transfer protocol | Transcription error corrected |
| [knowledge/standards/ocpp-1.6/09-Configuration-Keys.md](../knowledge/standards/ocpp-1.6/09-Configuration-Keys.md) | `RULEBOOK` | `REFERENCE-ONLY` | 38 standard config keys across 4 Feature Profiles | Transcription error corrected |
| [knowledge/standards/ocpp-1.6/J03-Connection.md](../knowledge/standards/ocpp-1.6/J03-Connection.md) | `RULEBOOK` | `REFERENCE-ONLY` | WebSocket URL format, subprotocol ocpp1.6, connection establishment rules | Transcription error corrected |
| [knowledge/standards/ocpp-1.6/J04-RPC-Framework.md](../knowledge/standards/ocpp-1.6/J04-RPC-Framework.md) | `RULEBOOK` | `REFERENCE-ONLY` | CALL/CALLRESULT/CALLERROR envelopes; 10 error codes (Table 7); UniqueId rules | Transcription error corrected |
| [knowledge/standards/ocpp-1.6/J05-Connection.md](../knowledge/standards/ocpp-1.6/J05-Connection.md) | `RULEBOOK` | `REFERENCE-ONLY` | No custom compression; ping/heartbeat rules; reconnect behavior | Transcription error corrected |
| [knowledge/standards/ocpp-1.6/J06-Security.md](../knowledge/standards/ocpp-1.6/J06-Security.md) | `RULEBOOK` | `REFERENCE-ONLY` | TLS; HTTP Basic Auth; AuthorizationKey lifecycle and storage rules | Transcription error corrected |
| [knowledge/standards/ocpp-1.6/J07-Configuration.md](../knowledge/standards/ocpp-1.6/J07-Configuration.md) | `RULEBOOK` | `REFERENCE-ONLY` | WebSocketPingInterval config key for the transport layer | Transcription error corrected |

---

## skills/

> This section is empty until the skill chain implementation runs (Tasks 0–10 of `docs/superpowers/plans/2026-06-06-skill-chain-implementation.md`). Once complete, add rows for: `skills/WORKFLOW.md`, `skills/CHAIN.md`, and all 30 `skills/[name]/SKILL.md` files.

| File | Role | Status | Purpose | Updates when |
|---|---|---|---|---|
| *(populated during skill chain implementation)* | — | — | — | — |
