# Project Journal

Chronological record of significant decisions and sessions. Detailed change history is in `../CHANGELOG.md`; this is the higher-level narrative.

## 2026-06-07 — skill-chain.md Section 3 updated with spec-grounded OCPP adaptations

### Discussed
- Whether `specs/requirements.md` is relevant to skill OCPP considerations — yes, but Parser-scoped only; non-Parser tools have no SSOT yet
- Whether gstack inspiration is adequately captured in skill-chain.md — yes; Section 10 exclusion log and header line are correct; OCPP adaptation column is intentionally silent on gstack (it IS the differentiation layer)
- Whether skill OCPP adaptations are future-proofed for all 5 suite tools — partial gaps identified: `/qa`, `/design-html`, `/ship`, `/canary`, `/plan-design-review`, `/spec` were all Parser-specific but written as universal

### Decided
- **Only `docs/skill-chain.md`** updated (not the implementation plan) — plan's placeholder OCPP Considerations are overridden at implementation time per the `project_skill_ocpp_gate.md` memory rule
- **"For Parser:" qualifier** added to all Parser-specific OCPP adaptation entries; suite-wide rules left unqualified
- **`specs/requirements.md` cited** in Parser-relevant skills: `/spec`, `/plan-eng-review`, `/plan-design-review`, `/review`, `/document-release`
- **"Intentional summaries" framing removed** — entries now cite actual spec sections and are authoritative pointers

### Implemented
- `docs/skill-chain.md` Section 3 — all 30 OCPP adaptation entries rewritten with specific citations: J04 Table 7, §7.7, §7.6, §7.36, §4.9, §9, §3.15, §3.8, J06 §6.2.1/§6.2.2, requirements.md UI-001–UI-014, FR-327
- Committed to branch `docs/skill-chain-design` (commit `09a3f18`)

### Next
- Execute skill chain implementation: Tasks 0–10 from `docs/superpowers/plans/2026-06-06-skill-chain-implementation.md` (create WORKFLOW.md, CHAIN.md, 30 SKILL.md files, 30 `.claude/commands/` files, update CLAUDE.md + project-standard.md)
- Merge `chore/repo-standardization` PR on GitHub (pending since 2026-06-06)
- Sync local main: `git checkout main && git pull`
- After skill chain: run full SSOT compiler brainstorm using `docs/superpowers/specs/2026-06-07-ocpp-md-ssot-requirements.md`

## 2026-06-06 — SSOT consolidation, suite direction, repo standardisation

- **Consolidated** ~18 scattered MD files into a single source of truth (`specs/requirements.md`, formerly `OCPP_Parser_Master.md`), reconciled against the actual tool source (v2.7): documented the downtime engine + 4 fault types, Events/Alerts/Debug sections, the architecture & data model, and the diagnostic knowledge base (L-001 Phantom, L-002 Missing Stop, L-003 Stuck-in-Preparing).
- **Direction set:** this is an **OCPP suite mega-repo** — Validation Engine, CMS, Charger Emulator, Training Emulator, Parser.
- **Validation Engine decided:** adopt **`typed-ocpp`** (MIT) for type-aware L1–L3 validation; spec written (`docs/TYPEVALIDATION.md`). `typed-ocpp` bundled schemas = runtime source; the 56 local `.json` = canonical reference + CI diff-check.
- **Emulator find:** SAP `e-mobility-charging-stations-simulator` recorded as the Charger-Emulator candidate.
- **Repo standardised** to `knowledge/project-standard.md`: full tree built, all artifacts placed, governance files (`CLAUDE.md`, `README.md`, `.gitignore`) authored.
- **Note:** the legacy `OCPP Client Parser MD Collection/` folder was emptied but couldn't be auto-deleted (it is the shell's locked working directory) — git-ignored; delete manually.

---

## 2026-06-07 — OCPP standards folder completed, SSOT architecture brainstorm (Session 2)

