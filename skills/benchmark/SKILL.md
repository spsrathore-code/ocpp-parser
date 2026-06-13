---
name: benchmark
phase: 5 of 7 — TEST
triggers: "benchmark, performance test, how fast, measure load time, perf test"
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
Current:   /benchmark
Next:      /ship (Ship) — run /qa to close Test phase
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## Prerequisite Check

Check `skills/WORKFLOW.md`: is Review marked ✅?
If NOT ✅, print:
  "⚠ WARNING: Review phase not marked complete in WORKFLOW.md.
   Expected /review to have run first.
   Proceed anyway? (yes / no)"
  If no: stop here.

## Purpose

Measures Parser performance before and after the change. Key metrics: page load time,
log parse time, Excel export time. Relevant for large logs (6000+ lines).

## Steps

1. Open browser DevTools → Performance tab (or Network tab for load time).
2. Measure BEFORE (on main branch):
   - Page load time (DOMContentLoaded)
   - Time to parse `data/samples/TS0064 Emergency Stop No Available Status 13 March 2026.txt` (6398 lines — time from file select to all sections rendered)
   - Excel export time for the largest section
3. Switch to the feature branch. Measure AFTER with the same log.
4. Compare: flag any metric that regressed > 10%.
5. If regression found: profile using browser DevTools → identify the slow function → report to user.

## OCPP Considerations

The 6398-line TS0064 log is the performance benchmark log. Parser must complete all 19
sections within 5 seconds on a standard laptop. Excel export must complete within 3 seconds.
Chunked parsing (1000 lines/chunk) is the performance-critical path — profile this first.

## Output

Before/after performance table. Any regressions flagged.

## WORKFLOW.md Update

Append: "Benchmark: parse time [X]ms → [Y]ms, export time [A]ms → [B]ms."
(Does not mark Test ✅ alone — /qa must also pass.)
