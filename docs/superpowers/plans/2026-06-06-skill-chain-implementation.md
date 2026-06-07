# Skill Chain Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the complete OCPP Tool Suite skill chain — 28 SKILL.md files, 28 slash command entry points, WORKFLOW.md runtime state template, CHAIN.md quick reference, and updates to CLAUDE.md and project-standard.md.

**Architecture:** Each skill is a two-file pair: a rich `skills/[name]/SKILL.md` (the executable workflow Claude follows) and a thin `.claude/commands/[name].md` (the slash command entry point). `skills/WORKFLOW.md` tracks live per-feature phase state, updated automatically by skills. All skills share a common Phase Banner + Prerequisite Check + End Banner structure; only Purpose, Steps, and OCPP Considerations are unique per skill.

**Tech Stack:** Markdown files only. No build step, no dependencies. Claude Code reads `.claude/commands/[name].md` when user types `/name`, which instructs Claude to read and execute `skills/[name]/SKILL.md`.

---

## Common Pattern (used by all Tasks 3–9)

Every `skills/[name]/SKILL.md` uses this shared skeleton. **UNIQUE** sections must be written per-skill. **SHARED** sections use the exact template below — substitute the bracketed values shown per-task.

### SHARED: Phase Banner

```markdown
## Phase Banner

Read `skills/WORKFLOW.md`.
- If no active feature section exists: ask "What feature are you working on?"
  then create a new feature section using the WORKFLOW.md format before continuing.
- Print:

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
OCPP Tool Suite — Skill Chain
Phase [N] of 7 — [PHASE NAME]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Feature:   [active feature name from WORKFLOW.md]
Previous:  /[prev-cmd] ([Prev Phase])  [✅ Complete | ⚠ Not recorded]
Current:   /[this-cmd]
Next:      /[next-cmd] ([Next Phase])
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### SHARED: Prerequisite Check (skip for Think-phase skills)

```markdown
## Prerequisite Check

Check `skills/WORKFLOW.md`: is [Previous Phase] marked ✅?
If NOT ✅, print:
  "⚠ WARNING: [Previous Phase] not marked complete in WORKFLOW.md.
   Expected /[prev-cmd] to have run first.
   Proceed anyway? (yes / no)"
  If no: stop here.
```

### SHARED: WORKFLOW.md Update

```markdown
## WORKFLOW.md Update

In `skills/WORKFLOW.md`, find the active feature section:
1. Mark [This Phase] as ✅ with today's date (YYYY-MM-DD).
2. Append a one-line note under "Key outputs → [This Phase]" describing what was produced.
3. Print: "skills/WORKFLOW.md updated ✓ — [Phase Name] marked complete."
```

### SHARED: End Banner

```markdown
## End Banner

Print:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Phase [N] — [PHASE NAME] complete.
skills/WORKFLOW.md updated ✓
Next → run /[next-cmd]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### Command file format (all 28 commands)

`.claude/commands/[name].md`:
```markdown
Read `skills/[name]/SKILL.md` and follow all instructions in that file exactly.
```

---

## File Map

**New directories:**
- `docs/superpowers/plans/` (this file lives here)
- `skills/` with 28 subdirectories (one per skill)

**New files — skills/ (30 files):**
- `skills/WORKFLOW.md` — runtime state template
- `skills/CHAIN.md` — quick reference map
- `skills/office-hours/SKILL.md`, `skills/spec/SKILL.md`, `skills/autoplan/SKILL.md`
- `skills/plan-ceo-review/SKILL.md`, `skills/plan-eng-review/SKILL.md`, `skills/plan-design-review/SKILL.md`, `skills/plan-devex-review/SKILL.md`
- `skills/investigate/SKILL.md`, `skills/design-consultation/SKILL.md`, `skills/design-shotgun/SKILL.md`, `skills/design-html/SKILL.md`, `skills/build-complete/SKILL.md`
- `skills/review/SKILL.md`, `skills/design-review/SKILL.md`, `skills/devex-review/SKILL.md`, `skills/cso/SKILL.md`
- `skills/qa/SKILL.md`, `skills/qa-only/SKILL.md`, `skills/benchmark/SKILL.md`
- `skills/ship/SKILL.md`, `skills/document-release/SKILL.md`, `skills/document-generate/SKILL.md`, `skills/land-and-deploy/SKILL.md`, `skills/canary/SKILL.md`
- `skills/retro/SKILL.md`, `skills/learn/SKILL.md`
- `skills/careful/SKILL.md`, `skills/freeze/SKILL.md`, `skills/guard/SKILL.md`, `skills/unfreeze/SKILL.md`

**New files — .claude/commands/ (28 files):**
- One `.md` file per skill (office-hours.md, spec.md, autoplan.md, plan-ceo-review.md, plan-eng-review.md, plan-design-review.md, plan-devex-review.md, build-complete.md, investigate.md, design-consultation.md, design-shotgun.md, design-html.md, review.md, design-review.md, devex-review.md, cso.md, qa.md, qa-only.md, benchmark.md, ship.md, document-release.md, document-generate.md, land-and-deploy.md, canary.md, retro.md, learn.md, careful.md, freeze.md, guard.md, unfreeze.md)

**Modified files:**
- `CLAUDE.md` — add Skill Chain section
- `project-standard.md` — add `skills/` to universal repo tree

---

## Task 0: Foundation — WORKFLOW.md, CHAIN.md, directory scaffolding

**Files:**
- Create: `skills/WORKFLOW.md`
- Create: `skills/CHAIN.md`
- Create: all 28 `skills/[name]/` subdirectories (via `.gitkeep` files)

- [ ] **Step 1: Create WORKFLOW.md**

Create `skills/WORKFLOW.md` with this exact content:

```markdown
# Workflow State

> Auto-updated by skills. Mark Build phase manually when implementation is done.
> One section per active feature. Completed features move to the archive below.
> Format: ✅ Complete | ⏳ Active | ⬜ Pending

---

## Feature: [name]  |  Started: YYYY-MM-DD

| Phase   | Skill(s)                                  | Status      | Date       |
|---------|-------------------------------------------|-------------|------------|
| Think   | /office-hours, /spec                      | ⬜ Pending  |            |
| Plan    | /plan-eng-review                          | ⬜ Pending  |            |
| Build   | /build-complete (checkpoint, not impl.)   | ⬜ Pending  |            |
| Review  | /review + /cso                            | ⬜ Pending  |            |
| Test    | /qa                                       | ⬜ Pending  |            |
| Ship    | /ship + /document-release + /canary       | ⬜ Pending  |            |
| Reflect | /retro + /learn                           | ⬜ Pending  |            |

### Key outputs
- **Think:** [framing doc path, spec path]
- **Plan:** [architecture doc path, test plan]
- **Build:** [branch name: feat/xxx]
- **Review:** [findings summary]
- **Test:** [pass/fail summary, regression test path]
- **Ship:** [PR link]
- **Reflect:** [journal entry date]

---

## Completed features

| Feature | Completed | PR |
|---|---|---|
| _(none yet)_ | — | — |
```

- [ ] **Step 2: Create CHAIN.md**

Create `skills/CHAIN.md` with this exact content:

```markdown
# Skill Chain — Quick Reference

> Full design: `docs/skill-chain.md` | Live state: `skills/WORKFLOW.md`

## 7-Phase Chain

| # | Phase   | Slash commands                                              | Prerequisite      |
|---|---------|-------------------------------------------------------------|-------------------|
| 1 | Think   | /office-hours → /spec → /autoplan                           | none              |
| 2 | Plan    | /plan-ceo-review, /plan-eng-review, /plan-design-review, /plan-devex-review | Think ✅ |
| 3 | Build   | /investigate, /design-consultation, /design-shotgun, /design-html → **/build-complete** | Plan ✅ |
| 4 | Review  | /review, /design-review, /devex-review, /cso                | Build ✅          |
| 5 | Test    | /qa, /qa-only, /benchmark                                   | Review ✅         |
| 6 | Ship    | /ship → /document-release → /land-and-deploy → /canary      | Test ✅           |
| 7 | Reflect | /retro, /learn                                              | Ship ✅           |

## Safety tools (any phase, any time)
/careful  /freeze  /guard  /unfreeze

## Starting a new feature
1. Run /office-hours
2. Run /spec
3. Run /plan-eng-review
4. Implement on feat/[name] branch
5. Run /build-complete
6. Run /review + /cso
7. Run /qa
8. Run /ship → /document-release → /land-and-deploy → /canary
9. Run /learn
```

- [ ] **Step 3: Create skill subdirectory placeholders**

Create a `.gitkeep` in each of the 28 skill directories so they exist in git:

```
skills/office-hours/.gitkeep
skills/spec/.gitkeep
skills/autoplan/.gitkeep
skills/plan-ceo-review/.gitkeep
skills/plan-eng-review/.gitkeep
skills/plan-design-review/.gitkeep
skills/plan-devex-review/.gitkeep
skills/investigate/.gitkeep
skills/design-consultation/.gitkeep
skills/design-shotgun/.gitkeep
skills/design-html/.gitkeep
skills/build-complete/.gitkeep
skills/review/.gitkeep
skills/design-review/.gitkeep
skills/devex-review/.gitkeep
skills/cso/.gitkeep
skills/qa/.gitkeep
skills/qa-only/.gitkeep
skills/benchmark/.gitkeep
skills/ship/.gitkeep
skills/document-release/.gitkeep
skills/document-generate/.gitkeep
skills/land-and-deploy/.gitkeep
skills/canary/.gitkeep
skills/retro/.gitkeep
skills/learn/.gitkeep
skills/careful/.gitkeep
skills/freeze/.gitkeep
skills/guard/.gitkeep
skills/unfreeze/.gitkeep
```

