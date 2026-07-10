// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { renderHeartbeats } from '../../src/app/render/sections/heartbeats';
import type { AnalysisResult } from '../../src/app/analyze';
import type { ParsedMessage } from '../../src/app/model/types';

function resultWith(heartbeats: ParsedMessage[]): AnalysisResult {
  return { messageGroups: { Heartbeat: heartbeats } } as unknown as AnalysisResult;
}

const hb = (o: Partial<ParsedMessage>): ParsedMessage => ({
  timestamp: '2026-07-09T05:58:11.201Z', direction: 'sent', message: [2, 'id1', 'Heartbeat', {}],
  lineNumber: 1, fileName: 'f', ...o,
} as ParsedMessage);

/** Text content of the 3rd column (Response Time (ms)) for the first data row. */
function firstResponseCell(el: HTMLElement): string {
  const row = el.querySelectorAll('tbody tr')[0];
  const cells = row.querySelectorAll('td');
  return cells[cells.length - 1].textContent ?? '';
}

describe('renderHeartbeats — Response Time (ms)', () => {
  it('computes the request→response latency in ms (text-log case)', () => {
    // sent 05:58:11.201Z, received 05:58:11.313Z → 112 ms
    const el = renderHeartbeats(resultWith([hb({ responseTimestamp: '2026-07-09T05:58:11.313Z' })]));
    expect(firstResponseCell(el)).toBe('112');
  });

  it('shows N/A when the request has no correlated response', () => {
    const el = renderHeartbeats(resultWith([hb({ responseTimestamp: undefined })]));
    expect(firstResponseCell(el)).toBe('N/A');
  });

  it('shows N/A when request and response timestamps are equal (unmeasurable, e.g. CMS second-granularity / single timestamp)', () => {
    const el = renderHeartbeats(resultWith([hb({ timestamp: '2025-08-08T00:02:42.000Z', responseTimestamp: '2025-08-08T00:02:42.000Z' })]));
    expect(firstResponseCell(el)).toBe('N/A');
  });
});
