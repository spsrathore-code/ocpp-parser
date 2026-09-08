// Shared contracts for the Uptime analysis pipeline.
//
// Design: docs/superpowers/specs/2026-09-08-uptime-analysis-design.md
// Algorithm source of truth: the reference workbook's own `Analysis_Spec_MD`
// sheet ("DC052_ DC053 Uptime Template.xlsx"). Section references below (§n)
// point at that sheet, not at this repo's docs.
//
// The pipeline is a strict chain of pure functions over plain data:
//   CmsRow[] -> ExtractRow[] -> Episode[] -> OutageRow[] -> SiteUptime -> UptimeReport
// Everything here must stay structured-clone-safe: the whole report crosses a
// Web Worker boundary, so no Date objects, no Maps, no class instances.
// Instants are epoch milliseconds, UTC. Durations are seconds.

/** One parsed log row — the Extract stage (§3). */
export interface ExtractRow {
  /** 1-based row index within its source sheet, for traceability back to the log. */
  sourceRow: number;
  /** Site identity = the adapter's sheet name (charger id). */
  site: string;
  /** OCPP action, taken from the CALL array rather than the label column. */
  eventName: string;
  /** Request payload `timestamp`, epoch ms. Null when the message carries none. */
  timestampUtc: number | null;
  /** Response payload `currentTime`, epoch ms — the only time source Heartbeat
   *  and BootNotification have (§8, timestamp source rule). */
  respCurrentTimeUtc: number | null;
  /** Request payload `connectorId`. 0 = the whole unit. Null when absent. */
  connectorId: number | null;
  status: string;
  errorCode: string;
  vendorErrorCode: string;
  /** The vendor's fault text. The fault identity key — NOT errorCode (§7.3). */
  info: string;
  reason: string;
  firmwareVersion: string;
  chargePointVendor: string;
  /** Length of the raw request string, for the truncation heuristic. */
  requestLen: number;
  /** MeterValues request at/over the exporter's 4000-char cell cap (§8). */
  truncated: boolean;
  /** StatusNotification with an errorCode present and not "NoError" (§8). */
  isFaultStatus: boolean;
}

/** How an episode's start and end were derived — shown verbatim in the UI so a
 *  reader can tell a logged outage from a synthesized one. */
export type DerivationMethod = 'fault' | 'powerFailure' | 'offline';

export const DERIVATION_TEXT: Record<DerivationMethod, string> = {
  fault: 'Fault: first notification → next NoError StatusNotification on same connectorId',
  powerFailure: 'Power outage: last Heartbeat currentTime → PowerFailure notification',
  offline: 'Offline (synthesized): last Heartbeat currentTime → BootNotification response currentTime',
};

/** One outage episode before connector fan-out (§4.1, §4.2). */
export interface Episode {
  sourceRow: number;
  /** 0 = whole unit. */
  connectorId: number;
  status: string;
  errorCode: string;
  vendorErrorCode: string;
  info: string;
  startUtc: number;
  /** Null = unresolved at log end: no closing NoError before the log ended. */
  endUtc: number | null;
  derivation: DerivationMethod;
}

/** One row of the flat, human-readable outage list, after fan-out (§5). */
export interface OutageRow {
  site: string;
  /** Always a physical connector (> 0): connector-0 episodes are fanned out. */
  connectorId: number;
  errorCode: string;
  /** = Episode.info. The workbook labels this column "Error Descr." */
  errorDescription: string;
  vendorErrorCode: string;
  startUtc: number;
  endUtc: number | null;
  /** Null when unresolved — excluded from every sum, understating downtime. */
  durationSec: number | null;
  sourceRow: number;
  derivation: DerivationMethod;
}

/** A fault row's identity, kept per site to drive the cross-site sections.
 *  Fault_Breakdown and ErrorCode_Comparison count fault ROWS, not episodes
 *  (reconciliation gates 2 and 3 depend on that distinction). */
export interface FaultRow {
  connectorId: number;
  status: string;
  errorCode: string;
  vendorErrorCode: string;
  info: string;
}

