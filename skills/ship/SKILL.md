---
name: ship
phase: 6 of 7 — SHIP
triggers: "ship it, create a PR, push this, open a pull request, ready to ship"
ocpp-context: true
---

## Phase Banner

Read `skills/WORKFLOW.md`. Print:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
OCPP Tool Suite — Skill Chain
Phase 6 of 7 — SHIP
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Feature:   [active feature from WORKFLOW.md]
Previous:  /qa (Test)  [✅ Complete | ⚠ Not recorded]
Current:   /ship
Next:      /document-release (Ship)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## Prerequisite Check

Check `skills/WORKFLOW.md`: is Test marked ✅?
If NOT ✅, print:
  "⚠ WARNING: Test phase not marked complete in WORKFLOW.md.
   Expected /qa to have run first.
   Proceed anyway? (yes / no)"
  If no: stop here.

## Purpose

Prepares the feature for merge. Copies canonical source to index.html, commits,
pushes, opens a PR. Enforces the Branch → PR → Merge git workflow.

## Steps

1. Confirm the active branch: `git branch --show-current`.
   Must be a `feat/`, `fix/`, `docs/`, or `chore/` branch. Never `main`.
2. Copy canonical source to deploy copy:
   Copy `src/app/OCPP_Parser_Complete_ 21 Jan'26.html` → `index.html` (root).
3. Stage and commit the deploy copy:
   ```bash
   git add index.html
   git commit -m "chore: sync index.html with canonical source for deploy"
   ```
4. Check all review and QA findings are resolved. If any P1 bug is open: stop and warn.
5. Push the branch:
   ```bash
   git push -u origin [branch-name]
   ```
6. Provide the PR creation URL:
   `https://github.com/spsrathore-code/ocpp-parser/pull/new/[branch-name]`
7. Remind: open the URL in a browser, add PR title and description, then merge.

## OCPP Considerations

- Canonical source path: `src/app/OCPP_Parser_Complete_ 21 Jan'26.html`
- Deploy copy: root `index.html` — this is what GitHub Pages serves.
- Never push directly to main — always via PR.
- Branch naming: `feat/`, `fix/`, `docs/`, `chore/` prefixes only.

## Output

Branch pushed. PR URL provided. index.html synced.

## WORKFLOW.md Update

Mark Ship ⏳ Active (PR open, pending merge).
Append under Key outputs → Ship: PR URL.
Print: "skills/WORKFLOW.md updated ✓ — Ship phase active (PR open)."

## End Banner

Print:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/ship complete. PR ready for merge.
skills/WORKFLOW.md updated ✓
Next → run /document-release, then merge PR, then /land-and-deploy
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
