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
