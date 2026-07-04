# Decision: One unified tool via a two-tier navigation shell

> **Role:** TRACKER (decision record) · **Date:** 2026-07-04 · **Status:** Accepted
> **Supersedes:** the "second Vite page / separate `simulator.html`" packaging used
> during OCPP Simulator Phases 0–5.
> **Related:** design `docs/superpowers/specs/2026-07-03-ocpp-simulator-integration-design.md` §4.1 ·
> requirements `specs/ocpp-simulator/requirements.md` R9.

## Context

The OCPP Simulator (Phases 0–5) was built as reusable modules under
`src/simulator/` but surfaced as a **separate Vite page** (`simulator.html`, its
own URL). On first browser test the user flagged that this reads as a *separate
tool*, whereas the intent was **one unified tool** — the simulator integrated with
the Parser. The user also asked to plan placement for the future
**Transaction Flow Simulator**, **CMS Log Parser**, and **CMS/CSMS**.

## Decision

Adopt **two-tier navigation, grouped by function**, in a single app (`index.html`):

- **Tier 1 (modes of work):** `Parser` · `Emulator` · `CMS`.
- **Tier 2 (contextual sub-tabs):** shown only when a group has 2+ views.

| Tier 1 | Tier 2 view | Status |
|---|---|---|
| Parser | Client Log Parser · CMS Log Parser | built · future |
| Emulator | OCPP Simulator · Transaction Flow Simulator | built · future |
| CMS | CSMS dashboard | future (Tool #2; may become its own app/backend) |

Implemented via a nav shell in `src/app/nav/` (`navConfig.ts` = view registry,
`navShell.ts` = renderer). `simulator.html` is removed; Vite returns to
single-entry. All `src/simulator/*` modules and tests are unchanged.

## Why (options considered)

- **Embedded section inside the Parser flow** — rejected. The Parser page is a
  read-only *results* surface that re-renders on each upload; embedding a live,
  stateful simulator there is a mental-model clash and would drop CP Mode's
  WebSocket on re-render.
- **Separate pages** — rejected by the user (feels like a separate tool).
- **Two-tier tabbed nav** — chosen. Matches "one tool, many modes"; each future
  view has a pre-decided home; groups mirror the suite taxonomy; and — the
  deciding factor — **per-view state persists**, so CP Mode's live WebSocket
  survives switching to the Parser and back.

## Consequences

- Adds a small nav layer in `src/app/`; the Parser and simulator become mounted
  views rather than page entries.
- Future suite views (Flow, CMS Log Parser, CMS) are declared as disabled
  "coming soon" entries now — placement locked, activation is a one-line change.
- One URL, one build, one deploy target for the whole client-side suite (CMS/CSMS
  may later graduate to its own deployment; its Tier-1 slot may link out).
