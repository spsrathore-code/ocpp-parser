// Transaction Summary section — faithful port of HTML 3676-4054. Eight summary
// cards, a zero-energy threshold control (localStorage-persisted, recomputes flags
// + cards + rows live), a row filter, and the wide per-transaction table.
//
// `computeTxFlags` is pure for testability. Deferred: the per-row "View Chart"
// (Phase 3c) and "📊 Timeline" (Phase 4) buttons + their modal — so the trailing
// "Chart" column is omitted here and restored when charts land. Export → 3d.

import { el } from '../dom';
import { renderTransactionChart } from '../charts/txChart';
import { fmtReplayDelay, convertToIST } from '../format';
import { TEMP_THRESHOLDS, DEFAULT_ZERO_ENERGY_THRESHOLD_WH, METER_DIFF_THRESHOLD_WH, CURRENT_MISMATCH_FACTOR } from '../../model/config';
import type { Transaction } from '../../model/types';
import type { AnalysisResult } from '../../analyze';
import { wireTimelineButtons } from '../timeline/sessionTimeline';

export interface TxFlags { isZeroEnergy: boolean; isTempHigh: boolean; isMeterDiff: boolean; isCurrentMismatch: boolean; }

export function computeTxFlags(transactions: Transaction[], thresholdWh: number): TxFlags[] {
  return transactions.map((tx) => ({
    isZeroEnergy: typeof tx.totalEnergy === 'number' && tx.totalEnergy * 1000 < thresholdWh,
    isTempHigh:
      (tx.maxTempInlet != null && tx.maxTempInlet > TEMP_THRESHOLDS.Inlet) ||
      (tx.maxTempBody != null && tx.maxTempBody > TEMP_THRESHOLDS.Body) ||
      (tx.maxTempOutlet != null && tx.maxTempOutlet > TEMP_THRESHOLDS.Outlet),
    isMeterDiff: typeof tx.startStopDiff === 'number' && (tx.startStopDiff > METER_DIFF_THRESHOLD_WH || tx.startStopDiff < 0),
    isCurrentMismatch: (tx.currentPairCount ?? 0) >= 2 && (tx.avgCurrentEV ?? 0) > 0 && (tx.avgCurrentOutlet ?? 0) < CURRENT_MISMATCH_FACTOR * (tx.avgCurrentEV ?? 0),
  }));
}

const HEADERS = ['S.No.', 'Tx ID', 'Internal TX ID', 'Start Time (IST)', 'End Time (IST)', 'Duration (min)',
  'Connector ID', 'ID Tag', 'Meter Start (kWh)', 'Meter Stop (kWh)', 'Total Energy (kWh)',
  'Start/Stop Diff (Wh)', 'Avg Power (kW)', 'Peak Power (kW)', 'Avg Current Outlet (A)', 'Avg Current EV (A)',
  'Max Temp Inlet (°C)', 'Max Temp Outlet (°C)', 'Max Temp Body (°C)', 'Start SoC (%)', 'End SoC (%)',
  'Stop Reason', 'Tx Type', 'Replay Delay', 'Offline Replay', 'Status', 'Chart'];
const TD = 'px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100';
const NA = '<span class="text-gray-400 dark:text-gray-500">N/A</span>';
const DASH = '<span class="text-gray-400 dark:text-gray-500">—</span>';

function meterDiffCell(val: number | null): string {
  if (val === null) return NA;
  if (!(val > METER_DIFF_THRESHOLD_WH || val < 0)) return val.toFixed(0);
  const title = val < 0 ? 'Meter anomaly: current Meter Start > previous Meter Stop' : 'Gap > 10 Wh between sessions';
  return `<span class="font-semibold text-indigo-700 dark:text-indigo-300" title="${title}">⚠ ${val.toFixed(0)}</span>`;
}
function currentCell(avgOutlet: number | null | undefined, avgEV: number | null | undefined, isMismatch: boolean): string {
  if (avgOutlet == null) return NA;
  if (!isMismatch) return avgOutlet.toFixed(2);
  const pct = avgEV && avgEV > 0 ? Math.round((avgOutlet / avgEV) * 100) : 0;
  return `<span class="font-semibold text-purple-700 dark:text-purple-300" title="EVSE delivered ${pct}% of EV request (${avgOutlet.toFixed(2)}A delivered vs ${(avgEV ?? 0).toFixed(2)}A requested)">⚡ ${avgOutlet.toFixed(2)}</span>`;
}
function tempCell(val: number | null | undefined, threshold: number): string {
  if (val == null) return NA;
  return val > threshold ? `<span class="font-semibold text-orange-600 dark:text-orange-400" title="Above ${threshold}°C limit">🌡️ ${val.toFixed(1)}</span>` : val.toFixed(1);
}