- [ ] **Step 4: Commit**

```bash
git add skills/
git commit -m "feat: scaffold skills/ directory — WORKFLOW.md, CHAIN.md, 28 subdirs"
```

---

## Task 1: Update CLAUDE.md and project-standard.md

**Files:**
- Modify: `CLAUDE.md`
- Modify: `project-standard.md`

- [ ] **Step 1: Add Skill Chain section to CLAUDE.md**

Append this section to `CLAUDE.md` after the existing "Deploy (Parser)" section:

```markdown
## Skill Chain (Think → Plan → Build → Review → Test → Ship → Reflect)

All significant work uses the skill chain. See `docs/skill-chain.md` for the full
design. See `skills/WORKFLOW.md` for current feature state.

- Invoke skills via slash commands: `/office-hours`, `/spec`, `/plan-eng-review`,
  `/review`, `/cso`, `/qa`, `/ship`, `/learn`, etc.
- Each skill reads `skills/WORKFLOW.md`, prints a phase banner, checks prerequisites,
  does its work, updates WORKFLOW.md, and prints the next command.
- Build phase: run `/build-complete` when implementation is done. Forgot? `/review`
  will prompt you.
- Safety tools available any time: `/careful`, `/freeze`, `/guard`, `/unfreeze`.
- Never skip phases without recording the skip in `skills/WORKFLOW.md`.
- Session journal: say "update the journal" → appends to `knowledge/project-journal.md`.
```

- [ ] **Step 2: Add skills/ to project-standard.md universal tree**

In `project-standard.md`, after the `.claude/` block and before the `archive/` block, insert:

```markdown
├── skills/                   ← SKILL CHAIN
│   │
│   ├── WORKFLOW.md           ← Live phase state (auto-updated by skills)
│   ├── CHAIN.md              ← Quick reference: 7-phase chain map
│   └── [skill-name]/
│       └── SKILL.md          ← Executable workflow definition
│
│   Purpose: AI-executable workflow skills (Think→Plan→Build→Review→Test→Ship→Reflect)
│   Why: Enforces structured, traceable workflow; nothing falls through the cracks
│   Memory Aid: "What workflow step am I on?"
│
```

- [ ] **Step 3: Verify both files look correct**

Read `CLAUDE.md` — confirm Skill Chain section is present after the Deploy section.
Read `project-standard.md` — confirm `skills/` appears in the tree between `.claude/` and `archive/`.

- [ ] **Step 4: Commit**

```bash
git add CLAUDE.md project-standard.md
git commit -m "feat: add skill chain integration to CLAUDE.md and project-standard.md"
```

---

## Task 2: Think phase — /office-hours, /spec, /autoplan

**Files:**
- Create: `skills/office-hours/SKILL.md`
- Create: `skills/spec/SKILL.md`
- Create: `skills/autoplan/SKILL.md`
- Create: `.claude/commands/office-hours.md`
- Create: `.claude/commands/spec.md`
- Create: `.claude/commands/autoplan.md`

**Banner values for this phase:**
- Phase: 1 of 7 — THINK
- Previous: none (first phase — skip Prerequisite Check)
- Next: /plan-eng-review (Plan)

- [ ] **Step 1: Create skills/office-hours/SKILL.md**

```markdown
---
name: office-hours
phase: 1 of 7 — THINK
triggers: "office hours, validate this idea, challenge my thinking, before I build"
ocpp-context: true
---

## Phase Banner

Read `skills/WORKFLOW.md`. If no active feature exists, ask:
"What feature are you working on?" and create a new feature section.

Print:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
OCPP Tool Suite — Skill Chain
Phase 1 of 7 — THINK
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Feature:   [active feature from WORKFLOW.md]
Previous:  (none — first phase)
Current:   /office-hours
Next:      /spec (Think) → /plan-eng-review (Plan)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## Purpose

Six forcing questions that challenge the problem framing before any planning begins.
Pushes back on assumptions. Generates alternatives. For the OCPP suite, this includes
checking OCPP compliance impact, interoperability risk, and whether the canonical source
needs to change.

## Steps

Ask these six questions **one at a time**, wait for an answer before asking the next:

1. **What problem are you actually solving?** (Not what you're building — what user pain or gap does this address for charger operators or engineers?)

2. **Who specifically is affected and how do they experience this problem today?** (Charger operator? Field engineer? CSMS admin? What do they currently do instead?)

3. **What does success look like — and how would you measure it?** (Define a concrete, observable outcome. "The log loads faster" is not measurable. "Logs under 10,000 lines parse in under 3 seconds" is.)

4. **What is the simplest version of this that would still solve the problem?** (Challenge scope. What can be cut? What would a 1-day version look like?)

5. **What are you NOT doing — and why?** (Name the boundaries explicitly. What adjacent problems are out of scope?)

6. **What could go wrong, and what is the fallback?** (OCPP compliance risk? Breaking existing Parser sections? Data loss? What happens if this fails in the field?)

After all six answers are collected, produce a framing summary:
- Feature name (used in WORKFLOW.md)
- Problem statement (1–2 sentences)
- Success criteria (measurable)
- Minimal scope
- Out of scope
- Key risks

Save the framing summary to `scratchpad/temporary-notes/[feature-name]-framing.md`.

## OCPP Considerations

Ask explicitly within Question 6: "Does this touch OCPP protocol behaviour?"
- If yes: flag that `/plan-eng-review` must include an OCPP 1.6J compliance check.
- If it changes the canonical Parser source: confirm it will NOT touch `index.html` directly.
- If it adds a new section to the Parser: confirm it fits the 19-section architecture in `specs/requirements.md`.

## Output

- `scratchpad/temporary-notes/[feature-name]-framing.md` — framing summary
- Feature name established for WORKFLOW.md

## WORKFLOW.md Update

Mark Think phase as ⏳ Active (office-hours started) in `skills/WORKFLOW.md`.
Append under Key outputs → Think: path to framing doc.
Print: "skills/WORKFLOW.md updated ✓ — Think phase active."

## End Banner

Print:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/office-hours complete. Framing captured.
skills/WORKFLOW.md updated ✓
Next → run /spec to convert framing into an executable spec.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

- [ ] **Step 2: Create skills/spec/SKILL.md**

```markdown
---
name: spec
phase: 1 of 7 — THINK
triggers: "write the spec, define requirements, turn this into a spec, spec it out"
ocpp-context: true
---

## Phase Banner

Read `skills/WORKFLOW.md`. Print:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
OCPP Tool Suite — Skill Chain
Phase 1 of 7 — THINK
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Feature:   [active feature from WORKFLOW.md]
Previous:  /office-hours (Think) [✅ framing doc exists | ⚠ not run]
Current:   /spec
Next:      /plan-eng-review (Plan)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## Purpose

Turns the office-hours framing into an executable spec: problem, outcome, success
criteria, assumptions, out-of-scope, and task breakdown. Saved to docs/superpowers/specs/
so it persists and feeds /plan-eng-review.

## Steps

1. Check if `scratchpad/temporary-notes/[feature]-framing.md` exists. If yes, read it.
   If no, ask the user to summarise the feature intent in 2–3 sentences before continuing.

2. Produce the spec document with these sections:
   - **Problem:** What is broken or missing? (1–2 sentences)
   - **Outcome:** What will be true when this is done? (measurable)
   - **Success criteria:** Numbered list of verifiable conditions
   - **Assumptions:** What are we taking as given?
   - **Out of scope:** What are we explicitly NOT doing?
   - **Task breakdown:** Numbered implementation tasks (high-level)
   - **OCPP compliance note:** Does this touch protocol behaviour? Which message types?

3. Ask the user: "Does this spec look right? Any changes before I save it?"

4. Save the approved spec to:
   `docs/superpowers/specs/YYYY-MM-DD-[feature-name]-spec.md`

## OCPP Considerations

- Reference `specs/requirements.md` for existing Parser section numbering and architecture.
- Reference `src/schemas/ocpp-1.6/` for message type names (use canonical names only).
- If the spec involves a new Parser section: number it correctly (currently 1–19 exist).
- If the spec involves the Validation Engine: cross-reference `docs/TYPEVALIDATION.md`.

## Output

`docs/superpowers/specs/YYYY-MM-DD-[feature-name]-spec.md`

## WORKFLOW.md Update

Mark Think phase as ✅ Complete with today's date.
Append under Key outputs → Think: path to spec file.
Print: "skills/WORKFLOW.md updated ✓ — Think phase complete."

## End Banner

Print:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Phase 1 — THINK complete.
skills/WORKFLOW.md updated ✓
Next → run /plan-eng-review (Plan)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

- [ ] **Step 3: Create skills/autoplan/SKILL.md**

