# Uptime Analysis — Design Specification

**Date:** 2026-09-08
**Branch:** `feat/uptime-analysis` (off `origin/main`)
**Status:** Approved in brainstorming; ready for implementation planning
**Customer scope (v1):** Mahindra
**Reference artifact:** `DC052_ DC053 Uptime Template.xlsx` (repo root, untracked)

---

## 1. Why this document exists

A new **Uptime** view in the OCPP Suite: upload CMS log exports, get a charger
availability analysis — fault breakdown, error-code consistency, per-site uptime,
and a cross-site comparison.

The reference workbook is unusually generous. Its `Analysis_Spec_MD` sheet is a
595-line, self-contained reproduction specification: every formula, every
threshold, block-height rules, 14 reconciliation gates, and an exact validation
baseline. **This work is therefore a port of a documented algorithm, not a
reverse-engineering exercise.** Where this document and `Analysis_Spec_MD`
disagree, `Analysis_Spec_MD` wins and this document is the bug.

The port also changes the artifact's nature. Today the analysis is a lattice of
Excel formulas whose own spec (§11) lists nine ways it silently breaks when a log
is replaced — hard-typed bounds that don't follow the data, dynamic-array blocks
overflowing their gap, `MATCH` clamping and manufacturing phantom rows. Moving
the calculation into tested code retires that entire failure class. It also
retires the formulas: the Excel export writes **values, not live formulas** (§9).

---

## 2. Scope

### In scope (v1)

| # | Section | Source sheet | Notes |
|---|---------|--------------|-------|
| 1 | Inventory | `Inventory` | Comparability sanity check. Rendered first — the spec says read it before trusting any comparison. |
| 2 | Individual Site Uptime | `Uptime_DC052` | One per site. The four blocks: by error code, by error description, uptime over the window, overlap-adjusted. |
| 3 | Outage detail | `Outage_DC052` | Flat drill-down: every episode with start/end/duration/derivation. |
| 4 | Fault_Breakdown | `Fault_Breakdown` | Cross-site fault view + per-site pivots. |
| 5 | ErrorCode_Comparison | `ErrorCode_Comparison` | Labelling-consistency verdicts + ambiguity flags. |
| 6 | Uptime_Comparison | `Uptime_Comparison` | Per-connector/site metrics, Δ vs baseline, line-item downtime, C0 non-additive block, read-out. |

Plus: Excel export of all sections, and a thresholds panel exposing the two
`[CONFIRM]` business decisions.

### Out of scope (v1)

- `PowerFailure_Analysis` (SITE-COMMON vs UNIT-SPECIFIC classification, 60 s
  simultaneity threshold).
- `Session_Analysis` (the Preparing → Authenticate → Charging → Finishing funnel,
  60-row adjacency matching).
- Live-formula Excel export.
- Customers other than Mahindra. CZ is expected to work — ingestion is shared and
  format-agnostic — but is not a v1 acceptance target.

Both deferred sections are additive: they consume the same Extract rows and add
no new stage to the chain.

### Decisions taken in brainstorming

1. **Scope** — the four requested sections plus Outage detail and Inventory.
2. **Multi-site** — N sites; comparison Δ measured against the first-loaded site
   as baseline. Renders identically to the template when N = 2.
3. **Thresholds** — template defaults, editable in the UI.
4. **Output** — browser sections plus Excel export (values).

---

## 3. Input contract and ingestion

### 3.1 The row format

