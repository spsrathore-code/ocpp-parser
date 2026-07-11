import { ExchangeTracker } from './exchangeTracker';
import type { RawFrame, MessageResult, ValidationReport } from './types';

/**
 * Convenience: run the full L1–L3 pipeline over a stream of frames and return
 * the complete report. Deterministic and side-effect-free (VAL-010).
 */
export function validateBatch(frames: { frame: RawFrame; ts?: string }[]): ValidationReport {
  const tracker = new ExchangeTracker();
  const messages: MessageResult[] = [];

  for (const { frame, ts } of frames) {
    messages.push(tracker.add(frame, ts));
  }
  const exchanges = tracker.finalize();

  const valid = messages.filter(m => m.ok).length;
  const orphanCalls = exchanges.filter(e => e.status === 'orphan-call').length;
  const orphanResponses = exchanges.filter(e => e.status === 'orphan-response').length;

  const latencies = exchanges
    .map(e => e.latencyMs)
    .filter((n): n is number => typeof n === 'number');
  const avgLatencyMs = latencies.length > 0
    ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length)
    : null;

  return {
    messages,
    exchanges,
    summary: {
      total: messages.length,
      valid,
      invalid: messages.length - valid,
      orphanCalls,
      orphanResponses,
      avgLatencyMs,
    },
  };
}