```markdown
---
name: autoplan
phase: 1 of 7 — THINK (shortcut through Plan)
triggers: "autoplan, quick plan, I know what I want to build, skip the questions"
ocpp-context: true
---

## Phase Banner

Read `skills/WORKFLOW.md`. Print:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
OCPP Tool Suite — Skill Chain
AUTOPLAN (Think + Plan shortcut)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Feature:   [active feature from WORKFLOW.md]
Mode:      Shortcut — runs Think + Plan in one pass
Full path: /office-hours → /spec → /plan-eng-review
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## Purpose

Runs office-hours + spec + plan-eng-review in a single pass for features that
are already well-understood. Skips the interactive question-by-question format.
Only use when you have already thought through the problem and just need to document it.

## Steps

1. Ask: "Describe the feature in 3–4 sentences. What are you building, why, and what does done look like?"
2. Ask: "Does this touch OCPP protocol behaviour or the canonical Parser source?"
3. From the answers, generate: framing summary + spec + engineering plan in one document.
4. Show the combined document to the user. Ask: "Does this look right?"
5. Save to `docs/superpowers/specs/YYYY-MM-DD-[feature-name]-autoplan.md`.

## OCPP Considerations

Same as /spec and /plan-eng-review combined. Flag OCPP compliance risk if any.

## Output

`docs/superpowers/specs/YYYY-MM-DD-[feature-name]-autoplan.md`

## WORKFLOW.md Update

Mark Think ✅ and Plan ✅ both with today's date.
Print: "skills/WORKFLOW.md updated ✓ — Think + Plan marked complete (autoplan)."

## End Banner

Print:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
AUTOPLAN complete. Think + Plan phases recorded.
skills/WORKFLOW.md updated ✓
Next → implement on a feat/ branch, then run /build-complete
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

- [ ] **Step 4: Create the three command files**

`skills/.claude/commands/office-hours.md`:
```markdown
Read `skills/office-hours/SKILL.md` and follow all instructions in that file exactly.
```

`.claude/commands/spec.md`:
```markdown
Read `skills/spec/SKILL.md` and follow all instructions in that file exactly.
```

`.claude/commands/autoplan.md`:
```markdown
Read `skills/autoplan/SKILL.md` and follow all instructions in that file exactly.
```

- [ ] **Step 5: Verify**

In Claude Code, type `/office-hours`. Confirm:
- Phase banner prints with "Phase 1 of 7 — THINK"
- Claude asks "What feature are you working on?" if WORKFLOW.md has no active feature
- Six questions are asked one at a time

- [ ] **Step 6: Commit**

```bash
git add skills/office-hours/ skills/spec/ skills/autoplan/ .claude/commands/office-hours.md .claude/commands/spec.md .claude/commands/autoplan.md
git commit -m "feat: Think phase skills — /office-hours, /spec, /autoplan"
```

---

## Task 3: Plan phase — /plan-ceo-review, /plan-eng-review, /plan-design-review, /plan-devex-review

**Files:** 4 SKILL.md + 4 command files
**Banner values:** Phase 2 of 7 — PLAN | Previous: Think ✅ | Next: /build-complete (Build)

- [ ] **Step 1: Create skills/plan-ceo-review/SKILL.md**

```markdown
---
name: plan-ceo-review
phase: 2 of 7 — PLAN
triggers: "scope review, is this the right problem, ceo review, expand or reduce scope"
ocpp-context: true
---

## Phase Banner
[SHARED — Phase 2 of 7 — PLAN | Previous: /spec (Think) | Next: /plan-eng-review (Plan)]

## Prerequisite Check
[SHARED — check Think ✅ | warn if not]

## Purpose

Scope review in three modes — Expansion, Hold, or Reduction. Asks: is this
the right problem? Is scope too narrow or too broad relative to the suite vision?
References `specs/vision.md` for alignment.

## Steps

1. Read the spec from `docs/superpowers/specs/` for the active feature.
2. Read `specs/vision.md` to understand the suite direction.
3. Evaluate scope in three modes and present findings:
   - **Expansion:** Could solving this problem unlock a bigger win? (e.g., fixing a Parser bug reveals a Validation Engine opportunity)
   - **Hold:** Is this the right scope as-stated? Present rationale.
   - **Reduction:** Is this too large? What is the smallest version that delivers value?
4. Recommend one mode. Ask: "Do you agree with this scope assessment?"
5. If scope changes: update the spec file and note the change.

## OCPP Considerations

Check against suite vision: does this feature belong in the Parser, Validation Engine,
CMS, or Charger Emulator? Flag if the feature is in the wrong tool.

## Output

Scope decision recorded in the spec file. WORKFLOW.md notes the chosen mode.

## WORKFLOW.md Update
[SHARED — mark Plan ⏳ Active]

## End Banner
[SHARED — Phase 2 — PLAN | Next → /plan-eng-review]
```

- [ ] **Step 2: Create skills/plan-eng-review/SKILL.md**

```markdown
---
name: plan-eng-review
phase: 2 of 7 — PLAN
triggers: "engineering review, lock the architecture, plan the implementation, eng plan"
ocpp-context: true
---

## Phase Banner
[SHARED — Phase 2 of 7 — PLAN | Previous: /spec (Think) | Next: /build-complete (Build)]

## Prerequisite Check
[SHARED — check Think ✅ | warn if not]

## Purpose

Engineering lock: produces architecture, data flow, edge cases, and a test plan.
The test plan output is read by /qa. For OCPP work, this includes a compliance
checklist for the affected message types.

## Steps

1. Read the spec from `docs/superpowers/specs/` for the active feature.
2. Define and document:
   - **Architecture:** Which files change? What new files are created? Data flow diagram (text).
   - **Data flow:** How does data enter, transform, and exit?
   - **Edge cases:** List at least 5. For Parser work: empty log, malformed OCPP message, missing MessageId, duplicate transaction, > 10,000 line log.
   - **OCPP compliance check:** Which message types (CallResult, CallError, specific Actions) are affected? Do they need schema validation?
   - **Test plan:** What scenarios must pass before shipping? Write them as: "Given X, when Y, then Z."
   - **File size check:** Will any file exceed 2000 lines after changes? If yes, plan the split.
3. Save architecture doc to `docs/superpowers/specs/YYYY-MM-DD-[feature]-arch.md`.
4. Ask: "Does this architecture and test plan look right?"

## OCPP Considerations

- Canonical source: `src/app/OCPP_Parser_Complete_ 21 Jan'26.html` — never edit `index.html` directly.
- Schema reference: `src/schemas/ocpp-1.6/[MessageType].json` — use for field names and types.
- Validation Engine: if the feature involves message validation, cross-reference `docs/TYPEVALIDATION.md`.
- OCPP 1.6J message structure: `[MessageTypeId, UniqueId, Action, Payload]` for Call; `[MessageTypeId, UniqueId, Payload]` for CallResult; `[MessageTypeId, UniqueId, ErrorCode, ErrorDescription, ErrorDetails]` for CallError.
- File size hard limit: 2000 lines. The current Parser is 9813 lines — any new feature added to it is technical debt. Flag this.

## Output

`docs/superpowers/specs/YYYY-MM-DD-[feature]-arch.md` — architecture + test plan

## WORKFLOW.md Update

Mark Plan ✅ with today's date.
Append under Key outputs → Plan: path to arch doc.
Print: "skills/WORKFLOW.md updated ✓ — Plan phase complete."

## End Banner

Print:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Phase 2 — PLAN complete.
skills/WORKFLOW.md updated ✓
Next → implement on a feat/[name] branch, then run /build-complete
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

- [ ] **Step 3: Create skills/plan-design-review/SKILL.md**

```markdown
---
name: plan-design-review
phase: 2 of 7 — PLAN
triggers: "design plan, UI review, rate this design, plan the UI, design review before build"
ocpp-context: true
---

## Phase Banner
[SHARED — Phase 2 of 7 — PLAN | Previous: /spec (Think) | Next: /build-complete (Build)]

## Prerequisite Check
[SHARED — check Think ✅ | warn if not]

## Purpose

Senior designer reviews the planned UI/UX before any implementation. Rates design
decisions 0–10 per dimension. Detects over-engineering. For the Parser, checks
consistency with the existing 19-section layout.

## Steps

1. Ask the user to describe or sketch the planned UI (text description, mockup, or bullet points).
2. Rate on these dimensions (0–10, with one-sentence rationale each):
   - **Clarity:** Does the user immediately understand what this section does?
   - **Consistency:** Does it match the existing Parser section style?
   - **Completeness:** Does it handle empty state, error state, loading state?
   - **Export readiness:** Can every visible table be exported to Excel?
   - **Simplicity:** Is anything here that operators don't need?
3. Flag any score below 7 as a concern requiring redesign before proceeding.
4. Suggest specific improvements for flagged dimensions.
5. Ask: "Do you want to revise the design based on these findings?"

## OCPP Considerations

- Parser has 19 sections in a fixed order — new sections must fit the established pattern.
- Export-to-Excel is a hard requirement for every data table in the Parser.
- Operators use this on-site, often on laptops — avoid dense layouts.
- Colour palette: existing Parser uses semantic colours (red = fault, amber = warning, green = normal). New sections must respect this.

## Output

Design review summary noted in the spec or arch doc.

## WORKFLOW.md Update
[SHARED — mark Plan ⏳ Active (design review done, eng review may follow)]

## End Banner
[SHARED — Phase 2 — PLAN | Next → /plan-eng-review (if not done) or /build-complete (Build)]
```

- [ ] **Step 4: Create skills/plan-devex-review/SKILL.md**

```markdown
---
name: plan-devex-review
phase: 2 of 7 — PLAN
triggers: "devex review, operator experience, who uses this, user workflow review"
ocpp-context: true
---

## Phase Banner
[SHARED — Phase 2 of 7 — PLAN | Previous: /spec (Think) | Next: /build-complete (Build)]

## Prerequisite Check
[SHARED — check Think ✅ | warn if not]

## Purpose

Developer/operator experience review. Explores personas, friction points, and
time-to-insight. The primary persona for this project is the field engineer or
charger operator using the Parser to diagnose a charger fault on-site.

## Steps

1. Define the persona for this feature: "Who uses this, in what situation, with what constraints?"
   (Default persona: field engineer, on-site, limited connectivity, under time pressure.)
2. Walk through the feature as that persona would experience it:
   - How do they reach this feature?
   - What do they need to know first?
   - What is the first thing they see?
   - What is the most likely action they take?
   - What could confuse or block them?
3. Estimate time-to-insight: from opening the Parser to having the answer they need.
4. Identify the top 3 friction points and suggest mitigations.
5. Ask: "Does this match your expectations for the operator workflow?"

## OCPP Considerations

- Operators diagnose faults using OCPP status codes — the feature must surface these clearly.
- OCPP error codes (ErrorCode field in CallError) must be human-readable, not raw enum values.
- Downtime periods and fault types (from `specs/requirements.md`) are the primary diagnostic output.

## Output

Persona and friction analysis noted in spec or arch doc.

## WORKFLOW.md Update
[SHARED — mark Plan ⏳ Active]

## End Banner
[SHARED — Phase 2 — PLAN | Next → /build-complete (Build)]
```

