// Uptime_Comparison (Analysis_Spec_MD §7.5).
//
// Every figure is derived from the already-computed SiteUptime results, never
// recomputed from raw rows, so the comparison and the per-site sections cannot
// drift apart.
//
// Three blocks plus a read-out:
//   metrics    per-connector and site totals for each site, then delta vs baseline
//   lineItems  downtime by error code and by error description — these count
//              EVERY category, unlike the headline metric which counts only the
//              configured four
//   chargerLevel  connector-0 downtime, NON-ADDITIVE and measured against one
//              window rather than one per connector

import { formatDuration } from '../duration';
import type { SiteUptime, UptimeOptions } from '../types';

export interface MetricRow {
  label: string;
  /** Site -> per-connector values, keyed by connector id. */
  perConnector: Record<string, Record<number, number>>;
  /** Site -> the site-level value. */
  site: Record<string, number>;
  /** Site total minus the baseline site's total. */
  delta: number;
  /** How to render: a duration in seconds, a percentage, or a plain count. */
  kind: 'duration' | 'percent' | 'count';
  /** Which direction is an improvement, for colouring the delta.
   *  Null where neither direction is good or bad (available time). */
  higherIsBetter: boolean | null;
}

export interface LineItemRow {
  key: string;
  events: Record<string, number>;
  downtimeSec: Record<string, number>;
  deltaSec: number;
}

export interface ChargerLevelCompareRow {
  errorDescription: string;
  episodes: Record<string, number>;
  downtimeSec: Record<string, number>;
}

export interface UptimeComparison {
  siteNames: string[];
  baselineSite: string;
  connectorsBySite: Record<string, number[]>;
  metrics: MetricRow[];
  byErrorCode: LineItemRow[];
  byErrorDescription: LineItemRow[];
  chargerLevel: ChargerLevelCompareRow[];
  /** Per site, the seconds removed by merging overlapping outages. Reported as
   *  a footnote rather than a row: it is evidence for the headline figure, not
   *  a metric anyone quotes. */
  overlapRemovedSec: Record<string, number>;
  readout: string[];
}

/** Downtime attributable to one category, per connector, from the site's blocks. */
function categoryDowntime(site: SiteUptime, category: string, connectorId: number): number {
  const row = site.byErrorDescription.find((r) => r.key === category);
  return row?.perConnector[connectorId]?.downtimeSec ?? 0;
}

function metricRow(
  label: string,
  sites: SiteUptime[],
  baseline: SiteUptime,
  kind: MetricRow['kind'],
  higherIsBetter: boolean | null,
  perConnectorValue: (site: SiteUptime, connectorId: number) => number,
  siteValue: (site: SiteUptime) => number,
): MetricRow {
  const perConnector: Record<string, Record<number, number>> = {};
  const site: Record<string, number> = {};
  for (const s of sites) {
    perConnector[s.site] = {};
    for (const c of s.connectors) perConnector[s.site][c] = perConnectorValue(s, c);
    site[s.site] = siteValue(s);
  }
  const other = sites.find((s) => s.site !== baseline.site);
  return { label, perConnector, site, delta: other ? site[other.site] - site[baseline.site] : 0, kind, higherIsBetter };
}

function lineItems(
  sites: SiteUptime[],
  baseline: SiteUptime,
  block: (s: SiteUptime) => SiteUptime['byErrorCode'],
): LineItemRow[] {
  const keys = new Set<string>();
  for (const s of sites) for (const r of block(s)) keys.add(r.key);

  const other = sites.find((s) => s.site !== baseline.site);
  return [...keys].sort().map((key) => {
    const events: Record<string, number> = {};
    const downtimeSec: Record<string, number> = {};
    for (const s of sites) {
      const row = block(s).find((r) => r.key === key);
      events[s.site] = row?.totalEvents ?? 0;
      downtimeSec[s.site] = row?.totalDowntimeSec ?? 0;
    }
    return {
      key,
      events,
      downtimeSec,
      deltaSec: other ? downtimeSec[other.site] - downtimeSec[baseline.site] : 0,
    };
  });
}

