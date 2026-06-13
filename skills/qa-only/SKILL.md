---
name: qa-only
phase: 5 of 7 — TEST
triggers: "qa report only, find bugs don't fix, report bugs, audit without fixing"
ocpp-context: true
---

## Phase Banner

Read `skills/WORKFLOW.md`. Print:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
OCPP Tool Suite — Skill Chain
Phase 5 of 7 — TEST
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Feature:   [active feature from WORKFLOW.md]
Previous:  /review (Review)  [✅ Complete | ⚠ Not recorded]
Current:   /qa-only (report only — no fixes)
Next:      /qa (for fixes) or /ship (Ship)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## Prerequisite Check

Check `skills/WORKFLOW.md`: is Review marked ✅?
If NOT ✅, print:
  "⚠ WARNING: Review phase not marked complete in WORKFLOW.md.
   Expected /review to have run first.
   Proceed anyway? (yes / no)"
  If no: stop here.

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

Same as /qa — sample logs, 19-section checks, J04 Table 7 error codes, §7.6 ChargePointErrorCode, §7.36 Reason, §3.15 ISO 8601, §3.8 connector IDs.

## Output

Bug report (numbered list, no code changes).

## WORKFLOW.md Update

Mark Test ⏳ Active (qa-only run; fixes pending).
Note: "qa-only complete — N bugs reported, awaiting fix decisions."
