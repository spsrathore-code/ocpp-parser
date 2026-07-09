# Analysis Web Worker Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move parse + xlsx read + `analyze()` off the main thread into a Web Worker so large files no longer freeze the browser (assessment finding P1).

**Architecture:** A pure `handleRequest()` in `src/app/worker/protocol.ts` runs the existing pipelines (text + CMS) and reports progress; `analysis.worker.ts` is ~20 lines of dispatch around it; `runner.ts` spawns the worker per run (with a direct in-thread fallback when `Worker` is unavailable) and relays progress. Only the two upload mounts change callers; the pure core, the render layer, repo Load & Analyze, and the Simulator handoff are untouched.

**Tech Stack:** TypeScript strict, Vite module workers (`new Worker(new URL('./analysis.worker.ts', import.meta.url), { type: 'module' })`), Vitest (node env for protocol tests, jsdom for mount wiring).

## Global Constraints

- Spec: `docs/superpowers/specs/2026-07-09-analysis-worker-design.md`. Branch: `feat/perf-analysis-worker`.
- **Do NOT edit** any file under `src/app/parse/`, `src/app/detect/`, `src/app/health/`, `src/app/protocol/`, `src/app/compliance/`, `src/app/ws/`, `src/app/render/` (except none), `src/app/analyze.ts`, `src/app/cms/` (except `mountCmsParser.ts`), `src/app/render/repository/loadAnalyze.ts`, `src/simulator/**`.
- No source file > 2000 lines. No `console.log` in src. No `any` / `@ts-ignore`.
- The Vite worker constructor syntax must be exactly `new Worker(new URL('./analysis.worker.ts', import.meta.url), { type: 'module' })` — Vite statically detects this to emit the worker chunk.
- Run tests with `npx vitest run <file>`; on this machine the rtk proxy eats stdout — when output is unreadable, re-run with `--reporter=json --outputFile=scratchpad/_vt.json` and inspect the JSON.
- Every commit message ends with: `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`
- Real fixtures: `data/samples/CZ CMS Logs Sample.xlsx` (CMS) and `tests/fixtures/sampleLines.ts` (`SAMPLE_LINES`, text).

---

### Task 1: Protocol module — `handleRequest` text path

**Files:**
- Create: `src/app/worker/protocol.ts`
- Test: `tests/unit/worker.protocol.text.test.ts`

**Interfaces:**
- Consumes: `parseLinesAsync(lines, fileName, { onProgress })` from `src/app/parse/parseLinesAsync`; `analyze`, `mergeParsed` from `src/app/analyze`; `appendAll` from `src/app/parse/concatChunks`.
- Produces (later tasks rely on these exact names):
  - `type AnalysisRequest = { kind: 'text'; files: File[] } | { kind: 'cms'; files: File[] }`
  - `interface CmsFileOutcome { name: string; label: string; chargers: string[]; rows: number }`
  - `interface AnalysisPayload { result: AnalysisResult; cms?: { outcomes: CmsFileOutcome[] } }`
  - `type ProgressFn = (label: string, pct?: number) => void`
  - `type WorkerReply = { kind: 'progress'; label: string; pct?: number } | { kind: 'result'; payload: AnalysisPayload } | { kind: 'error'; message: string }`
  - `async function handleRequest(req: AnalysisRequest, progress: ProgressFn): Promise<AnalysisPayload>`

- [ ] **Step 1: Write the failing test**

```ts
// tests/unit/worker.protocol.text.test.ts
import { describe, it, expect } from 'vitest';
import { handleRequest } from '../../src/app/worker/protocol';
import { analyzeLogLines } from '../../src/app/analyze';
import { SAMPLE_LINES } from '../fixtures/sampleLines';

const text = SAMPLE_LINES.join('\n');

describe('handleRequest — text', () => {
  it('produces the same AnalysisResult as the direct pipeline', async () => {
    const file = new File([text], 'sample.log');
    const labels: string[] = [];
    const { result, cms } = await handleRequest(
      { kind: 'text', files: [file] },
      (label) => labels.push(label),
    );
    const direct = analyzeLogLines(SAMPLE_LINES, 'sample.log');
    expect(result.messages).toHaveLength(direct.messages.length);
    expect(result.transactions).toEqual(direct.transactions);
    expect(result.messageGroups.BootNotification).toHaveLength(1);
    expect(result.rawLogLines).toEqual(SAMPLE_LINES);
    expect(cms).toBeUndefined();
    expect(labels.some((l) => l.includes('File 1/1'))).toBe(true);
    expect(labels.some((l) => l.toLowerCase().includes('analyz'))).toBe(true);
  });

  it('merges multiple files in order', async () => {
    const a = new File([text], 'a.log');
    const b = new File([text], 'b.log');
    const { result } = await handleRequest({ kind: 'text', files: [a, b] }, () => {});
    expect(result.filesProcessed).toEqual(['a.log', 'b.log']);
    expect(result.rawLogLines).toHaveLength(SAMPLE_LINES.length * 2);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/worker.protocol.text.test.ts`
