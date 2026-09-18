// Downtime Detail — a side-by-side, event-by-event comparison of two
// co-located chargers.
//
// Section 1.1 answers "how much downtime, and how do the sites differ". This
// answers the question that immediately follows: WHICH events differ, and is a
// gap a real difference or simply an event one site never logged.
//
// Events are paired by MATCHING START TIME within a tolerance, grouped by
// connector then category — never by row position. Two co-located chargers see
// the same grid event within seconds of each other, so start time is the only
// honest key; pairing by position would silently align unrelated outages the
// moment one site logs an extra event.

import type { OutageRow, SiteUptime } from '../types';

/** One site's side of a paired row. Null where that site logged no counterpart. */
export interface DetailSide {
  startUtc: number;
  endUtc: number | null;
  durationSec: number | null;
  startRow: number;
  endRow: number | null;
}

export interface DetailRow {
  connectorId: number;
  category: string;
  a: DetailSide | null;
  b: DetailSide | null;
  /** (A − B) in minutes, to one decimal. Null unless both sides are present
   *  and resolved — a delta against a missing event is meaningless. */
  deltaMin: number | null;
}

/** Per category: how many events paired, and how many only one site saw. */
export interface Reconciliation {
  category: string;
  matched: number;
  aOnly: number;
  bOnly: number;
}

export interface DowntimeDetail {
  siteA: string;
  siteB: string;
  rows: DetailRow[];
  reconciliation: Reconciliation[];
  /** Sum of EVERY event duration — the raw figure, which counts a minute twice
   *  where two categories overlap. This is what the subtotal strip shows. */
  totalASec: number;
  totalBSec: number;
  /** Section 1.1's Total downtime: the same events with overlaps merged.
   *  Carried here so 1.2 can reconcile itself against 1.1 on screen rather than
   *  leaving a reader to wonder why two totals differ. */
  mergedASec: number;
  mergedBSec: number;
  /** (A − B) in hours. */
  deltaHours: number;
  toleranceSec: number;
  /** |delta| above this many minutes is called out as a material difference. */
  highlightMin: number;
}

export interface DetailOptions {
  /** Starts within this many seconds of each other are the same event. */
  toleranceSec?: number;
  /** Row deltas above this many minutes are highlighted. */
  highlightMin?: number;
  /** Categories to include. Defaults to the counted four. */
  categories?: string[];
}

const sideOf = (row: OutageRow): DetailSide => ({
  startUtc: row.startUtc,
  endUtc: row.endUtc,
  durationSec: row.durationSec,
  startRow: row.sourceRow,
  endRow: row.endSourceRow,
});

/**
 * Greedy nearest-start pairing within `toleranceSec`.
 *
 * Both lists are start-sorted, so walking them together pairs each A event with
 * the closest unclaimed B event. Greedy is right here because a charger cannot
 * log two outages of the same category on the same connector at the same
 * instant — there is no ambiguity for a smarter matcher to resolve.
 */
function pair(aRows: OutageRow[], bRows: OutageRow[], toleranceMs: number): DetailRow[] {
  const out: DetailRow[] = [];
  const bUsed = new Array<boolean>(bRows.length).fill(false);
  let bi = 0;

  for (const a of aRows) {
    // Advance past B events that ended up before A's tolerance window.
    while (bi < bRows.length && (bUsed[bi] || bRows[bi].startUtc < a.startUtc - toleranceMs)) bi += 1;

    let bestIndex = -1;
    let bestGap = Number.POSITIVE_INFINITY;
    for (let j = bi; j < bRows.length; j += 1) {
      if (bUsed[j]) continue;
      const gap = bRows[j].startUtc - a.startUtc;
      if (gap > toleranceMs) break; // start-sorted: everything later is further away
      const distance = Math.abs(gap);
      if (distance <= toleranceMs && distance < bestGap) { bestGap = distance; bestIndex = j; }
    }

    if (bestIndex >= 0) {
      bUsed[bestIndex] = true;
      out.push({
        connectorId: a.connectorId,
        category: a.errorDescription,
        a: sideOf(a),
        b: sideOf(bRows[bestIndex]),
        deltaMin: null,
      });
    } else {
      out.push({ connectorId: a.connectorId, category: a.errorDescription, a: sideOf(a), b: null, deltaMin: null });
    }
  }

  // Whatever B has left is site-specific to B.
  bRows.forEach((b, j) => {
    if (bUsed[j]) return;
    out.push({ connectorId: b.connectorId, category: b.errorDescription, a: null, b: sideOf(b), deltaMin: null });
  });

  return out;
}

export function buildDowntimeDetail(
  a: SiteUptime,
  b: SiteUptime,
  options: DetailOptions = {},
): DowntimeDetail {
  const toleranceSec = options.toleranceSec ?? 300;
  const highlightMin = options.highlightMin ?? 5;
  const categories = options.categories ?? ['PowerFailure', 'Offline', 'EmergencyPressed', 'InputUnderVoltage'];
  const connectors = [...new Set([...a.connectors, ...b.connectors])].sort((x, y) => x - y);

  const rows: DetailRow[] = [];
  const reconciliation: Reconciliation[] = [];

  for (const category of categories) {
    let matched = 0;
    let aOnly = 0;
    let bOnly = 0;

    for (const connectorId of connectors) {
      const pick = (site: SiteUptime): OutageRow[] => site.outageRows
        .filter((r) => r.connectorId === connectorId && r.errorDescription === category)
        .sort((x, y) => x.startUtc - y.startUtc);

      for (const row of pair(pick(a), pick(b), toleranceSec * 1000)) {
        if (row.a && row.b) matched += 1; else if (row.a) aOnly += 1; else bOnly += 1;
        if (row.a?.durationSec != null && row.b?.durationSec != null) {
          row.deltaMin = Math.round(((row.a.durationSec - row.b.durationSec) / 60) * 10) / 10;
        }
        rows.push(row);
      }
    }

    reconciliation.push({ category, matched, aOnly, bOnly });
  }

  // Connector, then category in the caller's order, then start time — so the
  // table reads the way the filters do.
  const categoryRank = new Map(categories.map((c, i) => [c, i]));
  rows.sort((x, y) =>
    x.connectorId - y.connectorId ||
    (categoryRank.get(x.category) ?? 99) - (categoryRank.get(y.category) ?? 99) ||
    (x.a?.startUtc ?? x.b?.startUtc ?? 0) - (y.a?.startUtc ?? y.b?.startUtc ?? 0),
  );

  const totalASec = rows.reduce((n, r) => n + (r.a?.durationSec ?? 0), 0);
  const totalBSec = rows.reduce((n, r) => n + (r.b?.durationSec ?? 0), 0);

  return {
    siteA: a.site,
    siteB: b.site,
    rows,
    reconciliation,
    totalASec,
    totalBSec,
    mergedASec: a.siteMergedDowntimeSec,
    mergedBSec: b.siteMergedDowntimeSec,
    deltaHours: Math.round(((totalASec - totalBSec) / 3600) * 100) / 100,
    toleranceSec,
    highlightMin,
  };
}
