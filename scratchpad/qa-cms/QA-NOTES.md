# QA Notes — CMS Log Parser (2026-07-09)

Feature: CMS Excel ingestion (`feat/cms-log-parser`). QA run headlessly (browser
extension not connected) via `parseCmsWorkbook → analyze`, asserting exact
OCPP-valid values — more rigorous than a visual pass. Script: `_qa.mjs`.

## Sample used
`data/samples/CZ CMS Logs Sample.xlsx` — customer CZ, charger MH0055, one sheet,
1607 rows → 3204 correlated OCPP messages. Covers 08–09 Aug 2025 (IST).

## Regression assertions (Given → Then)
- Given the CZ sample, **adapter auto-detects `cz`** and surfaces charger `MH0055`.
- Given the CZ sample, **3204 messages** parse; exactly **1 synthesized context line per message**.
- Given the CZ sample, **StatusNotification.status** values are all within OCPP §7.7 (Available/Charging/Faulted/…). 0 invalid.
- Given the CZ sample, **derived Alerts (12)** all carry valid §7.6 `ChargePointErrorCode`s (OtherError×9, EVCommunicationError×2, InternalError×1). 0 invalid.
- Given the CZ sample, **every message timestamp is ISO-8601 UTC** (§3.15) — the IST→UTC conversion holds across all 3204.
- Given the CZ sample, **Transaction Summary shows 12 transactions**, none with negative duration, each with a startTime.
- Given the CZ sample, **Heartbeat responsePayload.currentTime** is attached (correlation works).
- Given the CZ sample, **Debug-Info log span = 2025-08-08 00:00 → 2025-08-09 01:59 IST (25h 58m)**, matching the file's date range.
- Given the CZ sample, **Meter Values = 1082**, Connector Stats = 2, Energy Dispense = 2, Downtime = 1, Incomplete Tx = 1 — all populate.

## Empty-by-nature (documented, not bugs)
- **Events = 0** — CMS Excel has no free-text `[OCPP] event` lines.
- **WebSocket Health pingCount = 0** — no WS ping/pong text in Excel.
- **Power-Restore / Emergency-Stop sync = 0** — weak signal from Excel-only data.

## Edge cases (covered by unit suite, all green)
- Unrecognized workbook → clear actionable error (`parseCmsWorkbook` test).
- Empty/missing response string → request-only, responsePayload null (`rowsToParsedLines`).
- Malformed request JSON → row skipped, no crash.
- Multi-file upload → lineNumbers offset correctly into concatenated rawLogLines (`mergeCmsParsed`).
- View wiring: upload → sections + source banner; error → error panel, button re-enabled (`mountCmsParser` jsdom test).

## Export
Per-section "Export to Excel" buttons are the Client parser's existing, unchanged,
already-tested `exportToExcel` (reused via `renderResults`). Not re-tested here.

## Bugs found this QA: 0
(The one real bug — Debug-Info IST span skew — was caught and fixed during the
Phase-C audit, before QA.)

## Result: ✅ ALL PASS (0 failures across 15 assertions); full suite 410/410.
