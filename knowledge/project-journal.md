# Project Journal

Chronological record of significant decisions and sessions. Detailed change history is in `../CHANGELOG.md`; this is the higher-level narrative.

## 2026-06-08 — Skill chain fully implemented — 30 skills, 30 slash commands

### Discussed
- How to resume from a context window boundary mid-implementation (summary-based continuation worked well)
- What "30 empty skill dirs" meant in Task 0 — clarified it referred to pre-created subdirectory scaffolding before SKILL.md content was written
- Whether to skip the PR merge step — deferred; PR is open and ready to merge independently

### Decided
- Implementation followed the plan exactly (Tasks 0–10 from `docs/superpowers/plans/2026-06-06-skill-chain-implementation.md`)
- `feat/skill-chain-implementation` branch used (not `docs/skill-chain-design` as the plan header said — plan header was stale)
- `docs/md-registry.md` skills/ section populated in the same session (not deferred)

### Implemented
- **Task 0:** `skills/WORKFLOW.md` + `skills/CHAIN.md` + 30 skill subdirectories scaffolded
- **Task 1:** `CLAUDE.md` Skill Chain section + `knowledge/project-standard.md` skills/ tree entry
- **Tasks 2–9:** All 30 `skills/[name]/SKILL.md` files + 30 `.claude/commands/[name].md` entry points across 7 phases (Think/Plan/Build/Review/Test/Ship/Reflect) and 4 safety tools
- **`docs/md-registry.md`:** skills/ section populated — 32 new rows (WORKFLOW.md, CHAIN.md, 30 SKILL.md files)
- Branch pushed to origin; PR URL: `https://github.com/spsrathore-code/ocpp-parser/pull/new/feat/skill-chain-implementation`

### Next
- Open the PR URL above in a browser and merge `feat/skill-chain-implementation` → main
- Sync local main after merge: `git checkout main && git pull`
- Update the `docs/superpowers/plans/2026-06-06-skill-chain-implementation.md` task checkboxes to ✅

## 2026-06-08 — MD file registry designed, built, and shipped

### Discussed
- Problem: 32 MD files across 7 folders, growing to 60+ once skill chain runs — impossible to remember purpose, status, and inter-file dependencies after any significant gap
- Whether to embed the registry in `project-standard.md` or keep it separate — decided separate (`docs/md-registry.md`) because the registry is a live dynamic inventory while project-standard.md is a static rulebook
- Visual companion tool (browser-based diagram renderer) — declined; text table sufficient
- Three trigger scenarios for opening the registry: session start orientation, adding a new file, checking for stale/contradictory files — all three equally important
- "Type" vs "Role" column — "Type" felt arbitrary and overlapping; replaced with "Role" (5 values: RULES/BLUEPRINT/RULEBOOK/TRACKER/GUIDE) which describes what a file *does* rather than what category it belongs to

### Decided
- **Option A adopted:** single `docs/md-registry.md` — one table per folder section, Role + Status + Purpose + "Updates when" columns, definitions embedded at top (self-contained)
- **Status values:** ACTIVE / REFERENCE-ONLY / DORMANT / DRAFT
- **Maintenance rule:** new MD file = new registry row in the same commit — mandated in `project-standard.md` so it is a governance rule, not just convention
- **Skill integration:** `/document-release` adds rows for new files; `/learn` flags missing entries at session end
- **skills/ section** scaffolded as placeholder — populated when skill chain implementation runs

### Implemented
- `docs/superpowers/specs/2026-06-08-md-registry-design.md` — approved design spec
- `docs/superpowers/plans/2026-06-08-md-registry-implementation.md` — 3-task implementation plan
- `docs/md-registry.md` — created; 35 files registered (all current MD files fully populated)
- `project-standard.md` — two additions: `md-registry.md` entry in docs/ tree + MD File Registry Rule under Repository Design Principle
- All committed and pushed to `docs/skill-chain-design` branch

### Next
- Open and merge PR for `docs/skill-chain-design` branch on GitHub (covers skill-chain.md Section 3 update + MD registry + standards folder + superpowers plans)
- Sync local main after merge: `git checkout main && git pull`
- Merge pending `chore/repo-standardization` PR (open since 2026-06-06)
- Execute skill chain implementation: Tasks 0–10 from `docs/superpowers/plans/2026-06-06-skill-chain-implementation.md` on a new `feat/skill-chain-implementation` branch
- Update `docs/md-registry.md` skills/ section once skill chain implementation runs (~32 new SKILL.md files)

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

---

## 2026-06-13/14 — Validation Engine Phase 1 (spike→build→review→QA), global CLAUDE refactor, Parser revamp kickoff

### Discussed
- Suite status and next steps; the relationship between the project skill chain and the global AI Sherpa plugins (superpowers, fullstack-dev-skills, claude-mem, etc.) — surfaced real overlap (e.g. `/plan-eng-review` vs `superpowers:writing-plans`; `/review` vs `superpowers:requesting-code-review`).
- How the Validation Engine will be used with the Parser (boundary: Parser parses logs → feeds frames → engine validates L1–L3; integration deferred to after the Parser revamp).
- Progress-tracking gaps (roadmap/journal/CLAUDE.md all stale).

### Decided
- Build Validation Engine **Phase 1 (L1–L3)** as an isomorphic TS package (`@ador/ocpp-validation`), `typed-ocpp` npm-pinned.
- **Streamline global `~/.claude/`**: thin `CLAUDE.md` that `@`-imports a global `operating-principles.md` (canon) + references `project-standard.md`; removes the stale duplicated principles. Project copies to be removed once finalised.
- **Parser**: build a NEW **TS+Vite** parser with **exact feature/UI parity** to v2026.05.14 (`requirements.md` = SSOT), optimized + bug-fixed. Freeze the old parser as reference; engine integration later; old parser stays live until parity (Phase 5).
- Suite tracking: `specs/roadmap.md` becomes the **living dashboard**; journal each session.

### Implemented
- **Validation Engine** (`feat/validation-engine`, PR pushed): `types`, `messageValidator` (L1+L2), `exchangeTracker` (L3), `protocolValidator` (L4 stub), `validateBatch`, public barrel. **25 tests**; ESM+CJS+browser build green. `/review`+`/cso` found & fixed **R1** (exchanges dropped on MessageId reuse) + 2 regression tests; security clean. `/qa`: **788 real frames** across 2 sample logs → 0 crashes, 0 false violations, all matched.
- `docs/TYPEVALIDATION.md` updated with the spike result; plan at `docs/superpowers/plans/2026-06-13-validation-engine-phase1.md`.
- **Global `~/.claude/`** streamlined (backup `CLAUDE.md.backup-2026-06-14` kept): created `operating-principles.md` + `project-standard.md`; thin `CLAUDE.md`.
- **Parser revamp Phase 0** (`feat/parser-revamp`): Vite+TS scaffold, data model ported (`§19.3` → `src/app/model/types.ts`), old parser archived to `archive/parser-v2026.05.14/`. Build/test/typecheck green.
- **Tracking**: `specs/roadmap.md` rewritten as the suite dashboard; `CLAUDE.md` status refreshed.

### Next
- **Merge the Validation Engine PR → `main`** (manual via GitHub; `gh` CLI absent): https://github.com/spsrathore-code/ocpp-parser/pull/new/feat/validation-engine
- Resume **Parser revamp Phase 1** — core pipeline (`parse → correlate → group → processTransactions`) with golden-master fixture tests vs `data/samples/`.
- Later: Parser Phases 2–5; then engine↔parser integration; then the L4 rule catalog.

---

## 2026-06-15 - code-review-graph MCP setup + Parser revamp Phase 2a (Detection), 2b (WebSocket health) & 2c (Protocol compliance)

