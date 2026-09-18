import { describe, it, expect } from 'vitest';
import { buildErrorCodeComparison, ABSENT } from '../../src/app/uptime/compare/errorCodeCompare';
import { buildUptimeComparison } from '../../src/app/uptime/compare/uptimeCompare';
import { DEFAULT_UPTIME_OPTIONS, type FaultRow, type SiteUptime } from '../../src/app/uptime/types';

function site(name: string, faults: Partial<FaultRow>[], over: Partial<SiteUptime> = {}): SiteUptime {
  const faultRows = faults.map((f) => ({
    connectorId: f.connectorId ?? 1, status: f.status ?? 'Faulted',
    errorCode: f.errorCode ?? 'OtherError', vendorErrorCode: f.vendorErrorCode ?? '17',
    info: f.info ?? 'EmergencyPressed',
  }));
  return {
    site: name, connectors: [1, 2], faultRows, faultRowCount: faultRows.length,
    availableSec: 1000, siteAvailableSec: 2000,
    byErrorCode: [], byErrorDescription: [], chargerLevel: [], outageRows: [],
    perConnector: [
      { connectorId: 1, outageEvents: 0, rawDowntimeSec: 0, mergedDowntimeSec: 0, overlapRemovedSec: 0, uptimeRawPct: 100, uptimeAdjustedPct: 100 },
      { connectorId: 2, outageEvents: 0, rawDowntimeSec: 0, mergedDowntimeSec: 0, overlapRemovedSec: 0, uptimeRawPct: 100, uptimeAdjustedPct: 100 },
    ],
    siteRawDowntimeSec: 0, siteMergedDowntimeSec: 0,
    siteUptimeRawPct: 100, siteUptimeAdjustedPct: 100, unresolvedCount: 0,
    ...over,
  } as unknown as SiteUptime;
}

describe('ErrorCode_Comparison — labelling verdicts', () => {
  it('CONSISTENT when both sites use the same single code', () => {
    const cmp = buildErrorCodeComparison([
      site('A', [{ info: 'PowerFailure', errorCode: 'OtherError' }]),
      site('B', [{ info: 'PowerFailure', errorCode: 'OtherError' }]),
    ]);
    expect(cmp.byInfo[0].errorCodeVerdict).toBe('CONSISTENT');
  });

  it('MISMATCH when the same fault text is coded differently per site', () => {
    const cmp = buildErrorCodeComparison([
      site('A', [{ info: 'ReaderError', errorCode: 'ReaderFailure' }]),
      site('B', [{ info: 'ReaderError', errorCode: 'OtherError' }]),
    ]);
    expect(cmp.byInfo[0].errorCodeVerdict).toBe('MISMATCH');
  });

  it('reports a multi-coded fault as the same set rather than a false CONSISTENT', () => {
    // EVCOM really is logged under two codes on both DC052 and DC053.
    const cmp = buildErrorCodeComparison([
      site('A', [{ info: 'EVCOM', errorCode: 'OtherError' }, { info: 'EVCOM', errorCode: 'EVCommunicationError' }]),
      site('B', [{ info: 'EVCOM', errorCode: 'OtherError' }, { info: 'EVCOM', errorCode: 'EVCommunicationError' }]),
    ]);
    expect(cmp.byInfo[0].errorCodeVerdict).toBe('same set (both multi-coded)');
  });

  it('marks a one-sided fault as n/a, and shows an em dash rather than zero', () => {
    const cmp = buildErrorCodeComparison([
      site('A', [{ info: 'GroundFault', errorCode: 'GroundFailure' }]),
      site('B', []),
    ]);
    expect(cmp.byInfo[0].errorCodeVerdict).toBe('n/a - one-sided fault');
    // "never logged" must read differently from "logged with no code".
    expect(cmp.byInfo[0].errorCodes.B).toBe(ABSENT);
    expect(cmp.byInfo[0].rowCounts.B).toBe(0);
  });
});

describe('ErrorCode_Comparison — ambiguity within one charger', () => {
  it('flags a fault text logged under multiple codes AND statuses', () => {
    const cmp = buildErrorCodeComparison([site('A', [
      { info: 'EVCOM', errorCode: 'OtherError', status: 'Finishing' },
      { info: 'EVCOM', errorCode: 'EVCommunicationError', status: 'SuspendedEV' },
    ])]);
    expect(cmp.ambiguity[0].flag).toBe('AMBIGUOUS - multiple errorCodes AND statuses');
  });

  it('calls a single-code single-status fault clean', () => {
    const cmp = buildErrorCodeComparison([site('A', [{ info: 'PowerFailure' }, { info: 'PowerFailure' }])]);
    expect(cmp.ambiguity[0].flag).toBe('clean - single code & status');
  });

  it('distinguishes multiple statuses only from full ambiguity', () => {
    const cmp = buildErrorCodeComparison([site('A', [
      { info: 'EmergencyPressed', errorCode: 'OtherError', status: 'Faulted' },
      { info: 'EmergencyPressed', errorCode: 'OtherError', status: 'Finishing' },
    ])]);
    expect(cmp.ambiguity[0].flag).toBe('multiple statuses only');
  });

  it('keys block 3 on the vendor code, the stable identity', () => {
    const cmp = buildErrorCodeComparison([site('A', [{ info: 'EVCOM', vendorErrorCode: '88' }])]);
    expect(cmp.byVendorCode[0].key).toBe('88');
  });
});

