# Heartbeat Summary — Design

> Date: 2026-07-10 · Enhancement to the Heartbeats section (Client + CMS parsers).
> Branch: continues on `feat/cms-multi-customer` (small, related to the Heartbeat
> Response-Time fix already there).

## 1. Goal

Add a **Heartbeat Summary** panel that reports the interval between consecutive
heartbeats using the **`currentTime` from each `Heartbeat.conf`** (the authoritative
Central-System timestamp) — not the local log/Excel wall-clock. Report Average /
Minimum / Maximum interval, Total Heartbeats Detected, and highlight intervals that
signal **missed heartbeats**.

## 2. Key insight (why one implementation covers all formats)

`currentTime` is present in **100% of heartbeat responses in all three sample
formats** (client text 58/58, CZ 311/311, Mahindra 458/458). Because we key off the
OCPP payload `currentTime` (carried in `ParsedMessage.responsePayload.currentTime`
after correlation), the feature works identically for the Client parser and both CMS
customers — including Mahindra, which lacks separate request/response wall-clock
times. One pure function, rendered in the shared Heartbeats section → every parser
gets it.

## 3. Decisions (user-confirmed 2026-07-10)

- **Placement:** a summary panel **at the top of the existing Heartbeats section**
  (above the table). Shared `renderResults` → appears in Client + CZ + Mahindra.
- **Deviation rule:** flag an interval **≥ 1.5× the expected interval** as a likely
  **missed heartbeat**, and estimate how many were missed (`round(interval/expected) − 1`).
  - **Expected interval** = `BootNotification.conf.interval` (seconds) when present
    (CZ 300, Mahindra 120); else the **median** of observed intervals (robust to the
    long gaps). Client sample has no BootNotification interval → median fallback.
- **Units:** seconds, 3 decimals (matches the user's `120.088 seconds`).

## 4. Design

### 4.1 Pure compute — `src/app/health/heartbeatSummary.ts`

```ts
export interface HeartbeatInterval {
  fromTime: string;   // currentTime of the earlier HB (ISO)
  toTime: string;     // currentTime of the later HB (ISO)
  seconds: number;    // (to − from) / 1000
  missedEstimate: number; // round(seconds/expected) − 1, ≥0 (only meaningful when flagged)
  flagged: boolean;   // seconds ≥ 1.5 × expected
}
export interface HeartbeatSummary {
  total: number;               // heartbeats with a usable currentTime
  intervalCount: number;       // = max(total − 1, 0)
  avgSeconds: number | null;   // null when < 2 usable heartbeats
  minSeconds: number | null;
  maxSeconds: number | null;
  expectedSeconds: number | null; // configured (BootNotification.conf.interval) or median
  expectedSource: 'configured' | 'median' | 'none';
  intervals: HeartbeatInterval[];
  flagged: HeartbeatInterval[];    // subset where flagged === true
}
export function computeHeartbeatSummary(
  heartbeats: ParsedMessage[],
  bootInterval: number | null,   // from BootNotification.conf.interval, else null
): HeartbeatSummary
```

Logic:
- Pull `currentTime` from each `msg.responsePayload.currentTime`; keep valid ISO ones;
  sort ascending; compute consecutive diffs in seconds.
- `expectedSeconds` = `bootInterval` if a positive number, else median(intervals) if any,
  else null (→ no flagging, stats null).
- Flag `seconds ≥ 1.5 × expectedSeconds`; `missedEstimate = max(round(seconds/expected) − 1, 0)`.
- Guard: < 2 usable heartbeats → all stats null, empty intervals.
- Spread-safe min/max (reuse `maxOf`/`minOf` from concatChunks — large logs).

### 4.2 Wire into analysis — `analyze.ts`

Add `heartbeatSummary: HeartbeatSummary` to `AnalysisResult`, computed from
`messageGroups.Heartbeat` + the first `BootNotification.conf.interval` found. Pure,
DOM-free (so it also crosses the worker boundary — structured-clone safe, plain data).

### 4.3 Render — extend `render/sections/heartbeats.ts`

Above the existing table, prepend a summary block:
- Stat cards: **Total Heartbeats**, **Avg Interval (s)**, **Min (s)**, **Max (s)**,
  and **Expected (s)** with a "(configured)" / "(median)" tag.
- If `flagged.length > 0`: a small highlighted table — From / To (currentTime) /
  Interval (s) / "~N missed" — styled as a warning (amber/red), reusing existing
  table styles. If none: a green "No missed heartbeats detected" note.
- If `< 2` heartbeats: "Not enough heartbeats to compute intervals."
- Existing heartbeat table (with the Response Time (ms) column) stays below, unchanged.

## 5. Testing

- `computeHeartbeatSummary` unit tests: the user's 2-HB example (120.088s);
  avg/min/max; configured-vs-median expected source; missed-heartbeat flag +
  estimate (e.g. 2× → ~1 missed); < 2 heartbeats guard; heartbeats missing
  currentTime skipped; unsorted input sorted.
- Render (jsdom): summary cards present; flagged table shown when a gap exists;
  "no missed" note otherwise.
- Integration: `analyze` on all three real samples exposes a sensible summary
  (client median≈60s with the 1501s gap flagged; CZ configured 300s; Mahindra
  configured 120s, avg≈120.5, the 240.9s gap flagged ~1 missed).
- Structured-clone integrity (worker) still passes with the new plain-data field.

## 6. Success criteria

1. Heartbeat Summary shows Total / Avg / Min / Max + Expected in Client, CZ, Mahindra.
2. Intervals use `currentTime` (authoritative), verified = user's 120.088s on Mahindra.
3. ≥1.5× gaps flagged with a missed-count estimate.
4. `tsc` + build + full suite green; worker clone-integrity intact.

## 7. Out of scope

- Charting the interval series (stats + flagged list only for v1).
- Changing the existing Response Time (ms) column (already fixed separately).
