// Heartbeats section — faithful port of HTML 2275-2288. Response Time is always
// 'N/A' in the source (no client-side latency for Heartbeat); preserved for parity.

import { dataTable, type Row } from '../table';
import type { AnalysisResult } from '../../analyze';

const HEADERS = ['Time Stamp', 'Message ID', 'Response Time (ms)'];

export function renderHeartbeats(r: AnalysisResult): HTMLElement {
  const rows: Row[] = r.messageGroups.Heartbeat.map((msg) => ({
    fileName: msg.fileName,
    'Time Stamp': msg.timestamp,
    'Message ID': msg.message[1] as string,
    'Response Time (ms)': 'N/A',
  }));
  return dataTable(HEADERS, rows, 'heartbeats-table');
}
