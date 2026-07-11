# QA Notes — OCPP Validation Engine (Phase 1)

**Date:** 2026-06-14 · **Phase:** 5 of 7 (Test / `/qa`) · **Branch:** `feat/validation-engine`
**Method:** real OCPP frames extracted from sample logs (throwaway `run-qa.mjs`) → `validateBatch`.
The engine does not parse logs (VAL-001); the harness is a minimal Parser stand-in.

## Results (regression baselines)

| Given log | Frames | Then `validateBatch` yields |
|---|---|---|
| `data/samples/Sample OCPP Client Log .txt` | 584 | total 584, valid 584, **invalid 0**, matched 292, orphans 0, avg latency ~105 ms |
| `data/samples/TS0064 Emergency Stop No Available Status 13 March 2026.txt` | 204 | total 204, valid 204, **invalid 0**, matched 102, orphans 0, avg latency ~285 ms |

Call-action coverage observed: StatusNotification, Heartbeat, Authorize, StartTransaction,
MeterValues, DataTransfer, StopTransaction, TriggerMessage, RemoteStopTransaction, BootNotification.

## Findings

- **0 bugs.** Engine never threw; 0 false schema violations on compliant production traffic.
- Bidirectional Calls (CP→CSMS and CSMS→CP) pair correctly by MessageId.
- The R1 fix (MessageId reuse) holds at scale — 0 dropped exchanges across 788 frames.

## Not covered / follow-ups

- `data/samples/MH0135_10_March_2026_2-54_PM.log` (38 MB) — not run here; good candidate for `/benchmark` (throughput/perf), not correctness.
- Negative-on-real-data (inject a malformed frame mid-stream) is already proven by the
  `messageValidator` unit tests (L1/L2 failure cases) — not repeated here.
- **Optional:** promote these two baselines into a committed `tests/integration/sample-logs.test.ts`
  as a permanent real-traffic regression guard (depends on bundling the extractor + logs).
