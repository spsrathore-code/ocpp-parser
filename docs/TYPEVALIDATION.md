# OCPP Validation Engine — Design Spec (Type-Aware Validation)

**Status**: Design / brainstorm output — not yet implemented
**Version**: 0.1 (draft) · **Date**: 6 June 2026
**Author**: Ador Digatron Engineering
**Scope of this doc**: the shared **OCPP Validation Engine** only. Multi-format parsing and L4 protocol/state validation are explicitly deferred (see §2, §9).

---

## 0. Suite Context (where this fits)

This engine is the **shared core** of a planned OCPP tool suite (built as one mega-repo). The five tools are independent products but share OCPP types, schemas, and validation:

| Tool | Role | Build/adopt | Notes |
|---|---|---|---|
| **OCPP Validation Engine** | Type-aware message validation (this doc) | **Build** on `typed-ocpp` | Shared core; consumed by all others |
| **Parser** | Log analysis / diagnostics | Existing tool → revamp | `src/app/OCPP_Parser_Complete_…html`; will consume this engine |
| **CMS (CSMS)** | Central system / server | Build (own) | Node server; consumes engine to validate incoming charger traffic |
| **Charger Emulator** | Simulated charge point(s) | **Candidate: adopt/fork SAP simulator** | See below |
| **Training Emulator** | Teaching tool | Build, likely on the emulator | Demonstrates correct vs. incorrect OCPP flows |

