// Per-connector health-flag rollup — faithful port of the v2026.05.14 tool's
// connector-stats computation (HTML 5294-5341, spec §10 / FR-131). Groups
// transactions by connector and counts how many trip each of four health flags
// (zero energy, temp high, meter diff, current mismatch), plus the normal
// remainder, and rolls up power. Render (`createConnectorStatsSection`) is
// Phase 3; this module is pure aggregation.

import type { Transaction } from '../model/types';
import {
  TEMP_THRESHOLDS,
  DEFAULT_ZERO_ENERGY_THRESHOLD_WH,
  METER_DIFF_THRESHOLD_WH,
  CURRENT_MISMATCH_FACTOR,
} from '../model/config';
import type { ConnectorId, ConnectorStatsRow } from './types';

const isZeroEnergy = (tx: Transaction, thresholdWh: number): boolean =>
  typeof tx.totalEnergy === 'number' && tx.totalEnergy * 1000 < thresholdWh;

const isTempHigh = (tx: Transaction): boolean =>
  (tx.maxTempInlet != null && tx.maxTempInlet > TEMP_THRESHOLDS.Inlet) ||
  (tx.maxTempBody != null && tx.maxTempBody > TEMP_THRESHOLDS.Body) ||
  (tx.maxTempOutlet != null && tx.maxTempOutlet > TEMP_THRESHOLDS.Outlet);

const isMeterDiff = (tx: Transaction): boolean =>
  typeof tx.startStopDiff === 'number' &&
  (tx.startStopDiff > METER_DIFF_THRESHOLD_WH || tx.startStopDiff < 0);

// FR-108: Outlet delivers < 95% of EV-requested current. Needs ≥ 2 sampled pairs.
const isCurrentMismatch = (tx: Transaction): boolean =>
  (tx.currentPairCount ?? 0) >= 2 &&
  (tx.avgCurrentEV ?? 0) > 0 &&
  (tx.avgCurrentOutlet ?? 0) < CURRENT_MISMATCH_FACTOR * (tx.avgCurrentEV ?? 0);

/**
 * Aggregate per-connector health-flag counts and power rollups.
 *
 * @param transactions complete transactions (from `processTransactions`)
 * @param zeroEnergyThresholdWh resolved zero-energy threshold (the tool reads
 *   `localStorage['zeroEnergyThresholdWh']`, default 500); passed in for testability
 * @returns one row per connector, sorted by connector id
 */
export function aggregateConnectorStats(
  transactions: Transaction[],
  zeroEnergyThresholdWh: number = DEFAULT_ZERO_ENERGY_THRESHOLD_WH,
): ConnectorStatsRow[] {
  const connectorMap = new Map<ConnectorId, Transaction[]>();
  transactions.forEach((tx) => {
    const cid: ConnectorId = tx.connectorId ?? 'N/A';
    if (!connectorMap.has(cid)) connectorMap.set(cid, []);
    connectorMap.get(cid)!.push(tx);
  });

  const rows: ConnectorStatsRow[] = [];
  connectorMap.forEach((txList, cid) => {
    const total = txList.length;

    // Power: average the numeric avgPowers, take the max of the numeric peakPowers.
    const avgPowers = txList.filter((tx) => tx.avgPower !== 'N/A').map((tx) => parseFloat(tx.avgPower!));
    const peakPowers = txList.filter((tx) => tx.peakPower !== 'N/A').map((tx) => parseFloat(tx.peakPower!));
    const avgPower =
      avgPowers.length > 0 ? (avgPowers.reduce((a, b) => a + b, 0) / avgPowers.length).toFixed(2) : 'N/A';
    const peakPower = peakPowers.length > 0 ? Math.max(...peakPowers).toFixed(2) : 'N/A';

    let zeroEnergyCount = 0;
    let tempHighCount = 0;
    let meterDiffCount = 0;
    let currentMismatchCount = 0;
    let normalCount = 0;

    txList.forEach((tx) => {
      const zero = isZeroEnergy(tx, zeroEnergyThresholdWh);
      const temp = isTempHigh(tx);
      const diff = isMeterDiff(tx);
      const mismatch = isCurrentMismatch(tx);
      if (zero) zeroEnergyCount++;
      if (temp) tempHighCount++;
      if (diff) meterDiffCount++;
      if (mismatch) currentMismatchCount++;
      if (!zero && !temp && !diff && !mismatch) normalCount++;
    });

    rows.push({ cid, total, avgPower, peakPower, zeroEnergyCount, tempHighCount, meterDiffCount, currentMismatchCount, normalCount });
  });

  rows.sort((a, b) => (a.cid > b.cid ? 1 : -1));
  return rows;
}