describe('Uptime_Comparison', () => {
  const a = site('A', [], { siteUptimeAdjustedPct: 96.04, siteMergedDowntimeSec: 68472, outageRows: new Array(154) as never });
  const b = site('B', [], { siteUptimeAdjustedPct: 97.87, siteMergedDowntimeSec: 36833, outageRows: new Array(131) as never });

  it('measures Δ against the baseline site', () => {
    const cmp = buildUptimeComparison([a, b], DEFAULT_UPTIME_OPTIONS, 'A');
    const headline = cmp.metrics.find((m) => m.label === 'Uptime %')!;
    expect(headline.delta).toBeCloseTo(1.83, 2);
    expect(cmp.baselineSite).toBe('A');
  });

  it('emits one metric row per counted category, so the driver is visible', () => {
    const cmp = buildUptimeComparison([a, b], DEFAULT_UPTIME_OPTIONS, 'A');
    for (const category of DEFAULT_UPTIME_OPTIONS.countedCategories) {
      expect(cmp.metrics.some((m) => m.label === category)).toBe(true);
    }
  });

  it('states the uptime gap and its direction in the read-out', () => {
    const cmp = buildUptimeComparison([a, b], DEFAULT_UPTIME_OPTIONS, 'A');
    expect(cmp.readout[0]).toContain('96.04%');
    expect(cmp.readout[0]).toContain('97.87%');
    expect(cmp.readout[0]).toContain('B is ahead by 1.83 percentage points');
  });

  it('always states the counted-category scope, so a figure is never read without it', () => {
    const cmp = buildUptimeComparison([a, b], DEFAULT_UPTIME_OPTIONS, 'A');
    expect(cmp.readout.join(' ')).toContain('only PowerFailure, Offline, EmergencyPressed, InputUnderVoltage');
  });

  it('surfaces unresolved outages as a caveat rather than hiding the understatement', () => {
    const withUnresolved = site('C', [], { unresolvedCount: 3, siteUptimeAdjustedPct: 99 });
    const cmp = buildUptimeComparison([a, withUnresolved], DEFAULT_UPTIME_OPTIONS, 'A');
    expect(cmp.readout.join(' ')).toContain('never closed');
    expect(cmp.readout.join(' ')).toContain('understated');
  });
});

// The delta column is tinted green for an improvement and terracotta for a
// regression. Which direction counts as an improvement differs per row, so the
// metric carries it rather than the renderer guessing.
describe('Uptime_Comparison — delta direction', () => {
  const cmp = buildUptimeComparison(
    [site('A', []), site('B', [])],
    DEFAULT_UPTIME_OPTIONS,
    'A',
  );
  const row = (label: string) => cmp.metrics.find((m) => m.label === label)!;

  it('treats more uptime as better', () => {
    expect(row('Uptime %').higherIsBetter).toBe(true);
  });

  it('treats more downtime, and more outages, as worse', () => {
    expect(row('Total downtime').higherIsBetter).toBe(false);
    expect(row('Downtime %').higherIsBetter).toBe(false);
    expect(row('Outage events').higherIsBetter).toBe(false);
    expect(row('PowerFailure').higherIsBetter).toBe(false);
  });

  it('leaves available time uncoloured — neither direction is good or bad', () => {
    expect(row('Total available time').higherIsBetter).toBeNull();
  });

  it('shows only overlap-adjusted figures — the raw ones double-count', () => {
    const labels = cmp.metrics.map((m) => m.label);
    expect(labels).not.toContain('Total downtime (raw sum)');
    expect(labels).not.toContain('Uptime % (raw)');
    expect(labels).toEqual(expect.arrayContaining(['Total downtime', 'Downtime %', 'Uptime %']));
  });

  it('keeps the overlap correction as evidence, even though it is not a row', () => {
    expect(cmp.overlapRemovedSec).toBeDefined();
    expect(Object.keys(cmp.overlapRemovedSec)).toEqual(['A', 'B']);
  });

  it('drops the redundant "Downtime —" prefix from category rows', () => {
    // The column already says these are downtime, and the category token has to
    // match the vendor fault text in the log verbatim.
    expect(cmp.metrics.map((m) => m.label)).toContain('PowerFailure');
    expect(cmp.metrics.some((m) => m.label.startsWith('Downtime —'))).toBe(false);
  });
});

// "How available was the charger over the time it was actually answerable for?"
// Grid failures, emergency stops and under-voltage are discounted from BOTH the
// downtime and the window — so this is deliberately NOT 100 − Downtime %.
describe('Uptime % excluding discounted categories', () => {
  it('reaches 100% when every outage is a discounted category', () => {
    // Nothing left to hold the charger responsible for.
    const s = site('A', [], {
      availableSec: 1000, siteAvailableSec: 1000,
      siteMergedDowntimeSec: 200, siteExcludedDowntimeSec: 200,
      siteAdjustedAvailableSec: 800, siteUptimeExcludingPct: 100,
    });
    const cmp = buildUptimeComparison([s], DEFAULT_UPTIME_OPTIONS, 'A');
    const row = cmp.metrics.find((m) => m.label.startsWith('Uptime % excluding'))!;
    expect(row.site.A).toBe(100);
  });

  it('is labelled with the categories it discounts, so the scope is never implicit', () => {
    const cmp = buildUptimeComparison([site('A', [])], DEFAULT_UPTIME_OPTIONS, 'A');
    const row = cmp.metrics.find((m) => m.label.startsWith('Uptime % excluding'))!;
    expect(row.label).toBe('Uptime % excluding PowerFailure, EmergencyPressed, InputUnderVoltage');
  });

  it('counts more uptime as better, like the headline', () => {
    const cmp = buildUptimeComparison([site('A', [])], DEFAULT_UPTIME_OPTIONS, 'A');
    expect(cmp.metrics.find((m) => m.label.startsWith('Uptime % excluding'))!.higherIsBetter).toBe(true);
  });
});
