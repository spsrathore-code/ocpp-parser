// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import type { ParsedMessage } from '../../src/app/model/types';
import type { AnalysisResult } from '../../src/app/analyze';
import type { EnergyDispenseRow } from '../../src/app/health/types';
import type { IncompleteTransaction } from '../../src/app/detect/types';
import { renderEnergyDispense } from '../../src/app/render/sections/energyDispense';
import { renderIncompleteTransactions } from '../../src/app/render/sections/incompleteTransactions';
import { computeFaultSummary, renderFaultStatusSummary } from '../../src/app/render/sections/faultStatusSummary';

describe('renderEnergyDispense', () => {
  const rows: EnergyDispenseRow[] = [
    { connectorId: 1, txCount: 2, minMeterStart: 0, maxMeterStop: 10000, recordedEnergy: 10000, summedEnergy: 7000, energyDiff: 3000, diffPerTx: 1500, isFlag: true },
  ];
  const body = renderEnergyDispense({ energyDispense: rows } as unknown as AnalysisResult);

  it('renders 9 columns and flags the discrepancy', () => {
    const headers = [...body.querySelectorAll('#energy-dispense-table thead th')].map((th) => th.textContent);
    expect(headers).toEqual(['Connector ID', 'Transactions', 'Min Meter Start (Wh)', 'Max Meter Stop (Wh)', 'Recorded Energy (Wh)', 'Summed Energy (Wh)', 'Energy Diff (Wh)', 'Diff / Tx (Wh)', 'Status']);
    const cells = [...body.querySelectorAll('#energy-dispense-table tbody tr td')].map((td) => td.textContent);
    expect(cells[6]).toBe('3000.0');
    expect(cells[8]).toContain('Discrepancy');
  });

  it('shows an empty state with no rows', () => {
    const empty = renderEnergyDispense({ energyDispense: [] } as unknown as AnalysisResult);
    expect(empty.querySelector('#energy-dispense-table')).toBeNull();
    expect(empty.textContent).toContain('No complete transactions');
  });
});

describe('renderIncompleteTransactions', () => {
  const inc: IncompleteTransaction[] = [
    { id: 5, connectorId: 1, refTime: '2025-08-22T00:00:00.000Z', missing: 'Stop', location: 'Between Logs', reason: 'charger crash' },
  ];
  const body = renderIncompleteTransactions({ incompleteTransactions: inc } as unknown as AnalysisResult);

  it('renders 7 columns with badges and IST ref time', () => {
    const headers = [...body.querySelectorAll('#incomplete-transactions-table thead th')].map((th) => th.textContent);
    expect(headers).toEqual(['S.No.', 'Transaction ID', 'Connector ID', 'Missing', 'Location', 'Ref Time (IST)', 'Reason']);
    expect(body.textContent).toContain('Between Logs');
    expect(body.textContent).toContain('IST');
  });

  it('shows the all-complete empty state', () => {
    const empty = renderIncompleteTransactions({ incompleteTransactions: [] } as unknown as AnalysisResult);
    expect(empty.textContent).toContain('All transactions are complete');
  });
});

describe('computeFaultSummary / renderFaultStatusSummary', () => {
  const sn = (status: string, payload: Record<string, unknown> = {}): ParsedMessage =>
    ({ timestamp: '', direction: 'received', message: [2, 'id', 'StatusNotification', { status, ...payload }], lineNumber: 1, fileName: 'l' }) as ParsedMessage;
  const msgs = [
    sn('Faulted', { connectorId: 1, info: 'GroundFailure', vendorErrorCode: 'E9' }),
    sn('Faulted', { connectorId: 1, info: 'GroundFailure', vendorErrorCode: 'E9' }),
    sn('Available', { connectorId: 1 }),
  ];

  it('groups faulted notifications and counts them', () => {
    const s = computeFaultSummary(msgs);
    expect(s.totalFaultEvents).toBe(2);
    expect(s.connectorsAffected).toBe(1);
    expect(s.rows).toEqual([{ connId: 1, faultInfo: 'GroundFailure', vendorCode: 'E9', count: 2 }]);
  });

  it('renders the fault table; shows no-faults message when clean', () => {
    const body = renderFaultStatusSummary({ messageGroups: { StatusNotification: msgs } } as unknown as AnalysisResult);
    expect(body.querySelector('#fault-status-summary-table')).not.toBeNull();
    const clean = renderFaultStatusSummary({ messageGroups: { StatusNotification: [sn('Available')] } } as unknown as AnalysisResult);
    expect(clean.textContent).toContain('No faults recorded');
  });
});
