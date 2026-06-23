# Design — Charge Point Initiated Operations Compliance (OCPP 1.6J §4)

> **Status:** Approved design (brainstorming) — 2026-06-23
> **Topic:** First dedicated compliance sub-section under the Parser's Protocol
> Compliance report, implementing the formal OCPP 1.6J **Section 4 — Operations
> Initiated by Charge Point** business-case matrix.
> **Source of rules:** `docs/business_case_compliance_check.md` (46 spec-cited
> test IDs derived from `knowledge/standards/ocpp-1.6/04-Operations-Initiated-by-Charge-Point.md`).
> **Next step:** writing-plans → phased implementation plan.

---

## 1. Problem & motivation

The Parser already ships a **Protocol Compliance** report (`src/app/protocol/runProtocolValidation.ts`,
§11) with **21 heuristic checks** across 5 groups (BOOT · RESP · TXC · STATUS · MV)
plus a per-transaction 10-stage lifecycle. These checks are useful but:

- They are **ad-hoc** — not traceable to specific OCPP 1.6J spec clauses.
- They carry **no formal Test IDs, spec references, or severity** classification.
- They cover a curated subset, not the full Section-4 conformance surface.

The goal is to make the Protocol Compliance section **stronger and more rigorous**
by adding **dedicated, spec-cited compliance sub-sections**, starting with
**Charge Point Initiated Operations (§4)**. The output is a real
**interoperability conformance report**: formal Test IDs, `§4.x` references,
explicit severity (Critical/Major/Minor/Informational), and per-rule audit logic
— the "exhaustive on compliance/protocol paths" tier from the operating
principles, and Standards-Before-Customization (OCPP first).

This is the **first of several** planned compliance packs (§5 CS-initiated
operations, §3 security profiles, etc. may follow). The design is therefore a
small **pluggable rule-pack framework**, not a one-off §4 module.

## 2. Scope

### In scope (this deliverable)
- A reusable compliance-rule framework (`src/app/compliance/`).
- The **full §4 rule-pack: all 46 rules**, tier-tagged (see §5).
- A new render **sub-section inside the existing Protocol Compliance section**.
- Reuse of the existing context-viewer (Preview/Download + yellow highlight) and
  Excel-export patterns.
- TDD unit tests per rule + a real-sample smoke test.

### Out of scope (future / explicitly excluded)
- §5 (CS-Initiated Operations), §3, and any other spec sections — future packs.
- **No change** to the existing 21-check `runProtocolValidation` engine or its
  lifecycle (the **parallel** decision — see §7).