Expected: FAIL — "Failed to load url ../../src/app/worker/protocol"

- [ ] **Step 3: Write minimal implementation**

```ts
// src/app/worker/protocol.ts
// Worker-side analysis protocol: request/reply message types + the pure
// handleRequest() that runs the existing pipelines. All heavy compute funnels
// through here so the worker file itself stays dispatch-only (and this logic
// stays unit-testable in node, where Worker doesn't exist).
//
// File objects are structured-cloneable, so requests carry File[] and the
// READING (file.text() / arrayBuffer, line split, XLSX.read) also happens off
// the main thread.

import { parseLinesAsync } from '../parse/parseLinesAsync';
import { appendAll } from '../parse/concatChunks';
import { analyze, mergeParsed, type AnalysisResult } from '../analyze';
import type { ParsedLines } from '../parse/parseLines';

export type AnalysisRequest =
  | { kind: 'text'; files: File[] }
  | { kind: 'cms'; files: File[] };

/** Per-file CMS outcome for the source-info banner. */
export interface CmsFileOutcome {
  name: string;
  label: string;
  chargers: string[];
  rows: number;
}

export interface AnalysisPayload {
  result: AnalysisResult;
  cms?: { outcomes: CmsFileOutcome[] };
}

export type ProgressFn = (label: string, pct?: number) => void;

export type WorkerReply =
  | { kind: 'progress'; label: string; pct?: number }
  | { kind: 'result'; payload: AnalysisPayload }
  | { kind: 'error'; message: string };

/** Run the requested pipeline. Throws on failure (caller converts to 'error'). */
export async function handleRequest(req: AnalysisRequest, progress: ProgressFn): Promise<AnalysisPayload> {
  if (req.kind === 'text') return handleText(req.files, progress);
  return handleCms(req.files, progress);
}

async function handleText(files: File[], progress: ProgressFn): Promise<AnalysisPayload> {
  const parts: ParsedLines[] = [];
  const allLines: string[] = [];
  const names: string[] = [];
  for (let fi = 0; fi < files.length; fi++) {
    const file = files[fi];
    const lines = (await file.text()).split(/\r?\n/);
    // Same chunked parse + progress format as the previous main-thread path.
    const parsed = await parseLinesAsync(lines, file.name, {
      onProgress: (done, total) => {
        const pct = total > 0 ? Math.round((done / total) * 100) : 100;
        progress(`File ${fi + 1}/${files.length}: Processing lines ${done}/${total}…`, pct);
      },
    });
    parts.push(parsed);
    appendAll(allLines, lines);
    names.push(file.name);
  }
  progress('Correlating & analyzing…');
  return { result: analyze(mergeParsed(parts), allLines, names) };
}

async function handleCms(_files: File[], _progress: ProgressFn): Promise<AnalysisPayload> {
  throw new Error('cms path implemented in Task 2');
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/worker.protocol.text.test.ts`
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add src/app/worker/protocol.ts tests/unit/worker.protocol.text.test.ts
git commit -m "feat(perf): worker protocol — handleRequest text path

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 2: `handleRequest` CMS path + unknown-format error fidelity

**Files:**
- Modify: `src/app/worker/protocol.ts` (replace the Task-1 `handleCms` stub)
- Test: `tests/unit/worker.protocol.cms.test.ts`

**Interfaces:**
- Consumes: `parseCmsWorkbook(ab, name)` from `src/app/cms/parseCmsWorkbook` (returns `{ parsed, adapter, chargers }`); `mergeCmsParsed(parts)` from `src/app/cms/mergeCmsParsed`; `CmsParsed` from `src/app/cms/types`.
- Produces: the `cms.outcomes` field of `AnalysisPayload` (shape locked in Task 1).

- [ ] **Step 1: Write the failing test**

