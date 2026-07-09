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
