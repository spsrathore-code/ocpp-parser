---
name: qa
phase: 5 of 7 — TEST
triggers: "QA, test this, run tests, find bugs, verify it works"
ocpp-context: true
---

## Phase Banner

Read `skills/WORKFLOW.md`. Print:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
OCPP Tool Suite — Skill Chain
Phase 5 of 7 — TEST
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Feature:   [active feature from WORKFLOW.md]
Previous:  /review (Review)  [✅ Complete | ⚠ Not recorded]
Current:   /qa
Next:      /ship (Ship)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## Prerequisite Check

Check `skills/WORKFLOW.md`: is Review marked ✅?
If NOT ✅, print:
  "⚠ WARNING: Review phase not marked complete in WORKFLOW.md.
   Expected /review to have run first.
   Proceed anyway? (yes / no)"
  If no: stop here.

## Purpose

QA lead: tests the feature end-to-end in the real Parser. Loads real sample logs,
checks all affected sections, finds regressions, auto-fixes obvious bugs.
Generates regression test notes for future reference.

## Steps

1. Open the Parser: `src/app/OCPP_Parser_Complete_ 21 Jan'26.html` in a browser (or open `index.html` from the branch — NOT the deployed version).
2. Load `data/samples/Sample OCPP Client Log .txt`.
3. Check all sections that the current feature touches:
   - Does the section render without console errors?
   - Does the data match what you expect from the sample log?
   - Does the Export button produce a valid, correctly-named Excel file?
4. Load `data/samples/TS0064 Emergency Stop No Available Status 13 March 2026.txt`.
5. Repeat step 3 with the second log. This log contains an emergency stop sequence — ensure fault detection sections handle it correctly.
6. Check sections NOT touched by this feature for regressions (spot-check 3 sections).
7. Log all bugs found: symptom, reproduction steps, sample log used.
8. For each bug: auto-fix if obvious; flag if requires design decision.
9. Produce regression test notes: list of "Given [log], then [section] shows [expected output]."

## OCPP Considerations

- For Parser: loads `data/samples/`, validates all 19 sections against requirements.md; OCPP checks: J04 Table 7 error codes, §4.9 status transitions, §7.6 ChargePointErrorCode (16 values), §7.36 Reason (11 stop codes), §3.15 ISO 8601 timestamps, §3.8 connector IDs.
- Sample log 1: `data/samples/Sample OCPP Client Log .txt` — standard session log.
- Sample log 2: `data/samples/TS0064 Emergency Stop No Available Status 13 March 2026.txt` — emergency stop, TS0064 scenario, used for fault detection testing.
- Expect: Section 14 (WebSocket Health) to show connection events. Section 8 (Downtime) to detect the emergency stop gap.
- Console errors in the browser are bugs — treat them as test failures.

## Output

QA report: sections tested, bugs found, bugs fixed, regression test notes.

## WORKFLOW.md Update

Mark Test ✅ with today's date.
Append: "QA complete. N bugs found, M fixed. Regression notes saved."
Print: "skills/WORKFLOW.md updated ✓ — Test phase complete."

## End Banner

Print:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Phase 5 — TEST complete.
skills/WORKFLOW.md updated ✓
Next → run /ship (Ship phase)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
