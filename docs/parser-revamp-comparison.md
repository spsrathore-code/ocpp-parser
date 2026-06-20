# Parser Revamp — Legacy vs Revamp Comparison

> **Living document.** Updated at each phase boundary; **finalized at the Phase 5 parity gate**.
> **Status (2026-06-20):** **Phase 3 COMPLETE** (all 19 sections + charts + Excel export + context-viewer) — modulo ⏸️ parked 3b-3b (RemoteStart diagnostic). Phase 4 (repository/timeline/api-download) + Phase 5 (parity gate) remain.
> This is a **structure/quality** comparison *so far*, not a finished feature-parity claim.
> Legacy = `src/app/OCPP_Parser_Complete_ 21 Jan'26.html` (v2026.05.14). Revamp = `feat/parser-revamp`.

## Snapshot

| Dimension | Legacy (v2026.05.14) | Revamp (so far) |
|---|---|---|
| Files | **1** monolithic `.html` | **~50** focused modules |
| Largest file | 9,813 lines (one file) | **541** lines (`runProtocolValidation.ts`) — under the 2,000-line hard limit |
| Source lines | 9,813 (HTML + CSS + JS mixed) | 5,414 TS (logic only; styling via Tailwind CDN; chart.js + xlsx code-split) |
| Tests | **0** | **135** (1,819 LOC) |
| Type safety | Untyped inline JS | TypeScript strict; `tsc --noEmit` clean |
| Build / tooling | None (hand-edited HTML) | Vite bundle + Vitest (jsdom for render) |
| Compute vs UI | Mixed in `displayResults` + section fns | Headless `analyze.ts` (pure) separated from `render/` |

## Correctness / architecture improvements made

- **Globals eliminated.** Legacy used `window._wsPingEvents/_wsPongEvents/_wsServerPings` and `window.rawLogLines`; the revamp returns/passes that data — pure, independently testable functions.
- **WebSocket-health "second 226k-line scan" freeze designed out.** The revamp harvests WS heartbeat events in the *same single pass* as downtime detection, so that class of freeze cannot recur (legacy patched it via the globals above).
- **Bug Fix #1 carried correctly** — CMS `transactionId` read from the StartTx `responsePayload`, not the request payload.
- **Small fixes:** Boot Notifications missing fields render `N/A` instead of the legacy's literal `undefined`.
- **Spec drift surfaced:** FR-142 claims 24 protocol system checks; the source defines 21 — found during the port (source treated as canonical; to reconcile in `specs/requirements.md`).
- **Tests:** 0 → 99 across parse, detectors, health, protocol, WS, and every ported renderer (fixture-based).

## Honest caveats

1. **"Fewer lines" is not the goal and will not hold at completion.** With full tests + types + modular boilerplate, the finished revamp will likely exceed 9,813 total lines — but every file stays small, typed, and tested. The win is **structure + verifiability**, not raw count.
2. **"More efficient" is currently architectural, not benchmarked** (fewer passes, no globals, no re-scans). A head-to-head runtime benchmark is deferred to the parity gate if hard numbers are wanted.
3. **"Bug-free" → "bugs fixed where found + test-covered."** No software is provably bug-free; the evidence is the test suite + the Phase 5 parity gate against the live tool.

## Not yet ported (as of 2026-06-20)

- ⏸️ **Repeated-RemoteStart diagnostic** (Status section) — PARKED, fully documented for resume (`docs/superpowers/specs/2026-06-19-PARKED-remotestart-diagnostic.md`).
- **Phase 4:** Session Timeline per-tx modal (4-tab charts), Log Repository (IndexedDB + Google Drive), API log download.
- **Phase 5:** parity gate + deploy swap.

Everything else from the live tool — all 19 render sections, per-tx charts, the 6 Meter-Values analysis graphs (with enlarge/PNG-download), Excel export, log-context preview/download, theme — is ported. Tracked in `specs/roadmap.md` / `skills/WORKFLOW.md`.

## Change log

| Date | Phase | Sections | Tests | Note |
|---|---|---|---|---|
| 2026-06-18 | 3b-4a | 8/19 | 99 | Connector Stats + Transaction Summary; first comparison snapshot. |
| 2026-06-20 | 3 complete | 19/19 + charts + export | 135 | All sections + Chart.js (lazy) + SheetJS export (lazy) + context-viewer. 3b-3b parked. |
