---
name: review
phase: 4 of 7 — REVIEW
triggers: "code review, review this, review the changes, staff review, check the code"
ocpp-context: true
---

## Phase Banner

Read `skills/WORKFLOW.md`. Print:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
OCPP Tool Suite — Skill Chain
Phase 4 of 7 — REVIEW
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Feature:   [active feature from WORKFLOW.md]
Previous:  /build-complete (Build)  [✅ Complete | ⚠ Not recorded]
Current:   /review
Next:      /qa (Test)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## Prerequisite Check

Check `skills/WORKFLOW.md`: is Build marked ✅?
If NOT ✅, print:
  "⚠ Build phase not marked complete. Have you finished implementation?
   Run /build-complete first, or proceed anyway? (yes / no)"
  If no: stop here.

## Purpose

Staff engineer code review. Finds bugs, completeness gaps, and OCPP compliance issues.
Auto-fixes obvious issues (typos, missing null checks). Flags non-obvious issues for
user decision. Does NOT ship — review findings feed into /qa and /ship.

## Steps

1. Read the git diff for the active feature branch vs main.
   Command: `git diff main...HEAD`
2. Check for:
   - **OCPP compliance:** Are message type IDs correct (2/3/4)? Are field names matching the schemas in `src/schemas/ocpp-1.6/`? Are enum values valid?
   - **Canonical source integrity:** Were changes made to `index.html` directly? (Should always be ❌)
   - **CHANGELOG:** Is there a new entry in `CHANGELOG.md` for this change? (Should be ✅ before ship)
   - **Console.log leakage:** Any debug console.log statements in the diff?
   - **Error handling:** Are malformed OCPP messages handled gracefully (not crashing the parser)?
   - **Completeness:** Does the implementation match the spec from `docs/superpowers/specs/`?
   - **File size:** Does `src/app/OCPP_Parser_Complete_ 21 Jan'26.html` exceed 10,000 lines?
3. Classify each finding:
   - **Auto-fix:** Apply immediately (typos, unused variables, missing null check with obvious fix).
   - **Flag:** Present to user with recommendation (design decision, risk, OCPP compliance issue).
4. Apply auto-fixes. Present flagged findings one at a time and ask: "Fix this? (yes / no / later)"
5. Summarise: N issues found, M auto-fixed, K flagged and resolved, J deferred.

## OCPP Considerations

- 8-point OCPP checklist: J04 Table 2 (envelope structure), J04 Table 7 (10 error codes), §7.7 (9 status values), §7.6 (16 error codes), §9 (38 config keys), §3.15 (ISO 8601 timestamps), §3.8 (connector numbering); for Parser: requirements.md SSOT accuracy, CHANGELOG format, canonical source vs index.html.
- `src/schemas/ocpp-1.6/[MessageType].json` — canonical field names and types. Any deviation is a bug.
- OCPP 1.6J mandates: UniqueId must be a string; missing required fields must produce a CallError.
- StatusNotification `status` field: valid values are `Available`, `Preparing`, `Charging`, `SuspendedEVSE`, `SuspendedEV`, `Finishing`, `Reserved`, `Unavailable`, `Faulted`.
- Downtime logic: faults detected by gap in heartbeats AND consecutive Faulted StatusNotifications.

## Output

Review summary: issues found, fixed, flagged. WORKFLOW.md updated.

## WORKFLOW.md Update

Mark Review ✅ with today's date.
Append under Key outputs → Review: "N issues found, M fixed, K resolved."
Print: "skills/WORKFLOW.md updated ✓ — Review phase complete."

## End Banner

Print:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Phase 4 — REVIEW complete.
skills/WORKFLOW.md updated ✓
Next → run /qa (Test phase)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
