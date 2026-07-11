// Connector Stats section — faithful port of HTML 5276-5405 (table portion). The
// per-connector aggregation already happened in Phase 2d (`aggregateConnectorStats`,
// surfaced as `r.connectorStats`); this only draws it. Flag cells show "N (P%)"
// against the connector total, coloured when non-zero. The "Overlap" column is a
// legacy placeholder (Priority 9). Export button deferred to Phase 3d.

import { el } from '../dom';
import type { AnalysisResult } from '../../analyze';

const HEADERS = ['Connector ID', 'Total Tx', 'Avg Power (kW)', 'Peak Power (kW)', 'Zero Energy', 'Temp High', 'Meter Diff High', 'Current Mismatch', 'Overlap*', 'Normal'];
const TH = 'px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider whitespace-nowrap';
const TD = 'px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100';
const TD_BOLD = 'px-4 py-3 whitespace-nowrap text-sm font-semibold text-gray-900 dark:text-gray-100';
const TD_FLAG = 'px-4 py-3 whitespace-nowrap text-sm';

/** "N (P%)" — percentage of the connector total (HTML 5280). */
function rate(count: number, total: number): string {
  if (total === 0) return '0 (0%)';
  return `${count} (${Math.round((count / total) * 100)}%)`;
}

function flagCell(count: number, total: number, colour: string): HTMLElement {
  const cls = count > 0 ? `font-semibold text-${colour}-600 dark:text-${colour}-400` : 'text-gray-400 dark:text-gray-500';
  return el('td', { className: TD_FLAG }, [el('span', { className: cls, text: rate(count, total) })]);
}

export function renderConnectorStats(r: AnalysisResult): HTMLElement {
  const bodyRows = r.connectorStats.map((row) =>
    el('tr', { className: 'hover:bg-gray-50 dark:hover:bg-gray-700/50' }, [
      el('td', { className: TD_BOLD, text: String(row.cid) }),
      el('td', { className: TD, text: String(row.total) }),
      el('td', { className: TD, text: row.avgPower }),
      el('td', { className: TD, text: row.peakPower }),
      flagCell(row.zeroEnergyCount, row.total, 'yellow'),
      flagCell(row.tempHighCount, row.total, 'orange'),
      flagCell(row.meterDiffCount, row.total, 'indigo'),
      flagCell(row.currentMismatchCount, row.total, 'purple'),
      el('td', { className: 'px-4 py-3 whitespace-nowrap text-sm text-gray-400 dark:text-gray-500', text: '—', attrs: { title: 'Pending Priority 9' } }),
      flagCell(row.normalCount, row.total, 'green'),
    ]));

  const table = el('table', {
    className: 'min-w-full divide-y divide-gray-200 dark:divide-gray-700',
    attrs: { id: 'connector-stats-table' },
  }, [
    el('thead', { className: 'bg-gray-50 dark:bg-gray-700' }, [el('tr', {}, HEADERS.map((h) => el('th', { className: TH, text: h })))]),
    el('tbody', { className: 'bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700' }, bodyRows),
  ]);

  return el('div', {}, [
    el('div', { className: 'overflow-x-auto' }, [table]),
    el('p', { className: 'text-xs text-gray-400 dark:text-gray-500 mt-2', text: '* Overlap column will be populated once Priority 9 is implemented.' }),
  ]);
}