- [ ] **Step 5: Create 4 command files**

`.claude/commands/plan-ceo-review.md`, `.claude/commands/plan-eng-review.md`,
`.claude/commands/plan-design-review.md`, `.claude/commands/plan-devex-review.md` —
each containing: `Read skills/[name]/SKILL.md and follow all instructions exactly.`

- [ ] **Step 6: Commit**

```bash
git add skills/plan-ceo-review/ skills/plan-eng-review/ skills/plan-design-review/ skills/plan-devex-review/ .claude/commands/plan-*.md
git commit -m "feat: Plan phase skills — /plan-ceo-review, /plan-eng-review, /plan-design-review, /plan-devex-review"
```

---

## Task 4: Build phase — /investigate, /design-consultation, /design-shotgun, /design-html, /build-complete

**Files:** 5 SKILL.md + 5 command files
**Banner values:** Phase 3 of 7 — BUILD | Previous: Plan ✅ | Next: /review (Review)

- [ ] **Step 1: Create skills/build-complete/SKILL.md**

```markdown
---
name: build-complete
phase: 3 of 7 — BUILD (checkpoint)
triggers: "build done, implementation complete, finished coding, ready for review, build complete"
ocpp-context: true
---

## Phase Banner

Read `skills/WORKFLOW.md`. Print:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
OCPP Tool Suite — Skill Chain
Phase 3 of 7 — BUILD CHECKPOINT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Feature:   [active feature from WORKFLOW.md]
Previous:  /plan-eng-review (Plan)  [✅ Complete | ⚠ Not recorded]
Current:   /build-complete
Next:      /review + /cso (Review)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## Prerequisite Check
[SHARED — check Plan ✅ | warn if not]

## Purpose

This is a deliberate checkpoint, not an implementation tool. It marks Build as
complete in WORKFLOW.md after you are satisfied with your implementation.
It also prompts a self-check before entering the Review phase.

## Steps

1. Ask: "Have you finished implementation on your feature branch? (yes / not yet)"
   - If not yet: stop. Run this again when implementation is complete.
2. Ask: "What is the branch name?" (e.g., feat/offline-replay-flag)
3. Self-check prompts — answer each:
   - "Did you edit only the canonical source (`src/app/OCPP_Parser_Complete_ 21 Jan'26.html`), not `index.html`?"
   - "Does the Parser still load without console errors after your changes?"
   - "Are there any hardcoded values or debug console.log statements left in?"
4. Record the branch name.

## OCPP Considerations

Canonical source path: `src/app/OCPP_Parser_Complete_ 21 Jan'26.html`
Never edit: `index.html` (deploy copy only — overwritten on each deploy)
Branch naming: `feat/[feature-name]` per git workflow policy.

## Output

Build phase marked ✅ in WORKFLOW.md. Branch name recorded under Key outputs → Build.

## WORKFLOW.md Update

Mark Build ✅ with today's date.
Append under Key outputs → Build: `feat/[branch-name]`.
Print: "skills/WORKFLOW.md updated ✓ — Build phase complete."

## End Banner

Print:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Phase 3 — BUILD complete.
skills/WORKFLOW.md updated ✓
Next → run /review and /cso (Review phase)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

- [ ] **Step 2: Create skills/investigate/SKILL.md**

```markdown
---
name: investigate
phase: 3 of 7 — BUILD (debug aid)
triggers: "investigate, debug, root cause, why is this broken, trace this bug"
ocpp-context: true
---

## Phase Banner
[SHARED — Phase 3 of 7 — BUILD | Note: callable at any phase during debugging]

## Purpose

Systematic root-cause debugging. Traces data flow, tests hypotheses one at a time,
isolates the failure. For the Parser: knows the chunked parsing engine (1000 lines/chunk),
MessageId correlation logic, and OCPP message structure.

## Steps

1. Ask: "Describe the symptom. What did you expect? What happened instead?"
2. Ask: "When did this last work correctly? What changed since then?"
3. Form 3 hypotheses (ranked by likelihood). State each as: "IF [condition] THEN [symptom]."
4. For each hypothesis, define one verification step (a console.log, a specific log line to check, a code path to trace).
5. Work through verifications in order — stop at the first confirmed hypothesis.
6. Identify the root cause (not the symptom). State: "The root cause is [X] because [evidence]."
7. Propose the minimal fix. Do NOT fix multiple things in one change.

## OCPP Considerations

- OCPP message structure: `[2, UniqueId, Action, Payload]` (Call), `[3, UniqueId, Payload]` (CallResult), `[4, UniqueId, ErrorCode, ErrorDesc, ErrorDetails]` (CallError).
- Parser chunking: logs are processed 1000 lines at a time — bugs may appear only in large logs.
- MessageId correlation: `uniqueId` must match between Call and CallResult/CallError — mismatches cause orphan messages.
- Downtime detection: uses gap analysis between StatusNotification messages — check `processDowntimes()` if fault logic is wrong.
- Sample logs for reproduction: `data/samples/Sample OCPP Client Log .txt` and `data/samples/TS0064 Emergency Stop No Available Status 13 March 2026.txt`.

## Output

Root cause identified. Minimal fix proposed (but not applied — user decides).

## WORKFLOW.md Update

No phase change. Append a one-line note under the active feature: "Investigated: [symptom] → root cause: [X]."
```

- [ ] **Step 3: Create skills/design-consultation/SKILL.md**

```markdown
---
name: design-consultation
phase: 3 of 7 — BUILD
triggers: "design this section, design from scratch, build a design system, design consultation"
ocpp-context: true
---

## Phase Banner
[SHARED — Phase 3 of 7 — BUILD | Previous: Plan ✅ | Next: /build-complete (Build)]

## Prerequisite Check
[SHARED — check Plan ✅ | warn if not]

## Purpose

Builds a complete design system for a new Parser section from scratch:
layout, colour, typography, data presentation, empty state, error state, export.

## Steps

1. Ask: "What data does this section display? Describe the raw data and the insight the operator needs."
2. Propose a section layout:
   - Section header (title + description)
   - Summary cards (key metrics at a glance)
   - Main data table (columns, sorting, filtering)
   - Empty state message
   - Export button (always required)
3. Propose colour coding using Parser conventions:
   - Red: fault / error / critical
   - Amber: warning / degraded
   - Green: normal / healthy
   - Blue: informational
4. Define the Excel export column structure (column names and data types).
5. Ask: "Does this design direction work?"

## OCPP Considerations

- New sections must follow the existing 19-section pattern in `specs/requirements.md`.
- Every table must have an Excel export button — this is a hard requirement.
- OCPP status codes displayed in tables must be shown as human-readable labels, not raw enum values.
- Parser renders in a browser — no server-side code. All logic is client-side JavaScript.

## Output

Design specification documented (inline or saved to scratchpad/temporary-notes/).

## WORKFLOW.md Update
[SHARED — no phase change; note "Design consultation complete" under Build key outputs]

## End Banner
[SHARED — BUILD | Next → /design-shotgun or /design-html or /build-complete]
```

- [ ] **Step 4: Create skills/design-shotgun/SKILL.md**

```markdown
---
name: design-shotgun
phase: 3 of 7 — BUILD
triggers: "generate variants, shotgun, show me options, multiple designs, compare layouts"
ocpp-context: true
---

## Phase Banner
[SHARED — Phase 3 of 7 — BUILD | Previous: Plan ✅ | Next: /design-html (Build)]

## Prerequisite Check
[SHARED — check Plan ✅ | warn if not]

## Purpose

Generates 4–6 distinct UI variants for a Parser section in text/ASCII form.
Each variant takes a different approach to layout, information hierarchy, or
data presentation. User picks one (or a hybrid) for /design-html to implement.

## Steps

1. Ask: "What data does this section show? What is the primary insight the operator needs?"
2. Generate 4 variants, each with:
   - Variant name (e.g., "Timeline View", "Card Grid", "Dense Table", "Summary + Drilldown")
   - ASCII sketch of the layout
   - Pros and cons (2 each)
3. Ask: "Which variant (or combination) would you like to implement?"
4. Document the chosen direction.

## OCPP Considerations

Same as /design-consultation — export button required, OCPP status codes as labels.

## Output

Chosen variant documented. Feed into /design-html.

## WORKFLOW.md Update
[SHARED — note chosen variant under Build key outputs]

## End Banner
[SHARED — BUILD | Next → /design-html]
```

- [ ] **Step 5: Create skills/design-html/SKILL.md**

```markdown
---
name: design-html
phase: 3 of 7 — BUILD
triggers: "build the HTML, implement the design, convert to HTML, code this section"
ocpp-context: true
---

## Phase Banner
[SHARED — Phase 3 of 7 — BUILD | Previous: Plan ✅ | Next: /build-complete]

## Prerequisite Check
[SHARED — check Plan ✅ | warn if not]

## Purpose

Converts an approved design (from /design-consultation or /design-shotgun) into
production HTML/CSS/JS. Knows the Parser is a single HTML file with no build step.
Edits only the canonical source, never index.html.

## Steps

1. Confirm the canonical source path: `src/app/OCPP_Parser_Complete_ 21 Jan'26.html`.
   Never edit `index.html` — it is the deploy copy only.
