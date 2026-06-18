// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import type { ParsedMessage, ParsedAlert, ParsedEvent } from '../../src/app/model/types';
import type { AnalysisResult } from '../../src/app/analyze';
import { computeDebugStats, renderDebugInfo } from '../../src/app/render/sections/debugInfo';

function msg(ts: string, message: unknown[]): ParsedMessage {
  return { timestamp: ts, direction: 'received', message, lineNumber: 1, fileName: 'log.txt' } as ParsedMessage;
}
function bundle(over: Partial<AnalysisResult>): AnalysisResult {
  return {
    messages: [], events: [], alerts: [], rawLogLines: [], filesProcessed: ['log.txt'],
    messageGroups: { BootNotification: [], Heartbeat: [], StatusNotification: [], StartTransaction: [], StopTransaction: [], MeterValues: [], Other: [] },
    ...over,
  } as AnalysisResult;
}

describe('computeDebugStats', () => {
  it('counts groups and formats the log span across all timestamp sources', () => {
    const r = bundle({
      messages: [msg('2025-08-22T00:00:00.000Z', [2, 'a', 'Heartbeat', {}]), msg('2025-08-22T02:00:00.000Z', [2, 'b', 'Heartbeat', {}])],
      events: [{ timestamp: '2025-08-22T01:00:00.000Z', type: 'info' } as ParsedEvent],
      alerts: [{ timestamp: '2025-08-22T00:30:00.000Z', code: 'E01', message: 'Overtemp' } as ParsedAlert,
               { timestamp: '2025-08-22T00:40:00.000Z', code: 'E01', message: 'Overtemp' } as ParsedAlert],
      messageGroups: { ...bundle({}).messageGroups, Heartbeat: [msg('x', []), msg('y', [])], BootNotification: [msg('z', [])] },
    });
    const s = computeDebugStats(r);
    expect(s.counts.heartbeats).toBe(2);
    expect(s.counts.bootNotifications).toBe(1);
    expect(s.counts.alerts).toBe(2);
    expect(s.uniqueEventTypes).toEqual(['info']);
    expect(s.alertCodes).toEqual([{ code: 'E01', count: 2, description: 'Overtemp' }]);
    expect(s.startUtc).toBe('2025-08-22 00:00:00Z');
    expect(s.endUtc).toBe('2025-08-22 02:00:00Z');
    expect(s.duration).toBe('2h 0m');
  });

  it('reports N/A span when there are no timestamps', () => {
    const s = computeDebugStats(bundle({}));
    expect(s.startUtc).toBe('N/A');
    expect(s.duration).toBe('N/A');
  });
});

describe('renderDebugInfo', () => {
  it('renders stat numbers and the log-duration block', () => {
    const r = bundle({ messages: [msg('2025-08-22T00:00:00.000Z', [2, 'a', 'Heartbeat', {}])], messageGroups: { ...bundle({}).messageGroups, Heartbeat: [msg('x', [])] } });
    const body = renderDebugInfo(r);
    expect(body.textContent).toContain('Heartbeats');
    expect(body.textContent).toContain('Total Duration');
    expect(body.textContent).toContain('IST:');
  });
});
