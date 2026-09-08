// Stage 4 of the Uptime pipeline: ExtractRow[] -> SiteUptime
// (Analysis_Spec_MD §6.1-§6.4).
//
// Two summary blocks (by error code, by error description), the log window, and
// the two uptime figures: the raw category sum and the overlap-adjusted
// headline. Everything here is derived from the outage rows, so the blocks and
// the percentages cannot drift apart.

import { buildEpisodes } from './episodes';
import { buildOutageRows, discoverConnectors } from './outages';
import { mergedDowntimeByConnector, type DowntimeInterval } from './mergeIntervals';
import {
  OFFLINE_LABEL, POWER_FAILURE_LABEL,
  type CategoryRow, type ChargerLevelRow, type ConnectorUptime,
  type Episode, type ExtractRow, type OutageRow, type SiteUptime, type UptimeOptions,
} from './types';

/** Asset facts OCPP cannot supply — only OEM is derivable from the log (§4.5). */
export interface SiteMetadata {
  modelName?: string;
  stationName?: string;
}

function percent(available: number, downtime: number): number {
  if (available <= 0) return 0;
  return ((available - downtime) / available) * 100;
}

/** Group outage rows into one of the two per-site summary blocks. */
function summarize(rows: OutageRow[], keyOf: (r: OutageRow) => string, connectors: number[]): CategoryRow[] {
  const byKey = new Map<string, CategoryRow>();

  for (const row of rows) {
    const key = keyOf(row) || '(none)';
    let entry = byKey.get(key);
    if (!entry) {
      const perConnector: CategoryRow['perConnector'] = {};
      for (const c of connectors) perConnector[c] = { events: 0, downtimeSec: 0 };
      entry = { key, perConnector, totalEvents: 0, totalDowntimeSec: 0 };
      byKey.set(key, entry);
    }
    const bucket = entry.perConnector[row.connectorId] ??= { events: 0, downtimeSec: 0 };
    bucket.events += 1;
    entry.totalEvents += 1;
    // An unresolved episode still counts as an event but contributes no time.
    if (row.durationSec !== null) {
      bucket.downtimeSec += row.durationSec;
      entry.totalDowntimeSec += row.durationSec;
    }
  }

  return [...byKey.values()].sort((a, b) => a.key.localeCompare(b.key));
}

/**
 * Charger-level (connector 0) fault downtime — reported but NEVER added into the
 * per-connector or site totals (§7.5 section 8). Offline is excluded because it
 * IS charged to the connectors via fan-out, and PowerFailure because its
 * connector-0 events are zero-duration markers by construction.
 */
function chargerLevelRows(episodes: Episode[]): ChargerLevelRow[] {
  const byInfo = new Map<string, ChargerLevelRow>();
  for (const e of episodes) {
    if (e.connectorId !== 0) continue;
    if (e.info === OFFLINE_LABEL || e.info === POWER_FAILURE_LABEL) continue;
    const key = e.info || '(none)';
    const entry = byInfo.get(key) ?? { errorDescription: key, episodes: 0, downtimeSec: 0 };
    entry.episodes += 1;
    if (e.endUtc !== null) entry.downtimeSec += Math.round((e.endUtc - e.startUtc) / 1000);
    byInfo.set(key, entry);
  }
  return [...byInfo.values()].sort((a, b) => a.errorDescription.localeCompare(b.errorDescription));
}

