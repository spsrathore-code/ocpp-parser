// Incomplete Transaction Summary section — faithful port of HTML 5161-5269. Draws
// `r.incompleteTransactions` (from the Phase 2a detector): summary cards + a badge
// table. Always shown (green "all complete" empty state). Export → 3d.

import { el } from '../dom';
import { convertToIST } from '../format';
import type { AnalysisResult } from '../../analyze';

const HEADERS = ['S.No.', 'Transaction ID', 'Connector ID', 'Missing', 'Location', 'Ref Time (IST)', 'Reason'];
const TH = 'px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider whitespace-nowrap';
const TD = 'px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100';
const BADGE = 'inline-flex items-center px-2 py-1 rounded text-xs font-semibold';

function card(value: number, label: string, color: string): HTMLElement {
  return el('div', { className: `bg-${color}-50 dark:bg-${color}-900/20 rounded-lg p-3 text-center border border-${color}-200 dark:border-${color}-800` }, [
    el('div', { className: `text-2xl font-bold text-${color}-700 dark:text-${color}-300`, text: String(value) }),
    el('div', { className: `text-xs text-${color}-600 dark:text-${color}-400 mt-1`, text: label }),
  ]);
}

export function renderIncompleteTransactions(r: AnalysisResult): HTMLElement {
  const items = r.incompleteTransactions;
  const startOfLogs = items.filter((t) => t.location === 'Start of Logs').length;
  const endOfLogs = items.filter((t) => t.location === 'End of Logs').length;
  const between = items.filter((t) => t.location === 'Between Logs').length;

  const cards = el('div', { className: 'grid grid-cols-3 gap-3 mb-4' }, [
    card(items.length, 'Total Incomplete', 'blue'),
    card(startOfLogs + endOfLogs, 'Log Boundary (Expected)', 'yellow'),
    card(between, 'Between Logs (Errors)', 'red'),
  ]);

  if (items.length === 0) {
    return el('div', {}, [cards, el('div', { className: 'text-center py-8 text-green-600 dark:text-green-400 font-medium', text: '✅ All transactions are complete — no missing Start or Stop found.' })]);
  }

  const bodyRows = items.map((inc, i) => {
    const locationBadge = inc.location === 'Between Logs'
      ? `<span class="${BADGE} bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300">🔴 Between Logs</span>`
      : inc.location === 'Start of Logs'
        ? `<span class="${BADGE} bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300">📋 Start of Logs</span>`
        : `<span class="${BADGE} bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300">📋 End of Logs</span>`;
    const missingBadge = inc.missing === 'Stop'
      ? `<span class="${BADGE} bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300">Missing Stop</span>`
      : `<span class="${BADGE} bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300">Missing Start</span>`;
    return el('tr', { className: inc.location === 'Between Logs' ? 'bg-red-50 dark:bg-red-900/10 hover:bg-red-100 dark:hover:bg-red-900/30' : 'bg-yellow-50 dark:bg-yellow-900/10 hover:bg-yellow-100 dark:hover:bg-yellow-900/30' }, [
      el('td', { className: 'px-4 py-3 whitespace-nowrap text-sm font-semibold text-gray-900 dark:text-gray-100', text: String(i + 1) }),
      el('td', { className: 'px-4 py-3 whitespace-nowrap text-sm font-mono text-gray-900 dark:text-gray-100', text: String(inc.id) }),
      el('td', { className: TD, text: String(inc.connectorId) }),
      el('td', { className: 'px-4 py-3 whitespace-nowrap text-sm', html: missingBadge }),
      el('td', { className: 'px-4 py-3 whitespace-nowrap text-sm', html: locationBadge }),
      el('td', { className: TD, text: convertToIST(inc.refTime) }),
      el('td', { className: 'px-4 py-3 text-sm text-gray-600 dark:text-gray-400', text: inc.reason ?? '' }),
    ]);
  });

  const table = el('table', { className: 'min-w-full divide-y divide-gray-200 dark:divide-gray-700', attrs: { id: 'incomplete-transactions-table' } }, [
    el('thead', { className: 'bg-gray-50 dark:bg-gray-700 sticky top-0' }, [el('tr', {}, HEADERS.map((h) => el('th', { className: TH, text: h })))]),
    el('tbody', { className: 'bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700' }, bodyRows),
  ]);

  return el('div', {}, [cards, el('div', { className: 'overflow-x-auto max-h-[500px]' }, [table])]);
}
