// Heartbeats section — faithful port of HTML 2275-2288, plus a real Response Time.
// Response Time (ms) = correlated CallResult timestamp − request timestamp. Shown
// when a response is correlated and the diff is measurable (> 0); 'N/A' otherwise
// — so millisecond text-log timestamps yield real latencies, while CMS sources with
// second-granularity or a single timestamp (equal req/resp) read 'N/A'.

import { dataTable, type Row } from '../table';
import type { AnalysisResult } from '../../analyze';
import type { ParsedMessage } from '../../model/types';

const HEADERS = ['Time Stamp', 'Message ID', 'Response Time (ms)'];

/** Request→response latency in whole ms, or 'N/A' if absent/unmeasurable/invalid. */
export function responseTimeMs(msg: ParsedMessage): string {
  if (!msg.responseTimestamp) return 'N/A';
  const req = new Date(msg.timestamp).getTime();
  const res = new Date(msg.responseTimestamp).getTime();
  if (Number.isNaN(req) || Number.isNaN(res)) return 'N/A';
  const diff = res - req;
  return diff > 0 ? String(diff) : 'N/A';
}

export function renderHeartbeats(r: AnalysisResult): HTMLElement {
  const rows: Row[] = r.messageGroups.Heartbeat.map((msg) => ({
    fileName: msg.fileName,
    'Time Stamp': msg.timestamp,
    'Message ID': msg.message[1] as string,
    'Response Time (ms)': responseTimeMs(msg),
  }));
  return dataTable(HEADERS, rows, 'heartbeats-table');
}
