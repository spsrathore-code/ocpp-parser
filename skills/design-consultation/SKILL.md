---
name: design-consultation
phase: 3 of 7 — BUILD
triggers: "design this section, design from scratch, build a design system, design consultation"
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
Current:   /design-consultation
Next:      /build-complete (Build)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## Prerequisite Check

Check `skills/WORKFLOW.md`: is Plan marked ✅?
If NOT ✅, print:
  "⚠ WARNING: Plan phase not marked complete in WORKFLOW.md.
   Expected /plan-eng-review to have run first.
   Proceed anyway? (yes / no)"
  If no: stop here.

## Purpose

Builds a complete design system for a new Parser section from scratch:
layout, colour, typography, data presentation, empty state, error state, export.

## Steps

1. Ask: "What data does this section display? Describe the raw data and the insight the operator needs."
2. Propose a section layout:
   - Section header (title + description)
   - Summary cards (key metrics at a glance)
   - Main data table (columns, sorting, filtering)
   - Empty state message
   - Export button (always required)
3. Propose colour coding using Parser conventions:
   - Red: fault / error / critical
   - Amber: warning / degraded
   - Green: normal / healthy
   - Blue: informational
4. Define the Excel export column structure (column names and data types).
5. Ask: "Does this design direction work?"

## OCPP Considerations

- New sections must follow the existing 19-section pattern in `specs/requirements.md`.
- Every table must have an Excel export button — this is FR-327 (hard requirement).
- OCPP status codes displayed in tables must be shown as human-readable labels, not raw enum values.
- Parser renders in a browser — no server-side code. All logic is client-side JavaScript.
- ChargePointStatus (§7.7): Available, Preparing, Charging, SuspendedEVSE, SuspendedEV, Finishing, Reserved, Unavailable, Faulted — use labels, not enum names.

## Output

Design specification documented (inline or saved to scratchpad/temporary-notes/).

## WORKFLOW.md Update

No phase change. Append: "Design consultation complete — layout and export structure defined."

## End Banner

Print:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Design consultation complete.
Next → /design-shotgun (variants) or /design-html (implement) or /build-complete
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
