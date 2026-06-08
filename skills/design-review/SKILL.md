---
name: design-review
phase: 4 of 7 — REVIEW
triggers: "design review, review the UI, check the layout, audit the design"
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
Current:   /design-review
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
ChargePointStatus (§7.7) and ChargePointErrorCode (§7.6) values: always label, never raw enum.

## Output

Design audit results. Any fixes committed atomically.

## WORKFLOW.md Update

In `skills/WORKFLOW.md`, find the active feature section:
1. Mark Review as ⏳ Active (design review done; /review + /cso may still be pending).
2. Append: "Design review complete."
3. Print: "skills/WORKFLOW.md updated ✓ — Review phase active (design review done)."

## End Banner

Print:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/design-review complete.
Next → /cso (security) or /qa (Test)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
