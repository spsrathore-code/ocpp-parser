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

Check `skills/WORKFLOW.md`: is Plan marked ✅?
If NOT ✅, print:
  "⚠ WARNING: Plan phase not marked complete in WORKFLOW.md.
   Expected /plan-eng-review to have run first.
   Proceed anyway? (yes / no)"
  If no: stop here.

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
