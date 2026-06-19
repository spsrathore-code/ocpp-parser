# PARKED — Repeated-RemoteStart Diagnostic (Status section, Phase 3b-3b)

> **Status: PARKED 2026-06-19** by user decision — resume later. The rest of the Status
> Notifications section (table + distribution + session-flow + error rollup + filters) is
> DONE (Phase 3b-3a). This document captures everything needed to implement the diagnostic
> later **without re-discovery**.

## What it is

An **auth-contention diagnostic** in the Status Notifications section: detects "Repeated
RemoteStart" sessions — a connector goes **Preparing → (Finishing | Available | Faulted)
without ever reaching Charging**, while the CSMS sent **multiple `RemoteStartTransaction`
requests**. The OCPP client accepts all of them but the runtime blocks later duplicates
("Cannot auth. Outlet N is already authorized for user=…"). Surfaces auth races / stuck
sessions.

## Legacy source (canonical) — `src/app/OCPP_Parser_Complete_ 21 Jan'26.html`

| Piece | Lines |
|---|---|
| Detection + per-session correlation (`allProblemSessions`) | **4256–4423** (inside `createStatusNotificationSection`, guarded by `if (_remoteStartMsgs.length > 0)`) |
| Raw-line scan (3 regexes: `Cannot auth` / `Starting Transaction remotely` / `[OpenAPIControl] …/auth`) | 4286–4309 |
| Per-RS detail correlation (RS↔Authorize↔runtime-block↔OpenAPI) | 4333–4394 |
| `allProblemSessions.push({...})` shape | 4400–4421 |
| ⚠ Repeat-RemoteStart **summary card** (`id="repeat-remote-count"`) | 4485–4490 |
| **Problem-session panel** + threshold input (`Min RemoteStart`, default 2) | 4587–4614 |
| `_filterBad` / `_fmtDur` / `renderBadSessions` (populates panel + row pills + card count) | 4616–4720 |
| Per-row **"⚠ N× RS" pill** + amber row highlight in the main table | 4849–4857 (`rows[].repeatIssue`, set by `renderBadSessions`) |

## Algorithm (summary)

1. Collect `RemoteStartTransaction` requests (received, msgType 2) and `Authorize` requests
   (sent) from all message groups; build `_callResultByUuid` (msgType 3 by msgId).
2. One pass over `rawLogLines` with substring guards → `_runtimeBlocks`, `_runtimeStarts`,
   `_openApiAuths` (ts, outlet, user/idTag, lineNumber).
3. For each connector's **Preparing** event, find the next non-Preparing status. If it's
   **not Charging**, gather the `RemoteStartTransaction`s in `[preparingTs, endTs]`.
4. For each RS: resolve OCPP accept (`_callResultByUuid`), matching `Authorize` + its result,
   a runtime **block** whose `user` ≠ this RS's idTag (someone else holds the lock), OpenAPI
   auth, and runtime "Starting Transaction remotely". Produce `details[]`.
5. Push a `problemSession` per such Preparing window with: `cid`, `preparingOrigIdx`,
   `endOrigIdx`, `preparingTs`, `endStatus`, `endTs`, `durationMs`, `remoteStartCount`,
   `distinctIdTags`, `sameTagDuplicates`, `differentTagRequests`, `ocppAcceptedCount`,
   `authorizeSentCount`, `authorizeOkCount`, `runtimeBlockedCount`, `winningIdTag`,
   `rejectedIdTags`, `details[]`.
6. UI: a threshold (`Min RemoteStart`, default 2) filters to "bad" sessions
   (`endStatus==='Available' && remoteStartCount===0` is benign → excluded; else
   `remoteStartCount >= threshold`). Updates the summary card count, the panel, and tags
   `rows[preparingOrigIdx].repeatIssue = remoteStartCount` → per-row pill + amber highlight.

## Recommended revamp architecture (when resumed)

- **New analysis module** (e.g. `src/app/detect/remoteStartContention.ts`): pure
  `detectRemoteStartContention(messageGroups, statusNotifications, rawLogLines)` →
  `ProblemSession[]`. Unit-test the correlation against a fixture log.
- Surface it on `AnalysisResult` (e.g. `result.remoteStartSessions`) via `analyze.ts`.
- **Render**: extend `render/sections/statusNotifications.ts`:
  - add the 6th summary card (⚠ Repeat RemoteStart) — currently 5 cards,
  - re-introduce the threshold-driven problem-session panel,
  - add the per-row `repeatIssue` pill + amber row highlight (the StatusRow already flows
    through `computeStatusAnalytics`; thread a `repeatIssue` field in).
- The threshold control is interactive (re-filters + re-tags rows) — mirror the legacy
  `renderBadSessions` re-render on threshold change.

## Inputs already available in the revamp

`AnalysisResult` has `messageGroups` (incl. `Other` for RemoteStart/Authorize),
`rawLogLines`, and the Status rows come from `computeStatusAnalytics(messageGroups.StatusNotification)`.
The byConnector Preparing-session walk already exists in `computeStatusAnalytics` (session-flow)
— the diagnostic can reuse/extend that grouping rather than re-deriving it.

## Why parked

Heaviest remaining single-section feature (raw-line regex correlation across 4 event types),
and not blocking the higher-value chart/export parity (3c/3d). Resume as its own sub-phase.
