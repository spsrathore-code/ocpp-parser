// WebSocket Connection Health analyzer — faithful port of the v2026.05.14 tool's
// `analyzeWebSocketHealth` (HTML 5560, spec §14). Pure analysis over the PING/
// PONG/server-PING streams; the DOM section (createWebSocketHealthSection) is a
// Phase-3 render concern and is NOT ported here.
//
// Deviation from the original (behaviour-preserving): the heartbeat streams are
// passed in as a `WsEventStreams` argument instead of being read from
// `window._wsPingEvents` / `_wsPongEvents` / `_wsServerPings`.

import type { WsEventStreams } from '../detect/types';
import type { WsHealth, WsPingRecord, WsConnectionStatus } from './types';

const MISSED_TIMEOUT_MS = 10000; // 10 s per spec — PONG later than this counts as missed

function round1(n: number): number {
  return Number(n.toFixed(1));
}

export function analyzeWebSocketHealth(wsEvents: WsEventStreams): WsHealth {
  const pingEvents = wsEvents.pings;
  const pongEvents = wsEvents.pongs;
  const serverPings = wsEvents.serverPings;

  const pingRecords: WsPingRecord[] = [];

  // Two-pointer O(n+m) match — avoids the O(n²) freeze on high-frequency ping logs.
  let pongPtr = 0;
  for (let i = 0; i < pingEvents.length; i++) {
    const ping = pingEvents[i];
    const prevPing = i > 0 ? pingEvents[i - 1] : null;
    const intervalMs = prevPing ? ping.t.getTime() - prevPing.t.getTime() : null;
    const intervalSec = intervalMs !== null ? round1(intervalMs / 1000) : null;

    const nextPingT = i + 1 < pingEvents.length ? pingEvents[i + 1].t : null;

    // Advance past PONGs that arrived before this PING.
    while (pongPtr < pongEvents.length && pongEvents[pongPtr].t < ping.t) {
      pongPtr++;
    }

    // Does the next available PONG belong to this PING?
    let matchedPong = null;
    if (pongPtr < pongEvents.length) {
      const candidate = pongEvents[pongPtr];
      if (
        (nextPingT === null || candidate.t <= nextPingT) &&
        candidate.t.getTime() - ping.t.getTime() <= MISSED_TIMEOUT_MS
      ) {
        matchedPong = candidate;
        pongPtr++; // consume — one PONG per PING
      }
    }

    const latencyMs = matchedPong ? matchedPong.t.getTime() - ping.t.getTime() : null;
    pingRecords.push({
      ts: ping.ts,
      lineNo: ping.lineNo,
      intervalSec,
      latencyMs,
      pongMissed: !matchedPong,
      isStall: false,
    });
  }

  // Adaptive average interval.
  const validIntervals = pingRecords.filter((r) => r.intervalSec !== null).map((r) => r.intervalSec as number);
  const avgIntervalSec =
    validIntervals.length > 0 ? round1(validIntervals.reduce((a, b) => a + b, 0) / validIntervals.length) : null;

  // Flag stalls: interval > 2× average.
  if (avgIntervalSec !== null) {
    pingRecords.forEach((r) => {
      r.isStall = r.intervalSec !== null && r.intervalSec > avgIntervalSec * 2;
    });
  }

  const validLatencies = pingRecords.filter((r) => r.latencyMs !== null).map((r) => r.latencyMs as number);
  const avgLatencyMs =
    validLatencies.length > 0 ? round1(validLatencies.reduce((a, b) => a + b, 0) / validLatencies.length) : null;
  const maxLatencyMs = validLatencies.length > 0 ? Math.max(...validLatencies) : null;
  const missedPongCount = pingRecords.filter((r) => r.pongMissed).length;
  const stallCount = pingRecords.filter((r) => r.isStall).length;

  // Overall connection status.
  let connectionStatus: WsConnectionStatus = 'No Data';
  if (pingEvents.length > 0) {
    const missedRate = missedPongCount / pingEvents.length;
    if (missedRate > 0.2 || (maxLatencyMs !== null && maxLatencyMs >= 3000)) {
      connectionStatus = 'Critical';
    } else if (stallCount > 0 || missedPongCount > 0 || (maxLatencyMs !== null && maxLatencyMs >= 1000)) {
      connectionStatus = 'Warning';
    } else {
      connectionStatus = 'Healthy';
    }
  }

  return {
    pingCount: pingEvents.length,
    pongCount: pongEvents.length,
    serverPingCount: serverPings.length,
    avgIntervalSec,
    avgLatencyMs,
    maxLatencyMs,
    missedPongCount,
    stallCount,
    connectionStatus,
    pingRecords,
    serverPings,
  };
}
