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