```ts
// tests/unit/worker.protocol.cms.test.ts
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import * as XLSX from 'xlsx';
import { handleRequest } from '../../src/app/worker/protocol';

const SAMPLE = resolve(__dirname, '../../data/samples/CZ CMS Logs Sample.xlsx');

function fileFrom(buf: Buffer, name: string): File {
  return new File([buf], name);
}

describe('handleRequest — cms', () => {
  it('runs the CMS pipeline on the real CZ sample and returns outcomes', async () => {
    const labels: string[] = [];
    const { result, cms } = await handleRequest(
      { kind: 'cms', files: [fileFrom(readFileSync(SAMPLE), 'CZ.xlsx')] },
      (label) => labels.push(label),
    );
    expect(result.messages).toHaveLength(3204);   // QA baseline
    expect(result.transactions).toHaveLength(12); // QA baseline
    expect(result.alerts).toHaveLength(12);       // QA baseline
    expect(cms?.outcomes).toEqual([
      { name: 'CZ.xlsx', label: 'CZ', chargers: ['MH0055'], rows: 3204 },
    ]);
    expect(labels.some((l) => l.includes('CZ.xlsx'))).toBe(true);
  });

  it('propagates the unrecognized-format error message verbatim', async () => {
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([['a', 'b'], [1, 2]]), 'S');
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
    await expect(
      handleRequest({ kind: 'cms', files: [fileFrom(buf, 'x.xlsx')] }, () => {}),
    ).rejects.toThrow(/Unrecognized CMS log format/);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/worker.protocol.cms.test.ts`
Expected: FAIL — "cms path implemented in Task 2"

- [ ] **Step 3: Write minimal implementation** (replace the stub in `src/app/worker/protocol.ts`)

```ts
// add to imports at top of protocol.ts:
import { parseCmsWorkbook } from '../cms/parseCmsWorkbook';
import { mergeCmsParsed } from '../cms/mergeCmsParsed';
import type { CmsParsed } from '../cms/types';

// replace the Task-1 stub:
async function handleCms(files: File[], progress: ProgressFn): Promise<AnalysisPayload> {
  const parts: CmsParsed[] = [];
  const outcomes: CmsFileOutcome[] = [];
  const names: string[] = [];
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    progress(`Reading ${file.name} (${i + 1}/${files.length})…`);
    const ab = await file.arrayBuffer();
    const { parsed, adapter, chargers } = await parseCmsWorkbook(ab, file.name);
    parts.push(parsed);
    names.push(file.name);
    outcomes.push({ name: file.name, label: adapter.label, chargers, rows: parsed.messages.length });
  }
  progress('Correlating & analyzing…');
  const { parsed, rawLogLines } = mergeCmsParsed(parts);
  return { result: analyze(parsed, rawLogLines, names), cms: { outcomes } };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/worker.protocol.cms.test.ts tests/unit/worker.protocol.text.test.ts`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add src/app/worker/protocol.ts tests/unit/worker.protocol.cms.test.ts
git commit -m "feat(perf): worker protocol — CMS path + error fidelity

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 3: Clone-integrity guarantee (worker-boundary safety test)

**Files:**
- Test: `tests/unit/worker.cloneIntegrity.test.ts` (no implementation — this test *is* the deliverable; it pins the spec §4 guarantee)

**Interfaces:**
- Consumes: `handleRequest` (Task 1/2), `structuredClone` (node ≥17 global).

- [ ] **Step 1: Write the test**

```ts
// tests/unit/worker.cloneIntegrity.test.ts
// Spec §4 guarantee: AnalysisResult must survive the worker's structured-clone
// boundary intact. If anyone ever adds a non-clonable field (function, DOM node,
// class instance relying on its prototype), this fails in CI — not in the browser.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { handleRequest } from '../../src/app/worker/protocol';
import { SAMPLE_LINES } from '../fixtures/sampleLines';

describe('AnalysisResult structured-clone integrity', () => {
  it('text-path result deep-equals its structuredClone', async () => {
    const file = new File([SAMPLE_LINES.join('\n')], 'sample.log');
    const { result } = await handleRequest({ kind: 'text', files: [file] }, () => {});
    const clone = structuredClone(result);
    expect(clone.internalTxMap).toBeInstanceOf(Map);
    expect(clone).toEqual(result);
  });

  it('cms-path result deep-equals its structuredClone (real CZ sample)', async () => {
    const buf = readFileSync(resolve(__dirname, '../../data/samples/CZ CMS Logs Sample.xlsx'));
    const { result } = await handleRequest({ kind: 'cms', files: [new File([buf], 'CZ.xlsx')] }, () => {});
    const clone = structuredClone(result);
    expect(clone.internalTxMap).toBeInstanceOf(Map);
    expect(clone.messages).toHaveLength(result.messages.length);
    expect(clone).toEqual(result);
  });
});
```

- [ ] **Step 2: Run the test**

Run: `npx vitest run tests/unit/worker.cloneIntegrity.test.ts`
Expected: PASS. (If it FAILS, a field in `AnalysisResult` is not clone-safe — identify it, report to the user, do NOT silently change analyzer output shapes.)

- [ ] **Step 3: Commit**