2. Identify the exact insertion point in the canonical source (section number, function name, line range).
3. Implement the HTML/CSS/JS for the new section following existing section patterns.
4. Verify: does the Parser load without console errors after the change?
5. Verify: does the new section appear in the correct position in the 19-section layout?
6. Verify: does the Export button produce a valid Excel file?
7. Confirm: no hardcoded test data left in the implementation.

## OCPP Considerations

- Canonical source: `src/app/OCPP_Parser_Complete_ 21 Jan'26.html` (9813 lines as of v2026.05.14).
- File size warning: if the canonical source approaches 10,000 lines, flag the Parser revamp task.
- Export uses SheetJS — follow the pattern of existing export functions in the file.
- OCPP status codes must be mapped to human-readable labels using the existing statusLabel() pattern.

## Output

Canonical source updated with new section. Ready for /build-complete.

## WORKFLOW.md Update
[SHARED — note "design-html complete, section added" under Build key outputs]

## End Banner
[SHARED — BUILD | Next → /build-complete]
```

- [ ] **Step 6: Create 5 command files**

`.claude/commands/build-complete.md`, `.claude/commands/investigate.md`,
`.claude/commands/design-consultation.md`, `.claude/commands/design-shotgun.md`,
`.claude/commands/design-html.md`

- [ ] **Step 7: Commit**

```bash
git add skills/build-complete/ skills/investigate/ skills/design-consultation/ skills/design-shotgun/ skills/design-html/ .claude/commands/build-complete.md .claude/commands/investigate.md .claude/commands/design-consultation.md .claude/commands/design-shotgun.md .claude/commands/design-html.md
git commit -m "feat: Build phase skills — /build-complete, /investigate, /design-consultation, /design-shotgun, /design-html"
```

---

## Task 5: Review phase — /review, /design-review, /devex-review, /cso

**Files:** 4 SKILL.md + 4 command files
**Banner values:** Phase 4 of 7 — REVIEW | Previous: Build ✅ | Next: /qa (Test)

- [ ] **Step 1: Create skills/review/SKILL.md**

```markdown
---
name: review
phase: 4 of 7 — REVIEW
triggers: "code review, review this, review the changes, staff review, check the code"
ocpp-context: true
---

## Phase Banner
[SHARED — Phase 4 of 7 — REVIEW | Previous: /build-complete (Build) | Next: /qa (Test)]

## Prerequisite Check

Check `skills/WORKFLOW.md`: is Build marked ✅?
If NOT ✅, print:
  "⚠ Build phase not marked complete. Have you finished implementation?
   Run /build-complete first, or proceed anyway? (yes / no)"

## Purpose

Staff engineer code review. Finds bugs, completeness gaps, and OCPP compliance issues.
Auto-fixes obvious issues (typos, missing null checks). Flags non-obvious issues for
user decision. Does NOT ship — review findings feed into /qa and /ship.

## Steps

1. Read the git diff for the active feature branch vs main.
   Command: `git diff main...HEAD`
2. Check for:
   - **OCPP compliance:** Are message type IDs correct (2/3/4)? Are field names matching the schemas in `src/schemas/ocpp-1.6/`? Are enum values valid?
   - **Canonical source integrity:** Were changes made to `index.html` directly? (Should always be ❌)
   - **CHANGELOG:** Is there a new entry in `CHANGELOG.md` for this change? (Should be ✅ before ship)
   - **Console.log leakage:** Any debug console.log statements in the diff?
   - **Error handling:** Are malformed OCPP messages handled gracefully (not crashing the parser)?
   - **Completeness:** Does the implementation match the spec from `docs/superpowers/specs/`?
   - **File size:** Does `src/app/OCPP_Parser_Complete_ 21 Jan'26.html` exceed 10,000 lines?
3. Classify each finding:
   - **Auto-fix:** Apply immediately (typos, unused variables, missing null check with obvious fix).
   - **Flag:** Present to user with recommendation (design decision, risk, OCPP compliance issue).
4. Apply auto-fixes. Present flagged findings one at a time and ask: "Fix this? (yes / no / later)"
5. Summarise: N issues found, M auto-fixed, K flagged and resolved, J deferred.

## OCPP Considerations

- `src/schemas/ocpp-1.6/[MessageType].json` — canonical field names and types. Any deviation is a bug.
- OCPP 1.6J mandates: UniqueId must be a string; missing required fields must produce a CallError.
- StatusNotification `status` field: valid values are `Available`, `Preparing`, `Charging`, `SuspendedEVSE`, `SuspendedEV`, `Finishing`, `Reserved`, `Unavailable`, `Faulted`.
- Downtime logic: faults detected by gap in heartbeats AND consecutive Faulted StatusNotifications.

## Output

Review summary: issues found, fixed, flagged. WORKFLOW.md updated.

## WORKFLOW.md Update

Mark Review ✅ with today's date.
Append under Key outputs → Review: "N issues found, M fixed, K resolved."
Print: "skills/WORKFLOW.md updated ✓ — Review phase complete."

## End Banner

Print:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Phase 4 — REVIEW complete.
skills/WORKFLOW.md updated ✓
Next → run /qa (Test phase)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

- [ ] **Step 2: Create skills/design-review/SKILL.md**

```markdown
---
name: design-review
phase: 4 of 7 — REVIEW
triggers: "design review, review the UI, check the layout, audit the design"
ocpp-context: true
---

## Phase Banner
[SHARED — Phase 4 of 7 — REVIEW | Previous: /build-complete (Build) | Next: /qa (Test)]

## Prerequisite Check
[SHARED — check Build ✅ | warn if not]

## Purpose

Designer audits the implemented UI. Checks consistency, completeness, export readiness.
For the Parser: every new section is checked against the 19-section established style.

## Steps

1. Ask the user to open the Parser in a browser and navigate to the new section.
2. Check (ask user to confirm each):
   - Section header matches the established pattern (title + description text)?
   - Summary cards present and correctly coloured (red/amber/green/blue)?
   - Main table has correct column headers and sortable columns?
   - Export button present and produces a valid Excel file?
   - Empty state shown correctly when no data matches?
   - No horizontal scroll on standard 1366×768 viewport?
3. Flag any failure. Ask: "Fix now or defer? (now / defer)"
4. Apply fixes if requested (atomic commits per fix).

## OCPP Considerations

OCPP status codes must render as human-readable labels, not raw strings like "SuspendedEVSE".
Fault indicators must use red. Normal status must use green. Warnings use amber.

## Output

Design audit results. Any fixes committed atomically.

## WORKFLOW.md Update
[SHARED — mark Review ⏳ Active (design review done; /review + /cso may still be pending)]

## End Banner
[SHARED — REVIEW | Next → /cso or /qa]
```

- [ ] **Step 3: Create skills/devex-review/SKILL.md**

```markdown
---
name: devex-review
phase: 4 of 7 — REVIEW
triggers: "devex review, operator workflow test, test the workflow, how does it feel to use"
ocpp-context: true
---

## Phase Banner
[SHARED — Phase 4 of 7 — REVIEW | Previous: /build-complete (Build) | Next: /qa (Test)]

## Prerequisite Check
[SHARED — check Build ✅ | warn if not]

## Purpose

Live DX audit. Walks through the feature as a field engineer would use it.
Measures time from opening the Parser to getting the insight they need.

## Steps

1. Ask the user to perform this workflow (time it):
   - Open the Parser → load `data/samples/Sample OCPP Client Log .txt` → navigate to the new section → read the key output.
2. Record the time. Target: under 30 seconds from log load to insight.
3. Check: was anything confusing? Were any labels unclear? Was any action unexpected?
4. If time > 30s or confusion found: identify the bottleneck and suggest a fix.
5. Compare against /plan-devex-review predictions (if that skill was run): did reality match the plan?

## OCPP Considerations

Operators often diagnose faults during an incident. The workflow must work under pressure.
Any feature that requires reading OCPP documentation to understand is a UX failure.

## Output

Operator workflow assessment. Bottlenecks identified and addressed.

## WORKFLOW.md Update
[SHARED — note "devex review complete, time-to-insight: Xs" under Review key outputs]

## End Banner
[SHARED — REVIEW | Next → /cso or /qa]
```

- [ ] **Step 4: Create skills/cso/SKILL.md**

