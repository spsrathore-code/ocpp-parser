import { describe, it, expect } from 'vitest';
import { buildOutageRows } from '../../src/app/uptime/outages';
import { mergedDowntimeByConnector } from '../../src/app/uptime/mergeIntervals';
import type { Episode } from '../../src/app/uptime/types';

const T0 = Date.UTC(2026, 7, 11, 0, 0, 0);
const at = (sec: number): number => T0 + sec * 1000;

function episode(over: Partial<Episode> = {}): Episode {
  return {
    sourceRow: 1, connectorId: 1, status: 'Faulted', errorCode: 'OtherError',
    vendorErrorCode: '17', info: 'EmergencyPressed', startUtc: at(0), endUtc: at(60),
    derivation: 'fault', ...over,
  };
}

describe('connector-0 fan-out', () => {
  it('passes a normal connector episode through as one row', () => {
    const rows = buildOutageRows([episode({ connectorId: 2 })], 'DC052', [1, 2]);
    expect(rows).toHaveLength(1);
    expect(rows[0].connectorId).toBe(2);
  });

  it('charges a unit-level Offline window to EVERY physical connector', () => {
    // A connector-0 outage takes the whole unit down, so it is counted against
    // each connector's availability.
    const rows = buildOutageRows([episode({ connectorId: 0, info: 'Offline', errorCode: 'Offline', derivation: 'offline' })], 'DC052', [1, 2]);
    expect(rows.map((r) => r.connectorId)).toEqual([1, 2]);
    expect(rows.every((r) => r.durationSec === 60)).toBe(true);
  });

  it('fans out to three connectors when the unit has three', () => {
    const rows = buildOutageRows([episode({ connectorId: 0, info: 'Offline', derivation: 'offline' })], 'DC052', [1, 2, 3]);
    expect(rows.map((r) => r.connectorId)).toEqual([1, 2, 3]);
  });

  it('suppresses a connector-0 episode that is NOT Offline', () => {
    // PowerFailure markers and other charger-level faults would double-count
    // against the connectors; they are reported separately and non-additively.
    const rows = buildOutageRows([episode({ connectorId: 0, info: 'PowerFailure', derivation: 'powerFailure' })], 'DC052', [1, 2]);
    expect(rows).toHaveLength(0);
  });
});

describe('durations', () => {
  it('computes duration in whole seconds', () => {
    expect(buildOutageRows([episode({ startUtc: at(0), endUtc: at(94) })], 'DC052', [1])[0].durationSec).toBe(94);
  });

  it('leaves an unresolved episode with a null duration, never zero', () => {
    const [r] = buildOutageRows([episode({ endUtc: null })], 'DC052', [1]);
    expect(r.durationSec).toBeNull();
  });

  it('gives a PowerFailure marker a zero duration', () => {
    const [r] = buildOutageRows([episode({ connectorId: 1, info: 'PowerFailure', startUtc: at(10), endUtc: at(10), derivation: 'powerFailure' })], 'DC052', [1]);
    expect(r.durationSec).toBe(0);
  });
});

// The headline metric. Raw summing double-counts simultaneous outages; this
// sweep merges overlapping windows per connector before subtracting.
describe('overlap merge sweep', () => {
  const iv = (connectorId: number, from: number, to: number) => ({ connectorId, startUtc: at(from), endUtc: at(to) });

  it('sums disjoint intervals unchanged', () => {
    expect(mergedDowntimeByConnector([iv(1, 0, 100), iv(1, 200, 300)])).toEqual({ 1: 200 });
  });

  it('counts a fully nested interval only once', () => {
    expect(mergedDowntimeByConnector([iv(1, 0, 1000), iv(1, 100, 200)])).toEqual({ 1: 1000 });
  });

  it('counts overlapping intervals as their union', () => {
    expect(mergedDowntimeByConnector([iv(1, 0, 100), iv(1, 50, 150)])).toEqual({ 1: 150 });
  });

  it('counts identical intervals once', () => {
    expect(mergedDowntimeByConnector([iv(1, 0, 100), iv(1, 0, 100)])).toEqual({ 1: 100 });
  });

  it('joins touching intervals without gaps or double counting', () => {
    expect(mergedDowntimeByConnector([iv(1, 0, 100), iv(1, 100, 200)])).toEqual({ 1: 200 });
  });

  it('RESETS per connector — the sweep must not run across connectors', () => {
    // DC052 removes 930 s of overlap on C1 and exactly 0 s on C2. That is only
    // possible if the running max end resets when the connector changes.
    expect(mergedDowntimeByConnector([iv(1, 0, 100), iv(2, 0, 100)])).toEqual({ 1: 100, 2: 100 });
  });

  it('is order-independent — input need not arrive sorted', () => {
    expect(mergedDowntimeByConnector([iv(1, 200, 300), iv(1, 0, 100), iv(1, 50, 150)])).toEqual({ 1: 250 });
  });

  it('never exceeds the raw sum (reconciliation gate 9)', () => {
    const intervals = [iv(1, 0, 100), iv(1, 50, 150), iv(1, 140, 160)];
    const raw = intervals.reduce((n, i) => n + (i.endUtc - i.startUtc) / 1000, 0);
    expect(mergedDowntimeByConnector(intervals)[1]).toBeLessThanOrEqual(raw);
  });

  it('returns nothing for an empty input', () => {
    expect(mergedDowntimeByConnector([])).toEqual({});
  });
});
