# Decision: Validation Engine consumption model — Direct monorepo import

**Date:** 2026-06-21
**Status:** Decided (user)
**Context:** Phase 6 = the revamped Parser consumes the OCPP Validation Engine. The engine code lives at `src/services/validation/` (on `feat/validation-engine`); the Parser at `src/app/` (on `feat/parser-revamp`). We had to choose *how* the Parser obtains the engine.

## Options considered

| Option | What it is | Cost | Best when |
|---|---|---|---|
| **A — Direct monorepo import** (CHOSEN) | Both live in one tree; Parser does `import { … } from '../services/validation'`; Vite bundles them together | Near-zero; no publish/versioning | Consumers are in the same repo (our case) |
| B — Published npm package `@ador/ocpp-validation` | Engine published to a registry; consumers `npm i` a version | Publishing + version bumps + release steps; produces ESM+CJS dual build | Consumers in *separate* repos / external teams; a Node consumer needs a dual build |
| C — Workspace package (local, unpublished) | Imported by name `@ador/ocpp-validation` via npm/pnpm workspaces, not published | Some setup; gets name-import + independent build without publishing | Middle ground once a Node consumer (CMS) arrives |

## Decision & rationale

**Option A — direct monorepo import.**
- The repo is **already a monorepo** for all 5 suite tools — intra-repo sharing is the whole point of the layout.
- The immediate consumer (**Parser**) is **browser/Vite**; the engine already browser-bundles cleanly (spike 2026-06-13). Direct import is the least friction.
- Publishing now is **speculative complexity** (Operating Principle §6 Simplicity-First): version/release overhead before any consumer needs it, since every consumer is in this repo.

## Rejected-but-deferred

The spec's `@ador/ocpp-validation` ESM+CJS "package" framing (`docs/TYPEVALIDATION.md` §8) was written for the **future Node-based CMS**, which genuinely benefits from a dual-build package. **Promote A → C (workspace package), or → B if a tool moves to a separate repo, when the CMS arrives.** No rework is lost by starting with A — the engine's public API (`validateBatch`, etc.) stays the same regardless of how it's imported.

## Implication for branch topology

Direct import requires the engine + Parser to sit in **one tree**. Next step (start of Phase 6): bring `feat/validation-engine`'s `src/services/validation/` together with the Parser (merge engine → `main`, then onto the integration line; or merge the engine branch into the parser branch). To be sequenced separately.