```markdown
---
name: cso
phase: 4 of 7 — REVIEW
triggers: "security review, CSO, OWASP, threat model, security audit, check for vulnerabilities"
ocpp-context: true
---

## Phase Banner
[SHARED — Phase 4 of 7 — REVIEW | Previous: /build-complete (Build) | Next: /qa (Test)]

## Prerequisite Check
[SHARED — check Build ✅ | warn if not]

## Purpose

Security audit using OWASP Top 10 and a STRIDE threat model.
For the Parser: focuses on XSS via log content injection, file input sanitisation,
and credential leakage in log exports.

## Steps

1. Read the git diff: `git diff main...HEAD`
2. Check OWASP Top 10 (relevant to this project):
   - **A03 Injection / XSS:** Does any log content get rendered as innerHTML? (Must use textContent or DOMPurify.)
   - **A01 Broken Access Control:** Does the Parser expose any data the user should not see? (N/A for local tool — note and skip.)
   - **A05 Security Misconfiguration:** Are there any API keys, credentials, or internal URLs in the diff?
   - **A08 Software and Data Integrity:** If new libraries are added, are they from trusted sources?
3. STRIDE threat model (abbreviated for this project type):
   - **Spoofing:** Can a malicious log file impersonate a valid charger?
   - **Tampering:** Can log content alter the Parser's behaviour (script injection)?
   - **Information Disclosure:** Does the export expose anything sensitive?
4. Flag any finding. Propose a fix for each.
5. Apply fixes if user agrees.

## OCPP Considerations

OCPP logs are operator-controlled input but may come from untrusted charger firmware.
Treat all log content as untrusted. Never render OCPP payload fields as HTML.

## Output

Security audit summary. Any fixes committed.

## WORKFLOW.md Update

Mark Review ✅ with today's date (if /review also complete).
Append: "Security audit complete. N findings, M fixed."
Print: "skills/WORKFLOW.md updated ✓ — Review phase complete."

## End Banner

Print:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Phase 4 — REVIEW complete.
skills/WORKFLOW.md updated ✓
Next → run /qa (Test phase)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

- [ ] **Step 5: Create 4 command files**

`.claude/commands/review.md`, `.claude/commands/design-review.md`,
`.claude/commands/devex-review.md`, `.claude/commands/cso.md`

- [ ] **Step 6: Commit**

```bash
git add skills/review/ skills/design-review/ skills/devex-review/ skills/cso/ .claude/commands/review.md .claude/commands/design-review.md .claude/commands/devex-review.md .claude/commands/cso.md
git commit -m "feat: Review phase skills — /review, /design-review, /devex-review, /cso"
```

---

## Task 6: Test phase — /qa, /qa-only, /benchmark

**Files:** 3 SKILL.md + 3 command files
**Banner values:** Phase 5 of 7 — TEST | Previous: Review ✅ | Next: /ship (Ship)

- [ ] **Step 1: Create skills/qa/SKILL.md**

```markdown
---
name: qa
phase: 5 of 7 — TEST
triggers: "QA, test this, run tests, find bugs, verify it works"
ocpp-context: true
---

## Phase Banner
[SHARED — Phase 5 of 7 — TEST | Previous: /review (Review) | Next: /ship (Ship)]

## Prerequisite Check
[SHARED — check Review ✅ | warn if not]

## Purpose

QA lead: tests the feature end-to-end in the real Parser. Loads real sample logs,
checks all affected sections, finds regressions, auto-fixes obvious bugs.
Generates regression test notes for future reference.

## Steps

1. Open the Parser: `src/app/OCPP_Parser_Complete_ 21 Jan'26.html` in a browser (or open `index.html` from the branch — NOT the deployed version).
2. Load `data/samples/Sample OCPP Client Log .txt`.
3. Check all sections that the current feature touches:
   - Does the section render without console errors?
   - Does the data match what you expect from the sample log?
   - Does the Export button produce a valid, correctly-named Excel file?
4. Load `data/samples/TS0064 Emergency Stop No Available Status 13 March 2026.txt`.
5. Repeat step 3 with the second log. This log contains an emergency stop sequence — ensure fault detection sections handle it correctly.
6. Check sections NOT touched by this feature for regressions (spot-check 3 sections).
7. Log all bugs found: symptom, reproduction steps, sample log used.
8. For each bug: auto-fix if obvious; flag if requires design decision.
9. Produce regression test notes: list of "Given [log], then [section] shows [expected output]."

## OCPP Considerations

- Sample log 1: `data/samples/Sample OCPP Client Log .txt` — standard session log.
- Sample log 2: `data/samples/TS0064 Emergency Stop No Available Status 13 March 2026.txt` — emergency stop, TS0064 scenario, used for fault detection testing.
- Expect: Section 14 (WebSocket Health) to show connection events. Section 8 (Downtime) to detect the emergency stop gap.
- Console errors in the browser are bugs — treat them as test failures.

## Output

QA report: sections tested, bugs found, bugs fixed, regression test notes.

## WORKFLOW.md Update

Mark Test ✅ with today's date.
Append: "QA complete. N bugs found, M fixed. Regression notes saved."
Print: "skills/WORKFLOW.md updated ✓ — Test phase complete."

## End Banner

Print:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Phase 5 — TEST complete.
skills/WORKFLOW.md updated ✓
Next → run /ship (Ship phase)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

- [ ] **Step 2: Create skills/qa-only/SKILL.md**

```markdown
---
name: qa-only
phase: 5 of 7 — TEST
triggers: "qa report only, find bugs don't fix, report bugs, audit without fixing"
ocpp-context: true
---

## Phase Banner
[SHARED — Phase 5 of 7 — TEST | Previous: /review (Review) | Next: /ship (Ship)]

## Prerequisite Check
[SHARED — check Review ✅ | warn if not]

## Purpose

Same methodology as /qa but reports bugs without applying any code changes.
Use when fixes need discussion before applying, or when you want a clean bug list first.

## Steps

Follow all steps in /qa (same test procedure and sample logs) EXCEPT:
- Do NOT auto-fix any bugs.
- Do NOT apply any code changes.
- Produce a numbered bug report only: symptom, reproduction steps, severity (P1/P2/P3).

Present the report to the user. Ask: "Which bugs should I fix now?"
Then stop. The user will invoke /qa (or fix manually) for the fixes.

## OCPP Considerations

Same as /qa.

## Output

Bug report (numbered list, no code changes).

## WORKFLOW.md Update

Mark Test ⏳ Active (qa-only run; fixes pending).
Note: "qa-only complete — N bugs reported, awaiting fix decisions."
```

- [ ] **Step 3: Create skills/benchmark/SKILL.md**

```markdown
---
name: benchmark
phase: 5 of 7 — TEST
triggers: "benchmark, performance test, how fast, measure load time, perf test"
ocpp-context: true
---

## Phase Banner
[SHARED — Phase 5 of 7 — TEST | Previous: /review (Review) | Next: /ship (Ship)]

## Prerequisite Check
[SHARED — check Review ✅ | warn if not]

## Purpose

Measures Parser performance before and after the change. Key metrics: page load time,
log parse time, Excel export time. Relevant for large logs (6000+ lines).

## Steps

1. Open browser DevTools → Performance tab (or Network tab for load time).
2. Measure BEFORE (on main branch):
   - Page load time (DOMContentLoaded)
   - Time to parse `data/samples/TS0064 Emergency Stop No Available Status 13 March 2026.txt` (6398 lines — time from file select to all sections rendered)
   - Excel export time for the largest section
3. Switch to the feature branch. Measure AFTER with the same log.
4. Compare: flag any metric that regressed > 10%.
5. If regression found: profile using browser DevTools → identify the slow function → report to user.

## OCPP Considerations

The 6398-line TS0064 log is the performance benchmark log. Parser must complete all 19
sections within 5 seconds on a standard laptop. Excel export must complete within 3 seconds.

## Output

Before/after performance table. Any regressions flagged.

## WORKFLOW.md Update

Append: "Benchmark: parse time [X]ms → [Y]ms, export time [A]ms → [B]ms."
(Does not mark Test ✅ alone — /qa must also pass.)
```

- [ ] **Step 4: Create 3 command files**

`.claude/commands/qa.md`, `.claude/commands/qa-only.md`, `.claude/commands/benchmark.md`

- [ ] **Step 5: Commit**

```bash
git add skills/qa/ skills/qa-only/ skills/benchmark/ .claude/commands/qa.md .claude/commands/qa-only.md .claude/commands/benchmark.md
git commit -m "feat: Test phase skills — /qa, /qa-only, /benchmark"
```

---

## Task 7: Ship phase — /ship, /document-release, /document-generate, /land-and-deploy, /canary

**Files:** 5 SKILL.md + 5 command files
**Banner values:** Phase 6 of 7 — SHIP | Previous: Test ✅ | Next: /retro (Reflect)

- [ ] **Step 1: Create skills/ship/SKILL.md**

```markdown
---
name: ship
phase: 6 of 7 — SHIP
triggers: "ship it, create a PR, push this, open a pull request, ready to ship"
ocpp-context: true
---

## Phase Banner
[SHARED — Phase 6 of 7 — SHIP | Previous: /qa (Test) | Next: /document-release (Ship)]

## Prerequisite Check
[SHARED — check Test ✅ | warn if not]

## Purpose

Prepares the feature for merge. Copies canonical source to index.html, commits,
pushes, opens a PR. Enforces the Branch → PR → Merge git workflow.

## Steps

1. Confirm the active branch: `git branch --show-current`.
   Must be a `feat/`, `fix/`, `docs/`, or `chore/` branch. Never `main`.
2. Copy canonical source to deploy copy:
   Copy `src/app/OCPP_Parser_Complete_ 21 Jan'26.html` → `index.html` (root).
3. Stage and commit the deploy copy:
   ```bash
   git add index.html
   git commit -m "chore: sync index.html with canonical source for deploy"
   ```
4. Check all review and QA findings are resolved. If any P1 bug is open: stop and warn.
5. Push the branch:
   ```bash
   git push -u origin [branch-name]
   ```
6. Provide the PR creation URL:
   `https://github.com/spsrathore-code/ocpp-parser/pull/new/[branch-name]`
7. Remind: open the URL in a browser, add PR title and description, then merge.

## OCPP Considerations

- Canonical source path: `src/app/OCPP_Parser_Complete_ 21 Jan'26.html`
- Deploy copy: root `index.html` — this is what GitHub Pages serves.
- Never push directly to main — always via PR.
- Branch naming: `feat/`, `fix/`, `docs/`, `chore/` prefixes only.

## Output

Branch pushed. PR URL provided. index.html synced.

## WORKFLOW.md Update

Mark Ship ⏳ Active (PR open, pending merge).
Append under Key outputs → Ship: PR URL.
Print: "skills/WORKFLOW.md updated ✓ — Ship phase active (PR open)."

