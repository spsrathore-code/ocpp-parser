// Energy-dispense reconciliation — faithful port of the v2026.05.14 tool's
// energy-dispense computation (HTML 5420-5450, spec §10 / FR-127/128/129).
// Per connector, compares the meter's own span (max stop − min start) against
// the sum of per-session deltas; a gap means energy was dispensed outside a
// transaction (or the meter ran backwards). Render is Phase 3.

import type { Transaction } from '../model/types';
import { ENERGY_DISPENSE_DIFF_PER_TX_WH } from '../model/config';
import { maxOf, minOf } from '../parse/concatChunks';
import type { ConnectorId, EnergyDispenseRow } from './types';

/**
 * Reconcile recorded vs summed energy per connector.
 *
 * Transactions without numeric `meterStart`/`meterStop` are excluded (FR-127):
 * they carry no usable meter readings. Connectors left with no usable
 * transactions produce no row.
 */
export function analyzeEnergyDispense(transactions: Transaction[]): EnergyDispenseRow[] {
  const connectorMap = new Map<ConnectorId, Transaction[]>();
  transactions.forEach((tx) => {
    if (typeof tx.meterStart !== 'number' || typeof tx.meterStop !== 'number') return;
    const cid: ConnectorId = tx.connectorId ?? 'N/A';
    if (!connectorMap.has(cid)) connectorMap.set(cid, []);
    connectorMap.get(cid)!.push(tx);
  });

  const rows: EnergyDispenseRow[] = [];
  connectorMap.forEach((txList, cid) => {
    const meterStarts = txList.map((tx) => tx.meterStart!);
    const meterStops = txList.map((tx) => tx.meterStop!);
    const minMeterStart = minOf(meterStarts);
    const maxMeterStop = maxOf(meterStops);
    const recordedEnergy = maxMeterStop - minMeterStart;
    const summedEnergy = txList.reduce((sum, tx) => sum + (tx.meterStop! - tx.meterStart!), 0);
    const energyDiff = recordedEnergy - summedEnergy;
    const diffPerTx = txList.length > 0 ? energyDiff / txList.length : 0;
    rows.push({
      connectorId: cid,
      txCount: txList.length,
      minMeterStart,
      maxMeterStop,
      recordedEnergy,
      summedEnergy,
      energyDiff,
      diffPerTx,
      isFlag: diffPerTx > ENERGY_DISPENSE_DIFF_PER_TX_WH || energyDiff < 0, // FR-128, FR-129
    });
  });

  return rows;
}
