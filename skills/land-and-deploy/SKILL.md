---
name: land-and-deploy
phase: 6 of 7 — SHIP
triggers: "land and deploy, merge the PR, deploy to production, merge and deploy"
ocpp-context: true
---

## Phase Banner

Read `skills/WORKFLOW.md`. Print:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
OCPP Tool Suite — Skill Chain
Phase 6 of 7 — SHIP
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Feature:   [active feature from WORKFLOW.md]
Previous:  /document-release (Ship)  [recorded | ⚠ Not recorded]
Current:   /land-and-deploy
Next:      /canary (Ship)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## Prerequisite Check

Check `skills/WORKFLOW.md`: is Ship marked ⏳ Active (PR open)?
If NOT, print:
  "⚠ WARNING: Ship phase not yet active in WORKFLOW.md.
   Expected /ship to have opened a PR first.
   Proceed anyway? (yes / no)"
  If no: stop here.

## Purpose

Merges the approved PR and monitors the GitHub Pages deploy.
Verifies the deployed URL is live and serving the updated Parser.

## Steps

1. Confirm the PR has been approved and merged on GitHub.
   Ask: "Has the PR been merged on GitHub? (yes / not yet)"
   If not yet: stop. Come back when merged.
2. Sync local main:
   ```bash
   git checkout main
   git pull origin main
   ```
3. Verify the merge landed:
   ```bash
   git log --oneline -3
   ```
   The feature commit(s) should appear at the top.
4. GitHub Pages auto-deploys on push to main. Wait ~60 seconds.
5. Verify the deployed URL is live: `https://spsrathore-code.github.io/ocpp-parser/`
   (Ask the user to open it and confirm it loads without errors.)
6. Check the version label/date in the Parser header matches the shipped version.

## OCPP Considerations

GitHub Pages serves `index.html` from the root of main. The deploy copy is created
by /ship (copy from canonical source). If the Parser loads but data is wrong, the
canonical source was not correctly copied.

## Output

main synced locally. Deployed URL confirmed live.

## WORKFLOW.md Update

Mark Ship ✅ with today's date.
Append under Key outputs → Ship: deployed URL + merge commit SHA.
Print: "skills/WORKFLOW.md updated ✓ — Ship phase complete."

## End Banner

Print:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Phase 6 — SHIP complete. Live at:
https://spsrathore-code.github.io/ocpp-parser/
skills/WORKFLOW.md updated ✓
Next → run /canary (post-deploy health check)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
