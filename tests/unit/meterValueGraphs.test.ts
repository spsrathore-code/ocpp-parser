import { describe, it, expect } from 'vitest';
import { extractGraphData } from '../../src/app/render/charts/meterValueGraphs';

type Row = Record<string, string>;

describe('extractGraphData', () => {
  const rows: Row[] = [
    { 'Transaction ID': '55', 'UTC Time Stamp': '2025-08-22T00:05:00.000Z', 'Current.Import/A/Outlet': '50', 'SoC/Percent/EV': '60' },
    { 'Transaction ID': '55', 'UTC Time Stamp': '2025-08-22T00:00:00.000Z', 'Current.Import/A/Outlet': '30', 'SoC/Percent/EV': '20' },
    { 'Transaction ID': '99', 'UTC Time Stamp': '2025-08-22T00:00:00.000Z', 'Current.Import/A/Outlet': '99', 'SoC/Percent/EV': '99' },
  ];

  it('filters to the tx, sorts chronologically, and maps series (missing → 0)', () => {
    const g = extractGraphData(rows, 55);
    expect(g.timestamps).toHaveLength(2);
    expect(g.currentOutlet).toEqual([30, 50]); // sorted by timestamp
    expect(g.socEV).toEqual([20, 60]);
    expect(g.voltageOutlet).toEqual([0, 0]); // absent column → 0
  });
});
