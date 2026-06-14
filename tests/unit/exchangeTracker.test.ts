import { describe, it, expect } from 'vitest';
import { ExchangeTracker } from '../../src/services/validation/exchangeTracker';

const bootCall = [2, 'uid-1', 'BootNotification', { chargePointVendor: 'Ador', chargePointModel: 'DC-60' }];
const bootResult = [3, 'uid-1', { status: 'Accepted', currentTime: '2026-06-13T10:00:00Z', interval: 300 }];

describe('ExchangeTracker — matching (VAL-004)', () => {
  it('pairs a Call with its matching CallResult as status=matched', () => {
    const t = new ExchangeTracker();
    t.add(bootCall);
    t.add(bootResult);
    const ex = t.finalize();
    expect(ex).toHaveLength(1);
    expect(ex[0]).toMatchObject({ messageId: 'uid-1', action: 'BootNotification', status: 'matched' });
    expect(ex[0].violations).toHaveLength(0);
  });

  it('flags a response whose payload does not match its Call as mismatch/RESULT_MISMATCH', () => {
    const t = new ExchangeTracker();
    t.add(bootCall);
    // A BootNotification result is missing required fields → checkCallResult fails
    t.add([3, 'uid-1', { currentTime: '2026-06-13T10:00:00Z' }]);
    const ex = t.finalize();
    expect(ex[0].status).toBe('mismatch');
    expect(ex[0].violations.some(v => v.layer === 'L3' && v.code === 'RESULT_MISMATCH')).toBe(true);
  });
});

describe('ExchangeTracker — orphans (VAL-005)', () => {
  it('reports a Call with no response as orphan-call/UNMATCHED_CALL', () => {
    const t = new ExchangeTracker();
    t.add(bootCall);
    const ex = t.finalize();
    expect(ex[0].status).toBe('orphan-call');
    expect(ex[0].violations[0].code).toBe('UNMATCHED_CALL');
  });

  it('reports a response with no Call as orphan-response/UNMATCHED_RESPONSE', () => {
    const t = new ExchangeTracker();
    t.add([3, 'ghost', { status: 'Accepted', currentTime: '2026-06-13T10:00:00Z', interval: 300 }]);
    const ex = t.finalize();
    expect(ex[0].status).toBe('orphan-response');
    expect(ex[0].violations[0].code).toBe('UNMATCHED_RESPONSE');
  });

  it('resolves an out-of-order response that arrives before its Call', () => {
    const t = new ExchangeTracker();
    t.add(bootResult);       // response first
    t.add(bootCall);         // call later
    const ex = t.finalize();
    expect(ex).toHaveLength(1);
    expect(ex[0].status).toBe('matched');
  });
});

describe('ExchangeTracker — MessageId reuse (regression: R1)', () => {
  it('treats a recycled MessageId as a fresh exchange (does not drop the second)', () => {
    const t = new ExchangeTracker();
    t.add(bootCall);     // a1 #1
    t.add(bootResult);   // a1 #1 response
    t.add(bootCall);     // a1 #2 (recycled id)
    t.add(bootResult);   // a1 #2 response
    const ex = t.finalize();
    expect(ex).toHaveLength(2);
    expect(ex.every(e => e.status === 'matched')).toBe(true);
  });

  it('flushes a still-pending Call as orphan-call when the same id is reused before a response', () => {
    const t = new ExchangeTracker();
    t.add(bootCall);     // a1 #1 — never answered
    t.add(bootCall);     // a1 #2 — displaces #1
    t.add(bootResult);   // answers #2
    const ex = t.finalize();
    expect(ex).toHaveLength(2);
    expect(ex[0].status).toBe('orphan-call');
    expect(ex[1].status).toBe('matched');
  });
});

describe('ExchangeTracker — latency (VAL-006)', () => {
  it('computes latencyMs from the two timestamps', () => {
    const t = new ExchangeTracker();
    t.add(bootCall, '2026-06-13T10:00:00.000Z');
    t.add(bootResult, '2026-06-13T10:00:00.250Z');
    const ex = t.finalize();
    expect(ex[0].latencyMs).toBe(250);
  });

  it('leaves latencyMs undefined when a timestamp is missing', () => {
    const t = new ExchangeTracker();
    t.add(bootCall, '2026-06-13T10:00:00.000Z');
    t.add(bootResult); // no ts
    const ex = t.finalize();
    expect(ex[0].latencyMs).toBeUndefined();
  });
});
