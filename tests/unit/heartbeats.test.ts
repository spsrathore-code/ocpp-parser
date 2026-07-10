// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { renderHeartbeats } from '../../src/app/render/sections/heartbeats';
import { computeHeartbeatSummary } from '../../src/app/health/heartbeatSummary';
import type { AnalysisResult } from '../../src/app/analyze';
import type { ParsedMessage } from '../../src/app/model/types';

function resultWith(heartbeats: ParsedMessage[], bootInterval: number | null = null): AnalysisResult {
  return {
    messageGroups: { Heartbeat: heartbeats },
    heartbeatSummary: computeHeartbeatSummary(heartbeats, bootInterval),
  } as unknown as AnalysisResult;
}

const hb = (o: Partial<ParsedMessage>): ParsedMessage => ({
  timestamp: '2026-07-09T05:58:11.201Z', direction: 'sent', message: [2, 'id1', 'Heartbeat', {}],
  lineNumber: 1, fileName: 'f', ...o,
} as ParsedMessage);

/** Text content of the last column (Response Time (ms)) for the first data row. */
function firstResponseCell(el: HTMLElement): string {
  const cells = el.querySelectorAll('tbody tr')[0].querySelectorAll('td');
  return cells[cells.length - 1].textContent ?? '';
}

describe('renderHeartbeats — Response Time (ms)', () => {
  it('computes the request→response latency in ms (text-log case)', () => {
    const el = renderHeartbeats(resultWith([hb({ responseTimestamp: '2026-07-09T05:58:11.313Z' })]));
    expect(firstResponseCell(el)).toBe('112');
  });

  it('shows N/A when the request has no correlated response', () => {
    expect(firstResponseCell(renderHeartbeats(resultWith([hb({ responseTimestamp: undefined })])))).toBe('N/A');
  });

  it('shows N/A when request and response timestamps are equal (unmeasurable)', () => {
    const el = renderHeartbeats(resultWith([hb({ timestamp: '2025-08-08T00:02:42.000Z', responseTimestamp: '2025-08-08T00:02:42.000Z' })]));
    expect(firstResponseCell(el)).toBe('N/A');
  });
});

describe('renderHeartbeats — Heartbeat Summary panel', () => {
  const hbCt = (currentTime: string): ParsedMessage => hb({ responsePayload: { currentTime } });

  it('shows the summary stats (total / avg / min / max / expected)', () => {
    const el = renderHeartbeats(resultWith(
      [hbCt('2026-07-09T00:00:00Z'), hbCt('2026-07-09T00:02:00Z'), hbCt('2026-07-09T00:04:00Z')],
      120,
    ));
    const txt = el.textContent ?? '';
    expect(txt).toContain('Heartbeat Summary');
    expect(txt).toContain('Total Heartbeats');
    expect(txt).toContain('120'); // avg / expected seconds
    expect(txt.toLowerCase()).toContain('configured');
  });

  it('lists a flagged missed-heartbeat interval when a gap ≥ 1.5× expected exists', () => {
    const el = renderHeartbeats(resultWith(
      [hbCt('2026-07-09T00:00:00Z'), hbCt('2026-07-09T00:02:00Z'), hbCt('2026-07-09T00:08:00Z')],
      120,
    ));
    const txt = el.textContent ?? '';
    expect(txt.toLowerCase()).toMatch(/missed/);
    expect(txt).toContain('360'); // the 6-minute gap in seconds
  });

  it('shows a not-enough-data note when < 2 heartbeats', () => {
    const el = renderHeartbeats(resultWith([hbCt('2026-07-09T00:00:00Z')], 120));
    expect((el.textContent ?? '').toLowerCase()).toContain('not enough heartbeats');
  });
});
