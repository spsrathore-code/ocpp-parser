# Requirements: OCPP Spec Markdown as Suite-Wide SSOT

> **Status:** Pre-brainstorm capture — requirements under review.
> **Initiated:** 2026-06-07
> **Depends on:** `knowledge/standards/ocpp-1.6/` population (in progress)
> **Next step:** Full brainstorm + design session once standards folder is complete.

---

## 1. Origin — User's Vision (verbatim intent)

The OCPP 1.6J specification has been converted into a well-structured set of modular Markdown files located at `knowledge/standards/ocpp-1.6/`. These files are the **ultimate single source of truth** that should actively drive every tool in the OCPP Tool Suite:

- Validation Engine
- CMS (CSMS)
- Charger Emulator
- Training Emulator
- Parser

### 1.1. Core Capabilities Described

**A. Dynamic Rule Generation & Asset Hydration**

Instead of manually hardcoding thousands of validation rules, configuration keys, or error codes into the codebase, use an offline script to parse the Markdown files and compile them into machine-readable JSON artifacts during the build phase.

Examples of target artifacts:
- `config_keys.json` — all OCPP standard configuration keys with read/write access, data type, and default values
- `error_codes.json` — all valid OCPP error codes (CallError ErrorCode enumeration)
- `status_types.json` — all valid ChargePointStatus values and allowed state transitions

Example use case — **Section 9 Hydration (Standard Configuration Keys):**
The Charger and CMS emulators must know exactly which configuration keys are read-only, write-only, their data types, and default values. Today this would be hardcoded. With this system, the compiler reads Section 9 of the spec MD and generates a structured JSON that all tools consume.

---

**B. Contextual Test-Failure Reporting ("Bible Reference")**

When the Charger Emulator or Transaction Emulator or Validation Engine runs a test scenario and a validation check fails, instead of a generic error:

> ❌ `Error: Invalid Status`

The system outputs:

> ❌ **Test Case TC_CORE_04 Failed:** Charge Point sent `StatusNotification` with custom status `Testing`.
>
> **According to OCPP 1.6 Spec** (`04-Operations-Initiated-by-Charge-Point.md § 4.9`):
> *"The ChargePointStatus enumeration contains only the following valid states: Available, Preparing, Charging, SuspendedEVSE, SuspendedEV, Finishing, Reserved, Unavailable, Faulted. Custom vendor string extensions are strictly prohibited for this field."*

This is achieved by:
- Tagging every validation test case with a structural metadata reference matching Markdown headings (e.g., `section: "04-Operations-Initiated-by-Charge-Point.md#4.9-status-notification"`)
- On failure: pulling the exact text block from that Markdown file and injecting it into the test report UI or console output

**Value:** Makes the suite an educational tool. Developers and QA engineers see exactly why they failed compliance — without opening a separate PDF.

---

**C. State Machine Verification Matrix**

One of the hardest elements to validate in an OCPP suite is the Smart Charging Profile state machine (stacking profiles, periods, and recurring schedules). With clean Markdown files, a strict state-transition matrix can be established inside the Validation Engine:

- Use a Markdown parsing library to isolate message flow rules
- The Validation Engine maintains a memory state of the connected emulator
- Before permitting the emulator to send a `MeterValues.req`, the engine verifies against the cached rule matrix that a transaction is active and a valid `transactionId` exists

This also covers the status transition table (Section 4.9): which states can follow which, and which transitions are prohibited.

---

**D. Skill Chain Integration**

The OCPP 1.6J Markdown files act as the base for compliance checks within the skill chain. When `/plan-eng-review`, `/review`, or `/cso` runs, it references the relevant Markdown section to verify OCPP compliance of the feature being designed or reviewed.

---

### 1.2. The Two-Phase Architecture

The user's proposed execution model separates concerns cleanly:

```
PHASE 1 — Build / Compile Time (offline, not in the hot path)
────────────────────────────────────────────────────────────────
knowledge/standards/ocpp-1.6/*.md
        │
        ▼ [offline parser script — scripts/maintenance/]
        │
data/processed/ocpp-1.6/
    ├── config_keys.json
    ├── error_codes.json
    ├── status_types.json
    ├── state_transitions.json
    └── message_schemas.json


PHASE 2 — Runtime (millisecond-level, deterministic)
────────────────────────────────────────────────────────────────
data/processed/ocpp-1.6/*.json
        │
        ▼ [imported by tools at startup]
        │
Validation Engine  →  rapid field/type/enum validation
CMS Emulator       →  knows valid config key constraints
Charger Emulator   →  knows valid state transitions
Training Emulator  →  drives test scenarios from spec structure


PHASE 3 — Analysis / Reporting Time (post-test, human-readable)
────────────────────────────────────────────────────────────────
knowledge/standards/ocpp-1.6/*.md  (raw text, re-referenced)
        │
        ▼ [failure → spec lookup → inject into report]
        │
Audit log / test report UI  →  exact paragraph from spec
LLM evaluation (optional)   →  deeper compliance analysis narrative
```

---

## 2. Analysis

### 2.1. What's Architecturally Sound

