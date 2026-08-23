# Mahindra CSV Ingestion Adapter — Design

**Date:** 2026-08-23
**Branch:** `feat/cms-mahindra-csv`
**Status:** Spec — awaiting review
**Related:** `2026-07-08-cms-log-parser-design.md` (adapter framework), `2026-07-09-cms-multi-customer-design.md` (registry)

---

## 0. What this is

The Mahindra CMS portal can export a charger's OCPP log as **CSV** as well as the
`.xlsx` we already support. This spec adds a **new CSV adapter** to the existing
`src/app/cms/` registry. It is an ingestion adapter, not a second parser: CSV →
`ParsedMessage[]` → the Client parser's existing `analyze()` → all existing sections.

The `.xlsx` path is **not touched**. See §6 for why they stay separate.

### Reference sample

`Logs_of_charger__MPCKADC060_639229316915356646.csv` — 98 MB, 27,402 data rows,
charger `MPCKADC060`, window 2026-08-15 → 2026-08-21 IST. Not committed; a
trimmed, identifier-scrubbed fixture is derived from it (§7).

---

## 1. Input contract

Five columns, header row exact:

```
Event Name,Event Type,Request,Response,Created On
```

| Column | Content | Notes |
|---|---|---|
| `Event Name` | OCPP action, e.g. `MeterValues` | |
| `Event Type` | `Charger-CMS` \| `CMS-Charger` | **advisory only — see §3** |
| `Request` | full CALL frame `[2,"<uuid>","<Action>",{…}]` | RFC 4180 quoted; `""` escapes |
| `Response` | CALLRESULT `[3,"<uuid>",{…}]`, or `-Awaiting response from charger-` | may be truncated (§4) |
| `Created On` | `MM/DD/YYYY HH:MM:SS`, **IST** | plain text; no Excel coercion |

Observed distribution in the reference sample:

| Action | Rows | Action | Rows |
|---|---:|---|---:|
| MeterValues | 21,370 | StopTransaction | 67 |
| Heartbeat | 4,728 | DataTransfer | 67 |
| StatusNotification | 831 | Authorize | 48 |
| RemoteStartTransaction | 96 | BootNotification | 35 |
| RemoteStopTransaction | 82 | TriggerMessage | 9 |
| StartTransaction | 67 | Reset | 2 |

Rows are ordered **newest-first**.

---

## 2. Detection

Registered in the existing customer registry. Selected when **both** hold:

1. File extension is `.csv`
2. First non-empty line equals the header signature above (case-insensitive, tolerant of a UTF-8 BOM and trailing empty columns)

Header match is required, not just the extension — a CSV that is not this shape
must fall through rather than be mis-parsed.

---

## 3. Direction — derive it, do not trust `Event Type`

**`Event Type` is unreliable and must not drive direction.** Measured on the
reference sample:

| Action | labelled `Charger-CMS` | labelled `CMS-Charger` | True OCPP 1.6J origin |
|---|---:|---:|---|
| RemoteStartTransaction | **42** ✗ | 54 | CSMS |
| RemoteStopTransaction | **29** ✗ | 53 | CSMS |
| TriggerMessage | **6** ✗ | 3 | CSMS |

77 rows carry the wrong direction. Every CP-originated action is labelled
correctly, so an adapter that trusts the column looks correct on Heartbeats and
MeterValues — 96% of rows — and then mis-threads every remote-start.

**Rule:** direction comes from the **action name**, via the existing OCPP §4/§5
direction map already used by the xlsx adapter.

**Diagnostic:** count rows where `Event Type` disagrees with the derived
direction and surface the total in the parse summary. It is a CMS-side
data-quality signal worth reporting, not something to silently discard.

---

## 4. Truncation

`Request` and `Response` are capped at **4,000 characters** by the export — the
same cap as the xlsx path (confirmed: longest field in the reference sample is
exactly 4000, and in both `DC052_Release 63` and `DC053 Release 67`).

MeterValues is 21,370 of 27,402 rows, so unhandled truncation loses the majority
of the payload data. **Reuse `src/app/cms/repairTruncatedJson.ts`** — salvage the
valid prefix, no new logic.

Count salvaged and unsalvageable rows separately; report both.

---

## 5. Timestamps

`Created On` is IST (`+05:30`) → convert to UTC, matching existing adapter behaviour.

**Cross-validation.** Many responses carry a UTC `currentTime` in the payload:

