// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import type { AnalysisResult } from '../../src/app/analyze';
import type { ConnectorStatsRow } from '../../src/app/health/types';
import { renderConnectorStats } from '../../src/app/render/sections/connectorStats';

function bundle(connectorStats: ConnectorStatsRow[]): AnalysisResult {
  return { connectorStats } as unknown as AnalysisResult;
}

const ROW: ConnectorStatsRow = {
  cid: 1, total: 4, avgPower: '30.00', peakPower: '50.00',
  zeroEnergyCount: 1, tempHighCount: 0, meterDiffCount: 2, currentMismatchCount: 0, normalCount: 1,
};

describe('renderConnectorStats', () => {
  const body = renderConnectorStats(bundle([ROW]));

  it('renders the 10 columns', () => {
    const headers = [...body.querySelectorAll('thead th')].map((th) => th.textContent);
    expect(headers).toEqual(['Connector ID', 'Total Tx', 'Avg Power (kW)', 'Peak Power (kW)', 'Zero Energy', 'Temp High', 'Meter Diff High', 'Current Mismatch', 'Overlap*', 'Normal']);
  });

  it('formats flag cells as "N (P%)" against the connector total', () => {
    const cells = [...body.querySelectorAll('tbody tr td')].map((td) => td.textContent);
    expect(cells[0]).toBe('1');          // Connector ID
    expect(cells[1]).toBe('4');          // Total Tx
    expect(cells[2]).toBe('30.00');      // Avg Power
    expect(cells[3]).toBe('50.00');      // Peak Power
    expect(cells[4]).toBe('1 (25%)');    // Zero Energy (1 of 4)
    expect(cells[5]).toBe('0 (0%)');     // Temp High
    expect(cells[6]).toBe('2 (50%)');    // Meter Diff High
    expect(cells[8]).toBe('—');          // Overlap (pending)
    expect(cells[9]).toBe('1 (25%)');    // Normal
  });
});
