---
name: plan-design-review
phase: 2 of 7 — PLAN
triggers: "design plan, UI review, rate this design, plan the UI, design review before build"
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
Current:   /plan-design-review
Next:      /plan-eng-review (Plan) or /build-complete (Build)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## Prerequisite Check

Check `skills/WORKFLOW.md`: is Think marked ✅?
If NOT ✅, print:
  "⚠ WARNING: Think phase not marked complete in WORKFLOW.md.
   Expected /spec to have run first.
   Proceed anyway? (yes / no)"
  If no: stop here.

## Purpose

Senior designer reviews the planned UI/UX before any implementation. Rates design
decisions 0–10 per dimension. Detects over-engineering. For the Parser, checks
consistency with the existing 19-section layout and requirements.md (UI-001–UI-014).

## Steps

1. Ask the user to describe or sketch the planned UI (text description, mockup, or bullet points).
2. Rate on these dimensions (0–10, with one-sentence rationale each):
   - **Clarity:** Does the user immediately understand what this section does?
   - **Consistency:** Does it match the existing Parser section style?
   - **Completeness:** Does it handle empty state, error state, loading state?
   - **Export readiness:** Can every visible table be exported to Excel?
   - **Simplicity:** Is anything here that operators don't need?
3. Flag any score below 7 as a concern requiring redesign before proceeding.
4. Suggest specific improvements for flagged dimensions.
5. Ask: "Do you want to revise the design based on these findings?"

## OCPP Considerations

- For Parser: new sections must follow the 19-section pattern in `specs/requirements.md` (UI-001–UI-014). Export-to-Excel is FR-327 — a hard requirement for every data table.
- Operators use this on-site, often on laptops — avoid dense layouts.
- Colour palette: existing Parser uses semantic colours (red = fault, amber = warning, green = normal). New sections must respect this.

## Output

Design review summary noted in the spec or arch doc.

## WORKFLOW.md Update

In `skills/WORKFLOW.md`, find the active feature section:
1. Mark Plan as ⏳ Active (design review done; eng review may follow).
2. Append: "Design review complete — scores recorded."
3. Print: "skills/WORKFLOW.md updated ✓ — Plan phase active (design review done)."

## End Banner

Print:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Phase 2 — PLAN (design review done).
Next → /plan-eng-review (if not done) or /build-complete (Build)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
