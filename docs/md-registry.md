# MD File Registry — OCPP Tool Suite

> **Last reviewed:** 2026-07-11 (full sync after the deploy swap — added 22 missing docs/plan/spec rows; tool statuses refreshed to LIVE)
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
| [CHANGELOG.md](../CHANGELOG.md) | `TRACKER` | `ACTIVE` | Run-by-run record of shipped changes to the Vite OCPP Suite (fresh log since the 2026-07-11 deploy swap; legacy HTML impact-log Runs #1–#27 archived below the divider) | `/document-release` runs; a change ships to `main` |
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
| [specs/ocpp-simulator/requirements.md](../specs/ocpp-simulator/requirements.md) | `BLUEPRINT` | `DRAFT` | OCPP Simulator (Tab 1) current-state user-facing spec — baseline for suite integration (Validation Engine + Parser); documents the Simulator Only vs Charge Point (CP) modes | Integration scope changes; simulator behavior re-baselined; design spec supersedes it |

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
| [docs/DEPLOY.md](DEPLOY.md) | `GUIDE` | `ACTIVE` | Deploy runbook — GitHub Actions build→Pages, `base` path, rollback tag, CDN deferrals | Deploy pipeline or Pages config changes |
| [docs/business_case_compliance_check.md](business_case_compliance_check.md) | `BLUEPRINT` | `ACTIVE` | §4 CP-Initiated compliance rule registry (business cases → rules) | A field case adds/edits a compliance rule |
| [docs/Type Validation Metrics.md](Type%20Validation%20Metrics.md) | `BLUEPRINT` | `ACTIVE` | Validation Engine KPI/metric catalog rendered by the Type-Aware Validation section | Validation metrics/KPIs change |
| [docs/parser-revamp-comparison.md](parser-revamp-comparison.md) | `GUIDE` | `DORMANT` | Legacy-vs-revamp feature-parity comparison (parity gate) | Historical — parity gate closed |
| [docs/engineering-assessment-2026-07-09.md](engineering-assessment-2026-07-09.md) | `GUIDE` | `DORMANT` | Point-in-time read-only engineering assessment (architecture/quality/security/risk) | Frozen; a new assessment = a new dated file |

---

## docs/superpowers/plans/

| File | Role | Status | Purpose | Updates when |
|---|---|---|---|---|
| [docs/superpowers/plans/2026-06-06-skill-chain-implementation.md](superpowers/plans/2026-06-06-skill-chain-implementation.md) | `BLUEPRINT` | `ACTIVE` | Step-by-step plan to create all 30 SKILL.md files and supporting scaffolding | Skill chain implementation is executed (tasks checked off) |
| [docs/superpowers/plans/2026-06-08-md-registry-implementation.md](superpowers/plans/2026-06-08-md-registry-implementation.md) | `BLUEPRINT` | `ACTIVE` | Step-by-step plan to create docs/md-registry.md | This implementation is executed (becomes DORMANT after) |
| [docs/superpowers/plans/2026-07-03-ocpp-simulator-integration.md](superpowers/plans/2026-07-03-ocpp-simulator-integration.md) | `BLUEPRINT` | `DORMANT` | Task-by-task TDD plan for the OCPP Simulator integration (Phases 0–5) | Executed — shipped/live |
| [docs/superpowers/plans/2026-06-13-validation-engine-phase1.md](superpowers/plans/2026-06-13-validation-engine-phase1.md) | `BLUEPRINT` | `DORMANT` | Task plan — Validation Engine L1–L3 build | Executed — shipped |
| [docs/superpowers/plans/2026-06-15-parser-phase3a-shell.md](superpowers/plans/2026-06-15-parser-phase3a-shell.md) | `BLUEPRINT` | `DORMANT` | Task plan — Parser Phase 3a shell/theme/orchestrator | Executed |
| [docs/superpowers/plans/2026-06-16-parser-phase3b1-generic-tables.md](superpowers/plans/2026-06-16-parser-phase3b1-generic-tables.md) | `BLUEPRINT` | `DORMANT` | Task plan — Phase 3b-1 generic table + message-group sections | Executed |
| [docs/superpowers/plans/2026-06-18-parser-phase3b2-debug-boot.md](superpowers/plans/2026-06-18-parser-phase3b2-debug-boot.md) | `BLUEPRINT` | `DORMANT` | Task plan — Phase 3b-2 Debug Info + Boot Notifications | Executed |
| [docs/superpowers/plans/2026-06-20-parser-phase4a-repository-core.md](superpowers/plans/2026-06-20-parser-phase4a-repository-core.md) | `BLUEPRINT` | `DORMANT` | Task plan — Phase 4a Log Repository core (IndexedDB) | Executed |
| [docs/superpowers/plans/2026-06-20-parser-phase4b-repository-panel.md](superpowers/plans/2026-06-20-parser-phase4b-repository-panel.md) | `BLUEPRINT` | `DORMANT` | Task plan — Phase 4b Repository panel UI | Executed |
| [docs/superpowers/plans/2026-06-21-parser-phase4d-session-timeline.md](superpowers/plans/2026-06-21-parser-phase4d-session-timeline.md) | `BLUEPRINT` | `DORMANT` | Task plan — Phase 4d Session Timeline modal | Executed |
| [docs/superpowers/plans/2026-06-23-cp-initiated-compliance.md](superpowers/plans/2026-06-23-cp-initiated-compliance.md) | `BLUEPRINT` | `DORMANT` | Task plan — §4 CP-Initiated compliance rule-pack | Executed |
| [docs/superpowers/plans/2026-07-09-analysis-worker.md](superpowers/plans/2026-07-09-analysis-worker.md) | `BLUEPRINT` | `DORMANT` | Task plan (7 TDD tasks) — analysis Web Worker | Executed — shipped/live |

---

## docs/superpowers/specs/

| File | Role | Status | Purpose | Updates when |
|---|---|---|---|---|
| [docs/superpowers/specs/2026-06-07-ocpp-md-ssot-requirements.md](superpowers/specs/2026-06-07-ocpp-md-ssot-requirements.md) | `BLUEPRINT` | `DRAFT` | Pre-brainstorm requirements for OCPP MD-as-SSOT compiler architecture | Full compiler brainstorm session runs |
| [docs/superpowers/specs/2026-06-08-md-registry-design.md](superpowers/specs/2026-06-08-md-registry-design.md) | `BLUEPRINT` | `ACTIVE` | Approved design spec for this registry — columns, roles, status, maintenance rules | Implementation complete (status changes to DORMANT) |
| [docs/superpowers/specs/2026-07-03-ocpp-simulator-integration-design.md](superpowers/specs/2026-07-03-ocpp-simulator-integration-design.md) | `BLUEPRINT` | `DORMANT` | Design — OCPP Simulator integration (Tab 1) | Shipped/live |
| [docs/superpowers/specs/2026-06-15-parser-phase3-render-design.md](superpowers/specs/2026-06-15-parser-phase3-render-design.md) | `BLUEPRINT` | `DORMANT` | Design — Parser Phase 3 render/UI (19 sections) | Shipped |
| [docs/superpowers/specs/2026-06-19-PARKED-remotestart-diagnostic.md](superpowers/specs/2026-06-19-PARKED-remotestart-diagnostic.md) | `BLUEPRINT` | `DORMANT` | Parked resume-notes — Repeated-RemoteStart diagnostic (3b-3b) | Resumed later |
| [docs/superpowers/specs/2026-06-22-parser-phase6-validation-integration-arch.md](superpowers/specs/2026-06-22-parser-phase6-validation-integration-arch.md) | `BLUEPRINT` | `DORMANT` | Architecture — Phase 6 Validation Engine integration | Shipped/live |
| [docs/superpowers/specs/2026-06-23-cp-initiated-compliance-design.md](superpowers/specs/2026-06-23-cp-initiated-compliance-design.md) | `BLUEPRINT` | `DORMANT` | Design — §4 CP-Initiated compliance framework | Shipped/live |
| [docs/superpowers/specs/2026-07-08-cms-log-parser-design.md](superpowers/specs/2026-07-08-cms-log-parser-design.md) | `BLUEPRINT` | `DORMANT` | Design + add-a-customer guide — CMS Log Parser (Excel ingestion) | Shipped/live |
| [docs/superpowers/specs/2026-07-09-analysis-worker-design.md](superpowers/specs/2026-07-09-analysis-worker-design.md) | `BLUEPRINT` | `DORMANT` | Design — analysis Web Worker (P1 large-file freeze fix) | Shipped/live |
| [docs/superpowers/specs/2026-07-09-cms-multi-customer-design.md](superpowers/specs/2026-07-09-cms-multi-customer-design.md) | `BLUEPRINT` | `DORMANT` | Design — Mahindra adapter + registry-driven customer selector | Shipped/live |
| [docs/superpowers/specs/2026-07-10-heartbeat-summary-design.md](superpowers/specs/2026-07-10-heartbeat-summary-design.md) | `BLUEPRINT` | `DORMANT` | Design — Heartbeat Summary (currentTime intervals) | Shipped/live |

---

## knowledge/

| File | Role | Status | Purpose | Updates when |
|---|---|---|---|---|
| [knowledge/project-journal.md](../knowledge/project-journal.md) | `TRACKER` | `ACTIVE` | Session-by-session record of discussions, decisions, and next steps | `/learn` at session end; "update the journal" command |

---

## knowledge/decisions/

| File | Role | Status | Purpose | Updates when |
|---|---|---|---|---|
| [knowledge/decisions/2026-06-21-validation-engine-consumption-model.md](../knowledge/decisions/2026-06-21-validation-engine-consumption-model.md) | `TRACKER` | `ACTIVE` | Decision: how the Parser consumes the Validation Engine (direct monorepo import) | Consumption model revisited |
| [knowledge/decisions/2026-07-04-unified-nav-shell.md](../knowledge/decisions/2026-07-04-unified-nav-shell.md) | `TRACKER` | `ACTIVE` | Decision: one unified tool via a two-tier nav shell (Parser · Emulator · CMS); supersedes the separate `simulator.html` page | Navigation/IA revisited; new suite view added |

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

> All 30 SKILL.md files are `RULES` / `ACTIVE` — executable workflow definitions invoked via `/slash-commands`. Edit when skill behaviour needs to change; never edit mid-session.

| File | Role | Status | Purpose | Updates when |
|---|---|---|---|---|
| [skills/WORKFLOW.md](../skills/WORKFLOW.md) | `TRACKER` | `ACTIVE` | Live per-feature phase state — ✅/⏳/⬜ per phase; auto-updated by every skill | Any skill runs and updates a phase; new feature started; completed feature archived |
| [skills/CHAIN.md](../skills/CHAIN.md) | `BLUEPRINT` | `REFERENCE-ONLY` | Quick reference map of the 7-phase chain; prerequisites and next-command per phase | New skill added; phase structure changes |
| [skills/office-hours/SKILL.md](../skills/office-hours/SKILL.md) | `RULES` | `ACTIVE` | Phase 1 THINK: six forcing questions to frame a feature; saves framing to scratchpad/ | Skill behaviour updated; OCPP adaptation refined |
| [skills/spec/SKILL.md](../skills/spec/SKILL.md) | `RULES` | `ACTIVE` | Phase 1 THINK: converts framing into executable spec; saves to docs/superpowers/specs/; marks Think ✅ | Skill behaviour updated |
| [skills/autoplan/SKILL.md](../skills/autoplan/SKILL.md) | `RULES` | `ACTIVE` | THINK+PLAN shortcut: skips interactive Q&A; marks both Think ✅ and Plan ✅ in one run | Skill behaviour updated |
| [skills/plan-ceo-review/SKILL.md](../skills/plan-ceo-review/SKILL.md) | `RULES` | `ACTIVE` | Phase 2 PLAN: scope review in Expansion / Hold / Reduction modes against specs/vision.md | Skill behaviour updated |
| [skills/plan-eng-review/SKILL.md](../skills/plan-eng-review/SKILL.md) | `RULES` | `ACTIVE` | Phase 2 PLAN: engineering lock — architecture, data flow, edge cases, test plan; marks Plan ✅ | Skill behaviour updated |
| [skills/plan-design-review/SKILL.md](../skills/plan-design-review/SKILL.md) | `RULES` | `ACTIVE` | Phase 2 PLAN: UI audit 0-10 on Clarity/Consistency/Completeness/Export/Simplicity; references UI-001–UI-014 | Skill behaviour updated |
| [skills/plan-devex-review/SKILL.md](../skills/plan-devex-review/SKILL.md) | `RULES` | `ACTIVE` | Phase 2 PLAN: operator persona walkthrough (field engineer, on-site, time pressure); time-to-insight estimate | Skill behaviour updated |
| [skills/build-complete/SKILL.md](../skills/build-complete/SKILL.md) | `RULES` | `ACTIVE` | Phase 3 BUILD checkpoint: self-check before Review; records branch in WORKFLOW.md; marks Build ✅ | Skill behaviour updated |
| [skills/investigate/SKILL.md](../skills/investigate/SKILL.md) | `RULES` | `ACTIVE` | Phase 3 BUILD debug aid (callable any phase): 3 hypotheses ranked by likelihood | Skill behaviour updated |
| [skills/design-consultation/SKILL.md](../skills/design-consultation/SKILL.md) | `RULES` | `ACTIVE` | Phase 3 BUILD: full design system from scratch — header, cards, table, empty state, export, colour coding | Skill behaviour updated |
| [skills/design-shotgun/SKILL.md](../skills/design-shotgun/SKILL.md) | `RULES` | `ACTIVE` | Phase 3 BUILD: generates 4 ASCII sketch variants for user to choose one for /design-html | Skill behaviour updated |
| [skills/design-html/SKILL.md](../skills/design-html/SKILL.md) | `RULES` | `ACTIVE` | Phase 3 BUILD: implements chosen design into canonical Parser HTML source; knows 10,000-line size warning | Skill behaviour updated |
| [skills/review/SKILL.md](../skills/review/SKILL.md) | `RULES` | `ACTIVE` | Phase 4 REVIEW: 8-point OCPP checklist; auto-fix + flag classification; marks Review ✅ | Skill behaviour updated |
| [skills/design-review/SKILL.md](../skills/design-review/SKILL.md) | `RULES` | `ACTIVE` | Phase 4 REVIEW: 6 UI audit checks; atomic commits per fix | Skill behaviour updated |
| [skills/devex-review/SKILL.md](../skills/devex-review/SKILL.md) | `RULES` | `ACTIVE` | Phase 4 REVIEW: target <30s time-to-insight; compares against /plan-devex-review predictions | Skill behaviour updated |
| [skills/cso/SKILL.md](../skills/cso/SKILL.md) | `RULES` | `ACTIVE` | Phase 4 REVIEW: OWASP Top 10 + STRIDE; focused on XSS via log content injection; J06 §6.2.2 | Skill behaviour updated |
| [skills/qa/SKILL.md](../skills/qa/SKILL.md) | `RULES` | `ACTIVE` | Phase 5 TEST: loads both sample logs; 19-section checks; auto-fix bugs; marks Test ✅ | Skill behaviour updated; new sample log added |
| [skills/qa-only/SKILL.md](../skills/qa-only/SKILL.md) | `RULES` | `ACTIVE` | Phase 5 TEST: same as /qa but report only — numbered bug list, no auto-fix | Skill behaviour updated |
| [skills/benchmark/SKILL.md](../skills/benchmark/SKILL.md) | `RULES` | `ACTIVE` | Phase 5 TEST: measures parse/export time before and after; 5s parse / 3s export targets | Skill behaviour updated; performance targets revised |
| [skills/ship/SKILL.md](../skills/ship/SKILL.md) | `RULES` | `ACTIVE` | Phase 6 SHIP: syncs index.html from canonical source, pushes branch, provides PR URL | Skill behaviour updated |
| [skills/document-release/SKILL.md](../skills/document-release/SKILL.md) | `RULES` | `ACTIVE` | Phase 6 SHIP: updates CHANGELOG.md; checks docs/ and specs/requirements.md for staleness | Skill behaviour updated |
| [skills/document-generate/SKILL.md](../skills/document-generate/SKILL.md) | `RULES` | `ACTIVE` | Phase 6 SHIP: generates missing docs from scratch using Diataxis framework (Reference/How-to/Tutorial/Explanation) | Skill behaviour updated |
| [skills/land-and-deploy/SKILL.md](../skills/land-and-deploy/SKILL.md) | `RULES` | `ACTIVE` | Phase 6 SHIP: confirms PR merged, syncs main, verifies GitHub Pages deploy live at production URL | Skill behaviour updated |
| [skills/canary/SKILL.md](../skills/canary/SKILL.md) | `RULES` | `ACTIVE` | Phase 6 SHIP: post-deploy health check — 6 user-led checks on the live Parser URL | Skill behaviour updated |
| [skills/retro/SKILL.md](../skills/retro/SKILL.md) | `RULES` | `ACTIVE` | Phase 7 REFLECT: weekly retrospective; reads journal + CHANGELOG; saves to knowledge/lessons-learned/ | Skill behaviour updated |
| [skills/learn/SKILL.md](../skills/learn/SKILL.md) | `RULES` | `ACTIVE` | Phase 7 REFLECT: appends session entry to project-journal.md; updates tasks.md; marks Reflect ✅; archives feature | Skill behaviour updated |
| [skills/careful/SKILL.md](../skills/careful/SKILL.md) | `RULES` | `ACTIVE` | Safety tool: warns before destructive commands (rm, reset --hard, push --force, etc.) for session duration | Skill behaviour updated |
| [skills/freeze/SKILL.md](../skills/freeze/SKILL.md) | `RULES` | `ACTIVE` | Safety tool: restricts file edits to one specified directory until /unfreeze | Skill behaviour updated |
| [skills/guard/SKILL.md](../skills/guard/SKILL.md) | `RULES` | `ACTIVE` | Safety tool: activates both /careful and /freeze simultaneously — maximum safety mode | Skill behaviour updated |
| [skills/unfreeze/SKILL.md](../skills/unfreeze/SKILL.md) | `RULES` | `ACTIVE` | Safety tool: removes /freeze directory restriction; /careful remains if set separately | Skill behaviour updated |