```bash
git add tests/unit/worker.cloneIntegrity.test.ts
git commit -m "test(perf): pin structured-clone integrity of AnalysisResult

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 4: Worker file + runner (spawn, relay, fallback, cancel)

**Files:**
- Create: `src/app/worker/analysis.worker.ts`
- Create: `src/app/worker/runner.ts`
- Test: `tests/unit/worker.runner.test.ts`

**Interfaces:**
- Consumes: `handleRequest`, `AnalysisRequest`, `AnalysisPayload`, `ProgressFn`, `WorkerReply` (Task 1).
- Produces (mounts rely on these):
  - `async function runAnalysis(req: AnalysisRequest, onProgress: ProgressFn): Promise<AnalysisPayload>`
  - `function cancelActiveAnalysis(): void`

- [ ] **Step 1: Write the failing test**

```ts
// tests/unit/worker.runner.test.ts
// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { runAnalysis, cancelActiveAnalysis } from '../../src/app/worker/runner';
import { SAMPLE_LINES } from '../fixtures/sampleLines';
import type { WorkerReply } from '../../src/app/worker/protocol';

afterEach(() => {
  vi.unstubAllGlobals();
  cancelActiveAnalysis();
});

describe('runAnalysis — direct fallback (no Worker in this env)', () => {
  it('falls back to in-thread handleRequest and still returns the result', async () => {
    // jsdom has no Worker → constructor throws/undefined → direct path.
    const file = new File([SAMPLE_LINES.join('\n')], 'sample.log');
    const labels: string[] = [];
    const { result } = await runAnalysis({ kind: 'text', files: [file] }, (l) => labels.push(l));
    expect(result.messages.length).toBeGreaterThan(0);
    expect(labels.length).toBeGreaterThan(0);
  });
});

