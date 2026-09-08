// Uptime orchestrator: sources -> UptimeReport.
//
// Kept deliberately thin. Every rule lives in the stage modules; this file only
// sequences them and carries the options through, so the chain stays readable
// and each stage stays independently testable.

import { extractRows } from './extract';
import { computeSiteUptime, type SiteMetadata } from './uptimeCalc';
import type { UptimeSource } from './ingest';
import { DEFAULT_UPTIME_OPTIONS, type SiteUptime, type UptimeOptions } from './types';

export interface UptimeReport {
  sites: SiteUptime[];
  options: UptimeOptions;
  /** Site whose figures the comparison Δ columns are measured against. */
  baselineSite: string;
  sources: { site: string; fileName: string; customerLabel: string; rowCount: number }[];
}

export function analyzeUptimeSources(
  sources: UptimeSource[],
  options: UptimeOptions = DEFAULT_UPTIME_OPTIONS,
  metadata: Record<string, SiteMetadata> = {},
): UptimeReport {
  const sites = sources.map((source) =>
    computeSiteUptime(source.site, extractRows(source.rows), options, metadata[source.site] ?? {}),
  );

  return {
    sites,
    options,
    baselineSite: sites[0]?.site ?? '',
    sources: sources.map((s) => ({
      site: s.site,
      fileName: s.fileName,
      customerLabel: s.customerLabel,
      rowCount: s.rows.length,
    })),
  };
}