### Discussed
- Evaluated all 9 files in `knowledge/standards/ocpp-1.6/` (core spec sections 2–9) for AI-readability and machine-parseability. Rated 8.5/10 — excellent structure, consistent YAML frontmatter, TOC with Obsidian wikilinks, clean enumeration tables in §7, compiler-ready config key tables in §9, embedded JSON schemas in §6.
- Identified critical gap: OCPP JSON Specification (transport layer) was missing. User added 5 `J`-prefixed files covering WebSocket connection, RPC framework (Call/CallResult/CallError), security (TLS, HTTP Basic Auth), and transport config keys.
- `J04-RPC-Framework.md` identified as the most important new file — defines message envelope structures, 9 valid CallError error codes, UniqueId rules, synchronicity constraint.
- `J07-Configuration.md` adds `WebSocketPingInterval` — compiler must merge with `09-Configuration-Keys.md` when building `config_keys.json`.
- Brainstormed the OCPP MD-as-SSOT architecture: two-phase model (build-time MD→JSON compilation, runtime JSON validation, post-test MD citation for contextual reporting). Requirements captured at `docs/superpowers/specs/2026-06-07-ocpp-md-ssot-requirements.md`.
- Evaluated machine-parseability of each section: §6 (embedded JSON schemas), §7 (enumerations), §9 (config keys), §4.9 (status transition matrix) are all compiler-ready now. §3.13 (Smart Charging state machine) remains prose — needs annotation strategy before compilation.
- Smart Charging state machine identified as the one section needing a structured annotation strategy before the compiler can target it — deferred to Phase N.

### Decided
- **`knowledge/standards/ocpp-1.6/` is complete and production-ready** for the skill chain compliance checks and for the Phase 1 compiler targets.
- **SSOT architecture confirmed** — two-phase model (MD→JSON at build time, JSON at runtime, MD at reporting time). Requirements doc is the pre-brainstorm capture; full brainstorm session deferred until after skill chain implementation.
- **Four highest-value compiler targets identified (in priority order):** (1) `09-Configuration-Keys.md` → `config_keys.json`, (2) `07-Types.md` → `enumerations.json`, (3) `06-Messages.md` ↔ `src/schemas/ocpp-1.6/` diff check, (4) `04 §4.9` → `state_transitions.json`.
- **`J`-file frontmatter convention adopted:** `transport: OCPP-J` and `source-document` fields distinguish JSON spec files from core spec files. Compiler can filter by these fields.

### Implemented
- `knowledge/standards/ocpp-1.6/J03-Connection.md` — WebSocket connection, URL format, subprotocol
- `knowledge/standards/ocpp-1.6/J04-RPC-Framework.md` — RPC envelope, error codes, UniqueId rules
- `knowledge/standards/ocpp-1.6/J05-Connection.md` — Compression, ping/heartbeat, reconnection
- `knowledge/standards/ocpp-1.6/J06-Security.md` — TLS, HTTP Basic Auth, AuthorizationKey lifecycle
- `knowledge/standards/ocpp-1.6/J07-Configuration.md` — WebSocketPingInterval config key
- `knowledge/standards/ocpp-1.6/00-Table-of-Contents.md` — Navigation map with full wikilink index
- `knowledge/standards/ocpp-1.6/02-Terminology-and-Conventions.md` — Definitions, abbreviations, RFC2119 conventions
- `docs/superpowers/specs/2026-06-07-ocpp-md-ssot-requirements.md` — Pre-brainstorm requirements capture for SSOT compiler architecture

### Next
- **Immediate:** Resume skill chain implementation (plan at `docs/superpowers/plans/2026-06-06-skill-chain-implementation.md`). Choose execution option: Subagent-Driven (recommended) or Inline.
- **After skill chain:** Run full brainstorm session for SSOT compiler using `docs/superpowers/specs/2026-06-07-ocpp-md-ssot-requirements.md` as base.
- Still pending from earlier sessions: merge `chore/repo-standardization` PR on GitHub, sync local main.

---

## 2026-06-07 — Skill chain recap, OCPP spec rulebook folder

### Discussed
- Recapped previous session: skill chain implementation plan fully written at `docs/superpowers/plans/2026-06-06-skill-chain-implementation.md` — 10 tasks, 28 SKILL.md files, 28 slash commands, WORKFLOW.md, CHAIN.md, CLAUDE.md + project-standard.md updates. Nothing implemented yet.
- Two execution options for implementing the plan: Subagent-Driven (recommended, one subagent per task, atomic commits) vs Inline Execution (sequential in session with checkpoints).
- User has converted the full OCPP 1.6J Open Charge Alliance specification into modular, well-structured Markdown files to serve as a rulebook for the suite.
- Discussed where these files belong in the repo structure.
- What `.gitkeep` files are and why they're used (git doesn't track empty directories; `.gitkeep` is a placeholder that can be deleted once real files are added).

