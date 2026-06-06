# Project Journal

Chronological record of significant decisions and sessions. Detailed change history is in `../CHANGELOG.md`; this is the higher-level narrative.

## 2026-06-06 — SSOT consolidation, suite direction, repo standardisation

- **Consolidated** ~18 scattered MD files into a single source of truth (`specs/requirements.md`, formerly `OCPP_Parser_Master.md`), reconciled against the actual tool source (v2.7): documented the downtime engine + 4 fault types, Events/Alerts/Debug sections, the architecture & data model, and the diagnostic knowledge base (L-001 Phantom, L-002 Missing Stop, L-003 Stuck-in-Preparing).
- **Direction set:** this is an **OCPP suite mega-repo** — Validation Engine, CMS, Charger Emulator, Training Emulator, Parser.
- **Validation Engine decided:** adopt **`typed-ocpp`** (MIT) for type-aware L1–L3 validation; spec written (`docs/TYPEVALIDATION.md`). `typed-ocpp` bundled schemas = runtime source; the 56 local `.json` = canonical reference + CI diff-check.
- **Emulator find:** SAP `e-mobility-charging-stations-simulator` recorded as the Charger-Emulator candidate.
- **Repo standardised** to `knowledge/project-standard.md`: full tree built, all artifacts placed, governance files (`CLAUDE.md`, `README.md`, `.gitignore`) authored.
- **Note:** the legacy `OCPP Client Parser MD Collection/` folder was emptied but couldn't be auto-deleted (it is the shell's locked working directory) — git-ignored; delete manually.

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
