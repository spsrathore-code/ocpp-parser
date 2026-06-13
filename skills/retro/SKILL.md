---
name: retro
phase: 7 of 7 — REFLECT
triggers: "retro, retrospective, weekly review, what did we learn, reflect on the week"
ocpp-context: true
---

## Phase Banner

Read `skills/WORKFLOW.md`. Print:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
OCPP Tool Suite — Skill Chain
Phase 7 of 7 — REFLECT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Feature:   [active feature from WORKFLOW.md]
Previous:  /canary (Ship)  [✅ Complete | ⚠ Not recorded]
Current:   /retro
Next:      /learn (Reflect — closes the feature)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## Prerequisite Check

Check `skills/WORKFLOW.md`: is Ship marked ✅?
If NOT ✅, print:
  "⚠ WARNING: Ship phase not marked complete in WORKFLOW.md.
   Expected /canary to have run first.
   Proceed anyway? (yes / no)"
  If no: stop here.

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
