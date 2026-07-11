// Config constants — ported from the tool source (spec §19.5).

/** Offline-replay detection threshold: log-line vs payload timestamp delta (HTML 234). */
export const OFFLINE_REPLAY_THRESHOLD_MS = 3600000; // 1 hour

/** Temperature alert thresholds by location, °C (HTML 3684). */
export const TEMP_THRESHOLDS = { Inlet: 60, Body: 60, Outlet: 65 } as const;

/**
 * Zero-energy flag threshold, Wh — a transaction whose dispensed energy falls
 * below this is flagged. The tool persists a user override in
 * `localStorage['zeroEnergyThresholdWh']`; 500 is the source default
 * (HTML 5276, FR-131). The aggregator takes the resolved value as a parameter.
 */
export const DEFAULT_ZERO_ENERGY_THRESHOLD_WH = 500;

/** Start/stop meter continuity tolerance, Wh — diff above this (or negative) flags (HTML 5322). */
export const METER_DIFF_THRESHOLD_WH = 10;

/** Current-delivery mismatch: Outlet must deliver ≥ this fraction of EV-requested current (HTML 5325, FR-108). */
export const CURRENT_MISMATCH_FACTOR = 0.95;

/** Energy-dispense reconciliation: per-tx unaccounted energy above this (Wh) flags (HTML 5448, FR-128/129). */
export const ENERGY_DISPENSE_DIFF_PER_TX_WH = 10;