function card(id: string, value: number, label: string, color: string): HTMLElement {
  return el('div', { className: `bg-${color}-50 dark:bg-${color}-900/20 rounded-lg p-3 text-center border border-${color}-200 dark:border-${color}-800` }, [
    el('div', { className: `text-2xl font-bold text-${color}-700 dark:text-${color}-300`, text: String(value), attrs: { id } }),
    el('div', { className: `text-xs text-${color}-600 dark:text-${color}-400 mt-1`, text: label }),
  ]);
}

export function renderTransactionSummary(r: AnalysisResult): HTMLElement {
  const transactions = r.transactions;
  const stored = parseInt(localStorage.getItem('zeroEnergyThresholdWh') || String(DEFAULT_ZERO_ENERGY_THRESHOLD_WH), 10);
  let thresholdWh = isNaN(stored) ? DEFAULT_ZERO_ENERGY_THRESHOLD_WH : stored;

  // Controls (threshold input; export deferred to 3d).
  const thresholdInput = el('input', {
    className: 'w-20 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100',
    attrs: { id: 'zero-energy-threshold', type: 'number', min: '1', max: '10000', value: String(thresholdWh) },
  });
  const controls = el('div', { className: 'flex flex-wrap items-center gap-3 mb-4' }, [
    el('div', { className: 'flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400' }, [
      el('label', { className: 'whitespace-nowrap font-medium', text: '⚡ Zero Energy Threshold:', attrs: { for: 'zero-energy-threshold' } }),
      thresholdInput,
      el('span', { className: 'text-gray-500 dark:text-gray-400', text: 'Wh' }),
    ]),
  ]);

  // Summary cards.
  const offlineCount = transactions.filter((tx) => tx.isOfflineReplay).length;
  const cards = el('div', { className: 'grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3 mb-4' }, [
    card('tx-total-count', transactions.length, 'Total Transactions', 'blue'),
    card('tx-offline-count', offlineCount, '📴 Offline Transactions', 'slate'),
    card('tx-online-count', transactions.length - offlineCount, '📡 Online Transactions', 'teal'),
    card('tx-zero-energy-count', 0, 'Zero Energy Transactions', 'yellow'),
    card('tx-temp-high-count', 0, 'Temperature High', 'orange'),
    card('tx-meter-diff-count', 0, 'Meter Diff High', 'indigo'),
    card('tx-current-mismatch-count', 0, 'Current Mismatch', 'purple'),
    card('tx-normal-count', 0, 'Normal Transactions', 'green'),
  ]);

  // Filter bar.
  const filterSelect = el('select', {
    className: 'px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100',
    attrs: { id: 'tx-row-filter' },
    html: `<option value="all">All</option>
      <option value="offline">📴 Offline Transactions Only</option>
      <option value="online">📡 Online Transactions Only</option>
      <option value="issues">All Issue Transactions</option>
      <option value="zero-energy">Zero Energy Only</option>
      <option value="temp-high">Temperature High Only</option>
      <option value="meter-diff">Meter Diff Only</option>
      <option value="current-mismatch">Current Mismatch Only</option>
      <option value="normal">Normal Only</option>`,
  });
  const filterCount = el('span', { className: 'text-gray-500 dark:text-gray-400 text-xs', attrs: { id: 'tx-filter-count' } });
  const filterBar = el('div', { className: 'flex items-center gap-2 mb-3 text-sm' }, [
    el('span', { className: 'text-gray-600 dark:text-gray-400 font-medium', text: 'Show:' }),
    filterSelect, filterCount,
  ]);

  const tbody = el('tbody', { className: 'bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700' });

  const buildRows = (): void => {
    const flags = computeTxFlags(transactions, thresholdWh);
    cards.querySelector('#tx-zero-energy-count')!.textContent = String(flags.filter((f) => f.isZeroEnergy).length);
    cards.querySelector('#tx-temp-high-count')!.textContent = String(flags.filter((f) => f.isTempHigh).length);
    cards.querySelector('#tx-meter-diff-count')!.textContent = String(flags.filter((f) => f.isMeterDiff).length);
    cards.querySelector('#tx-current-mismatch-count')!.textContent = String(flags.filter((f) => f.isCurrentMismatch).length);
    cards.querySelector('#tx-normal-count')!.textContent = String(flags.filter((f) => !f.isZeroEnergy && !f.isTempHigh && !f.isMeterDiff && !f.isCurrentMismatch).length);

    const trs = transactions.map((tx, index) => {
      const f = flags[index];
      const isAborted = tx.status === 'Aborted';
      const isIssue = f.isZeroEnergy || f.isTempHigh || f.isMeterDiff || f.isCurrentMismatch;
      const cls = f.isZeroEnergy ? 'bg-yellow-50 dark:bg-yellow-900/10 hover:bg-yellow-100 dark:hover:bg-yellow-900/30'
        : f.isTempHigh ? 'bg-orange-50 dark:bg-orange-900/10 hover:bg-orange-100 dark:hover:bg-orange-900/30'
        : f.isMeterDiff ? 'bg-blue-50 dark:bg-blue-900/10 hover:bg-blue-100 dark:hover:bg-blue-900/30'
        : f.isCurrentMismatch ? 'bg-purple-50 dark:bg-purple-900/10 hover:bg-purple-100 dark:hover:bg-purple-900/30'
        : isAborted ? 'bg-red-50 dark:bg-red-900/10 hover:bg-red-100 dark:hover:bg-red-900/30'
        : 'hover:bg-gray-50 dark:hover:bg-gray-700/50';

      const statusBadge = isAborted
        ? `<span class="inline-flex items-center px-2 py-1 rounded text-xs font-semibold bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300">${tx.status}</span>`
        : `<span class="inline-flex items-center px-2 py-1 rounded text-xs font-semibold bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300">${tx.status}</span>`;
      const zeroBadge = f.isZeroEnergy ? `<span class="inline-flex items-center ml-1 px-1 py-0.5 rounded text-xs font-semibold bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300" title="Below ${thresholdWh} Wh threshold">⚡ Low</span>` : '';
      const meterStartKwh = typeof tx.meterStart === 'number' ? (tx.meterStart / 1000).toFixed(2) : 'N/A';
      const meterStopKwh = typeof tx.meterStop === 'number' ? (tx.meterStop / 1000).toFixed(2) : 'N/A';
      const intTxId = tx.internalTransactionId || r.internalTxMap.get(String(tx.id)) || null;
      const intCell = intTxId ? `<span class="font-mono text-xs text-indigo-700 dark:text-indigo-300">${intTxId}</span>` : DASH;
      const txTypeBadge = tx.isOfflineReplay
        ? '<span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-slate-100 text-slate-800 dark:bg-slate-900/40 dark:text-slate-300">📴 Offline</span>'
        : '<span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-300">📡 Online</span>';
      const offlineReplayCell = tx.isOfflineReplay
        ? `<span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300" title="Recorded: ${new Date(tx.recordedTimestamp ?? tx.logTimestamp).toISOString()} / Sent to CSMS: ${new Date(tx.logTimestamp).toISOString()}">⚠ Replayed</span>`
        : DASH;

      return el('tr', {
        className: cls,
        attrs: {
          'data-is-zero-energy': String(f.isZeroEnergy), 'data-is-temp-high': String(f.isTempHigh),
          'data-is-meter-diff': String(f.isMeterDiff), 'data-is-current-mismatch': String(f.isCurrentMismatch),
          'data-is-issue': String(isIssue), 'data-is-offline-replay': String(!!tx.isOfflineReplay),
        },
        html: `
          <td class="${TD} font-semibold">${index + 1}</td>
          <td class="${TD} font-mono">${tx.id}</td>
          <td class="${TD}">${intCell}</td>
          <td class="${TD}">${convertToIST(tx.startTime)}</td>
          <td class="${TD}">${tx.stopTime ? convertToIST(tx.stopTime) : 'Ongoing'}</td>
          <td class="${TD}">${typeof tx.duration === 'number' ? tx.duration.toFixed(2) : tx.duration}</td>
          <td class="${TD}">${tx.connectorId ?? 'N/A'}</td>
          <td class="${TD}">${tx.idTag ?? 'N/A'}</td>
          <td class="${TD}">${meterStartKwh}</td>
          <td class="${TD}">${meterStopKwh}</td>
          <td class="${TD} font-semibold">${typeof tx.totalEnergy === 'number' ? tx.totalEnergy.toFixed(2) : tx.totalEnergy}${zeroBadge}</td>
          <td class="${TD}">${meterDiffCell(tx.startStopDiff ?? null)}</td>
          <td class="${TD}">${tx.avgPower ?? 'N/A'}</td>
          <td class="${TD}">${tx.peakPower ?? 'N/A'}</td>
          <td class="${TD}">${currentCell(tx.avgCurrentOutlet, tx.avgCurrentEV, f.isCurrentMismatch)}</td>
          <td class="${TD}">${tx.avgCurrentEV != null ? tx.avgCurrentEV.toFixed(2) : NA}</td>
          <td class="${TD}">${tempCell(tx.maxTempInlet, TEMP_THRESHOLDS.Inlet)}</td>
          <td class="${TD}">${tempCell(tx.maxTempOutlet, TEMP_THRESHOLDS.Outlet)}</td>
          <td class="${TD}">${tempCell(tx.maxTempBody, TEMP_THRESHOLDS.Body)}</td>
          <td class="${TD}">${tx.socBegin ?? 'N/A'}</td>
          <td class="${TD}">${tx.socEnd ?? 'N/A'}</td>
          <td class="${TD}">${tx.stopReason ?? 'N/A'}</td>
          <td class="px-4 py-3 whitespace-nowrap text-sm">${txTypeBadge}</td>
          <td class="${TD}">${tx.isOfflineReplay ? fmtReplayDelay(tx.replayDelayMs) : DASH}</td>
          <td class="px-4 py-3 whitespace-nowrap text-sm">${offlineReplayCell}</td>
          <td class="px-4 py-3 whitespace-nowrap text-sm">${statusBadge}</td>
          <td class="px-4 py-3 whitespace-nowrap text-sm"><button type="button" class="view-chart-btn bg-blue-500 hover:bg-blue-600 text-white py-1 px-3 rounded text-xs" data-txid="${tx.id}">View Chart</button><button type="button" class="view-timeline-btn bg-indigo-600 hover:bg-indigo-700 text-white py-1 px-3 rounded text-xs ml-1" data-txid="${tx.id}">📊 Timeline</button></td>`,
      });
    });
    tbody.replaceChildren(...trs);
  };
  buildRows();

  const applyFilter = (value: string): void => {
    let visible = 0;
    tbody.querySelectorAll('tr').forEach((row) => {
      const d = (row as HTMLElement).dataset;
      let show = false;
      if (value === 'all') show = true;
      else if (value === 'offline') show = d.isOfflineReplay === 'true';
      else if (value === 'online') show = d.isOfflineReplay === 'false';
      else if (value === 'issues') show = d.isIssue === 'true';
      else if (value === 'zero-energy') show = d.isZeroEnergy === 'true';
      else if (value === 'temp-high') show = d.isTempHigh === 'true';
      else if (value === 'meter-diff') show = d.isMeterDiff === 'true';
      else if (value === 'current-mismatch') show = d.isCurrentMismatch === 'true';
      else if (value === 'normal') show = d.isIssue === 'false';
      (row as HTMLElement).style.display = show ? '' : 'none';
      if (show) visible++;
    });
    filterCount.textContent = value !== 'all' ? `(${visible} shown)` : '';
  };
  filterSelect.addEventListener('change', (e) => applyFilter((e.target as HTMLSelectElement).value));

  thresholdInput.addEventListener('change', (e) => {
    const val = parseInt((e.target as HTMLInputElement).value, 10);
    if (!isNaN(val) && val >= 1 && val <= 10000) {
      thresholdWh = val;
      localStorage.setItem('zeroEnergyThresholdWh', String(val));
      buildRows();
      applyFilter(filterSelect.value);
    }
  });

  const table = el('table', { className: 'min-w-full divide-y divide-gray-200 dark:divide-gray-700', attrs: { id: 'transaction-summary-table' } }, [
    el('thead', { className: 'bg-gray-50 dark:bg-gray-700 sticky top-0' }, [
      el('tr', {}, HEADERS.map((h) => el('th', { className: 'px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider whitespace-nowrap', text: h }))),
    ]),
    tbody,
  ]);

  // Chart modal (hidden until a "View Chart" button is clicked).
  const canvas = el('canvas', { attrs: { style: 'height:400px;' } }) as HTMLCanvasElement;
  const modal = el('div', { className: 'fixed inset-0 bg-black bg-opacity-50 hidden items-center justify-center p-4 z-50' }, [
    el('div', { className: 'bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-4xl p-6' }, [
      el('div', { className: 'flex justify-between items-center mb-4' }, [
        el('h3', { className: 'text-xl font-semibold text-gray-900 dark:text-gray-100', text: 'Transaction Chart' }),
        el('button', { className: 'text-gray-500 hover:text-gray-800 dark:hover:text-gray-200', text: '✕', attrs: { 'data-chart-close': '' } }),
      ]),
      canvas,
    ]),
  ]);
  const closeModal = (): void => { modal.classList.add('hidden'); modal.classList.remove('flex'); };
  modal.addEventListener('click', (e) => { if (e.target === modal || (e.target as HTMLElement).hasAttribute('data-chart-close')) closeModal(); });

  const root = el('div', {}, [controls, cards, filterBar, el('div', { className: 'overflow-x-auto max-h-[500px]' }, [table]), modal]);

  // Delegated "View Chart" → open modal + render (Chart.js reads canvas size after layout).
  root.addEventListener('click', (e) => {
    const btn = (e.target as HTMLElement).closest('.view-chart-btn') as HTMLElement | null;
    if (!btn || !root.contains(btn)) return;
    const txId = Number(btn.getAttribute('data-txid'));
    const txData = transactions.find((t) => t.id === txId);
    if (!txData) return;
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    requestAnimationFrame(() => { void renderTransactionChart(canvas, txData); });
  });

  // Delegated "📊 Timeline" → open session timeline modal (FR-231/232/233/234).
  wireTimelineButtons(root, transactions, r.messages);

  return root;
}

