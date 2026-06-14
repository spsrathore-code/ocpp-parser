import { describe, it, expect } from 'vitest';
import { analyzeWebSocketHealth } from '../../src/app/ws/wsHealth';
import type { WsEvent, WsEventStreams } from '../../src/app/detect/types';

function ev(iso: string, lineNo: number): WsEvent {
  return { ts: iso, t: new Date(iso), lineNo };
}
function streams(pings: WsEvent[], pongs: WsEvent[], serverPings: WsEvent[] = []): WsEventStreams {
  return { pings, pongs, serverPings };
}

const B = '2025-08-22T00:00:'; // shared minute prefix

describe('analyzeWebSocketHealth — healthy connection', () => {
  const ws = analyzeWebSocketHealth(
    streams(
      [ev(`${B}00.000Z`, 1), ev(`${B}05.000Z`, 3), ev(`${B}10.000Z`, 5)],
      [ev(`${B}00.100Z`, 2), ev(`${B}05.100Z`, 4), ev(`${B}10.100Z`, 6)],
    ),
  );

  it('matches every PING with its PONG, computes interval/latency, and reports Healthy', () => {
    expect(ws.pingCount).toBe(3);
    expect(ws.pongCount).toBe(3);
    expect(ws.missedPongCount).toBe(0);
    expect(ws.stallCount).toBe(0);
    expect(ws.avgIntervalSec).toBe(5);
    expect(ws.avgLatencyMs).toBe(100);
    expect(ws.maxLatencyMs).toBe(100);
    expect(ws.connectionStatus).toBe('Healthy');
    expect(ws.pingRecords[0].intervalSec).toBeNull(); // first PING has no prior interval
    expect(ws.pingRecords[1].intervalSec).toBe(5);
    expect(ws.pingRecords[1].latencyMs).toBe(100);
  });
});

describe('analyzeWebSocketHealth — missed PONG (Critical via miss rate)', () => {
  it('marks a PING with no PONG as pongMissed and counts it', () => {
    const ws = analyzeWebSocketHealth(
      streams([ev(`${B}00.000Z`, 1), ev(`${B}05.000Z`, 3)], [ev(`${B}00.100Z`, 2)]),
    );
    expect(ws.missedPongCount).toBe(1);
    expect(ws.pingRecords[0].pongMissed).toBe(false);
    expect(ws.pingRecords[1].pongMissed).toBe(true);
    expect(ws.pingRecords[1].latencyMs).toBeNull();
    // 1 missed of 2 = 50% > 20% miss rate → Critical
    expect(ws.connectionStatus).toBe('Critical');
  });
});

describe('analyzeWebSocketHealth — stall (interval > 2× average)', () => {
  it('flags an over-long interval as a stall and reports Warning', () => {
    const ws = analyzeWebSocketHealth(
      streams(
        [ev(`${B}00.000Z`, 1), ev(`${B}01.000Z`, 3), ev(`${B}02.000Z`, 5), ev(`${B}10.000Z`, 7)],
        [ev(`${B}00.100Z`, 2), ev(`${B}01.100Z`, 4), ev(`${B}02.100Z`, 6), ev(`${B}10.100Z`, 8)],
      ),
    );
    expect(ws.avgIntervalSec).toBe(3.3); // (1 + 1 + 8) / 3
    expect(ws.stallCount).toBe(1);
    expect(ws.pingRecords[3].isStall).toBe(true); // 8s > 6.6s
    expect(ws.missedPongCount).toBe(0);
    expect(ws.connectionStatus).toBe('Warning');
  });
});

describe('analyzeWebSocketHealth — no data', () => {
  it('reports No Data on empty streams and passes through server-PING count', () => {
    const ws = analyzeWebSocketHealth(streams([], [], [ev(`${B}00.000Z`, 1)]));
    expect(ws.pingCount).toBe(0);
    expect(ws.connectionStatus).toBe('No Data');
    expect(ws.avgIntervalSec).toBeNull();
    expect(ws.serverPingCount).toBe(1);
  });
});
