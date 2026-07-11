# Parser Phase 6 — Validation Engine Integration (Architecture & Test Plan)

> **Phase 2 (PLAN) output** · 2026-06-22 · feature: Parser ⟶ OCPP Validation Engine (L1–L3) integration.
> **Think input:** `docs/TYPEVALIDATION.md` (engine design spec) + `requirements.md §19.7`.

## Inputs consumed (so the prep is provably used)

| Prep artifact | What this plan takes from it |
|---|---|
| `docs/TYPEVALIDATION.md` **§5** | The exact API + result contract — `validateBatch`, `ValidationReport`/`MessageResult`/`ExchangeResult`/`Violation`. This integration consumes that surface; it does not invent one. |
| `docs/TYPEVALIDATION.md` **§6** + `requirements.md §19.7` | Runtime schema source = typed-ocpp's bundled OCA schemas; the 56 local `src/schemas/ocpp-1.6/*.json` = reference + CI diff-check (already guarded by `tests/integration/schema-drift.test.ts`). |
| `docs/TYPEVALIDATION.md` **§9** | L4 stays a **stub** this phase (`registerProtocolRules` exists, no rules registered). L4 rule catalog (seeded from the Parser's Protocol Compliance Report + L-001/2/3 + the standards files) is engine Phase 2. |
| `knowledge/standards/ocpp-1.6/J04-RPC-Framework.md` | Envelope shapes CALL[2]/CALLRESULT[3]/CALLERROR[4] (§4.1.3), UniqueId match, 10 error codes (Table 7) — the engine encodes these; the integration must not mangle frames. The standards files are the verification reference at `/review` + `/qa`. |
| `knowledge/decisions/2026-06-21-validation-engine-consumption-model.md` | Consumption = **direct monorepo import** (engine now at `src/services/validation/`, co-located via merge `8c5cc9f`). |
| Engine `/cso` note (WORKFLOW.md) | **Render violations as `textContent`, never `innerHTML`** — `Violation.message`/`detail` may carry raw log payload (XSS / J06 sensitive-data risk). |

## Goal

Add a **Type-Aware Validation (L1–L3)** capability to the revamped Parser: feed the already-parsed OCPP frames into the in-repo Validation Engine and render the resulting `ValidationReport` (frame validity, schema conformance, request↔response correlation, orphans, latency) as a new results section. **New capability beyond v2026.05.14 parity** — flagged as such; it does not change any existing section.

## Architecture

**Files created:**
- `src/app/render/sections/validation.ts`
  - `framesFromMessages(messages: ParsedMessage[]): { frame: RawFrame; ts?: string }[]` — **pure** adapter. Since `OcppRawMessage` (`[msgType,msgId,action,payload]`) ≡ engine `RawFrame` (`unknown[]`), this is `messages.map(m => ({ frame: m.message, ts: m.timestamp }))`. Unit-testable without loading the engine.
  - `renderValidationSection(r: AnalysisResult): HTMLElement` — renders the section shell + an on-demand **"Run Type-Aware Validation (L1–L3)"** button. On click: **lazy-import** the engine, run `validateBatch(framesFromMessages(r.messages))`, render the report (cards + tables) into the section body.
  - `renderValidationReport(body: HTMLElement, report: ValidationReport): void` — pure-ish DOM builder for the report (summary cards + violations table + exchanges table), **all cells via `el({text})` (textContent), never innerHTML**.
- `tests/unit/validationSection.test.ts` — adapter + report-render tests (jsdom).

**Files modified (additive only — no existing behavior changed):**
- `src/app/render/renderResults.ts` — add one `SECTION_ORDER` entry **after** WebSocket Health (the new section #20; legacy §19.4 ends at 19).

**Consumption + bundling:** direct import, but **dynamic** — `const { validateBatch } = await import('../../services/validation')`. The engine pulls in `typed-ocpp` (~822 kb); a static import would bloat the initial bundle. Dynamic import = Vite code-splits it into its own chunk, loaded only when the user runs validation (same pattern as `chart.js` / `xlsx`).

## Data flow (text diagram)

```
upload → parseLinesAsync → analyze() → AnalysisResult.messages : ParsedMessage[]
                                              │  (each .message = [2|3|4, id, action?, payload])
   user clicks "Run Type-Aware Validation"    │
                                              ▼
   framesFromMessages(r.messages) ──► [{ frame: m.message, ts: m.timestamp }, …]
                                              ▼
   await import('src/services/validation')  (lazy, code-split)
                                              ▼
   validateBatch(frames) ──► ValidationReport { messages[], exchanges[], summary }
                                              ▼
   renderValidationReport(body, report)  ──►  summary cards + violations table + exchanges table
                                              (textContent only)
```

The existing `analyze()` pipeline is **untouched**; validation reads `r.messages` and renders into its own section. No new parsing.

## Decisions to confirm

1. **Execution model — on-demand button (recommended)** vs auto-run-after-parse. Recommend on-demand: 822 kb shouldn't load on every parse, and a large log's `validateBatch` is synchronous (could briefly block). On-demand keeps the default fast; the section invites the user to run it. *(If auto-run is preferred, we lazy-load + run async after render and add a spinner — also viable, more bundle/CPU on every parse.)*
2. **Placement — new section #20 after WebSocket Health.** It's distinct from the Parser's heuristic "Protocol Compliance" (section 18, which is L4-ish heuristics); this is L1–L3 type-aware validation. Keep them separate.
3. **Large-log validation** stays synchronous this phase; if `/benchmark` shows it blocking on 10k+ frames, chunk it like `parseLinesAsync` (follow-up, not Phase 6 scope).

## Edge cases (≥5)

| # | Case | Expected |
|---|---|---|
| 1 | **Empty log** (no messages) | `validateBatch([])` → empty report; section shows "No OCPP messages to validate." |
| 2 | **Malformed frame** (e.g. `[2,"id"]`, wrong `MessageTypeId`) | L1 `FRAME_INVALID` violation rendered |
| 3 | **Schema violation** (StatusNotification missing `connectorId`, wrong type) | L2 `SCHEMA_VIOLATION` with JSON-pointer `path` |
| 4 | **Orphan call** (Call, no CallResult) / **orphan response** | L3 exchange `orphan-call` / `orphan-response` (`UNMATCHED_CALL`/`UNMATCHED_RESPONSE`) |
| 5 | **Result mismatch** (response action ≠ originating Call's action) | L3 `RESULT_MISMATCH` |
| 6 | **CallError** frame `[4,id,errorCode,desc,details]` | classified `CallError`; envelope validated |
| 7 | **>10,000-frame log** | report renders; sync validate may briefly block (decision #3) |
| 8 | **Violation text contains HTML/log payload** | rendered as `textContent` — no XSS (engine /cso note) |

## OCPP compliance check (J04 / §7 / §9)

- **Envelopes:** CALL `[2,UniqueId,Action,Payload]`, CALLRESULT `[3,UniqueId,Payload]`, CALLERROR `[4,UniqueId,ErrorCode,ErrorDescription,ErrorDetails]` (J04 §4.1.3) — validated at L1 by the engine. The integration MUST pass `m.message` **unmodified** as the frame (no re-shaping).
- **Schemas (L2):** all 56 OCPP 1.6J actions via typed-ocpp's bundled OCA schemas (§19.7); drift guarded by `schema-drift.test.ts`.
- **Correlation (L3):** request↔response by UniqueId (J04 §4.1.3); 10 error codes (J04 Table 7) for CallError.
- The compliance logic lives in the engine (already `/qa`'d: 788 real frames, 0 false violations). The integration is correct iff it (a) passes frames faithfully and (b) renders the report accurately. Verified at `/review` + `/qa` against `knowledge/standards/ocpp-1.6/`.

## Test plan (Given / When / Then)

1. **Adapter fidelity** — Given `r.messages` with N parsed frames, when `framesFromMessages(r.messages)`, then it returns N `{frame,ts}` items where `frame === m.message` and `ts === m.timestamp` (no mutation).
2. **Valid pair** — Given a BootNotification Call + matching CallResult, when validated, then summary `valid ≥ 2`, the exchange `status: 'matched'`, 0 violations.
3. **Schema violation** — Given a StatusNotification Call missing `connectorId`, when validated, then a `MessageResult` with an L2 `SCHEMA_VIOLATION` whose `path` points at the missing field.
4. **Orphan** — Given a Call with no response, when validated, then an `ExchangeResult` `status: 'orphan-call'`.
5. **Malformed frame** — Given `[2,"id"]`, when validated, then an L1 `FRAME_INVALID` violation.
6. **Empty** — Given `[]` messages, when the section renders + run is clicked, then the empty-state text shows and no error throws.
7. **Render is XSS-safe** — Given a violation `message` containing `<img onerror>`, when rendered, then it appears as literal text (assert `textContent`, and that no `<img>` element was created).
8. **Section is additive** — Given a normal log, when results render, then all 19 existing sections render identically and the validation section appears after WebSocket Health.
9. **Lazy-load** — Given a fresh page load with no validation run, when `vite build` runs, then `typed-ocpp` is in a **separate chunk** (not the main bundle).

## File-size check

`validation.ts` is expected ≈ 200–300 lines (adapter + section + report renderer). No file approaches the 2000-line limit. No existing file grows materially (one `SECTION_ORDER` entry).

## Build approach (decided after this spec is approved)

Per the consumption decision + recent cost lesson: this is novel work, so a proper spec (this doc) first. The build itself is small and well-bounded (1 new file + 1 line in the orchestrator + tests) → **inline execution** is appropriate, with the test plan above as the gate. Subagent review reserved if scope grows.

---

**Does this architecture and test plan look right?** Open decisions for your call: (1) on-demand button vs auto-run, (2) new section #20 after WebSocket Health, (3) large-log validation stays sync for now.
