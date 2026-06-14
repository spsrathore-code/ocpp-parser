// Config constants — ported from the tool source (spec §19.5).

/** Offline-replay detection threshold: log-line vs payload timestamp delta (HTML 234). */
export const OFFLINE_REPLAY_THRESHOLD_MS = 3600000; // 1 hour

/** Temperature alert thresholds by location, °C (HTML 3684). */
export const TEMP_THRESHOLDS = { Inlet: 60, Body: 60, Outlet: 65 } as const;