## End Banner

Print:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/ship complete. PR ready for merge.
skills/WORKFLOW.md updated ✓
Next → run /document-release, then merge PR, then /land-and-deploy
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

- [ ] **Step 2: Create skills/document-release/SKILL.md**

```markdown
---
name: document-release
phase: 6 of 7 — SHIP
triggers: "document the release, update docs, update changelog, release notes, document this change"
ocpp-context: true
---

## Phase Banner
[SHARED — Phase 6 of 7 — SHIP | Previous: /ship (Ship) | Next: /land-and-deploy (Ship)]

## Prerequisite Check
[SHARED — check Test ✅ | warn if not]

## Purpose

Updates all documentation to match the shipped change. Produces a CHANGELOG entry.
Checks docs/ for staleness. Knows the project's CHANGELOG format and SSOT structure.

## Steps

1. Read the git diff: `git diff main...HEAD`
2. Update `CHANGELOG.md`:
   - Add a new dated entry at the top.
   - Format: `## vYYYY.MM.DD — [Feature name]` followed by bullet points.
   - Each bullet: one sentence describing a user-visible change.
3. Check `docs/` for staleness:
   - Does `docs/workflow.md` reflect the new deploy workflow (if it changed)?
   - Does `docs/skill-chain.md` need updating (if skill chain was modified)?
   - Does `docs/overview.md` need updating (if a major new feature was added)?
4. Check `specs/requirements.md` (SSOT):
   - If a new Parser section was added: add it to the section inventory in requirements.md.
   - If requirements changed: update the relevant section.
5. Commit all doc changes:
   ```bash
   git add CHANGELOG.md docs/ specs/requirements.md
   git commit -m "docs: update CHANGELOG and docs for [feature-name]"
   ```

## OCPP Considerations

`specs/requirements.md` is the SSOT — it must accurately reflect the Parser as it exists
after the change. Never let requirements.md drift from the actual implementation.

## Output

CHANGELOG updated. Docs updated. All committed on the feature branch.

## WORKFLOW.md Update
[SHARED — note "docs updated" under Ship key outputs]

## End Banner
[SHARED — SHIP | Next → /land-and-deploy]
```

- [ ] **Step 3: Create skills/document-generate/SKILL.md**

```markdown
---
name: document-generate
phase: 6 of 7 — SHIP
triggers: "generate docs, write missing docs, create documentation, document this feature"
ocpp-context: true
---

## Phase Banner
[SHARED — Phase 6 of 7 — SHIP | Previous: /ship (Ship) | Next: /land-and-deploy (Ship)]

## Prerequisite Check
[SHARED — check Test ✅ | warn if not]

## Purpose

Generates missing documentation from scratch using the Diataxis framework.
Called by /document-release when gaps are found.

## Steps

1. Identify what type of documentation is missing:
   - **Reference:** "What is X?" — factual, no prose. E.g., OCPP message field descriptions.
   - **How-to:** "How do I do X?" — task-oriented steps. E.g., "How to load a log and export Section 8."
   - **Tutorial:** "Learn by doing." — guided walkthrough for new users.
   - **Explanation:** "Why does X work this way?" — conceptual background.
2. Generate the appropriate doc type for the missing content.
3. Save to the correct location:
   - Reference/How-to/Tutorial/Explanation → `docs/[filename].md`
   - User-facing → `docs/user-guide.md` (append) or a new file if substantial.
4. Ask: "Does this doc look correct and complete?"

## OCPP Considerations

All OCPP terminology must match OCPP 1.6J specification language exactly.
Do not invent abbreviations or alternate names for standard terms.

## Output

New documentation file(s) in `docs/`.

## WORKFLOW.md Update
[SHARED — note "new docs generated" under Ship key outputs]

## End Banner
[SHARED — SHIP | Next → /land-and-deploy]
```

- [ ] **Step 4: Create skills/land-and-deploy/SKILL.md**

```markdown
---
name: land-and-deploy
phase: 6 of 7 — SHIP
triggers: "land and deploy, merge the PR, deploy to production, merge and deploy"
ocpp-context: true
---

## Phase Banner
[SHARED — Phase 6 of 7 — SHIP | Previous: /document-release (Ship) | Next: /canary (Ship)]

## Prerequisite Check
[SHARED — check Ship ⏳ Active (PR open) | warn if PR not yet opened]

## Purpose

Merges the approved PR and monitors the GitHub Pages deploy.
Verifies the deployed URL is live and serving the updated Parser.

## Steps

1. Confirm the PR has been approved and merged on GitHub.
   Ask: "Has the PR been merged on GitHub? (yes / not yet)"
   If not yet: stop. Come back when merged.
2. Sync local main:
   ```bash
   git checkout main
   git pull origin main
   ```
3. Verify the merge landed:
   ```bash
   git log --oneline -3
   ```
   The feature commit(s) should appear at the top.
4. GitHub Pages auto-deploys on push to main. Wait ~60 seconds.
5. Verify the deployed URL is live: `https://spsrathore-code.github.io/ocpp-parser/`
   (Ask the user to open it and confirm it loads without errors.)
6. Check the version label/date in the Parser header matches the shipped version.

## OCPP Considerations

GitHub Pages serves `index.html` from the root of main. The deploy copy is created
by /ship (copy from canonical source). If the Parser loads but data is wrong, the
canonical source was not correctly copied.

## Output

main synced locally. Deployed URL confirmed live.

## WORKFLOW.md Update

Mark Ship ✅ with today's date.
Append under Key outputs → Ship: deployed URL + merge commit SHA.
Print: "skills/WORKFLOW.md updated ✓ — Ship phase complete."

## End Banner

Print:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Phase 6 — SHIP complete. Live at:
https://spsrathore-code.github.io/ocpp-parser/
skills/WORKFLOW.md updated ✓
Next → run /canary (post-deploy health check)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

- [ ] **Step 5: Create skills/canary/SKILL.md**

```markdown
---
name: canary
phase: 6 of 7 — SHIP
triggers: "canary check, post-deploy check, verify production, health check, is it live"
ocpp-context: true
---

## Phase Banner
[SHARED — Phase 6 of 7 — SHIP | Previous: /land-and-deploy (Ship) | Next: /retro (Reflect)]

## Prerequisite Check
[SHARED — check Ship ✅ | warn if not]

## Purpose

Post-deploy health check on the live GitHub Pages deployment.
Verifies no console errors, all sections load, export works.

## Steps

Ask the user to perform these checks on `https://spsrathore-code.github.io/ocpp-parser/`:

1. Open the URL. Does the Parser load? (yes / no)
2. Open browser DevTools → Console. Any errors on page load? (yes = bug / no = ✅)
3. Load `data/samples/Sample OCPP Client Log .txt`. Do all sections render? (yes / no)
4. Navigate to the section added/changed by this feature. Does it display correctly? (yes / no)
5. Click Export on the changed section. Does a valid Excel file download? (yes / no)
6. Check the version label in the Parser header — does it match the shipped version? (yes / no)

If any check fails: record the failure, diagnose (it may be a cache issue — hard refresh first),
then open a new `fix/` branch to address it.

## OCPP Considerations

Cache issues are common with GitHub Pages. If the old version appears: Ctrl+Shift+R (hard refresh).
If the Parser loads but shows stale data: the deploy copy (index.html) may not have been updated.

## Output

Canary check results (all ✅ or failure list).

## WORKFLOW.md Update
[SHARED — note "canary: all ✅" or list failures under Ship key outputs]

## End Banner

Print:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/canary complete. Production health confirmed.
Next → run /retro + /learn (Reflect phase)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

- [ ] **Step 6: Create 5 command files**

`.claude/commands/ship.md`, `.claude/commands/document-release.md`,
`.claude/commands/document-generate.md`, `.claude/commands/land-and-deploy.md`,
`.claude/commands/canary.md`

- [ ] **Step 7: Commit**

```bash
git add skills/ship/ skills/document-release/ skills/document-generate/ skills/land-and-deploy/ skills/canary/ .claude/commands/ship.md .claude/commands/document-release.md .claude/commands/document-generate.md .claude/commands/land-and-deploy.md .claude/commands/canary.md
git commit -m "feat: Ship phase skills — /ship, /document-release, /document-generate, /land-and-deploy, /canary"
```

---

## Task 8: Reflect phase — /retro, /learn

**Files:** 2 SKILL.md + 2 command files
**Banner values:** Phase 7 of 7 — REFLECT | Previous: Ship ✅ | Next: (chain complete)

- [ ] **Step 1: Create skills/retro/SKILL.md**

```markdown
---
name: retro
phase: 7 of 7 — REFLECT
triggers: "retro, retrospective, weekly review, what did we learn, reflect on the week"
ocpp-context: true
---

## Phase Banner
[SHARED — Phase 7 of 7 — REFLECT | Previous: /canary (Ship) | Next: (chain complete / new feature)]

## Prerequisite Check
[SHARED — check Ship ✅ | warn if not]

## Purpose

Weekly retrospective. Reviews what shipped, what took longer than expected, and
identifies patterns to improve the next cycle. Reads project-journal.md for context.

## Steps

1. Read `knowledge/project-journal.md` — entries from the past 7 days.
2. Read `CHANGELOG.md` — entries from the past 7 days.
3. Produce a retrospective with these sections:
   - **Shipped:** What features/fixes went live this week?
   - **What went well:** Specific practices or decisions that helped.
   - **What was slower than expected:** Where did work take longer? Why?
   - **One thing to change next cycle:** A specific, actionable improvement.
   - **OCPP lessons:** Any new understanding of OCPP 1.6J behaviour, Parser architecture, or charger diagnostics?
4. Save to `knowledge/lessons-learned/YYYY-MM-DD-retro.md`.
5. Ask: "Does this retrospective capture everything? Anything to add?"

## OCPP Considerations

Note any OCPP protocol surprises (unexpected message ordering, edge cases in field logs,
charger firmware quirks) — these belong in the lessons-learned record.

## Output

`knowledge/lessons-learned/YYYY-MM-DD-retro.md`

## WORKFLOW.md Update

Mark Reflect ⏳ Active.
Print: "skills/WORKFLOW.md updated ✓ — Reflect phase active."

## End Banner

Print:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/retro complete. Lessons saved.
Next → run /learn to close the feature and update the journal.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

- [ ] **Step 2: Create skills/learn/SKILL.md**

```markdown
---
name: learn
phase: 7 of 7 — REFLECT
triggers: "update the journal, log this session, learn, close the feature, session summary"
ocpp-context: true
---

