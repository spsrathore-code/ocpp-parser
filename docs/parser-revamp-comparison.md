# Parser Revamp — Legacy vs Revamp Comparison (Phase 5 Parity Gate)

> **Phase 5 parity-gate audit — 2026-06-21.** Feature-by-feature comparison of the revamp against legacy v2026.05.14. **Audit only — no deploy swap** (held pending the findings below + user approval).
> Legacy = `archive/parser-v2026.05.14/OCPP_Parser_Complete_2026.05.14.html` (9,813 lines, v2026.05.14). Revamp = `feat/parser-revamp`.

## Verdict

**At functional parity for all non-parked features, with ONE newly-found gap that should be closed before any deploy: the Help modal is not ported.** Three features are deliberately parked (tracked); two are intentional source-canonical drifts. Details below.

| Status | Count | Meaning |
|---|---|---|
| ✅ At parity | 19/19 render sections + all analysis/UI subsystems | Ported, tested, `tsc`/build clean |
| ❌ **Gap (newly found)** | **1** | **Help modal — button renders, no modal/handler/content** |
| ⏸️ Parked (tracked) | 3 | 3b-3b RemoteStart · 4c Drive sync · 4e API download |
| ⚠️ Drift (intentional) | 2 | Timeline 10-vs-11 markers · Protocol 21-vs-24 checks |

## Snapshot

| Dimension | Legacy (v2026.05.14) | Revamp (Phase 5 gate) |
|---|---|---|
| Files | **1** monolithic `.html` | **69** focused TS modules |
| Largest file | 9,813 lines (one file) | **541** lines (`runProtocolValidation.ts`) — under the 2,000-line hard limit |
| Source lines | 9,813 (HTML + CSS + JS mixed) | 7,399 TS (logic only; Tailwind CDN; chart.js + xlsx code-split) |
| Tests | **0** | **223** (2,848 LOC) |
| Type safety | Untyped inline JS | TypeScript strict; `tsc --noEmit` clean |
| Build / tooling | None (hand-edited HTML) | Vite bundle + Vitest (jsdom for render) |
| Compute vs UI | Mixed in `displayResults` + section fns | Headless `analyze.ts` (pure) separated from `render/` |

## Feature-parity matrix — the 19 §19.4 render sections