The template's raw sheets are `Event Name | Event Type | Request | Response |
Created On` — byte-identical to the format the **existing Mahindra adapter**
already reads. Ingestion is therefore pure reuse: both the Excel adapters
(`CmsFormatAdapter`) and the CSV adapters (`CmsCsvFormatAdapter`) normalize to
the same `CmsRow`, so the Uptime view accepts `.xlsx` and `.csv` alike, with the
existing customer registry and auto-detection.

### 3.2 `Created On` is not used

`Analysis_Spec_MD` §1 is explicit: `Created On` is the CMS *capture* time, not the
event time, and is **diagnostic only, never used in calculations**. Every
timestamp in this analysis is parsed out of the OCPP JSON in the Request/Response
columns.

Two consequences:

- The Uptime pipeline must **not** go through `parseCmsWorkbook` →
  `cmsRowsToParsedLines`, which timestamps each line from `Created On`. It
  consumes `CmsRow` directly and does its own Extract.
- The Mahindra month/day serial trap (fixed July 2026, `mahindraTimestamps.ts`)
  is **irrelevant here**, because the column it affects is never read.

### 3.3 A site is a sheet — and this needs a small adapter extension

The template holds both sites as two sheets of one workbook; Mahindra exports one
sheet per charger. Grouping by `CmsRow.sheetName` therefore yields multi-site
analysis from a single upload *and* across uploads, with no per-file ceremony.

**Blocker found during design:** both `czAdapter` and `mahindraAdapter` call
`pickDataSheet(workbook)`, which by design returns the single best-scoring sheet.
Run unchanged against the template, the Mahindra adapter would analyze only
`DC053 CMS Logs` and **silently drop DC052** — the worst class of bug, a wrong
answer with no error.

**Resolution.** Extend `CmsFormatAdapter` with two optional members:

```ts
/** All sheets this adapter recognizes as log sheets (not just the best one). */
listDataSheets?(workbook: WorkBook): string[];
/** Extract rows from one named sheet. */
extractRowsFromSheet?(workbook: WorkBook, sheetName: string): CmsRow[];
```

`extractRows` keeps its exact current behaviour by delegating to
`extractRowsFromSheet(workbook, pickDataSheet(workbook))`, so **the CMS Log Parser
view is behaviourally unchanged** — a requirement, not an aspiration, and pinned
by regression tests on the CZ and Mahindra samples. The Uptime view calls
`listDataSheets` and iterates. Adapters that don't implement the optional members
fall back to single-sheet, which stays correct.

`listDataSheets` scores every sheet by the same `CALL_RE` heuristic
`pickDataSheet` already uses, and returns all sheets scoring above zero. On the
template this selects the two raw log sheets and rejects the ~20 computed ones.

### 3.4 Site identity

`Charger ID`, `Model Name` and `Station Name` **do not exist anywhere in OCPP
1.6J** (`Analysis_Spec_MD` §4.5) and must come from an asset master. Only OEM is
derivable, from the first `BootNotification`'s `chargePointVendor`.

v1 therefore derives a site label from the sheet name (the adapters already strip
Mahindra's `Logs_of_charger__` prefix), makes it editable per site in the UI, and
leaves Model/Station blank unless typed. The spec's warning is honoured: do not
trust `chargePointModel` from BootNotification — in the reference run it reported
a vendor name, not a model.

---

## 4. Architecture

New module `src/app/uptime/`. A new top-level nav group **Uptime**, sibling to
**CMS** in `navConfig.ts`, lazy-mounted so the analysis and `xlsx` stay
code-split.

```
.xlsx / .csv
  → [reuse] registry + adapter.listDataSheets / extractRowsFromSheet
  → CmsRow[]                             grouped by sheetName = site
  → extract.ts      ExtractRow[]         payload timestamps, key pulls, MeterValues gate
  → episodes.ts     Episode[]            300 s fault clustering + synthesized Offline windows
  → outages.ts      OutageRow[]          connector-0 fan-out, durations, unresolved marking
  → uptimeCalc.ts   SiteUptime           per-site blocks, window, raw + merged uptime
  → compare/*       Comparison           cross-site sections (only when ≥ 2 sites)
  → UptimeReport
```

Each stage is a pure function over plain data: same input, same output, no DOM,
no I/O. That makes every rule in §5 independently testable and keeps the whole
report structured-clone-safe for the Web Worker boundary (§9).

### 4.1 File layout

```
src/app/uptime/
  types.ts                      ExtractRow, Episode, OutageRow, SiteUptime,
                                UptimeReport, UptimeOptions
  extract.ts                    CmsRow[] -> ExtractRow[]
  episodes.ts                   fault clustering + synthesized Offline windows
  outages.ts                    episodes -> flat outage rows (fan-out)
  mergeIntervals.ts             the overlap sweep (isolated: highest-risk rule)
  uptimeCalc.ts                 per-site uptime blocks
  duration.ts                   [h]:mm:ss formatting, IST display helpers
  compare/
    inventory.ts
    faultBreakdown.ts
    errorCodeCompare.ts
    uptimeCompare.ts
    readout.ts                  formula-driven narrative sentences
  analyzeUptime.ts              orchestrator
  uptime.worker.ts              worker entry (mirrors analysis.worker)
  runAnalyzeUptime.ts           worker client + direct fallback
  render/
    renderUptimeShell.ts        upload, customer selector, thresholds panel
    renderInventory.ts
    renderSiteUptime.ts
    renderOutageDetail.ts
    renderFaultBreakdown.ts
    renderErrorCodeCompare.ts
    renderUptimeCompare.ts
  export/exportUptimeExcel.ts
  mountUptime.ts
```

Every file stays well under the 2000-line limit; the largest are expected to be
`uptimeCompare.ts` and `renderUptimeCompare.ts` at a few hundred lines.

### 4.2 Why not reuse `analyze()`

`analyze()` produces `AnalysisResult`, built for a different question, and
timestamps rows from `Created On`. Uptime needs its own Extract with different
columns and a different timestamp rule. This is a sibling pipeline that shares
*ingestion*, not a new section of the existing one.

---

## 5. The calculation core

This section is the port target. Every rule below is from `Analysis_Spec_MD`; the
citation is given so an implementer can check the original.

### 5.1 Extract (§3)

One `ExtractRow` per `CmsRow`:

| Field | Rule |
|-------|------|
| `sourceRow` | 1-based index within the sheet, for traceability |
| `site` | `CmsRow.sheetName` |
| `eventName` | OCPP action = element 2 of the parsed CALL array (more reliable than the label column) |
| `timestampUtc` | Request payload `timestamp`, ISO → epoch ms; null when absent |
| `respCurrentTimeUtc` | Response payload `currentTime`; null when absent |
| `connectorId` | Request payload `connectorId` (numeric; 0 = whole unit) |
| `status`, `errorCode`, `vendorErrorCode`, `info`, `reason` | Request payload string keys |
| `firmwareVersion`, `chargePointVendor` | Request payload string keys (BootNotification) |
| `requestLen` | `requestString.length` |
| `truncated` | `eventName === 'MeterValues' && requestLen >= 4000` |
| `isFaultStatus` | `eventName === 'StatusNotification' && errorCode && errorCode !== 'NoError'` |

The original extracts keys by string `FIND` on raw JSON because Excel has no
parser. We have `JSON.parse` — use it, with a safe wrapper that returns null on
malformed rows. This is strictly more correct: the string extractor only works
for quoted string values (which is exactly why `connectorId` needed its own
formula), and it would mis-read a value containing an escaped quote.

**Timestamp source rule (§8).** Use the Request `timestamp` where present;
Heartbeat and BootNotification carry none, so use the Response `currentTime`. UTC
throughout; add 5:30 for IST display only.

### 5.2 Analysis window (§6.2)

```
windowStart = min(all timestampUtc, all respCurrentTimeUtc)
windowEnd   = max(all timestampUtc, all respCurrentTimeUtc)
availableSec = round((windowEnd - windowStart) / 1000)
```

Across **all** rows and **both** timestamp fields — Heartbeats and Boots have no
request timestamp and would otherwise be excluded, shifting the window. Available
time is identical for every connector on a site.

### 5.3 Fault episode clustering (§3.2)

A fault row starts an episode iff **no other fault row with the same `info` and
the same `connectorId` exists in the preceding 300 s**. This collapses a charger
re-reporting the same fault every few seconds into one episode.

Keyed on `info` + `connectorId` — deliberately **not** `errorCode`, because §7.3
demonstrates the same fault text is logged under different error codes.

### 5.4 Episode boundaries (§4.1)

For each episode-start row:

- **`info === 'PowerFailure'`** → `start` = the last Heartbeat `currentTime`
  strictly before the notification; `end` = the notification time itself.
  A charger cannot transmit while power is out, so the outage began when
  heartbeats stopped, not when it was finally reported. They are then **zero-
  duration marker rows**, because the true restoration is captured by the
  synthesized Offline window — counting both would double-count.
- **Everything else** → `start` = the notification time; `end` = the first
  `StatusNotification` with `errorCode === 'NoError'` on the **same
  connectorId** strictly after `start`. If none exists before the log ends, the
  episode is **unresolved**: no end, no duration.

### 5.5 Synthesized Offline windows (§4.2)

Every `BootNotification` implies prior unreachability. These windows are not
logged — they are derived, one per BootNotification:

```
connectorId = 0
status      = 'n/a (synthesized, not an OCPP status)'
errorCode   = 'Offline'   info = 'Offline'   vendorErrorCode = 'Offline'
start       = last Heartbeat currentTime strictly before the boot response currentTime
end         = the BootNotification response currentTime
```

Both bounds read the **response** `currentTime`, because BootNotification carries
no request timestamp. On DC052 this is 29 events / 8:47:02 per connector — the
single largest downtime component. Omitting it makes every uptime figure wrong.

### 5.6 Connector-0 fan-out (§4.4, §5)

Episodes are merged and sorted by `start`, then expanded to output rows:

| Episode | Output rows |
|---------|-------------|
| `connectorId > 0` | 1 row, as-is |
| `connectorId === 0` and `info === 'Offline'` | **one row per physical connector** — a unit-level outage affects all of them |
| `connectorId === 0`, anything else | **0 rows** — suppressed (PowerFailure markers, and C0 faults, which are reported separately and non-additively in §6.4) |

Physical connectors are **discovered**, not assumed: the sorted distinct
`connectorId > 0` seen on that site, falling back to `[1]` if none. At two
connectors this reproduces the template's hard-coded fan-out of 2 exactly.

Each output row carries: site metadata, connectorId, errorCode, errorDescription
(= `info`), vendorErrorCode, start/end in UTC and IST, `durationSec` (null when
unresolved), a human outage text, `sourceRow`, and the derivation method string.

### 5.7 Uptime (§6.3, §6.4)

**Blocks 1 and 2** — downtime and event counts per connector, grouped by
`errorCode` (block 1) and by `errorDescription` (block 2), each with a total row.
Both blocks cover *every* category, not just the four counted ones.

**Raw uptime.** Downtime sums only rows whose `errorDescription` is in the
counted categories (default: `PowerFailure`, `Offline`, `EmergencyPressed`,
`InputUnderVoltage`), per connector:

```
uptimePct = (availableSec - downtimeSec) / availableSec
```

**Overlap-adjusted uptime — the headline metric.** Raw summing double-counts
simultaneous outages. Per connector, take counted-category rows that have an end
(unresolved rows cannot be merged), sort by start, then sweep:

```
effStart = first row of connector ? start : max(start, runningMaxEnd)
effDur   = max(0, end - effStart)
runningMaxEnd = first row of connector ? end : max(end, runningMaxEnd)
mergedDowntime = Σ effDur
overlapRemoved = rawDowntime - mergedDowntime
uptimePct = (availableSec - mergedDowntime) / availableSec
```

An interval fully covered by the running max yields duration 0. On DC052 C1 this
removes 930 s. `mergeIntervals.ts` isolates this sweep because it is the rule
most likely to be subtly wrong and the one with the largest effect on the
headline number.

**Site roll-up.** `siteAvailable = availableSec × connectorCount`;
`siteDowntime = Σ per-connector`; site uptime from those two.

---

## 6. The comparison layer

Rendered only when ≥ 2 sites are loaded; with one site, the sections are replaced
by a short note saying what a second site would add.

### 6.1 Inventory (§7.1)

Per site: row counts by event name, window start/end, rows carrying a request
timestamp vs total, distinct firmware versions, connector ids seen, and truncated
MeterValues count. **Renders a loud warning when windows or Heartbeat counts
differ materially between sites**, because every downstream comparison is then
apples-to-oranges. This is why it renders first.

### 6.2 Fault_Breakdown (§7.2)

- **Section 1 — cross-site.** One row per distinct `(errorCode, vendorErrorCode,
  info)`, with per-site per-connector fault-row counts (C0, C1…Cn, Total).
  Sorted: one-sided faults first, then combined frequency descending. Total row.
- **Sections 2+ — per-site pivot.** One per site, keyed on the full fault
  identity `(connectorId, status, errorCode, vendorErrorCode, info)` with
  frequency, sorted descending. Total = that site's fault-row count.

Counts are **fault rows**, not episodes (reconciliation gates 2 and 3 depend on
this).

### 6.3 ErrorCode_Comparison (§7.3)

Run before drawing any conclusion from a fault-count comparison: if two releases
code the same fault differently, comparing counts by `errorCode` is meaningless.

- **Section 1** — one row per distinct `info` (union across sites). Per site: the
  sorted unique set of `errorCode`s (joined `" | "`), `status`es, and
  `vendorErrorCode`s, plus row counts. Verdicts:
  `n/a - one-sided fault` when either side is absent; `CONSISTENT` when the sets
  are equal and single; `same set (both multi-coded)` when equal but multi-valued;
  `MISMATCH` otherwise.
- **Section 2** — full triplet inventory: every distinct `info × errorCode ×
  status` with per-site row counts and presence (`BOTH` / `<site> ONLY`).
- **Section 3** — the same table keyed on `vendorErrorCode`, the stable numeric
  identity, which catches pure relabelling.
- **Section 4** — ambiguity flags per `info`: distinct errorCode and status counts
  per site → `AMBIGUOUS - multiple errorCodes AND statuses` / `multiple statuses
  only` / `clean - single code & status`. An `info` logged under more than one
  `errorCode` by the same charger proves `errorCode` alone is not a valid fault
  key.
- **Section 5** — read-out.

### 6.4 Uptime_Comparison (§7.5)

Every figure is derived from the per-site results; nothing is recomputed from raw
rows, so the two can't drift.

- **Metric block.** Rows: total available time; downtime for each counted
  category; total raw; total merged; uptime % raw; **uptime % overlap-adjusted
  (headline)**; downtime %; outage event count. Columns: for each site C0, C1…Cn,
  Site — then **Δ vs the baseline site**.
- **Section 6 / 7 — line items.** Downtime by error code, and by error
  description, across *all* categories: events, seconds, `[h]:mm:ss` per site, and
  Δ seconds. These deliberately count every category, unlike the headline metric.
- **Section 8 — connector-0, charger-level, non-additive.** C0 fault downtime per
  site, explicitly **not** added into C1/C2/Site anywhere, against **one** log
  window rather than two. PowerFailure is excluded here by design (its C0 events
  are markers). The rendering must carry the non-additive warning; a reader who
  adds this into the site total gets a wrong answer.
- **Read-out.** Plain-language sentences — uptime gap and direction, downtime
  ratio and largest driver, event frequency and mean length, and the unresolved-
  episode caveat. Every number in every sentence is interpolated from the
  computed values, never typed (`Analysis_Spec_MD` build principle 3, gate 13).

---

## 7. Thresholds and configurability

`Analysis_Spec_MD` marks these as business decisions, not log facts, and says to
confirm rather than assume when reusing on a new site. Both are surfaced in a
thresholds panel, defaulting to the template values, recomputing from cached
extract rows on change:

| Setting | Default | Effect |
|---------|---------|--------|
| Fault clustering window | 300 s | Episode boundaries → event counts and durations |
| Counted downtime categories | PowerFailure, Offline, EmergencyPressed, InputUnderVoltage | Which faults subtract from uptime % |

The category list is rendered as checkboxes over the categories actually present
in the loaded logs, so the question "what if OutletTempHigh counted?" is one
click. That is not hypothetical: HighTemperature alone is 36:40:27 on DC052 and
would move the headline figure by roughly 1.5 points.

Every rendered section states the active settings, so an exported or screenshotted
result can never be read without knowing the scope that produced it.

---

## 8. Rendering

Follows the existing view conventions (`renderCmsShell` as the model): the same
upload control, customer selector, dark-mode-aware Tailwind classes, collapsible
sections, and section ordering.

Order: **Inventory → Individual Site Uptime (per site) → Outage detail (per site)
→ Fault_Breakdown → ErrorCode_Comparison → Uptime_Comparison.**

Duration rendering uses `[h]:mm:ss` semantics — **hours are unbounded and must not
wrap at 24 h**. DC052 shows `36:40:27`; a naive `h:mm:ss` silently understates by
a full day. This is `duration.ts`, and it is unit-tested at 0 s, < 1 min, > 1 h,
> 24 h and > 100 h.

Timestamps display as IST (UTC + 5:30) with the timezone stated in the header,
and are stored UTC throughout.

---

## 9. Excel export

One workbook, one sheet per rendered section, **values not formulas**. Reuses the
existing lazy-`xlsx` export plumbing. The header block of each sheet carries the
analysis period, the active thresholds, and the caveats — so an exported sheet
stands alone.

This deliberately does not reproduce the formula lattice. The app is now the
calculation engine, which is the point: it retires `Analysis_Spec_MD` §11's nine
silent-breakage modes.

---

## 10. Performance

**MeterValues gate (§14).** MeterValues are 70–85 % of a typical log and feed
none of these analyses. Skip payload key extraction for them — but **not**
`timestampUtc`, because the window is a MIN/MAX across all rows and blanking
those would shift every uptime %. Keep `requestLen` and `truncated`, which exist
precisely to flag truncated MeterValues. The reference run skipped 69.8 % of rows
and cut column-parses from 785,976 to 237,192 **with zero change to any reported
figure** — and that bit-identical property is the acceptance test for the gate
(§11), not an approximation.

**Worker.** Analysis runs in a Web Worker (`uptime.worker.ts`) with a direct
fallback, mirroring the existing `analysis.worker` pattern. The main-thread
freeze on large files was a logged P1 assessment finding; the report is plain
data and therefore structured-clone-safe.

---

## 11. Testing

TDD throughout, per the project's mandatory test-first standard.

### 11.1 The acceptance oracle

**`Analysis_Spec_MD` §12's baseline table is stale and must not be used as the
oracle.** Verified during design, against the workbook's own live computed
sheets:

| Measure | §12 says | Live sheets say |
|---------|----------|-----------------|
| DC052 outage rows | 128 | **154** (`Outage_DC052`: 89 on C1 + 65 on C2) |
| DC052 site uptime, overlap-adjusted | 97.73 % | **96.04 %** (`Uptime_Comparison`) |
| DC052 site merged downtime | 10:54:04 | **19:01:12** |
| DC053 outage rows | 131 | 131 (agrees) |
| DC053 site uptime, overlap-adjusted | 98.02 % | **97.87 %** |

The reference workbook was extended after §12 was written, and only the DC053 row
count survived. §12 remains useful as a sanity check on the *stage shapes* — the
figures below did verify — but the **live computed sheets are the acceptance
target**.

**Verified as still accurate in §12** (independently confirmed against the raw
sheets during design):

| Measure | DC052 | DC053 |
|---------|-------|-------|
| Total Available Time (s) | 863,780 | 863,873 |
| Fault rows | 197 | 180 |
| BootNotification rows | 32 | 35 |
| Distinct fault `info` union across both sites | 17 | — |

**The pinned targets** — from `Uptime_DC052`, `Uptime_DC053` and
`Uptime_Comparison`:

| Measure | DC052 | DC053 |
|---------|-------|-------|
| Outage rows (C1 / C2) | 89 / 65 = 154 | 62 / 69 = 131 |
| Raw downtime, C1 / C2 (s) | 36,555 / 32,847 | — |
| Merged downtime, C1 / C2 (s) | 35,625 / 32,847 | — |
| Overlap removed, C1 / C2 (s) | 930 / 0 | — |
| Uptime % raw, C1 / C2 | 95.77 / 96.20 | 97.49 / 97.48 |
| Uptime % overlap-adjusted, C1 / C2 | 95.88 / 96.20 | 97.75 / 97.98 |
| Site uptime %, raw / adjusted | 95.98 / **96.04** | 97.48 / **97.87** |
| Site merged downtime | 19:01:12 | 10:13:53 |
| Offline events per connector | 29 | — |

Uptime variance: DC053 is **+1.83 points** overlap-adjusted (not §12's +0.29).

Two of these are load-bearing beyond their face value. **Overlap removed = 930 s
on C1 and exactly 0 on C2** is the only direct evidence the merge sweep resets
per connector rather than running across all of them. And **29 Offline events
against 32 BootNotifications** means three boots produce no usable window — most
likely no preceding Heartbeat to bound the start. The implementation must
reproduce that count, and the reason must be understood and recorded rather than
tuned to fit.

### 11.2 Reconciliation gates (§10)

The applicable gates become assertions in the acceptance test:

- Fault_Breakdown per-site pivot total = fault-row count (gates 2, 3).
- Uptime block 1 total events = block 2 total events (gate 4).
- Uptime block 1 total seconds = block 2 total seconds (gate 5).
- Total events across connectors = outage row count (gate 6).
- Every uptime % between 0 and 100 (gate 7).
- Every duration ≥ 0, or null when unresolved (gate 8).
- **Merged downtime ≤ raw summed downtime, always** (gate 9).
- SITE-COMMON/UNIT-SPECIFIC gates (11) are out of scope with
  PowerFailure_Analysis; gates 1, 12–14 are Excel-artifact gates that the port
  makes structurally impossible.

Gate 9 is also a property test: for randomly generated interval sets, merged
never exceeds raw and never goes negative.

### 11.3 Unit tests

Small synthetic fixtures — no large files — for: the 300 s clustering boundary
(299 s vs 301 s, same/different `info`, same/different connector); PowerFailure
start-derivation and its zero-duration marker; Offline synthesis from
BootNotification; unresolved episodes; C0 fan-out including the suppression rule;
the merge sweep (disjoint, touching, nested, identical, connector reset);
duration formatting past 24 h; and the MeterValues gate's bit-identical property.

### 11.4 Fixture

The template is 13.7 MB, mostly computed sheets. Commit a **trimmed** copy to
`data/samples/` containing only the two raw log sheets, keeping the acceptance
test real while dropping the bulk. The full workbook stays untracked at the repo
root.

### 11.5 Regression guard on existing behaviour

The §3.3 adapter extension must not change the CMS Log Parser. Pin the current
CZ and Mahindra sample outcomes (message counts, transactions, alerts) before the
change and re-assert after.

---

## 12. Risks

| Risk | Mitigation |
|------|------------|
| Single-sheet adapters silently drop sites (§3.3) | `listDataSheets` + acceptance test asserting both DC052 and DC053 are found |
| Offline synthesis omitted or mis-bounded | Largest downtime component; pinned by baseline and unit tests |
| Duration wrap at 24 h | Dedicated `duration.ts` with > 24 h and > 100 h cases |
| Merge sweep subtly wrong | Isolated module, property test, gate 9 |
| Unresolved episodes read as completeness | Excluded from sums *and* surfaced in every section's caveat line |
| C0 block misread as additive | Explicit non-additive warning in §6.4 rendering |
| Testing against the stale §12 baseline | Resolved in design: pin the live computed sheets (§11.1) |
| Three BootNotifications yield no Offline window | Reproduce the count, then explain it — do not tune to fit (§11.1) |

---

## 13. Definition of done

- All six sections render from a Mahindra upload; comparison sections hide
  gracefully at N = 1.
- The acceptance test reproduces the §12 baseline and the applicable gates pass.
- Thresholds panel recomputes; every section states its active scope.
- Excel export produces one sheet per section with caveats intact.
- CMS Log Parser regression tests unchanged.
- `tsc --noEmit` and `vite build` clean; full suite green.
- Trackers updated at each phase boundary: `specs/roadmap.md`, `specs/tasks.md`,
  `knowledge/project-journal.md`.

---

## 14. Open items

1. **Why three BootNotifications produce no Offline window** (32 boots → 29
   Offline events per connector, §11.1). Expected cause: no preceding Heartbeat
   to bound the start. Confirm during implementation and record the rule.
2. **IST is assumed constant** at UTC + 5:30, as the template does. If a
   non-Indian deployment appears, this becomes a per-customer adapter concern.
3. **Model / Station Name** remain manual inputs until an asset master exists.
