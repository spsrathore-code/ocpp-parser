import { describe, it, expect } from 'vitest';
import { buildDowntimeDetail } from '../../src/app/uptime/compare/downtimeDetail';
import type { OutageRow, SiteUptime } from '../../src/app/uptime/types';

const T0 = Date.UTC(2026, 8, 9, 0, 0, 0);
const at = (sec: number): number => T0 + sec * 1000;

function outage(over: Partial<OutageRow> = {}): OutageRow {
  const startUtc = over.startUtc ?? at(0);
  const endUtc = over.endUtc === undefined ? at(60) : over.endUtc;
  return {
    site: 'X', connectorId: 1, errorCode: 'OtherError', errorDescription: 'PowerFailure',
    vendorErrorCode: '19', startUtc, endUtc,
    durationSec: endUtc === null ? null : Math.round((endUtc - startUtc) / 1000),
    sourceRow: 100, endSourceRow: 90, derivation: 'powerFailure', ...over,
  };
}

const site = (name: string, rows: OutageRow[]): SiteUptime =>
  ({ site: name, connectors: [1, 2], outageRows: rows } as unknown as SiteUptime);

describe('Downtime Detail — pairing', () => {
  it('pairs events whose starts fall within the tolerance', () => {
    // Two co-located chargers see the same grid event seconds apart.
    const d = buildDowntimeDetail(
      site('DC056', [outage({ startUtc: at(0), endUtc: at(300) })]),
      site('DC057', [outage({ startUtc: at(45), endUtc: at(360) })]),
      { categories: ['PowerFailure'] },
    );
    expect(d.rows).toHaveLength(1);
    expect(d.rows[0].a).not.toBeNull();
    expect(d.rows[0].b).not.toBeNull();
  });

  it('does NOT pair events outside the tolerance', () => {
    const d = buildDowntimeDetail(
      site('A', [outage({ startUtc: at(0) })]),
      site('B', [outage({ startUtc: at(3600) })]),
      { categories: ['PowerFailure'], toleranceSec: 300 },
    );
    expect(d.rows).toHaveLength(2);
    expect(d.rows.filter((r) => r.a && r.b)).toHaveLength(0);
  });

  it('never pairs across connectors', () => {
    const d = buildDowntimeDetail(
      site('A', [outage({ connectorId: 1, startUtc: at(0) })]),
      site('B', [outage({ connectorId: 2, startUtc: at(0) })]),
      { categories: ['PowerFailure'] },
    );
    expect(d.rows).toHaveLength(2);
  });

  it('never pairs across categories', () => {
    const d = buildDowntimeDetail(
      site('A', [outage({ errorDescription: 'PowerFailure', startUtc: at(0) })]),
      site('B', [outage({ errorDescription: 'Offline', startUtc: at(0) })]),
      { categories: ['PowerFailure', 'Offline'] },
    );
    expect(d.rows).toHaveLength(2);
    expect(d.rows.every((r) => !(r.a && r.b))).toBe(true);
  });

  it('takes the nearest counterpart, not merely the first in range', () => {
    const d = buildDowntimeDetail(
      site('A', [outage({ startUtc: at(200) })]),
      site('B', [outage({ startUtc: at(0) }), outage({ startUtc: at(210) })]),
      { categories: ['PowerFailure'], toleranceSec: 300 },
    );
    const paired = d.rows.find((r) => r.a && r.b)!;
    expect(paired.b!.startUtc).toBe(at(210));
  });

  it('claims each counterpart once — two A events cannot share one B event', () => {
    const d = buildDowntimeDetail(
      site('A', [outage({ startUtc: at(0) }), outage({ startUtc: at(60) })]),
      site('B', [outage({ startUtc: at(30) })]),
      { categories: ['PowerFailure'], toleranceSec: 300 },
    );
    expect(d.rows.filter((r) => r.a && r.b)).toHaveLength(1);
    expect(d.rows.filter((r) => r.a && !r.b)).toHaveLength(1);
  });

  it('keeps a site-specific event, with the other half blank', () => {
    const d = buildDowntimeDetail(
      site('A', [outage({ startUtc: at(0) })]),
      site('B', []),
      { categories: ['PowerFailure'] },
    );
    expect(d.rows[0].a).not.toBeNull();
    expect(d.rows[0].b).toBeNull();
    // No delta: a difference against a missing event is meaningless.
    expect(d.rows[0].deltaMin).toBeNull();
  });

  it('keeps an event only the second site logged', () => {
    const d = buildDowntimeDetail(site('A', []), site('B', [outage({ startUtc: at(0) })]), { categories: ['PowerFailure'] });
    expect(d.rows).toHaveLength(1);
    expect(d.rows[0].a).toBeNull();
    expect(d.rows[0].b).not.toBeNull();
  });
});

describe('Downtime Detail — deltas and totals', () => {
  it('computes the row delta in minutes, A minus B', () => {
    const d = buildDowntimeDetail(
      site('A', [outage({ startUtc: at(0), endUtc: at(600) })]),   // 10 min
      site('B', [outage({ startUtc: at(0), endUtc: at(300) })]),   // 5 min
      { categories: ['PowerFailure'] },
    );
    expect(d.rows[0].deltaMin).toBe(5);
  });

  it('gives no delta when one side never resolved', () => {
    const d = buildDowntimeDetail(
      site('A', [outage({ startUtc: at(0), endUtc: null })]),
      site('B', [outage({ startUtc: at(0), endUtc: at(300) })]),
      { categories: ['PowerFailure'] },
    );
    expect(d.rows[0].deltaMin).toBeNull();
  });

  it('totals each side and reports the gap in hours', () => {
    const d = buildDowntimeDetail(
      site('A', [outage({ startUtc: at(0), endUtc: at(7200) })]),
      site('B', [outage({ startUtc: at(0), endUtc: at(3600) })]),
      { categories: ['PowerFailure'] },
    );
    expect(d.totalASec).toBe(7200);
    expect(d.totalBSec).toBe(3600);
    expect(d.deltaHours).toBe(1);
  });

  it('carries the log rows for both boundaries', () => {
    const d = buildDowntimeDetail(
      site('A', [outage({ sourceRow: 16826, endSourceRow: 16808 })]),
      site('B', []),
      { categories: ['PowerFailure'] },
    );
    expect(d.rows[0].a).toMatchObject({ startRow: 16826, endRow: 16808 });
  });
});

describe('Downtime Detail — reconciliation', () => {
  it('counts matched and site-specific events per category', () => {
    const d = buildDowntimeDetail(
      site('A', [
        outage({ startUtc: at(0) }),
        outage({ startUtc: at(7200) }),
        outage({ errorDescription: 'Offline', startUtc: at(0) }),
      ]),
      site('B', [outage({ startUtc: at(30) })]),
      { categories: ['PowerFailure', 'Offline'] },
    );
    const pf = d.reconciliation.find((r) => r.category === 'PowerFailure')!;
    expect(pf).toMatchObject({ matched: 1, aOnly: 1, bOnly: 0 });
    const off = d.reconciliation.find((r) => r.category === 'Offline')!;
    expect(off).toMatchObject({ matched: 0, aOnly: 1, bOnly: 0 });
  });

  it('reports every requested category, even with no events', () => {
    const d = buildDowntimeDetail(site('A', []), site('B', []), {
      categories: ['PowerFailure', 'Offline', 'EmergencyPressed', 'InputUnderVoltage'],
    });
    expect(d.reconciliation.map((r) => r.category)).toEqual([
      'PowerFailure', 'Offline', 'EmergencyPressed', 'InputUnderVoltage',
    ]);
  });
});
