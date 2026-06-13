---
name: document-generate
phase: 6 of 7 — SHIP
triggers: "generate docs, write missing docs, create documentation, document this feature"
ocpp-context: true
---

## Phase Banner

Read `skills/WORKFLOW.md`. Print:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
OCPP Tool Suite — Skill Chain
Phase 6 of 7 — SHIP
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Feature:   [active feature from WORKFLOW.md]
Previous:  /ship (Ship)  [⏳ Active | ⚠ Not recorded]
Current:   /document-generate
Next:      /land-and-deploy (Ship)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## Prerequisite Check

Check `skills/WORKFLOW.md`: is Test marked ✅?
If NOT ✅, print:
  "⚠ WARNING: Test phase not marked complete in WORKFLOW.md.
   Expected /qa to have run first.
   Proceed anyway? (yes / no)"
  If no: stop here.

## Purpose

Generates missing documentation from scratch using the Diataxis framework.
Called by /document-release when gaps are found.

## Steps

1. Identify what type of documentation is missing:
   - **Reference:** "What is X?" — factual, no prose. E.g., OCPP message field descriptions.
   - **How-to:** "How do I do X?" — task-oriented steps. E.g., "How to load a log and export Section 8."
   - **Tutorial:** "Learn by doing." — guided walkthrough for new users.
   - **Explanation:** "Why does X work this way?" — conceptual background.
2. Generate the appropriate doc type for the missing content.
3. Save to the correct location:
   - Reference/How-to/Tutorial/Explanation → `docs/[filename].md`
   - User-facing → `docs/user-guide.md` (append) or a new file if substantial.
4. Ask: "Does this doc look correct and complete?"

## OCPP Considerations

All OCPP terminology must match OCPP 1.6J specification language exactly.
Do not invent abbreviations or alternate names for standard terms.

## Output

New documentation file(s) in `docs/`.

## WORKFLOW.md Update

Note "new docs generated" under Ship key outputs.
Print: "skills/WORKFLOW.md updated ✓ — new docs recorded."

## End Banner

Print:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/document-generate complete. Documentation written.
Next → /land-and-deploy
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