export function buildUptimeComparison(
  sites: SiteUptime[],
  options: UptimeOptions,
  baselineSite: string,
): UptimeComparison {
  const baseline = sites.find((s) => s.site === baselineSite) ?? sites[0];
  const connectorsBySite: Record<string, number[]> = {};
  for (const s of sites) connectorsBySite[s.site] = s.connectors;

  const metrics: MetricRow[] = [
    metricRow('Total available time', sites, baseline, 'duration', null,
      (s) => s.availableSec, (s) => s.siteAvailableSec),
  ];

  // One row per counted category, so a reader can see WHICH driver moved.
  for (const category of options.countedCategories) {
    // The category token is the label: these are vendor fault texts that must
    // match the log verbatim, and the column already says it is downtime.
    metrics.push(metricRow(category, sites, baseline, 'duration', false,
      (s, c) => categoryDowntime(s, category, c),
      (s) => s.connectors.reduce((n, c) => n + categoryDowntime(s, category, c), 0)));
  }

  // Only the overlap-adjusted figures are shown. The raw sum knowingly
  // double-counts simultaneous outages, and the raw uptime % inherits that
  // error, so carrying both invites the question "which number do I quote?"
  // when one of them is simply wrong. The correction itself is not lost — it
  // is reported as a footnote under the table.
  metrics.push(
    metricRow('Total downtime', sites, baseline, 'duration', false,
      (s, c) => s.perConnector.find((p) => p.connectorId === c)?.mergedDowntimeSec ?? 0,
      (s) => s.siteMergedDowntimeSec),
    metricRow('Downtime %', sites, baseline, 'percent', false,
      (s, c) => 100 - (s.perConnector.find((p) => p.connectorId === c)?.uptimeAdjustedPct ?? 0),
      (s) => 100 - s.siteUptimeAdjustedPct),
    metricRow('Uptime %', sites, baseline, 'percent', true,
      (s, c) => s.perConnector.find((p) => p.connectorId === c)?.uptimeAdjustedPct ?? 0,
      (s) => s.siteUptimeAdjustedPct),
    metricRow('Outage events', sites, baseline, 'count', false,
      (s, c) => s.perConnector.find((p) => p.connectorId === c)?.outageEvents ?? 0,
      (s) => s.outageRows.length),
  );

  const overlapRemovedSec: Record<string, number> = {};
  for (const s of sites) {
    overlapRemovedSec[s.site] = s.siteRawDowntimeSec - s.siteMergedDowntimeSec;
  }

  // Charger-level (connector 0), non-additive.
  const chargerKeys = new Set<string>();
  for (const s of sites) for (const r of s.chargerLevel) chargerKeys.add(r.errorDescription);
  const chargerLevel = [...chargerKeys].sort().map((errorDescription) => {
    const episodes: Record<string, number> = {};
    const downtimeSec: Record<string, number> = {};
    for (const s of sites) {
      const row = s.chargerLevel.find((r) => r.errorDescription === errorDescription);
      episodes[s.site] = row?.episodes ?? 0;
      downtimeSec[s.site] = row?.downtimeSec ?? 0;
    }
    return { errorDescription, episodes, downtimeSec };
  });

  // Read-out — every number interpolated, never typed.
  const readout: string[] = [];
  const other = sites.find((s) => s.site !== baseline.site);
  if (other) {
    const gap = other.siteUptimeAdjustedPct - baseline.siteUptimeAdjustedPct;
    const better = gap >= 0 ? other : baseline;
    const worse = gap >= 0 ? baseline : other;
    readout.push(
      `Site uptime (overlap-adjusted): ${baseline.site} ${baseline.siteUptimeAdjustedPct.toFixed(2)}% vs ` +
      `${other.site} ${other.siteUptimeAdjustedPct.toFixed(2)}% — ${better.site} is ahead by ` +
      `${Math.abs(gap).toFixed(2)} percentage points.`,
      `Downtime: ${worse.site} lost ${formatDuration(worse.siteMergedDowntimeSec)} of connector-time vs ` +
      `${formatDuration(better.siteMergedDowntimeSec)} for ${better.site}.`,
    );

    const drivers = lineItems(sites, baseline, (s) => s.byErrorDescription)
      .slice()
      .sort((a, b) => Math.abs(b.deltaSec) - Math.abs(a.deltaSec));
    if (drivers[0] && drivers[0].deltaSec !== 0) {
      const d = drivers[0];
      readout.push(
        `Largest single difference: ${d.key}, ${d.deltaSec > 0 ? '+' : '−'}${formatDuration(Math.abs(d.deltaSec))} ` +
        `on ${other.site} relative to ${baseline.site}.`,
      );
    }

    const events = `${baseline.site} ${baseline.outageRows.length} connector-outage events vs ${other.site} ${other.outageRows.length}`;
    readout.push(`Event frequency: ${events}.`);
  }

  const unresolved = sites.reduce((n, s) => n + s.unresolvedCount, 0);
  if (unresolved > 0) {
    readout.push(
      `Caveat: ${unresolved} outage(s) never closed before their log ended. They carry no duration and are ` +
      'excluded from every total, so downtime is understated by an unknown amount.',
    );
  }
  readout.push(
    `Scope: only ${options.countedCategories.join(', ')} are subtracted from uptime. The line-item blocks below ` +
    'count every category, so their totals are deliberately larger.',
  );

  return {
    siteNames: sites.map((s) => s.site),
    baselineSite: baseline.site,
    connectorsBySite,
    metrics,
    byErrorCode: lineItems(sites, baseline, (s) => s.byErrorCode),
    byErrorDescription: lineItems(sites, baseline, (s) => s.byErrorDescription),
    chargerLevel,
    overlapRemovedSec,
    readout,
  };
}
