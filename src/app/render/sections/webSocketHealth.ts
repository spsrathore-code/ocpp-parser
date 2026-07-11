// WebSocket Connection Health section — faithful port of HTML 5655-5899. Status
// badge + 5 summary cards + detail table (capped at 500 rows, anomalies first).
// Renders `r.wsHealth` (Phase 2b `analyzeWebSocketHealth`). The status badge moves
// into the body (the collapsible header is owned by the orchestrator). Export → 3d.

import { el } from '../dom';
import { convertToIST } from '../format';
import type { AnalysisResult } from '../../analyze';
import type { WsHealth, WsPingRecord } from '../../ws/types';

const TH = 'px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider sticky top-0 bg-gray-50 dark:bg-gray-700 z-10';
const TABLE_ROW_LIMIT = 500;

function statusBadgeClass(status: string): string {
  return status === 'Healthy' ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
    : status === 'Warning' ? 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200'
    : status === 'Critical' ? 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200'
    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400';
}

export function renderWebSocketHealth(r: AnalysisResult): HTMLElement {
  const h = r.wsHealth;
  const badge = el('div', { className: 'mb-4' }, [el('span', { className: `px-2 py-1 rounded text-xs font-bold ${statusBadgeClass(h.connectionStatus)}`, text: h.connectionStatus })]);

  if (h.pingCount === 0) {
    return el('div', {}, [badge, el('p', { className: 'text-sm text-gray-500 dark:text-gray-400 italic py-6 text-center', text: 'No WebSocket PING/PONG messages found in this log.' })]);
  }

  const statusCardColor = h.connectionStatus === 'Healthy' ? 'text-green-600 dark:text-green-400'
    : h.connectionStatus === 'Warning' ? 'text-yellow-600 dark:text-yellow-400'
    : h.connectionStatus === 'Critical' ? 'text-red-600 dark:text-red-400' : 'text-gray-500 dark:text-gray-400';
  const latencyColor = h.avgLatencyMs === null ? 'text-gray-500 dark:text-gray-400'
    : h.avgLatencyMs < 200 ? 'text-green-600 dark:text-green-400'
    : h.avgLatencyMs < 1000 ? 'text-yellow-600 dark:text-yellow-400' : 'text-red-600 dark:text-red-400';

  const cards = el('div', { className: 'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6', html: `
    <div class="bg-gray-50 dark:bg-gray-700 rounded-lg p-3 border border-gray-200 dark:border-gray-600">
      <div class="text-xs text-gray-500 dark:text-gray-400 mb-1">Total PINGs</div>
      <div class="text-2xl font-bold text-teal-600 dark:text-teal-400">${h.pingCount}</div>
      <div class="text-xs text-gray-400 mt-1">PONGs: ${h.pongCount}</div></div>
    <div class="bg-gray-50 dark:bg-gray-700 rounded-lg p-3 border border-gray-200 dark:border-gray-600">
      <div class="text-xs text-gray-500 dark:text-gray-400 mb-1">Avg Interval</div>
      <div class="text-2xl font-bold ${h.stallCount > 0 ? 'text-yellow-600 dark:text-yellow-400' : 'text-gray-800 dark:text-gray-200'}">${h.avgIntervalSec !== null ? h.avgIntervalSec + 's' : 'N/A'}</div>
      <div class="text-xs mt-1 ${h.stallCount > 0 ? 'text-yellow-600 dark:text-yellow-400' : 'text-gray-400'}">${h.stallCount > 0 ? '⚠ ' + h.stallCount + ' stall(s)' : 'No stalls'}</div></div>
    <div class="bg-gray-50 dark:bg-gray-700 rounded-lg p-3 border border-gray-200 dark:border-gray-600">
      <div class="text-xs text-gray-500 dark:text-gray-400 mb-1">Avg Latency</div>
      <div class="text-2xl font-bold ${latencyColor}">${h.avgLatencyMs !== null ? h.avgLatencyMs + 'ms' : 'N/A'}</div>
      <div class="text-xs text-gray-400 mt-1">${h.maxLatencyMs !== null ? 'Max: ' + h.maxLatencyMs + 'ms' : ''}</div></div>
    <div class="bg-gray-50 dark:bg-gray-700 rounded-lg p-3 border border-gray-200 dark:border-gray-600">
      <div class="text-xs text-gray-500 dark:text-gray-400 mb-1">Missed PONGs</div>
      <div class="text-2xl font-bold ${h.missedPongCount > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}">${h.missedPongCount}</div>
      <div class="text-xs text-gray-400 mt-1">${h.serverPingCount > 0 ? 'Server PINGs: ' + h.serverPingCount : 'No server PINGs'}</div></div>
    <div class="bg-gray-50 dark:bg-gray-700 rounded-lg p-3 border border-gray-200 dark:border-gray-600">
      <div class="text-xs text-gray-500 dark:text-gray-400 mb-1">Status</div>
      <div class="text-2xl font-bold ${statusCardColor}">${h.connectionStatus}</div></div>` });

  // Row prioritisation: when capped, show all anomalies + a sample of normals from both ends.
  type Indexed = WsPingRecord & { origIdx: number };
  const total = h.pingRecords.length;
  const truncated = total > TABLE_ROW_LIMIT;
  let displayRows: Indexed[];
  if (!truncated) {
    displayRows = h.pingRecords.map((rec, i) => ({ ...rec, origIdx: i }));
  } else {
    const anomalies = h.pingRecords.map((rec, i) => ({ ...rec, origIdx: i })).filter((rec) => rec.isStall || rec.pongMissed);
    const anomalyIdx = new Set(anomalies.map((rec) => rec.origIdx));
    const normals = h.pingRecords.map((rec, i) => ({ ...rec, origIdx: i })).filter((rec) => !anomalyIdx.has(rec.origIdx));
    const slots = Math.max(0, TABLE_ROW_LIMIT - anomalies.length);
    const half = Math.floor(slots / 2);
    displayRows = [...anomalies, ...normals.slice(0, half), ...normals.slice(-Math.max(0, slots - half))].sort((a, b) => a.origIdx - b.origIdx);
  }

  const latencyCell = (rec: WsPingRecord): string => {
    if (rec.pongMissed) return `<span class="px-2 py-0.5 rounded text-xs font-semibold bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300">No PONG</span>`;
    const v = rec.latencyMs!;
    const cls = v < 200 ? 'text-green-600 dark:text-green-400' : v < 1000 ? 'text-yellow-600 dark:text-yellow-400' : v < 3000 ? 'font-semibold text-orange-600 dark:text-orange-400' : 'font-bold text-red-600 dark:text-red-400';
    return `<span class="font-mono text-sm ${cls}">${v}</span>`;
  };

  const bodyRows: HTMLElement[] = [];
  if (truncated) {
    bodyRows.push(el('tr', {}, [el('td', { className: 'px-4 py-2 bg-blue-50 dark:bg-blue-900/20 text-xs text-blue-700 dark:text-blue-300 text-center', attrs: { colspan: '8' }, html: `Showing ${displayRows.length} of ${total} entries (all ${h.missedPongCount} missed PONGs + ${h.stallCount} stalls shown). Use <strong>Export to Excel</strong> for the complete dataset.` })]));
  }
  for (let i = 0; i < displayRows.length; i++) {
    const rec = displayRows[i];
    const cls = rec.isStall && rec.pongMissed ? 'bg-red-50 dark:bg-red-900/20' : rec.isStall ? 'bg-yellow-50 dark:bg-yellow-900/20' : rec.pongMissed ? 'bg-red-50 dark:bg-red-900/20' : 'hover:bg-gray-50 dark:hover:bg-gray-700/50';
    const pong = rec.pongMissed ? `<span class="px-2 py-0.5 rounded text-xs font-semibold bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300">✗ Missed</span>` : `<span class="px-2 py-0.5 rounded text-xs font-semibold bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300">✓ Received</span>`;
    const stall = rec.isStall ? `<span class="px-2 py-0.5 rounded text-xs font-semibold bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300">⚠ Stall</span>` : `<span class="text-gray-400 dark:text-gray-500 text-xs">—</span>`;
    const interval = rec.intervalSec !== null ? `<span class="font-mono text-sm ${rec.isStall ? 'font-bold text-yellow-700 dark:text-yellow-300' : 'text-gray-900 dark:text-gray-100'}">${rec.intervalSec}s</span>` : `<span class="text-gray-400 dark:text-gray-500 text-xs">—</span>`;
    bodyRows.push(el('tr', { className: cls, html: `
      <td class="px-4 py-2 whitespace-nowrap text-sm font-semibold text-gray-900 dark:text-gray-100">${i + 1}</td>
      <td class="px-4 py-2 whitespace-nowrap text-xs font-mono text-gray-900 dark:text-gray-100 select-all">${rec.ts}</td>
      <td class="px-4 py-2 whitespace-nowrap text-xs text-gray-700 dark:text-gray-300">${convertToIST(rec.ts)}</td>
      <td class="px-4 py-2 whitespace-nowrap">${interval}</td>
      <td class="px-4 py-2 whitespace-nowrap">${latencyCell(rec)}</td>
      <td class="px-4 py-2 whitespace-nowrap">${pong}</td>
      <td class="px-4 py-2 whitespace-nowrap">${stall}</td>
      <td class="px-4 py-2 whitespace-nowrap text-sm font-mono text-gray-500 dark:text-gray-400">${rec.lineNo}</td>` }));
  }

  const table = el('table', { className: 'min-w-full divide-y divide-gray-200 dark:divide-gray-700', attrs: { id: 'ws-health-table' } }, [
    el('thead', { className: 'bg-gray-50 dark:bg-gray-700' }, [el('tr', {}, ['S.No.', 'Timestamp (UTC)', 'Timestamp (IST)', 'Interval (s)', 'Latency (ms)', 'PONG', 'Stall', 'Log Line'].map((c) => el('th', { className: TH, text: c })))]),
    el('tbody', { className: 'bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700' }, bodyRows),
  ]);

  return el('div', {}, [badge, cards, el('div', { className: 'overflow-auto max-h-[500px]' }, [table])]);
}
