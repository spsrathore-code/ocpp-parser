import { describe, it, expect } from 'vitest';
import { aggregateConnectorStats } from '../../src/app/health/connectorStats';
import { analyzeEnergyDispense } from '../../src/app/health/energyDispense';
import type { Transaction } from '../../src/app/model/types';

/** Minimal valid Transaction with overrides for the fields the aggregators read. */
function tx(overrides: Partial<Transaction>): Transaction {
  return {
    id: 1,
    startTime: '2025-08-22T00:00:00.000Z',
    meterValues: [],
    isOfflineReplay: false,
    logTimestamp: '2025-08-22T00:00:00.000Z',
    replayDelayMs: 0,
    internalTransactionId: null,
    ...overrides,
  };
}

describe('aggregateConnectorStats — per-connector health-flag rollup (FR-131)', () => {
  const transactions: Transaction[] = [
    // normal
    tx({ id: 1, connectorId: 1, avgPower: '30.00', peakPower: '50.00', totalEnergy: 5, startStopDiff: null }),
    // zero energy (200 Wh < 500)
    tx({ id: 2, connectorId: 1, avgPower: 'N/A', peakPower: 'N/A', totalEnergy: 0.2 }),
    // temp high (outlet 70 > 65)
    tx({ id: 3, connectorId: 1, avgPower: 'N/A', peakPower: 'N/A', totalEnergy: 5, maxTempOutlet: 70 }),
    // current mismatch (outlet 80 < 95% of EV 100)
    tx({ id: 4, connectorId: 1, avgPower: 'N/A', peakPower: 'N/A', totalEnergy: 5, currentPairCount: 3, avgCurrentEV: 100, avgCurrentOutlet: 80 }),
    // meter diff high (15 > 10)
    tx({ id: 5, connectorId: 1, avgPower: 'N/A', peakPower: 'N/A', totalEnergy: 5, startStopDiff: 15 }),
  ];

  const rows = aggregateConnectorStats(transactions);

  it('counts each health flag and the normal remainder for the connector', () => {
    expect(rows).toHaveLength(1);
    const r = rows[0];
    expect(r.cid).toBe(1);
    expect(r.total).toBe(5);
    expect(r.zeroEnergyCount).toBe(1);
    expect(r.tempHighCount).toBe(1);
    expect(r.currentMismatchCount).toBe(1);
    expect(r.meterDiffCount).toBe(1);
    expect(r.normalCount).toBe(1);
  });

  it('averages power across only the numeric (non-N/A) rows', () => {
    expect(rows[0].avgPower).toBe('30.00');
    expect(rows[0].peakPower).toBe('50.00');
  });

  it('respects a custom zero-energy threshold', () => {
    // raise threshold so the 5 kWh rows also count as "zero energy" (< 6000 Wh)
    const r = aggregateConnectorStats(transactions, 6000)[0];
    expect(r.zeroEnergyCount).toBe(5);
  });
});

describe('analyzeEnergyDispense — recorded vs summed reconciliation (FR-127/128/129)', () => {
  const transactions: Transaction[] = [
    // connector 1: continuous, no gap → normal
    tx({ id: 1, connectorId: 1, meterStart: 1000, meterStop: 6000 }),
    tx({ id: 2, connectorId: 1, meterStart: 6000, meterStop: 11000 }),
    // connector 2: 3000 Wh unaccounted between sessions → flagged
    tx({ id: 3, connectorId: 2, meterStart: 0, meterStop: 5000 }),
    tx({ id: 4, connectorId: 2, meterStart: 8000, meterStop: 13000 }),
    // excluded: non-numeric meter readings
    tx({ id: 5, connectorId: 3, meterStart: undefined, meterStop: undefined }),
  ];

  const rows = analyzeEnergyDispense(transactions);

  it('reconciles recorded vs summed energy per connector and flags discrepancies', () => {
    expect(rows.map((r) => r.connectorId)).toEqual([1, 2]); // connector 3 excluded
    const c1 = rows.find((r) => r.connectorId === 1)!;
    expect(c1.recordedEnergy).toBe(10000);
    expect(c1.summedEnergy).toBe(10000);
    expect(c1.energyDiff).toBe(0);
    expect(c1.isFlag).toBe(false);

    const c2 = rows.find((r) => r.connectorId === 2)!;
    expect(c2.recordedEnergy).toBe(13000);
    expect(c2.summedEnergy).toBe(10000);
    expect(c2.energyDiff).toBe(3000);
    expect(c2.diffPerTx).toBe(1500);
    expect(c2.isFlag).toBe(true);
  });
});
