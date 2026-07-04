# OCPP Simulator — Suite Integration Design

> **Role:** BLUEPRINT · **Status:** DRAFT · **Created:** 2026-07-03
> **Requirements baseline:** `specs/ocpp-simulator/requirements.md` (R1–R8)
> **Decision inputs:** Packaging **Option A** (into the Vite app) and scope
> **OCPP Simulator / Tab 1 only** — both confirmed by the user 2026-07-03.

---

## 1. Context

The repo already contains two finished suite tools — the **Validation Engine**
(`src/services/validation/`, L1–L3 on `typed-ocpp`) and the **Parser**
(`src/app/`, TS+Vite). A separate standalone artifact,
`OCPP Transaction Simulator Extended V3_17 Aug.html` (6,010 lines, three tabs),
contains an **OCPP Simulator** (Tab 1) that lets a user pick an OCPP 1.6J message,
edit its parameters, and either validate it offline ("Simulator Only" mode) or
exchange it live with a real Central System over WebSocket ("Charge Point (CP)
Mode"). It ships only **7** of the protocol's **28** operations and hand-maintains
their field definitions.

The goal is to bring this OCPP Simulator into the suite as the seed of **Tool #3
(Charger Emulator)** — expanded to the **full 28-message OCPP 1.6J set**,
categorized for **training**, validated by the **Validation Engine**, and able to
hand a simulated session to the **Parser**. The end use is training: a coherent,
standards-organized way to learn and exercise the whole protocol.

This spec designs *how* to do that. It covers **Tab 1 only**; Tab 2 (Transaction
Flow replay) and Tab 3 (CMS Log Parser) are out of scope and will get their own
specs.

## 2. Goals / Non-goals

**Goals**
- Preserve both operating modes and the offline guarantee (R1, R5).
- Expand the catalog to all **28 operations / 56 PDUs**, categorized by **Feature
  Profile** and **Direction** (R6, R7).
- Drive the catalog from the **canonical schemas / `typed-ocpp`** — no
  hand-maintained parallel list (R8).
- Validate every simulated frame through the **Validation Engine** in both modes
  (R2, R3).
- Let a completed session be analyzed by the **Parser** (R4).
- Decompose the 6,010-line HTML into modules, each well under the 2,000-line limit.

**Non-goals (this spec)**
- Tabs 2 & 3. Multi-station / load-testing (the SAP-simulator dimension).
- OCPP 2.0.1 (the schema-driven design keeps this cheap later, but it is not built
  now).
- Deploy/hosting decisions (shared with the Parser's Phase 5).

## 3. Packaging decision (Option A) and rejected alternative

**Chosen — Option A: bring the simulator into the Vite app** as a second entry.
The simulator becomes TS modules under `src/simulator/` that `import` the
Validation Engine, the schemas, and (for R4) the Parser's analyze pipeline
directly. One build/test pipeline, shared source of truth.

**Rejected — Option B: standalone HTML + UMD-bundled engine.** A `file://` HTML
cannot cleanly import the ESM engine/schemas, so it fails **R8** (schema-driven
catalog needs the schemas imported) and **R4** (Parser handoff). It would also
leave a 6,010-line file that violates the **2,000-line hard constraint** and fork
the build into a second artifact. Faster to a first validation, but a dead end for
the training goals. Not chosen.

## 4. Home, identity, and file moves

> **Revision 2026-07-04 (supersedes the original "second Vite page" plan).** The
> simulator is **not** a separate page/tool. It is **one unified tool** with the
> Parser: a single app (`index.html`) with a **navigation shell** that switches
> between views. The original build (Phases 0–5) created a separate
> `simulator.html`; that page is being **removed** and its modules re-mounted
> inside the Parser app. Rationale: user intent was one tool; and CP Mode holds a
> live WebSocket, which rules out re-rendering embedded approaches. See §4.1.

- **New home:** `src/simulator/` (modules, unchanged) mounted **inside the Parser
  app** (`index.html` → `src/app/main.ts`) via a navigation shell (§4.1). **No
  separate `simulator.html`.**
- **Identity:** the OCPP Simulator is the **Emulator › OCPP Simulator** view of the
  one unified tool (still the seed of the **Charger Emulator** capability).
- **Reference copy:** the original
  `OCPP Transaction Simulator Extended V3_17 Aug.html` → `archive/`; and
  `CZ CMS Logs Sample.xlsx` → `data/samples/` (feeds future Flow/CMS-Parser views,
  out of scope here, but belongs in samples per `project-standard.md`).
- **Vite:** stays **single-entry** (`index.html`). The second-entry change is
  reverted; `simulator.html` is deleted.

### 4.1 Navigation & information architecture (2026-07-04 decision)

The unified tool uses **two-tier navigation, grouped by function**, designed to
scale to every planned suite view (not just today's two):

**Tier 1 — primary nav** (modes of work): `Parser` · `Emulator` · `CMS`.
**Tier 2 — contextual sub-tabs** (shown only when a group has 2+ views).

| Tier 1 | Tier 2 view | Status |
|---|---|---|
| **Parser** | Client Log Parser | ✅ built (current Parser) |
| | CMS Log Parser | ⏳ future (reference Tab 3) |
| **Emulator** | OCPP Simulator | ✅ built (reference Tab 1) |
| | Transaction Flow Simulator | ⏳ future (reference Tab 2) |
| **CMS** | CSMS dashboard | ⏳ future (Tool #2; may graduate to its own app/backend — slot reserved, may embed or link out) |

**Principles:**
- Each future piece has a **pre-decided home** — no re-architecture when added.
- Groups mirror the suite's tool taxonomy (Parser / Charger Emulator / CSMS).
- Tier-2 stays hidden until a group has 2+ views → today it reads as a simple
  `Parser | Emulator` bar; future views appear as **disabled "coming soon"**
  entries so placement is visible and locked in.
- **Per-view state persists** across Tier-1 switches (critical: CP Mode's live
  WebSocket must survive switching to Parser and back).
- **Cross-view link:** the simulator's "Analyze in Parser" switches to
  **Parser › Client Log Parser** with the session rendered.

**Implementation now:** build the nav shell (Tier 1 + Tier 2) wiring the two live
views (**Parser › Client Log Parser**, **Emulator › OCPP Simulator**); `CMS`,
`CMS Logs`, and `Transaction Flow` are declared in the nav config as disabled
placeholders. Nav shell lives in `src/app/` (see §5.1); all `src/simulator/*`
modules are unchanged.

## 5. Architecture

### 5.1 Module decomposition (all < 2000 lines)

```
src/simulator/
├── main.ts                 # entry: wire catalog → render → validate → transport
├── model/
│   └── types.ts            # MessageDef, FieldDef, Profile, Direction, SessionEntry
├── catalog/
│   ├── schemaLoad.ts       # load src/schemas/ocpp-1.6/*.json → per-action req/conf schema
│   ├── buildCatalog.ts     # schema → MessageDef[] (fields, enums, required) — R8
│   └── metadata.ts         # static 28-row overlay: action → {profile, direction, defaults?, description?}
├── validate/
│   └── engineAdapter.ts    # frame → Validation Engine (validateMessage / ExchangeTracker)
├── transport/
│   └── wsClient.ts         # CP-Mode WebSocket: connect/status/send/listen/heartbeat
├── session/
│   └── toParser.ts         # SessionEntry[] → Parser log lines → analyzeLogLines (R4)
└── render/
    ├── shell.ts            # header, mode toggle, connection panel
    ├── selector.ts         # Profile → Direction → Message pickers (R7)
    ├── paramForm.ts        # schema-driven request/response forms
    ├── payloadView.ts      # request/response JSON panels
    └── logConsole.ts       # SENT/RECEIVED transcript + "Analyze in Parser" button
```

**Navigation shell (added 2026-07-04, in `src/app/`) — mounts the unified tool:**

```
src/app/
├── main.ts                 # (existing) now boots the nav shell instead of the Parser directly
└── nav/
    ├── navConfig.ts        # Tier-1/Tier-2 view registry (id, label, group, enabled) — the single place future views are activated
    └── navShell.ts         # renders the two-tier nav + a view container; lazy-mounts the active view (Parser render or simulator renderShell); persists last view in localStorage; keeps mounted views alive so CP-Mode WebSocket state survives switches
```

- The simulator's existing `render/shell.ts` `renderShell(container)` is mounted by
  `navShell` into the shared container — it is no longer a page entry.
- `navConfig.ts` is where **Transaction Flow**, **CMS Log Parser**, and **CMS** get
  activated later (flip `enabled: true` + point at their renderer).

### 5.2 Data flow

```
schemas (src/schemas/ocpp-1.6/*.json)
   │  schemaLoad + buildCatalog + metadata overlay
   ▼
MessageDef[]  ──►  selector (Profile→Direction→Message)  ──►  paramForm
                                                               │ user edits
                                                               ▼
                                            frame = [2, id, action, payload]
                              ┌──────────────────────────────┴───────────────┐
                    Simulator Only                                     CP Mode
              validate.engineAdapter                        transport.wsClient.send
              + faked response (from conf schema)           + real server response
                              └──────────────────────────────┬───────────────┘
                                                              ▼
                                        logConsole (SessionEntry[])  ──►  session.toParser ──► Parser
```

## 6. The schema-driven catalog (core of R6/R7/R8)

The current tool hand-writes each message. Instead:

1. **`schemaLoad.ts`** imports the 56 local JSON schemas
   (`src/schemas/ocpp-1.6/<Action>.json` + `<Action>Response.json`). These are the
   canonical OCPP 1.6J schemas already used as the Validation Engine's reference
   set — the same source of truth (R8).
2. **`buildCatalog.ts`** converts each request/response schema into a `MessageDef`
   with `FieldDef[]`, deriving per field: **name**, **type** (`string` |
   `integer` | `number` | `boolean` | `enum` | `datetime` (from
   `format: date-time`) | `object`/`array` → JSON editor), **enum values** (from
   `enum`), **required** (from the schema's `required[]`), and constraints
   (`maxLength`). Nested objects/arrays (e.g. `meterValue`, `chargingProfile`,
   `csChargingProfiles`) render as a **JSON textarea pre-seeded with a
   schema-derived skeleton**, exactly as the current tool does for complex params —
   keeping forms tractable.
3. **`metadata.ts`** is a **small static 28-row overlay** keyed by action, adding
   only what schemas don't carry: **Profile** and **Direction** (the §3.1
   categorization), plus optional **training defaults** and **plain-language
   descriptions**. This is metadata, *not* a re-typing of fields — field shape
   still comes from the schema, so it can't drift from what the engine validates.

**Adding OCPP 2.0.1 later** = drop in its schema set + its metadata rows. No
message-by-message hand-coding.

## 7. Validation Engine integration (R2, R3)

`validate/engineAdapter.ts` wraps the engine's public surface
(`src/services/validation`):

- **Per-frame:** `validateMessage(frame): MessageResult` — replaces the tool's
  hand-rolled `validatePayload`/`validateObject`. The UI's Validation panel renders
  `MessageResult.violations` (layer L1/L2, code, message, JSON `path`) instead of
  the old ad-hoc strings.
- **Request↔response correlation:** an `ExchangeTracker` instance per active
  session; `.add(frame, ts)` on every sent/received frame, `.finalize()` for the
  L3 report (matched / orphan / mismatch + latency). CP Mode already tracks
  `sentMessages[messageId]`; this replaces that bookkeeping with the engine's.
- The simulator already builds frames in the exact `RawFrame` shape
  (`[2, id, action, payload]` / `[3, id, payload]`), so **no transformation layer**
  is needed (R3).

Both modes validate: Simulator Only validates the request (and its faked response);
CP Mode validates outgoing frames before send and all incoming frames.

## 8. The two modes (R1, R5)

- **Simulator Only** (default, offline): validate the request via the engine;
  generate a **default response from the response schema** (fill required fields
  with defaults / first enum), degrade `status`→`Rejected` when the request is
  invalid (preserving current behavior); log SENT/RECEIVED; no network. R5 holds —
  nothing leaves the browser, no server dependency.
- **CP Mode** (live): `transport/wsClient.ts` opens a real `ocpp1.6`-subprotocol
  WebSocket, shows the connect/status lifecycle, sends CP→CS frames and displays
  the real server response, **listens for CS→CP frames and lets the user respond**
  (now actually reachable because CS→CP messages are in the catalog — see §3.1 of
  requirements), and runs the heartbeat loop. Behavior is a faithful port of the
  current handlers, with validation routed through the engine.

## 9. Session → Parser handoff (R4)

`session/toParser.ts` serializes the `logConsole` transcript (`SessionEntry[]` of
timestamp + direction + frame) into **log lines in the Parser's expected input
format**, then calls `analyzeLogLines(lines, name)` from `src/app/analyze.ts` and
renders with `renderResults`. A **"Analyze in Parser"** button on the log console
triggers it.

> **Implementation note:** the exact line format must match
> `src/app/parse/parseLines.ts`; Phase 4 begins by reading that parser and writing
> the adapter to satisfy it (verified by a round-trip test — see §11). We do **not**
> change the Parser; the adapter conforms to it.

## 10. Build phasing (implementation, after spec approval)

Each phase ends `tsc` + `vite build` clean with tests green.

- **Phase 0 — Scaffold:** second Vite entry (`simulator.html` + `src/simulator/`
  skeleton), multi-page `vite.config.ts`, archive the HTML, move the xlsx. Verify:
  both pages build and serve.
- **Phase 1 — Schema-driven catalog + forms:** `schemaLoad` + `buildCatalog` +
  `metadata` → all 28 messages; `selector` (Profile→Direction→Message) + schema-driven
  `paramForm` + `payloadView`. Verify: every message renders a correct form; unit
  tests on catalog build.
- **Phase 2 — Simulator Only + Engine wiring:** offline run, engine validation
  panel, schema-derived faked response. Verify: valid/invalid payloads produce the
  right engine violations.
- **Phase 3 — CP Mode transport:** WebSocket connect/status/send/listen/respond/
  heartbeat, engine validation on live frames + `ExchangeTracker` latency. Verify:
  against a mock WS server.
- **Phase 4 — Parser handoff:** `session/toParser.ts` + "Analyze in Parser".
  Verify: round-trip test (simulate a StartTransaction→MeterValues→StopTransaction
  session → `analyzeLogLines` → expected transaction appears).
- **Phase 5 — Training niceties (optional):** profile "lessons", guided flows,
  message descriptions polish.

## 11. Testing strategy

- **Catalog:** `buildCatalog` maps representative schemas (scalar, enum, nested
  object `MeterValues`, deep `SetChargingProfile`) to correct `FieldDef[]`;
  metadata overlay assigns the right Profile/Direction for all 28.
- **Engine adapter:** valid frame → `ok:true`; malformed/enum-violating frame →
  expected L1/L2 violations (reuses engine, which is already QA'd).
- **Session→Parser:** round-trip a scripted session through `analyzeLogLines` and
  assert the analysis (transaction count, meter values) — this is the R4 acceptance
  test.
- **Transport:** `wsClient` against a mock WebSocket (connect, send, receive,
  heartbeat interval, close/reset).
- Vitest, `tests/**` (or `tests/simulator/**`), matching the existing harness.

## 12. Risks & open questions

- **Parser line format (R4):** the adapter must exactly match
  `src/app/parse/parseLines.ts`. Mitigation: Phase 4 starts by reading it; a
  round-trip test gates it. Low risk (format is in-repo and deterministic).
- **Nested-parameter UX:** deep messages (`SetChargingProfile`) stay JSON-editor
  based (as today). Acceptable for a training tool; structured editors are a later
  enhancement.
- **Response schemas for faked mode:** a few conf schemas are empty
  (`MeterValues.conf`, `Heartbeat.conf` has one field) — the generator must handle
  empty / near-minimal responses gracefully.
- **typed-ocpp vs local JSON as catalog source:** both are in-repo and consistent
  (guarded by `schema-drift.test.ts`). We drive the catalog from the **local JSON
  schemas** (simplest to enumerate); the engine keeps using `typed-ocpp`. The
  drift guard keeps them aligned.

## 13. Requirements traceability

| Req | Where satisfied |
|---|---|
| R1 both modes preserved | §8 |
| R2 validate via engine | §7 |
| R3 frames already engine-shaped | §7 |
| R4 session → Parser | §9, Phase 4 |
| R5 offline Simulator Only | §8 |
| R6 all 28 operations | §6, Phase 1 |
| R7 categorized (Profile + Direction) | §5.1 `selector`, §6 `metadata`, Phase 1 |
| R8 schema-driven catalog | §6 |
