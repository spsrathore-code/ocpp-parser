---
name: investigate
phase: 3 of 7 — BUILD (debug aid)
triggers: "investigate, debug, root cause, why is this broken, trace this bug"
ocpp-context: true
---

## Phase Banner

Read `skills/WORKFLOW.md`. Print:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
OCPP Tool Suite — Skill Chain
Phase 3 of 7 — BUILD (debug aid — callable at any phase)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Feature:   [active feature from WORKFLOW.md]
Current:   /investigate
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## Purpose

Systematic root-cause debugging. Traces data flow, tests hypotheses one at a time,
isolates the failure. For the Parser: knows the chunked parsing engine (1000 lines/chunk),
MessageId correlation logic, and OCPP message structure.

## Steps

1. Ask: "Describe the symptom. What did you expect? What happened instead?"
2. Ask: "When did this last work correctly? What changed since then?"
3. Form 3 hypotheses (ranked by likelihood). State each as: "IF [condition] THEN [symptom]."
4. For each hypothesis, define one verification step (a console.log, a specific log line to check, a code path to trace).
5. Work through verifications in order — stop at the first confirmed hypothesis.
6. Identify the root cause (not the symptom). State: "The root cause is [X] because [evidence]."
7. Propose the minimal fix. Do NOT fix multiple things in one change.

## OCPP Considerations

- OCPP message structure: `[2, UniqueId, Action, Payload]` (Call), `[3, UniqueId, Payload]` (CallResult), `[4, UniqueId, ErrorCode, ErrorDesc, ErrorDetails]` (CallError).
- Parser chunking: logs are processed 1000 lines at a time — bugs may appear only in large logs.
- MessageId correlation: `uniqueId` must match between Call and CallResult/CallError — mismatches cause orphan messages.
- Downtime detection: uses gap analysis between StatusNotification messages — check `processDowntimes()` if fault logic is wrong.
- Sample logs for reproduction: `data/samples/Sample OCPP Client Log .txt` and `data/samples/TS0064 Emergency Stop No Available Status 13 March 2026.txt`.
- ChargePointStatus valid values (§7.7): Available, Preparing, Charging, SuspendedEVSE, SuspendedEV, Finishing, Reserved, Unavailable, Faulted.

## Output

Root cause identified. Minimal fix proposed (but not applied — user decides).

## WORKFLOW.md Update

No phase change. Append a one-line note under the active feature: "Investigated: [symptom] → root cause: [X]."