/** One row of the two per-site summary blocks (§6.1), keyed by code or description. */
export interface CategoryRow {
  key: string;
  /** Per physical connector id -> events and downtime. */
  perConnector: Record<number, { events: number; downtimeSec: number }>;
  totalEvents: number;
  totalDowntimeSec: number;
}

/** Per-connector uptime figures (§6.3, §6.4). */
export interface ConnectorUptime {
  connectorId: number;
  outageEvents: number;
  /** Raw sum over the counted categories — double-counts simultaneous outages. */
  rawDowntimeSec: number;
  /** After the overlap sweep. Always <= rawDowntimeSec (reconciliation gate 9). */
  mergedDowntimeSec: number;
  overlapRemovedSec: number;
  uptimeRawPct: number;
  /** The headline metric. */
  uptimeAdjustedPct: number;
}

/** Charger-level (connectorId 0) fault downtime — reported but NEVER added into
 *  the per-connector or site totals (§7.5 section 8). Its available time is ONE
 *  log window, not one per connector. PowerFailure is excluded by design: its
 *  connector-0 events are zero-duration markers. */
export interface ChargerLevelRow {
  errorDescription: string;
  episodes: number;
  downtimeSec: number;
}

/** Everything computed for one site. */
export interface SiteUptime {
  site: string;
  /** Derived live from the first BootNotification's chargePointVendor (§4.5). */
  oem: string;
  /** Not present anywhere in OCPP 1.6J — user-supplied or blank (§4.5). */
  modelName: string;
  stationName: string;
  /** Physical connector ids discovered in the log, ascending. */
  connectors: number[];
  windowStartUtc: number;
  windowEndUtc: number;
  /** Elapsed log window in seconds — identical for every connector. */
  availableSec: number;
  byErrorCode: CategoryRow[];
  byErrorDescription: CategoryRow[];
  perConnector: ConnectorUptime[];
  /** availableSec × connectors.length. */
  siteAvailableSec: number;
  siteRawDowntimeSec: number;
  siteMergedDowntimeSec: number;
  siteUptimeRawPct: number;
  siteUptimeAdjustedPct: number;
  chargerLevel: ChargerLevelRow[];
  chargerLevelDowntimeSec: number;
  outageRows: OutageRow[];
  /** Every fault row on this site, for the cross-site comparison sections. */
  faultRows: FaultRow[];
  /** Diagnostics that back the reconciliation gates and the caveat lines. */
  logRowCount: number;
  faultRowCount: number;
  faultEpisodeCount: number;
  bootNotificationCount: number;
  offlineWindowCount: number;
  unresolvedCount: number;
  truncatedMeterValuesCount: number;
  firmwareVersions: string[];
  eventCounts: Record<string, number>;
  rowsWithRequestTimestamp: number;
}

/** The two [CONFIRM] business decisions, editable in the UI (§8). */
export interface UptimeOptions {
  /** Fault rows with the same info + connectorId within this window are one
   *  continuing episode. Workbook default: 300 s. */
  clusteringWindowSec: number;
  /** Error descriptions that subtract from uptime %. Workbook default: the four
   *  below. Every other fault is measured and reported but NOT subtracted. */
  countedCategories: string[];
}

export const DEFAULT_COUNTED_CATEGORIES = [
  'PowerFailure',
  'Offline',
  'EmergencyPressed',
  'InputUnderVoltage',
] as const;

export const DEFAULT_UPTIME_OPTIONS: UptimeOptions = {
  clusteringWindowSec: 300,
  countedCategories: [...DEFAULT_COUNTED_CATEGORIES],
};

/** The synthesized-Offline sentinel used for errorCode, info and vendorErrorCode. */
export const OFFLINE_LABEL = 'Offline';
/** The fault text that triggers the power-outage start derivation (§4.1). */
export const POWER_FAILURE_LABEL = 'PowerFailure';
/** Status written on synthesized Offline episodes — deliberately not an OCPP status. */
export const SYNTHESIZED_STATUS = 'n/a (synthesized, not an OCPP status)';
