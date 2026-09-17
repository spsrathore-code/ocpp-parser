// Stage 3 of the Uptime pipeline: Episode[] -> OutageRow[]
// (Analysis_Spec_MD §4.4, §5) — the flat, human-readable outage list.
//
// The only real work here is the connector fan-out. A connector-0 event is a
// unit-level event, and how it expands depends on what it is:
//
//   connector > 0            -> one row, as logged
//   connector 0, Offline     -> one row PER physical connector: the whole unit
//                               was unreachable, so it counts against each
//   connector 0, anything else -> no rows. PowerFailure markers carry no
//                               duration by construction, and other
//                               charger-level faults are reported separately
//                               and non-additively, because adding them to the
//                               connectors would double-count the same outage.

import { OFFLINE_LABEL, type Episode, type OutageRow } from './types';

/**
 * Expand episodes into per-connector outage rows.
 *
 * `connectors` is the set of PHYSICAL connectors discovered on this site, not a
 * hard-coded pair — a unit with three connectors fans out to three. It falls
 * back to `[1]` so a log that never names a connector still produces a usable
 * (single-connector) result rather than silently nothing.
 */
export function buildOutageRows(episodes: Episode[], site: string, connectors: number[]): OutageRow[] {
  const physical = connectors.length > 0 ? connectors : [1];
  const rows: OutageRow[] = [];

  for (const episode of episodes) {
    const targets = episode.connectorId === 0
      ? (episode.info === OFFLINE_LABEL ? physical : [])
      : [episode.connectorId];

    for (const connectorId of targets) {
      rows.push({
        site,
        connectorId,
        errorCode: episode.errorCode,
        errorDescription: episode.info,
        vendorErrorCode: episode.vendorErrorCode,
        startUtc: episode.startUtc,
        endUtc: episode.endUtc,
        // Null, never 0, when unresolved: the episode is excluded from every
        // sum, so downtime is understated and that must stay visible.
        durationSec: episode.endUtc === null
          ? null
          : Math.round((episode.endUtc - episode.startUtc) / 1000),
        sourceRow: episode.sourceRow,
        endSourceRow: episode.endSourceRow,
        derivation: episode.derivation,
      });
    }
  }

  rows.sort((a, b) => a.connectorId - b.connectorId || a.startUtc - b.startUtc);
  return rows;
}

/** Physical connector ids (> 0) seen on a site, ascending. */
export function discoverConnectors(connectorIds: (number | null)[]): number[] {
  const set = new Set<number>();
  for (const id of connectorIds) {
    if (id !== null && id > 0) set.add(id);
  }
  return [...set].sort((a, b) => a - b);
}
