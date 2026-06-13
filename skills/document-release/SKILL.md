---
name: document-release
phase: 6 of 7 — SHIP
triggers: "document the release, update docs, update changelog, release notes, document this change"
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
Current:   /document-release
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

Updates all documentation to match the shipped change. Produces a CHANGELOG entry.
Checks docs/ for staleness. Knows the project's CHANGELOG format and SSOT structure.

## Steps

1. Read the git diff: `git diff main...HEAD`
2. Update `CHANGELOG.md`:
   - Add a new dated entry at the top.
   - Format: `## vYYYY.MM.DD — [Feature name]` followed by bullet points.
   - Each bullet: one sentence describing a user-visible change.
3. Check `docs/` for staleness:
   - Does `docs/workflow.md` reflect the new deploy workflow (if it changed)?
   - Does `docs/skill-chain.md` need updating (if skill chain was modified)?
   - Does `docs/overview.md` need updating (if a major new feature was added)?
4. Check `specs/requirements.md` (SSOT):
   - If a new Parser section was added: add it to the section inventory in requirements.md.
   - If requirements changed: update the relevant section.
5. Commit all doc changes:
   ```bash
   git add CHANGELOG.md docs/ specs/requirements.md
   git commit -m "docs: update CHANGELOG and docs for [feature-name]"
   ```

## OCPP Considerations

`specs/requirements.md` is the SSOT — it must accurately reflect the Parser as it exists
after the change. Never let requirements.md drift from the actual implementation.

## Output

CHANGELOG updated. Docs updated. All committed on the feature branch.

## WORKFLOW.md Update

Note "docs updated" under Ship key outputs.
Print: "skills/WORKFLOW.md updated ✓ — docs recorded."

## End Banner

Print:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/document-release complete. CHANGELOG and docs updated.
Next → /land-and-deploy
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
