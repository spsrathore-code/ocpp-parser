---
name: design-shotgun
phase: 3 of 7 — BUILD
triggers: "generate variants, shotgun, show me options, multiple designs, compare layouts"
ocpp-context: true
---

## Phase Banner

Read `skills/WORKFLOW.md`. Print:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
OCPP Tool Suite — Skill Chain
Phase 3 of 7 — BUILD
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Feature:   [active feature from WORKFLOW.md]
Previous:  Plan ✅  [✅ Complete | ⚠ Not recorded]
Current:   /design-shotgun
Next:      /design-html (Build)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## Prerequisite Check

Check `skills/WORKFLOW.md`: is Plan marked ✅?
If NOT ✅, print:
  "⚠ WARNING: Plan phase not marked complete in WORKFLOW.md.
   Expected /plan-eng-review to have run first.
   Proceed anyway? (yes / no)"
  If no: stop here.

## Purpose

Generates 4–6 distinct UI variants for a Parser section in text/ASCII form.
Each variant takes a different approach to layout, information hierarchy, or
data presentation. User picks one (or a hybrid) for /design-html to implement.

## Steps

1. Ask: "What data does this section show? What is the primary insight the operator needs?"
2. Generate 4 variants, each with:
   - Variant name (e.g., "Timeline View", "Card Grid", "Dense Table", "Summary + Drilldown")
   - ASCII sketch of the layout
   - Pros and cons (2 each)
3. Ask: "Which variant (or combination) would you like to implement?"
4. Document the chosen direction.

## OCPP Considerations

Export button required (FR-327). OCPP status codes as human-readable labels (not raw strings).
Colour conventions: red = fault, amber = warning, green = normal, blue = informational.

## Output

Chosen variant documented. Feed into /design-html.

## WORKFLOW.md Update

Append: "Design shotgun complete — [variant name] chosen."

## End Banner

Print:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Design shotgun complete. Variant chosen.
Next → /design-html
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
