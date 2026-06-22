import { describe, it, expect } from 'vitest';
import { computeValidationMetrics } from '../../src/app/render/sections/validationMetrics';
import type { ValidationReport } from '../../src/services/validation';

// Hand-built report: 1 malformed Call (L1), 1 StatusNotification Call missing a
// required field (L2/required) + 1 with a bad enum (L2/enum), 2 clean Heartbeat
// pairs, 1 orphan response. Exchanges carry latencies for percentile/RTT.
const report: ValidationReport = {
  messages: [
    { ok: false, kind: 'Call', action: undefined, messageId: 'bad', violations: [{ layer: 'L1', code: 'FRAME_INVALID', message: 'malformed' }] },
    { ok: false, kind: 'Call', action: 'StatusNotification', messageId: 's1', violations: [{ layer: 'L2', code: 'SCHEMA_VIOLATION', message: 'missing connectorId', detail: { keyword: 'required' } }] },
    { ok: false, kind: 'Call', action: 'StatusNotification', messageId: 's2', violations: [{ layer: 'L2', code: 'SCHEMA_VIOLATION', message: 'bad status enum', detail: { keyword: 'enum' } }] },
    { ok: true, kind: 'Call', action: 'Heartbeat', messageId: 'h1', violations: [] },
    { ok: true, kind: 'CallResult', messageId: 'h1', violations: [] },
    { ok: true, kind: 'Call', action: 'Heartbeat', messageId: 'h2', violations: [] },
    { ok: true, kind: 'CallResult', messageId: 'h2', violations: [] },
  ],
  exchanges: [
    { messageId: 'h1', action: 'Heartbeat', status: 'matched', latencyMs: 100, violations: [] },
    { messageId: 'h2', action: 'Heartbeat', status: 'matched', latencyMs: 300, violations: [] },
    { messageId: 'orph', action: undefined, status: 'orphan-response', violations: [] },
  ],
  summary: { total: 7, valid: 4, invalid: 3, orphanCalls: 0, orphanResponses: 1, avgLatencyMs: 200 },
};

describe('computeValidationMetrics (docs/Type Validation Metrics.md)', () => {
  const m = computeValidationMetrics(report);

  it('overall counts + validation success %', () => {
    expect(m.framesProcessed).toBe(7);
    expect(m.totalCalls).toBe(5);
    expect(m.totalResults).toBe(2);
    expect(m.totalCallErrors).toBe(0);
    expect(m.validationSuccessPct).toBeCloseTo((4 / 7) * 100, 1);
  });

  it('L1 frame metrics', () => {
    expect(m.l1.invalid).toBe(1);
    expect(m.l1.invalidByKind).toEqual({ Call: 1 });
  });

  it('L2 schema sub-categories + top offending action', () => {
    expect(m.l2.violations).toBe(2);
    expect(m.l2.missingFields).toBe(1);
    expect(m.l2.enumErrors).toBe(1);
    expect(m.l2.typeErrors).toBe(0);
    expect(m.l2.topAction).toEqual({ action: 'StatusNotification', count: 2 });
  });

  it('L3 pairing + orphans', () => {
    expect(m.l3.paired).toBe(2);
    expect(m.l3.pairingSuccessPct).toBeCloseTo((2 / 5) * 100, 1);
    expect(m.orphans.responses).toBe(1);
  });

  it('latency percentiles + status', () => {
    expect(m.latency.min).toBe(100);
    expect(m.latency.max).toBe(300);
    expect(m.latency.p95).toBe(300);
    expect(m.latency.status).toBe('Healthy'); // avg 200 < 500
    expect(m.latency.timeoutCount).toBe(0);
  });

  it('action-wise rollup', () => {
    const hb = m.actions.find((a) => a.action === 'Heartbeat')!;
    expect(hb.calls).toBe(2);
    expect(hb.avgRttMs).toBe(200);
    const sn = m.actions.find((a) => a.action === 'StatusNotification')!;
    expect(sn.schemaViolations).toBe(2);
  });

  it('overall compliance score (40/30/20/10 weighting)', () => {
    // frame = 100 - 1/7*100; schema = 100 - 2/7*100; pairing = 2/5*100; orphan = 100 - 1/7*100
    expect(m.scores.overall).toBeGreaterThan(0);
    expect(m.scores.overall).toBeLessThanOrEqual(100);
    expect(m.scores.pairing).toBeCloseTo(40, 0);
  });

  it('handles an empty report without dividing by zero', () => {
    const e = computeValidationMetrics({ messages: [], exchanges: [], summary: { total: 0, valid: 0, invalid: 0, orphanCalls: 0, orphanResponses: 0, avgLatencyMs: null } });
    expect(e.framesProcessed).toBe(0);
    expect(e.validationSuccessPct).toBe(0);
    expect(e.latency.status).toBe('—');
  });
});
