// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import type { Transaction } from '../../src/app/model/types';
import type { AnalysisResult } from '../../src/app/analyze';
import { computeTxFlags, renderTransactionSummary } from '../../src/app/render/sections/transactionSummary';

function tx(over: Partial<Transaction>): Transaction {
  return {
    id: 1, startTime: '2025-08-22T00:00:00.000Z', meterValues: [], isOfflineReplay: false,
    logTimestamp: '2025-08-22T00:00:00.000Z', replayDelayMs: 0, internalTransactionId: null, ...over,
  };
}
function bundle(transactions: Transaction[]): AnalysisResult {
  return { transactions, internalTxMap: new Map() } as unknown as AnalysisResult;
}

describe('computeTxFlags', () => {
  it('flags zero energy below threshold, temp high, meter diff, current mismatch', () => {
    const txs = [
      tx({ id: 1, totalEnergy: 0.2 }),                                           // 200 Wh < 500 → zero
      tx({ id: 2, totalEnergy: 5, maxTempOutlet: 70 }),                          // 70 > 65 → temp high
      tx({ id: 3, totalEnergy: 5, startStopDiff: 15 }),                          // 15 > 10 → meter diff
      tx({ id: 4, totalEnergy: 5, currentPairCount: 3, avgCurrentEV: 100, avgCurrentOutlet: 80 }), // mismatch
      tx({ id: 5, totalEnergy: 5 }),                                            // normal
    ];
    const flags = computeTxFlags(txs, 500);
    expect(flags[0].isZeroEnergy).toBe(true);
    expect(flags[1].isTempHigh).toBe(true);
    expect(flags[2].isMeterDiff).toBe(true);
    expect(flags[3].isCurrentMismatch).toBe(true);
    expect(flags[4]).toEqual({ isZeroEnergy: false, isTempHigh: false, isMeterDiff: false, isCurrentMismatch: false });
  });
});

describe('renderTransactionSummary', () => {
  beforeEach(() => localStorage.clear());

  const txs = [
    tx({ id: 10, connectorId: 1, idTag: 'TAG', meterStart: 1000, meterStop: 6000, totalEnergy: 5, duration: 30, stopTime: '2025-08-22T00:30:00.000Z', avgPower: '10.00', peakPower: '12.00', status: 'Completed' }),
    tx({ id: 11, connectorId: 1, totalEnergy: 0.1, status: 'Aborted' }),
  ];
  const body = renderTransactionSummary(bundle(txs));

  it('renders the 27 columns incl. Chart', () => {
    const headers = [...body.querySelectorAll('#transaction-summary-table thead th')].map((th) => th.textContent);
    expect(headers).toHaveLength(27);
    expect(headers[0]).toBe('S.No.');
    expect(headers[25]).toBe('Status');
    expect(headers[26]).toBe('Chart');
    expect(body.querySelectorAll('.view-chart-btn')).toHaveLength(2); // one per tx
  });

  it('renders one row per transaction and IST times', () => {
    const rows = body.querySelectorAll('#transaction-summary-table tbody tr');
    expect(rows).toHaveLength(2);
    expect(body.textContent).toContain('IST');
  });

  it('shows summary cards including the zero-energy count', () => {
    expect(body.querySelector('#tx-zero-energy-count')!.textContent).toBe('1'); // tx 11: 100 Wh < 500
    expect(body.querySelector('#tx-total-count')!.textContent).toBe('2');
  });
});
