// The overlap-adjusted downtime sweep (Analysis_Spec_MD §6.4).
//
// Isolated in its own file deliberately: this is the rule most likely to be
// subtly wrong and the one with the largest effect on the headline uptime %.
//
// Raw category summing double-counts time where two outages overlap — an Offline
// window covering a PowerFailure, say. Merging the intervals first gives the
// union of downtime rather than the sum of its parts.
//
// The sweep resets per connector. DC052 removes 930 s of overlap on connector 1
// and exactly 0 s on connector 2, which is only possible if the running maximum
// end does not carry across the connector boundary.

export interface DowntimeInterval {
  connectorId: number;
  startUtc: number;
  /** Resolved episodes only — an interval with no end cannot be merged. */
  endUtc: number;
}

/**
 * Merged (union) downtime per connector, in whole seconds.
 * Returns a plain object so the result stays structured-clone-safe.
 */
export function mergedDowntimeByConnector(intervals: DowntimeInterval[]): Record<number, number> {
  // Sort by connector, then by start — the sweep depends on both.
  const sorted = [...intervals].sort(
    (a, b) => a.connectorId - b.connectorId || a.startUtc - b.startUtc,
  );

  const totals: Record<number, number> = {};
  let currentConnector: number | null = null;
  let runningMaxEnd = 0;

  for (const interval of sorted) {
    if (interval.connectorId !== currentConnector) {
      currentConnector = interval.connectorId;
      runningMaxEnd = interval.startUtc; // reset: nothing covered yet on this connector
      totals[currentConnector] ??= 0;
    }
    // Push the start forward past anything already counted, so an interval
    // fully covered by earlier ones contributes exactly zero.
    const effectiveStart = Math.max(interval.startUtc, runningMaxEnd);
    const effectiveMs = Math.max(0, interval.endUtc - effectiveStart);
    totals[currentConnector] += effectiveMs / 1000;
    runningMaxEnd = Math.max(runningMaxEnd, interval.endUtc);
  }

  for (const key of Object.keys(totals)) {
    totals[Number(key)] = Math.round(totals[Number(key)]);
  }
  return totals;
}