### Discussed
- Setting up the `code-review-graph` MCP server (https://github.com/tirth8205/code-review-graph) for this project and globally for all projects.
- Resuming Parser revamp Phase 2 after Phase 1 (core pipeline) completed.

### Decided
- Install `code-review-graph` via **pipx** (isolated venv) rather than global pip, for a clean `.exe` path and to keep the heavy Tree-sitter/embeddings deps off global Python.
- Register the MCP server at **user scope** (`claude mcp add -s user`) so it is available in all projects (covers this one too); omit `--repo` so it auto-detects the active project. Set `PYTHONUTF8=1` for Windows.
- Do NOT run `code-review-graph install` (it injects into CLAUDE.md + adds hooks/skills) - keep the curated setup; register manually instead.
- Phase 2 runs as sub-phases 2a Detection -> 2b WS health -> 2c Protocol -> 2d Health aggregation (natural dependency order; detection harvests the WS events 2b needs).
- Behaviour-preserving deviation: `detectDowntimes` RETURNS the WS PING/PONG/server-PING streams instead of writing `window._wsPingEvents` globals (same pattern as Phase 1's pass-in internalTxMap).

### Implemented
- **code-review-graph 2.3.6** installed (pipx); MCP server registered user-scope, status Connected; graph built for this repo (62 nodes / 479 edges, TS). Tool self-manages git hygiene via `.code-review-graph/.gitignore` (`*`) - DB never committed.
- **Parser revamp Phase 2a - Detection** (`src/app/detect/`): `types.ts`, `downtimeConfig.ts` (4 fault types: Connection Lost / Power Failure / Input Under Voltage / Emergency Stop), `detectDowntimes.ts` (single-pass downtime engine + WS event harvest, returned not globalised), `missingSync.ts` (`detectMissingBootAfterPowerRestore` + `detectMissingStatusAfterEmergencyStop`), `incompleteTransactions.ts`. +12 tests (`detect.test.ts`, `detectFlags.test.ts`) -> **37 tests total**, typecheck clean.
- Trackers refreshed at the sub-phase boundary: `skills/WORKFLOW.md`, `specs/roadmap.md`, `specs/tasks.md`.
- **Parser revamp Phase 2b - WebSocket health** (`src/app/ws/`): `analyzeWebSocketHealth` ported (two-pointer O(n+m) PING<->PONG match, adaptive interval avg, stall = interval > 2x avg, missed-PONG via 10s timeout, Healthy/Warning/Critical status) consuming the harvested `wsEvents`. The DOM section (`createWebSocketHealthSection`, incl. 500-row cap) is deferred to Phase 3 render. +4 tests -> **41 tests total**, typecheck clean.
- **Parser revamp Phase 2c - Protocol compliance** (`src/app/protocol/`): `runProtocolValidation` ported (5 groups BOOT/RESP/TXC/STATUS/MV = 21 system checks + 10-stage per-transaction lifecycle + compliance summary) + `detectPhantomConnectionPattern` (L-001). `internalTxMap` + `rawLogLines` passed in (not globalised). Render (`createProtocolValidationSection`) deferred to Phase 3. +7 tests -> **48 tests total**, typecheck clean.
- **Discrepancy found**: source defines **21** system checks, but spec FR-142 says "24". Ported the source (canonical); FR-142 needs reconciling.

### Next
- Commit Phase 2a + 2b + 2c on `feat/parser-revamp` (not yet committed - per user).
- **Phase 2d - Health aggregation** (Section 10 connector stats over `processTransactions`) - final Phase 2 sub-phase. Then Phase 2 closes; Phase 3 (Render/UI) begins.
- Reconcile FR-142 check count (21 vs 24) in `specs/requirements.md`.

## 2026-06-15 - Parser revamp Phase 2d (Health aggregation) — Phase 2 complete

### Discussed
- Resumed `feat/parser-revamp`. A test-first `tests/unit/health.test.ts` was already staged for Phase 2d but its implementation modules did not exist yet (suite failed to load). Baseline otherwise green at 48 tests.

### Decided
- Promote the health-flag thresholds to `src/app/model/config.ts` (`DEFAULT_ZERO_ENERGY_THRESHOLD_WH`, `METER_DIFF_THRESHOLD_WH`, `CURRENT_MISMATCH_FACTOR`, `ENERGY_DISPENSE_DIFF_PER_TX_WH`) rather than leaving them inline as in the source, while keeping the logic a faithful port. The zero-energy threshold (source: `localStorage`, default 500) is taken as a function parameter for testability.
- Render layers (`createConnectorStatsSection` / `createEnergyDispenseSection`) deferred to Phase 3, consistent with how 2b/2c left their DOM sections.

### Implemented
- **Parser revamp Phase 2d - Health aggregation** (`src/app/health/`): `types.ts` (`ConnectorStatsRow`, `EnergyDispenseRow`, `ConnectorId = number | 'N/A'`), `connectorStats.ts` (`aggregateConnectorStats` — groups by connector, counts the 4 health flags zero-energy / temp-high / meter-diff / current-mismatch + numeric-only power avg/peak + normal remainder, FR-131), `energyDispense.ts` (`analyzeEnergyDispense` — per-connector recorded `max(stop)-min(start)` vs summed `Σ(stop-start)` reconciliation, non-numeric meter readings excluded, flag on `diffPerTx > 10 || diff < 0`, FR-127/128/129). +4 tests -> **52 tests total**, typecheck clean.
- **Phase 2 (a/b/c/d) now complete.** Trackers refreshed at the phase boundary: `skills/WORKFLOW.md`, `specs/roadmap.md`, `specs/tasks.md`.

### Next
- **Phase 3 - Render/UI** (19 sections, charts, export, theme) — first user-visible parity surface; wire the Phase 1-2 analyzers into rendered DOM sections (incl. the deferred WS-health / protocol / connector-stats / energy-dispense renders).
- Reconcile FR-142 check count (21 vs 24) in `specs/requirements.md`.

## 2026-06-16 - Parser revamp Phase 3 kickoff: brainstorm + spec + plan + Phase 3a (shell/render foundation)

### Discussed
- Proceeding to Phase 3 (Render/UI) — the biggest remaining chunk (app shell + orchestrator + 19 section renderers + charts + export + theme). Ran the brainstorming → spec → writing-plans → executing-plans skill chain.

### Decided
- **Sub-phase Phase 3** into 3a (shell+theme+orchestrator+DOM helper), 3b (static section renderers), 3c (charts), 3d (Excel export). Each lands green+committed like 2a-2d.
- **npm-bundle chart.js + xlsx via Vite** (3c/3d); **Tailwind via Play CDN** for styling only — the legacy generates dynamic class names (`text-${colour}-600`) that a bundled/purged Tailwind would drop without a hand-maintained safelist; the Play CDN JITs them for free (zero parity risk).
- **Thin typed DOM helper** (`el()` / `collapsibleSection()`) over plain createElement+innerHTML — identical output, less repetition, type-safe.
- **`AnalysisResult` bundle** (`src/app/analyze.ts`) is the single typed seam: a headless `displayResults` that runs the whole Phase 1-2 pipeline; the render layer only draws. Keeps render DOM-free-testable.
- Session Timeline modal + Log Repository (IndexedDB/Drive) stay **Phase 4**; parity gate + deploy swap stay **Phase 5**.

### Implemented
- Spec `docs/superpowers/specs/2026-06-15-parser-phase3-render-design.md` + plan `docs/superpowers/plans/2026-06-15-parser-phase3a-shell.md` (8 bite-sized TDD tasks).
- **Phase 3a** (executed inline, TDD, 7 commits): `render/dom.ts` (typed helper + collapsible), `analyze.ts` (`AnalysisResult` + `analyze`/`analyzeLogLines`/`mergeParsed`), `render/theme.ts` (dark/light + localStorage), `render/shell.ts` (header/upload/container), `render/renderResults.ts` (19 §19.4 sections, placeholder bodies, fixed order), `main.ts` (upload→parse→merge→analyze→render), Tailwind Play CDN in `index.html`. jsdom added for render tests (per-file `@vitest-environment jsdom` pragma; global env stays node). **66 tests** (was 52: +13, +1 jsdom smoke replaced), `tsc --noEmit` + `vite build` clean.
- **Deviations from plan:** (1) `WsHealth.connectionStatus`, not `.status` (plan assumed wrong field). (2) jsdom rebases `import.meta.url`, so the renderResults test loads the sample via `process.cwd()` instead of `fileURLToPath(new URL(...))`.

### Next
- **Manual browser check (user):** `npm run dev` → confirm Tailwind styling, theme toggle persistence, and that uploading the sample log renders 19 ordered collapsible sections.
- **Phase 3b** — replace the 19 placeholder bodies with real section renderers (start with Transaction Summary + the Phase-2 deferred renders), jsdom-tested against fixtures. Then 3c (charts), 3d (export).
- Reconcile FR-142 protocol check count (21 vs 24).

## 2026-06-17 - Parser revamp Phase 3b-1 (generic table + first 3 section renderers)

### Discussed
- Continuing Phase 3b (real section renderers). Phase 3b is 19 sections — too big for one plan, so batched by renderer type.

### Decided
- **Batch 3b by renderer type:** 3b-1 generic `dataTable` helper + the 3 sections that use it (Heartbeats, Start Tx, Stop Tx); 3b-2 custom renderers (Debug Info, Boot, Status); 3b-3 tx-centric; 3b-4 analysis sections.
- **Generic `dataTable(headers, rows, tableId?)`** ports the table portion of the legacy `createCollapsibleSection` (HTML 5043): sticky S.No. col, optional File Name col (when row has `fileName`), `row[h] || 'N/A'` cells (faithful — renders 0/'' as 'N/A'). Stable `tableId` set for Phase 3d export targeting.
- **Orchestrator refactor:** `SectionDef` now `{ title, emoji, count?, render }` — `render(r)` returns the body, `collapsibleSection` adds the card + `Title (N)` count header. Sections swap placeholder→real one batch at a time; ordering stays put.
- Deferred (noted): per-section Export-to-Excel button → 3d; auto-collapse-when->10-rows → polish.

### Implemented
- Plan `docs/superpowers/plans/2026-06-16-parser-phase3b1-generic-tables.md` (7 tasks).
- **Phase 3b-1** (executed inline, TDD): `render/format.ts` (`fmtReplayDelay`), `render/table.ts` (`dataTable`), orchestrator refactor, and real renderers `render/sections/{heartbeats,startTransactions,stopTransactions}.ts`. Start/Stop reproduce offline-replay detection (Δ > `OFFLINE_REPLAY_THRESHOLD_MS`, 📴/📡 markers, `fmtReplayDelay`), SoC begin/end + location extraction from `transactionData`, internal-id resolution via `internalTxMap`, and the StopTx `txId=0` "No CMS ID" marker. **79 tests** (was 66, +13); `tsc --noEmit` + `vite build` clean.

### Next
- **Manual browser check (user):** `npm run dev` → upload sample → confirm Heartbeats/Start/Stop show real tables (with counts in headers); other 16 still placeholders.
- **Phase 3b-2** — custom renderers: Debug Info (stats + UTC/IST timestamp formatting + log duration), Boot Notifications (HTML 2632), Status Notifications (HTML 4144).
- Reconcile FR-142 protocol check count (21 vs 24).

## 2026-06-18 - Parser revamp Phase 3b-2 (Debug Info + Boot Notifications)

### Discussed
- Continuing Phase 3b. While planning 3b-2 (originally Debug + Boot + Status), two cross-cutting scope forks surfaced.

### Decided (user)
- **Preview/Download "log context" buttons** (Boot, Events, Alerts, Downtime) → **dedicated context-viewer sub-phase** (shared modal + download, retro-fit later). Tables render now without those columns.
- **Status Notifications** → **its own sub-phase, full parity** (it carries analytics + session-flow, not just a table). So 3b-2 = Debug Info + Boot only. Re-batched: 3b-3 Status · 3b-4 tx-centric · 3b-5 analysis · context-viewer cross-cutting.

### Implemented
- Plan `docs/superpowers/plans/2026-06-18-parser-phase3b2-debug-boot.md` (5 tasks).
- **Phase 3b-2** (executed inline, TDD): `format.ts` += `formatUtcIst` (UTC + IST/UTC+5:30) + `formatLogDuration`; `render/sections/debugInfo.ts` (pure `computeDebugStats`: group counts, tx-id chips [faithful request-payload quirk preserved], unique event types, alert-code rollup with descriptions, log span across message/event/alert + raw-line timestamps; `renderDebugInfo` builds the stat-card panel + alert-code table + UTC/IST duration block); `render/sections/bootNotifications.ts` (vendor/model/firmware/response-status via `dataTable`, missing→'N/A' vs legacy 'undefined'). Wired both into the orchestrator. **86 tests** (was 79, +7); `tsc` + `vite build` clean.
- Test-fragility fix: the renderResults count test now matches the section header button (Debug Info's body legitimately contains "Heartbeats" as a stat-card label).

### Next
- **Manual browser check (user):** Debug Info stat cards + UTC/IST duration; Boot table. 5/19 sections real.
- **Phase 3b-3 — Status Notifications** (full parity): table + status distribution + faulted/error counts + session-flow (HTML 4144+).
- Reconcile FR-142 protocol check count (21 vs 24).

## 2026-06-18 - Parser revamp Phase 3b-3a (Status Notifications: table + analytics)

### Discussed
- Status Notifications turned out to be a 770-line mega-section (HTML 4144-4913): table + status distribution + session-flow + a heavy Repeated-RemoteStart auth-contention diagnostic (raw-line scan + multi-event correlation).

### Decided (user)
- **Split Status:** 3b-3a = table + distribution + session-flow + error-code rollup + filter bar (the everyday Status view); **3b-3b = the Repeated-RemoteStart diagnostic** (own analysis module + UI). Analytics computed in a pure function, render stays thin.
- **Process deviation (mine, noted):** for this mega-port executed inline, I implemented 3b-3a directly in TDD commits instead of first writing a ~1000-line plan doc — marginal value of the plan artifact is low when I'm executing immediately. Same rigor (test-first compute, faithful port to specific legacy lines, small green commits).

### Implemented
- **Phase 3b-3a** `render/sections/statusNotifications.ts`: pure `computeStatusAnalytics(messages)` — rows (10 fields + sessionFlow), summary counts (total/unique/faulted/error/connectors), status distribution (canonical-order sort + max), per-connector session-flow classification (Preparing → Charging/Finishing/Available/Faulted, tagging both rows), error-code frequency rollup. `renderStatusNotifications`: 5 summary cards, distribution bars, session-flow cards + per-connector table, error-code table, filter bar (Connector/Status/Error/Vendor ID/Vendor Error/Info + Session Flow + Clear + live count), filterable 10-col main table with Faulted row highlight. **92 tests** (was 86, +6); `tsc` + `vite build` clean.
- Deferred to 3b-3b: ⚠ Repeat-RemoteStart summary card, per-row "N× RS" pill + amber highlight, threshold problem-session panel.

### Next
- **Manual browser check (user):** Status section — summary cards, distribution bars, session-flow cards, error-code table, working filters, main table.
- **Phase 3b-3b** — Repeated-RemoteStart diagnostic (raw-line scan + RemoteStart/Authorize correlation). 6/19 sections now real.
- Reconcile FR-142 (21 vs 24).

## 2026-06-18 - Parser revamp Phase 3b-4a (Connector Stats + Transaction Summary)

### Implemented
- **Connector Stats** (`render/sections/connectorStats.ts`): draws the Phase-2d `r.connectorStats` aggregation as the 10-col table with "N (P%)" coloured flag cells; Overlap column placeholder. +2 tests.
- **Transaction Summary** (`render/sections/transactionSummary.ts`): faithful port of HTML 3676-4054 — 8 summary cards, localStorage-persisted zero-energy threshold control (live recompute of flags + cards + rows), row filter (all/offline/online/issues/zero-energy/temp-high/meter-diff/current-mismatch/normal), 26-col per-tx table with meter-diff / current-mismatch / temp cell formatting + offline-replay badges + status badges + row colour priority. `computeTxFlags` pure (reuses the Phase-2d threshold constants). `convertToIST` (DD/MM/YYYY HH:MM:SS IST) added to `format.ts`. +5 tests.
- Deferred: the per-row View Chart (3c) + Timeline (Phase 4) buttons + modal → trailing "Chart" column omitted for now (26 cols vs 27); export → 3d.
- **99 tests** (was 92, +7); `tsc` + `vite build` clean. **8/19 sections real.**

### Next
- **Manual browser check (user):** Connector Stats table; Transaction Summary cards + threshold + filter + wide table.
- **3b-4b** Events + Alerts (context buttons deferred) → **3b-4c** Transaction & Meter Values → then 3b-5 analysis sections + 3b-3b RemoteStart diagnostic + context-viewer.

## 2026-06-19 - Parser revamp Phase 3b-4b (Events + Alerts)

### Implemented
- **Events** (`render/sections/events.ts`) and **Alerts** (`render/sections/alerts.ts`): faithful ports of HTML 2726-3043 — filterable tables with per-column text filter inputs (Events: Type + Outlet; Alerts: Outlet + Code + Message), substring/case-insensitive row hiding + a live "X of N shown" count, JSON payload cell (Events), missing fields → 'N/A'. +4 tests (103 total); `tsc` + `vite build` clean.
- Deferred (per 2026-06-17 decision): the per-row "Download Context" buttons + the trailing "Context Analysis" column → context-viewer sub-phase. Minor deviation: filtering is immediate (legacy 150 ms debounce dropped — perf nicety, not needed for parity/testability).
- Also committed earlier this session: living `docs/parser-revamp-comparison.md` (legacy-vs-revamp snapshot, finalized at the Phase 5 parity gate).

### Next
- **Manual browser check (user):** Events + Alerts tables with working column filters.
- **3b-4c** Transaction & Meter Values (last tx-centric section) → then 3b-5 analysis sections, 3b-3b RemoteStart diagnostic, context-viewer. **10/19 sections real.**

## 2026-06-19 - Parser revamp Phase 3b-4c (Transaction & Meter Values) — 3b-4 complete

### Implemented
- **Transaction & Meter Values** (`render/sections/meterValues.ts`): port of HTML 2388-2575 + the pivot in `updateMeterValuesTable` (HTML 8200-8318). Transaction selector (All + per-tx, labels from `buildTxInfo`) → "View Meter Values" populates a pivoted **33-column** table (one row per reading timestamp; columns per `measurand/unit/location[/phase]`; the duplicate `Temperature/Celsius/Outlet` → `Outlet#2`; offline-replay markers per reading) with Date / Transaction-ID filter selects + Apply/Clear. Pure `pivotMeterValues` + `buildTxInfo`. +5 tests (108 total); `tsc` + `vite build` clean.
- Deferred to 3c (chart/stats-coupled): summary-card *population*, detailed-stats table, the ZUC ("Energy < 1 kWh") option, and the Transaction Analysis Graphs.
- **3b-4 (all transaction-centric sections) complete. 11/19 sections real.**

### Next
- **Manual browser check (user):** Meter Values — selector → View → pivoted table + Date/Tx-ID filters.
- **3b-5 — analysis sections (8):** Downtime Report, Power-Restore Missing Sync, Emergency-Stop Release, Fault Status Summary, Incomplete Transactions, Energy Dispense Check, Protocol Compliance, WebSocket Health. Analyzers already in `analyze.ts` → render-only. Then 3b-3b (RemoteStart diagnostic) + context-viewer close out 3b.

## 2026-06-19 - Parser revamp Phase 3b-5a (Energy Dispense + Incomplete + Fault Status)

### Implemented
- First 3 of the 8 analysis-section renderers (render-only — analyzers already in `analyze.ts`):
  - **Energy Dispense Check** (`sections/energyDispense.ts`): summary cards + 9-col table over `r.energyDispense` with Meter-Anomaly/Discrepancy/Normal status badges + empty state.
  - **Incomplete Transactions** (`sections/incompleteTransactions.ts`): cards (total / log-boundary / between) + 7-col badge table over `r.incompleteTransactions`, IST ref time, green all-complete empty state.
  - **Fault Status Summary** (`sections/faultStatusSummary.ts`): pure `computeFaultSummary` (filter Faulted StatusNotifications, group by connector‖info‖vendorErrorCode) + cards + grouped table; "No faults" empty state.
- +6 tests (114 total); `tsc` + `vite build` clean. **14/19 sections real.**

### Next
- **Manual browser check (user):** Energy Dispense, Incomplete, Fault Status sections.
- **3b-5b** Downtime Report + Power-Restore Missing Sync + Emergency-Stop Release (Downtime's Preview/Download → context-viewer) → **3b-5c** Protocol Compliance + WebSocket Health. Then 3b-3b (RemoteStart) + context-viewer close 3b.

## 2026-06-19 - Parser revamp Phase 3b-5b + 5c — ALL 19 sections rendered

### Implemented
- **3b-5b** (`render/sections/downtimeReport.ts`, `syncFlags.ts`): Downtime Report (summary cards + per-fault-type summary cards + reason filter + 9-col table, reason display-name mapping) + Power-Restore Missing Sync + Emergency-Stop Release (cards + badge tables + per-connector recovery status). +4 tests.
- **3b-5c** (`render/sections/webSocketHealth.ts`, `protocolCompliance.ts`): WebSocket Health (status badge + 5 cards + 8-col detail table with 500-row cap + anomaly prioritisation) + Protocol Compliance (compliance badge + 5 cards + System-Checks/Transaction-Lifecycle tabs with collapsible groups + 10-stage flow visualisation). +4 tests.
- Removed the now-unused `placeholder` helper from `renderResults.ts` (surgical orphan cleanup). **All 19 §19.4 sections now have real renderers.** 122 tests; `tsc` + `vite build` clean.
- Deferred per prior decisions: per-row Preview/Download "context" buttons (Downtime + sync sections) → context-viewer sub-phase.

### Milestone
- **Phase 3b static renders COMPLETE** — the parser now renders every section end-to-end (upload → analyze → 19 rendered sections).

### Next
- **Manual browser check (user):** full run — all 19 sections should render with real data + their filters/tabs.
- **3b-3b** Repeated-RemoteStart diagnostic (Status) + **context-viewer** (shared Preview/Download) finish Phase 3b parity. Then **3c** charts (incl. deferred View-Chart / Analysis Graphs / ZUC / RemoteStart card) → **3d** Excel export.
- Reconcile FR-142 (21 vs 24).

## 2026-06-19 - Fix: Meter Values summary cards + Detailed Statistics (user-reported gap)

### Issue
- User browser-check found the Transaction & Meter Values "Transaction Summary" cards showing "-" and no "Detailed Statistics". Root cause: in 3b-4c I **over-deferred** — I lumped the summary-card population + detailed-stats with the Chart.js Analysis Graphs and deferred all of it to 3c. But cards + detailed stats are pure computation, not chart-coupled.

### Fix
- Ported `getTransactionMetrics` (energy from Energy.Active.Import.Interval/Outlet, duration from Transaction.Begin/End), `identifyZUCSessions` (energy < 1 kWh), `calculateTransactionStats` (per-measurand max/min + SoC start/end over pivoted rows), and the card/banner/detailed-stats population (HTML 7944-8160) into the Meter Values View flow. 'all' view → Total Transactions / Total Energy / Avg Duration / ZUC Sessions; specific tx → ID / Meter Readings / Energy / Duration + internal-tx banner + Detailed Statistics table.
- **Only the Chart.js Analysis Graphs (and the ZUC selector *option*) remain deferred to 3c.** +2 tests (124 total); `tsc` + `vite build` clean.

### Lesson
- When deferring chart work, separate the *pure analytics* (cards/stats/tables) from the *chart rendering* — defer only the latter. Don't let "coupled in the legacy" justify deferring computable, user-visible numbers.

## 2026-06-19 - Parser revamp context-viewer (shared Preview/Download log context)

### Implemented
- `render/contextViewer.ts`: faithful port of the legacy context helpers (HTML 8369-8669). Pure builders `extractContext` (±25 lines), `buildSingleReport` (Boot/Events/Alerts), `buildDowntimeReport` (start+end merged windows); side-effect `showContextModal` + `downloadTextFile`; and `wireContextButtons` — ONE delegated, idempotent click handler on the results container that reads `data-ctx-*` button attributes (no per-section listeners; no global onclick).
- `dataTable` gained an `htmlColumns` parameter (cells rendered as HTML) so Boot can carry button markup.
- Retrofit the deferred buttons: Boot (Preview+Download), Events + Alerts (Download only, as in legacy), Downtime + Power-Restore Sync + Emergency-Stop Release (Preview+Download, range/start-end). `renderResults` wires the handler once with `result.rawLogLines`.
- +5 tests (129 total); `tsc` + `vite build` clean.

### Next
- **Manual browser check (user):** click Preview/Download on Boot/Events/Alerts/Downtime/sync rows → modal shows ±25 surrounding log lines; Download saves a .txt.
- **3b-3b** Repeated-RemoteStart diagnostic — the **last** Phase 3b parity item. Then 3c charts → 3d Excel export.

## 2026-06-19 - Decision: park Repeated-RemoteStart diagnostic; proceed to 3c charts

### Decided (user)
- **Park 3b-3b** (Repeated-RemoteStart auth-contention diagnostic in the Status section). Documented for clean later resumption in `docs/superpowers/specs/2026-06-19-PARKED-remotestart-diagnostic.md` (legacy line ranges 4256-4720 + 4849-4857, algorithm, data contract, recommended revamp architecture as a `detect/remoteStartContention.ts` module surfaced on AnalysisResult + Status render additions). Marked ⏸️ PARKED in WORKFLOW/roadmap/tasks.
- **Next: Phase 3c — charts (Chart.js).**

### Next
- 3c charts: per-tx View Chart (Transaction Summary), Meter Values Analysis Graphs + ZUC option, Status RemoteStart card placeholder. npm install chart.js; pure data-shaping unit-tested, canvas render manual-verified.

## 2026-06-19 - Parser revamp Phase 3c (charts) complete

### Implemented
- **3c-a** `render/charts/txChart.ts`: pure `buildTxChartData` (SoC% + Power kW per MeterValues msg) + `renderTransactionChart` (lazy-imports `chart.js/auto` → code-split). Restored Transaction Summary "View Chart" column (27 cols) + modal + delegated handler (rAF before draw). chart.js@4 installed.
- **3c-b** `render/charts/meterValueGraphs.ts`: pure `extractGraphData` (6 per-series arrays from a tx's pivoted rows) + `renderTransactionGraphs` (6 dark-theme line charts via a compact shared builder, lazy Chart.js). Wired the Meter Values ZUC selector option (+ zuc filtering + summary-card branch) and the "Transaction Analysis Graphs" subsection (renders on View for a specific tx).
- **132 tests**; `tsc` + `vite build` clean; Chart.js confirmed code-split into its own chunk (loads only when a chart is opened).
- Deferred (noted): per-graph 🔍 Enlarge modal + 📥 PNG-download buttons. Status RemoteStart card rides with parked 3b-3b.

### Next
- **Manual browser check (user):** Transaction Summary → View Chart (modal SoC+Power); Meter Values → select a tx → View → 6 analysis graphs; ZUC option.
- **Phase 3d — Excel export (SheetJS)**: per-section Export buttons. Last Phase 3 item (modulo parked 3b-3b). Then Phase 4 (repository/timeline/api-download) + Phase 5 (parity gate + deploy).

## 2026-06-19 - Fix: faithful Meter Values graphs + Enlarge/Download (user-reported)

### Issue (user)
- My first Meter Values graphs (3c-b) were a **lossy port** — I used a "compact shared chart builder" and dropped per-graph fidelity: no hover tooltips (missing `interaction:{mode:'nearest',intersect:false}` with `pointRadius:0` → nothing to hover), no dashed "Present" lines, wrong Graph 3 (made dual-axis instead of SoC x-axis), no per-unit tooltips. User also flagged the Enlarge/Download buttons shouldn't have been deferred.

### Fix (3c-c)
- Re-read the full legacy chart configs (HTML 8885-9444) and re-ported all 6 graphs **faithfully**: `interaction` hover, `pointHitRadius:15` + hover-point styling, `borderDash:[5,5]`/`borderWidth:3` Present series, per-unit tooltip callbacks, black/white axis theming, Graph 3 SoC x-axis, Graph 6 dual y-axes (y-left Power/Voltage, y-right Current). Added per-graph 🔍 Enlarge modal (clones config, maintainAspectRatio:false, re-attaches tooltip callbacks after JSON-clone) + 📥 PNG download (HTML 9447/9536). 132 tests; tsc + vite build clean.

### Lesson (recurring — codify)
- **Faithful-parity work must not be "compacted."** Twice now (Meter Values cards, then graphs) I over-trimmed and lost user-visible features. For parity ports, reproduce the legacy config in full; only refactor *after* parity is verified. A shared helper is fine only if it preserves every per-instance property (dash, hover, tooltips, axes).

### Next
- **Manual browser check (user):** Meter Values → select a tx → View → graphs now show hover tooltips, dashed Present lines, Enlarge + Download.
- **Phase 3d — Excel export (SheetJS)** = last Phase 3 item (modulo parked 3b-3b).

## 2026-06-20 - 🎉 Parser revamp Phase 3 COMPLETE (3d Excel export)

### Implemented
- **Phase 3d** `export/exportToExcel.ts`: `exportTableToExcel` (faithful port of legacy HTML 7933 — `XLSX.utils.table_to_book` → `writeFile`) with `xlsx@0.18.5` lazy-imported (code-split chunk, loads only on export) + `exportButton` helper. `collapsibleSection` gained a `headerAction` slot (title remains its own toggle button — no nested buttons; existing tests preserved). `SECTION_ORDER` declares each table's `{id, file}`; the orchestrator renders an "Export to Excel" header button on the **17 table sections** (not Debug Info / Protocol Compliance, per legacy). +4 tests (135 total); `tsc` + `vite build` clean (xlsx + chart.js both code-split).

### Milestone
- **PHASE 3 (Render/UI) COMPLETE** — modulo ⏸️ parked 3b-3b. The revamp now reproduces the live tool end-to-end: upload → 19 rendered sections (tables/filters/cards/analytics), per-tx + meter-value charts (faithful, with enlarge/PNG-download), per-section Excel export, log-context preview/download, dark/light theme.
- Snapshot: 1 file/9,813 lines → ~50 modules/5,414 TS lines, 0 → 135 tests. `docs/parser-revamp-comparison.md` updated.

### Next
- **Manual browser check (user):** click "Export to Excel" on a few sections → .xlsx downloads with the table data.
- **Phase 4 — Repository / Timeline / API-download** (brainstorm/spec first; biggest remaining feature area) → **Phase 5** parity gate + deploy swap. Plus parked 3b-3b whenever prioritised.

## 2026-06-20 (PM) — Parser revamp Phase 4a: Log Repository core (local)

### Discussed
- Resumed on `feat/parser-revamp` after Phase 3 complete. Committed loose working-tree docs (validation-engine spike + Phase 1 plan) as `183a7ca`; the 6 other "modified" files were CRLF-only churn and left untouched.
- Scoped Phase 4 (Repository / Timeline / API-download) into sub-phases 4a–4e.

### Decided
- **Google Drive (4c) PARKED → Phase 5 hosted deploy.** It needs the hosted `https://` URL + OAuth client-id and is untestable from `file://`; parking keeps every Phase 4 item testable. Schema keeps `driveFileId` (null) so wiring later is additive.
- Build order: **4a repository core first** (foundation, pure-local, fully TDD-able).
- Executed via **subagent-driven-development**: fresh implementer + reviewer subagent per task, fix loop on Critical/Important findings.

### Implemented
- New `src/app/repository/` module, local + headless: `compress.ts` (gzip `CompressionStream` round-trip, FR-174) · `db.ts` (IndexedDB CRUD, 6 indexes incl. tags multiEntry, **cached-connection singleton with `onversionchange`/`onclose` safety** so `deleteDatabase` never deadlocks, FR-178) · `repository.ts` (`saveLogToRepository`/`loadFromRepo`/`deleteFromRepo`/`listRepoMeta` + `nextVersionFilename` `_v2` versioning + overwrite/cancel branches, FR-183) · `storage.ts` (estimate/persist guards that degrade gracefully, FR-175/176/177) · `autoSave.ts` (failure-isolated auto-save wired into `main.ts`'s parse loop — only existing-code edit, FR-179/205/206).
- `fake-indexeddb` added as devDep for node-env tests. **+25 tests → 160 total**; `tsc` + `vite build` clean (repository chunk).
- Review loop caught + fixed: T2 connection-per-call race (→ versionchange-safe singleton); T3 flaky `setTimeout` sort test (→ deterministic `Date.now` spy).

### Next
- **Manual browser check (user):** upload a log → reload → confirm it auto-saved (DevTools ▸ Application ▸ IndexedDB ▸ `ocpp-log-repository`). No UI panel yet — that's 4b.
- **Phase 4b** repository panel UI (search/tags, bulk-select, Load&Analyze, prompts/toast), then 4d Session Timeline, 4e API-download. 4c Drive + 3b-3b RemoteStart remain parked.

## 2026-06-21 — Parser revamp Phase 4b: Log Repository panel UI (local)

### Decided
- Faithful-parity UX (user): non-blocking site-name pop-in banner, toast, Overwrite/Save-as-new-version prompt, all 8 table columns, IST formatting.
- Drive badge/Connect rendered **disabled** with tooltip "Cloud sync arrives with the hosted deploy" (FR-197 file:// state); all Drive sync stays parked in 4c.
- Added an explicit **Phase 6 — Validation Engine integration** to the Parser phase tracker (was only an engine-side footnote); see roadmap + WORKFLOW.

### Implemented (via subagent-driven-development, per-task implement→review→fix)
- New `src/app/render/repository/` module: `panel.ts` (collapsible panel above upload + header stats + disabled Drive badge), `repoTable.ts` (9-col stored-logs table, IST/size/tags/Local badge), `filter.ts` (pure `filterRepoRows` + filter bar — filename/site/IP/date/tag), `loadAnalyze.ts` (Load&Analyze reuses `analyzeLogLines`→`renderResults`), `actions.ts` (delete + bulk select/delete/clear-all, injectable confirm), `tagEditor.ts` (modal, 7 presets + custom), `autoSaveUx.ts` (site-name banner + toast + duplicate prompt).
- Service additions: `updateEntryTags`, `updateEntrySiteName`, and an atomic `patchEntry` in `db.ts` (single read-write transaction — fixes a real read-after-write window; opus-verified). `main.ts` swapped to `autoSaveWithUx` (4a headless `autoSaveUploadedFile` + test retained).
- **+26 tests → 186 total**; `tsc` + `vite build` clean.
- Review loop caught + fixed: clear-all wiping selection on cancel; single-row delete leaving phantom selected ids.

### Next
- **Manual browser check (user):** upload a log → see toast + site-name banner; open the 📂 Log Repository panel → filter, tag, Load & Analyze a stored log, delete / bulk-delete. Drive button is intentionally disabled.
- **Phase 4d — Session Timeline** (per-tx 4-tab modal), then **4e API download**. 4c Drive + 3b-3b RemoteStart remain parked. Repository hardening follow-ups listed in `specs/tasks.md`.

## 2026-06-21 (PM) — Parser revamp Phase 4d: Session Timeline & Telemetry

### Implemented
- New `src/app/render/timeline/` module — faithful port of the legacy v2026.05.14 Session Timeline (HTML 7386–7931): pure `getTimelineDataForTx` (markers/mv-breakdown/swimlanes) + `tlTime`; dark modal `createSessionTimelineModal` with a 4-tab bar (Session·Energy·Status·Telemetry) + Chart.js destroy-on-tab-switch lifecycle; "📊 Timeline" button on each Transaction Summary row (additive — `renderTransactionSummary` already receives `r.messages`/`r.transactions`, so no `renderResults.ts` change).
- Tabs: **Session** + **Status** are pure HTML/CSS (segmented bar / connector swimlanes via positioned divs); **Energy** + **Telemetry** use lazy `chart.js` (no new dependency, no annotation plugin). +37 tests (223 total); `tsc` + `vite build` clean (Chart.js code-split).

### Decided / recorded
- **Spec/source drift (FR-215):** spec lists 11 markers incl. a Phantom-Connection marker; the legacy v2026.05.14 implements **10 markers with NO Phantom marker**. Per the source-canonical rule (cf. the 21-vs-24 protocol-check drift), ported the 10 faithfully. Flagged in roadmap/tasks/WORKFLOW.
- The timeline modal is **dark-only** (legacy inline styles) and does not follow the app light/dark toggle — intentional parity.

### Process note
- Tasks 1–4 ran via subagent-driven-development; **switched to inline execution for Tasks 5–6** after the per-task implementer+reviewer subagent pattern proved very token-expensive (each subagent cold-re-derives context), draining the session usage cap while my own context stayed lean (~44%). Inline is the right tool for faithful ports of known-good legacy code; reserve subagent-driven for genuinely novel/risky work (e.g. 4c Drive OAuth, Phase 6 engine integration).

### Next
- **Manual browser check (user):** Transaction Summary → "📊 Timeline" on a row → 4 tabs render (Session bar/markers, Energy dual-axis, Status swimlanes, Telemetry power+temp w/ red breach dots).
- **Phase 4e — API download** (EVSE folder-save + progress), then **Phase 5** parity gate + deploy swap. 4c Drive + 3b-3b RemoteStart remain parked.

## 2026-06-21 (eve) — Parser revamp Phase 5: parity-gate AUDIT (no deploy)

### Did
- Ran the Phase 5 parity gate as an **audit only** (user choice; deploy swap explicitly held). Finalized `docs/parser-revamp-comparison.md` with a feature-by-feature matrix: all 19 §19.4 render sections + every subsystem (parse/detect/health/protocol/ws/repository-local/timeline/offline-replay/internal-tx) confirmed at parity. Snapshot: 69 TS modules, 7,399 TS LOC, largest 541 lines, 223 tests.

### Found (the audit's payoff)
- **Untracked parity gap: the Help modal is not ported.** `shell.ts` renders the `❔ Help` button (`id="help-btn"`) but there is no `help-modal`, handler, or content anywhere in `src/` — clicking it does nothing. Legacy has a full content modal (HTML 191) + handler (254). Added as a **PRE-DEPLOY** task in `specs/tasks.md`; must close (or drop the button) before the deploy swap.

### Confirmed (already-tracked, not regressions)
- Parked: 3b-3b RemoteStart (local, buildable any time) · 4c Drive sync (needs hosted+OAuth) · 4e API download (needs EVSE hardware).
- Intentional source-canonical drift: Timeline 10-vs-11 markers (no Phantom) · Protocol 21-vs-24 checks. (`N/A` vs `undefined` is an improvement.)

### Deploy-readiness verdict
- **Not ready to swap yet.** Order: (1) port Help modal; (2) decide parked items (ship-without vs build 3b-3b first — it's local+cheap; 4c/4e genuinely need hosted/hardware); (3) reconcile/accept the two drifts in the spec; (4) optional golden-master output diff + runtime benchmark.

### Next
- Awaiting user steer: port the Help modal, build 3b-3b, or proceed toward deploy accepting the gaps.

## 2026-06-21 (night) — Async-parse responsiveness restored + Phase 6 decisions

### Decided (user)
- **Don't defer the async-parse yield** — restore it now (it's the gap tied to the parsing freeze).
- **Phase 6 consumption model = Option A: direct monorepo import** (recorded in `knowledge/decisions/2026-06-21-validation-engine-consumption-model.md`). Rationale: already a monorepo; Parser is browser/Vite; publishing now = speculative complexity. Promote to a workspace/published package later when the Node-based CMS needs a dual build.

### Implemented
- `parse/parseLinesAsync.ts` — chunked (1000-line) async parse driver: yields to the event loop between chunks (`setTimeout(0)` — a deliberate improvement over the legacy's fixed 10 ms, which added artificial N×10 ms delay) with a live progress bar (`shell.ts` `#progress-container`, faithful to legacy HTML 166–175). `parseLines` gained additive `startLine` offset + shared `internalTxMap` params so chunking preserves **absolute line numbers** (context-viewer) and the **backup-source "only if absent"** check sees global state. Output parity-tested vs synchronous `parseLines` (incl. the primary-then-backup-across-a-chunk-boundary case). `main.ts` switched to `parseLinesAsync` with the progress callback. +6 tests → **229**; `tsc` + `vite build` clean. Commit `272f871`.
- **Pushed `feat/parser-revamp` to GitHub** (was local-only, 91 commits at risk) — now backed up + upstream tracked.

### Process notes (gaps surfaced by user, partially addressed)
- Started actually using `knowledge/decisions/` (was empty). `knowledge/lessons-learned/` still empty — consolidation pending.
- The branch is pushed but **no PR opened** and **not merged to `main`** (the whole revamp still lives only on `feat/parser-revamp`; `main` has only the legacy HTML). Formal skill-chain Review/Test/Ship/Reflect phases not yet run.

### Next
- Help modal (last deploy blocker) · then Phase 6 prep (merge engine + parser into one tree) · decide deploy timing (defer-to-unified per earlier discussion).

## 2026-06-22 — Phase 6 prep: engine + parser co-located (merge)

### Did
- **Merged `feat/validation-engine` → `feat/parser-revamp`** so the OCPP Validation Engine (`src/services/validation/`) and the Parser (`src/app/`) live in one tree — the prerequisite for direct-monorepo-import consumption (decided 2026-06-21).
- Resolved 4 config conflicts: `package.json` (added `typed-ocpp@1.5.6`; kept Vite/Vitest tooling; **dropped the engine's standalone-package build tools esbuild/tsup** — not needed when Vite bundles the engine under direct import), `tsconfig.json` (kept the app config, added `src/services` to `include`), `package-lock.json` (regenerated via `npm install`), `skills/WORKFLOW.md` (unioned both feature sections).
- Verified merged tree: `tsc` clean, **254 tests green** (229 parser + 25 engine, incl. the `schema-drift` integration test = typed-ocpp ↔ 56 local schemas), `vite build` clean. Merge `8c5cc9f`, pushed.

### Note
- The app bundle is unchanged (196 kB) because the engine isn't *imported* yet — `typed-ocpp` (~822 kb) only gets pulled in once Phase 6 wires `validateBatch`. → Phase 6 must **lazy-load/code-split** the engine (same pattern as chart.js/xlsx).

### Next
- **Phase 6 spec** via the skill chain (`/plan-eng-review`) — must cite `docs/TYPEVALIDATION.md` §5 (API contract) / §6 (schema strategy) / §9 (L4 future), `knowledge/standards/ocpp-1.6/`, `requirements.md §19.7`. Then decide inline vs subagent build.

## 2026-06-22 — Phase 6: Validation Engine integration (L1–L3 build)

### Did (skill chain: Think ✅ → Plan ✅ → Build ✅; Review/Test pending)
- **Plan** via `/plan-eng-review` → arch doc `docs/superpowers/specs/2026-06-22-parser-phase6-validation-integration-arch.md`, with an "Inputs consumed" table mapping TYPEVALIDATION §5/§6/§9, `knowledge/standards/ocpp-1.6/` (J04), `requirements.md §19.7`, and the consumption decision to where each lands (so the prep is provably used). User confirmed 3 decisions: on-demand button · new section #20 · inline build.
- **Build** (inline): new `src/app/render/sections/validation.ts` — **Type-Aware Validation (L1–L3)** section (#20, after WebSocket Health; new capability beyond legacy parity). On-demand "Run" button **lazy-loads** `src/services/validation` (dynamic import → Vite code-splits typed-ocpp into a ~509 kB chunk; **main bundle stays 200 kB**) and runs `validateBatch(framesFromMessages(r.messages))`, rendering the `ValidationReport` (summary cards + violations table + unmatched-exchange table). Adapter `framesFromMessages` is a faithful pass-through (`OcppRawMessage ≡ RawFrame`). All report cells via `textContent` (engine /cso XSS note: violation message/detail may carry raw log payload). +7 tests; `renderResults` test updated 19→20. **261 tests**, `tsc` + build clean. Commit `7b33368`.

### Decisions / notes
- **Topology:** integrated by merging the engine **into the parser branch** (`8c5cc9f`), not engine→`main`, since deploy is deferred. The "engine PR merged to main" prereq was satisfied-in-spirit by co-location; revisit at deploy.
- **L4 stays a stub** (engine Phase 2). Bidirectional plan unchanged: L1–L3 engine→parser (done); L4 heuristics parser→engine (later).

### Next
- **`/review` + `/cso`** (OCPP checklist + security) then **`/qa`** (real-browser, sample logs — needs the user's browser) on Phase 6.
- Then deploy decision (Help modal + parked items). Parser still only on `feat/parser-revamp`; not merged to `main`.

## 2026-06-22 (eve) — Phase 6: validation metrics reworked to docs/Type Validation Metrics.md

### Why
User browser-checked the validation section: the flat Total/Valid/Invalid/Orphan cards were not comprehensible, and it wasn't self-evident L1/L2/L3 each ran. Provided `docs/Type Validation Metrics.md` with the recommended PCAP-style metric set.

### Verified first (verify-don't-assume)
Ran the engine on the real sample log + injected bad frames: L1 catches FRAME_INVALID (malformed / wrong MessageTypeId), L2 catches SCHEMA_VIOLATION (missing required field), valid frames pass; on the clean log: 580 frames, 100% valid, 288 paired, 4 orphan-responses, avg 105 ms. **Engine was correct — the render was illegible.**

### Implemented
- Pure `render/sections/validationMetrics.ts` (`computeValidationMetrics`) deriving the EXACT doc set from the existing `ValidationReport` (no engine change): §1 overall health, §2 L1 by frame-type (Invalid CALL/CALLRESULT/CALLERROR), §3 L2 (Schema Violations + missing/type/enum from Ajv `detail.keyword` + Max Violating Action), §4 L3 (Pairing + Result Match Rate), §5 orphans + rate, §6 latency (Avg/Min/Max/P95/P99 + Timeout Count/Rate + Healthy/Warning/Poor), §7 action-wise (Action/Calls/Success/Errors/Avg RTT — Success/Errors correlated to each Call's action via messageId), §9 weighted compliance score (40/30/20/10). Rewrote `validation.ts` render to show all of it (KPI cards + per-section blocks + action table). +16 validation tests → **270**; `tsc`+build clean; engine still lazy code-split. Commits `77ce777`, `15d5343`.

### Tracking note (self-correction)
Trackers had drifted (the metrics rework wasn't in tasks/roadmap/WORKFLOW/journal/comparison; test count + a stale `[ ]` Phase 6 line in WORKFLOW; a garbled fragment in tasks.md). All reconciled this session — keep them current at each sub-step (the discipline rule), don't batch.

### Next
- `/review` + `/cso` + `/qa` on Phase 6 (novel OCPP code). Then deploy decision (Help modal + parked items). Optional: per-action CallError attribution, "Total Errors = total violations" variant if preferred.

## 2026-06-22 (late) — Phase 6 validation: usability + correctness polish (session handoff)

### Did (responding to user browser feedback)
- **Reworked the validation render to the exact `docs/Type Validation Metrics.md` set** (was flat Total/Valid/Invalid cards → now per-layer L1/L2/L3 + orphans + latency percentiles + action-wise Calls/Success/Errors/RTT + weighted compliance score). Pure `render/sections/validationMetrics.ts`, derived from the engine `ValidationReport` (no engine change).
- **Investigated "Unmatched / mismatched exchanges (39)"** (user example `9189b856…` Authorize): NOT a correlation bug — the Call+Response ARE paired; the engine's `RESULT_MISMATCH` fires because `checkCallResult` schema-validates the response and the charger sent `idTagInfo.expiryDate: null` (OCPP 1.6 wants the field omitted, not null). Real, useful charger-compliance finding; the **label was the problem**.
- **Added per-row Reason + Preview/Download log-context** to the problem-exchanges + violations tables (same context-viewer Boot uses). `messageId → log line` mapped from parser frames (a mismatch points at the RESPONSE line). The offending line is **highlighted yellow** in the Preview (`buildSingleReport`/`buildDowntimeReport` wrap the marked line; download stays plain).
- **273 tests**, `tsc` + `vite build` clean; engine still lazy code-split (typed-ocpp ~509 kB chunk, main ~208 kB). Commits `77ce777`, `15d5343`, `db20e4c`, `d6456e5`.

### State for next session
- All on `feat/parser-revamp` (pushed; **NOT on `main`**, NOT deployed). CLAUDE.md status + all trackers reconciled this session.
- **Open / next:** `/review`+`/cso`+`/qa` on Phase 6 (skill-chain Review/Test not run). Then deploy decision (Help modal + parked 3b-3b/4c/4e). Optional engine refinement: split `RESULT_MISMATCH` into `RESULT_SCHEMA_INVALID` vs `RESULT_ACTION_MISMATCH`; per-action CallError attribution.

## 2026-06-23 — §4 CP-Initiated Operations Compliance (new sub-compliance report)

### Did
- **Brainstormed → spec → plan → built** a new spec-cited compliance report: OCPP 1.6J **§4 (Operations Initiated by Charge Point)**, the first of planned per-section "dedicated compliance" reports under Protocol Compliance. Source: `docs/business_case_compliance_check.md` (46 test IDs).
- **Pluggable rule-pack framework** in `src/app/compliance/` (`types.ts`, `runCompliance.ts` pure runner + severity-weighted score, `helpers.ts` incl. `byAction`, `rulepacks/cpInitiated.ts` = all 46 rules). Each rule is a self-describing object (id · specRef · invariant verbatim · severity · tier · `evaluate`).
- **All 46 rules, tier-tagged:** 🟢 deterministic (real pass/warn/fail), 🟡 heuristic (inference-based, FP-suppressed), 🔴 indeterminate (config-dependent → explicit `info` rows, excluded from score). Weights Critical 4 / Major 2 / Minor 1 / Informational 0; `warn` = half credit.
- **Mounted as a sibling top-level section** (new `SECTION_ORDER` entry after Protocol Compliance) — **zero edit to `protocolCompliance.ts`** (decision D5, lowest-risk), Excel export free via the registry, context Preview/Download (yellow highlight) via the existing idempotent handler. `analyze.ts` gains a `cpCompliance` field.
- **TDD throughout: +49 tests (273 → 322)**, `tsc` + `vite build` clean. Real-sample smoke on 2 logs: no crash, 46 results, valid scores (Sample log 92%; `BOOT-001` fail is correct — that log has no BootNotification).
- Caught + fixed a plan-time correctness issue: Authorize/DataTransfer/Diagnostics/Firmware/TriggerMessage are in the `Other` bucket, not their own `messageGroups` keys → routed via `byAction()`.

### Decisions
- Parallel to (not replacing) the existing 21 heuristic Protocol checks; intentional overlap accepted for now (D1).
- All 46 implemented up front, nothing silently dropped (D2). Rule-pack framework so §5/§3 packs are additive later (D3). Inline compute, no lazy-load (D4). Sibling section, no `protocolCompliance.ts` edit (D5).

### State for next session
- All on `feat/parser-revamp` (**not committed-pushed yet this session beyond local commits; NOT on `main`, NOT deployed**). Spec `docs/superpowers/specs/2026-06-23-cp-initiated-compliance-design.md`, plan `docs/superpowers/plans/2026-06-23-cp-initiated-compliance.md`.
- **Next:** push branch; `/review`+`/cso`+`/qa` on this §4 work (and still-pending Phase 6). Then the broader deploy decision. Future: §5 (CS-Initiated) pack reuses the same framework.

## 2026-06-23 (cont.) — §4 compliance reviewed+QA'd, large/multi-file crash fixed, run docs

### Did
- **§4 CP-Initiated Compliance** taken through the skill chain: **/review** (1 fix: BOOT-002 fail→warn — heuristic shouldn't hard-fail on mid-session captures) and **/qa** on both sample logs (1 fix: AUTH-003 deterministic→indeterminate — OCPP Authorize.req has no start-vs-stop intent, so it false-fired on every same-tag session). QA notes: `scratchpad/qa-cp-compliance/QA-NOTES.md`. Baselines: Sample 93% (BOOT-001 fail correct, 0 boots), TS0064 98%. Pushed.
- **Fixed a real production-class bug** (user report: "multiple log files → no results"). Used systematic-debugging. **Root cause:** spreading unbounded arrays into variadic calls — `push(...lines)`, `mergeParsed` `push(...messages)`, and especially `Math.max(...validLatencies)` in `analyzeWebSocketHealth` — throws `RangeError: Maximum call stack size exceeded` past V8's arg-count cap. The `MH0135` sample is **315,117 lines / 130,845 WS pings**, so wsHealth overflowed; `main.ts`'s **catch-less `try/finally`** swallowed the throw → `renderResults` never ran → blank. Confirmed via stage-by-stage instrumentation (wsHealth was the throwing stage) and an end-to-end repro (MH0135+Sample → now `msgs=9034, tx=25, no throw`).
- **Fix:** new spread-safe helpers `src/app/parse/concatChunks.ts` (`concatChunks` / `appendAll` / `maxOf` / `minOf`, all loop-based); replaced EVERY unbounded `push(...)`/`Math.max|min(...)` on the large-log path (main.ts, mergeParsed, wsHealth, processTransactions per-tx power/temp, connectorStats, energyDispense, meterValues, downtimeReport, cpInitiated boot rules); added a `catch` in `main.ts` so future failures show an on-screen error instead of silent blank. +3 regression tests (300k merge/concat, 300k-ping wsHealth). **325 tests**, `tsc`+build clean. Commit `6b22e00`, pushed.
- Documented **how to run the revamp** in `CLAUDE.md` → *How to run* (it's a bundled Vite app now: `npm run dev` localhost:5173, or `npm run build`+`npm run preview`, or deploy `dist/` to a static host; double-click no longer works — ES modules over file://). Offered `vite-plugin-singlefile` to restore the old single-file UX (not wired yet).

### Known-open bugs (NOT yet fixed)
- **Cross-file message-ID collisions** (found while debugging the above): `correlateMessages` keys OCPP message ids globally, but ids are only unique per-connection. Two logs reusing ids `1,2,3…` mis-pair → a transaction can be dropped (repro: 2 expected → 1). Produces *wrong/partial* results, not blank. Needs its own systematic-debugging pass (likely correlate per-file/per-connection before merge).
- **Phase 6 validation engine**: skill-chain `/review`+`/cso`+`/qa` still pending (only §4 compliance has been reviewed/QA'd).

### Next session — pick up here
1. Decide on the **cross-file id-collision** fix (own task).
2. Run **`/review`+`/cso`+`/qa` on Phase 6** validation.
3. Deploy decision: Help modal + parked 3b-3b/4c/4e + set `vite.config` `base` for GitHub Pages; optionally add `vite-plugin-singlefile`.
- All work on `feat/parser-revamp` (pushed; **NOT on `main`**, NOT deployed). HEAD `6b22e00`.

---

## 2026-07-04 — OCPP Simulator suite integration (Charger Emulator seed), Phases 0–4

**Discussed:** Integrating the standalone `OCPP Transaction Simulator Extended V3_17 Aug.html` (3 tabs: OCPP Simulator, Transaction Flow, CMS Log Parser) into the suite. Compared our OCPP Simulator vs SAP `e-mobility-charging-stations-simulator` (ours = interactive workbench; SAP = fleet load generator — complementary, adopt ours as Tool #3).

**Decided:**
- Scope = **OCPP Simulator (Tab 1) only** for now; Tabs 2/3 get their own specs later.
- Packaging **Option A** — bring into the Vite app as a second page entry (`simulator.html` → `src/simulator/`), importing the Validation Engine + Parser directly (required for schema-driven catalog R8 + Parser handoff R4; standalone HTML rejected).
- Expand to **all 28 OCPP 1.6J messages**, categorized by **Feature Profile + Direction** (training goal).
- **Schema-driven catalog** from `typed-ocpp`'s `OCPP16.schemas` (same source as the engine → zero drift) — not a hand-maintained list.

**Implemented (branch `feat/ocpp-simulator`):**
- Requirements baseline `specs/ocpp-simulator/requirements.md` (R1–R8), design spec, and task-by-task plan (all registered in md-registry).
- Phases 0–4: MPA scaffold; 28-message schema-driven catalog + profile/direction selector + schema forms; Simulator-Only mode with engine validation; CP Mode WebSocket (send/listen/heartbeat via `ExchangeTracker`); session→Parser handoff (`analyzeLogLines`+`renderResults`), round-trip verified (Start→Stop ⇒ 1 tx, id 555).
- Reference HTML archived; `CZ CMS Logs Sample.xlsx` → `data/samples/`.
- **356 tests green** (81 files; +31 simulator), `tsc`+`vite build` clean.

**Two in-repo API facts confirmed during build (plan-flagged risks):** Parser `Transaction.id` (not `.transactionId`); `renderResults(container, result)` mounts in place. The engine emits a generic `[L2] schema violation` message for missing-field cases (test relaxed to assert the L2 layer, not exact text).

**Next session — pick up here**
1. Optional **Phase 5** training polish (defaults/descriptions overlay, per-profile lesson blurbs).
2. **Review/QA** the simulator; then **finishing-a-development-branch** (PR).
3. Later: Tabs 2 (Flow replay) & 3 (CMS parser) — own specs.
- Simulator work on `feat/ocpp-simulator` (branched off `feat/parser-revamp`; **NOT on `main`**, NOT deployed).

---

## 2026-07-04 (later) — Unify decision: simulator is ONE tool, not a separate page

**Trigger:** On browser test, the user saw the simulator on its own URL (`simulator.html`) and flagged the mismatch — their intent was **one tool**, the simulator integrated with the Parser, not a separate app.

**Decided (via /design-consultation):** Reverse the "second Vite page" approach. Adopt a **two-tier navigation shell** grouped by function:
- Tier 1: `Parser · Emulator · CMS`; Tier 2: contextual sub-tabs (shown when a group has 2+ views).
- Placement locked for the whole future suite: **Parser** › Client Log Parser (now) · CMS Log Parser (future Tab 3); **Emulator** › OCPP Simulator (now) · Transaction Flow Simulator (future Tab 2); **CMS** › CSMS dashboard (future Tool #2, slot reserved).
- **Deciding factor:** CP-Mode holds a live WebSocket → per-view state must persist across switches → rules out an embedded/re-rendered section; tabs win.
- Future views appear as disabled "coming soon" until built.

**Docs updated (before coding):** design spec §4 rewritten + new §4.1 (IA) + §5.1 nav-shell modules; requirements R9 added; roadmap detail + Phase 6; WORKFLOW Phase 6; this journal; decision record `knowledge/decisions/2026-07-04-unified-nav-shell.md`.

**Next:** implement Phase 6 — nav shell in `src/app/nav/` (navConfig + navShell), remove `simulator.html`, revert Vite to single-entry. All `src/simulator/*` modules unchanged.

---

## 2026-07-04 (impl) — Phase 6 built + browser-test fixes; simulator is now one unified tool

**Implemented Phase 6 (unify):** `src/app/nav/navConfig.ts` (view registry — the single place to activate future views), `navShell.ts` (two-tier nav: Tier-1 `Parser·Emulator·CMS` + contextual Tier-2 sub-tabs; lazy-mount + keep-alive so CP-Mode's WebSocket survives switching; last view persisted in localStorage), `mountParser.ts` (extracted the former `main.ts` Parser bootstrap). `main.ts` now boots the nav shell. Removed `simulator.html` + `src/simulator/main.ts`; reverted Vite to single-entry. Future views (CMS Log Parser, Transaction Flow, CSMS) render as disabled "(soon)" placeholders.

**Then verified in the browser (dev server; Chrome extension not connected, so the user eyeballed it) and fixed three things the user caught:**
1. **White-on-white dropdowns** — the simulator's form controls had no colors; in the Parser's dark theme they rendered invisible. Added `bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100` (+ border) across `selector.ts`/`paramForm.ts`/`shell.ts`.
2. **Layout didn't match the original** — restructured `shell.ts` to two columns: Operating Mode (top) · left = OCPP Message → **Description** → **Message Format** → Validation · right = Request Parameters (Editable) → Request Payload → Response Payload · **OCPP Message Log** (bottom, full width). Added per-message **Descriptions** (all 28, `catalog/descriptions.ts` → `MessageDef.description`) + a **Message Format** renderer (`render/messageFormat.ts`). Kept the Profile/Direction filters (R7) in the message-picker slot.
3. **Theme toggle didn't work / missing on non-Parser tabs** — the `🌓 Theme` button lived only in the Parser view and was wired before it mounted. Added a **global toggle in the nav bar**, wired via a **delegated** document listener; made `initTheme()` idempotent (a test caught a double-toggle from stacked listeners).

**State:** **370 tests green** (85 files), `tsc`+`vite build` clean. Branch `feat/ocpp-simulator` (~30 commits), **not merged**. Trackers (roadmap, WORKFLOW, tasks, this journal) brought current.

**Next session:** Review/QA the simulator, then finish the branch (merge to `feat/parser-revamp` or PR). Future: Tabs 2/3 (Transaction Flow, CMS Log Parser) + CMS — own specs, homes already reserved in `navConfig`.

---

## 2026-07-05 — 2 new §4 compliance checks (from field log) + 2 Status-section UI fixes

**Context:** User is building a growing, field-driven compliance ledger. Confirmed we already maintain it: `docs/business_case_compliance_check.md` (the registry) + `src/app/compliance/rulepacks/cpInitiated.ts` (the rules). Sample logs go in `data/samples/`. Field log this session: `data/samples/DC060 After Error Charging happening.txt`.

**Implemented (on `feat/parser-revamp`):**
- **STATUS-010** (Major, heuristic) — a connector's MeterValues SHALL be preceded by a `StatusNotification(status=Charging)`. Flags charging resuming after an errored session with no Charging status. DC060 has 146 MeterValues, 0 Charging → warns.
- **STATUS-011** (Major, heuristic) — the same fault (`info`+`vendorErrorCode`) SHALL report a consistent `errorCode`. DC060 reports `BMSCommunicationTimeout`/`vendorErrorCode:1` as both `EVCommunicationError` and `OtherError` → warns.
- **STATUS-012** (Major, heuristic) — the complement of STATUS-011: a given `errorCode` SHALL map to a consistent `vendorErrorCode` (e.g. `EVCommunicationError`→88 regardless of status). DC060 triggers it too: `OtherError` reported with vendorErrorCode `1` (BMSCommunicationTimeout) and `19` (PowerFailure). *(Note: `OtherError` is a catch-all, so this warn is a "review this" signal, not a hard fault — hence heuristic/warn.)*
- Registry updated (§4 pack **46 → 49 rules**); count assertions bumped. **335 tests.**
- **UI #3** — Status Notifications "🔴 Error Code Frequency" table now shows **Info** + **Status** columns (rollup keyed on `info` so vendor faults stay distinct).
- **UI #4** — Repository **Load & Analyze** now shows a spinner ("Loading & analyzing…") + scrolls + yields a frame before the blocking analyze, so users don't re-click.
- +6 tests incl. a DC060 field-case regression (`compliance.dc060.test.ts`). **332 tests**, `tsc`+build clean. Commit `309d780`.

**How compliance grows (recorded for future):** each field case = 1 row in `docs/business_case_compliance_check.md` + 1 rule in `cpInitiated.ts` + a `data/samples/` fixture, same commit. Next IDs continue the per-message series (STATUS-012, …).

---

## 2026-07-06 — Consolidated: merged `feat/parser-revamp` → `feat/ocpp-simulator`

Brought the compliance work (STATUS-010/011/012 + Error-Code-Frequency Info/Status + Load & Analyze spinner) onto the unified-tool branch so the Emulator **and** the new Parser compliance/UX all run in one app at `localhost:5173/`. Resolved doc conflicts in `tasks.md` + this journal (kept both histories). This branch (`feat/ocpp-simulator`) is now the superset going forward.

---

## 2026-07-08/09 — CMS Log Parser: Excel ingestion adapter (Phases A–C), branch `feat/cms-log-parser`

**Context:** Build the reference HTML's CMS parser (Tab 3) into the suite. User's framing: same parser as the Client Log Parser, but the log is a customer **Excel** file of actual CMS-side OCPP logs; today only customer **CZ** (`data/samples/CZ CMS Logs Sample.xlsx`), must scale to other customers later; and all relevant Client-parser sections must appear. Follow `operating-principles.md` (the archive's version wasn't modular).

**Key insight (why it's a port, not a rewrite):** the whole analysis + 21 render sections run on one contract — `ParsedLines = { messages, events, alerts, internalTxMap }`. So CMS = a new **ingestion adapter** feeding the existing `analyze()`/`renderResults()`. The archive re-parsed each message type into bespoke structures (the non-modular code the user flagged); we discarded that and reused the modern pipeline.

**Decisions (user-confirmed):** D1 derive **Alerts from StatusNotification `errorCode ≠ NoError`** (Excel has no free-text event/alert lines); D2 timestamps stored **UTC ISO**, rendered **IST** (the render layer already does UTC→IST — proven by the sample: Request Time IST = payload `currentTime` UTC + 5:30); D3 **synthesize** one context-viewer line per row.

**Verified-not-assumed findings:** several active modules (`detectDowntimes`, `render/timeline`, `compliance/cpInitiated`) filter on `direction === 'sent'` from the **charger's perspective** → CMS adapter maps OCPP §4 (CP-initiated) requests to `'sent'`, §5 (CS-initiated) to `'received'`. Debug-Info computes its log span by scanning `rawLogLines` for `[timestamp]`; leading synth lines with IST skewed it +5:30, so they now lead with canonical UTC (Phase-C fix).

**Built (`src/app/cms/`):** `timestamps · directions · rowsToParsedLines · adapters/cz · registry · parseCmsWorkbook · mergeCmsParsed · renderCmsShell · mountCmsParser`. Nav `cms-logs` enabled, **lazy-mounted** so xlsx (429 kB) + CMS subtree is a separate chunk. Multi-customer scales by adding one adapter (registry seam; guide in spec §4c).

**Audit on real CZ sample (3204 msgs, MH0055):** 12 transactions, 1082 meter values, **12 derived alerts** (OtherError/EVCommunicationError/InternalError), connector stats, downtime, compliance — all populate. Debug span 2025-08-08 00:00 → 2025-08-09 01:59 IST (25h 58m), matching the file range. Empty-by-nature: Events, Power/Emergency sync, WebSocket Health (Excel lacks that source data).

**State:** **410 tests** (TDD throughout), `tsc` + `vite build` clean. Commits `68944bc` (A), `fc1411e` (B), `73e06a2` (C fix), `9daccbd` (spec). Spec `docs/superpowers/specs/2026-07-08-cms-log-parser-design.md`.

**Next:** Phase D tracker docs (this) → `/review` + `/qa` → PR. Out of scope v1: non-CZ adapters, cross-file id-collision bug, CSMS dashboard.

---

## 2026-07-09 (later) — Analysis Web Worker: large-file freeze fix (assessment P1), branch `feat/perf-analysis-worker`

**Context:** The read-only engineering assessment (docs/engineering-assessment-2026-07-09.md) scored Performance 7/10, finding P1: `analyze()` runs synchronously on the main thread (text path), and the CMS path blocks entirely (XLSX.read + analyze) — large files freeze the tab. User chose approach A (Web Worker) over chunk-yield; new branch off `feat/cms-log-parser`.

**Built (7 TDD tasks, inline execution):** `src/app/worker/` — **protocol.ts** (pure `handleRequest` for both pipelines, progress labels, `AnalysisPayload` with CMS outcomes), **analysis.worker.ts** (dispatch-only), **runner.ts** (per-run spawn, progress relay, direct in-thread fallback when Worker unavailable, cancellation via terminate on re-run). Both mounts (`mountParser`, `mountCmsParser`) now call `runAnalysis({kind, files})`; `File` objects cross the worker boundary (structured-cloneable) so file READING also leaves the main thread. rAF yield before render so "Rendering…" paints.

**Deliberately untouched (regression protection):** the pure core, the whole render layer, repo Load & Analyze (FR-189, stays in-thread), Simulator→Parser handoff (R4) — enforced by a diff check in the plan's Task 7.

**Guarantees shipped as tests:** structured-clone integrity of `AnalysisResult` on both real samples (pins the worker boundary forever); CZ QA baselines (3204 msgs/12 tx/12 alerts) re-asserted through the worker protocol; error-message fidelity (verbatim "Unrecognized CMS log format…"); autosave still called; progress format preserved.

**Gotchas recorded:** jsdom's `File` lacks `.text()`/`.arrayBuffer()` (stand-in objects in tests; real browsers fine). Vite bundles xlsx INTO the worker chunk now (CZ adapter statically imports it) — main bundle unaffected; Export-to-Excel lazily pulls the worker chunk (~80 kB more, cached).

**State:** **421 tests** green, `tsc` + `vite build` clean, `analysis.worker-*.js` separate chunk. Commits: protocol text `1628e13` · CMS `9ad66d9` · clone test `a70fb38` · worker+runner `c33049f` · mountParser `1bcdac1` · mountCmsParser `6d05beb`.

**Next:** user browser verification (large log + CZ sample: UI interactive; repo Load&Analyze + Sim handoff unaffected) → `/review` → `/qa` → PR into `feat/cms-log-parser`. Note: CMS branch's own PR (into `feat/ocpp-simulator`) still on hold for the same browser check.

---

## 2026-07-10 — CMS multi-customer: Mahindra adapter + registry-driven selector, branch `feat/cms-multi-customer`

**Context:** Add a second CMS customer (Mahindra) to the CMS Log Parser, plus a per-customer selector, with the invariant that **output is identical** (same 21 sections/analysis) — only ingestion differs. User dropped `data/samples/Mahindra CMS Log Sample.xlsx`. Also merged PR #3 (CMS parser) and PR #4 (analysis worker) into `feat/ocpp-simulator` first, collapsing the branch stack.

**Mahindra format:** header row 0; cols `Event Name | Event Type | Request | Response | Created On`. Paired req/resp like CZ (so `cmsRowsToParsedLines` unchanged). Event Type (Charger-CMS/CMS-Charger) merely confirms direction — the shared §4/§5 action-based mapping already derives it.

**The hard finding (systematic investigation, not a guess):** Mahindra's "Created On" is an Excel **serial number** whose decoded date is month/day-swapped — serial 46060 = Feb 7, but the OCPP payload for that row proves the event is **2 July**. Verified by cross-checking every row's Created-On against its payload date: **d/m interpretation matched 295/460, m/d matched 0/460**. So: the adapter reads Created On as the **display string** ("2/7/26 15:19") via `sheet_to_json(raw:false)` and parses it as **d/m**, and `mahindraTimestampToUtcIso` **rejects raw numeric serials** (they'd give the wrong month). `parseCmsWorkbook` keeps **`cellNF:true`** (cheap — format codes are interned) so the display string is available under the otherwise memory-lean read. Confirmed IST: 15:19 vs payload 09:49Z = +5:30.

**Design changes:** extracted shared sheet helpers to `adapters/sheetUtils.ts` (CZ refactored onto it, DRY); **tightened CZ `detect`** to require `…String`/`Sr No.` so it no longer wrongly matches Mahindra (cross-detection tests pin no ambiguity); added **`CmsFormatAdapter.toUtcIso`** so each customer owns its timestamp format (threaded through `cmsRowsToParsedLines`, default = CZ for back-compat); `registry.getAdapter(id)` + `parseCmsWorkbook({adapterId})` with a **detect-gated** forced path (wrong customer → sharp error); worker protocol threads `adapterId`; **registry-driven selector** (`Auto-detect · CZ · Mahindra`) so future customers appear with zero UI change (Option B).

**QA (headless, both real samples):** CZ unregressed (3204 msgs / 12 tx / 12 alerts / MH0055); Mahindra auto-detects (458 heartbeats, charger MPCMHDC029_639, all timestamps 2026-07 not the Feb serial trap); forcing CZ on Mahindra errors sharply; forcing Mahindra on Mahindra works. **440 tests**, `tsc`+`vite build` clean.

**Next:** push + PR into `feat/ocpp-simulator`. MSIL out of scope until its sample arrives (framework + selector slot ready). Also still open from prior session: the "Transaction Analysis Graphs not coming" report — instrumented (errors now surface) but root cause needs the user's browser observation of what the graphs area shows for a specific transaction.

---

## 2026-07-10/11 — CMS multi-customer follow-ups: heartbeat fidelity + MeterValues truncation recovery; PRs #3/#4 merged

**Branch train collapsed.** PR #3 (CMS Log Parser) and PR #4 (Analysis Web Worker) merged into `feat/ocpp-simulator` — the integration branch now carries Simulator + Validation Engine + CMS parser + worker. Active work continues on `feat/cms-multi-customer` (PR #5, open). **460 tests.**

**Heartbeat Response Time (ms)** (`11029b1`, `67544ad`) — was hardcoded `N/A` (legacy parity), and `correlateMessages` discarded the CallResult timestamp (kept only its payload), so latency was uncomputable. Now correlation also attaches `responseTimestamp`; Heartbeats renders `respTs − reqTs`. Per user decision on the equal-timestamp case: **CZ shows 0** (it has separate Request/Response Time columns, equal at second granularity), **Mahindra shows N/A** (single `Created On` — the adapter leaves `responseTime` blank so no fake 0), **client shows real ms**. The distinguishing signal is at the adapter (does the format provide a separate response time), not a diff heuristic. Verified: client 118/45/67…, CZ 0×306 + 1000×5, Mahindra N/A×458.

**Heartbeat Summary** (`8cdfe56`, `416c18c`) — new panel atop the Heartbeats section (Client + both CMS customers via shared `renderResults`). Key insight: key off `Heartbeat.conf.currentTime` (the authoritative CS timestamp, present in 100% of responses across all three formats) so it works even for Mahindra, which lacks separate req/resp wall-clock times. `health/heartbeatSummary.ts` (pure, worker-clone-safe): Total · Avg/Min/Max interval (s) · Expected = `BootNotification.conf.interval` (CZ 300, Mahindra 120) else median · flags intervals ≥1.5× expected as likely missed heartbeats with a `round(interval/expected)−1` estimate. Verified: Client avg 85.4s with a 1501s gap (~24 missed); CZ configured 300s; Mahindra configured 120s (matches the user's 120.088s example, 240.9s gap ~1 missed). Spec `docs/superpowers/specs/2026-07-10-heartbeat-summary-design.md`.

**MeterValues truncation recovery** (`74bcc26`) — user reported Mahindra Meter Values / graphs / Transaction Summary / Debug-Info counts all blank. Systematic-debugging root cause (confirmed in the raw xlsx XML, not a parser bug): **the Mahindra export truncates long cell values at exactly 4000 chars**, cutting large MeterValues payloads mid-JSON → all 39 failed to parse (unterminated). Fix `cms/repairTruncatedJson.ts`: scans for the last position where every open bracket can be cleanly closed, truncates there, appends the outstanding closers; guarded by `JSON.parse` so it recovers the valid prefix or returns null (row skipped) — strictly never worse. `cms safeParse` retries via it on parse failure. Verified: Mahindra MeterValues **0 → 39** (897 readings, 23/msg, all 8 measurands), 2 transactions with meter data, graphs/pivot populated; CZ unchanged (1082). **The tail beyond 4000 chars is genuinely lost — a source-export limit** (told user: fix at Mahindra's export, or optional Debug-Info "N truncated" note).

**Also confirmed fixed by user:** the earlier "Transaction Analysis Graphs not coming" report (my error-surfacing instrumentation in `renderTransactionGraphs`, `3b91d7d`).

**Deployment** — user asked about going live at https://spsrathore-code.github.io/ocpp-parser/ ; I explained Pages currently serves `main` (legacy) raw with no build, so the Vite app needs a GitHub Actions build→Pages workflow + `base:'/ocpp-parser/'` (keep Tailwind Play CDN for v1). **Parked by user for now.**

**Next:** merge PR #5 when ready; deploy (parked); Phase 6 validation `/review`+`/qa`; cross-file id-collision bug; optional MSIL adapter + Debug-Info truncation note.

---

## 2026-07-11 — 🚀 DEPLOY SWAP: OCPP Suite revamp is LIVE on GitHub Pages

The revamp replaced the legacy single-file parser at **https://spsrathore-code.github.io/ocpp-parser/**. User decisions: full swap to `main`; go live now.

**Mechanism:** Pages previously served `main` (legacy HTML) raw — no build. The Vite app needs building, so added a **GitHub Actions build→Pages** workflow (`.github/workflows/deploy.yml`: install → `npm run build` → upload-pages-artifact → deploy-pages, on push to `main`) + `vite.config` **`base:'/ocpp-parser/'`** (production build only; dev/preview stay `/`). Switched Pages "source" to GitHub Actions (`build_type: workflow`) via `gh api`.

**Sequence:** tagged legacy `main` as `legacy-parser-v2026.05.14` (rollback) → merged PR #5 (`feat/cms-multi-customer`) into `feat/ocpp-simulator` → PR #6 (`feat/ocpp-simulator` → `main`, the deploy swap) → workflow deployed.

**CI hiccup (systematic-debugging):** first two runs failed — `npm ci`/`npm install` on the Linux runner couldn't find `@rollup/rollup-linux-x64-gnu` because the committed `package-lock.json` was generated on Windows (npm/cli#4828 optional-deps bug). Fixed (PR #7 then #8) by `rm -f package-lock.json && npm install` in the workflow (fresh platform-correct resolution — the exact remedy the error prints). Third run succeeded.

**Verified live:** `curl` of the site returns the Vite `index.html`; index + entry chunk (`/ocpp-parser/assets/index-*.js`) + the analysis-worker chunk all 200, all `/ocpp-parser/`-prefixed (the base-path correctness that most Pages deploys get wrong). Build output pre-verified locally before the swap.

**Deferred (v1, noted in `docs/DEPLOY.md`):** Tailwind Play CDN kept at runtime (compiling it would break the dynamic `text-${color}` classes without a safelist — hardening step later); Google Fonts CDN; no SRI (assessment S3).

**Next:** compiled-Tailwind hardening; fix cross-file id-collision; Phase 6 validation `/review`+`/qa`; optional MSIL adapter + Debug-Info truncation note. Suite is now shipping from `main` = production.

## 2026-08-24 — Mahindra CSV adapter + a live CSMS blackout found in the logs

### Discussed

Started as "add another parser for Mahindra" plus a request to process a QFLEX
device-log bundle. The bundle turned out not to be a CMS export at all but a
charger-side Linux log set (28 services, 692 MB uncompressed, three different log
formats). Reading it surfaced a live production incident, so the session split into
two tracks: diagnose the outage first (user's call), then build the parser.

Mid-session the user supplied the actual target — a Mahindra CMS **CSV** export —
and later a 20-sheet analysis workbook (`DC052_ DC053 CMS Logs.xlsx`).

### Decided

- **Diagnose before building.** The outage was costing real availability; the parser
  could wait an hour.
- **A separate CSV adapter, not a branch inside the xlsx one.** The xlsx path carries
  an Excel date workaround the CSV must not inherit (below).
- **Uptime/outage analysis is out of scope** for this branch. `Analysis_Spec_MD` in
  the workbook specifies a full method (300 s fault clustering, Offline windows from
  BootNotification gaps, overlap-adjusted uptime %, PowerFailure 60 s simultaneity,
  14 reconciliation gates, a validation baseline). It becomes its own spec — and its
  gates give ready-made acceptance tests against known-good DC052/DC053 numbers.
- **Dropped the spec's runtime `currentTime` cross-check** — the validation was done
  offline and encoded as a unit test; a per-row regex for a counter nobody reads is
  speculative. Recorded as a deviation in the plan.

### Implemented

**🔴 Incident diagnosis (no code).** `qnch-box-mahindra-180` last got a CSMS reply at
2026-08-21 13:40:05 UTC, then sent **3,561 BootNotifications over 43.3 h with zero
answers**. The trigger was an unanswered Heartbeat; the socket then closed `1011` in
*both* directions. Ruled out charger-side causes with evidence: network up in 11/11
samples across the break window; **3,788 WebSocket upgrades succeeded** during the
outage (HTTP 101, `ocpp1.6` negotiated); firmware `1.V.140` had run fine for 4h23m
before; CSMS URL unchanged; the only local config edit landed 23 s *after* the CSMS
had already gone silent. Prior log generation shows 29,010 replies over 14 months, so
it is a regression, not a never-worked case. A second charger, `MPCKADC060`, went
silent the same day at 11:34 UTC — its CMS export, downloaded 2 days later, ends on an
unanswered `TriggerMessage`. Two chargers, same day, same CSMS ⇒ platform-side.
Report published as an artifact.

**Mahindra CSV adapter** (`feat/cms-mahindra-csv`, 17 commits, +40 tests). Spec → plan
→ 10 TDD tasks executed subagent-driven with per-task review. Three measured findings
shaped it, all established from the real 27,402-row export *before* any code existed:

1. **`Event Type` is unreliable for direction** — mislabels 77 CSMS-initiated rows
   (42 RemoteStart, 29 RemoteStop, 6 TriggerMessage) while every CP-initiated row is
   correct. Trusting it looks right on 96% of rows and then mis-threads every
   remote-start. This *validated an existing decision* rather than introducing one:
   `directions.ts` already derived direction from the action. We added a counter and
   surfaced it in the banner as a CMS-side data-quality signal.
2. **The CSV needs its own date parser.** The xlsx adapter parses `d/m` because it
   reads Excel's *reformatted* display string; the CSV is the raw portal string in
   `MM/DD/YYYY`. Validated against payload `currentTime`: **M/D 4763/4763, D/M
   0/4763**, none ambiguous — the same method the xlsx parser was validated with.
   Reusing it would not fail loudly: `08/21/2026` becomes month 21 and rolls to 2027.
3. **The 4,000-char truncation cap applies to CSV too**, and MeterValues is 21,370 of
   27,402 rows, so `repairTruncatedJson` is load-bearing.

Verified on the real 102.8 MB file: 54,796 messages, 77 mismatches, chronological,
67 transactions, **21,370/21,370 MeterValues recovered**, 6.1 s parse / 0.8 s analyze.

**Review caught two real defects the tests had not:** a lone `\r` outside quotes was
swallowed without ending the row, merging two rows into one (`'a,b\r1,2'` →
`[['a','b1','2']]`); and adding CSV entries to the customer dropdown made a
previously-unreachable "Unknown customer" error reachable, because `adapterId` was
forwarded to whichever path the file extension picked. The plan had deferred the
second to a task that never actually fixed it — a planning miss, now fixed by falling
back to auto-detect for the non-owning path.

### Found along the way (not fixed — logged in `specs/tasks.md`)

- **`package-lock.json` is missing all cross-platform optional binaries.** Regenerating
  adds 46 entries (23 `@rollup/*`, 23 `@esbuild/*`) with **zero version changes**,
  including `@rollup/rollup-linux-x64-gnu`. That absence is the root cause of the CI
  workaround (`rm -f package-lock.json && npm install`), which means **production
  deploys currently resolve dependencies unpinned**. Committing the regenerated file
  should restore a pinned `npm ci` — needs its own branch and a CI run to prove it.
- **The suite is red on Node ≥ 25.** 16 tests across 8 DOM files fail with
  `localStorage.getItem is not a function`: Node 25 ships an inert global
  `localStorage` that shadows jsdom's. CI pins Node 20, so it passes there. Identical
  failures on `main` — not caused by this branch.
- **`DC052_ DC053 CMS Logs.xlsx` promises 31 sheets but contains 20.** All 13 STUDY 2
  (DC041/DC042) sheets are missing, including the only `Session_Analysis` in the
  method. Its `Created On` column is also live proof of the m/d swap: the range reads
  `08/13/2026 → 2026-11-08` despite an 11–20 Aug window, because Excel corrupts only
  the dates whose day is ≤ 12.

### Process note

Ran two writing subagents concurrently once; they share a working tree and git index,
and one agent's staged files were swept into another's commit. Content was fine,
commit message under-described it. Single writer at a time from here.

### Next

- `/review` → PR → merge `feat/cms-mahindra-csv`.
- Escalate the CSMS blackout to Mahindra; get a third charger's log to establish scope.
- Uptime/outage analysis spec from `Analysis_Spec_MD`, using its 14 gates as tests.
- Lockfile fix on its own branch; Node-version pin or a vitest localStorage shim.
