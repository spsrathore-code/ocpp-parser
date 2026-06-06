# OCPP Client Log Parser — Master Requirements & Project Status

**Doc Version**: 2.7 | **Requirements Last Updated**: 6 June 2026
**Tool File (canonical source)**: `src/app/OCPP_Parser_Complete_ 21 Jan'26.html` — **in-tool version `2026.05.14` (14 May 2026) · 9,813 lines · 620 KB**. Root `index.html` is its deploy copy.
**Live URL**: `https://spsrathore-code.github.io/ocpp-parser/`
**GitHub Repo**: `https://github.com/spsrathore-code/ocpp-parser` | Branch: `main`
**Target Hardware**: DC Fast Chargers (QUENCH Chargers) — OCPP 1.6J

> **v2.7 (6 Jun 2026) — SSOT reconciliation against tool source.** Read the actual implementation and closed the documented gaps: full **Downtime Detection engine + 4 fault types** (Section 9 rewritten), **Events / Alerts / Debug Information** sections + **API folder-save, download-progress, and repository bulk/manual-sync** features (Section 18), and the **Architecture & Data Model SSOT core** — parsing contract, data model, render order, dependency manifest (Section 19). Corrected Section 16 status to ✅. **No change made to the tool HTML.**

> **Terminology** — **Canonical** = the single authoritative version of an artifact; everything else is a copy or derivation (the source HTML is canonical, `index.html` is a deploy copy; the 56 `.json` schemas are the canonical *reference* set — runtime validation uses `typed-ocpp`'s bundled schemas, see §19.7). **SSOT (single source of truth)** = this document's role as the one authoritative reference for requirements, status, and architecture.

---

## Deploy Workflow

After every change to the HTML file, run:

```bash
cd "C:\Users\SPRATHORE\OneDrive - Ador Digatron Pvt. Ltd\Desktop\Desktop\Claude Tools\P4_OCPP Client Parser"
powershell -Command "Copy-Item 'src\app\OCPP_Parser_Complete_ 21 Jan''26.html' 'index.html'"
git add index.html
git commit -m "<description of change>"
git push origin main
```

> GitHub Pages auto-deploys within ~2 minutes. **Always edit the canonical source file, never the `index.html` deploy copy.**

> **Local `file://` use**: All parsing and IndexedDB storage work offline. Google Drive sync requires the hosted `https://` URL.

---

## Implementation Status Dashboard

| # | Section | Status | Evidence |
|---|---|---|---|
| 1 | Architecture & Deployment | ✅ Implemented | Tool live at GitHub Pages |
| 2 | File Upload & Processing | ✅ Implemented | Oct 2025 changelog — multi-file, API download |
| 3 | OCPP Message Parsing | ✅ Implemented | Oct 2025 changelog |
| 4 | Transaction Management | ✅ Implemented | Bug Fix #1 Mar 2026 (transactionId from response) |
| 5 | Meter Values Analysis | ✅ Implemented | Oct 2025 changelog |
| 6 | Data Visualization & Reporting | ✅ Implemented | Chart.js graphs (6 types); Excel export |
| 7 | Message Type Sections (Boot/Heartbeat/StartTx/StopTx/StatusNotif) | ✅ Implemented | Oct 2025 core; StatusNotif enhanced to FR-329 Apr 2026 |
| 8 | Advanced Message Types (Future) | ⏳ Planned | "Coming Soon" placeholders in tool |
| 9 | Downtime Analysis — engine + **4 fault types** (Connection Lost, Power Failure, Input Under Voltage, Emergency Stop) | ✅ Implemented | CHANGELOG Run #1; engine at HTML `downtimeConfig` 946–1068, `detectDowntimes` 1298 |
| 10.1 | Zero Energy Transaction Flag | ✅ Implemented | CHANGELOG Run #4 (user confirmed) |
| 10.2 | Temperature Threshold Alerts | ✅ Implemented | CHANGELOG Run #6 (user confirmed) |
| 10.3 | Start/Stop Meter Continuity | ✅ Implemented | CHANGELOG Run #8 (user confirmed) |
| 10.4 | Current Delivery Mismatch | ✅ Implemented | CHANGELOG Run #18-20 (with 2 bug fixes + logic rework) |
| 10.5 | Concurrent Session Overlap | ⛔ Permanently Skipped | Ador Digatron chargers have CCS+CHAdeMO — can run both connectors simultaneously. FR assumption of "one session at a time" is invalid for this hardware. |
| 10.6 | Fault Status Summary | ✅ Implemented | CHANGELOG Run #3 (user confirmed) |
| 10.7 | Incomplete Transaction Summary | ✅ Implemented | CHANGELOG Run #12 (user confirmed) |
| 10.8 | Energy Dispense Check | ✅ Implemented | CHANGELOG Run #14 (user confirmed) |
| 10.9 | Connector Stats | ✅ Implemented | CHANGELOG Run #16 (user confirmed); 10.5 + 10.10 columns show `—` |
| 10.10 | Power Delivery Mismatch | ⚠️ Placeholder Only | Disabled dropdown option added; formula under review before implementation |
| 11 | Protocol Compliance Report | ✅ Implemented | CHANGELOG Run #23 — functional test on real log (all 11 tests pass) |
| 12 | Log Repository (IndexedDB + Google Drive) | ✅ Implemented | CHANGELOG Run #24 — functional test (batch of 13 files) |
| 13 | Session Timeline & Telemetry | ✅ Implemented | Confirmed in CHANGELOG Run #25 checklist (`view-timeline-btn` actively verified) |
| 14 | WebSocket Connection Health | ✅ Implemented | CHANGELOG Run #25 — 4 bugs found and fixed during testing |
| 15 | Offline Replay Flag | ✅ Implemented | CHANGELOG Run #26–27 |
| 16 | Internal Transaction ID Mapping | ✅ Implemented | Confirmed in tool — `internalTxMap`/`internalTransactionId` = 25 refs; regexes at HTML 1636–1637, woven into `processTransactions` |
| 18 | Events, Alerts & Debug Information sections | ✅ Implemented | Documented v2.7 — `createEventsSection` 2726, `createAlertsSection` 2879, Debug panel in `displayResults` |
| 18 | API folder-save + download progress + repository bulk/manual-sync | ✅ Implemented | Documented v2.7 — `selectDownloadFolder` 333, `downloadWithProgress` 533, `syncAllToDrive`/`deleteSelectedRepoEntries` 7198–7246 |
| 19 | Architecture & Data Model (SSOT core) | ✅ Documented | Parsing contract, `tx` data model, render order, dependency manifest — added v2.7 |
| 19.7 | Protocol Schemas (OCPP 1.6J) + schema-driven validation | 📋 Decided · ⏳ Planned | 56 `.json` = reference/diff-check; runtime validation via `typed-ocpp` (isomorphic engine) — see `OCPP Validator/TYPEVALIDATION.MD` |
| — | Pre-Formal Features (Oct 2025) | ✅ Implemented | See Section A — no formal FRs written; built before v1.0 requirements |
| — | Repeated RemoteStart Panel (Section E) | ⏳ Planned | Confirmed NOT in tool — only message-level `RemoteStartTransaction` refs, no panel function |
| — | Future Enhancements | ⏳ Planned | FER-001 to FER-005 |

> **Status key**: ✅ Confirmed · ⛔ Permanently skipped · ⚠️ Partial/placeholder · 🔍 Verify in tool · ⏳ Not started

---

## Known Issues & Fixed Bugs

### Pre-Formal Bugs (Oct 2025)

| Bug | Severity | Summary | Fix |
|---|---|---|---|
| Escaped quotes `\"` parsing failure | Medium | Logs using `\"` instead of `"` parsed 0 messages | Added `parseJsonSafely()` — unescapes `\"` before `JSON.parse()` |

### March 2026 Bug Fixes

| Fix | Date | Severity | Summary |
|---|---|---|---|
| Fix #1 — TransactionId wrong field | 2026-03-11 | Critical | `transactionId` read from StartTx **request** payload (`message[3]`) instead of **response** (`responsePayload`). Fixed in `processTransactions()`, `renderCombinedResults()`, StartTx table — 3 lines total. |
| Fix #2 — "All Transactions" wrong energy/duration | 2026-03-11 | Medium | "All" aggregation used `getTransactionMetrics()` interval sums (unreliable) instead of `transactions[]` register-based values. |
| Fix #2b — Summary cards 2–4 not updating | 2026-03-11 | Medium | Null guard missing on `transactions.filter()` caused abort after card 1. |
| View Chart blank screen | 2026-03-13 | Medium | Chart.js read canvas dimensions of 0. Fix: added `style="height:400px;"` to canvas + wrapped `renderTransactionChart()` in `requestAnimationFrame()`. |
| Current Mismatch logic — all sessions flagging | 2026-03-14 | High | Was comparing `avgCurrent < 95% of peakCurrent` on a single mixed measurand — fires on every session. Reworked to compare Outlet vs EV location pairs. |
| Current Mismatch N/A — no pairs matched | 2026-03-14 | Medium | Code searched for Outlet/EV in the same `meterValue` entry. Charger sends them in separate entries. Fixed to collect at MeterValues message level (outer loop). |
| WebSocket Health — O(n²) freeze | 2026-03-16 | Critical | `pongEvents.find()` inside PING loop = millions of ops on high-frequency logs. Fixed to two-pointer O(n+m) approach. |
| WebSocket Health — wrong function name | 2026-03-16 | Medium | Called `convertUTCtoIST()` but actual function is `convertToIST()`. Silent crash. |
| WebSocket Health — second raw log scan freeze | 2026-03-16 | Critical | `analyzeWebSocketHealth()` ran its own `rawLines.forEach()` — a second scan of 226k lines on top of existing render load. Fixed to piggyback on `detectDowntimes()` loop via `window._wsPingEvents/Pong/ServerPings` globals. |
| WebSocket Health — 17k table rows DOM hang | 2026-03-16 | High | 5s ping interval over 24h = ~17k rows. Synchronous DOM creation froze browser. Fixed with 500-row cap (anomaly rows always included; chronological sample for remainder). |

---

---

# Requirements

---

## Section 1 — Introduction & Architecture

> **Status**: ✅ Implemented

### 1.1 Objective

Create a standalone, web-based OCPP Client Log Parser. Users upload a raw OCPP client log file (`.txt`, `.log`) and receive a structured, human-readable analysis of communication, transactions, events, and alerts.

### 1.2 Architecture & Self-Containment

Single HTML file with no external dependencies or terminal commands required.

- **Browser-Based Execution**: Runs in any modern web browser
- **No Server Setup**: No Node.js, Python, or other backend
- **No Package Installation**: All dependencies via CDN
- **No Build Process**: Open directly or serve from any web server
- **Cross-Platform**: Windows, Mac, Linux, mobile
- **Responsive Design**: Mobile-friendly layout
- **Dark/Light Theme**: `localStorage` persistence

**Deployment Options**: Local file (double-click) · Web server · GitHub Pages / Netlify / AWS S3

### 1.3 Target Hardware Scope

Designed exclusively for **DC fast chargers** (QUENCH Chargers). All transaction health checks, mismatch thresholds, overlap detection, and temperature limits are calibrated for DC charging behaviour. AC charger behaviour is out of scope.

### 1.4 Live Deployment

| Item | Value |
|---|---|
| **Live URL** | `https://spsrathore-code.github.io/ocpp-parser/` |
| **GitHub Repository** | `https://github.com/spsrathore-code/ocpp-parser` |
| **Branch** | `main` |
| **Deployed file** | `index.html` (copy of source file) |
| **Canonical source file** | `src/app/OCPP_Parser_Complete_ 21 Jan'26.html` — the authoritative file; edit this, never the root `index.html` deploy copy |
| **GitHub Pages** | Auto-deploys within ~2 minutes of every push to `main` |

> **Note — Log Repository Cloud Sync**: Google Drive integration requires the tool hosted on a static `https://` URL. All other tool functionality works from `file://`.

### 1.5 Google OAuth Setup (One-Time — Completed)

| Step | Status |
|---|---|
| Google Cloud project "OCPP Parser" created | ✅ Done — 15 Mar 2026 |
| Google Drive API enabled | ✅ Done |
| OAuth 2.0 Client ID created (Web Application) | ✅ Done |
| `https://spsrathore-code.github.io` added to Authorized JS Origins | ✅ Done |
| Client ID pasted into `GOOGLE_DRIVE_CLIENT_ID` constant (HTML line 225) | ✅ Done |

**OAuth Client ID**: `509579978707-lecergjf1t49l149pk8ff57ogb7aerft.apps.googleusercontent.com`
**Drive folder auto-created on first use**: `OCPP Log Repository`

---

## Section 2 — File Upload & Processing

> **Status**: ✅ Implemented

- **FR-001**: System shall accept raw text files (`.txt`, `.log`) containing OCPP client logs.
- **FR-002**: System shall parse the text file line by line to identify OCPP messages.
- **FR-003**: System shall handle variations in log formatting, such as timestamps and message direction (request/response).
- **FR-004**: System shall provide debug information and status updates during the parsing process.

---

## Section 3 — OCPP Message Parsing

> **Status**: ✅ Implemented

- **FR-006**: System shall parse MeterValues messages with transaction context.
- **FR-007**: System shall parse StartTransaction messages (both `StartTransaction` and `RemoteStartTransaction`).
- **FR-008**: System shall parse StopTransaction messages.
- **FR-009**: System shall parse BootNotification messages.
- **FR-010**: System shall parse Heartbeat messages.
- **FR-011**: System shall parse StatusNotification messages.
- **FR-012**: System shall extract OCPP message arrays and JSON payloads.
- **FR-013**: System shall correlate request and response messages using message IDs.

---

## Section 4 — Transaction Management

> **Status**: ✅ Implemented (Bug Fix #1 applied 2026-03-11)

- **FR-014**: System shall group meter values by transaction ID.
- **FR-015**: System shall calculate transaction duration and energy consumption.
- **FR-016**: System shall track transaction start and end times.
- **FR-017**: System shall maintain transaction metadata (connector ID, meter readings).
- **FR-018**: System shall support viewing all transactions or specific transactions.

---

## Section 5 — Meter Values Analysis

> **Status**: ✅ Implemented

- **FR-019**: System shall parse and display energy consumption data (kWh, Wh).
- **FR-020**: System shall parse and display power readings (kW, W).
- **FR-021**: System shall parse and display voltage and current measurements.
- **FR-022**: System shall parse and display State of Charge (SoC) data.
- **FR-023**: System shall parse and display temperature readings.
- **FR-024**: System shall categorize meter values by context (`Transaction.Begin`, `Periodic`, `Transaction.End`).
- **FR-025**: System shall aggregate sampled values by timestamp.
- **FR-026**: System shall handle multiple measurands and units per timestamp.

---

## Section 6 — Data Visualization & Reporting

> **Status**: ✅ Implemented

- **FR-027**: System shall provide transaction summary statistics with visual indicators.
- **FR-028**: System shall display meter values in organized tabular format with proper headers.
- **FR-029**: System shall support column filtering for data analysis.
- **FR-030**: System shall generate interactive charts for individual transactions.
- **FR-031**: System shall support multiple chart types (line charts, time series).
- **FR-032**: System shall provide data export functionality (Excel format).
- **FR-033**: System shall implement section-based UI with distinct visual separation.
- **FR-034**: System shall use icons and logos for better visual identification of sections.

### Non-Functional Requirements

- **NFR-001**: System shall process files up to 100 MB.
- **NFR-002**: System shall handle up to 100,000 log entries per file.
- **NFR-003**: System shall provide parsing status updates in real-time.
- **NFR-013**: System shall handle malformed JSON gracefully.
- **NFR-014**: System shall provide error logging and debugging information.
- **NFR-015**: System shall validate data integrity during parsing.
- **NFR-016**: System shall handle missing or incomplete data fields.
- **NFR-017**: System shall support OCPP 1.6-J protocol messages.
- **NFR-019**: System shall support multiple date/time formats.
- **NFR-020**: System shall be compatible with modern web browsers.

### Security Requirements

- **SR-001**: System shall process data locally without external transmission.
- **SR-002**: System shall not store sensitive data persistently **without user knowledge**. Exception: Log Repository stores log content with explicit user awareness. No data transmitted to any third-party server.
- **SR-003**: System shall handle user data securely during processing.
- **SR-004**: System shall provide secure file upload handling.
- **SR-005**: Log Repository cloud sync shall use Google OAuth 2.0. Tokens stored in `localStorage` and cleared on user-initiated disconnect.

### Technical Requirements

- **TR-001**: Single-page application built with client-side JavaScript.
- **TR-002**: Modular code structure for maintainability.
- **TR-003**: **Chart.js** for data visualization.
- **TR-004**: **Tailwind CSS** for styling.
- **TR-005**: Efficient data structures and memory-efficient handling for large datasets.
- **TR-006**: Real-time data filtering and sorting.
- **TR-007**: Data validation and comprehensive error logging.
- **TR-008**: Graceful handling of parsing failures with user-friendly error messages.

### UI/UX Requirements

- **UI-001**: Content organized into distinct visual sections with clear boundaries and visual hierarchy.
- **UI-002**: Each section shall be collapsible/expandable.
- **UI-003**: Tabbed navigation for major functional areas.
- **UI-004**: Responsive design for various screen sizes including mobile.
- **UI-005**: Visual breadcrumbs for navigation context.
- **UI-006**: Dark and light theme support with `localStorage` persistence.
- **UI-007**: Unique gradient background per section for visual separation.
- **UI-008**: Consistent color coding, spacing, padding, and border styling.
- **UI-009**: Summary statistics in grid format with color-coded metrics.
- **UI-010**: Interactive tables with consistent styling, sorting, and filtering.
- **UI-011**: Emoji icons for immediate visual identification of sections.
- **UI-012**: Comprehensive help modal with user guide, step-by-step instructions, and examples.
- **UI-013**: "Coming Soon" features clearly marked.
- **UI-014**: Export buttons for each data section.

---

## Section 7 — Message Type Analysis

> **Status**: ✅ Implemented

### 7.1 Boot Notifications

- **FR-035**: Track charge point vendor and model information.
- **FR-036**: Monitor boot notification success rates.
- **FR-037**: Group notifications by date and time.
- **FR-038**: Provide boot notification summary statistics.

**Table Columns**: S.No. · Time Stamp · Message ID · Charge Point Vendor · Charge Point Model · Charge Point Serial Number · Charge Box Serial Number · Firmware Version · ICCID · IMSI · Meter Type · Meter Serial Number · Response Status · Response Message · Context Analysis (Download + Preview)

### 7.2 Heartbeat Messages

- **FR-039**: Track heartbeat frequency and response rates.
- **FR-040**: Calculate response time statistics.
- **FR-041**: Group heartbeats by date ranges.
- **FR-042**: Provide heartbeat summary analytics.

**Table Columns**: S.No. · Time Stamp · Message ID · Charge Point ID · Response Status · Response Time (ms) · Response Message · Heartbeat Interval

### 7.3 Start Transactions

- **FR-043**: Track transaction initiation success rates.
- **FR-044**: Monitor connector and ID tag usage.
- **FR-045**: Provide start transaction summary statistics.
- **FR-046**: Support filtering by transaction type and date.

**Table Columns**: S.No. · Time Stamp · Message ID · Transaction ID · Internal TX ID *(FR-313)* · Connector ID · ID Tag · Meter Start · Reservation ID · Response Status · Response Message · Transaction Type · Tx Type · Replay Delay · Offline Replay

### 7.4 Stop Transactions

- **FR-047**: Track transaction completion data.
- **FR-048**: Extract SoC data from transaction data.
- **FR-049**: Monitor stop transaction reasons.
- **FR-050**: Provide stop transaction summary analytics.

**Table Columns**: S.No. · Time Stamp · Message ID · Transaction ID · Internal TX ID *(FR-314)* · Connector ID · ID Tag · Meter Stop · Meter Start · Total Energy (kWh) · Total Duration (min) · Stop Reason · SoC Final (%) · Response Status · Response Message · Tx Type · Replay Delay · Offline Replay

### 7.5 Status Notifications

> **Sub-status**: Enhanced to FR-329 in v2.6 (14 Apr 2026)

- **FR-051**: Track connector status changes.
- **FR-052**: Monitor error codes and fault conditions.
- **FR-053**: Analyze charging session success patterns.
- **FR-054**: Provide status notification summary statistics.
- **FR-322**: Capture all 8 OCPP 1.6 payload fields: `connectorId`, `status`, `errorCode`, `vendorId`, `vendorErrorCode`, `info`, plus outer log-line timestamp and payload-level timestamp.
- **FR-323**: Six dropdown column filters — Connector ID, Status, Error Code, Vendor ID, Vendor Error Code, Info — AND-combined with Session Flow filter. **Clear Filters** button resets all simultaneously.
- **FR-324**: Visible row count label updates on filter: `Showing X of Y notifications`.
- **FR-325**: **Summary Panel** above the table:
  - 5 summary cards: Total Events, Unique Statuses, Faulted Events, Error Events (errorCode ≠ NoError), Connectors.
  - Status Distribution: table with count and percentage per status, colour-coded bar.
  - Session Flow Analysis: per connector, tracks next status after each `Preparing` (skipping consecutive duplicates). Outcomes: Charging, Finishing, Available, Faulted. Displayed as 2×2 metric cards + per-connector breakdown table.
  - Error Code Frequency: table of non-`NoError` errorCode+vendorErrorCode+vendorId combinations, sorted descending.
- **FR-326**: Faulted status rows highlighted with red row background.
- **FR-327**: Status colour-coding — Available: gray · Preparing: blue · Charging: green · SuspendedEV/EVSE: amber · Finishing: teal · Faulted: red · Unavailable: dark gray.
- **FR-328**: Session Flow Analysis algorithm: group per connector → sort by timestamp → for each `Preparing`, scan forward (skip consecutive duplicate `Preparing`) → categorise next status as Charging / Finishing / Available / Faulted.
- **FR-329**: **Session Flow dropdown filter** alongside column filters:
  - `All` (default)
  - `✅ Preparing → Charging`
  - `⚠ Preparing → Finishing`
  - `⚠ Preparing → Available`
  - `✗ Preparing → Faulted`
  
  Both the `Preparing` row and the paired next-status row are tagged during the Session Flow Analysis pass. Filter shows both rows together. AND-combined with all 6 column filters. Reset by Clear Filters.

**Table Columns** (dedicated section, not generic collapsible): S.No. · Log Timestamp · Payload Timestamp · Connector ID · Status *(colour-coded)* · Error Code · Vendor ID · Vendor Error Code · Info

#### Session Flow Analysis — Outcome Definitions

| Outcome | Definition | Interpretation |
|---|---|---|
| → Charging | `Preparing` followed by `Charging` on same connector | Successful session |
| → Finishing | `Preparing` followed by `Finishing` (no `Charging`) | Session stopped before energy delivered |
| → Available | `Preparing` followed by `Available` or no successor | Abandoned/unplugged |
| → Faulted | `Preparing` followed by `Faulted` | Fault prevented charging |

---

## Section 8 — Advanced Message Types (Planned)

> **Status**: ⏳ Planned — "Coming Soon" placeholders in tool
> **Build-spec**: the OCPP 1.6J JSON Schemas in `src/schemas/ocpp-1.6/` (Section 19.7) define the structure of every message type below — implement against the schema, validate with the validator module.

- **FR-055**: Authorize message parsing and analysis.
- **FR-056**: Reservation message processing.
- **FR-057**: Firmware Management message analysis.
- **FR-058**: Smart Charging message parsing.
- **FR-059**: "Coming Soon" indicators for unimplemented features.
- **FR-060**: Consistent UI structure across all message types.

**Export requirements (already working for implemented types)**:
- **FR-061**: Export parsed data to Excel format.
- **FR-062**: Support filtered data export.
- **FR-063**: Maintain data integrity during export.
- **FR-064**: Provide IST timestamp formatting for exported data.

**Help System** (already working):
- **FR-065**: Comprehensive help documentation with tool explanations.
- **FR-066**: Step-by-step usage instructions for each feature.
- **FR-067**: Help modal with organized information sections.
- **FR-068**: Contextual help for complex operations.
- **FR-069**: User guide with feature descriptions and examples.

---

## Section 9 — Downtime Analysis

> **Status**: ✅ Implemented — config-driven engine with **4 fault types** + 2 post-processing flag layers

> **Scope**: This is a **fault-analysis path** — documented exhaustively per the operating principle that compliance/safety/fault paths must be complete. Source of truth in tool: `downtimeConfig` (HTML 946–1068), `detectDowntimes()` (1298–1595), `createDowntimeReportSection()` (3046+).

### 9.1 Downtime Detection Engine (`detectDowntimes`)

- **FR-330**: System shall detect operational downtime periods by scanning `window.rawLogLines` line-by-line, driven by an extensible **`downtimeConfig`** object (one entry per fault type). Each entry defines `customStartCheck(line)` (or a `startPattern` regex), `endPatterns[]`, `extractErrorCodes()`, and optional flags `useLastHeartbeatAsStart` / `isContinuousReporting`.
- **FR-331**: For each line the engine evaluates **start** conditions for all types first, then **end** conditions for active downtimes (a downtime cannot start and end on the same line). Active downtimes are tracked in an `activeDowntimes` Map keyed by reason.
- **FR-332**: Each resolved record carries: `reason`, `startTime`, `startLineNumber`, `endTime`, `endLineNumber`, `lastSeenTime/Line` (continuous faults), `duration` (`HH:MM:SS`), `ocppErrorCode`, `cpoErrorCode`, `vendorErrorCode`, and `info` (start/recovery line numbers).
- **FR-333**: Unresolved downtimes at end-of-log are emitted with `duration = "Ongoing"`. All downtimes are sorted chronologically by start time.
- **FR-334**: The engine also collects all WebSocket PING/PONG events (`window._wsPingEvents` / `_wsPongEvents` / `_wsServerPings`) in this same pass — zero extra scan — feeding Section 14 (FR-265).

### 9.2 The Four Downtime Types

| Type (internal) | Display name | Start signature | Recovery | Notes |
|---|---|---|---|---|
| **Connection Lost** | `Websocket Disconnected` | Any of **5** patterns: PING-timeout (`client didn't get a response for PING … disconnected`), `Fail to connect`, `connection closed: …1006`, `Timeout of the client connection`, `reconnect failed timeout` | **BootNotification Accepted** (`<< message received` + `"status":"Accepted"` + `"interval":`) | Start back-dated to **last PING/PONG** (`useLastHeartbeatAsStart`); resolved end = first StatusNotification payload timestamp after boot (clock-sync-safe after RTC reset) |
| **Power Failure** | `PowerLoss` | StatusNotification `info:"PowerFailure"` + `status:"Faulted"` + `errorCode:"OtherError"` + `vendorErrorCode:"19"` | Connector-0 recovery: `connectorId:0` + `errorCode:"NoError"` + status ∈ {Available, Preparing, Charging, Finishing} | Feeds Power Restore post-check (9.4) |
| **Input Under Voltage** | `UnderVoltage` | StatusNotification `errorCode:"UnderVoltage"` + `info:"InputUnderVoltage"` + `status:"Faulted"` + `vendorErrorCode:"26"` | **Time-based silence** — clears when no new report for **≥ 60 s** (`silenceThresholdMs: 60000`) | `isContinuousReporting: true` — fault re-reports continuously; engine updates `lastSeenTime` per report; recovery time = last seen |
| **Emergency Stop** | `EmergencyStop` | StatusNotification `info:"EmergencyPressed"` + `status:"Faulted"` + `errorCode:"OtherError"` + `vendorErrorCode:"17"` | Connector-0 recovery (same as Power Failure) | Feeds Emergency Stop Release post-check (9.5) |

- **FR-335**: All four start signatures are matched **order-independently** — each field checked by substring, both with and without a space after the `:`.
- **FR-336**: Fixed error-code triples per type: Power Failure → `OtherError`/`19`; Input Under Voltage → `UnderVoltage`/`26`; Emergency Stop → `OtherError`/`17`; Connection Lost → nearest alert code or `N/A`.
- **FR-337**: The config is intentionally extensible — a new fault type (e.g. `Input Over Voltage`) is added by appending one `downtimeConfig` entry, with no engine change.

### 9.3 Downtime Report Section (`createDowntimeReportSection`)

- **FR-338**: A collapsible **"📉 Downtime Report (N)"** section renders all detected downtimes, reason shown via the display-name map (Connection Lost → Websocket Disconnected, Power Failure → PowerLoss, Input Under Voltage → UnderVoltage, Emergency Stop → EmergencyStop).
- **FR-339**: A summary panel shows Total Events and Total / Average / Longest / Shortest duration — computed only over resolved entries (Ongoing excluded).
- **FR-340**: Each row exposes **Download Context** and **Preview Context** (`downloadDowntimeContext` / `previewDowntimeContext`) returning the surrounding log lines for the downtime window, plus **Export to Excel** (`Downtime_Report.xlsx`).

> The two subsections below (9.4, 9.5) are **post-processing layers** that run on the resolved Power Failure / Emergency Stop downtimes from the engine above.

### 9.4 Power Restore — Missing BootNotification / Status Sync

- **FR-070**: Detect power restoration events following a Power Failure (PowerLoss StatusNotification) where the expected recovery sequence is absent.
- **FR-071**: After every resolved Power Failure, verify both received between start and recovery end (+30s buffer):
  - A **BootNotification** (confirms charger reboot and re-registration)
  - Any **StatusNotification** that is not itself a PowerFailure/Faulted (confirms operational state)
- **FR-072**: If either is absent, flag as **"Power Restore – Missing Boot/Status Sync"** and add row to Downtime Report table.
- **FR-073**: Flag row inherits start time, end time, and duration from the parent Power Failure entry.
- **FR-074**: Info field specifies which messages are missing and the relevant log line numbers.
- **FR-075**: Missing sync rows visually distinguished with **amber/orange** background.
- **FR-076**: Only **resolved** Power Failure downtimes evaluated; Ongoing entries excluded.
- **FR-077**: 30-second buffer beyond Power Failure end time.

**Detection Logic:**
1. **Full power cut (charger reboots)**: BootNotification + StatusNotification(Available/Preparing/Charging/Finishing) both present.
2. **UPS-sustained recovery (no reboot)**: No BootNotification, but StatusNotification(NoError) present.
Flag raised when **neither** is found.

### 9.5 Emergency Stop Release — Status Update

- **FR-078**: Detect all resolved Emergency Stop downtime events and verify StatusNotification received after release.
- **FR-079**: Emergency Stop identified by StatusNotification: `info="EmergencyPressed"`, `status="Faulted"`, `errorCode="OtherError"`, `vendorErrorCode="17"`.
- **FR-080**: Recovery identified by StatusNotification on `connectorId:0` with `errorCode="NoError"` and status one of Available/Preparing/Charging/Finishing.
- **FR-081**: After every resolved Emergency Stop, verify at least one non-EmergencyPressed StatusNotification received in window (+30s buffer).
- **FR-082**: Display **all** resolved Emergency Stop events — both properly followed and missing StatusNotification.
- **FR-083**: Only **resolved** Emergency Stop downtimes evaluated.
- **FR-084**: 30-second buffer beyond Emergency Stop end time.

**Dedicated Section — "🛑 Emergency Stop Release – Status Update (N)"**:
- **FR-085**: Separate section from standard Downtime Report.
- **FR-086**: Three summary cards: Total Emergency Stops · StatusNotification Received (green) · Missing StatusNotification (orange).
- **FR-087**: Row columns: S.No. · EmergencyStop Timestamp (UTC) · EmergencyStop Start (IST) · Emergency Released (IST) · Duration · Missing StatusNotification · StatusNotification Status Received · OCPP Error Code · Vendor Error Code · Details · Preview · Download.
- **FR-088**: UTC timestamp column in monospace, selectable for easy log searching.
- **FR-089**: "StatusNotification Status Received" shows per-connector badges: `C0: Available | C1: Finishing | C2: Available`.
- **FR-090**: Rows with StatusNotification properly received → **green** background; missing → **red** background.
- **FR-091**: Export to Excel (`Emergency_Stop_Missing_Status.xlsx`), Preview context, and Download context per row.

---

## Section 10 — Transaction Health & Quality Analysis

> **Status**: 🚧 Partially Implemented — Zero Energy ✅, Fault Status Summary ✅; verify 10.2–10.5, 10.7–10.10

> **Scope**: All features apply exclusively to **DC fast chargers**. AC charger behaviour is out of scope.

### Implementation Priority Order

| Priority | Feature | Sub-Section |
|---|---|---|
| 1 | Fault Status Summary | 10.6 |
| 2 | Zero Energy Transaction Flag | 10.1 |
| 3 | Temperature Threshold Alerts | 10.2 |
| 4 | Start/Stop Meter Continuity | 10.3 |
| 5 | Incomplete Transaction Summary | 10.7 |
| 6 | Energy Dispense Check | 10.8 |
| 7 | Connector Stats | 10.9 |
| 8 | Current Delivery Mismatch | 10.4 |
| 9 | Concurrent Session Overlap Detection | 10.5 |
| 10 | Power Delivery Mismatch | 10.10 |

### 10.1 Zero Energy Transaction Flag ✅

- **FR-092**: Flag completed transactions with total energy < configurable threshold.
- **FR-093**: Threshold user-configurable (default: **500 Wh**). Range: 1–10,000 Wh. Persists in `localStorage`.
- **FR-094**: Zero Energy Transactions highlighted with **yellow** row background in Transaction Summary.
- **FR-095**: Transaction Summary header filter: All / All Issue Transactions / Zero Energy only / Normal only.
- **FR-096**: Summary count of Zero Energy Transactions in summary cards.

*Data source*: `tx.totalEnergy`. Use case: Identifies failed charging sessions — cable not locked, auth failure, EV rejection, charger fault.

### 10.2 Temperature Threshold Alerts

- **FR-097**: Track maximum temperature readings per transaction from MeterValues for Inlet, Outlet, and Body locations.
- **FR-098**: Alert thresholds (DC charger spec): Inlet > **60°C** · Body > **60°C** · Outlet > **65°C**.
- **FR-099**: Transactions exceeding any threshold flagged with **orange** row background.
- **FR-100**: Transaction Summary table columns: Max Temp Inlet (°C) · Max Temp Outlet (°C) · Max Temp Body (°C).
- **FR-101**: Summary count of Temperature High transactions in summary cards.

### 10.3 Start/Stop Meter Continuity

- **FR-102**: Per connector, check whether Meter Stop of transaction N matches Meter Start of transaction N+1 (consecutive sessions sorted by start time).
- **FR-103**: Difference (`prev Meter Stop − curr Meter Start`) stored as **Start/Stop Diff (Wh)**.
- **FR-104**: Diff > **10 Wh** flagged with **blue** row background.
- **FR-105**: Negative diff (current Meter Start > previous Meter Stop) also flagged as meter anomaly.
- **FR-106**: First transaction on each connector shows `N/A`.
- **FR-107**: Summary count of Start/Stop Diff High transactions.

### 10.4 Current Delivery Mismatch

- **FR-108**: Calculate **Current Delivery Mismatch %** per transaction:
  `(Sum of Current.Import readings) / (Sum of Current.Offered readings) × 100`
  using only `Sample.Periodic` MeterValues.
- **FR-109**: Transactions where mismatch < **95%** or > **105%** flagged with **red** row background — unless concurrent session overlap (FR-120) detected.
- **FR-110**: Transaction Summary column: **Current Delivery Mismatch (%)**.
- **FR-111**: Summary count in summary cards.

### 10.5 Concurrent Session Overlap Detection

> ⛔ **PERMANENTLY SKIPPED** — Decision made during CHANGELOG Run #22 (14 Mar 2026)
>
> The FR assumed DC fast chargers support only one active session at a time. **Ador Digatron QUENCH chargers have two physical connectors (CCS + CHAdeMO) and may legitimately run both simultaneously.** Implementing this check would produce false positives for every dual-connector session. FR-114 (suppress Current Mismatch on overlap) is also moot. The Overlap Detected column in Connector Stats shows `—` permanently.

- **FR-112 ⛔**: ~~Detect overlapping active session time windows.~~ **Skipped — false positive for dual-connector hardware.**
- **FR-113 ⛔**: ~~Overlap Detected column.~~ **Skipped.**
- **FR-114 ⛔**: ~~Suppress Current Mismatch flag on overlap.~~ **Skipped.**
- **FR-115 ⛔**: ~~Overlap count in summary cards.~~ **Skipped.**

### 10.6 Fault Status Summary ✅

- **FR-116**: Aggregate all StatusNotification messages with `status="Faulted"` in a dedicated **Fault Status Summary** section.
- **FR-117**: Group by: Connector ID → Fault Info (`info` field) → Vendor Error Code → Count.
- **FR-118**: Table columns: Connector ID · Fault Info · Vendor Error Code · Count.
- **FR-119**: If no Faulted StatusNotifications: display "No faults recorded".
- **FR-120**: Export to Excel (`Fault_Status_Summary.xlsx`).
- **FR-121**: Placed after Emergency Stop section in render order.

### 10.7 Incomplete Transaction Summary

- **FR-122**: Identify all transactions with StartTransaction without matching StopTransaction, or vice versa.
- **FR-123**: Classify by location:

| Condition | Label | Interpretation |
|---|---|---|
| No complete transaction before it on same connector | `Start of Logs` | Expected at log boundaries |
| No complete transaction after it on same connector | `End of Logs` | Expected at log boundaries |
| Complete transactions exist before AND after | `Between Logs` | Genuine error — charger crash, lost StopTransaction |

- **FR-124**: **Between Logs** transactions highlighted **red** — genuine errors.
- **FR-125**: Columns: Transaction ID · Connector ID · Missing (Start / Stop) · Location · Reason.
- **FR-126**: Export to Excel (`Incomplete_Transactions.xlsx`).

### 10.8 Energy Dispense Check

- **FR-127**: Per connector, compute:
  - Min Meter Start · Max Meter Stop
  - Recorded Energy (Wh): `Max Meter Stop − Min Meter Start`
  - Summed Dispensed Energy (Wh): Sum of `(MeterStop − MeterStart)` for all complete transactions
  - Energy Difference (Wh): `Recorded − Summed`
  - Diff per Transaction (Wh): `Energy Difference / Total Count`
- **FR-128**: Connectors where Diff per Transaction > **10 Wh** highlighted **red**.
- **FR-129**: Negative Energy Difference (Summed > Recorded) flagged as meter anomaly.
- **FR-130**: Export to Excel (`Energy_Dispense_Check.xlsx`).

### 10.9 Connector Stats

> Requires Sections 10.1–10.5 implemented first (rollup of those flags).

- **FR-131**: **Connector Stats** section aggregating all transaction health flags per connector.
- **FR-132**: Per connector display: Connector ID · Total Transactions · Avg Power (kW) · Peak Power (kW) · Zero-Energy Count + Rate (%) · Current Mismatch Count + Rate (%) · Temperature High Count + Rate (%) · Start/Stop Diff High Count + Rate (%) · Overlap Detected Count + Rate (%) · Normal Count + Rate (%).
- **FR-133**: Export to Excel (`Connector_Stats.xlsx`).
- **FR-134**: Rendered immediately after Transaction Summary section.

### 10.10 Power Delivery Mismatch

> ⚠️ **PLACEHOLDER ONLY** — A disabled `<option value="power-mismatch" disabled>` entry was added to the Show filter dropdown (Run #22). The calculation formula below requires review before implementation. FR-137's overlap suppression is also moot given 10.5 was skipped.

- **FR-135**: Calculate **Power Delivery Mismatch %** per transaction:
  `Power.Active.Import / min(EV Demand, Power.Offered) × 100`
  where EV Demand = Sum of `(Voltage(EV) × Current.Offered(EV))` per periodic sample.
- **FR-136**: Applies only when minimum 3 `Sample.Periodic` data points exist. Otherwise: `N/A`.
- **FR-137**: Mismatch < **90%** or > **110%** flagged — concurrent overlap suppression not applicable (10.5 skipped).
- **FR-138**: Transaction Summary column: **Power Delivery Mismatch (%)**.

---

## Section 11 — Protocol Compliance Report

> **Status**: 🔍 Verify — requirements added v1.5 (Mar 2026); check implementation in tool

> **Scope**: Read-only analysis layer. No existing parser, section, or rendering pipeline modified. Implemented as 3 new functions + 1 `appendChild` call at end of `displayResults()`.

### 11.1 Overview

- **FR-140**: Render a **Protocol Compliance Report** section after the Energy Dispense Check.
- **FR-141**: Always rendered. Checks with no applicable data display `— N/A`.
- **FR-142**: **24 system-level checks** in 5 protocol groups + **per-transaction lifecycle validation** with 9 stages per transaction (10 stages after Section 16 is implemented).
- **FR-143**: **Compliance score** = `Passed / (Total − N/A) × 100`. N/A checks excluded.
- **FR-144**: No new parsing logic. Derives from `messageGroups`, `transactions`, `window.rawLogLines`.

### 11.2 Section Header & Score Badge

- **FR-145**: Header: `📋 Protocol Compliance Report` with score badge.
- **FR-146**: Score badge colour: Green ≥ 90% · Yellow 70–89% · Red < 70%.
- **FR-147**: Collapsible. Default state: **expanded**.
- **FR-148**: Indigo border colour.

### 11.3 Summary Cards (5 cards)

| Card | Colour | Value |
|---|---|---|
| Total Checks | Gray | All system checks (not per-stage) |
| ✓ Passed | Green | PASS count |
| ⚠ Warnings | Yellow | WARN count |
| ✗ Failed | Red | FAIL count |
| — N/A | Blue | INFO/N/A count |

### 11.4 Tab Bar

- **FR-150**: Tab 1: `🔧 System Checks (N)` — default active.
- **FR-151**: Tab 2: `⚡ Transaction Lifecycle (N)`.

### 11.5 System Checks — Group Definitions

#### Group 1: Boot & Registration (`BOOT`)

| Check | Description | FAIL Condition | WARN Condition |
|---|---|---|---|
| BOOT-001 | BootNotification sent on startup | 0 BootNotifications | — |
| BOOT-002 | BootNotification responses received | All unanswered | Some unanswered |
| BOOT-003 | BootNotification accepted (status=Accepted) | Any non-Accepted response | — |
| BOOT-004 | No Phantom Connection (unanswered BootNotif + active PING/PONG) | Unanswered BootNotifs + PING/PONG found | — |
| BOOT-005 | StatusNotification(Available) post-boot | — | No Available after first BootNotif |
| BOOT-006 | Heartbeat messages present | — | 0 Heartbeat messages |

#### Group 2: Response Integrity (`RESP`)

| Check | Description | FAIL Condition | WARN Condition |
|---|---|---|---|
| RESP-001 | All StartTransaction requests have responses | Any StartTx without responsePayload | — |
| RESP-002 | All StopTransaction requests have responses | — | Any StopTx without responsePayload |
| RESP-003 | Heartbeat response rate ≥ 95% | — | Responded / Total < 95% |

#### Group 3: Transaction Completeness (`TXC`)

| Check | Description | FAIL Condition | WARN Condition |
|---|---|---|---|
| TXC-001 | All started transactions have matching StopTransaction | — | Any TX without stopTime |
| TXC-002 | All StartTransactions authorized (status=Accepted) | Any Invalid or Blocked | — |
| TXC-003 | No zero-energy completed transactions (< 500 Wh) | — | Any complete TX with totalEnergy × 1000 < 500 Wh |

#### Group 4: Status Transition Sequence (`STATUS`)

| Check | Description | FAIL Condition | WARN Condition |
|---|---|---|---|
| STATUS-001 | All connectors report Available at some point | — | Any connector (ID > 0) with no Available |
| STATUS-002 | No Faulted status during active charging | — | Any Faulted within TX start–stop window |
| STATUS-003 | StatusNotification(Preparing) precedes each StartTransaction | — | No Preparing on same connector within 10 min before TX start |
| STATUS-004 | StatusNotification(Charging) present during transaction | — | No Charging on same connector within TX window |
| STATUS-005 | Connector reports Finishing/Available after StopTransaction | — | No Finishing/Available within 10 min after TX stop |

#### Group 5: MeterValues Integrity (`MV`)

| Check | Description | FAIL Condition | WARN Condition |
|---|---|---|---|
| MV-001 | Transaction.Begin MeterValues for all transactions | — | Any complete TX missing Transaction.Begin |
| MV-002 | Periodic MeterValues during transactions | — | TX duration > 2 min with 0 periodic MeterValues |
| MV-003 | No orphaned MeterValues | — | Any MeterValues referencing invalid TX ID |
| MV-004 | Meter start/stop continuity (diff < 10 Wh) | — | `|prev.meterStop − tx.meterStart| > 10 Wh` |

### 11.6 Transaction Lifecycle (9 Stages per Transaction)

| # | Stage | PASS | FAIL | WARN | N/A |
|---|---|---|---|---|---|
| 1 | EV Connected — Preparing | StatusNotif(Preparing) within 10 min before TX start | — | Not found | TX has no startTime |
| 2 | StartTransaction Sent | StartTx message found | Not found | — | — |
| 3 | CSMS Authorization | idTagInfo.status=Accepted | Invalid or Blocked | No response | — |
| 4 | Charging — Power Delivery | StatusNotif(Charging) during TX window | — | Not found | TX has no startTime |
| 5 | MeterValues: Transaction.Begin | Transaction.Begin MeterValues found | — | Not found | — |
| 6 | MeterValues: Periodic Samples | ≥ 1 Sample.Periodic | — | 0 found and TX > 2 min | TX duration ≤ 2 min |
| 7 | StopTransaction Sent | StopTx found | Not found and session ended | Not found, may be ongoing | — |
| 8 | CSMS Stop Acknowledged | stopMsg.responsePayload non-null | responsePayload is null | — | StopTx not found |
| 9 | Session Released — Finishing/Available | StatusNotif(Finishing or Available) within 10 min after TX stop | — | Not found | TX has no stopTime |

> After Section 16 is implemented: a **10th stage** `CMS ↔ Internal TX ID` is added per FR-317.

### 11.7 Visual Stage Flow (Layer 1 — in Transaction Lifecycle Tab)

- **FR-159**: Horizontal stepper showing all lifecycle stages as numbered circles connected by lines.
- **FR-161**: Circle fill: Green=PASS · Red=FAIL · Yellow=WARN · Gray=N/A.
- **FR-164**: Stage labels: `EV Conn` / `Start Tx` / `Auth` / `Charging` / `Begin MV` / `Periodic MV` / `Stop Tx` / `Stop ACK` / `Released`.

### 11.8 Implementation Architecture

- **FR-168**: Three new functions (additive only):
  1. `detectPhantomConnectionPattern(bootNotifications)` — checks PING/PONG + unanswered BootNotifs
  2. `runProtocolValidation(messageGroups, transactions, messages)` — returns `{ groups, perTransactionResults, summary }`
  3. `createProtocolValidationSection(validationResult)` — builds full DOM section
- **FR-169**: One `appendChild` call added at end of `displayResults()`.
- **FR-170**: No existing function modified.

---

## Section 12 — Log Repository

> **Status**: ✅ Implemented (IndexedDB ✅; Google Drive — verify sync status)

> **Scope**: Hybrid IndexedDB + Google Drive storage. Implemented as 4 new functions + 2 additive integration hooks. No existing function modified.

### 12.1 Storage Architecture

- **FR-172**: Hybrid Log Repository — Local (IndexedDB, gzip compression) + Cloud (Google Drive API v3).
- **FR-173**: Local layer functions fully without internet. Drive sync activates only when authenticated.
- **FR-174**: Log content compressed with `CompressionStream` (gzip) before IndexedDB write. Decompressed with `DecompressionStream` on read. Expected compression ratio: 85–92%.
- **FR-175**: `navigator.storage.persist()` requested on first save. If denied, non-blocking notice shown.
- **FR-176**: Real storage usage displayed via `navigator.storage.estimate()`: `"Using X MB of Y GB available"`.
- **FR-177**: Non-blocking toast warning when estimated remaining storage < 500 MB.

### 12.2 Metadata Schema

| Field | Type | Notes |
|---|---|---|
| `id` | Auto-increment | Primary key |
| `filename` | String | Log filename |
| `savedAt` | Number | UTC epoch ms |
| `fileSize` | Number | Raw bytes pre-compression |
| `evseIp` | String | Empty string for file uploads |
| `siteName` | String | User input; pre-populated from filename if detectable |
| `tags` | Array\<String\> | e.g. `["Power Failure", "CMS Issue"]` |
| `content` | ArrayBuffer | Gzip-compressed raw log text |
| `driveFileId` | String \| null | Drive file ID; null if local only |
| `source` | String | `"upload"` or `"api"` |

- **FR-178**: All metadata fields (excluding `content`) indexed in IndexedDB for fast search without decompressing.

### 12.3 Auto-Save Behaviour

- **FR-179**: Auto-save to repository after every successful parse — no user action required.
- **FR-180**: Site name prompt (non-blocking pop-in banner) after auto-save; pre-populated from filename if detectable.
- **FR-181**: If Google Drive connected, upload to Drive in background after site name prompt is resolved.
- **FR-182**: Toast confirmation: `"✅ Saved to repository: filename.log"`.

### 12.4 Duplicate Handling

- **FR-183**: If same filename exists: prompt with **Overwrite** (replace content + update `savedAt`) or **Save as new version** (append `_v2`, `_v3` suffix).

### 12.5 Repository Panel UI

- **FR-184**: **"📂 Log Repository"** collapsible panel renders at page load, above file upload card, always visible.
- **FR-185**: Panel header: Total logs stored · Storage used · Storage available · Google Drive connection badge · Connect/Disconnect button.
- **FR-186**: Search/filter bar: filename, site name, EVSE IP, date range (from/to), tags.
- **FR-187**: Stored logs table columns: Filename · Site Name · EVSE IP · Saved (IST) · Size · Tags · Storage (Local/Cloud) · Actions (Load & Analyze · Tag · Delete).
- **FR-188**: Dark/light theme consistent.

### 12.6 Load & Re-Analyze

- **FR-189**: "**Load & Analyze**" retrieves + decompresses from IndexedDB (or downloads from Drive if local absent) → passes through existing `parseOcppLogsAsync()` → `renderCombinedResults()` pipeline.
- **FR-190**: Always runs **current parser version**. Raw log content only is stored — previous analysis results are not cached.

### 12.7 Delete

- **FR-191**: Delete permanently removes from IndexedDB after confirmation prompt.
- **FR-192**: If `driveFileId` set, separate confirmation: *"Also delete from Google Drive?"* — local delete proceeds regardless.

### 12.8 Tagging

- **FR-193**: Each entry supports user-defined tags array.
- **FR-194**: Predefined tag suggestions: `Power Failure`, `CMS Issue`, `Phantom Connection`, `Zero Energy`, `Emergency Stop`, `EV Compatibility`, `Normal`. Custom tags also allowed.
- **FR-195**: Tags filterable in repository panel search bar.
- **FR-196**: Tags synced to Google Drive sidecar metadata JSON when Drive is connected.

### 12.9 Google Drive Integration

- **FR-197**: When opened from `file://`, "Connect Google Drive" button disabled with tooltip: *"Cloud sync requires the tool to be opened from a hosted URL."*
- **FR-198**: First use: "Connect Google Drive" → Google OAuth popup → access token stored in `localStorage`.
- **FR-199**: Subsequent page loads: stored token restored automatically. Token refresh handled by GIS library.
- **FR-200**: "Disconnect" revokes token, clears `localStorage`, updates badge.
- **FR-201**: Drive folder auto-created on first upload. Folder ID cached in `localStorage`.
- **FR-202**: Each log in Drive has a companion sidecar file (`filename.meta.json`) with all metadata except `content`.
- **FR-203**: API usage within free tier (< 1,000 calls/day). No billing incurred.
- **FR-204**: Team sharing via shared "OCPP Log Repository" Drive folder. Each member connects own Google account.

### 12.10 Implementation Architecture

**New Functions** (4 additions — no existing function modified):

| Function | Purpose |
|---|---|
| `initLogRepository()` | Opens IndexedDB, renders panel, restores Google auth — called at `DOMContentLoaded` |
| `createLogRepositoryPanel()` | Builds and returns persistent UI panel DOM element |
| `saveLogToRepository(filename, content, metadata)` | Compresses + writes to IndexedDB; uploads to Drive if connected |
| `loadAndAnalyzeFromRepo(id)` | Reads + decompresses from IndexedDB (or Drive); triggers existing parse pipeline |

**CDN Additions** (2 script tags — no existing scripts changed):
```html
<script src="https://apis.google.com/js/api.js"></script>
<script src="https://accounts.google.com/gsi/client"></script>
```

- **FR-205**: No existing function, section, or rendering pipeline modified.
- **FR-206**: After implementation, all existing sections render identically.

---

## Section 13 — Session Timeline & Telemetry

> **Status**: ❓ Unknown — design doc exists (`session_timeline_improvements.md`); verify in tool

> **Scope**: Per-transaction visual timeline correlating all charging signals on a shared time axis. Read-only visualisation. No existing parser, section, or rendering pipeline modified.

### 13.1 Overview

- **FR-207**: **Session Timeline & Telemetry** view per transaction, accessible from Transaction Summary table.
- **FR-208**: Implemented as a **modal** containing a 4-tab chart panel.
- **FR-209**: Each tab is a completely independent chart canvas — tab switching replaces canvas entirely.
- **FR-210**: Timeline spans StartTransaction → StopTransaction (UTC). If StopTransaction absent, spans to last available MeterValue timestamp for that transaction.
- **FR-211**: No new parsing logic. Derives from `transactions`, `messageGroups.StatusNotification`, MeterValues by TX ID, `allEvents`, `allAlerts`.

### 13.2 Trigger & Modal Container

- **FR-212**: **"📊 Timeline"** button added to each Transaction Summary table row, alongside existing "View Chart" button.
- **FR-213**: Modal header: `Session Timeline — TX <id> | Connector <N> | <Start IST> → <Stop IST>`. 4-tab bar: **Session · Energy · Status · Telemetry**. Default active: **Session**.

### 13.3 Tab 1 — Session

- **FR-214**: Horizontal timeline bar spanning full transaction duration.
- **FR-215**: Event markers as labeled vertical lines (11 markers):

| # | Marker | Colour | Label | Source |
|---|---|---|---|---|
| 1 | Last Available before session | Gray | `● Available` | StatusNotif(Available), within 10 min before Preparing |
| 2 | EV plugged in — Preparing | Blue | `⬡ Preparing` | StatusNotif(Preparing) before StartTx |
| 3 | Authorization result | Cyan/Red | `🔑 Auth: Accepted/Invalid` | Authorize.conf or StartTx response |
| 4 | StartTransaction | Green | `▶ Start` | StartTx timestamp |
| 5 | Charging began | Bright green | `⚡ Charging` | StatusNotif(Charging) after StartTx |
| 6 | Emergency Stop (if any) | Orange | `⚡ E-Stop` | StatusNotif(Faulted, vendorErrorCode:17) |
| 7 | BootNotification during session (if any) | Purple | `↺ Reboot` | BootNotif within session window |
| 8 | Phantom Connection (if detected) | Red dashed | `👻 Phantom` | Phantom Connection start timestamp |
| 9 | StopTransaction | Red | `■ Stop` | StopTx timestamp + Stop Reason |
| 10 | Finishing | Teal | `🏁 Finishing` | StatusNotif(Finishing) after StopTx |
| 11 | Released — Available | Gray | `● Available` | StatusNotif(Available) after Finishing |

Timeline X-axis pads up to 10 min before StartTx and 10 min after StopTx.

- **FR-216**: Session metadata card above chart: TX ID · Connector ID · ID Tag · Duration · Total Energy · Stop Reason · Start SoC% → End SoC%.
- **FR-217**: Anomaly alert badge in metadata card if Zero Energy, Phantom Connection, Emergency Stop, or Incomplete detected.

### 13.4 Tab 2 — Energy

- **FR-218**: Dual-curve chart: SoC% (left Y-axis, bright green) + Cumulative Energy kWh (right Y-axis, dimmer green).
- **FR-219**: Hover tooltip per sample: `Time (IST) | SoC: X% | Energy: Y kWh | Context`.
- **FR-220**: Context markers distinguish Transaction.Begin (circle), Sample.Periodic (dot), Transaction.End (square) on SoC curve.
- **FR-221**: If Start/Stop Meter Continuity gap (FR-104) detected, shaded red region on energy axis with tooltip: `⚠ Meter gap: Xwh`.

### 13.5 Tab 3 — Status

- **FR-222**: Connector swimlane view — one horizontal lane per connector appearing in transaction's StatusNotification data.
- **FR-222a**: Swimlane X-axis begins 10 min before StartTx and ends 10 min after StopTx (shows Available→Preparing pre-session and Finishing→Available post-session transitions).
- **FR-223**: Coloured status blocks spanning exact time each status was active (colour scheme per FR-327).
- **FR-225**: Event markers from Tab 1 appear as thin vertical lines across all swimlanes.
- **FR-226**: Hover on status block: `Status | From: HH:MM:SS | To: HH:MM:SS | Duration: Xm Ys`.

### 13.6 Tab 4 — Telemetry

- **FR-227**: Dual-track chart: Power kW (upper, bright green) + Temperature °C (lower, separate curves for Inlet/Outlet/Body).
- **FR-229**: Temperature threshold breach points marked with **red dot** and tooltip: `⚠ Threshold exceeded: 62.3°C (Inlet)`.
- **FR-230**: If < 3 periodic samples: display `Insufficient telemetry data for this transaction`.

### 13.7 Implementation Architecture

- **FR-231**: `createSessionTimelineModal(txId)` — builds complete modal DOM for given TX ID.
- **FR-232**: `getTimelineDataForTx(txId)` — extracts and shapes all data for the four tab renderers.
- **FR-233**: One line added to Transaction Summary table row builder to insert "📊 Timeline" button.
- **FR-234**: No existing function, section, or rendering pipeline modified.

---

## Section 14 — WebSocket Connection Health

> **Status**: ✅ Implemented — git commit: "Add WebSocket Connection Health section (Section 14, FR-235-269)"

> **Scope**: WebSocket PING/PONG analysis panel from `window.rawLogLines`. Read-only diagnostic layer. Piggybacked onto `detectDowntimes()` loop at zero extra processing cost.

### 14.1 Overview

- **FR-235**: Analyse all WebSocket PING/PONG messages and render **📡 WebSocket Connection Health** section after Protocol Compliance Report.
- **FR-236**: Always rendered. If no PINGs: `"No WebSocket PING/PONG messages found in this log."`.
- **FR-237**: No new parsing logic. Operates on `window.rawLogLines` only.
- **FR-238**: Teal border colour (`border-l-4 border-teal-500`).

### 14.2 Log Pattern Detection

| Pattern | Direction | Meaning |
|---|---|---|
| `[OCPPClient] >> PING` | Client → Server | Charger sends Ping |
| `[OCPPClient] << PONG` | Server → Client | CSMS responds with Pong |
| `[OCPPClient] << PING` | Server → Client | CSMS sends Ping (client responds automatically — not logged) |

- **FR-239**: `>> PONG` is not logged by current firmware. Absence is not treated as an error.

### 14.3 Adaptive Ping Interval Detection

- **FR-240**: Inter-PING interval computed dynamically: `interval(i) = pingTime(i) − pingTime(i−1)`.
- **FR-241**: Average ping interval computed across all observed intervals.
- **FR-242**: No fixed interval assumed. Firmware may use 5s, 30s, 60s, or any value.
- **FR-243**: First `>> PING` shows `—` for interval.

### 14.4 Connection Stall Detection

- **FR-244**: Stall: `interval(i) > avgInterval × 2`.
- **FR-245**: Stall rows highlighted **amber** in detail table.
- **FR-246**: Stall count in summary card; "No stalls" sub-label if zero.

### 14.5 Client-Initiated PING Latency

- **FR-247**: For each `>> PING`, find first `<< PONG` occurring after PING, before next `>> PING`, within 10 seconds.
- **FR-248**: `latency (ms) = pong_time − ping_time`.
- **FR-249**: Latency colour-coded: Green < 200ms · Yellow 200–999ms · Orange 1000–2999ms · Red ≥ 3000ms.

### 14.6 Missed PONG Detection

- **FR-250**: No matching `<< PONG` within 10 seconds of `>> PING` → flagged **Missed PONG**.
- **FR-251**: Missed PONG rows highlighted **red** in detail table.
- **FR-252**: Latency cell shows red badge: `✗ No PONG`.
- **FR-253**: Total missed PONG count in summary card.

### 14.7 Server-Initiated PING

- **FR-254**: Collect all `<< PING` events during `detectDowntimes()` pass.
- **FR-255 / FR-256**: ~~Server-initiated PINGs shown in detail table.~~ **Superseded** — not shown in table (no latency/interval data available).
- **FR-257**: Count of server-initiated PINGs shown as sub-label on Missed PONGs summary card.

### 14.8 Overall Connection Status Badge

| Status | Condition |
|---|---|
| **Healthy** | No missed PONGs AND max latency < 1000ms AND no stalls |
| **Warning** | Any stall OR max latency ≥ 1000ms (< 3000ms) AND missed PONG rate ≤ 20% |
| **Critical** | Max latency ≥ 3000ms OR missed PONG rate > 20% |
| **No Data** | Zero `>> PING` events in log |

Colours: Green (Healthy) · Yellow (Warning) · Red (Critical) · Gray (No Data).

### 14.9 Section UI

- **FR-258**: Header: `📡 WebSocket Connection Health (N PINGs)` with status badge inline.
- **FR-259**: Collapsible. Default: **expanded**.
- **FR-260**: Export to Excel (`WebSocket_Health.xlsx`).

**Summary Cards (5)**:

| Card | Value |
|---|---|
| Total PINGs | Count of `>> PING` events; sub-label: `PONGs: N` |
| Avg Interval | Average interval (s); sub-label: stall count or "No stalls" |
| Avg Latency | Average latency (ms); sub-label: `Max: Xms` |
| Missed PONGs | Count; sub-label: server PING count |
| Status | Connection status string |

**Detail Table Columns**: S.No. · Timestamp (UTC) · Timestamp (IST) · Interval (s) · Latency (ms) · PONG · Stall · Log Line

- **FR-267**: Table capped at **500 rows** to prevent browser hang. Analysis always uses 100% of data.
- **FR-268**: Truncated table prioritises anomalies: all stall and missed PONG rows always included. Remaining slots filled chronologically (first half + last half).
- **FR-269**: When truncated: blue info banner shows count shown vs total, confirms anomalies included, directs user to Excel export for full data.

### 14.10 Implementation Architecture

- **FR-263**: Two new functions: `analyzeWebSocketHealth(rawLines)` + `createWebSocketHealthSection(wsHealth)`.
- **FR-264**: One `appendChild` call at end of `displayResults()`.
- **FR-265**: PING/PONG collection **piggybacked onto `detectDowntimes()` loop** — three global arrays (`window._wsPingEvents`, `window._wsPongEvents`, `window._wsServerPings`) populated inside existing forEach. Zero additional processing overhead.
- **FR-266**: No existing function output or behaviour modified.

---

## Section 15 — Offline Replay Flag

> **Status**: ✅ Implemented — git commit: "Add Offline Replay Flag: Tx Type, Replay Delay columns, offline/online summary cards, Show filter — Start TX, Stop TX, Meter Values, Transaction Summary sections"

> **Scope**: Detects messages replayed from PouchDB offline cache by comparing log-line timestamp vs payload timestamp. Additive columns only — no existing function modified.

### 15.1 Overview

- **FR-270**: Detect **Offline Replay** messages across Start Transactions, Stop Transactions, Transaction Summary, and Meter Values.
- **FR-271**: Message is Offline Replay when `|log-line timestamp − payload timestamp| > OFFLINE_REPLAY_THRESHOLD_MS` (default: **1 hour = 3,600,000 ms**).
- **FR-272**: Threshold defined as constant `OFFLINE_REPLAY_THRESHOLD_MS` in `DOMContentLoaded` block.
- **FR-273**: No existing parser, section, or rendering pipeline modified.

### 15.2 Detection Logic

| Timestamp | Source | Meaning |
|---|---|---|
| Log-line timestamp (`msg.timestamp`) | Outer `[YYYY-MM-DDT...]` bracket in raw log | When message was transmitted to CSMS |
| Payload timestamp (`msg.message[3].timestamp`) | JSON payload field | When event was originally recorded on charger |

- **FR-274**: If `|logTimestamp − payloadTimestamp| > threshold` → `isOfflineReplay = true`.
- **FR-275**: Both timestamps stored: `recordedTimestamp` (payload) + `logTimestamp` (log-line).

*Root cause*: Charger queues messages in PouchDB (in-disk cache) during offline periods. On reconnect, cached messages are replayed with original payload timestamps, but the outer log-line timestamp reflects the replay time.

### 15.3 Timestamp Format

- **FR-276**: Full ISO 8601 in all Offline Replay cells: `YYYY-MM-DDTHH:MM:SS.sssZ` — allows direct copy-paste search in raw log.

### 15.4 Replay Delay Helper

- **FR-277**: `fmtReplayDelay(ms)` — formats millisecond duration into compact string showing only non-zero units: e.g. `3d 7h 37m 13s`.
- **FR-278**: Pure function, no DOM access, reused across all four affected sections.

### 15.5 Start Transactions Table

- **FR-279**: Three new columns after **Response Status**: **Tx Type** · **Replay Delay** · **Offline Replay**.
- **FR-280**: Tx Type: `📴 Offline` / `📡 Online`.
- **FR-281**: Replay Delay: `fmtReplayDelay(delta)` or `—`.
- **FR-282**: Offline Replay: `⚠ Replayed  ·  Rec: <ISO>  →  Sent: <ISO>` or `—`.

### 15.6 Stop Transactions Table

- **FR-283**: Same three columns after **Location**. Same cell formats.
- **FR-284**: Detection: `log-line timestamp` vs `msg.message[3].timestamp`.

### 15.7 Transaction Summary Table & Section

- **FR-285**: Two new summary cards after **Total Transactions**:
  - `📴 Offline Transactions` (slate)
  - `📡 Online Transactions` (teal)
- **FR-286**: Both cards update dynamically with `buildRows()`.
- **FR-287**: **Show:** dropdown two new options (positioned first):
  - `📴 Offline Transactions Only` (value: `offline`)
  - `📡 Online Transactions Only` (value: `online`)
- **FR-288**: All existing filter options unchanged.
- **FR-289**: Three new columns after **Stop Reason**: **Tx Type** · **Replay Delay** · **Offline Replay**.
- **FR-292**: Offline Replay cell: amber `⚠ Replayed` badge with `title` tooltip showing full ISO timestamps.
- **FR-293**: Each `<tr>` has `tr.dataset.isOfflineReplay` = `'true'` or `'false'`.

### 15.8 Meter Values Table

- **FR-294**: Three new columns after **Context**: **Tx Type** · **Replay Delay** · **Offline Replay**.
- **FR-295**: Per-row: `msg.timestamp` vs `mv.timestamp` using same threshold.

### 15.9 Implementation Architecture

- **FR-299**: `const OFFLINE_REPLAY_THRESHOLD_MS = 60 * 60 * 1000;`
- **FR-300**: `fmtReplayDelay(ms)` pure helper defined immediately after the constant.
- **FR-301**: `processTransactions()` transaction object includes: `isOfflineReplay`, `recordedTimestamp`, `logTimestamp`, `replayDelayMs`.
- **FR-306**: No existing function output or behaviour modified.

---

## Section 16 — Internal Transaction ID Mapping

> **Status**: 🔍 Verify — requirements added v2.4 (8 Apr 2026); within active dev window

> **Scope**: Maps charger-internal transaction ID to CMS transaction ID. Surfaces discrepancies (especially `transactionId=0` offline sessions). Fully additive — no existing function modified.

### 16.1 Objective

Map charger's **internal transaction ID** (`internalTransactionId`, generated by OCPP runtime state machine) to **CMS transaction ID** (assigned by CSMS in StartTransaction response). Surface this mapping in all transaction-related sections.

### 16.2 Log Patterns

**Primary source — `[OCPPRuntime]` stop line** (online sessions):
```
[OCPPRuntime] New State --> stop Transaction {"transactionId":80661,"internalTransactionId":"internal_transId_mddnvv",...}
```

**Backup source — `Stored transactionId` line** (fires immediately after StartTransaction response):
```
Stored transactionId 1773309544 for internalTransactionId internal_transId_i6bxy
```

**Offline session (critical discrepancy case)**: StopTransaction sent with `transactionId: 0` — CMS ID was never received.

### 16.3 Parsing Requirements

- **FR-307**: Parse `[OCPPRuntime] New State --> stop Transaction` lines — extract `transactionId` and `internalTransactionId` from JSON.
- **FR-308**: Parse `Stored transactionId X for internalTransactionId Y` lines as backup source.
- **FR-309**: Maintain global `internalTxMap` (`Map<string, string>`) keyed by CMS transactionId (as string). Reset on every new parse.
- **FR-310**: Detect `StopTransaction` OCPP messages where `transactionId === 0`.

### 16.4 Data Model

- **FR-311**: Transaction object includes `internalTransactionId`: `internalTxMap.get(String(txId)) || null`.
- **FR-312**: `perTransactionResults` in `runProtocolValidation()` includes `internalTransactionId`.

### 16.5 UI — Affected Sections (5 Locations)

- **FR-313**: **Start Transactions table** — **Internal TX ID** column after Transaction ID. Value: `internalTxMap.get(String(cmsTxId))` or `—`.
- **FR-314**: **Stop Transactions table** — **Internal TX ID** column after Transaction ID. If `transactionId === 0`: `⚠ txId=0 (No CMS ID)`.
- **FR-315**: **Transaction Summary table** — **Internal TX ID** column between Tx ID and Start Time (IST). Indigo monospace when found; `—` (muted) when not.
- **FR-316**: **Transaction & Meter Values — sub-section** — Internal TX ID banner below summary cards: `Internal TX ID: <value>` or `Internal TX ID: — (not found in log)`. Cleared when aggregate view selected.
- **FR-317**: **Protocol Compliance Report — Transaction Lifecycle** — 10th lifecycle check `CMS ↔ Internal TX ID`:
  - PASS: internal ID found + transactionId ≠ 0
  - WARN: internal ID not found in log
  - FAIL: `transactionId === 0` in StopTransaction

### 16.6 Discrepancy Detection

| Scenario | Detection | UI Indication |
|---|---|---|
| Online session, mapped | Both IDs in runtime stop JSON | PASS in compliance; indigo ID in all tables |
| Offline session — `transactionId: 0` | `stopMsg.message[3].transactionId === 0` | `⚠ txId=0 (No CMS ID)` in Stop TX; FAIL in compliance |
| No runtime line for a CMS txId | `internalTxMap.get()` returns null | `—` in all tables; WARN in compliance |

### 16.7 Implementation Architecture

- **FR-320**: Two new regex patterns inside `parseOcppLogsAsync()` line loop (additive only).
- **FR-321**: Fully additive: one new global Map, two regex patterns, one new field per TX object, one new lifecycle check, column additions to existing table renders.

---

## Section 17 — Future Enhancements (Planned)

> **Status**: ⏳ Not started

- **FER-001**: Machine learning-based anomaly detection and predictive analytics.
- **FER-002**: OCPP 2.0.1 support; additional message types (Authorize, Reservation, Firmware Management).
- **FER-003**: Advanced animations, customizable dashboards, advanced filtering.
- **FER-004**: Flexible Chart Plotting — user-selectable X/Y axes from all MeterValues measurands per transaction.
- **FER-005**: Multi-sheet Excel Export — single export covering all sections with CPID in filename.

---

## Section 18 — Additional Implemented Features (Documented v2.7)

> These features are live in the tool but were previously undocumented. Verified against source.

### 18.1 Debug Information Section

- **FR-341**: A collapsible **Debug Information** panel renders **first** in the results (before Boot Notifications), with 6 summary cards: BootNotifications · Heartbeats · Total Messages · Status Notifications · Events · Alerts. Plus: **Files Processed** (chips), **Transaction IDs**, **Event Types**, an **Alert Codes Summary** table (Code · Count · Description), and **Log Duration** (Start/End in UTC + IST, Total Duration).
- **FR-342**: Each Alert Code's Description is derived from the first non-`N/A` alert message carrying that code.

### 18.2 Events Section (`createEventsSection`)

- **FR-343**: Events are parsed from log lines matching `[ts] handling [OCPP] event {…}` where `type !== "alert"`. Rendered as a collapsible **"Events (N)"** section (max-height scroll, sticky header).
- **FR-344**: Columns: **S.No. · File Name · Time Stamp · Type · Charger ID · Outlet · Payload · Context Analysis**.
- **FR-345**: Two real-time text filters (**Type**, **Outlet**) — case-insensitive substring, debounced, with a live visible-row count. Per-row **Download Context** (`downloadEventContext`, 15 lines before/after) + **Export to Excel** (`Events.xlsx`).

### 18.3 Alerts Section (`createAlertsSection`)

- **FR-346**: Alerts are parsed from the same event regex where `type === "alert"`. Rendered as collapsible **"Alerts (N)"**.
- **FR-347**: Columns: **S.No. · File Name · Time Stamp · Charger ID · Outlet · Code · Message · Session · Context Analysis** (the `alert` object carries `code`, `message`, `session`).
- **FR-348**: Three real-time text filters (**Outlet**, **Code**, **Message**) with live count. Per-row **Download Context** (`downloadAlertContext`) + **Export to Excel** (`Alerts.xlsx`).

### 18.4 API Download Enhancements

- **FR-349**: **Folder save (File System Access API)** — `selectDownloadFolder()` opens `showDirectoryPicker({mode:'readwrite'})` (Chrome/Edge only, guarded by `isFileSystemAccessSupported`). Downloaded logs are written straight to the chosen folder via `saveFileToFolder()` (with a permission re-check), **falling back to a normal browser download** if no folder is set or permission is denied.
- **FR-350**: `clearSelectedFolder()` reverts to the browser-default download location.
- **FR-351**: **Streaming download with progress** — `downloadWithProgress(url, onProgress)` streams the response and `updateDownloadProgress()` shows received/total **bytes**, **percent**, and live **speed** (`formatBytes()` / `formatSpeed()`).
- **FR-352**: Endpoint `http://{IP}:3001/ocpp-client/logs/ocpp.log`; filename `{SiteName}_DD_Month_YYYY_HH:MM_AM/PM.log` (IST); modes Download-only / Download&Parse; last-5 download history (cross-ref Section A.1).

### 18.5 Log Repository — Bulk & Manual Sync

- **FR-353**: **Checkbox selection** per repository row (`getSelectedRepoIds`, `updateSelectedCount`) with a live selected-count.
- **FR-354**: **Manual Drive sync** — `syncLogToDrive(id)` uploads a single stored log; `syncAllToDrive(idList)` syncs the selected set, or all not-yet-on-Drive entries when nothing is selected. Complements the FR-181 auto-upload — lets users push logs that were saved while Drive was disconnected.
- **FR-355**: **Bulk delete** — `deleteSelectedRepoEntries()` deletes selected logs (prompting once whether to also remove the Drive copies); `deleteAllBrowserLogs()` clears all browser-stored logs while **leaving Drive copies intact** (frees IndexedDB storage).
- **FR-356**: Tag editor (`repoEditTags`) — modal with 7 preset chips (`Power Failure`, `CMS Issue`, `Phantom Connection`, `Zero Energy`, `Emergency Stop`, `EV Compatibility`, `Normal`) + free-text custom tag (cross-ref FR-194).
- **FR-357**: Duplicate-on-save prompt — **Overwrite** vs **Save as new version** (cross-ref FR-183).

---

## Section 19 — Architecture & Data Model (SSOT Core)

> Reference layer (no FRs) — the contracts a revamp must preserve. Extracted directly from the tool source.

### 19.1 Dependency Manifest (CDN)

| Library | URL | Used for |
|---|---|---|
| Tailwind CSS | `https://cdn.tailwindcss.com` | Styling (TR-004) |
| Chart.js | `https://cdn.jsdelivr.net/npm/chart.js` | All charts (TR-003) |
| SheetJS (xlsx) | `https://cdn.sheetjs.com/xlsx-latest/package/dist/xlsx.full.min.js` | Excel export |
| Google Identity Services | `https://accounts.google.com/gsi/client` | Drive OAuth token (Section 12) |
| Inter font | `https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700` | Typography |

> ⚠️ **Correction to Section 12**: the master previously listed `https://apis.google.com/js/api.js` as a Drive dependency. The tool does **not** load it — Drive uses the **GIS token client + raw `fetch` to the Drive REST API**. Only the two scripts (GIS + the Tailwind/Chart/xlsx set) are present.

### 19.2 Parsing Contract (`parseOcppLogsAsync`)

| Pattern | Regex / marker |
|---|---|
| OCPP message | `/(?:>>\|<<) message (?:sent\|received): ((\[\|{).*(\]\|}))/` |
| Event / Alert | `/\[([^\]]+)\] handling \[OCPP\] event ({.*})/` (alert when `type === "alert"`) |
| Internal TX — primary | `/\[OCPPRuntime\] New State --> stop Transaction ({.*})/` |
| Internal TX — backup | `/Stored transactionId (\d+) for internalTransactionId (internal_transId_\w+)/` |
| Timestamp | `/\[([^\]]+)\]/` |
| Direction | `>> message sent:` vs `<< message received:` |
| WebSocket | `>> PING`, `<< PONG`, `<< PING` (downtime anchoring uses `>> PING at` / `<< PONG at`) |

- JSON parsed via `parseJsonSafely()` (unescapes `\"` then `JSON.parse`).
- **Chunked parsing**: 1000 lines/chunk with a 10 ms yield between chunks — the mechanism that prevents stack overflow / UI freeze on large files (validated to 46 MB / 226k lines).

### 19.3 Core Data Structures

- **message**: `{ timestamp, direction:'sent'|'received', message:[msgType,msgId,action,payload], lineNumber, fileName, responsePayload? }` — `responsePayload` attached by `correlateMessages()` via `msgId`.
- **event**: `{ timestamp, type, chargerId, outlet, payload, lineNumber, fileName }`
- **alert**: `{ timestamp, chargerId, outlet, code, message, session, lineNumber, fileName }`
- **messageGroups** (`groupMessagesByType`): `{ BootNotification, Heartbeat, StatusNotification, StartTransaction, StopTransaction, MeterValues, Other }` keyed by `message[2]`.
- **internalTxMap**: `Map<cmsTxId:string, internalTransactionId>` — reset every parse.
- **tx** (`processTransactions`) — canonical transaction object:

| Field | Source | Notes |
|---|---|---|
| `id` | StartTx **`responsePayload`**.transactionId | CMS id (per Fix #1) |
| `startTime` / `stopTime` | log-line timestamps | |
| `meterStart` / `meterStop` | payload | Wh |
| `connectorId`, `idTag` | StartTx payload | |
| `meterValues[]` | grouped MeterValues messages | |
| `isOfflineReplay`, `recordedTimestamp`, `logTimestamp`, `replayDelayMs` | log vs payload Δ vs `OFFLINE_REPLAY_THRESHOLD_MS` | Section 15 |
| `internalTransactionId` | `internalTxMap.get(String(id))` | Section 16 |
| `socBegin`, `socEnd`, `location` | StopTx `transactionData` | |
| `duration` | (stop − start) min | |
| `totalEnergy` | (meterStop − meterStart)/1000 | kWh |
| `avgPower`, `peakPower` | `Power.Active.Import` (W→kW) | kW |
| `maxTempInlet/Outlet/Body` | `Temperature` by location (MV + transactionData) | null if none |
| `currentPairCount`, `avgCurrentOutlet`, `avgCurrentEV` | `Current.Import` Outlet-vs-EV pairs per MV message | Section 10.4 |
| `startStopDiff` | per-connector: prev.meterStop − this.meterStart | null for first tx; Section 10.3 |
| `status` | `'Aborted'` if `stopReason ∈ {EmergencyStop, HardReset, SoftReset, UnlockCommand, PowerLoss, Reboot}`, else `'Completed'` | abort classification |

### 19.4 Render Order (`displayResults` → `parsedDataContainer`)

`1` Debug Info → `2` Boot Notifications → `3` Heartbeats → `4` Status Notifications → `5` Start Transactions → `6` Stop Transactions → `7` Transaction Summary → `8` Connector Stats → `9` Transaction & Meter Values → `10` Events → `11` Alerts → `12` Downtime Report → `13` Power Restore Missing Sync → `14` Emergency Stop Release → `15` Fault Status Summary → `16` Incomplete Transactions → `17` Energy Dispense Check → `18` Protocol Compliance → `19` WebSocket Health.
*(Session Timeline is a per-row modal, not in this sequence.)*

### 19.5 Config Constants

| Constant | Value | Location |
|---|---|---|
| `OFFLINE_REPLAY_THRESHOLD_MS` | `3600000` (1 h) | HTML 234 |
| `TEMP_THRESHOLDS` | `{ Inlet:60, Body:60, Outlet:65 }` °C | HTML 3684 |
| zero-energy threshold | `localStorage['zeroEnergyThresholdWh']` default `500` | HTML 3681 |
| `GOOGLE_DRIVE_CLIENT_ID` | OAuth client id | HTML 230 |
| theme | `localStorage['theme']` | HTML 282 |
| Drive auth | `localStorage['lr_drive_token' / '…_expiry' / 'lr_drive_folder_id']` | HTML 6790 |

### 19.6 Revamp Constraints (per Operating Principles)

- 🔴 **Hard-constraint violation**: the tool is **9,813 lines in one file** vs the **2,000-line maximum**. The revamp must decompose it (no single source file may exceed 2000 lines).
- 🔴 **No tests exist** — `tests/` must be created (parser fixtures + detector unit tests). Principle: *tests are the cheapest lake to boil; don't defer them.*
- Suggested module boundaries follow the function clusters: **parse** (`parseOcppLogsAsync`, `correlateMessages`, `groupMessagesByType`, `processTransactions`) · **detect** (downtime engine + 4 types, phantom, missing-boot/status, incomplete) · **health** (transaction health 10.x, connector stats, energy dispense) · **protocol** (`runProtocolValidation`) · **ws** (`analyzeWebSocketHealth`) · **repository** (IndexedDB + Drive) · **timeline** · **render/sections** · **export** · **api-download** · **ui-shell/theme/help** · **schemas/validation** (new — see 19.7).

---

### 19.7 Protocol Schemas (OCPP 1.6J)

> The official OCPP 1.6J JSON Schemas are a **critical protocol asset** — per Operating Principle 11 (*Standards Before Customization*), they are the authoritative reference for every OCPP message structure, field, and enum the tool depends on.

#### Contents & canonical source

- **56 individual `.json` files = 28 operations × {Request, Response}** (draft-04, `urn:OCPP:1.6:2019:12:…`). Naming: `{Action}.json` = Request, `{Action}Response.json` = Response. **These individual files are the canonical *reference* set.**
- The compiled `master OCPP 1.6 json schema.txt` was **removed on 6 Jun 2026** as redundant — it was a human-readable concatenation only (and contained a duplicate `UnlockConnectorResponse`). The folder now holds exactly the 56 canonical `.json` files.
- The tool first-classes only **6 of 28** message types today (Boot, Heartbeat, Status, Start, Stop, MeterValues); the remaining 22 schemas back the planned message types.

> **Runtime source vs reference (revised 6 Jun 2026):** the planned **OCPP Validation Engine** adopts the `typed-ocpp` library, whose **bundled official OCA schemas become the canonical *runtime* validation source**. The 56 local `.json` then serve as the canonical **reference + CI diff-check** set (drift detection against typed-ocpp). See `OCPP Validator/TYPEVALIDATION.MD` (esp. §3, §6). This avoids two runtime sources of truth.

#### Decided placement (6 Jun 2026) — `src/schemas/ocpp-1.6/`

The 56 `.json` files will live **code-adjacent** at `src/schemas/ocpp-1.6/` as the reference/diff-check set. *Physical move happens during the standard-tree stand-up (deferred); this records the target.*

```
src/
└── schemas/
    └── ocpp-1.6/
        ├── Authorize.json … (56 canonical files)
        └── README.md            ← provenance: official OCPP 1.6J, "do not edit"
```

#### Adopted uses

| # | Use | Ties to |
|---|---|---|
| 1 | **Runtime message validation** (revamp) — a validator module validates each parsed payload against its schema and flags malformed / non-compliant messages | Strengthens fault-analysis paths — the RCAs (L-002 Missing Stop, TN0010) showed corrupted/contradictory payloads that schema validation would surface |
| 2 | **Build-spec for planned message types** — Authorize, Reservation, Firmware Management, Smart Charging, and the Repeated RemoteStart panel | Section 8 (FR-055–058), Section E |
| 3 | **Test fixtures** — valid/invalid example messages derived from each schema | `tests/fixtures/` (Principle: tests are the cheapest lake) |
| — | *(implicit)* **Enum source of truth** — `errorCode`, `status`, StopTransaction `reason`, MeterValues `measurand`/`location`/`context`, `idTagInfo.status` | Sections 7.5, 9.2, 19.3 |

#### Validation-candidate observations (for the revamp)

- The tool's `abortedReasons` uses **6 of the 11** StopTransaction `reason` enum values (`EmergencyStop, HardReset, SoftReset, UnlockCommand, PowerLoss, Reboot`); `EVDisconnected, Local, Other, Remote, DeAuthorized` are treated as `Completed`. With the schema as the referenced standard this classification becomes traceable and reviewable.
- The downtime signatures in 9.2 (e.g. `errorCode:"UnderVoltage"`, vErr codes) are values from the StatusNotification `errorCode` enum — the schema is their authority.

---

## Revision History

| Version | Date | Changes |
|---|---|---|
| 1.0 | 12 Mar 2026 | Initial requirements — core parser, transactions, meter values |
| 1.1–1.4 | 12–13 Mar 2026 | Transaction health checks (FR-092–139), Downtime analysis (FR-070–091) |
| 1.5 | 13 Mar 2026 | Protocol Compliance Report (FR-140–171, Section 11) |
| 1.6 | 14 Mar 2026 | Log Repository (FR-172–206, Section 12); SR-002 amended; SR-005 added |
| 1.7 | 15 Mar 2026 | Section 1.4 (Live Deployment) and Section 1.5 (Deploy Workflow); Google OAuth setup details |
| 1.8 | 15 Mar 2026 | Session Timeline & Telemetry (FR-207–234, Section 13) — 4-tab per-transaction modal |
| 1.9 | 15 Mar 2026 | FR-215 expanded: 11-marker lifecycle; FR-222a: swimlane X-axis extended ±10 min |
| 2.0 | 16 Mar 2026 | WebSocket Connection Health (FR-235–266, Section 14) |
| 2.1 | 17 Mar 2026 | Section 14 refinements: FR-255/256 superseded; FR-267–269 added (500-row cap); FR-265 updated (zero-cost piggyback) |
| 2.2 | 18 Mar 2026 | Offline Replay Flag (FR-270–306 initial, Section 15) |
| 2.3 | 18 Mar 2026 | Section 15 expanded: full ISO timestamps; `fmtReplayDelay()`; Tx Type / Replay Delay columns; Offline/Online cards and filter |
| 2.4 | 8 Apr 2026 | Internal Transaction ID Mapping (FR-307–321, Section 16) |
| 2.5 | 8 Apr 2026 | Status Notifications enhanced (FR-322–328): 8-field capture, dedicated section, 6 dropdown filters, Summary Panel, Session Flow Analysis, colour-coding |
| 2.6 | 14 Apr 2026 | Session Flow dropdown filter (FR-329): 4 flow options, paired-row tagging and display, AND-combined with column filters |
| 2.7 | 6 Jun 2026 | **SSOT reconciliation against tool source (v2026.05.14).** Section 9 rewritten — Downtime engine + 4 fault types incl. previously-undocumented **Connection Lost** and **Input Under Voltage** (FR-330–340). **Section 18** added — Debug Information, Events & Alerts, API folder-save + download progress, repository bulk/manual-sync (FR-341–357). **Section 19** added — Architecture & Data Model SSOT core (parsing contract, `tx` model, render order, dependency manifest, revamp constraints). Section 16 status → ✅. Dependency correction (`apis.google.com/js/api.js` not used). Diagnostic KB L-002/L-003 added earlier this session. No change to the tool HTML. |
| 2.7.1 | 6 Jun 2026 | **Protocol Schemas decision** (Section 19.7): 56 canonical OCPP 1.6J `.json` schemas → target `src/schemas/ocpp-1.6/` (code-adjacent, imported by a validator module). Three adopted uses recorded — runtime validation, build-spec for planned message types (Section 8), test fixtures. Compiled `master OCPP 1.6 json schema.txt` **removed as redundant** (concatenation only, had a duplicate). Files not moved (deferred to tree stand-up). |
| 2.7.2 | 6 Jun 2026 | **OCPP Validation Engine spec** written (`OCPP Validator/TYPEVALIDATION.MD`, v0.1): type-aware validation (L1 frame + L2 schema + L3 request↔response matching) adopting the **`typed-ocpp`** library (MIT; isomorphic TS). File-parsing excluded; L4 protocol/state = deferred extension point. §19.7 revised — `typed-ocpp` bundled schemas = canonical *runtime* source, 56 local `.json` = reference/diff-check; Terminology note aligned. **SAP `e-mobility-charging-stations-simulator`** recorded as the Charger-Emulator candidate (suite vision). |

---

---

## Section A — Pre-Formal Requirements Features (Built Oct 2025)

> These features were built before the formal requirements document (v1.0 = 12 Mar 2026). They are fully implemented and active in the tool but do not have FR numbers assigned. Documented here for completeness.

### A.1 API Download from EVSE

Directly fetch the OCPP log from a live charger over the network — no manual file copy needed.

- **Endpoint**: `http://{IP}:3001/ocpp-client/logs/ocpp.log`
- **Input fields**: IP Address + Site Name
- **Modes**: "Download Only" (saves file to browser) or "Download & Parse" (downloads and immediately parses)
- **Filename generated**: `{SiteName}_DD_Month_YYYY_HH:MM_AM/PM.log` (IST timestamp)
- **Download History**: Tracks last 5 downloads with IP and filename
- **Error handling**: CORS issues, network errors, empty file, HTTP errors — all surfaced with clear messages
- **CORS requirement**: EVSE device must have CORS enabled on port 3001

### A.2 Multiple File Upload

Upload and parse multiple log files simultaneously; results merged into a single unified view.

- Multiple files selected via `multiple` attribute on file input
- Sequential processing to prevent browser crashes (not parallel)
- Each file tagged with its source filename (`fileName` property)
- **File Name column** added to every data table — shows source file per row
- Global accumulation arrays: `allMessages`, `allEvents`, `allAlerts`
- `renderCombinedResults()` merges all data into one unified output
- Failed files are skipped without stopping the remaining batch

### A.3 Boot Notification Context Analysis

For each BootNotification event, extract surrounding log context for investigation.

- **15 lines before** each BootNotification extracted
- **15 lines after** each BootNotification extracted
- "Download Context" button per BootNotification row — saves `BootNotification_Context_[timestamp].txt`
- "Preview" button — shows context in a modal without downloading
- Same context analysis extended to **Events section** (`Event_Context_[timestamp].txt`) and **Alerts section** (`Alert_Context_[timestamp].txt`)

### A.4 ZUC Sessions (Zero/Under-Charged) Dropdown

A shortcut filter to view only sessions where total energy < 1 kWh — quick identification of failed sessions.

- "ZUC Sessions" option in the "Select Transaction" dropdown in Transaction & Meter Values
- "ZUC Session: X" count shown in "All Transactions" summary
- Shows summary, graphs, and meter values for ZUC sessions as a group

*Note*: ZUC threshold is 1 kWh here (display only). The configurable Zero Energy flag in Section 10.1 uses a separate threshold (default 500 Wh) in the Transaction Summary table.

### A.5 Refresh Button

- Reload button next to theme toggle in the top header
- Triggers `window.location.reload()` — full tool reset
- Theme preference preserved (`localStorage` persists through reload)
- Faster than manual Ctrl+R / F5 for clearing parsed state between uploads

### A.6 Scrollable Tables with Sticky Headers

All data tables (Boot Notifications, Heartbeats, Status Notifications, Start Transactions, Stop Transactions, Events, Alerts) use:

- Fixed height container (`max-h-96` = 384px)
- `overflow-y-auto` for vertical scrolling
- `sticky top-0 z-10` on header row — header stays visible while scrolling

### A.7 Transaction Graphs (6 Charts per Transaction)

In Transaction & Meter Values, each selected transaction shows 6 interactive Chart.js graphs:

| Graph | X-axis | Y-axis |
|---|---|---|
| Current Profile | Time | Target Current (Outlet) + Present Current (EV) |
| Voltage Profile | Time | Target Voltage (Outlet) + Present Voltage (EV) |
| Power vs SoC Curve | SoC % | Power (W) |
| SoC Over Time Curve | Time | SoC % |
| Temperature Analysis Curve | Time | Inlet + Outlet + Body + Outlet#2 (°C) |
| Power, Current & Voltage Over Time | Time | Power (W) + Current (A, right axis) + Voltage (V) |

Features: Download as JPEG · Enlarge to fullscreen · Transaction ID badge · Hover tooltips · Dual Y-axes on graph 6.

### A.8 Transaction Statistics Panel

Collapsible detailed statistics per transaction (inside Transaction & Meter Values):

- Max/Min for: Current Outlet/EV · Voltage Outlet/EV · Temperature Body/Inlet/Outlet/Outlet#2 · Power Factor · Power Outlet
- Start SoC % and End SoC %

---

## Section B — Key Implementation Decisions & Deviations

| Decision | Date | Details |
|---|---|---|
| **FR-112–115 Concurrent Session Overlap — Permanently Skipped** | 14 Mar 2026 | Ador Digatron QUENCH chargers have CCS + CHAdeMO connectors and may run both simultaneously. The FR's assumption that DC chargers support only one session at a time is incorrect for this hardware. |
| **FR-135–138 Power Delivery Mismatch — Formula Under Review** | 14 Mar 2026 | `Power.Active.Import / min(EV Demand, Power.Offered)` formula needs validation before implementation. Disabled placeholder added to dropdown only. |
| **Section 14 WebSocket Health — Piggybacked on detectDowntimes()** | 16 Mar 2026 | To avoid a second O(n) scan of 226k-line logs, PING/PONG collection is done inside the existing `detectDowntimes()` loop via `window._wsPingEvents`, `window._wsPongEvents`, `window._wsServerPings` globals. |
| **Section 14 Server-PING table rows removed (FR-255/256 superseded)** | 17 Mar 2026 | Server `<< PING` rows removed from the detail table. Client responds automatically — no latency/interval data available. Count retained in summary card only. |
| **Section 14 Table row cap at 500 (FR-267–269)** | 16 Mar 2026 | Logs with 5s ping interval over many hours produce 8k–17k rows. All analysis uses 100% data; only DOM render is capped. Anomaly rows (stalls + missed PONGs) always included first. |
| **View Chart — requestAnimationFrame required** | 13 Mar 2026 | Chart.js must be initialised after browser layout completes. Canvas needs `style="height:400px;"`. `renderTransactionChart()` must be wrapped in `requestAnimationFrame()`. |

---

## Section C — Diagnostic Knowledge Base

> Field-learning repository. Each entry is a reusable diagnostic pattern from real OCPP 1.6 charger log analysis. Add new entries as L-00X when a new root cause is confirmed.

| ID | Pattern | Category | Severity | Tool Flag |
|---|---|---|---|---|
| L-001 | Phantom Connection (BootNotification silence, PING/PONG alive) | CMS / Connectivity | 🔴 Critical | `PHANTOM_CONNECTION` |
| L-002 | Missing Stop Transaction (4 root causes) | Firmware / Replay / Crash | 🔴 Critical | `MISSING_STOP` |
| L-003 | Stuck in Preparing (RemoteStart Accepted, no charging) | Firmware / V2G / Backend | 🟠 High | `STUCK_PREPARING` |

### L-001: Phantom Connection

**Pattern Name**: Phantom Connection — BootNotification Silence with Active PING/PONG
**Category**: CMS / Connectivity
**Severity**: 🔴 Critical
**Tool Detection Flag**: `PHANTOM_CONNECTION` (checked in BOOT-004 Protocol Compliance)
**Discovered**: 2026-03-13
**Reference Case**: TX 33187, Charger MH0078, Connector 1 (CCS)

#### What It Is

WebSocket **transport layer alive** (PING/PONG frames exchanged normally) but **OCPP application layer dead** — CMS silently accepts the WebSocket connection but never responds to any OCPP JSON messages (BootNotification, Heartbeat, etc.).

The charger identifies itself as offline and queues all transaction data to its in-disk (PouchDB) store. From the outside the charger appears "connected" because PING/PONG is healthy — but it is functionally offline.

```
┌─────────────────────────────────────────┐
│  OCPP Application Layer (JSON messages) │  ← DEAD (CMS not processing)
├─────────────────────────────────────────┤
│  WebSocket Frame Layer (PING/PONG)      │  ← ALIVE
├─────────────────────────────────────────┤
│  TCP/TLS Transport                      │  ← ALIVE
└─────────────────────────────────────────┘
```

#### How to Identify in Logs

| # | Look For | Meaning |
|---|---|---|
| 1 | `>> PING` / `<< PONG` continuously present | Transport alive |
| 2 | `>> message sent: [2,"<msgId>","BootNotification",...]` | BootNotif sent |
| 3 | **No** `<< message received: [3,"<msgId>",...]` for that msgId | **BootNotif unanswered ← RED FLAG** |
| 4 | No Heartbeat `[3,...]` responses anywhere in window | App layer fully silent |
| 5 | `in-disk Queue: [2,...,"StartTransaction",...]` (blue log line) | Charger queuing offline |
| 6 | Burst of MeterValues all arriving at CMS at the same timestamp | Queued data flushed at once on recovery |
| 7 | 2+ BootNotifications sent with zero responses | Prolonged CMS app outage |

```
[03:48:15Z] >> message sent: [2,"b449028f...","BootNotification",{...}]
[03:48:18Z] >> PING                   ← Transport OK
[03:48:18Z] << PONG                   ← Transport OK
[03:48:23Z] >> PING                   ← Transport OK
              ↑ No [3,"b449028f...",...] ever appears ← APP LAYER DEAD
```

#### Phantom vs True Offline

| | True Offline | Phantom Connection |
|---|---|---|
| PING/PONG | Absent | Present and healthy |
| BootNotif response | Not sent (no WS) | Sent, no response |
| Root cause | Network / charger side | CMS application layer |
| Escalate to | Network team / on-site | CMS vendor / backend |

#### Why It Happens

PING/PONG operates at RFC 6455 frame level — handled by the reverse proxy / load balancer. OCPP JSON travels inside WebSocket payloads and is processed by the backend OCPP handler. Two separate layers.

**Common CMS-side causes**: OCPP backend process crashed · message queue backpressure · session invalidated without closing WS · rate limiting · load balancer health check passes but backend is unhealthy.

#### Cascade of Anomalies (After Phantom Connection)

1. Pending StopTransaction retries exhaust — CMS session stays open indefinitely
2. Next user's StartTransaction queued — not sent live to CMS
3. Delayed delivery — StartTransaction arrives minutes late; all MeterValues in one burst
4. CMS returns "Invalid" idTag — sees prior session still open on connector
5. `StopTransactionOnInvalidId` triggers — charger forcibly disconnects EV mid-charge
6. Data gap at CMS — both Start and Stop return Invalid; no record

#### Reference Case — TX 33187, MH0078, 2026-03-13

| Time (IST) | Event |
|---|---|
| 08:02:55 | Previous session started (SoC 11%) |
| 09:12:29 | Emergency Stop — ERR_EMERG_SHUTDOWN_IOMAPPER |
| 09:18:15 | **BootNotification #1 — NO RESPONSE** ← Phantom begins |
| 09:18 – 10:06 | BootNotifications #2–#9 — ALL NO RESPONSE |
| 11:05:06 | First OCPP response received (Authorize.conf) — CMS recovered |
| **Phantom Duration** | **~107 minutes** |
| 11:05:28 | New user starts charging — StartTransaction queued 5m 31s late |
| 11:11:00 | CMS responds: `status:"Invalid"` — session abandoned |

#### Tool Detection Algorithm

```
FOR each BootNotification sent [2, msgId, "BootNotification", ...]:
    Look for [3, msgId, ...] in subsequent log lines
    IF not found:
        Check if PING/PONG lines exist in same time window
        IF PING/PONG present → FLAG: PHANTOM_CONNECTION
```

#### Action for Support Team

1. **Do not blame the charger** — it behaved correctly per OCPP spec.
2. **Escalate to CMS team** — CMS application layer was unresponsive.
3. **Manually close open sessions** — cross-reference the session active when phantom started; it shows as open in CMS.
4. **Pull CMS server logs** for the phantom window — look for crashes, restarts, OOM, queue saturation.
5. **Recommend CMS fix** — server should actively close WebSocket if it cannot respond to BootNotification within 30 seconds.

---

### L-002: Missing Stop Transaction

**Pattern Name:** Missing Stop Transaction — StartTransaction with no matching StopTransaction at CSMS
**Category:** Firmware / Offline Replay / Crash Recovery
**Severity:** 🔴 Critical (billing + permanently-open sessions)
**Tool Detection Flag:** `MISSING_STOP` (relates to Section 10.7 Incomplete Transactions + Section 16 txId=0)
**Discovered:** 2026-03-19
**Reference Cases:** MH0127 (txId 59270) · EC charger (4 txIds) · TN0010 (txId 11502, 90121 — DRAFT)

#### What It Is

The charger sends a `StartTransaction` that CSMS records, but the matching `StopTransaction` is never received — leaving the session **permanently open** at CSMS. Energy/billing data is then either missing or reconstructed incorrectly by CSMS (AutoStop estimates). Four distinct root-cause mechanisms have been confirmed.

#### Root Cause A — Offline Replay Pairing Bug (`StopTransactionMessageIndex = -1`)

A session runs fully offline → `StartTransaction` cached in PouchDB as `internal_transId_xxx` with no CSMS `transactionId`. When the user stops, the `StopTransaction` is force-queued with **`transactionId: 0`** and stored as a standalone message with **no link to the internal ID**. On replay, the pairing lookup returns `StopTransactionMessageIndex = -1` → the firmware's `CASE 1: sending StopTransaction` path never fires → no stop is ever sent.

```
StartInternalTransactionId --> internal_transId_968p5
StopTransactionMessageIndex --> -1          ← no paired stop found
>> message sent: StartTransaction {...}     ← CASE 1 line absent = no stop sent
```
Reference: MH0127 txId 59270 — 27.5 kWh delivered, CSMS AutoStop estimated 34,570 Wh (actual 27,531 Wh).

#### Root Cause B — Crash During Session (RTC reset to 2009)

Charger crashes mid-session; the stop was never persisted to PouchDB, so nothing replays on reboot. The crash boundary is always an RTC reset to `2009-09-01`. Three sub-patterns:
- **B-A:** crash mid-charging (last evidence = a periodic MeterValues, then the crash line)
- **B-B:** crash after `Transaction.End` MeterValues + `StatusNotification: Finishing` but **before** StopTransaction sent (sending Transaction.End does **not** mean the stop was sent — separate firmware steps)
- **B-C:** crash seconds after session start
Often preceded by `[ERROR] StopTransactionSavingHandler: docId "stop_tx_N" deleted` at session start.

#### Root Cause C — Silent RemoteStop Failure (deleted `stop_tx_N` document)

Charger is online and **Accepts** a `RemoteStopTransaction`, issues `POST /outlets/N/stop`, but the PouchDB stop document (`stop_tx_N`) was previously deleted → firmware silently fails to write stop data → **no StopTransaction dispatched despite the Accepted response**. Chronic: in TN0010, `stop_tx_1` was deleted on 06 March and stayed deleted for 13 consecutive sessions over 2+ days. CSMS sees Accepted but the session stays open.

#### Root Cause D — SIGTERM-Induced txId Split During Replay (DRAFT)

A graceful `SIGTERM` (exit code 0, no RTC reset) interrupts replay before `CASE 1` dispatches the stop → on restart the same cached StartTransaction is re-replayed → CSMS assigns a **new** txId → firmware resends the **same PouchDB MeterValues** (identical message ID) under the new txId → `CASE 2` sends a stop under the new txId but carries **transactionData from a different earlier session**. Result: original txId permanently open + the new txId contains corrupted/mixed data (contradictory meterStop, SoC, idTag, timestamp). Reference: TN0010 txId 11502 → 43970.

#### How to Confirm a Stop is Genuinely Missing

| Step | Check | Interpretation |
|---|---|---|
| 1 | Search `>> message sent: StopTransaction` for the specific txId | Absent anywhere in the log → stop never sent |
| 2 | Find the last log line referencing that txId | Reveals session state at crash/stop |
| 3 | Check the line immediately after | RTC jump to `2009-09-01` = crash boundary |
| 4 | For replay sessions, check `StopTransactionMessageIndex` | `-1` = no paired stop in PouchDB |
| 5 | Check `CASE 1: sending StopTransaction` presence | Absent after a replay StartTransaction = definitive proof |

> ⚠️ **`StopTransactionMessageIndex = -1` alone is NOT enough.** In the EC log, 10 sessions had `-1` but only 4 were genuine missing stops (the other 6 sent stops live after replay). Always confirm against an actual `>> message sent: StopTransaction` for that txId across the whole log.

#### Action for Support Team

1. **Manually close the open session in CSMS** using the parser's session data (txId, connector, idTag, meterStart, meterStop, SoC, times).
2. **Do not trust CSMS AutoStop energy** — it is an estimate from replayed MeterValues and is usually wrong; use `meterStop − meterStart`.
3. **Flag chargers with chronic `stop_tx_N deleted` errors** for firmware investigation (PouchDB corruption).
4. **Billing verification** required for Root Cause D cases (mixed-session data).

---

### L-003: Stuck in Preparing (Preparing → not Charging)

**Pattern Name:** Connector Stuck in Preparing — RemoteStart Accepted but charging never starts
**Category:** Firmware (OCPP↔SECC) / V2G / Backend
**Severity:** 🟠 High (connector blocked, repeated RemoteStarts)
**Tool Detection Flag:** `STUCK_PREPARING` (relates to Section 7.5 Session Flow Analysis + Section E Repeated RemoteStart Panel)
**Discovered:** 2026-03-28 (KA0547), 2026-04-13 (GJ0085)
**Reference Cases:** KA0547 (idTag 4919, stuck 2h31m) · GJ0085 (session d79cbbe5)

#### What It Is

A connector moves to `Preparing` on EV plug-in but never progresses to `Charging`, and never returns to `Available` — staying blocked (up to **2.5 hours**) until the EV is physically unplugged or the OCPP client is restarted (SIGTERM). The OCPP-visible symptom is a `Preparing → Finishing/Available` session with **no StartTransaction**, often accompanied by repeated `RemoteStartTransaction` attempts — the exact trigger for the **Repeated RemoteStart Panel (Section E)**.

#### Variant A — EV aborts V2G before ContractAuthentication (KA0547)

V2G init progresses normally through `DINServicePaymentSelectionRes OK`, then the EV **never sends `DINContractAuthenticationReq`** (mandatory next DIN 70121 step). After a ~5.3 s gap (no matching ISO 15118-2 timer), the **EV itself sends `DINSessionStopReq`**. No energy transferred. Root cause is EV-side, but it exposes firmware/backend issues below.

#### Variant B — SECC stuck at `Ongoing_WaitingForCustomerInteraction` (GJ0085)

RemoteStart is Accepted and the SECC sets `auth:true` internally, but the SECC keeps answering the EV's `AuthorizationReq` with `EVSEProcessing=Ongoing_WaitingForCustomerInteraction` and **never transitions to `Finished`**. The EV never receives auth confirmation, cannot proceed, and eventually disconnects (here ending in an IOmapper Emergency Shutdown, Code 72). Expected behaviour: after `auth:true`, SECC must answer `EVSEProcessing=Finished`.

#### OCPP-Layer Findings (relevant to the parser — these are firmware issues, not EV)

| ID | Finding | Why it matters to the tool |
|---|---|---|
| D-4 / H-6 | OCPP client returns `status=Accepted` for `RemoteStartTransaction` and completes `Authorize` with CSMS **regardless of outlet state**, then internally blocks: `Cannot auth. Outlet N already authorized for user="X"`. | CSMS sees Accepted + Authorized but the outlet never starts — a **false positive**. This is the core signal the Repeated RemoteStart Panel surfaces (the `OpenAPIControl` / `Cannot auth` columns in Section E). |
| D-5 / H-5 | `session_stop` with `energy=0` and no prior `StartTransaction` does **not** trigger `StatusNotification: Available`. | Connector stays in Preparing; only `ev_disconnect` (physical unplug) restores Available. Explains long stuck durations. |
| D-7 / H-7 | Same stuck pattern recurs on the same unit; cleared only by OCPP client restart (SIGTERM). | Pattern detection across a log, not a one-off. |
| D-8 / H-8 | Backend sends repeated `RemoteStartTransaction` (e.g. 5× over 2.5 h) with no cooldown after Authorize=Accepted. | Directly drives the Repeated RemoteStart Panel counts (N RemoteStart / blocked). |

#### How to Identify in Logs

| # | Look for | Meaning |
|---|---|---|
| 1 | `StatusNotification: Preparing` with no later `Charging` or `StartTransaction` on that connector | Stuck candidate |
| 2 | Multiple `<< RemoteStartTransaction` → `>> {status:"Accepted"}` for the same connector | Backend retrying into a stuck outlet |
| 3 | `Cannot auth. Outlet N is already authorized for user="X"` | Internal block after a false-Accepted RemoteStart |
| 4 | Recovery only at `ev_disconnect` or SIGTERM restart, not at `session_stop` | Confirms the D-5 firmware gap |
| 5 | `Preparing → Finishing` with `energy=0, duration=0` | The session-flow outcome the parser already classifies (FR-329) |

#### Action for Support Team

1. **Distinguish EV-side vs firmware-side**: if V2G shows the EV aborting (Variant A) the EV OEM is involved; if SECC is stuck at `Ongoing` (Variant B) it is firmware.
2. **Firmware tickets**: (a) `RemoteStartTransaction` should return `Rejected` when the outlet is already authorized for another user; (b) `session_stop (energy=0)` should restore `Available` without requiring physical unplug.
3. **Backend**: add a cooldown / retry limit on `RemoteStartTransaction` after repeated non-starts.

---

## Section D — Field Incident Context

### D.1 RCA Summary — TS0064 Emergency Stop (13 Mar 2026)

**Charger**: TS0064 (QUENCH CLASSIC, firmware release-1.2.57)
**Incident**: Emergency stop at 05:01:20 UTC. OCPP layer **never cleared Faulted state** for 1 hour 57 minutes while charger physically delivered 3,603 Wh across 2 sessions.

**Root Cause**: OCPP state machine and SECC (hardware charging stack) are decoupled. Once `Faulted` is set, it is never auto-cleared — even when SECC resumes normal operation. The OCPP client sends `StartTransaction` without checking or updating connector state first.

**Key Discrepancies**:

| # | Type | Summary |
|---|---|---|
| D1 | Critical | Charging sessions (txId 51613, 87948) started while connector in Faulted state from CSMS perspective |
| D2 | Critical | TriggerMessage responses consistently returned `Faulted/EmergencyPressed` even while actively charging |
| D3 | Critical | No StatusNotification `Available` sent for 1h57m — only reboot restored correct status |
| D4 | Major | CSMS sent RemoteStopTransaction for already-stopped txId 51613 (39s after stop) — caused by missing StopTransaction acknowledgement notification |
| D5 | Major | No `Preparing` StatusNotification on any EV connect event throughout the log |
| D6 | Major | No `Charging` or `Finishing` StatusNotification for any of the 2 transactions |
| D7 | Minor | BootNotification sent with RTC timestamp `2009-09-01` (RTC battery lost; synced from CSMS response) |

**Corrective Actions Required (Firmware)**:
1. **P0**: Fault-clearance detection — when `ev_connect` or `session_start` received from SECC while connector is `Faulted`, auto-send `StatusNotification(Available)` → `Preparing`
2. **P0**: Block `StartTransaction` if connector state is `Faulted` — force state transition first
3. **P1**: Bind `ev_connect` event → `StatusNotification(Preparing)`
4. **P1**: Send `StatusNotification(Charging)` on `StartTransaction.conf` accepted
5. **P1**: Send `StatusNotification(Finishing)` → `Available` on `StopTransaction.conf`

*This incident drove requirements FR-078–091 (Section 9.2 Emergency Stop) and informed STATUS-002/004/005 in the Protocol Compliance Report.*

---

## Section E — Planned Feature: Repeated RemoteStart Panel

> **Location in tool**: Inside the Status Notifications section, as a sub-panel

This feature identifies sessions that went `Preparing → Finishing` (never reached `Charging`) but received multiple `RemoteStartTransaction` requests, indicating competing or failed remote start attempts.

### E.1 Trigger Condition

A session is flagged when:
- Status flow is `Preparing → Finishing` on a connector (no `Charging` in between)
- ≥ threshold `RemoteStartTransaction` requests were received during the `Preparing → Finishing` window

### E.2 Panel UI (Per Flagged Session)

**Header strip** (one per flagged session):

```
 Connector 1 · Preparing  2026-04-11T07:36:32.137Z :L6      2 RemoteStart
              Finishing   2026-04-11T07:39:06.802Z :L33      ✅ 0 won
              Duration    2m 34s                              ❌ 1 blocked
```

**Per-RemoteStart sub-table**:

| # | Time · Line | idTag | EVSE RS Reply | OpenAPIControl Status | OCPP Runtime Status |
|---|---|---|---|---|---|
| 1 | `2026-04-11T07:38:11.266Z :L9` | 9807 | `Accepted :L11` | `POST /outlets/1/auth (9807) :L15` | `Starting Transaction remotely for connector 1 :L10` |
| 2 | `2026-04-11T07:39:01.242Z :L26` | 6114 | `Accepted :L28` | — *(blocked before physical auth)* | `Cannot auth. Outlet 1 is already authorized for user="9807" :L34` |

Row 1 tinted green (won) · Row 2 tinted red (blocked).

### E.3 Column Derivation

| Column | Source | Absence Meaning |
|---|---|---|
| **EVSE RS Reply** | `[3,"<rs-uuid>",{"status":"..."}]` matched by RemoteStart uuid | Always present (EVSE accepts every RS at protocol layer) |
| **OpenAPIControl Status** | Regex `[OpenAPIControl] POST /outlets/<N>/auth (<idTag>)` within RS auth window | Absence = runtime refused before physical auth — clearest signal of "which RS took effect" |
| **OCPP Runtime Status** | `Cannot auth. Outlet N is already authorized for user="X"` (preferred) OR `Starting Transaction remotely for connector N` (fallback) | Final runtime verdict for this RS |

### E.4 Count Definitions

| Label | Meaning |
|---|---|
| **N RemoteStart** | Total RS requests in the `Preparing → Finishing` window |
| **✅ K won** | RS attempts that reached `Charging` — always 0 by definition for flagged sessions |
| **❌ M blocked** | RS attempts refused with `Cannot auth … already authorized for user="X"` |

### E.5 Log Pattern to Match (OpenAPIControl)

```
[OpenAPIControl] POST /outlets/<N>/auth (<idTag>)
```

*idTag is always in the trailing `(…)` parentheses.*

---

## Section F — Session Timeline Improvement Ideas

> From `session_timeline_improvements.md` — design proposals for enhancing Section 13 beyond current FR-207–234. These are inputs for future FRs, not yet formally numbered.

### F.1 Replace Numbered Dots with Event Icons + Labels

**Problem**: Numbered dots require cross-reference to understand each stage.

**Proposal**:
```
⚙️ Prepare → 🔑 Authorization → ▶ StartTransaction → ⚡ Charging → ⛔ Stop → 🏁 Finish
```

### F.2 Show Duration Between Events

**Proposal**: Display time delta between consecutive events directly on the timeline.

```
Prepare → Authorization : 6s
Authorization → StartTransaction : 29s
StartTransaction → Charging : 3s
Charging Duration : 43.1 min
```

Use case: Detects authorization delays and EV handshake delays.

### F.3 Timeline Segments Representing Duration (Replace Dots)

**Proposal**: Width of each segment is proportional to actual duration.

```
|Prepare|Auth|StartTx|---------------- Charging ----------------|Stop|
```

### F.4 Hover Tooltip with Full OCPP Event Data

**Proposal**: Each timeline event shows OCPP message detail on hover.

```
StartTransaction
  Timestamp: 12:48:13
  Connector: 2
  IdTag: gkSDfNtnyKrJmSYG
  MeterStart: 184503 Wh

MeterValues (Charging stage)
  Energy Delivered: 5.51 kWh
  SOC: 78% → 100%
  Voltage: 397V | Current: 92A
```

### F.5 Minimum Visible Width for Short Events

**Proposal**: Enforce minimum px width per stage so Prepare/Auth/StartTx don't disappear when zoomed out.

```
visual_width = max(25px, scaled_width)
```

### F.6 Advanced: Multi-Layer Timeline (Protocol + Telemetry)

**Proposal**: Multiple synchronized rows on shared time axis:

```
Session Events   | Prepare → Auth → StartTx → Charging → Stop
OCPP Messages    | BootNotification | Authorize | StartTransaction | MeterValues | StopTransaction
Power / Energy   | ████████████████████████████
SOC              | 78% → 100%
```

### F.7 Advanced: Interactive Zoom

Allow engineers to zoom into specific time ranges to inspect fast events (auth handshake timing, OCPP message gaps).

---

## Section G — Standard Impact Check Template

> Run this checklist **after every code change** to `OCPP_Parser_Complete_ 21 Jan'26.html` before confirming the change is complete. Record results in `CHANGELOG.md`.

```
[ ] createTransactionSummarySection
    — modal exists
    — chart listeners use tbody.querySelectorAll (NOT table.querySelectorAll)
    — canvas has explicit height (style="height:400px;")
    — renderTransactionChart wrapped in requestAnimationFrame
    — close btn, export listener, return section all present

[ ] createPowerRestoreMissingSyncSection — export listener + return section present
[ ] createEmergencyStopMissingStatusSection — export listener + return section present
[ ] createDowntimeReportSection — export listener + return section present
[ ] createFaultStatusSummarySection — export listener + return section present
[ ] createIncompleteTransactionSection — export × 2, return section × 2 (empty + data paths)
[ ] createEnergyDispenseSection — export × 2, return section × 2, closing } intact at boundary

[ ] displayResults() split block
    — all reason strings match (Power Failure / Emergency Stop / Power Restore)
    — no stale/old reason strings remaining (search for any removed names)
    — conditional renders correct (excluded from standard, included in dedicated)

[ ] detectDowntimes()
    — customStartCheck entries: Power Failure (19) + Emergency Stop (17) + Input Under Voltage
    — window._wsPingEvents / _wsPongEvents / _wsServerPings initialised and populated

[ ] detectMissingBootAfterPowerRestore() — flags.push present + return flags intact
[ ] detectMissingStatusAfterEmergencyStop() — push is UNCONDITIONAL (not gated) + return flags intact

[ ] processTransactions()
    — transactions.push(tx) AND transactionMap.delete(txId) present
    — both calls come AFTER any new code that reads from transactionMap

[ ] renderTransactionChart()
    — spanGaps: true on both datasets
    — ySoC (left) and yPower (right) axis configs intact

[ ] convertToIST() — try-catch present (NOT convertUTCtoIST — that name does not exist)
[ ] exportTableToExcel() — all table IDs in calls match actual table element IDs

[ ] Protocol Compliance functions
    — detectPhantomConnectionPattern() — reads window.rawLogLines read-only only
    — runProtocolValidation() — all 5 groups (BOOT/RESP/TXC/STATUS/MV) present
    — createProtocolValidationSection() — return section + all 3 chevron classes present

[ ] analyzeWebSocketHealth()
    — reads from window._wsPingEvents / _wsPongEvents (NOT rawLogLines.forEach)
    — uses two-pointer PING→PONG matching (NOT Array.find() inside loop)
    — table capped at TABLE_ROW_LIMIT (500 rows)

[ ] Session Timeline
    — createSessionTimelineModal() exists
    — view-timeline-btn event listener present in buildRows()

[ ] Log Repository
    — saveLogToRepository() called after both parse paths (file upload + API download)
    — initLogRepository() called at end of DOMContentLoaded block

[ ] displayResults() final order (bottom-to-top for last 3):
    — Protocol Compliance → WebSocket Health → (any new section)
```

---

**Document**: OCPP_Parser_Master.md
**Author**: Ador Digatron Engineering
**Maintained alongside**: `OCPP_Parser_Complete_ 21 Jan'26.html`