| # | Section | Revamp module | Status |
|---|---|---|---|
| 1 | Debug Info | `render/sections/debugInfo.ts` | ✅ |
| 2 | Boot Notifications | `bootNotifications.ts` | ✅ (missing fields → `N/A`, not legacy's `undefined`) |
| 3 | Heartbeats | `heartbeats.ts` | ✅ |
| 4 | Status Notifications | `statusNotifications.ts` | ✅ — **⏸️ Repeated-RemoteStart diagnostic sub-feature parked (3b-3b)** |
| 5 | Start Transactions | `startTransactions.ts` | ✅ |
| 6 | Stop Transactions | `stopTransactions.ts` | ✅ |
| 7 | Transaction Summary | `transactionSummary.ts` | ✅ (+ View Chart + 📊 Timeline buttons) |
| 8 | Connector Stats | `connectorStats.ts` | ✅ |
| 9 | Transaction & Meter Values | `meterValues.ts` | ✅ (+ 6 analysis graphs, enlarge/PNG) |
| 10 | Events | `events.ts` | ✅ (+ context Download) |
| 11 | Alerts | `alerts.ts` | ✅ (+ context Download) |
| 12 | Downtime Report | `downtimeReport.ts` | ✅ (+ context Preview/Download) |
| 13 | Power Restore Missing Sync | `syncFlags.ts` | ✅ |
| 14 | Emergency Stop Release | `syncFlags.ts` | ✅ |
| 15 | Fault Status Summary | `faultStatusSummary.ts` | ✅ |
| 16 | Incomplete Transactions | `incompleteTransactions.ts` | ✅ |
| 17 | Energy Dispense Check | `energyDispense.ts` | ✅ |
| 18 | Protocol Compliance | `protocolCompliance.ts` | ✅ — **⚠️ 21 system checks (spec FR-142 says 24; source-canonical)** |
| 19 | WebSocket Health | `webSocketHealth.ts` | ✅ (single-pass WS harvest; legacy freeze designed out) |

## Feature-parity matrix — subsystems (requirements Sections 2–19)

| Area | Revamp | Status |
|---|---|---|
| S2 File upload & processing | multi-file upload, `.txt/.log` (matches legacy `accept`) | ✅ · **API download ⏸️ parked (4e)** |
| S3 OCPP message parsing | `parse/` (parseLines, correlate, groupMessages) | ✅ |
| S4 Transaction management | `parse/processTransactions.ts` | ✅ |
| S5 Meter Values analysis | `health/`, `meterValues.ts` + graphs | ✅ |
| S6 Data visualization & reporting | 19 sections + charts + Excel export + context-viewer + theme | ✅ |
| S7 Message-type analysis | message groups | ✅ |
| S8 Advanced message types | *legacy marks PLANNED — not in legacy* | N/A (out of parity scope) |
| S9 Downtime analysis | `detect/` (downtime engine, 4 fault types) | ✅ |
| S10 Transaction health | `health/` (connector stats, energy dispense, temp/current) | ✅ |
| S11 Protocol compliance | `protocol/runProtocolValidation.ts` | ✅ (21 checks — see drift) |
| S12 Log Repository | `repository/` + `render/repository/` (IndexedDB + gzip, panel, filter, tags, load/delete/bulk) | ✅ **local** · **☁️ Drive sync ⏸️ parked (4c)** |
| S13 Session Timeline | `render/timeline/` 4-tab modal | ✅ (10 markers — see drift; dark-only by parity) |
| S14 WebSocket health | `ws/wsHealth.ts` | ✅ |
| S15 Offline replay flag | `Transaction.isOfflineReplay` + replay markers | ✅ |
| S16 Internal tx-id mapping | `internalTxMap` (Bug Fix #1 carried) | ✅ |
| S17 Future enhancements | *planned — not in legacy* | N/A |
| S18 Additional features (v2.7) | repository bulk delete ✅ · **API download ⏸️ (4e)** · **manual Drive sync ⏸️ (4c)** | partial (parked items) |
| UI chrome — theme toggle | `render/theme.ts` (dark/light + localStorage) | ✅ |
| **UI chrome — Help modal** | `help-btn` rendered in `shell.ts` | ❌ **GAP — button present, no modal/handler/content** |

## ❌ Gap found by this audit — Help modal (untracked until now)

- **Legacy:** `help-btn` (HTML line 57) → `help-modal` (line 191, a `max-w-4xl` scrollable content modal: "How to use this tool", usage sections) wired by a handler (lines 254–266).
- **Revamp:** `shell.ts` renders the `❔ Help` button (`id="help-btn"`) but there is **no `help-modal`, no handler, and no content** anywhere in `src/`. Clicking it does nothing.
- **Severity:** Minor functionally (the tool works without it) but it is a **visible parity break** — a button that does nothing. Must port (or remove the button) before the deploy swap.
- **Effort:** small, local, fully testable — a self-contained modal port like the others. Recommend a short **Phase 4f / pre-deploy** task: port `help-modal` content + wire open/close (mirror the existing modal patterns).

## ⏸️ Parked (deliberate, tracked) — real parity gaps until resolved

1. **3b-3b Repeated-RemoteStart diagnostic** (Status sub-feature) — pure local analysis; resume notes `docs/superpowers/specs/2026-06-19-PARKED-remotestart-diagnostic.md`. *Buildable locally any time.*
2. **4c Google Drive sync** (Log Repository cloud half) — needs hosted `https://` + OAuth; do during/after the deploy. Schema carries `driveFileId` (null).
3. **4e API download** (EVSE folder-save + streaming progress) — needs a reachable EVSE at `http://{IP}:3001`; network/hardware-dependent.

## ⚠️ Intentional drift (source-canonical decisions)

1. **Session Timeline markers — 10, not 11.** Spec FR-215 lists 11 markers incl. a Phantom-Connection marker; legacy v2026.05.14 implements 10 (no Phantom). Ported the 10 (source-canonical). To resolve in `specs/requirements.md`, or add Phantom as an enhancement.
2. **Protocol compliance — 21 system checks, not 24.** Spec FR-142 says 24; source defines 21. Ported the 21 (source-canonical).
3. **Improvement (not a regression):** missing Boot fields render `N/A` instead of the legacy's literal `undefined`.

## Deploy-readiness recommendation

> **Update 2026-06-21:** the **async-parse responsiveness regression is now CLOSED** — `parseLinesAsync` restores the legacy chunked/yielding parse (1000-line chunks + event-loop yields + progress bar), so large files no longer block the UI. The deeper WS-rescan freeze was already designed out. Remaining blocker for deploy is the Help modal.

**Not ready for the deploy swap yet.** Blockers, in order:
1. **Port the Help modal** (the one true gap) — or consciously drop the button.
2. **Decide on the parked items:** ship-without (accept Drive/API-download/RemoteStart absent at launch) vs. build 3b-3b first (it's local + cheap). 4c/4e genuinely need the hosted/hardware context, so they can follow the deploy.
3. **Reconcile or accept the two drifts** in `specs/requirements.md` so the spec and the live tool agree.
4. (Optional) a head-to-head **runtime benchmark** + a **golden-master output diff** on real sample logs, if hard parity evidence is wanted before swapping.

Once (1) is done and (2)/(3) are decided, the deploy swap (copy build → GitHub Pages) is a small, well-understood step.

## Change log

| Date | Phase | Sections | Tests | Note |
|---|---|---|---|---|
| 2026-06-18 | 3b-4a | 8/19 | 99 | Connector Stats + Transaction Summary; first comparison snapshot. |
| 2026-06-20 | 3 complete | 19/19 + charts + export | 135 | All sections + Chart.js (lazy) + SheetJS export (lazy) + context-viewer. 3b-3b parked. |
| 2026-06-21 | 4a/4b/4d | 19/19 + repository + timeline | 223 | Log Repository (local) + Session Timeline modal. 4c/4e parked. |
| 2026-06-21 | **5 parity gate** | audit | 223 | Feature-parity matrix finalized. **Found: Help modal not ported.** Deploy held. |
| 2026-06-21 | post-gate | — | 229 | **Async-parse responsiveness restored** (`parseLinesAsync` — chunked + yield + progress bar). One deploy blocker (Help modal) remains. |