### Decided
- **Skill chain implementation parked** — will resume in a future session.
- **OCPP 1.6J spec markdown rulebook goes in `knowledge/standards/ocpp-1.6/`** — `knowledge/` is the established home for standards; `standards/` sub-folder keeps it distinct from research/decisions/lessons; `ocpp-1.6/` mirrors the naming in `src/schemas/ocpp-1.6/`. Future specs (ISO 15118, OCPP 2.0.1) would sit alongside as sibling folders.

### Implemented
- Created `knowledge/standards/ocpp-1.6/` directory (with `.gitkeep` placeholder).

### Next
- Copy OCPP 1.6J spec markdown files into `knowledge/standards/ocpp-1.6/`.
- Resume skill chain implementation (choose execution option: Subagent-Driven or Inline).
- Merge `chore/repo-standardization` PR on GitHub (still pending from previous session).
- Sync local main: `git checkout main && git pull`.

---

## 2026-06-06 — Git workflow policy, skill chain design (Session 2)

### Discussed
- Git best practices: Branch → PR → Merge vs direct-to-main commits
- How GitHub branches work (remote vs local), what "1 hour ago" timestamp means on GitHub
- Where and how superpowers/fullstack-dev-skills plugins were installed (28 May 2026, user-initiated setup)
- gstack (garrytan/gstack) as inspiration: explored all 31 skills, their phase structure, and how skills feed into each other (Think → Plan → Build → Review → Test → Ship → Reflect)
- Adoption strategy: Option B2 (slash commands) with control — user explicitly invokes every step, nothing auto-chains
- Approach A (phase banners) + Approach B (WORKFLOW.md state file) combined from day one
- Build phase gap: risk of forgetting to mark Build complete → resolved with `/build-complete` command + `/review` catch
- Where skill detail lives: `docs/skill-chain.md` = overview, `skills/[name]/SKILL.md` = full executable detail
- Session journal protocol: how and where to track discussions across sessions
- Tracking system: three-file approach (project-journal.md / tasks.md / CHANGELOG.md)

### Decided
- **Branch → PR → Merge is mandatory** for all commits in this project (and all future projects). Saved as permanent memory and added to CLAUDE.md Hard Constraints, operating-principles.md (Principle 13), docs/workflow.md.
- **28 skills adopted** (all gstack skills except 4: /codex, /pair-agent, gstack internals, iOS-specific)
- **`/build-complete`** added as Build phase checkpoint — marks Build ✅, prompts next step. `/review` also catches a missed mark.
- **Two-level skill documentation:** `docs/skill-chain.md` is the permanent design overview; individual `skills/[name]/SKILL.md` files are the executable workflows (written during implementation).
- **`docs/skill-chain.md`** is the canonical design doc for the skill chain system (not embedded in WORKFLOW.md or project-standard.md).
- **Session journal protocol:** "update the journal" → appends dated entry to `knowledge/project-journal.md`. Saved as permanent memory.
- **OCPP adaptations** in skill-chain.md are intentional summaries; full domain-specific rules go in each SKILL.md during implementation.

### Implemented
- `knowledge/operating-principles.md` — Principle 13 (Git Workflow) added
- `CLAUDE.md` — Git workflow rule added to Hard Constraints
- `docs/workflow.md` — Git workflow section added as mandatory step before deploy
- `docs/skill-chain.md` — NEW: full skill chain design doc (11 sections, 28 skills, phase banners, WORKFLOW.md format, tracking system, CLAUDE.md integration, exclusion log)
- `memory/feedback_git_workflow.md` — saved Branch → PR → Merge as permanent memory
- `memory/feedback_session_journal.md` — saved session journal update protocol as permanent memory
- Branch `chore/repo-standardization` created, committed (110 files), pushed to GitHub remote
- PR creation pending (gh CLI not installed — manual PR via GitHub browser link)

### Next
- Merge `chore/repo-standardization` PR on GitHub
- Sync local main: `git checkout main && git pull`
- Invoke `writing-plans` skill to create implementation plan for building the skill system (28 SKILL.md files + 28 .claude/commands/ files + WORKFLOW.md + CHAIN.md + CLAUDE.md update + project-standard.md update)
- Update `project-standard.md` to add `skills/` to the universal repo tree
- Update `CLAUDE.md` to add the Skill Chain section
