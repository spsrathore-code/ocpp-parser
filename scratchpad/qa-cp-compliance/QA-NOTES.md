# QA Notes — §4 CP-Initiated Operations Compliance

> /qa phase, 2026-06-23. Exercised the real pipeline (`analyzeLogLines`) + the
> `renderCpCompliance` section over the two repo sample logs. No browser console
> errors possible (pure TS + jsdom render); render unit tests cover the DOM.

## Bugs found & fixed

| # | Rule | Symptom | Fix |
|---|------|---------|-----|
| Q1 | **AUTH-003** | Warned on **every normal same-tag session** (both sample logs) — reusing the start idTag to stop is the *compliant* case, and OCPP `Authorize.req` carries no start-vs-stop intent, so a stop-side Authorize can't be told apart from the start one. | Reclassified **deterministic → indeterminate** (`info` + reason). Removes the false positive entirely. |
| R1 | **BOOT-002** | (from /review) Returned hard **FAIL** when CP messages precede the first BootNotification — false on mid-session captures where the first Boot is a reconnect. | **fail → warn** (matches its heuristic tier). |

## Regression baselines (Given log → expected §4 output)

**Log 1 — `Sample OCPP Client Log .txt`** (standard session, **0 BootNotifications**, 2 tx, 7 status, 217 MV):
- score **93** · dist `{pass:17, warn:0, fail:1, info:28}`
- Only non-pass: **BOOT-001:fail** — correct (the log genuinely contains no BootNotification).

**Log 2 — `TS0064 Emergency Stop No Available Status 13 March 2026.txt`** (1 boot, 2 tx, 16 status, 21 MV):
- score **98** · dist `{pass:22, warn:2, fail:0, info:22}`
- Non-pass: **AUTH-004:warn** (an Authorize idTag with no matching StartTransaction — meaningful "Authorize not used for charging" signal) · **STATUS-008:warn** (offline-sync embedded-timestamp order — plausible on the reconnect burst). Both heuristic, both defensible.

## Verdict
- No crashes on either log; 46 results each; valid weighted scores.
- All remaining non-pass items are **true findings**, not false positives.
- Render: 10 collapsible groups + export table + per-finding Preview/Download context (covered by `cpCompliance.render.test.ts`).
- Full suite **322 green**, `tsc` + `vite build` clean.