## Phase Banner
[SHARED — Phase 7 of 7 — REFLECT | Previous: /retro (Reflect) | Next: (chain complete)]

## Purpose

Appends a dated session summary to `knowledge/project-journal.md`.
Moves completed tasks in `specs/tasks.md`. Marks the Reflect phase complete.
Triggered any time the user says "update the journal" — not only at end of chain.

## Steps

1. Ask: "What did we work on in this session?" (Prompt for: discussed, decided, implemented, next.)
   (If invoked as part of the chain after /retro, read the retro doc instead of asking.)
2. Append to `knowledge/project-journal.md`:

   ```markdown
   ## YYYY-MM-DD — [Session topic]

   ### Discussed
   - [topics covered in this session]

   ### Decided
   - [decisions made and rationale]

   ### Implemented
   - [files created/changed, or "design phase only" if no code written]

   ### Next
   - [pending items for next session]
   ```

3. Review `specs/tasks.md`:
   - Move any completed items from Next → Done.
   - Add any new Next items from the session.
4. Commit journal and tasks:
   ```bash
   git add knowledge/project-journal.md specs/tasks.md
   git commit -m "docs: session journal update YYYY-MM-DD"
   ```
5. Print:
   ```
   knowledge/project-journal.md updated ✓  (YYYY-MM-DD entry appended)
   specs/tasks.md updated ✓               (N items moved to Done)
   ```

## OCPP Considerations

If the session involved any OCPP protocol discoveries (unexpected charger behaviour,
new understanding of field log patterns), include them in the Discussed section.

## Output

`knowledge/project-journal.md` — new entry appended.
`specs/tasks.md` — tasks updated.

## WORKFLOW.md Update

Mark Reflect ✅ with today's date.
Move completed feature to "Completed features" table in WORKFLOW.md.
Print: "skills/WORKFLOW.md updated ✓ — Reflect phase complete. Feature [name] archived."

## End Banner

Print:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Phase 7 — REFLECT complete. Feature cycle closed.
knowledge/project-journal.md updated ✓
skills/WORKFLOW.md updated ✓ (feature archived)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

- [ ] **Step 3: Create 2 command files**

`.claude/commands/retro.md`, `.claude/commands/learn.md`

- [ ] **Step 4: Commit**

```bash
git add skills/retro/ skills/learn/ .claude/commands/retro.md .claude/commands/learn.md
git commit -m "feat: Reflect phase skills — /retro, /learn"
```

---

## Task 9: Safety tools — /careful, /freeze, /guard, /unfreeze

**Files:** 4 SKILL.md + 4 command files
**Phase:** Not phase-specific — available at any time.

- [ ] **Step 1: Create skills/careful/SKILL.md**

```markdown
---
name: careful
phase: safety tool (any phase)
triggers: "careful, warn me before destructive commands, safety mode on"
ocpp-context: false
---

## Purpose

Activates a safety gate: Claude will warn before any command that is hard to reverse.
Covers: `rm`, `git reset --hard`, `git push --force`, `git checkout --`, DROP TABLE,
overwriting uncommitted files, deleting branches.

## Steps

When /careful is active, before executing any destructive command, Claude must:
1. Print: "⚠ CAREFUL: [command] is destructive and hard to reverse."
2. State what will be lost or changed.
3. Ask: "Proceed? (yes / no)"
4. Only proceed if user says yes.

Remains active for the duration of the session. To deactivate: start a new session.
```

- [ ] **Step 2: Create skills/freeze/SKILL.md**

```markdown
---
name: freeze
phase: safety tool (any phase)
triggers: "freeze, lock this directory, only edit in this folder, restrict edits"
ocpp-context: false
---

## Purpose

Restricts Claude's file edits to one specified directory during a debugging session.
Prevents accidental edits to files outside the scope of investigation.

## Steps

1. Ask: "Which directory should I restrict edits to?" (e.g., `src/app/`)
2. Confirm: "I will only edit files inside `[directory]/` until you run /unfreeze."
3. For the rest of the session: before any file edit, check the path. If outside the frozen
   directory, warn: "⚠ FROZEN: [file] is outside `[directory]/`. Edit anyway? (yes / no)"
```

- [ ] **Step 3: Create skills/guard/SKILL.md**

```markdown
---
name: guard
phase: safety tool (any phase)
triggers: "guard, maximum safety, lock everything down, careful and freeze"
ocpp-context: false
---

## Purpose

Activates both /careful and /freeze simultaneously. Maximum safety mode.

## Steps

1. Ask: "Which directory should I restrict edits to?"
2. Activate /careful (warn before destructive commands).
3. Activate /freeze for the specified directory.
4. Confirm: "Guard active. Destructive commands require confirmation. Edits restricted to `[dir]/`."
```

- [ ] **Step 4: Create skills/unfreeze/SKILL.md**

```markdown
---
name: unfreeze
phase: safety tool (any phase)
triggers: "unfreeze, remove the freeze, unlock, stop restricting edits"
ocpp-context: false
---

## Purpose

Removes the /freeze directory restriction. /careful remains active if it was set.

## Steps

1. Confirm: "Removing freeze restriction. Edits are no longer restricted to `[frozen-dir]/`."
2. Note: /careful remains active if it was activated separately. Run a new session to deactivate /careful.
```

- [ ] **Step 5: Create 4 command files**

`.claude/commands/careful.md`, `.claude/commands/freeze.md`,
`.claude/commands/guard.md`, `.claude/commands/unfreeze.md`

- [ ] **Step 6: Commit**

```bash
git add skills/careful/ skills/freeze/ skills/guard/ skills/unfreeze/ .claude/commands/careful.md .claude/commands/freeze.md .claude/commands/guard.md .claude/commands/unfreeze.md
git commit -m "feat: safety tools — /careful, /freeze, /guard, /unfreeze"
```

---

## Task 10: Final branch and PR

- [ ] **Step 1: Verify all files are committed**

```bash
git status
```
Expected: "nothing to commit, working tree clean"

- [ ] **Step 2: Push the branch**

```bash
git push -u origin docs/skill-chain-design
```

- [ ] **Step 3: Open PR on GitHub**

URL: `https://github.com/spsrathore-code/ocpp-parser/pull/new/docs/skill-chain-design`

PR title: `feat: OCPP Tool Suite skill chain — 28 skills, slash commands, WORKFLOW.md`

PR body:
```
## Summary

- 28 SKILL.md files covering all 7 phases: Think → Plan → Build → Review → Test → Ship → Reflect
- 28 slash command entry points in .claude/commands/
- skills/WORKFLOW.md: live per-feature state tracker
- skills/CHAIN.md: quick reference map
- CLAUDE.md: Skill Chain section added
- project-standard.md: skills/ added to universal repo tree
- Inspired by gstack; fully adapted for OCPP 1.6J / Ador Digatron context

## Test plan

- [ ] /office-hours invoked → phase banner prints, six questions asked one at a time
- [ ] /spec invoked → spec saved to docs/superpowers/specs/
- [ ] /plan-eng-review invoked → arch doc produced, WORKFLOW.md updated
- [ ] /build-complete invoked → Build ✅ in WORKFLOW.md, next step printed
- [ ] /review invoked without Build ✅ → warning prompt appears
- [ ] /learn invoked → project-journal.md appended, tasks.md updated, confirmation printed
- [ ] /careful invoked → destructive command prompts confirmation before running

🤖 Generated with [Claude Code](https://claude.com/claude-code)
```

---

## Self-Review

**Spec coverage check:**
- ✅ 28 skills from design doc — all present (Tasks 2–9)
- ✅ WORKFLOW.md starter template — Task 0
- ✅ CHAIN.md quick reference — Task 0
- ✅ .claude/commands/ slash command files — every task
- ✅ CLAUDE.md Skill Chain section — Task 1
- ✅ project-standard.md skills/ tree entry — Task 1
- ✅ Phase banners — every SKILL.md
- ✅ Prerequisite checks — every SKILL.md (skip on Think-phase skills)
- ✅ WORKFLOW.md updates — every SKILL.md
- ✅ End banners — every SKILL.md
- ✅ OCPP-specific context — every skill (canonical source path, sample log paths, schema locations, deploy workflow)
- ✅ /build-complete two-safety-net design — Task 4 Step 1 + /review prerequisite check
- ✅ /learn session journal protocol — Task 8 Step 2

**Placeholder scan:** No TBDs, no TODOs, no "similar to" references. All SHARED references point to the Common Pattern section at the top of this plan.

**Type consistency:** WORKFLOW.md format defined once in Task 0 and referenced consistently across all skills. Phase numbers (1–7) are consistent throughout. Command names match between SKILL.md triggers, command file names, and commit messages.
