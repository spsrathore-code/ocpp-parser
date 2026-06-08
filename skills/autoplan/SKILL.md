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
