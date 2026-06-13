---
name: devex-review
phase: 4 of 7 — REVIEW
triggers: "devex review, operator workflow test, test the workflow, how does it feel to use"
ocpp-context: true
---

## Phase Banner

Read `skills/WORKFLOW.md`. Print:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
OCPP Tool Suite — Skill Chain
Phase 4 of 7 — REVIEW
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Feature:   [active feature from WORKFLOW.md]
Previous:  /build-complete (Build)  [✅ Complete | ⚠ Not recorded]
Current:   /devex-review
Next:      /cso or /qa (Test)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## Prerequisite Check

Check `skills/WORKFLOW.md`: is Build marked ✅?
If NOT ✅, print:
  "⚠ WARNING: Build phase not marked complete in WORKFLOW.md.
   Expected /build-complete to have run first.
   Proceed anyway? (yes / no)"
  If no: stop here.

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
OCPP ChargePointErrorCode (§7.6) values must be explained in plain English — not shown as raw code.

## Output

Operator workflow assessment. Bottlenecks identified and addressed.

## WORKFLOW.md Update

In `skills/WORKFLOW.md`, find the active feature section:
1. Append: "devex review complete — time-to-insight: [X]s."
2. Print: "skills/WORKFLOW.md updated ✓ — devex review done."

## End Banner

Print:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/devex-review complete.
Next → /cso (security) or /qa (Test)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
