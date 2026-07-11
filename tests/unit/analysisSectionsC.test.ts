// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import type { AnalysisResult } from '../../src/app/analyze';
import type { WsHealth } from '../../src/app/ws/types';
import type { ProtocolValidationResult } from '../../src/app/protocol/types';
import { renderWebSocketHealth } from '../../src/app/render/sections/webSocketHealth';
import { renderProtocolCompliance } from '../../src/app/render/sections/protocolCompliance';

const wsHealth = (over: Partial<WsHealth>): WsHealth => ({
  pingCount: 2, pongCount: 2, serverPingCount: 0, avgIntervalSec: 30, avgLatencyMs: 100, maxLatencyMs: 150,
  missedPongCount: 0, stallCount: 0, connectionStatus: 'Healthy',
  pingRecords: [
    { ts: '2025-08-22T00:00:00.000Z', lineNo: 10, intervalSec: null, latencyMs: 100, pongMissed: false, isStall: false },
    { ts: '2025-08-22T00:00:30.000Z', lineNo: 20, intervalSec: 30, latencyMs: 120, pongMissed: false, isStall: false },
  ],
  serverPings: [], ...over,
});

describe('renderWebSocketHealth', () => {
  it('renders status, 5 cards, and an 8-col detail table', () => {
    const body = renderWebSocketHealth({ wsHealth: wsHealth({}) } as unknown as AnalysisResult);
    expect(body.textContent).toContain('Healthy');
    const headers = [...body.querySelectorAll('#ws-health-table thead th')].map((th) => th.textContent);
    expect(headers).toEqual(['S.No.', 'Timestamp (UTC)', 'Timestamp (IST)', 'Interval (s)', 'Latency (ms)', 'PONG', 'Stall', 'Log Line']);
    expect(body.querySelectorAll('#ws-health-table tbody tr')).toHaveLength(2);
  });

  it('shows the no-data state when there are no PINGs', () => {
    const body = renderWebSocketHealth({ wsHealth: wsHealth({ pingCount: 0, pingRecords: [] }) } as unknown as AnalysisResult);
    expect(body.textContent).toContain('No WebSocket PING/PONG');
    expect(body.querySelector('#ws-health-table')).toBeNull();
  });
});

describe('renderProtocolCompliance', () => {
  const result: ProtocolValidationResult = {
    groups: [{ id: 'BOOT', name: 'Boot', icon: '🔌', checks: [{ id: 'BOOT-001', description: 'Boot accepted', status: 'pass', details: 'ok', affectedItems: [] }] }],
    perTransactionResults: [{ txId: 55, connectorId: 1, totalEnergy: 5, internalTransactionId: null, lifecycle: [{ stage: 'Start Tx', status: 'pass', note: 'ok' }], overallStatus: 'pass', failedCount: 0, warnCount: 0 }],
    summary: { total: 1, passed: 1, warnings: 0, failed: 0, info: 0, evaluated: 1, compliance: 100 },
  };
  const body = renderProtocolCompliance({ protocol: result } as unknown as AnalysisResult);

  it('renders the compliance badge, 5 summary cards, and both tab buttons', () => {
    expect(body.textContent).toContain('100% Compliant');
    expect(body.textContent).toContain('System Checks (1)');
    expect(body.textContent).toContain('Transaction Lifecycle (1)');
    expect(body.querySelectorAll('.grid > div').length).toBeGreaterThanOrEqual(5);
  });

  it('renders system-check rows and per-transaction lifecycle stages', () => {
    expect(body.textContent).toContain('BOOT-001');
    expect(body.textContent).toContain('TX 55');
    expect(body.textContent).toContain('Start Tx');
  });
});
