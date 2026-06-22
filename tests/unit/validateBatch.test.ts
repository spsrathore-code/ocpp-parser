import { describe, it, expect } from 'vitest';
import { validateBatch } from '../../src/services/validation/index';

const bootCall = [2, 'uid-1', 'BootNotification', { chargePointVendor: 'Ador', chargePointModel: 'DC-60' }];
const bootResult = [3, 'uid-1', { status: 'Accepted', currentTime: '2026-06-13T10:00:00Z', interval: 300 }];
const heartbeatCallNoResponse = [2, 'uid-2', 'Heartbeat', {}];

describe('validateBatch — end-to-end report (VAL-007)', () => {
  it('produces messages, exchanges, and an accurate summary', () => {
    const report = validateBatch([
      { frame: bootCall, ts: '2026-06-13T10:00:00.000Z' },
      { frame: bootResult, ts: '2026-06-13T10:00:00.200Z' },
      { frame: heartbeatCallNoResponse },
    ]);

    expect(report.messages).toHaveLength(3);
    expect(report.summary.total).toBe(3);
    expect(report.summary.valid).toBe(3);
    expect(report.summary.invalid).toBe(0);

    // One matched exchange (Boot) + one orphan call (Heartbeat).
    expect(report.exchanges).toHaveLength(2);
    expect(report.summary.orphanCalls).toBe(1);
    expect(report.summary.orphanResponses).toBe(0);
    expect(report.summary.avgLatencyMs).toBe(200);
  });

  it('counts invalid messages in the summary', () => {
    const report = validateBatch([
      { frame: [2, 'bad', 'BootNotification', { chargePointVendor: 'Ador' }] }, // missing model
    ]);
    expect(report.summary.invalid).toBe(1);
    expect(report.summary.valid).toBe(0);
  });

  it('avgLatencyMs is null when no exchange has both timestamps', () => {
    const report = validateBatch([{ frame: heartbeatCallNoResponse }]);
    expect(report.summary.avgLatencyMs).toBeNull();
  });
});

describe('public barrel (VAL-008 isomorphic surface)', () => {
  it('re-exports the full public API', async () => {
    const api = await import('../../src/services/validation/index');
    expect(typeof api.validateMessage).toBe('function');
    expect(typeof api.ExchangeTracker).toBe('function');
    expect(typeof api.validateBatch).toBe('function');
    expect(typeof api.registerProtocolRules).toBe('function');
  });
});
