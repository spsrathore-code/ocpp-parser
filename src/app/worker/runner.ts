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
