import { OCPP16 } from 'typed-ocpp';
import { validateMessage } from './messageValidator';
import type { RawFrame, MessageResult, ExchangeResult, ExchangeStatus, Violation, SchemaError } from './types';

interface PendingCall {
  messageId: string;
  action?: string;
  ts?: string;
  frame: RawFrame;
}

interface PendingResponse {
  messageId: string;
  kind: 'CallResult' | 'CallError';
  frame: RawFrame;
  ts?: string;
}

type CheckFn = ((result: unknown, call: unknown) => boolean) & { errors?: SchemaError[] | null };
const checkCallResult = OCPP16.checkCallResult as unknown as CheckFn;

function computeLatency(callTs?: string, respTs?: string): number | undefined {
  if (!callTs || !respTs) return undefined;
  const a = Date.parse(callTs);
  const b = Date.parse(respTs);
  if (Number.isNaN(a) || Number.isNaN(b)) return undefined;
  return b - a;
}

/**
 * Correlates Calls with their responses over a stream of frames (L3).
 * Stateful: `add` each frame as it arrives, then `finalize` to resolve
 * remaining orphans and emit the exchange list.
 */
export class ExchangeTracker {
  private readonly calls = new Map<string, PendingCall>();
  private readonly earlyResponses: PendingResponse[] = [];
  private readonly resolved = new Set<string>();
  private readonly exchanges: ExchangeResult[] = [];

  add(frame: RawFrame, ts?: string): MessageResult {
    const result = validateMessage(frame);
    const id = result.messageId;
    if (!id) return result; // un-correlatable (e.g. L1-invalid frame)

    if (result.kind === 'Call') {
      this.calls.set(id, { messageId: id, action: result.action, ts, frame });
      // A response may have arrived earlier (out of order) — resolve it now.
      const pending = this.earlyResponses.find(r => r.messageId === id);
      if (pending) this.resolvePair(this.calls.get(id)!, pending);
    } else if (result.kind === 'CallResult' || result.kind === 'CallError') {
      const call = this.calls.get(id);
      const resp: PendingResponse = { messageId: id, kind: result.kind, frame, ts };
      if (call && !this.resolved.has(id)) this.resolvePair(call, resp);
      else this.earlyResponses.push(resp);
    }
    return result;
  }

  private resolvePair(call: PendingCall, resp: PendingResponse): void {
    this.resolved.add(call.messageId);
    const violations: Violation[] = [];
    let status: ExchangeStatus = 'matched';

    if (resp.kind === 'CallResult') {
      const matched = checkCallResult(resp.frame, call.frame);
      if (matched !== true) {
        status = 'mismatch';
        violations.push({
          layer: 'L3',
          code: 'RESULT_MISMATCH',
          message: `CallResult ${call.messageId} does not match its ${call.action ?? 'Call'}`,
          detail: checkCallResult.errors ?? undefined,
        });
      }
    }
    // A CallError is a legitimate response to its Call — counts as matched.

    this.exchanges.push({
      messageId: call.messageId,
      action: call.action,
      status,
      latencyMs: computeLatency(call.ts, resp.ts),
      violations,
    });
  }

  finalize(): ExchangeResult[] {
    // Early responses that never found a Call → orphan-response.
    for (const resp of this.earlyResponses) {
      if (this.resolved.has(resp.messageId)) continue;
      this.exchanges.push({
        messageId: resp.messageId,
        status: 'orphan-response',
        violations: [{
          layer: 'L3',
          code: 'UNMATCHED_RESPONSE',
          message: `Response ${resp.messageId} has no matching Call`,
        }],
      });
    }
    // Calls that never got a response → orphan-call.
    for (const call of this.calls.values()) {
      if (this.resolved.has(call.messageId)) continue;
      this.exchanges.push({
        messageId: call.messageId,
        action: call.action,
        status: 'orphan-call',
        violations: [{
          layer: 'L3',
          code: 'UNMATCHED_CALL',
          message: `Call ${call.messageId} (${call.action ?? 'unknown'}) has no response`,
        }],
      });
    }
    return this.exchanges;
  }
}