- **No change** to the Type-Aware Validation (L1–L3) section (#20) or the
  typed-ocpp engine.
- No change to deploy posture (still `feat/parser-revamp`, not merged/deployed).
- Repeated RemoteStart (3b-3b), Drive sync (4c), API download (4e), Help modal —
  remain parked.

## 3. Key decisions (from brainstorming)

| # | Decision | Rationale |
|---|----------|-----------|
| D1 | **Parallel sub-section**, not superseding/augmenting the existing 21 checks | Lowest-risk; protects the live-parity goal; no regressions. Intentional overlap (e.g. pairing checks appear in both heuristic and formal reports) is acceptable for now; reconcile later. |
| D2 | **All 46 rules, tier-tagged** | Complete + traceable: every spec rule is visibly accounted for; nothing silently dropped. Honours the completeness/traceability principle. |
| D3 | **Rule-pack framework**, not a one-off §4 module | User intends "more dedicated compliance sections"; a pack pattern makes future sections additive with zero framework change. |
| D4 | **Runs inline** (no lazy-load) | Pure local logic over already-parsed frames — cheap. Unlike the typed-ocpp L1–L3 engine, no network/large bundle, so no code-split needed. |
| D5 | **Sibling top-level section** (new `SECTION_ORDER` entry after Protocol Compliance), **not** nested inside `renderProtocolCompliance` | Discovered at plan time: the orchestrator's section registry + already-idempotent context handler mean a sibling entry needs **zero edit to `protocolCompliance.ts`**, gets Excel export for free, and renders in the same visual spot. Removes the highest-risk touchpoint. Directly serves the regression-safety priority. |

## 4. Architecture

### 4.1 Module layout (new)

```
src/app/compliance/
  types.ts              # ComplianceRule, ComplianceResult, ComplianceReport, Severity, Tier, AffectedItem
  runCompliance.ts      # runs a rule-pack against the eval context → ComplianceReport
  rulepacks/
    cpInitiated.ts      # the 46 §4 rules (split per message-group if it nears the 2000-line limit)
```

Render side (new):
```
src/app/render/sections/
  cpInitiatedCompliance.ts   # collapsible sub-section block, reuses protocolCompliance.ts styling + contextViewer
```

### 4.2 Data contracts

```ts
export type Severity = 'Critical' | 'Major' | 'Minor' | 'Informational';
export type Tier = 'deterministic' | 'heuristic' | 'indeterminate';
// CheckStatus reused from src/app/protocol/types.ts: 'pass' | 'warn' | 'fail' | 'info'

export interface AffectedItem {
  label: string;            // e.g. message id, tx id, connector
  lineNumber?: number;      // 1-based raw-log line → enables Preview/Download context
}

export interface ComplianceRule {
  id: string;               // 'AUTH-002'
  specRef: string;          // '4.1'
  targetMessage: string;    // 'Authorize'
  invariant: string;        // the SHALL/SHOULD rule text (verbatim from the doc)
  auditLogic: string;       // human-readable "how we check it"
  severity: Severity;
  tier: Tier;
  evaluate(ctx: ComplianceContext): ComplianceEvalOutput;
}

export interface ComplianceEvalOutput {
  status: CheckStatus;
  details: string;          // result narrative (counts, offending ids, reason)
  affected: AffectedItem[];
}

export interface ComplianceResult extends ComplianceEvalOutput {
  id: string; specRef: string; targetMessage: string;
  invariant: string; auditLogic: string; severity: Severity; tier: Tier;
}

export interface ComplianceGroup {           // one per message type (AUTH, BOOT, …)
  messageType: string;                       // 'Authorize'
  prefix: string;                            // 'AUTH'
  icon: string;
  results: ComplianceResult[];
}

export interface ComplianceReport {
  packId: string;                            // 'ocpp-1.6j-section-4'
  packName: string;                          // 'Charge Point Initiated Operations (§4)'
  groups: ComplianceGroup[];
  summary: ComplianceSummary;
}

export interface ComplianceSummary {
  total: number;
  byStatus: { pass: number; warn: number; fail: number; info: number };
  bySeverity: Record<Severity, { pass: number; warn: number; fail: number; info: number }>;
  evaluated: number;                         // total − indeterminate/info
  weightedScore: number;                     // 0–100, Critical-weighted (see §4.4)
}
```

### 4.3 Evaluation context

`evaluate()` receives exactly what `runProtocolValidation` already consumes, so
this reuses the parser's existing output with **no pipeline change**:

```ts
export interface ComplianceContext {
  messageGroups: MessageGroups;     // frames grouped by action
  transactions: Transaction[];
  internalTxMap: InternalTxMap;
  rawLogLines: string[];            // for line-number context viewer
  // (parsed frames already carry req↔conf correlation: responsePayload, hasResp)
}
```

`runCompliance(pack, ctx)` iterates the pack's rules, calls each `evaluate()`,
groups results by message-type prefix, and computes the summary.

### 4.4 Weighted compliance score

Mirrors the approach in `validationMetrics.ts`. Each evaluated rule contributes
by severity weight (suggested: Critical 4, Major 2, Minor 1; Informational
excluded). `weightedScore = Σ(weight × passFraction) / Σ(weight) × 100`, where a
rule's passFraction is 1 for `pass`, 0 for `fail`, 0.5 for `warn`. `info`
(indeterminate) rules are excluded from `evaluated` and from the score so they
never penalise a charger for something the log cannot prove. Exact weights to be
confirmed during planning.

## 5. The 46 rules — tier assignment

All 46 are implemented. Tier governs how a result is presented, not whether it
exists. (Exact per-rule logic is specified in the implementation plan; counts
below are the design intent and may shift by ±1–2 during planning.)

### 🟢 Deterministic (~26) — real pass/warn/fail from frames we already have
- **Req→Conf pairing:** AUTH-002, DT-001, DIAG-001, FW-001, HEART-001,
  METER-001, START-001, STATUS-001, STOP-001.
- **Payload presence/content:** HEART-003 (`currentTime`), START-003
  (`transactionId`), DT-002 (UnknownVendor → no data field), DT-003
  (unsupported messageId → `UnknownMessageId`).
- **Transaction integrity:** AUTH-001 (charging only after accepted auth),
  AUTH-003 (stop idTag ≠ start idTag), METER-002 (txId ∈ active tx), METER-005
  (no MeterValues after closure), STOP-002 (txId ∈ active tx), STOP-003
  (`meterStop ≥ meterStart`).
- **Ordering / value:** METER-003 (chronological timestamps), METER-004
  (connectorId=0 = CP-level meter), STATUS-002 (connectorId=0 ∈ {Available,
  Unavailable, Faulted}), STATUS-004 (SuspendedEVSE precedence over SuspendedEV),
  STATUS-006 (EVCommunicationError only with Preparing/SuspendedEV/SuspendedEVSE/
  Finishing), BOOT-001 (BootNotification after reboot/reconnect), HEART-002
  (suppress false positive when another PDU sent within interval — informational).

### 🟡 Heuristic / inference-based (~14) — pass/warn/fail, flagged as inferred
- **Reservation context:** START-002 (reservationId SHALL exist if a reservation
  is being terminated) — heuristic because "a reservation is being terminated"
  requires CS-side ReserveNow context (§5), not fully present in a CP-only log;
  at most we validate a present reservationId and flag likely-missing cases.
- **Boot sequencing:** BOOT-002 (CP silence before Accepted/Pending), BOOT-003
  (cached offline msgs not bypassing boot), BOOT-004 (silence during retry
  interval), BOOT-005 (no responses while rejected), BOOT-006 (silence while
  pending unless TriggerMessage), BOOT-009 (retry-interval timing).
- **State machine:** STATUS-003 (connector state-transition matrix), STATUS-005
  (Unavailable persists across reboot), STATUS-007 (offline sync reports only
  current state+errors), STATUS-008 (offline sync preserves event order).
- **TriggerMessage dependency:** DIAG-002 / FW-002 (Idle only after
  TriggerMessage when not uploading/downloading).
- **Usage pattern:** AUTH-004 (Authorize only for charging authorization).

> Heuristic rules render normally but are **tier-badged** so a WARN reads as
> "worth a look," not a hard conformance failure. False-positive suppression is a
> first-class concern in their logic and tests.

### 🔴 Indeterminate (~6) — explicit "cannot prove from log" rows
- **Config-dependent:** STOP-004, STOP-005, STOP-006 and STATUS-009 — all depend
  on `StopTransactionOnEVSideDisconnect` / `UnlockConnectorOnEVSideDisconnect`
  configuration, which is **not present in the log**.
- **CSMS-side behavior:** BOOT-007, BOOT-008 (RemoteStart/Stop must not occur
  during Pending) — CSMS behavior the charger log may not fully witness.

> These render as `status: 'info'` rows with a fixed reason string
> (e.g. *"Indeterminate — depends on StopTransactionOnEVSideDisconnect config,
> not present in log"*), are **excluded from the weighted score**, and are
> visually distinct (— badge, 🔴 tier tag). Nothing is silently omitted.

## 6. Rendering & UX

A new **top-level collapsible section**, registered in `renderResults.ts`'s
`SECTION_ORDER` registry **immediately after the existing "Protocol Compliance"
entry** (title e.g. *"Protocol Compliance — CP-Initiated Operations (§4)"*). This
renders in the same place visually but requires **no edit to
`protocolCompliance.ts`** — the lowest-risk mount (decision D5, §3). Excel export
comes free via the registry's `exportTable`; context buttons auto-wire via the
orchestrator's single delegated handler. Visual language mirrors
`src/app/render/sections/protocolCompliance.ts`:

- **Sub-section header:** title "Charge Point Initiated Operations Compliance
  (OCPP 1.6J §4)", overall **weighted score badge**, status counts
  (pass/warn/fail/indeterminate), severity breakdown, and a **tier legend**
  (🟢 deterministic · 🟡 heuristic · 🔴 indeterminate).
- **10 collapsible message groups** (AUTH · BOOT · DT · DIAG · FW · HEART ·
  METER · START · STATUS · STOP), each a table:

  | Test ID | §Ref | Invariant | Severity | Tier | Status | Details | Context |
  |---------|------|-----------|----------|------|--------|---------|---------|

- **Status badges** reuse the existing `pass/warn/fail/info` styling.
- **Context column:** Preview/Download buttons (via `contextViewer.ts`
  `data-ctx-*` delegated handler) appear for any finding carrying a
  `lineNumber`; the offending raw-log line is highlighted **yellow** (`#fde047`)
  in the preview — identical to the L1–L3 validation context viewer.
- **Excel export:** a per-section "Export to Excel" header button consistent with
  the other 17 table sections (xlsx lazy/code-split).
- Theme-aware (light/dark) like all Phase-3 sections.

## 7. Relationship to existing engines (parallel — D1)

- `runProtocolValidation` **engine** (21 heuristic checks + lifecycle) —
  **logic unchanged**. The pure compute path is not edited.
- `protocolCompliance.ts` **render file** — **unchanged** (decision D5: the §4
  matrix mounts as a sibling `SECTION_ORDER` entry, not nested inside this file).
- Type-Aware Validation L1–L3 (#20, typed-ocpp) — **unchanged**.
- New §4 compliance — **rendered as a sibling top-level section** registered in
  `SECTION_ORDER` immediately after Protocol Compliance.

The only two existing files edited are **additive registration points**:
`analyze.ts` (add a `cpCompliance` field to `AnalysisResult`) and
`renderResults.ts` (one import + one `SECTION_ORDER` entry).

Intentional overlap (the pairing checks exist in both the heuristic report and
the formal §4 matrix) is **accepted for this cut**. A future reconciliation pass
may dedupe or retire heuristic checks once the formal matrix proves itself; that
is explicitly **not** part of this work.

## 8. Data flow

```
upload → parse → correlate → group (existing pipeline, unchanged)
                                   │
                                   ▼
        ComplianceContext (messageGroups, transactions, internalTxMap, rawLogLines)
                                   │
                 runCompliance(cpInitiatedPack, ctx)   ← pure, inline, no network
                                   │
                                   ▼
                          ComplianceReport
                                   │
                                   ▼
   render: cpInitiatedCompliance.ts sub-section (inside Protocol Compliance)
```

## 9. Testing strategy (TDD)

- **Per-rule unit tests:** each of the 46 rules gets at least a passing case and a
  violating case (~2–3 cases/rule) with hand-crafted frames. Heuristic rules add
  false-positive-suppression cases. Indeterminate rules assert the fixed `info`
  result + reason string.
- **Summary tests:** status/severity rollups and weighted-score math (incl. that
  `info` rows are excluded from `evaluated` and the score).
- **Real-sample smoke test:** run the pack over `data/samples/` logs → assert
  zero crashes and no false `fail` on known-good logs.
- **Render tests:** sub-section mounts, groups collapse/expand, context buttons
  carry correct `data-ctx-*`, Excel button present — consistent with existing
  section render tests.
- Build gates: `tsc` clean + `vite build` clean + full suite green (current
  baseline: 273 tests).

### 9.1 Regression safety — not breaking what already works

The work is **additive by construction**, which is the primary protection:

- New logic lives in **new files** (`src/app/compliance/*`,
  `cpInitiatedCompliance.ts`); the existing 21-check engine and the L1–L3 engine
  are never edited.
- `runCompliance` is a **pure, read-only consumer** of already-parsed data
  (`messageGroups / transactions / internalTxMap / rawLogLines`). It never
  mutates the parse pipeline, so it cannot corrupt the data other sections
  depend on.
- Reused types (`CheckStatus`, `MessageGroups`, `Transaction`) are **consumed,
  not changed** — `tsc` flags any accidental contract drift across the tree.

Additive ≠ zero-contact. The real integration touchpoints and their guards:

| Touchpoint | Why it's a risk | Guard |
|---|---|---|
| **`renderResults.ts` registry edit** | One new import + one `SECTION_ORDER` entry. Additive, but the orchestrator drives every section | A render test asserts the new section title appears once, in the right order (after Protocol Compliance), and that all pre-existing sections still render |
| **`analyze.ts` field add** | New `cpCompliance` field on `AnalysisResult` + one `runCompliance(...)` call | Purely additive to a typed struct; `tsc` guarantees no consumer breaks; existing `analyze` tests stay green |
| **Shared context-viewer handler** | `contextViewer.ts` uses one delegated handler keyed by `data-ctx-*` (already idempotent via a `Symbol`; prior dup-listener bug fixed, obs 401) | **Reuse `singleContextButtons()`** rather than invent new attributes; give each finding a unique `label`/`line`/`index`; test buttons carry correct `data-ctx-*` |
| **Shared Excel export** | Section gets export via the registry's `exportTable` (no new util code) | Existing export tests stay green; render test asserts the export button + target table id are present |
| **Inline (non-lazy) compute on large logs** | Runs synchronously over all frames on render | Smoke-test render over the largest `data/samples/` log; no crash, no perceptible regression |

`protocolCompliance.ts` is **not edited** under decision D5, so the previous
"characterization test on the mounted section" guard is no longer needed.

Gates that catch a regression, in order:

1. **The 273-test suite must stay green** — the primary net; any existing test
   breaking is proof of unintended coupling.
2. **`tsc` clean + `vite build` clean** on every step.
3. **Characterization test** locking the edited `protocolCompliance.ts` output.
4. **Real-sample smoke test** over `data/samples/` — no crashes, no false
   failures on known-good logs, existing sections still render.
5. **Skill-chain `/review` + `/qa`** — the formal regression/QA phase before any
   merge.
6. **Git/deploy isolation** — all on `feat/parser-revamp`, not on `main`, not
   deployed; fully reversible.

## 10. Risks & mitigations

| Risk | Mitigation |
|------|-----------|
| Heuristic rules produce false positives on edge-case logs | Tier-badge as inferred; conservative thresholds; explicit FP-suppression tests; warn (not fail) where ambiguous. |
| Rule-pack file exceeds the 2000-line hard limit | Split `cpInitiated.ts` per message-group into `rulepacks/cpInitiated/*.ts`; the framework is group-agnostic. |
| Overlap confuses users (same check in two reports) | Clear sub-section heading + tier/severity columns make the formal matrix visibly distinct; reconciliation deferred and documented. |
| Spec drift vs. the source doc | Invariant text ported verbatim from `business_case_compliance_check.md`; doc is cited per rule via `specRef`. |
| Indeterminate rows misread as failures | Distinct `info` badge + 🔴 tier + explicit reason; excluded from score. |

## 11. Success criteria

- All 46 §4 rules implemented and tier-tagged; indeterminate rows present and
  excluded from the score.
- New sub-section renders inside Protocol Compliance, theme-aware, with
  Preview/Download context + Excel export.
- Existing 21-check engine, lifecycle, and L1–L3 section unchanged (no
  regressions).
- TDD coverage per rule; real-sample smoke test passes; `tsc` + `vite build`
  clean; full suite green.
- Framework is pack-extensible (adding §5 later requires only a new rule-pack +
  sub-section, no framework change).

## 12. Open items for the implementation plan

- Confirm exact severity weights for the weighted score.
- Confirm whether the §4 sub-section gets its own collapsible tab vs. a stacked
  block under the existing tabs.
- Finalise per-rule audit logic and the exact line-number selection for each
  rule's `AffectedItem` (which frame's line to anchor the context viewer on).
- Decide final tier counts (the ~28/12/6 split may shift ±1–2 once each rule's
  logic is pinned down).
