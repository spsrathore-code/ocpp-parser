---
name: plan-eng-review
phase: 2 of 7 — PLAN
triggers: "engineering review, lock the architecture, plan the implementation, eng plan"
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
Current:   /plan-eng-review
Next:      /build-complete (Build)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## Prerequisite Check

Check `skills/WORKFLOW.md`: is Think marked ✅?
If NOT ✅, print:
  "⚠ WARNING: Think phase not marked complete in WORKFLOW.md.
   Expected /spec to have run first.
   Proceed anyway? (yes / no)"
  If no: stop here.

## Purpose

Engineering lock: produces architecture, data flow, edge cases, and a test plan.
The test plan output is read by /qa. For OCPP work, this includes a compliance
checklist for the affected message types.

## Steps

1. Read the spec from `docs/superpowers/specs/` for the active feature.
2. Define and document:
   - **Architecture:** Which files change? What new files are created? Data flow diagram (text).
   - **Data flow:** How does data enter, transform, and exit?
   - **Edge cases:** List at least 5. For Parser work: empty log, malformed OCPP message, missing MessageId, duplicate transaction, > 10,000 line log.
   - **OCPP compliance check:** Which message types (CallResult, CallError, specific Actions) are affected? Do they need schema validation?
   - **Test plan:** What scenarios must pass before shipping? Write them as: "Given X, when Y, then Z."
   - **File size check:** Will any file exceed 2000 lines after changes? If yes, plan the split.
3. Save architecture doc to `docs/superpowers/specs/YYYY-MM-DD-[feature]-arch.md`.
4. Ask: "Does this architecture and test plan look right?"

## OCPP Considerations

- Validates CALL[2]/CALLRESULT[3]/CALLERROR[4] envelope design (J04 §4.1.3), 10 error codes (J04 Table 7), 9 ChargePointStatus values (§7.7), 38 config keys (§9); for Parser: enforces 9813-line single-file constraint and additive-only architecture rule (requirements.md §§11–16 pattern).
- Canonical source: `src/app/OCPP_Parser_Complete_ 21 Jan'26.html` — never edit `index.html` directly.
- Schema reference: `src/schemas/ocpp-1.6/[MessageType].json` — use for field names and types.
- Validation Engine: if the feature involves message validation, cross-reference `docs/TYPEVALIDATION.md`.
- OCPP 1.6J message structure: `[MessageTypeId, UniqueId, Action, Payload]` for Call; `[MessageTypeId, UniqueId, Payload]` for CallResult; `[MessageTypeId, UniqueId, ErrorCode, ErrorDescription, ErrorDetails]` for CallError.
- File size hard limit: 2000 lines. The current Parser is 9813 lines — any new feature added to it is technical debt. Flag this.

## Output

`docs/superpowers/specs/YYYY-MM-DD-[feature]-arch.md` — architecture + test plan

## WORKFLOW.md Update

Mark Plan ✅ with today's date.
Append under Key outputs → Plan: path to arch doc.
Print: "skills/WORKFLOW.md updated ✓ — Plan phase complete."

## End Banner

Print:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Phase 2 — PLAN complete.
skills/WORKFLOW.md updated ✓
Next → implement on a feat/[name] branch, then run /build-complete
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
