# Analysis Web Worker — Design

> Date: 2026-07-09 · Branch `feat/perf-analysis-worker` (off `feat/cms-log-parser`)
> Origin: Engineering Assessment 2026-07-09, finding **P1** — "large files freeze the
> browser". Approach **A (Web Worker)** chosen by user over chunk-yield (B) and
> render-virtualization scope (C-add-on).

## 1. Problem

The freeze has two verified sources:

1. **Text path** (`mountParser`): parsing is chunked/yielding, but
   `analyze(mergeParsed(parts))` then runs as **one synchronous main-thread pass**
   (correlate → group → processTransactions → detectors → protocol → compliance →
   wsHealth). On MH0135-class logs (315k lines) the tab freezes for seconds *after*
   the progress bar completes.
2. **CMS path** (`mountCmsParser`): **everything** blocks — `XLSX.read` (heaviest
   single call; archive history shows ~200 MB sharedStrings workbooks), then
   `cmsRowsToParsedLines`, then the same synchronous `analyze()`. The spinner is
   honest but frozen.

A third, smaller stall — `renderResults` building all 21 sections' DOM — is
**out of scope v1** (measure after this lands; see §7).

## 2. Design

### 2.1 The seam — `AnalysisRunner`

A small interface with two implementations:

- **`workerRunner`** (browser): spawns the worker on first use, relays progress,
  resolves with the result.
- **`directRunner`** (tests + fallback): today's in-thread pipeline, byte-identical
  behavior. If `new Worker()` throws, `workerRunner` falls back to `directRunner`
  — worst case is the status quo, never worse.

### 2.2 The worker — `src/app/worker/analysis.worker.ts`

One worker serves both parsers. Message protocol:

```
Main → Worker:  { kind:'text', files: File[] }  |  { kind:'cms', files: File[] }
Worker → Main:  { kind:'progress', label, pct? }*
                → { kind:'result', result }  |  { kind:'error', message }
```

- **`File` objects are structured-cloneable** → the worker does the *reading* too:
  `file.text()`, the line `split()`, `XLSX.read`, adapters, and `analyze()` all
  leave the main thread. Main-thread compute = rendering only.
- `AnalysisResult` is pure data (arrays, plain objects, one `Map`) — designed
  DOM-free, so the structured clone back is safe (proved by test, §5).
- The worker keeps all logic in existing pure functions; the worker file itself is
  ~20 lines of dispatch delegating to a pure, unit-testable `handleRequest()`.
- CMS outcome extras (adapter label, chargers, per-file counts for the source
  banner) ride in the result message.

### 2.3 Progress & cancellation (new capabilities)

- Worker posts stage labels during *analysis* ("Correlating…", "Compliance §4…",
  "WebSocket health…") + the existing per-chunk parse progress format
  ("File 1/2: Processing lines X/Y…") so text-path UX is unchanged, then improved.
- New upload while one runs → `worker.terminate()` + fresh worker. True
  cancellation (impossible today).
- One `requestAnimationFrame` yield before `renderResults` so "Rendering…" paints.

### 2.4 Vite bundling

`new Worker(new URL('./analysis.worker.ts', import.meta.url), { type: 'module' })`
— Vite emits the worker + its imports (incl. `xlsx`) as separate lazy chunks,
loaded on first parse. Main bundle unchanged.

## 3. Blast radius — the four pipeline entry points (verified by grep)

| # | Caller | Feature | v1 treatment |
|---|---|---|---|
| 1 | `nav/mountParser.ts` | Text-log upload | → `workerRunner` |
| 2 | `cms/mountCmsParser.ts` | CMS Excel upload | → `workerRunner` |
| 3 | `render/repository/loadAnalyze.ts:26` | Repository **Load & Analyze** (FR-189) | **Untouched** — stays in-thread (no perf gain yet, zero risk; migrate later if wanted) |
| 4 | `simulator/session/toParser.ts:13` | Simulator → Parser handoff (R4) | **Untouched** — tiny data, in-thread is correct |

The pure core (`parse/`, `cms/` non-mount modules, `analyze.ts`, detectors,
compliance, protocol, ws) and the entire render layer are **not edited at all**.

## 4. Risk register & guarantees

| Risk | Guarantee that catches it |
|---|---|
| Result corrupted crossing the worker boundary (clone drops prototypes/fields) | **Clone-integrity test:** pipeline on both real samples, assert `structuredClone(result)` deep-equals the original — fails in CI, not the browser |
| Behavioral drift on the worker path | **Equivalence test:** same input through `directRunner` and the worker protocol handler → identical `AnalysisResult`; QA baselines (CZ: 3204 msgs / 12 tx / 12 alerts) re-asserted through the new path |
| Auto-save stops firing (needs text on main) | Autosave code path unchanged on main; jsdom test asserts `autoSaveWithUx` still called |
| Progress UX regresses | Worker relays the same payload format; jsdom test asserts progress text updates |
| Error fidelity lost (e.g. CMS "Unrecognized format… add an adapter" guidance) | Protocol carries `message` verbatim; error-path test asserts exact text |
| Worker fails to construct | `directRunner` fallback = today's exact code |
| Worker glue not executable in vitest/node | Residual gap, mitigated: glue is dispatch-only; data boundary covered by clone test; **user browser verification of both parsers is a mandatory pre-merge gate** |

Process: separate branch; CMS PR untouched; full suite + `tsc` + `vite build`
green; `/review` + `/qa` with a feature-checklist over all 4 entry points +
autosave, multi-file, export, context viewer before merge.

## 5. Testing (TDD)

- Existing **417 tests untouched** (pure core doesn't move).
- New: `handleRequest()` unit tests (text + cms + error) · `directRunner`
  equivalence · clone-integrity on both real samples · jsdom mount wiring with a
  mock Worker (progress → bar; result → sections; error → panel; re-click →
  terminate called).

## 6. Success criteria

1. MH0135-class log: UI interactive end-to-end — progress bar animates through
   analysis, theme toggle responsive (today: multi-second freeze).
2. CZ sample: spinner animates during `XLSX.read`.
3. Repo Load & Analyze and Simulator handoff behave exactly as before (untouched).
4. All tests green (417 + new), `tsc` + `vite build` clean, worker = separate chunk.

## 7. Out of scope (v1)

- `renderResults` DOM virtualization (measure after this lands).
- Migrating entry points 3 & 4 to the worker.
- On-demand Validation section compute (its own button, its own stall — separate).
- Accepted cost: one-time structured-clone of the result (~100–300 ms, non-blocking-feeling).