```
Created On  08/21/2026 17:00:38  (IST)
Response    …"currentTime":"2026-08-21T11:30:38.247Z"  (UTC)
```

Where a response contains `currentTime`, assert the derived UTC value matches
within a tolerance of ±5 s. Mismatches are counted and reported — this is a cheap,
self-checking guard against a timezone regression, using data already in the row.

---

## 6. Why a separate adapter, not a branch inside the xlsx one

The xlsx path carries a workaround the CSV path must not inherit.

Excel coerces the `Created On` column on load, and does so **inconsistently**:

| Source | Day ≤ 12? | Result in xlsx |
|---|---|---|
| `08/13/2026`, `08/20/2026` | no | unparseable as D/M → stays **text** ✔ |
| `08/11/2026` | yes | parsed as D/M/Y → **2026-11-08** ✘ |

Confirmed live in `DC052_ DC053 CMS Logs.xlsx`, whose `Created On` range reads
`08/13/2026 00:00:27 → 2026-11-08 14:23:20` despite an 11–20 Aug analysis window.
Only dates with day ≤ 12 are corrupted, which is precisely why the bug survives
casual inspection.

The CSV is plain text and never passes through Excel's parser, so it needs none of
this. Keeping the adapters separate means the CSV path stays simple and the tuned
xlsx workaround stays undisturbed.

---

## 7. Module layout

```
src/app/cms/adapters/mahindraCsv.ts    new — detection, row → ParsedMessage[]
src/app/cms/parseCsv.ts                new — streaming RFC 4180 reader
tests/unit/cms/mahindraCsv.test.ts     new
tests/fixtures/cms/mahindra-sample.csv new — trimmed, scrubbed
```

Registry entry added to the existing customer registry; nothing else changes.

**CSV reader.** Fields contain embedded JSON with `""` escapes and may contain
newlines, so a naive line split is wrong. A small RFC 4180 state machine is
required — not `xlsx`, which would materialise the whole 98 MB file. The reader
streams and yields rows.

**Where it runs.** Inside the existing analysis Web Worker, so a 98 MB file never
blocks the main thread. No change to the worker contract.

**Ordering.** Reverse rows to chronological before emitting.

**Emission.** Per row:
- `Request` → one CALL `ParsedMessage`
- `Response` starting `[3,` → one CALLRESULT sharing the message ID
- `Response` = `-Awaiting response from charger-` → **no** CALLRESULT emitted, so the existing correlation reports it as unanswered

This is what makes the existing 21 sections work unchanged.

---

## 8. Testing

Fixture derived from the real export, trimmed to ~200 rows, charger identifiers
scrubbed. Must cover:

| # | Case | Assertion |
|---|---|---|
| 1 | Direction derivation | The 77-row mismatch class resolves to CSMS-origin, not the label |
| 2 | Mismatch diagnostic | Reported count equals the seeded mismatch count |
| 3 | IST → UTC | `08/21/2026 17:00:38` → `2026-08-21T11:30:38Z` |
| 4 | `currentTime` cross-check | Seeded skew is flagged, not silently accepted |
| 5 | Truncated MeterValues | 4,000-char row salvages its valid prefix |
| 6 | Unsalvageable row | Counted, does not throw, does not abort the parse |
| 7 | Newest-first ordering | Emitted messages are chronological |
| 8 | Awaiting-response row | Emits CALL only; correlation reports unanswered |
| 9 | Quoted-field integrity | Embedded `""` and newlines parse correctly |
| 10 | Header rejection | A non-matching CSV is not claimed by this adapter |
| 11 | End-to-end | Fixture → `analyze()` produces a populated transaction summary |

---

## 9. Explicitly out of scope

- **Uptime / outage analysis.** `Analysis_Spec_MD` in `DC052_ DC053 CMS Logs.xlsx`
  specifies a full method — 300 s fault clustering, Offline windows synthesized
  from BootNotification gaps, overlap-adjusted uptime %, PowerFailure 60 s
  simultaneity, 14 reconciliation gates, a validation baseline. That is a separate
  feature with its own spec, and its §10/§12 give ready-made acceptance tests
  against the existing DC052/DC053 numbers.
- Changes to the xlsx adapters.
- The MSIL adapter.

---

## 10. Open questions

1. **Fixture commit.** Confirm the trimmed fixture may be committed once charger
   identifiers are scrubbed.
2. **Mismatch surfacing.** Parse-summary line only, or a row-level flag in the
   context viewer as well?