export function computeSiteUptime(
  site: string,
  rows: ExtractRow[],
  options: UptimeOptions,
  metadata: SiteMetadata = {},
): SiteUptime {
  // --- Analysis window (§6.2) ---------------------------------------------
  // MIN/MAX across BOTH timestamp sources over ALL rows: Heartbeat and
  // BootNotification have no request timestamp and would otherwise be excluded,
  // shifting the window and therefore every uptime %.
  let windowStartUtc = Number.POSITIVE_INFINITY;
  let windowEndUtc = Number.NEGATIVE_INFINITY;
  const eventCounts: Record<string, number> = {};
  const firmware = new Set<string>();
  let faultRowCount = 0;
  let bootNotificationCount = 0;
  let truncatedMeterValuesCount = 0;
  let rowsWithRequestTimestamp = 0;
  let oem = '';

  for (const row of rows) {
    for (const t of [row.timestampUtc, row.respCurrentTimeUtc]) {
      if (t === null) continue;
      if (t < windowStartUtc) windowStartUtc = t;
      if (t > windowEndUtc) windowEndUtc = t;
    }
    eventCounts[row.eventName] = (eventCounts[row.eventName] ?? 0) + 1;
    if (row.timestampUtc !== null) rowsWithRequestTimestamp += 1;
    if (row.isFaultStatus) faultRowCount += 1;
    if (row.truncated) truncatedMeterValuesCount += 1;
    if (row.eventName === 'BootNotification') {
      bootNotificationCount += 1;
      if (row.firmwareVersion) firmware.add(row.firmwareVersion);
      if (!oem && row.chargePointVendor) oem = row.chargePointVendor;
    }
  }
  if (!Number.isFinite(windowStartUtc)) { windowStartUtc = 0; windowEndUtc = 0; }
  const availableSec = Math.round((windowEndUtc - windowStartUtc) / 1000);

  // --- The chain ------------------------------------------------------------
  const connectors = discoverConnectors(rows.map((r) => r.connectorId));
  const episodes = buildEpisodes(rows, options);
  const physical = connectors.length > 0 ? connectors : [1];
  const outageRows = buildOutageRows(episodes, site, physical);

  const counted = new Set(options.countedCategories);
  const isCounted = (row: OutageRow): boolean => counted.has(row.errorDescription);

  // --- Per-connector uptime (§6.3, §6.4) -----------------------------------
  const intervals: DowntimeInterval[] = [];
  for (const row of outageRows) {
    // Unresolved episodes have no end and cannot be merged, so they are absent
    // from both figures — which understates downtime, and is stated as a caveat.
    if (isCounted(row) && row.endUtc !== null) {
      intervals.push({ connectorId: row.connectorId, startUtc: row.startUtc, endUtc: row.endUtc });
    }
  }
  const merged = mergedDowntimeByConnector(intervals);

  const perConnector: ConnectorUptime[] = physical.map((connectorId) => {
    const mine = outageRows.filter((r) => r.connectorId === connectorId);
    const rawDowntimeSec = mine.reduce(
      (n, r) => n + (isCounted(r) && r.durationSec !== null ? r.durationSec : 0),
      0,
    );
    const mergedDowntimeSec = merged[connectorId] ?? 0;
    return {
      connectorId,
      outageEvents: mine.length,
      rawDowntimeSec,
      mergedDowntimeSec,
      overlapRemovedSec: rawDowntimeSec - mergedDowntimeSec,
      uptimeRawPct: percent(availableSec, rawDowntimeSec),
      uptimeAdjustedPct: percent(availableSec, mergedDowntimeSec),
    };
  });

  const siteAvailableSec = availableSec * physical.length;
  const siteRawDowntimeSec = perConnector.reduce((n, c) => n + c.rawDowntimeSec, 0);
  const siteMergedDowntimeSec = perConnector.reduce((n, c) => n + c.mergedDowntimeSec, 0);
  const chargerLevel = chargerLevelRows(episodes);

  return {
    site,
    oem,
    modelName: metadata.modelName ?? '',
    stationName: metadata.stationName ?? '',
    connectors: physical,
    windowStartUtc,
    windowEndUtc,
    availableSec,
    byErrorCode: summarize(outageRows, (r) => r.errorCode, physical),
    byErrorDescription: summarize(outageRows, (r) => r.errorDescription, physical),
    perConnector,
    siteAvailableSec,
    siteRawDowntimeSec,
    siteMergedDowntimeSec,
    siteUptimeRawPct: percent(siteAvailableSec, siteRawDowntimeSec),
    siteUptimeAdjustedPct: percent(siteAvailableSec, siteMergedDowntimeSec),
    chargerLevel,
    chargerLevelDowntimeSec: chargerLevel.reduce((n, r) => n + r.downtimeSec, 0),
    outageRows,
    logRowCount: rows.length,
    faultRowCount,
    faultEpisodeCount: episodes.filter((e) => e.derivation !== 'offline').length,
    bootNotificationCount,
    offlineWindowCount: episodes.filter((e) => e.derivation === 'offline').length,
    unresolvedCount: outageRows.filter((r) => r.durationSec === null).length,
    truncatedMeterValuesCount,
    firmwareVersions: [...firmware].sort(),
    eventCounts,
    rowsWithRequestTimestamp,
  };
}
