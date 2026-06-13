---
name: plan-devex-review
phase: 2 of 7 — PLAN
triggers: "devex review, operator experience, who uses this, user workflow review"
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
Current:   /plan-devex-review
Next:      /build-complete (Build)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## Prerequisite Check

Check `skills/WORKFLOW.md`: is Think marked ✅?
If NOT ✅, print:
  "⚠ WARNING: Think phase not marked complete in WORKFLOW.md.
   Expected /spec to have run first.
   Proceed anyway? (yes / no)"
  If no: stop here.

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
- OCPP ChargePointStatus values (§7.7): Available, Preparing, Charging, SuspendedEVSE, SuspendedEV, Finishing, Reserved, Unavailable, Faulted — these must be human-readable, not raw enum strings.
- Downtime periods and fault types (from `specs/requirements.md`) are the primary diagnostic output.
- ChargePointErrorCode (§7.6) 16 values: map to plain-language descriptions for operator use.

## Output

Persona and friction analysis noted in spec or arch doc.

## WORKFLOW.md Update

In `skills/WORKFLOW.md`, find the active feature section:
1. Mark Plan as ⏳ Active.
2. Append: "DevEx review complete — persona defined, friction points identified."
3. Print: "skills/WORKFLOW.md updated ✓ — Plan phase active (devex review done)."

## End Banner

Print:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Phase 2 — PLAN (devex review done).
Next → /build-complete (Build)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
