---
name: canary
phase: 6 of 7 — SHIP
triggers: "canary check, post-deploy check, verify production, health check, is it live"
ocpp-context: true
---

## Phase Banner

Read `skills/WORKFLOW.md`. Print:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
OCPP Tool Suite — Skill Chain
Phase 6 of 7 — SHIP
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Feature:   [active feature from WORKFLOW.md]
Previous:  /land-and-deploy (Ship)  [✅ Complete | ⚠ Not recorded]
Current:   /canary
Next:      /retro (Reflect)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## Prerequisite Check

Check `skills/WORKFLOW.md`: is Ship marked ✅?
If NOT ✅, print:
  "⚠ WARNING: Ship phase not marked complete in WORKFLOW.md.
   Expected /land-and-deploy to have run first.
   Proceed anyway? (yes / no)"
  If no: stop here.

## Purpose

Post-deploy health check on the live GitHub Pages deployment.
Verifies no console errors, all sections load, export works.

## Steps

Ask the user to perform these checks on `https://spsrathore-code.github.io/ocpp-parser/`:

1. Open the URL. Does the Parser load? (yes / no)
2. Open browser DevTools → Console. Any errors on page load? (yes = bug / no = ✅)
3. Load `data/samples/Sample OCPP Client Log .txt`. Do all sections render? (yes / no)
4. Navigate to the section added/changed by this feature. Does it display correctly? (yes / no)
5. Click Export on the changed section. Does a valid Excel file download? (yes / no)
6. Check the version label in the Parser header — does it match the shipped version? (yes / no)

If any check fails: record the failure, diagnose (it may be a cache issue — hard refresh first),
then open a new `fix/` branch to address it.

## OCPP Considerations

Cache issues are common with GitHub Pages. If the old version appears: Ctrl+Shift+R (hard refresh).
If the Parser loads but shows stale data: the deploy copy (index.html) may not have been updated.

## Output

Canary check results (all ✅ or failure list).

## WORKFLOW.md Update

Note "canary: all ✅" or list failures under Ship key outputs.
Print: "skills/WORKFLOW.md updated ✓ — canary results recorded."

## End Banner

Print:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/canary complete. Production health confirmed.
Next → run /retro + /learn (Reflect phase)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
