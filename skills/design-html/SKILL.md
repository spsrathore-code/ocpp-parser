---
name: design-html
phase: 3 of 7 — BUILD
triggers: "build the HTML, implement the design, convert to HTML, code this section"
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
Current:   /design-html
Next:      /build-complete
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## Prerequisite Check

Check `skills/WORKFLOW.md`: is Plan marked ✅?
If NOT ✅, print:
  "⚠ WARNING: Plan phase not marked complete in WORKFLOW.md.
   Expected /plan-eng-review to have run first.
   Proceed anyway? (yes / no)"
  If no: stop here.

## Purpose

Converts an approved design (from /design-consultation or /design-shotgun) into
production HTML/CSS/JS. Knows the Parser is a single HTML file with no build step.
Edits only the canonical source, never index.html.

## Steps

1. Confirm the canonical source path: `src/app/OCPP_Parser_Complete_ 21 Jan'26.html`.
   Never edit `index.html` — it is the deploy copy only.
2. Identify the exact insertion point in the canonical source (section number, function name, line range).
3. Implement the HTML/CSS/JS for the new section following existing section patterns.
4. Verify: does the Parser load without console errors after the change?
5. Verify: does the new section appear in the correct position in the 19-section layout?
6. Verify: does the Export button produce a valid Excel file?
7. Confirm: no hardcoded test data left in the implementation.

## OCPP Considerations

- For Parser: canonical source is `src/app/OCPP_Parser_Complete_ 21 Jan'26.html` (9813 lines as of v2026.05.14).
- File size warning: if the canonical source approaches 10,000 lines, flag the Parser revamp task.
- Export uses SheetJS — follow the pattern of existing export functions in the file.
- OCPP status codes must be mapped to human-readable labels using the existing statusLabel() pattern.
- ISO 8601 timestamp parsing (§3.15): all timestamps in the Parser must use the same normalisation function.
- Connector numbering (§3.8): connector IDs must display as integers starting from 1 (connectorId 0 = the charge point itself).

## Output

Canonical source updated with new section. Ready for /build-complete.

## WORKFLOW.md Update

Append: "design-html complete — [section name] added to canonical source."

## End Banner

Print:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/design-html complete. Section implemented.
Next → /build-complete
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
