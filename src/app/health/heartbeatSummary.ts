// Heartbeat Summary — interval statistics between consecutive heartbeats using the
// authoritative Central-System timestamp (`currentTime` from each Heartbeat.conf),
// not the local log/Excel wall-clock. Works identically for the Client parser and
// both CMS customers because every heartbeat response carries `currentTime`.
// Pure + DOM-free so it is unit-testable and structured-clone-safe (worker boundary).

import { maxOf, minOf } from '../parse/concatChunks';
import type { ParsedMessage } from '../model/types';

/** Missed-heartbeat threshold: an interval this many times the expected one is flagged. */
const MISSED_FACTOR = 1.5;

export interface HeartbeatInterval {
  fromTime: string;   // currentTime of the earlier heartbeat (ISO)
  toTime: string;     // currentTime of the later heartbeat (ISO)
  seconds: number;    // (to − from) / 1000
  missedEstimate: number; // round(seconds / expected) − 1, ≥ 0 (0 when unflagged/no expected)
  flagged: boolean;   // seconds ≥ MISSED_FACTOR × expected
}

export interface HeartbeatSummary {
  total: number;               // heartbeats with a usable currentTime
  intervalCount: number;       // max(total − 1, 0)
  avgSeconds: number | null;   // null when < 2 usable heartbeats
  minSeconds: number | null;
  maxSeconds: number | null;
  expectedSeconds: number | null; // configured (BootNotification.conf.interval) or median
  expectedSource: 'configured' | 'median' | 'none';
  intervals: HeartbeatInterval[];
  flagged: HeartbeatInterval[];    // subset where flagged === true
}

interface Conf { currentTime?: string }

/** Median of a non-empty numeric array (sorted copy). */
function median(nums: number[]): number {
  const s = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

/**
 * Compute the heartbeat interval summary.
 * @param heartbeats correlated Heartbeat requests (each may carry responsePayload.currentTime)
 * @param bootInterval BootNotification.conf.interval in seconds, or null if unknown
 */
export function computeHeartbeatSummary(
  heartbeats: ParsedMessage[],
  bootInterval: number | null,
): HeartbeatSummary {
  // Authoritative CS timestamps, valid + sorted ascending.
  const times = heartbeats
    .map((m) => (m.responsePayload as Conf | null | undefined)?.currentTime)
    .filter((t): t is string => typeof t === 'string')
    .map((t) => ({ iso: t, ms: new Date(t).getTime() }))
    .filter((x) => !Number.isNaN(x.ms))
    .sort((a, b) => a.ms - b.ms);

  const total = times.length;
  const empty: HeartbeatSummary = {
    total, intervalCount: 0, avgSeconds: null, minSeconds: null, maxSeconds: null,
    expectedSeconds: null, expectedSource: 'none', intervals: [], flagged: [],
  };
  if (total < 2) return empty;

  // Consecutive intervals in seconds.
  const rawSeconds: number[] = [];
  for (let i = 1; i < times.length; i++) rawSeconds.push((times[i].ms - times[i - 1].ms) / 1000);

  // Expected interval: configured if positive, else median of observed intervals.
  let expectedSeconds: number | null = null;
  let expectedSource: HeartbeatSummary['expectedSource'] = 'none';
  if (typeof bootInterval === 'number' && bootInterval > 0) {
    expectedSeconds = bootInterval;
    expectedSource = 'configured';
  } else if (rawSeconds.length > 0) {
    expectedSeconds = median(rawSeconds);
    expectedSource = 'median';
  }

  const intervals: HeartbeatInterval[] = rawSeconds.map((seconds, i) => {
    const flagged = expectedSeconds != null && seconds >= MISSED_FACTOR * expectedSeconds;
    const missedEstimate = flagged && expectedSeconds ? Math.max(Math.round(seconds / expectedSeconds) - 1, 0) : 0;
    return { fromTime: times[i].iso, toTime: times[i + 1].iso, seconds, missedEstimate, flagged };
  });

  return {
    total,
    intervalCount: rawSeconds.length,
    avgSeconds: rawSeconds.reduce((a, b) => a + b, 0) / rawSeconds.length,
    minSeconds: minOf(rawSeconds),
    maxSeconds: maxOf(rawSeconds),
    expectedSeconds,
    expectedSource,
    intervals,
    flagged: intervals.filter((i) => i.flagged),
  };
}