| Strength | Why It Matters |
|---|---|
| SSOT prevents rule drift | One OCPP update → one set of files updated → all tools stay in sync automatically. Currently each tool would hardcode its own copy of status values, error codes, etc. |
| Two-phase model is proven | Mirrors OpenAPI codegen, Protobuf, JSON Schema compilers. Build-time parsing → runtime JSON is a standard industry pattern for exactly this class of problem. |
| Contextual failure reporting | Critical for the Training Emulator's educational value. A dev who gets a spec citation on failure learns OCPP; one who gets a generic error learns nothing. |
| Metadata structure already exists | YAML frontmatter (`spec-section`, `spec-pages`, `spec-version`, `tags`) and Obsidian wikilinks (`[[section\|label]]`) already provide a cross-reference graph. Mermaid sequence diagrams capture message flows that could be parsed as state transitions. |
| Aligns with Operating Principles | Principle 11 (Standards Before Customization): compliance is grounded in official spec, not manual interpretation. Principle 7 (Boil the Lake): compliance and safety paths should be exhaustive. |

---

### 2.2. Risks & Challenges

**Risk 1 — Markdown is not a structured format.**

This is the central technical risk. Content in the MD files falls into two categories:

| Content type | Machine-parseable? | Example |
|---|---|---|
| Tables (config keys, status transitions, message profiles) | ✅ Yes — with consistent column headers | Section 9 config keys table, Section 4.9 status transition matrix |
| Sequence diagrams (Mermaid) | ⚠️ Partially — structure is parseable, semantics are not | Figures 1–41 |
| Normative prose rules (SHALL, MUST, MAY) | ❌ No — requires NLP or careful manual tagging | Section 3.7.1 retry rules, Section 3.5.4 offline auth |

**Implication:** The compiler will be easy for structured sections and hard for prose-rule sections. Prose sections cannot be reliably parsed into machine-executable rules without either (a) embedding structured annotations directly into the MD source or (b) accepting that those rules require manual JSON encoding.

---

**Risk 2 — The MD files need a machine-parseable convention defined before the compiler is built.**

Specifically:
- Which sections are intended to produce which JSON artifact?
- What do the column headers in Section 9 mean structurally (e.g., which column = data type, which = default value, which = access level)?
- How are normative keywords (SHALL, MUST, MAY, SHOULD) captured in the output JSON?

This is a **design decision** that must be made before a single line of compiler code is written. Otherwise the parser guesses at structure and produces brittle, wrong output.

---

**Risk 3 — Five independent sub-systems described as one.**

Per Operating Principle 2 (Specification Before Implementation): this vision decomposes into five distinct scoped systems, each requiring its own spec → plan → build cycle:

| Sub-system | Depends on |
|---|---|
| A: MD→JSON compiler (build script) | MD convention design |
| B: JSON artifact schemas (config_keys, error_codes, status_types, state_transitions) | Sub-system A |
| C: Runtime validation integration (Validation Engine consuming JSON) | Sub-system B |
| D: Contextual failure reporting (Bible reference layer) | Sub-system C |
| E: Skill chain integration (skills referencing MD for OCPP compliance) | Sub-system B |

They must be built in order. Attempting all five simultaneously produces nothing shippable.

---

**Risk 4 — Prior art exists; check before building.**

Operating Principle 3 (Search Before Building) applies. The Open Charge Alliance publishes the **OCPP Compliance Testing Tool (OCTT)** with structured test cases. Before building a custom compliance parser from scratch, the OCTT's test case structure and rule encoding should be reviewed to understand what already exists and what can be adapted.

---

## 3. Repository Placement (per `project-standard.md`)

```
knowledge/standards/ocpp-1.6/     ← SSOT Markdown files (canonical, human-readable)
scripts/maintenance/               ← MD→JSON compiler script
data/processed/ocpp-1.6/          ← Generated JSON artifacts (derived, not canonical)
src/services/validation/           ← Validation Engine (consumes JSON at runtime)
docs/architecture.md               ← Pipeline documented here
```

The `scripts/` folder is the automation layer per the project standard. The `data/processed/` folder is for transformation outputs. The compiler is not runtime code and must not live in `src/`.

---

## 4. Open Questions (to resolve during brainstorm session)

1. **Which JSON artifact has the highest immediate value?**
   Config keys, error codes, status types, or state machine transitions — which one should Sub-system B target first? That determines what the MD files need to look like structurally and scopes the first build cycle.

2. **What annotation convention will prose-rule sections use?**
   Options: (a) embed YAML-style `<!-- rule: ... -->` comments in MD prose, (b) maintain a separate `rules-manifest.json` that references MD sections by heading, (c) accept that prose rules are human-reference only and only table-structured content feeds the compiler.

3. **Is the OCTT relevant here?**
   Should the suite's test case IDs align with OCTT test case identifiers to enable cross-referencing with the Alliance's official compliance test suite?

4. **Which tool is the first consumer?**
   Validation Engine (priority per CLAUDE.md), or would one of the emulators benefit more immediately?

5. **LLM involvement at analysis/reporting time — scope?**
   Is the LLM used to generate narrative audit reports only (post-test, offline), or is it also used to evaluate whether a sequence of messages is logically valid per the spec in real time?

---

## 5. Next Steps

1. ⏳ **In progress:** Populate `knowledge/standards/ocpp-1.6/` with remaining OCPP 1.6J spec sections.
2. **On completion of standards folder:** Run full brainstorm session using this document as the base.
3. **Brainstorm output:** Design document → `docs/superpowers/specs/2026-06-07-ocpp-md-ssot-design.md`
4. **Then:** Implementation plan → starting with Sub-system A (MD→JSON compiler) and Sub-system B (JSON artifact schemas).

---

*Captured from brainstorm session 2026-06-07. See `knowledge/project-journal.md` for session history.*
