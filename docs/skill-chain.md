# Skill Chain — OCPP Tool Suite

> **Think → Plan → Build → Review → Test → Ship → Reflect**
> Inspired by [gstack](https://github.com/garrytan/gstack). Adapted for OCPP 1.6J / Ador Digatron context.
> Design decided: 2026-06-06. See `knowledge/project-journal.md` for session history.

---

## 1. Why this exists

Without a defined workflow, work happens randomly. Features get built before they are understood. Code ships without review. Lessons disappear between sessions.

The skill chain enforces a consistent, traceable workflow for every piece of work in this repo — from a Parser bug fix to building the Validation Engine from scratch. Each phase produces a documented output that the next phase reads. Nothing falls through the cracks because every step knows what came before it.

Key design goals:
- **Control:** You invoke every step manually. Nothing runs behind your back.
- **Visibility:** Every skill announces its phase, checks prerequisites, and tells you what comes next.
- **Traceability:** Every session is logged. Every decision is recorded. Future-you never has to rediscover today's conclusions.

---

## 2. The 7-phase chain

```
THINK ──→ PLAN ──→ BUILD ──────→ REVIEW ──→ TEST ──→ SHIP ──→ REFLECT
  │          │        │                │          │        │         │
/office   /plan-   /investigate   /review    /qa      /ship    /retro
/hours    eng-     /design-       /cso       /qa-     /doc-    /learn
/spec     review   consultation   /design-   only     release
/autoplan /plan-   /design-       review     /bench-  /doc-
          ceo-     shotgun        /devex-    mark     generate
          review   /design-html   review             /land-
          /plan-   ──────────                        and-
          design-  /build-                            deploy
          review   complete ◄──                      /canary
          /plan-   (checkpoint:
          devex-   marks Build ✅,
          review   triggers Review)
```

**The rule:** No phase begins until the previous phase is marked complete in `skills/WORKFLOW.md`. You can skip a phase by explicitly acknowledging it — but the state file must reflect the skip.

---

## 3. Complete skill inventory (28 skills)

> **Two levels of detail — this doc is the overview only:**
>
> | File | Purpose | Detail level |
> |---|---|---|
> | `docs/skill-chain.md` (this file) | Design overview: what every skill does in one line | Summary |
> | `skills/[name]/SKILL.md` | Executable workflow: the actual steps Claude follows, full OCPP rules, edge cases, outputs | Full detail |
>
> The OCPP adaptations below cite specific spec sections from `knowledge/standards/ocpp-1.6/` and `specs/requirements.md`. Entries marked **for Parser:** apply only to the Parser; unmarked entries apply across all 5 suite tools. Full tool-conditional routing logic lives inside each `skills/[name]/SKILL.md` — this table is the one-line pointer, not the full rule.

### Phase 1 — Think
*Validate the idea before writing a line of code.*

| Slash command | Purpose | OCPP adaptation |
|---|---|---|
| `/office-hours` | Six forcing questions that reframe the problem; pushes back on framing; generates alternatives | Asks which of the 6 Feature Profiles (§3.3) this touches; flags any transport-layer assumptions that conflict with J03–J07 |
| `/spec` | Turns vague intent into an executable spec with success criteria | For Parser: references `specs/requirements.md` FR numbering and 19-section structure; for all tools: cites `knowledge/standards/ocpp-1.6/` as spec SSOT (§7 enums, §9 config keys, J04 message envelopes) |
| `/autoplan` | Runs office-hours + plan-ceo-review + plan-eng-review in one go for well-defined features | Shortcut for small, well-understood features where all three Think/Plan questions have clear answers |

### Phase 2 — Plan
*Lock architecture, data flow, and test plan before building.*

| Slash command | Purpose | OCPP adaptation |
|---|---|---|
| `/plan-ceo-review` | Scope review: Expansion / Hold / Reduction — is this the right problem? | Identifies which of the 5 suite tools (Parser / Validation Engine / CMS / Charger Emulator / Training Emulator) this feature belongs to before committing scope |
| `/plan-eng-review` | Engineering lock: architecture, data flow, edge cases, diagrams, test plan | Validates CALL[2]/CALLRESULT[3]/CALLERROR[4] envelope design (J04 §4.1.3), 10 error codes (J04 Table 7), 9 ChargePointStatus values (§7.7), 38 config keys (§9); for Parser: enforces 9813-line single-file constraint and additive-only architecture rule (requirements.md §§11–16 pattern) |
| `/plan-design-review` | UI/UX review for Parser sections: rates design 0–10, detects over-engineering | For Parser: checks requirements.md UI/UX requirements (UI-001–UI-014), 19-section layout, per-section table column definitions (§7.1–§7.5); for other tools: that tool's UI spec when available |
| `/plan-devex-review` | Developer/operator experience review: who uses this, what is their workflow | Persona = charger operator / field engineer; reviews CLI/API/UI ergonomics for the active tool's primary user |

### Phase 3 — Build
*Implementation. Has a completion checkpoint command — `/build-complete`.*

| Slash command | Purpose | OCPP adaptation |
|---|---|---|
| `/investigate` | Systematic root-cause debugging; traces data flow, tests hypotheses | Applies synchronicity rule (J04 §4.1.1: one outstanding CALL per sender), UniqueId match requirement (J04 §4.1.3), §4.9 9×9 status transition matrix; for Parser: traces MessageId correlation and chunked parsing (1000 lines/chunk) |
| `/design-consultation` | Build a complete design system from scratch for a new section | For Parser: follows requirements.md §6 (UI-001–UI-014), section template, colour scheme, export-to-Excel format |
| `/design-shotgun` | Generate 4–6 UI variants side-by-side for comparison | For Parser: variants must satisfy UI-001–UI-014 and match per-section table column definitions from requirements.md §7 |
| `/design-html` | Convert approved mockup to production HTML/CSS | For Parser: single HTML file `src/app/OCPP_Parser_Complete_ 21 Jan'26.html`; status colour-coding maps to §7.7 (9 ChargePointStatus values), error codes to §7.6 (16 ChargePointErrorCode values), stop reasons to §7.36 Reason (11 values) |
| `/build-complete` | **Checkpoint command.** Marks Build ✅ in WORKFLOW.md, prints next step, and prompts `/review`. Run this when you are satisfied implementation is done. | — |

> **Two safety nets so you never silently skip Build:**
> 1. Run `/build-complete` when done — it marks Build ✅ and tells you the next command.
> 2. If you forget and run `/review` directly, it checks WORKFLOW.md and prompts: *"Build not marked complete — have you finished implementation? (yes / no)"*

### Phase 4 — Review
*Staff-level review before anything ships.*

| Slash command | Purpose | OCPP adaptation |
|---|---|---|
| `/review` | Staff engineer code review: bugs, completeness gaps, auto-fixes obvious issues | 8-point OCPP checklist: J04 Table 2 (envelope structure), J04 Table 7 (10 error codes), §7.7 (9 status values), §7.6 (16 error codes), §9 (38 config keys), §3.15 (ISO 8601 timestamps), §3.8 (connector numbering); for Parser: requirements.md SSOT accuracy, CHANGELOG format, canonical source vs index.html |
| `/design-review` | Designer audits finished UI; atomic commits with before/after | For Parser: verifies FR-327 colour coding aligns with §7.7 ChargePointStatus (9 values), UI-001–UI-014 compliance, export button placement per requirements.md §6 |
| `/devex-review` | Live DX audit: tests the workflow as an operator would | For Parser: walks load log → parse → analyse → export; for other tools: the active tool's primary operator workflow |
| `/cso` | Security audit: OWASP Top 10 + STRIDE threat model | J06: AuthorizationKey MUST NOT appear in GetConfiguration response (J06 §6.2.2); HTTP Basic Auth key = 20 bytes as 40 hex chars; RSA cert ≤ 2048 bytes (J06 §6.2.1); TLS mandatory for internet-facing deployments |

### Phase 5 — Test
*Verify the feature works end-to-end before shipping.*

| Slash command | Purpose | OCPP adaptation |
|---|---|---|
| `/qa` | QA lead: tests in real browser, finds bugs, auto-fixes, generates regression tests | For Parser: loads `data/samples/`, validates all 19 sections against requirements.md; OCPP checks: J04 Table 7 error codes, §4.9 status transitions, §7.6 ChargePointErrorCode (16 values), §7.36 Reason (11 stop codes), §3.15 ISO 8601 timestamps, §3.8 connector IDs |
| `/qa-only` | Same as /qa but report bugs without code changes — for review queue | Same OCPP checks as `/qa`; used when fixes need discussion before applying |
| `/benchmark` | Measures page load, parse time, Excel export time — before/after on every PR | For Parser: large logs (6000+ lines, 1000-line chunk size); for all tools: before/after comparison on every PR touching parsing or processing paths |

### Phase 6 — Ship
*Get the work into main and verify production health.*

| Slash command | Purpose | OCPP adaptation |
|---|---|---|
| `/ship` | Branch → PR workflow: sync, test, push, open PR | For Parser: edit canonical source → copy to root `index.html` → branch → PR (never direct to main); for other tools: standard branch → PR pattern |
| `/document-release` | Updates all docs to match shipped changes; CHANGELOG entry | For Parser: updates `specs/requirements.md` SSOT and CHANGELOG; for all tools: updates that tool's SSOT doc and CHANGELOG when available |
| `/document-generate` | Generates missing docs from scratch when gaps are found | Uses Diataxis framework (Reference, How-to, Tutorial, Explanation); sources OCPP protocol content from `knowledge/standards/ocpp-1.6/` |
| `/land-and-deploy` | Merges approved PR, monitors GitHub Pages deploy | For Parser: monitors GitHub Pages at `https://spsrathore-code.github.io/ocpp-parser/`; for other tools: monitors that tool's deploy target |
| `/canary` | Post-deploy health check: console errors, broken sections, export failures | For Parser: opens live URL, loads a sample log, verifies all 19 sections render and export correctly |

### Phase 7 — Reflect
*Learn from what was built. Preserve context for next session.*

| Slash command | Purpose | OCPP adaptation |
|---|---|---|
| `/retro` | Weekly retrospective: what shipped, what took longer than expected, patterns | Reviews `knowledge/project-journal.md` for the period; flags any OCPP protocol decisions that should be documented in `knowledge/standards/ocpp-1.6/` |
| `/learn` | Appends session summary to `knowledge/project-journal.md`; moves tasks in `specs/tasks.md` | Triggered at end of every session or on demand ("update the journal"); captures any new OCPP domain findings discovered during the session |

### Safety tools (available at any time, any phase)

| Slash command | Purpose |
|---|---|
| `/careful` | Warn before destructive commands (rm, force-push, DROP, overwrite) |
| `/freeze` | Restrict Claude's edits to one directory during a debugging session |
| `/guard` | Activates /careful + /freeze together for maximum safety |
| `/unfreeze` | Removes the /freeze boundary |

---

## 4. How skills feed into each other

```
/office-hours  →  writes a problem framing doc
                        ↓
/spec          →  turns framing into an executable spec with success criteria
                        ↓
/plan-eng-review → produces architecture doc + test plan
                        ↓ (test plan is read by /qa)
[Build — implement on a feature branch]
                        ↓
/review + /cso →  find bugs and security issues
                        ↓ (fixes verified by /ship)
/qa            →  tests end-to-end; auto-generates regression tests
                        ↓
/ship          →  opens PR; verifies all review/qa fixes are included
                        ↓
/document-release → updates CHANGELOG and docs
                        ↓
/land-and-deploy → merges PR; monitors GitHub Pages deploy
                        ↓
/canary        →  verifies production health
                        ↓
/retro + /learn → captures lessons; updates project-journal.md
```

---

## 5. Phase banner format

Every skill prints this at the start of execution. Values are read from `skills/WORKFLOW.md`.

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
OCPP Tool Suite — Skill Chain
Phase [N] of 7 — [PHASE NAME]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Feature:   [active feature name from WORKFLOW.md]
Previous:  /[command] ([Phase Name])  [✅ Complete | ⚠ Not recorded]
Current:   /[this command]
Next:      /[next command] ([Next Phase Name])
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

If the previous phase is not marked complete, the skill warns:

```
⚠ WARNING: [Previous phase] not marked complete in skills/WORKFLOW.md
  Expected: /[command] to have run first.
  You can proceed, but chain integrity may be compromised.
  Proceed anyway? (yes / no)
```

Every skill ends with:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Phase [N] — [PHASE NAME] complete.
skills/WORKFLOW.md updated ✓
Next → run /[next-command]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## 6. WORKFLOW.md — live state file

Location: `skills/WORKFLOW.md`
Updated by: skills automatically. Build phase checked off manually.

### Format

```markdown
# Workflow State
> Auto-updated by skills. Mark Build phase manually when implementation is done.
> One section per active feature. Completed features move to the archive below.

---

## Feature: [name]  |  Started: YYYY-MM-DD

| Phase   | Skill(s)                                | Status         | Date       |
|---------|-----------------------------------------|----------------|------------|
| Think   | /office-hours, /spec                    | ✅ Complete    | YYYY-MM-DD |
| Plan    | /plan-eng-review                        | ⏳ Active      |            |
| Build   | (manual — mark ✅ when impl. complete)  | ⬜ Pending     |            |
| Review  | /review + /cso                          | ⬜ Pending     |            |
| Test    | /qa                                     | ⬜ Pending     |            |
| Ship    | /ship + /document-release + /canary     | ⬜ Pending     |            |
| Reflect | /retro + /learn                         | ⬜ Pending     |            |

### Key outputs
- **Think:** [link to spec doc or framing notes]
- **Plan:** [link to architecture doc, test plan]
- **Build:** [branch name: feat/xxx]
- **Review:** [summary of findings]
- **Test:** [pass/fail summary]
- **Ship:** [PR link]
- **Reflect:** [journal entry date]

---

## Completed features
| Feature | Completed | PR |
|---|---|---|
| [name] | YYYY-MM-DD | [link] |
```

---

## 7. Tracking system

Three files work together. Each answers a different question.

| File | Question answered | Updated by |
|---|---|---|
| `specs/tasks.md` | What are we working on right now? | `/learn` moves Done items; manual for Next/Later |
| `knowledge/project-journal.md` | What did we discuss and decide, session by session? | `/learn` on demand ("update the journal") |
| `CHANGELOG.md` | What changed in the code and when? | `/document-release` after each ship |

### Session journal protocol

Any time you say **"update the journal"** (or similar), Claude appends to `knowledge/project-journal.md`:

```markdown
## YYYY-MM-DD — [Session topic]

### Discussed
- [topics]

### Decided
- [decisions and rationale]

### Implemented
- [files created/changed, or "design phase only"]

### Next
- [pending items]
```

Confirmation printed after every update:
```
knowledge/project-journal.md updated ✓  (YYYY-MM-DD entry appended)
specs/tasks.md updated ✓               (N items moved to Done)
```

---

## 8. SKILL.md anatomy

Every skill file in `skills/[name]/SKILL.md` follows this structure:

```markdown
---
name: [skill-name]
phase: [N] of 7 — [PHASE NAME]
triggers: "[example phrases that mean: invoke this skill]"
ocpp-context: true
---

## Phase Banner
[Claude reads skills/WORKFLOW.md and prints the phase banner]

## Prerequisite Check
[Claude checks WORKFLOW.md: is the previous phase marked ✅?]
[If not: warn, ask to confirm before proceeding]

## Purpose
[What this skill does. OCPP-specific context included.]

## Steps
[Numbered step-by-step instructions]

## OCPP Considerations
[Domain rules: OCPP 1.6J compliance, canonical source path,
 Parser section structure, CHANGELOG format, deploy workflow, etc.]

## Output
[What gets produced: spec doc, architecture doc, PR, journal entry, etc.]

## WORKFLOW.md Update
[Claude marks this phase ✅ with today's date]

## End Banner
[Prints: "Phase N complete. WORKFLOW.md updated ✓. Next → /[command]"]
```

---

## 9. How to start a new feature

1. Open `skills/WORKFLOW.md` — check no other feature is mid-flight (or start a new section).
2. Run `/office-hours` — six forcing questions to validate the idea.
3. Run `/spec` — turn the validated idea into an executable spec.
4. Run `/plan-eng-review` — lock architecture and produce a test plan.
5. Implement on a branch (`feat/[name]`). When done, run `/build-complete` — it marks Build ✅ and tells you the next step. (Forgot? Run `/review` and it will prompt you.)
6. Run `/review` and `/cso` in parallel (or sequentially).
7. Run `/qa` — test end-to-end with real sample logs.
8. Run `/ship` — branch → PR, verify all fixes included.
9. Run `/document-release` — update CHANGELOG, docs.
10. Run `/land-and-deploy` → `/canary` — merge and verify GitHub Pages.
11. Run `/learn` — append session summary to project-journal.md.

For small fixes (typos, minor UI tweaks): skip Think and Plan; start at Build and document the skip in WORKFLOW.md.

---

## 10. What was excluded and why

| Excluded | Reason |
|---|---|
| `/codex` | Requires OpenAI Codex CLI — external dependency not available |
| `/pair-agent` | Multi-AI coordinator — overkill for solo project |
| `/open-gstack-browser` | gstack internal tool — not applicable outside gstack |
| `/setup-gbrain` | Supabase-based persistent knowledge base — overkill for this project |
| `/gstack-upgrade` | gstack self-updater — not applicable |
| `/ios-*` (all) | iOS-specific — not relevant to this project |

---

## 11. CLAUDE.md integration

`CLAUDE.md` contains a Skill Chain section so Claude knows the system exists at session start:

```markdown
## Skill Chain (Think → Plan → Build → Review → Test → Ship → Reflect)

All significant work uses the skill chain. See `docs/skill-chain.md` for
the full design. See `skills/WORKFLOW.md` for current feature state.

- Invoke skills via slash commands: /office-hours, /spec, /plan, /review, etc.
- Each skill reads skills/WORKFLOW.md and shows a phase banner.
- Build phase: run `/build-complete` when implementation is done. Forgot? `/review` will prompt you.
- Safety tools available any time: /careful, /freeze, /guard, /unfreeze.
- Do NOT skip phases without recording the skip in WORKFLOW.md.
- Session journal: say "update the journal" → appends to knowledge/project-journal.md.
```

---

*This document is the permanent design record. The live runtime state is in `skills/WORKFLOW.md`. Session history is in `knowledge/project-journal.md`.*
