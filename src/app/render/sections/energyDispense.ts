// Energy Dispense Check section — faithful port of HTML 5407-5554 (render portion).
// The reconciliation already happened in Phase 2d (`analyzeEnergyDispense`, surfaced
// as `r.energyDispense`); this draws the summary cards + table. Export → 3d.

import { el } from '../dom';
import type { AnalysisResult } from '../../analyze';

const HEADERS = ['Connector ID', 'Transactions', 'Min Meter Start (Wh)', 'Max Meter Stop (Wh)', 'Recorded Energy (Wh)', 'Summed Energy (Wh)', 'Energy Diff (Wh)', 'Diff / Tx (Wh)', 'Status'];
const TH = 'px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider whitespace-nowrap';
const TD = 'px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100';

function card(value: number, label: string, color: string): HTMLElement {
  return el('div', { className: `bg-${color}-50 dark:bg-${color}-900/20 rounded-lg p-3 text-center border border-${color}-200 dark:border-${color}-800` }, [
    el('div', { className: `text-2xl font-bold text-${color}-700 dark:text-${color}-300`, text: String(value) }),
    el('div', { className: `text-xs text-${color}-600 dark:text-${color}-400 mt-1`, text: label }),
  ]);
}

export function renderEnergyDispense(r: AnalysisResult): HTMLElement {
  const rows = r.energyDispense;
  const flagCount = rows.filter((x) => x.isFlag).length;
  const cards = el('div', { className: 'grid grid-cols-3 gap-3 mb-4' }, [
    card(rows.length, 'Connectors Checked', 'blue'),
    card(flagCount, 'Discrepancy Detected', 'red'),
    card(rows.length - flagCount, 'Normal', 'green'),
  ]);

  if (rows.length === 0) {
    return el('div', {}, [cards, el('div', { className: 'text-center py-8 text-gray-500 dark:text-gray-400', text: 'No complete transactions found — energy dispense check requires at least one completed transaction per connector.' })]);
  }

  const bodyRows = rows.map((row) => {
    const statusBadge = row.isFlag
      ? `<span class="inline-flex items-center px-2 py-1 rounded text-xs font-semibold bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300">${row.energyDiff < 0 ? '⚠ Meter Anomaly' : '⚠ Discrepancy'}</span>`
      : `<span class="inline-flex items-center px-2 py-1 rounded text-xs font-semibold bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300">✓ Normal</span>`;
    const diff = row.isFlag ? `<span class="font-semibold text-red-600 dark:text-red-400">${row.energyDiff.toFixed(1)}</span>` : row.energyDiff.toFixed(1);
    const diffPerTx = row.isFlag ? `<span class="font-semibold text-red-600 dark:text-red-400">${row.diffPerTx.toFixed(1)}</span>` : row.diffPerTx.toFixed(1);
    return el('tr', { className: row.isFlag ? 'bg-red-50 dark:bg-red-900/10 hover:bg-red-100 dark:hover:bg-red-900/30' : 'hover:bg-gray-50 dark:hover:bg-gray-700/50' }, [
      el('td', { className: 'px-4 py-3 whitespace-nowrap text-sm font-semibold text-gray-900 dark:text-gray-100', text: String(row.connectorId) }),
      el('td', { className: TD, text: String(row.txCount) }),
      el('td', { className: TD, text: row.minMeterStart.toFixed(0) }),
      el('td', { className: TD, text: row.maxMeterStop.toFixed(0) }),
      el('td', { className: TD, text: row.recordedEnergy.toFixed(1) }),
      el('td', { className: TD, text: row.summedEnergy.toFixed(1) }),
      el('td', { className: 'px-4 py-3 whitespace-nowrap text-sm', html: diff }),
      el('td', { className: 'px-4 py-3 whitespace-nowrap text-sm', html: diffPerTx }),
      el('td', { className: 'px-4 py-3 whitespace-nowrap text-sm', html: statusBadge }),
    ]);
  });

  const table = el('table', { className: 'min-w-full divide-y divide-gray-200 dark:divide-gray-700', attrs: { id: 'energy-dispense-table' } }, [
    el('thead', { className: 'bg-gray-50 dark:bg-gray-700' }, [el('tr', {}, HEADERS.map((h) => el('th', { className: TH, text: h })))]),
    el('tbody', { className: 'bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700' }, bodyRows),
  ]);

  return el('div', {}, [cards, el('div', { className: 'overflow-x-auto' }, [table])]);
}