> **Recorded find — Emulator box:** [SAP `e-mobility-charging-stations-simulator`](https://github.com/SAP/e-mobility-charging-stations-simulator) — a mature (217★, 93 forks, ~211 releases, last release 2 Jun 2026), Apache-2.0, TypeScript/Node charge-point simulator supporting OCPP 1.6 + 2.0.1. It is a **leading candidate to adopt/fork for the Charger Emulator**, not for this validation engine (its validation is internal, not a reusable library). It acts as a charge point (client) and needs a CSMS to talk to — pairs naturally with the suite's own CMS. It also has an `ocpp-server@v4.8.0` release tag worth checking for a mock-server component relevant to the CMS. Even if not adopted, it is a high-quality **reference architecture** for isomorphic OCPP 1.6/2.0.1 handling.

---

## 1. Purpose & Scope

Provide a single, reusable engine that answers not just *"is this valid JSON?"* but *"is this a **protocol-correct** OCPP message exchange?"* — correct frame, schema-valid payload, and a response that genuinely matches its request.

**In scope (L1–L3):**
- Validate OCPP 1.6J RPC **frame** structure.
- Validate each payload against the **official OCPP 1.6J JSON Schema** for its action.
- **Pair** requests with responses by `MessageId`, flag orphans, report latency/RTT.

**Out of scope (deliberately):**
- **Multi-format parsing** (`.txt/.log/.csv/.xlsx`, stripping log prefixes, isolating the JSON array). The engine receives **already-extracted message arrays**. Parsing is the Parser tool's concern and is handled separately.
- **L4 protocol/state-machine validation** (legal transitions, lifecycle rules). Deferred; the engine exposes a defined **extension point** (§9).

---

## 2. The Validation Ladder (L1–L4)

| Layer | Question it answers | This engine | Source |
|---|---|---|---|
| **L1 Frame** | Is it a well-formed `[2,…]` Call / `[3,…]` CallResult / `[4,…]` CallError? | ✅ Phase 1 | `typed-ocpp` |
| **L2 Schema** | Does the payload conform to that action's OCPP 1.6J schema? | ✅ Phase 1 | `typed-ocpp` (Ajv + OCA schemas) |
| **L3 Correlation** | Does the response belong to its request and match its action? + orphans + latency | ✅ Phase 1 | `typed-ocpp` `checkCallResult` + our tracker |
| **L4 Protocol/state** | Is the message *legal given context* (connector/transaction state)? | 🔌 Extension point (Phase 2) | Our rule catalog (§9) |

L4 is where the Parser's existing **Protocol Compliance Report** and diagnostic patterns **L-001 / L-002 / L-003** already live heuristically; Phase 2 consolidates them into a formal rule catalog.

---

## 3. Library Decision — `typed-ocpp`

**Chosen:** [`typed-ocpp`](https://github.com/jacoscaz/typed-ocpp) (MIT) — the only true *reusable validation library* among the options evaluated.

**Verified capabilities (covers L1–L3 exactly):**
- OCPP **1.6, 2.0.1, 2.1** via `OCPP16` / `OCPP20` / `OCPP21` namespaces (we use `OCPP16` now; 2.0.1 is a future lever).
- `validate()`, `validateCall()`, `validateCallResult()`, `validateCallError()` — frame + schema validation.
- `checkCallResult()` — **request↔response matching** (validates a CallResult against its originating Call; until then a result is an `UncheckedCallResult`).
- Type guards `isCall()` / `isCallResult()` / `isCallError()` + full TypeScript types.
- Bundles the **official OCA JSON Schemas**, **Ajv** under the hood. MIT license.

**Caveat:** small project (~7★, 1 fork). For a *foundational* dependency this is a real risk → mitigated by vendoring (§11).

**Alternative evaluated — SAP simulator:** set aside *for validation* because its validation is **internal to the simulator, not exposed as a library** (you cannot import it). Recorded instead as the Emulator-box candidate (§0).

**What we use vs. don't:** we use the validation + matching + type-guard surface. We do **not** use `ChargingManager` (experimental; client/server orchestration we don't need here).

### 3.1 Consumption model (how the library physically lives)

- **No runtime fetching — ever.** The GitHub/npm repo is the *install source*, used **once** at build time. The tool never calls GitHub at runtime.
- **Local, two options:**
  - **npm dependency, pinned** to an exact version + committed lockfile → lands in `node_modules/`, bundled into the shipped artifact. *(Default.)*
  - **Vendored** — copy the validation modules into `src/vendor/typed-ocpp/` (MIT permits it). *(Insurance for the small-project risk.)*
- **Decision:** start npm-pinned + lockfile; **plan to vendor** (it's tiny + MIT) so a maintainer disappearing or a breaking release cannot break the suite's core.

---

## 4. Architecture

A single **isomorphic TypeScript package** (Node + browser-bundle) with three internal units, each independently testable:

```
                 already-extracted frames
                          │
        ┌─────────────────▼──────────────────┐
        │ messageValidator   (L1 + L2)        │  ← wraps typed-ocpp
        │  validateCall / validateCallResult  │
        │  validateCallError / type guards    │
        └─────────────────┬──────────────────┘
                          │ MessageResult
        ┌─────────────────▼──────────────────┐
        │ exchangeTracker    (L3)             │  ← our code
        │  index by MessageId · pair Call↔    │  ← uses checkCallResult
        │  Result/Error · orphans · latency   │
        └─────────────────┬──────────────────┘
                          │ ExchangeResult[]
        ┌─────────────────▼──────────────────┐
        │ protocolValidator  (L4 — STUB)      │  ← interface only (Phase 2)
        └─────────────────────────────────────┘
                          │
                   ValidationReport  → consumers (Parser, CMS, Emulators)
```

| Unit | Responsibility | Depends on |
|---|---|---|
| `messageValidator` | L1 frame + L2 schema for a single frame; classify kind/action | `typed-ocpp` |
| `exchangeTracker` | L3 — pair requests↔responses by `MessageId`, detect orphans, compute latency/RTT | `messageValidator`, `typed-ocpp.checkCallResult` |
| `protocolValidator` | L4 stub — defined interface, no rules yet | — |

---

## 5. Public API & Result Contract

Consumer-agnostic so the Parser, CMS, and emulators read identical shapes. *(Illustrative TypeScript — finalised at implementation.)*

```ts
type RawFrame = unknown[];                         // e.g. [2,"id","BootNotification",{...}]
type MessageKind = 'Call' | 'CallResult' | 'CallError';

interface Violation {
  layer: 'L1' | 'L2' | 'L3';
  code: string;          // FRAME_INVALID | SCHEMA_VIOLATION | UNMATCHED_CALL | RESULT_MISMATCH | …
  message: string;       // human-readable
  path?: string;         // JSON pointer into payload (schema errors)
  detail?: unknown;      // raw Ajv error, etc.
}

interface MessageResult {
  ok: boolean;
  kind?: MessageKind;
  action?: string;       // OCPP action (Calls)
  messageId?: string;
  violations: Violation[];
}

interface ExchangeResult {
  messageId: string;
  action?: string;
  status: 'matched' | 'orphan-call' | 'orphan-response' | 'mismatch';
  latencyMs?: number;    // response.ts − call.ts when both present
  violations: Violation[];
}

interface ValidationReport {
  messages: MessageResult[];
  exchanges: ExchangeResult[];
  summary: {
    total: number; valid: number; invalid: number;
    orphanCalls: number; orphanResponses: number;
    avgLatencyMs: number | null;
  };
}

// --- API ---
function validateMessage(frame: RawFrame): MessageResult;                 // L1+L2, stateless

class ExchangeTracker {                                                   // L3, stateful over a stream
  add(frame: RawFrame, ts?: string): MessageResult;
  finalize(): ExchangeResult[];                                          // resolves remaining orphans
}

function validateBatch(frames: { frame: RawFrame; ts?: string }[]): ValidationReport;  // convenience

// L4 extension point (Phase 2) — see §9
interface ProtocolRule { id: string; check(ctx: ProtocolContext): Violation[]; }
function registerProtocolRules(rules: ProtocolRule[]): void;
```

---

## 6. Schemas

- **Runtime validation source = `typed-ocpp`'s bundled official OCA schemas** (canonical at runtime).
- **The 56 local `.json` in `src/schemas/ocpp-1.6/` are the canonical reference + a CI diff-check set** — a test compares them against typed-ocpp's bundled schemas to catch drift between the two. They are not the runtime source.
- **This is reflected in `specs/requirements.md` §19.7** (master): 56 `.json` = canonical *reference*; typed-ocpp = canonical *runtime* validation source.

---

## 7. Runtime & Packaging

- **Isomorphic TypeScript package** (e.g. `@ador/ocpp-validation`), built to **ESM + CJS** for Node (CMS) and a **browser bundle** for the Parser/emulator UIs.
- Each consumer imports the same package; no duplicated validation logic across tools.
- ⚠️ **Unverified:** typed-ocpp's browser bundleability and module format (ESM/CJS) were **not documented**. The **first implementation task is a spike** to confirm it bundles and runs in-browser (Ajv does; typed-ocpp's packaging is the unknown). If it doesn't bundle cleanly, options: vendor + adjust, or run validation as a Node service the browser calls (fallback).

---

## 8. Functional Requirements

- **VAL-001**: The engine MUST accept an already-extracted OCPP message array (`RawFrame`) and MUST NOT perform file or log parsing.
- **VAL-002**: The engine MUST validate RPC **frame** structure — `[2, MessageId, Action, Payload]` (Call), `[3, MessageId, Payload]` (CallResult), `[4, MessageId, ErrorCode, ErrorDescription, ErrorDetails]` (CallError) — and reject malformed frames with an `L1`/`FRAME_INVALID` violation.
- **VAL-003**: The engine MUST validate each payload against the official OCPP 1.6J schema for its action and report `L2`/`SCHEMA_VIOLATION` with a JSON-pointer path and the offending rule (e.g. missing mandatory `connectorId` in `StatusNotification`, wrong data type).
- **VAL-004**: The engine MUST pair Calls with their CallResult/CallError by `MessageId` and MUST validate that the response matches the originating request's action (`typed-ocpp.checkCallResult`); a non-matching response is `L3`/`RESULT_MISMATCH`.
- **VAL-005**: The engine MUST detect **orphans** — Calls with no response (`orphan-call`) and responses with no matching Call (`orphan-response`).
- **VAL-006**: When both timestamps are available, the engine MUST compute **latency/RTT** per exchange and an average across the report.
- **VAL-007**: The engine MUST return a structured, consumer-agnostic `ValidationReport` (§5); it MUST NOT render UI or assume a consumer.
- **VAL-008**: The engine MUST be isomorphic (usable in Node and browser bundle).
- **VAL-009**: The engine MUST expose an L4 **extension point** (`registerProtocolRules`) without implementing L4 rules in Phase 1.
- **VAL-010**: Validation MUST be deterministic and side-effect-free (no network, no disk) at runtime.

---

## 9. L4 Extension Point (Phase 2 — deferred)

L4 = "is this message legal given current state?" — the OCPP state machine (connector states, transaction lifecycle). **Not built in Phase 1.** The engine reserves `ProtocolRule` / `registerProtocolRules` (§5) so rules plug in later without changing L1–L3.

**The L4 rule catalog is a separate future deliverable** ("the laundry list"), assembled from:
- The Parser's **Protocol Compliance Report** (24 system checks + 9 lifecycle stages) — `specs/requirements.md` §11.
- Diagnostics **L-001 Phantom**, **L-002 Missing Stop**, **L-003 Stuck-in-Preparing** — `specs/requirements.md` §C.
- The **official OCPP 1.6J spec** (e.g. *no `StopTransaction`/`MeterValues` without a preceding accepted `StartTransaction` of the same `transactionId`*; *no core ops before `BootNotification` Accepted*).
- Business-logic checks from `scratchpad/drafts/Revamp Proposal.txt`: MeterValue chronological sanity (`meterStop ≥ meterStart`, monotonic energy), OCPP Errata "Celsius" toggle, charging-profile constraints.

---

## 10. Testing

- **Schema fixtures** derived from each of the 56 message types: a valid example + deliberately-invalid variants (missing required field, wrong type, bad enum).
- **Frame tests**: malformed arrays, wrong `MessageTypeId`, truncated frames.
- **Pairing tests**: matched pairs, orphan call, orphan response, action-mismatch, latency computation.
- **Diff-check test**: 56 local `.json` vs typed-ocpp bundled schemas (drift detection, §6).
- Tests live in `tests/` per the project standard; per Operating Principle 12, they ship **with** the engine, not after.

---

## 11. Risks & Mitigations

| Risk | Likelihood | Mitigation |
|---|---|---|
| `typed-ocpp` is small (~7★) — abandonment / breaking release | Medium | npm-pin + lockfile now; **vendor** the validation modules (MIT) for the core |
| typed-ocpp browser bundleability unverified | Medium | **Spike first** (§7); fallback = Node validation service |
| Two schema sources drift (typed-ocpp vs our 56) | Low | CI diff-check test (§6, §10) |
| OCA schema edge-cases / Ajv config differences | Low | typed-ocpp states schemas are "tweaked for Ajv compat"; pin Ajv version |

---

## 12. Decisions Log

| Decision | Choice | Date |
|---|---|---|
| Build vs adopt for validation | Adopt `typed-ocpp` (don't reinvent) | 6 Jun 2026 |
| Engine boundary | L1–L3 now; L4 extension point; **no** file parsing | 6 Jun 2026 |
| Runtime | **Isomorphic** (Node + browser bundle) | 6 Jun 2026 |
| Canonical schemas | typed-ocpp bundled = runtime source; 56 local `.json` = reference + diff-check | 6 Jun 2026 |
| Dependency model | npm-pinned + lockfile → plan to **vendor** | 6 Jun 2026 |
| Emulator box (suite) | SAP simulator = leading candidate (not for validation) | 6 Jun 2026 |

---

## Next Step

Per the brainstorming → planning flow, the next step **when you're ready to build** is to turn this spec into an implementation plan (writing-plans). Implementation is deferred until the suite tooling is greenlit. **Open first task when building: the browser-bundling spike for `typed-ocpp` (§7).**
