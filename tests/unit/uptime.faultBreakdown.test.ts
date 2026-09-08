import { describe, it, expect } from 'vitest';
import { buildFaultBreakdown } from '../../src/app/uptime/compare/faultBreakdown';
import type { FaultRow, SiteUptime } from '../../src/app/uptime/types';

function site(name: string, faults: Partial<FaultRow>[], connectors = [1, 2]): SiteUptime {
  const faultRows = faults.map((f) => ({
    connectorId: f.connectorId ?? 1, status: f.status ?? 'Faulted',
    errorCode: f.errorCode ?? 'OtherError', vendorErrorCode: f.vendorErrorCode ?? '17',
    info: f.info ?? 'EmergencyPressed',
  }));
  return { site: name, connectors, faultRows, faultRowCount: faultRows.length } as unknown as SiteUptime;
}

describe('Fault_Breakdown — cross-site view', () => {
  it('keys rows on errorCode + vendorErrorCode + info', () => {
    const b = buildFaultBreakdown([site('A', [
      { info: 'EVCOM', vendorErrorCode: '88', errorCode: 'OtherError' },
      { info: 'EVCOM', vendorErrorCode: '88', errorCode: 'EVCommunicationError' },
    ])]);
    // Same fault text under two codes is two rows — that ambiguity is the finding.
    expect(b.crossSite).toHaveLength(2);
  });

  it('counts fault ROWS per connector, per site', () => {
    const b = buildFaultBreakdown([site('A', [
      { connectorId: 1, info: 'EVCOM' }, { connectorId: 1, info: 'EVCOM' }, { connectorId: 2, info: 'EVCOM' },
    ])]);
    expect(b.crossSite[0].bySite.A.perConnector).toEqual({ 1: 2, 2: 1 });
    expect(b.crossSite[0].bySite.A.total).toBe(3);
  });

  it('includes connector 0 as a column — unit-level faults are logged against it', () => {
    const b = buildFaultBreakdown([site('A', [{ connectorId: 0, info: 'PowerFailure' }])]);
    expect(b.connectorsBySite.A).toEqual([0, 1, 2]);
    expect(b.crossSite[0].bySite.A.perConnector[0]).toBe(1);
  });

  it('marks a fault seen on both sites as BOTH', () => {
    const b = buildFaultBreakdown([
      site('A', [{ info: 'PowerFailure', vendorErrorCode: '19' }]),
      site('B', [{ info: 'PowerFailure', vendorErrorCode: '19' }]),
    ]);
    expect(b.crossSite[0].presence).toBe('BOTH');
  });

  it('marks a one-sided fault with the site that logged it', () => {
    const b = buildFaultBreakdown([
      site('A', [{ info: 'GroundFault', vendorErrorCode: '90' }]),
      site('B', []),
    ]);
    expect(b.crossSite[0].presence).toBe('A ONLY');
  });

  it('sorts one-sided faults FIRST, then by combined frequency', () => {
    const b = buildFaultBreakdown([
      site('A', [
        { info: 'Shared', vendorErrorCode: '1' }, { info: 'Shared', vendorErrorCode: '1' },
        { info: 'Shared', vendorErrorCode: '1' }, { info: 'OnlyA', vendorErrorCode: '2' },
      ]),
      site('B', [{ info: 'Shared', vendorErrorCode: '1' }]),
    ]);
    // OnlyA has 1 row vs Shared's 4, but being one-sided is the headline.
    expect(b.crossSite.map((r) => r.info)).toEqual(['OnlyA', 'Shared']);
  });
});

describe('Fault_Breakdown — per-site pivot', () => {
  it('keys on the full fault identity including connector and status', () => {
    const b = buildFaultBreakdown([site('A', [
      { connectorId: 1, status: 'Faulted', info: 'EVCOM' },
      { connectorId: 1, status: 'Finishing', info: 'EVCOM' },
      { connectorId: 1, status: 'Faulted', info: 'EVCOM' },
    ])]);
    expect(b.pivots[0].distinctCombinations).toBe(2);
    expect(b.pivots[0].rows[0]).toMatchObject({ status: 'Faulted', frequency: 2 });
  });

  it('gate 2/3: the pivot total equals the site fault-row count', () => {
    const s = site('A', [{ info: 'x' }, { info: 'y' }, { info: 'x' }]);
    expect(buildFaultBreakdown([s]).pivots[0].totalFaultRows).toBe(s.faultRowCount);
  });

  it('sorts by frequency descending', () => {
    const b = buildFaultBreakdown([site('A', [
      { info: 'rare' }, { info: 'common' }, { info: 'common' }, { info: 'common' },
    ])]);
    expect(b.pivots[0].rows.map((r) => r.frequency)).toEqual([3, 1]);
  });
});

describe('Fault_Breakdown — reference table shape', () => {
  it('groups one-sided faults per site, in site order, before the shared ones', () => {
    // The reference table shows a "DC052 ONLY" block, then "DC053 ONLY", then
    // BOTH — not the two one-sided groups interleaved by frequency.
    const b = buildFaultBreakdown([
      site('DC052', [{ info: 'OnlyA', vendorErrorCode: '1' }]),
      site('DC053', [
        { info: 'OnlyB', vendorErrorCode: '2' }, { info: 'OnlyB', vendorErrorCode: '2' },
        { info: 'OnlyB2', vendorErrorCode: '3' }, { info: 'OnlyB2', vendorErrorCode: '3' },
        { info: 'OnlyB2', vendorErrorCode: '3' },
      ]),
    ]);
    // OnlyA has fewer rows than both DC053 faults but leads on site order.
    expect(b.crossSite.map((r) => r.info)).toEqual(['OnlyA', 'OnlyB2', 'OnlyB']);
  });

  it('carries each site status set, so the Status(es) columns can render', () => {
    const b = buildFaultBreakdown([site('A', [
      { info: 'EVCOM', status: 'SuspendedEV' },
      { info: 'EVCOM', status: 'Finishing' },
      { info: 'EVCOM', status: 'Finishing' },
    ])]);
    expect(b.crossSite[0].bySite.A.statuses).toBe('Finishing | SuspendedEV');
  });

  it('leaves the status set empty for a site that never logged the fault', () => {
    const b = buildFaultBreakdown([
      site('A', [{ info: 'GroundFault', vendorErrorCode: '90' }]),
      site('B', []),
    ]);
    expect(b.crossSite[0].bySite.B).toBeUndefined();
  });
});
