import { describe, it, expect } from 'vitest';
import { computeHeartbeatSummary } from '../../src/app/health/heartbeatSummary';
import type { ParsedMessage } from '../../src/app/model/types';

/** A correlated Heartbeat request carrying its response's currentTime. */
const hb = (currentTime?: string): ParsedMessage => ({
  timestamp: currentTime ?? '2026-07-09T00:00:00.000Z',
  direction: 'sent',
  message: [2, 'id', 'Heartbeat', {}],
  lineNumber: 1,
  fileName: 'f',
  responsePayload: currentTime ? { currentTime } : null,
});

describe('computeHeartbeatSummary', () => {
  it("computes the interval from consecutive Heartbeat.conf currentTime (user's example)", () => {
    const s = computeHeartbeatSummary(
      [hb('2026-07-09T05:56:11.391Z'), hb('2026-07-09T05:58:11.479Z')],
      120,
    );
    expect(s.total).toBe(2);
    expect(s.intervalCount).toBe(1);
    expect(s.intervals[0].seconds).toBeCloseTo(120.088, 3);
    expect(s.avgSeconds).toBeCloseTo(120.088, 3);
    expect(s.minSeconds).toBeCloseTo(120.088, 3);
    expect(s.maxSeconds).toBeCloseTo(120.088, 3);
  });

  it('uses the configured BootNotification interval as expected, tagged as such', () => {
    const s = computeHeartbeatSummary([hb('2026-07-09T00:00:00Z'), hb('2026-07-09T00:02:00Z')], 120);
    expect(s.expectedSeconds).toBe(120);
    expect(s.expectedSource).toBe('configured');
  });

  it('falls back to the median interval when no configured interval', () => {
    // intervals: 60, 60, 60 → median 60
    const s = computeHeartbeatSummary(
      [hb('2026-07-09T00:00:00Z'), hb('2026-07-09T00:01:00Z'), hb('2026-07-09T00:02:00Z'), hb('2026-07-09T00:03:00Z')],
      null,
    );
    expect(s.expectedSeconds).toBe(60);
    expect(s.expectedSource).toBe('median');
  });

  it('flags an interval ≥ 1.5× expected as a missed heartbeat with an estimate', () => {
    // expected 120; second gap is 360s (~2 missed → 3× interval → estimate 2)
    const s = computeHeartbeatSummary(
      [hb('2026-07-09T00:00:00Z'), hb('2026-07-09T00:02:00Z'), hb('2026-07-09T00:08:00Z')],
      120,
    );
    expect(s.flagged).toHaveLength(1);
    expect(s.flagged[0].seconds).toBeCloseTo(360, 0);
    expect(s.flagged[0].missedEstimate).toBe(2);
    // the normal 120s interval is not flagged
    expect(s.intervals.filter((i) => i.flagged)).toHaveLength(1);
  });

  it('does not flag normal jitter around the expected interval', () => {
    const s = computeHeartbeatSummary([hb('2026-07-09T00:00:00Z'), hb('2026-07-09T00:02:00.100Z')], 120);
    expect(s.flagged).toHaveLength(0);
  });

  it('skips heartbeats without a usable currentTime and sorts unordered input', () => {
    const s = computeHeartbeatSummary(
      [hb('2026-07-09T00:02:00Z'), hb(undefined), hb('2026-07-09T00:00:00Z')],
      null,
    );
    expect(s.total).toBe(2); // the no-currentTime one is skipped
    expect(s.intervals[0].seconds).toBeCloseTo(120, 0); // sorted → 00:00 → 00:02
  });

  it('returns null stats when fewer than 2 usable heartbeats', () => {
    const s = computeHeartbeatSummary([hb('2026-07-09T00:00:00Z')], 120);
    expect(s.total).toBe(1);
    expect(s.intervalCount).toBe(0);
    expect(s.avgSeconds).toBeNull();
    expect(s.minSeconds).toBeNull();
    expect(s.maxSeconds).toBeNull();
    expect(s.intervals).toHaveLength(0);
  });
});
