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
    // (jsdom's File also lacks .text(); real browsers have it — use a stand-in.)
    const file = { name: 'sample.log', text: async () => SAMPLE_LINES.join('\n') } as unknown as File;
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
