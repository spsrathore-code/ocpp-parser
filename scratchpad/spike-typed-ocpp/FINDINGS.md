# Spike: typed-ocpp browser-bundling — FINDINGS

**Question (TYPEVALIDATION.md §7, §11):** Does `typed-ocpp` bundle and run in the browser?
If yes → the clean **isomorphic package** design. If no → fall back to a Node validation service.

**Date:** 2026-06-13 · **typed-ocpp:** 1.5.6 · **Node:** v22.20 · **Bundler:** esbuild 0.24.2

---

## Verdict: ✅ YES — isomorphic path confirmed. No fallback needed.

## Evidence

| Test | Result |
|---|---|
| Package format | Pure **ESM** (`"type":"module"`), deps Ajv + ajv-formats + date-fns |
| Node functional test (L1 frame, L2 schema, L3 correlation) | **9/9 pass** (`npm run node-test`) |
| Schemas bundled by the library | **56** — exactly matches our `src/schemas/ocpp-1.6/` reference set |
| Browser bundle (`esbuild --platform=browser`) | **Succeeds**, 822.7 kb ESM, 0 errors / 0 warnings |
| Node built-ins in bundle (`fs`/`path`/`crypto`/…) | **None** — nothing to polyfill |
| Bundled output executed | `{ ok:true, matched:true, schemaCount:56 }` — works correctly |

## Notes for implementation

- **API matches the spec §3 exactly:** `OCPP16.validate/validateCall/validateCallResult/validateCallError`,
  `checkCallResult(result, call)` (note arg order: result first), `isCall/isCallResult/isCallError`,
  `OCPP16.schemas`, `OCPP16.Action` (all 27 1.6 actions). Ajv `(boolean + .errors[])` pattern.
- **Bundle size 822 kb** is mostly Ajv + the 56 compiled schemas. Acceptable for the Parser; can be
  trimmed later (tree-shaking, lazy schema compile) if needed — not a blocker.
- **The only npm-audit warning is esbuild** (dev-server advisory, build-time devDependency only).
  typed-ocpp's runtime deps are clean. Irrelevant to the dependency decision.
- **Vendoring** (spec §11 insurance) remains advisable for a foundational dep, but is no longer
  blocked by any bundling concern.

## Reproduce

```
cd scratchpad/spike-typed-ocpp
npm install
npm run node-test    # 9/9 functional
npm run bundle       # produces dist/bundle.js for the browser
```

This folder is a throwaway spike — safe to delete once findings are folded into TYPEVALIDATION.md.
