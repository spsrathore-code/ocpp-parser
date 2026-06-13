---
name: plan-ceo-review
phase: 2 of 7 — PLAN
triggers: "scope review, is this the right problem, ceo review, expand or reduce scope"
ocpp-context: true
---

## Phase Banner

Read `skills/WORKFLOW.md`. Print:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
OCPP Tool Suite — Skill Chain
Phase 2 of 7 — PLAN
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Feature:   [active feature from WORKFLOW.md]
Previous:  /spec (Think)  [✅ Complete | ⚠ Not recorded]
Current:   /plan-ceo-review
Next:      /plan-eng-review (Plan)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## Prerequisite Check

Check `skills/WORKFLOW.md`: is Think marked ✅?
If NOT ✅, print:
  "⚠ WARNING: Think phase not marked complete in WORKFLOW.md.
   Expected /spec to have run first.
   Proceed anyway? (yes / no)"
  If no: stop here.

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

In `skills/WORKFLOW.md`, find the active feature section:
1. Mark Plan as ⏳ Active with today's date.
2. Append a one-line note under "Key outputs → Plan" describing the scope decision.
3. Print: "skills/WORKFLOW.md updated ✓ — Plan phase active."

## End Banner

Print:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Phase 2 — PLAN (scope review done).
skills/WORKFLOW.md updated ✓
Next → /plan-eng-review
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
