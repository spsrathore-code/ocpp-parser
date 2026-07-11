// WebSocket Connection Health data contracts (§14). Consumes the WS heartbeat
// streams harvested by `detectDowntimes` (Phase 2a).

import type { WsEvent } from '../detect/types';

export type WsConnectionStatus = 'Healthy' | 'Warning' | 'Critical' | 'No Data';

/** One analysed PING and its (possibly missing) PONG. */
export interface WsPingRecord {
  ts: string; // raw `[timestamp]` of the PING
  lineNo: number;
  intervalSec: number | null; // gap to the previous PING (null for the first)
  latencyMs: number | null; // PING→PONG round-trip (null when PONG missed)
  pongMissed: boolean;
  isStall: boolean; // interval > 2× the adaptive average
}

/** Result of `analyzeWebSocketHealth` (§14). UI-agnostic; rendering is Phase 3. */
export interface WsHealth {
  pingCount: number;
  pongCount: number;
  serverPingCount: number;
  avgIntervalSec: number | null;
  avgLatencyMs: number | null;
  maxLatencyMs: number | null;
  missedPongCount: number;
  stallCount: number;
  connectionStatus: WsConnectionStatus;
  pingRecords: WsPingRecord[];
  serverPings: WsEvent[];
}
