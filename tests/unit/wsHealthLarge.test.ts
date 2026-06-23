// Regression: a ping-heavy log (e.g. MH0135, 315k lines) produces a very large
// latency array. `Math.max(...validLatencies)` overflowed the JS arg cap and
// threw "Maximum call stack size exceeded", which bubbled up and left the parser
// showing no results.
import { describe, it, expect } from 'vitest';
import { analyzeWebSocketHealth } from '../../src/app/ws/wsHealth';
import type { WsEventStreams } from '../../src/app/detect/types';

function bigStreams(n: number): WsEventStreams {
  const pings = new Array(n);
  const pongs = new Array(n);
  for (let i = 0; i < n; i++) {
    const base = i * 1000; // pings 1s apart
    pings[i] = { ts: new Date(base).toISOString(), t: new Date(base), lineNo: i + 1 };
    pongs[i] = { ts: new Date(base + 100).toISOString(), t: new Date(base + 100), lineNo: i + 1 }; // pong 100ms later → matched
  }
  return { pings, pongs, serverPings: [] };
}

describe('analyzeWebSocketHealth on a very large ping stream', () => {
  it('does not overflow and computes maxLatencyMs over 300k+ matched pings', () => {
    const h = analyzeWebSocketHealth(bigStreams(300_001));
    expect(h.pingCount).toBe(300_001);
    expect(h.maxLatencyMs).toBe(100);
    expect(h.missedPongCount).toBe(0);
  });
});