describe('runAnalysis — worker path (mocked Worker)', () => {
  class MockWorker {
    static instances: MockWorker[] = [];
    onmessage: ((e: MessageEvent<WorkerReply>) => void) | null = null;
    onerror: ((e: ErrorEvent) => void) | null = null;
    posted: unknown[] = [];
    terminated = false;
    constructor() { MockWorker.instances.push(this); }
    postMessage(msg: unknown): void { this.posted.push(msg); }
    terminate(): void { this.terminated = true; }
    emit(reply: WorkerReply): void { this.onmessage?.({ data: reply } as MessageEvent<WorkerReply>); }
  }

  it('relays progress and resolves with the result payload', async () => {
    MockWorker.instances = [];
    vi.stubGlobal('Worker', MockWorker as unknown as typeof Worker);
    const labels: string[] = [];
    const p = runAnalysis({ kind: 'text', files: [] }, (l) => labels.push(l));
    const w = MockWorker.instances[0];
    expect(w.posted).toHaveLength(1);
    w.emit({ kind: 'progress', label: 'Correlating & analyzing…' });
    const payload = { result: { messages: [] } } as never;
    w.emit({ kind: 'result', payload });
    await expect(p).resolves.toBe(payload);
    expect(labels).toContain('Correlating & analyzing…');
    expect(w.terminated).toBe(true); // worker torn down after completion
  });

  it('rejects with the worker error message verbatim', async () => {
    MockWorker.instances = [];
    vi.stubGlobal('Worker', MockWorker as unknown as typeof Worker);
    const p = runAnalysis({ kind: 'cms', files: [] }, () => {});
    MockWorker.instances[0].emit({ kind: 'error', message: 'Unrecognized CMS log format in "x.xlsx".' });
    await expect(p).rejects.toThrow('Unrecognized CMS log format in "x.xlsx".');
  });

  it('a new run terminates the previous in-flight worker (cancellation)', async () => {
    MockWorker.instances = [];
    vi.stubGlobal('Worker', MockWorker as unknown as typeof Worker);
    void runAnalysis({ kind: 'text', files: [] }, () => {}).catch(() => {});
    const first = MockWorker.instances[0];
    void runAnalysis({ kind: 'text', files: [] }, () => {}).catch(() => {});
    expect(first.terminated).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/worker.runner.test.ts`
Expected: FAIL — "Failed to load url ../../src/app/worker/runner"

- [ ] **Step 3: Write minimal implementation** (two files)

```ts
// src/app/worker/analysis.worker.ts
// Dispatch-only worker: all logic lives in the unit-tested protocol module.
import { handleRequest, type AnalysisRequest, type WorkerReply } from './protocol';

self.onmessage = async (e: MessageEvent<AnalysisRequest>) => {
  const post = (reply: WorkerReply): void => self.postMessage(reply);
  try {
    const payload = await handleRequest(e.data, (label, pct) => post({ kind: 'progress', label, pct }));
    post({ kind: 'result', payload });
  } catch (err) {
    post({ kind: 'error', message: err instanceof Error ? err.message : String(err) });
  }
};
```

```ts
// src/app/worker/runner.ts
// Spawns the analysis worker per run and relays progress. If Worker is
// unavailable (old env, node), falls back to running handleRequest in-thread —
// worst case is exactly the pre-worker behavior.
import { handleRequest, type AnalysisRequest, type AnalysisPayload, type ProgressFn, type WorkerReply } from './protocol';

let activeWorker: Worker | null = null;

/** Terminate any in-flight analysis (called automatically on a new run). */
export function cancelActiveAnalysis(): void {
  activeWorker?.terminate();
  activeWorker = null;
}

export async function runAnalysis(req: AnalysisRequest, onProgress: ProgressFn): Promise<AnalysisPayload> {
  cancelActiveAnalysis();
  let worker: Worker;
  try {
    worker = new Worker(new URL('./analysis.worker.ts', import.meta.url), { type: 'module' });
  } catch {
    return handleRequest(req, onProgress); // direct in-thread fallback
  }
  activeWorker = worker;
  return new Promise<AnalysisPayload>((resolve, reject) => {
    const done = (): void => {
      worker.terminate();
      if (activeWorker === worker) activeWorker = null;
    };
    worker.onmessage = (e: MessageEvent<WorkerReply>) => {
      const msg = e.data;
      if (msg.kind === 'progress') { onProgress(msg.label, msg.pct); return; }
      done();
      if (msg.kind === 'result') resolve(msg.payload);
      else reject(new Error(msg.message));
    };
    worker.onerror = (e) => { done(); reject(new Error(e.message || 'Analysis worker failed')); };
    worker.postMessage(req);
  });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/worker.runner.test.ts`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add src/app/worker/analysis.worker.ts src/app/worker/runner.ts tests/unit/worker.runner.test.ts
git commit -m "feat(perf): analysis worker + runner with direct fallback and cancellation

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 5: Switch `mountParser` to the runner (autosave + progress preserved)

**Files:**
- Modify: `src/app/nav/mountParser.ts` (full replacement below)
- Test: `tests/unit/mountParser.worker.test.ts`

**Interfaces:**
- Consumes: `runAnalysis` (Task 4); existing `renderShell`, `renderResults`, `autoSaveWithUx`, `initLogRepository`, `loadAndAnalyzeFromRepo`.
- Produces: nothing new — behavior-preserving refactor.

- [ ] **Step 1: Write the failing test**

```ts
// tests/unit/mountParser.worker.test.ts
// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { analyzeLogLines } from '../../src/app/analyze';
import { SAMPLE_LINES } from '../fixtures/sampleLines';

const autoSaveSpy = vi.fn();
vi.mock('../../src/app/render/repository/autoSaveUx', () => ({
  autoSaveWithUx: (...args: unknown[]) => { autoSaveSpy(...args); return Promise.resolve(); },
}));
vi.mock('../../src/app/render/repository/panel', () => ({ initLogRepository: vi.fn().mockResolvedValue(undefined) }));
vi.mock('../../src/app/render/repository/loadAnalyze', () => ({ loadAndAnalyzeFromRepo: vi.fn() }));
vi.mock('../../src/app/worker/runner', () => ({
  runAnalysis: vi.fn(async (_req: unknown, onProgress: (l: string, p?: number) => void) => {
    onProgress('File 1/1: Processing lines 5/5…', 100);
    onProgress('Correlating & analyzing…');
    return { result: analyzeLogLines(SAMPLE_LINES, 'sample.log') };
  }),
}));

import { mountParser } from '../../src/app/nav/mountParser';

function fakeFile(name: string, text: string): File {
  return { name, text: async () => text } as unknown as File;
}

describe('mountParser via runner', () => {
  it('runs analysis through the runner, updates progress, autosaves, renders', async () => {
    const root = document.createElement('div');
    document.body.appendChild(root);
    mountParser(root);
    const input = root.querySelector<HTMLInputElement>('#log-file-input')!;
    const btn = root.querySelector<HTMLButtonElement>('#parse-log-btn')!;
    Object.defineProperty(input, 'files', { value: [fakeFile('sample.log', SAMPLE_LINES.join('\n'))] });
    input.dispatchEvent(new Event('change'));
    btn.click();
    const container = root.querySelector<HTMLElement>('#parsed-data-container')!;
    for (let i = 0; i < 100 && container.textContent === ''; i++) await new Promise((r) => setTimeout(r, 20));

    expect(container.textContent).toContain('Boot Notifications');
    expect(autoSaveSpy).toHaveBeenCalledWith('sample.log', SAMPLE_LINES.join('\n'));
    expect(root.querySelector('#progress-text')).not.toBeNull();
    expect(btn.disabled).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/mountParser.worker.test.ts`
Expected: FAIL — sections render but `runAnalysis` mock was never called (current mount does its own pipeline), or autosave/progress assertions fail. Confirm the failure reason before proceeding.

Note: jsdom lacks `requestAnimationFrame` timing quirks are avoided by the implementation using `requestAnimationFrame` with a `setTimeout` fallback (see Step 3).

- [ ] **Step 3: Write the implementation** (full replacement of `src/app/nav/mountParser.ts`)

```ts
// Mounts the Client Log Parser view into a given container.
// Compute (file read, chunked parse, analyze) runs in the analysis Web Worker
// via runAnalysis() — the main thread only auto-saves and renders, so large
// files no longer freeze the UI (spec: 2026-07-09-analysis-worker-design.md).

import { renderShell } from '../render/shell';
import { renderResults } from '../render/renderResults';
import { runAnalysis } from '../worker/runner';
import { autoSaveWithUx } from '../render/repository/autoSaveUx';
import { initLogRepository } from '../render/repository/panel';
import { loadAndAnalyzeFromRepo } from '../render/repository/loadAnalyze';

/** Yield one frame so progress UI can repaint before the (heavy) DOM render. */
function nextFrame(): Promise<void> {
  return new Promise((resolve) => {
    if (typeof requestAnimationFrame === 'function') requestAnimationFrame(() => resolve());
    else setTimeout(resolve, 0);
  });
}

export function mountParser(mountEl: HTMLElement): void {
  const { fileInput, parseBtn, container, repoMount, progress } = renderShell(mountEl);

  // Log Repository panel (FR-184/189) — unchanged, stays on the main thread.
  void initLogRepository(repoMount, { onLoadAnalyze: (id) => loadAndAnalyzeFromRepo(id, container) });

  parseBtn.addEventListener('click', async () => {
    const files = Array.from(fileInput.files ?? []);
    if (files.length === 0) return;
    parseBtn.disabled = true;
    parseBtn.textContent = 'Parsing…';
    progress.container.classList.remove('hidden');
    try {
      // Auto-save is main-thread and failure-isolated — unchanged behavior.
      for (const file of files) {
        void file.text().then((text) => autoSaveWithUx(file.name, text));
      }
      const { result } = await runAnalysis({ kind: 'text', files }, (label, pct) => {
        progress.text.textContent = label;
        if (pct !== undefined) {
          progress.percent.textContent = `${pct}%`;
          progress.bar.style.width = `${pct}%`;
        }
      });
      progress.text.textContent = 'Rendering…';
      await nextFrame();
      renderResults(container, result);
    } catch (err) {
      // Surface failures instead of silently rendering nothing.
      console.error('Parse/analyze failed:', err);
      container.innerHTML = `<div class="bg-red-50 dark:bg-red-900/20 border border-red-300 dark:border-red-700 text-red-700 dark:text-red-300 p-4 rounded-lg">Failed to process the uploaded file(s): ${err instanceof Error ? err.message : String(err)}</div>`;
    } finally {
      progress.container.classList.add('hidden');
      progress.bar.style.width = '0%';
      parseBtn.textContent = 'Parse Files';
      parseBtn.disabled = false;
    }
  });
}
```

(Note: `console.error` was already present in this file's catch; it stays — the "no console.log" rule is about debug logging, and errors remain diagnosable.)

- [ ] **Step 4: Run the new test + the pre-existing suite for this area**

Run: `npx vitest run tests/unit/mountParser.worker.test.ts tests/unit/parseAsync.test.ts tests/unit/largeFileMerge.test.ts`
Expected: ALL PASS

- [ ] **Step 5: Commit**

```bash
git add src/app/nav/mountParser.ts tests/unit/mountParser.worker.test.ts
git commit -m "feat(perf): mountParser computes via the analysis worker

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 6: Switch `mountCmsParser` to the runner (banner + error fidelity preserved)

**Files:**
- Modify: `src/app/cms/mountCmsParser.ts` (full replacement below)
- Modify: `tests/unit/cms.mountCmsParser.test.ts` (full replacement below — it currently mocks `parseCmsWorkbook`, which the mount no longer imports)

**Interfaces:**
- Consumes: `runAnalysis`, `CmsFileOutcome` (Tasks 1/4); existing `renderCmsShell`, `renderResults`.

- [ ] **Step 1: Rewrite the wiring test (failing against current code)** — full replacement of `tests/unit/cms.mountCmsParser.test.ts`:

```ts
// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { cmsRowsToParsedLines } from '../../src/app/cms/rowsToParsedLines';
import { analyze } from '../../src/app/analyze';
import type { CmsRow } from '../../src/app/cms/types';

// Real Excel parsing is proven in node-env tests (worker.protocol.cms). Here we
// mock the runner and verify the VIEW WIRING: upload → progress → sections +
// source banner; error → panel.
const runAnalysisMock = vi.fn();
vi.mock('../../src/app/worker/runner', () => ({ runAnalysis: (...a: never[]) => runAnalysisMock(...a) }));

import { mountCmsParser } from '../../src/app/cms/mountCmsParser';

function okPayload(fileName: string) {
  const rows: CmsRow[] = [
    { requestString: '[2,"h","Heartbeat",{}]', responseString: '[3,"h",{"currentTime":"2025-08-07T18:32:42.764Z"}]', requestTime: '08/08/2025, 00:02:42', responseTime: '08/08/2025, 00:02:42', sheetName: 'MH0055' },
    { requestString: '[2,"s","StatusNotification",{"connectorId":1,"errorCode":"GroundFailure","status":"Faulted"}]', responseString: '[3,"s",{}]', requestTime: '08/08/2025, 00:03:00', responseTime: '08/08/2025, 00:03:00', sheetName: 'MH0055' },
  ];
  const parsed = cmsRowsToParsedLines(rows, fileName);
  return {
    result: analyze(parsed, parsed.rawLogLines, [fileName]),
    cms: { outcomes: [{ name: fileName, label: 'CZ', chargers: ['MH0055'], rows: parsed.messages.length }] },
  };
}

function fakeFile(name: string): File {
  return { name } as unknown as File;
}

async function mountAndParse(files: File[]) {
  const root = document.createElement('div');
  document.body.appendChild(root);
  mountCmsParser(root);
  const input = root.querySelector<HTMLInputElement>('#cms-log-file-input')!;
  const btn = root.querySelector<HTMLButtonElement>('#cms-parse-btn')!;
  Object.defineProperty(input, 'files', { value: files });
  input.dispatchEvent(new Event('change'));
  btn.click();
  const container = root.querySelector<HTMLElement>('#cms-parsed-data-container')!;
  for (let i = 0; i < 100 && container.textContent === ''; i++) await new Promise((r) => setTimeout(r, 20));
  return { root, container, btn };
}

describe('mountCmsParser via runner', () => {
  it('renders sections + source banner from the runner payload', async () => {
    runAnalysisMock.mockImplementationOnce(async (_req, onProgress: (l: string) => void) => {
      onProgress('Reading CZ.xlsx (1/1)…');
      return okPayload('CZ.xlsx');
    });
    const { root, container } = await mountAndParse([fakeFile('CZ.xlsx')]);
    expect(container.textContent).toContain('Heartbeats');
    expect(container.textContent).toContain('Alerts');
    const info = root.querySelector<HTMLElement>('#cms-source-info')!;
    expect(info.classList.contains('hidden')).toBe(false);
    expect(info.textContent).toContain('CZ');
    expect(info.textContent).toContain('MH0055');
  });

  it('shows the error panel with the verbatim message when the runner rejects', async () => {
    runAnalysisMock.mockRejectedValueOnce(new Error('Unrecognized CMS log format'));
    const { container, btn } = await mountAndParse([fakeFile('bad.xlsx')]);
    expect(container.textContent).toContain('Failed to process');
    expect(container.textContent).toContain('Unrecognized CMS log format');
    expect(btn.disabled).toBe(false);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run tests/unit/cms.mountCmsParser.test.ts`
Expected: FAIL — current mount never calls the runner mock (it imports `parseCmsWorkbook` directly), so the container stays empty / assertions fail.

- [ ] **Step 3: Write the implementation** (full replacement of `src/app/cms/mountCmsParser.ts`)

```ts
// Mounts the CMS Log Parser view: upload Excel CMS logs -> shared analysis.
// Compute (arrayBuffer read, XLSX.read, adapters, analyze) runs in the analysis
// Web Worker via runAnalysis() — the spinner now actually spins during parsing
// (spec: 2026-07-09-analysis-worker-design.md).

import { renderCmsShell } from './renderCmsShell';
import { runAnalysis } from '../worker/runner';
import { renderResults } from '../render/renderResults';
import type { CmsFileOutcome } from '../worker/protocol';

/** Yield one frame so the spinner can repaint before the (heavy) DOM render. */
function nextFrame(): Promise<void> {
  return new Promise((resolve) => {
    if (typeof requestAnimationFrame === 'function') requestAnimationFrame(() => resolve());
    else setTimeout(resolve, 0);
  });
}

export function mountCmsParser(mountEl: HTMLElement): void {
  const { fileInput, parseBtn, container, sourceInfo, progress } = renderCmsShell(mountEl);

  parseBtn.addEventListener('click', async () => {
    const files = Array.from(fileInput.files ?? []);
    if (files.length === 0) return;
    parseBtn.disabled = true;
    parseBtn.textContent = 'Analyzing…';
    progress.container.classList.remove('hidden');
    sourceInfo.classList.add('hidden');
    container.innerHTML = '';

    try {
      const { result, cms } = await runAnalysis({ kind: 'cms', files }, (label) => {
        progress.text.textContent = label;
      });
      progress.text.textContent = 'Rendering…';
      await nextFrame();
      renderSourceInfo(sourceInfo, cms?.outcomes ?? [], result.messages.length, result.alerts.length);
      renderResults(container, result);
    } catch (err) {
      console.error('CMS parse/analyze failed:', err);
      container.innerHTML = `<div class="bg-red-50 dark:bg-red-900/20 border border-red-300 dark:border-red-700 text-red-700 dark:text-red-300 p-4 rounded-lg">Failed to process the CMS file(s): ${err instanceof Error ? err.message : String(err)}</div>`;
    } finally {
      progress.container.classList.add('hidden');
      parseBtn.textContent = 'Parse & Analyze';
      parseBtn.disabled = false;
    }
  });
}

/** Show a banner summarizing the detected customer format and per-file counts. */
function renderSourceInfo(host: HTMLElement, files: CmsFileOutcome[], totalMessages: number, totalAlerts: number): void {
  const labels = Array.from(new Set(files.map((f) => f.label))).join(', ');
  const fileRows = files
    .map((f) => `<li><span class="font-medium">${f.name}</span> — ${f.label} · charger <span class="font-mono">${f.chargers.join(', ') || f.name}</span> · ${f.rows} messages</li>`)
    .join('');
  host.innerHTML = `
    <div class="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-lg p-4 text-sm text-gray-700 dark:text-gray-200">
      <div class="font-semibold mb-1">Source: ${labels} CMS format · ${files.length} file(s) · ${totalMessages} messages · ${totalAlerts} alerts</div>
      <ul class="list-disc ml-5 mt-1 space-y-0.5">${fileRows}</ul>
    </div>`;
  host.classList.remove('hidden');
}
```

- [ ] **Step 4: Run the CMS suite**

Run: `npx vitest run tests/unit/cms.mountCmsParser.test.ts tests/unit/cms.rowsToParsedLines.test.ts tests/unit/cms.parseCmsWorkbook.test.ts`
Expected: ALL PASS

- [ ] **Step 5: Commit**

```bash
git add src/app/cms/mountCmsParser.ts tests/unit/cms.mountCmsParser.test.ts
git commit -m "feat(perf): mountCmsParser computes via the analysis worker

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 7: Full verification + chunk check + trackers

**Files:**
- Modify: `specs/roadmap.md`, `specs/tasks.md`, `skills/WORKFLOW.md`, `knowledge/project-journal.md` (tracker entries)

- [ ] **Step 1: Full suite + typecheck**

Run: `npx tsc --noEmit && npx vitest run`
Expected: 0 type errors; ALL tests pass (417 pre-existing + ~11 new). Any pre-existing test that fails = regression — stop and fix before continuing.

- [ ] **Step 2: Production build + worker chunk check**

Run: `npx vite build`
Expected: build succeeds AND the output lists a separate `dist/assets/analysis.worker-*.js` chunk (with `xlsx-*.js` still its own chunk). If the worker was inlined into the main bundle, the `new Worker(new URL(...))` syntax was altered — restore it exactly.

- [ ] **Step 3: Untouched-callers check (spec §3)**

Run: `git diff feat/cms-log-parser...HEAD --name-only`
Expected: NO changes under `src/app/render/repository/loadAnalyze.ts`, `src/simulator/`, `src/app/parse/`, `src/app/analyze.ts`, `src/app/cms/` except `mountCmsParser.ts`.

- [ ] **Step 4: Update trackers** — add to `specs/roadmap.md` (Parser detail), `specs/tasks.md` (Done + Open), `skills/WORKFLOW.md` (new feature block: Think/Plan/Build phases), `knowledge/project-journal.md` (dated entry). Content: worker design summary, test counts, what stayed untouched, browser verification pending.

- [ ] **Step 5: Commit**

```bash
git add specs/roadmap.md specs/tasks.md skills/WORKFLOW.md knowledge/project-journal.md
git commit -m "docs(perf): trackers current — analysis worker built (A-C), browser check pending

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

## Post-plan gates (not tasks — session workflow)

1. **User browser verification (mandatory pre-merge, spec §4):** `npm run dev` → upload a large text log (MH0135-class) — UI stays interactive, progress animates through "Correlating & analyzing…"; upload the CZ sample — spinner animates; repo **Load & Analyze** and Simulator→Parser handoff still work.
2. `/review` → `/qa` → PR into `feat/cms-log-parser` (or as user directs).
