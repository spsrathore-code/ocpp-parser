// Type contracts for the Phase 2d health-aggregation modules: per-connector
// health-flag rollup (FR-131) and energy-dispense reconciliation (FR-127/128/129).
// Connector ids mirror the tool's `tx.connectorId ?? 'N/A'` fallback, so the key
// is `number | 'N/A'` even though well-formed logs always carry a numeric id.

export type ConnectorId = number | 'N/A';

/** One row of the Connector Stats table — counts each health flag across a connector's transactions (HTML 5339, FR-131). */
export interface ConnectorStatsRow {
  cid: ConnectorId;
  total: number;
  /** Mean of the numeric (non-'N/A') `avgPower` values, kW as a toFixed(2) string, or 'N/A'. */
  avgPower: string;
  /** Max of the numeric (non-'N/A') `peakPower` values, kW as a toFixed(2) string, or 'N/A'. */
  peakPower: string;
  zeroEnergyCount: number;
  tempHighCount: number;
  meterDiffCount: number;
  currentMismatchCount: number;
  /** Transactions tripping none of the four flags. */
  normalCount: number;
}

/** One row of the Energy Dispense Check table — recorded vs summed energy per connector (HTML 5439, FR-127). */
export interface EnergyDispenseRow {
  connectorId: ConnectorId;
  txCount: number;
  minMeterStart: number;
  maxMeterStop: number;
  /** maxMeterStop − minMeterStart: the meter's own view of total energy, Wh. */
  recordedEnergy: number;
  /** Σ(meterStop − meterStart) across sessions: energy the transactions account for, Wh. */
  summedEnergy: number;
  /** recordedEnergy − summedEnergy: unaccounted energy, Wh (negative ⇒ meter ran backwards). */
  energyDiff: number;
  diffPerTx: number;
  /** FR-128/129: flagged when per-tx unaccounted energy is excessive or the diff is negative. */
  isFlag: boolean;
}
