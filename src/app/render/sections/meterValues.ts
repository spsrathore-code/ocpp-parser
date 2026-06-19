// Transaction & Meter Values section — port of HTML 2388-2575 + the pivot/render
// in updateMeterValuesTable (HTML 8200-8318). A transaction selector drives a
// pivoted wide meter-values table (one row per reading timestamp, one column per
// measurand/unit/location[/phase]) with Date / Transaction ID filters.
//
// Pure: `pivotMeterValues`, `buildTxInfo`. Deferred to Phase 3c (chart/stats-
// coupled): summary-card population, detailed-stats, the ZUC option, and the
// Transaction Analysis Graphs. Export → 3d.

import { el } from '../dom';
import { renderTransactionGraphs } from '../charts/meterValueGraphs';
import { fmtReplayDelay } from '../format';
import { OFFLINE_REPLAY_THRESHOLD_MS } from '../../model/config';
import type { ParsedMessage, Transaction } from '../../model/types';
import type { AnalysisResult } from '../../analyze';

/** The fixed pivoted column order (HTML 8230-8240). */
export const MV_HEADERS = [
  'File Name', 'Local Time Stamp', 'UTC Time Stamp', 'Transaction ID', 'Connector ID', 'Context', 'Tx Type', 'Replay Delay', 'Offline Replay',
  'Energy.Active.Import.Interval/Wh/Outlet', 'Energy.Active.Import.Register/Wh/Outlet', 'Power.Active.Import/W/Outlet',
  'SoC/Percent/EV', 'Current.Import/A/Outlet', 'Current.Import/A/EV', 'Voltage/V/Outlet', 'Voltage/V/EV',
  'Voltage/V/Inlet/L1', 'Voltage/V/Inlet/L2', 'Voltage/V/Inlet/L3',
  'Current.Offered/A/Outlet', 'Temperature/Celsius/Body', 'Temperature/Celsius/Inlet',
  'Temperature/Celsius/Outlet', 'Temperature/Celsius/Outlet#2',
  'Current.Import/A/Inlet/L1', 'Current.Import/A/Inlet/L2', 'Current.Import/A/Inlet/L3',
  'Energy.Active.Import.Register/kWh/Inlet', 'Power.Reactive.Import/kvar/Inlet',
  'Power.Active.Import/kW/Inlet', 'Energy.Reactive.Import.Register/kvarh/Inlet', 'Power.Factor/Percent/Inlet',
];

export type MvRow = Record<string, string>;
interface SampledValue { measurand?: string; unit?: string; location?: string; phase?: string; value?: string; context?: string; }
interface MeterValueReading { timestamp: string; sampledValue: SampledValue[]; }
interface MvPayload { transactionId?: number; connectorId?: number; meterValue?: MeterValueReading[] }

export interface TxInfo { id: number; text: string; }

const mvPayload = (msg: ParsedMessage): MvPayload => (msg.message[3] ?? {}) as MvPayload;

/** Pivot meter-value readings into one wide row per reading timestamp (HTML 8247-8285). */
export function pivotMeterValues(msgs: ParsedMessage[]): MvRow[] {
  const pivoted: Record<string, MvRow> = {};
  for (const msg of msgs) {
    const p = mvPayload(msg);
    const fileName = msg.fileName || 'N/A';
    const logTs = new Date(msg.timestamp).getTime();
    for (const mv of p.meterValue ?? []) {
      const ts = mv.timestamp;
      if (!pivoted[ts]) {
        const payTs = new Date(ts).getTime();
        const delta = Math.abs(logTs - payTs);
        const isReplay = !isNaN(delta) && delta > OFFLINE_REPLAY_THRESHOLD_MS;
        pivoted[ts] = {
          'File Name': fileName,
          'Local Time Stamp': new Date(ts).toLocaleString(),
          'UTC Time Stamp': ts,
          'Transaction ID': String(p.transactionId ?? ''),
          'Connector ID': String(p.connectorId ?? ''),
          'Context': mv.sampledValue[0]?.context || 'N/A',
          'Tx Type': isReplay ? '📴 Offline' : '📡 Online',
          'Replay Delay': isReplay ? fmtReplayDelay(delta) : '—',
          'Offline Replay': isReplay ? `⚠ Replayed  ·  Rec: ${new Date(ts).toISOString()}  →  Sent: ${new Date(msg.timestamp).toISOString()}` : '—',
        };
      }
      for (const sv of mv.sampledValue) {
        let key = `${sv.measurand}/${sv.unit}/${sv.location}`;
        if (sv.phase) key += `/${sv.phase}`;
        if (key === 'Temperature/Celsius/Outlet' && pivoted[ts][key] !== undefined) {
          pivoted[ts]['Temperature/Celsius/Outlet#2'] = sv.value ?? '';
        } else {
          pivoted[ts][key] = sv.value ?? '';
        }
      }
    }
  }
  return Object.values(pivoted).sort((a, b) => new Date(a['UTC Time Stamp']).getTime() - new Date(b['UTC Time Stamp']).getTime());
}

/** Selector labels: completed tx → duration; meter-only tx → derived/Meter Data (HTML 2404-2439). */
export function buildTxInfo(transactions: Transaction[], meterValues: ParsedMessage[]): TxInfo[] {
  const completedIds = transactions.map((t) => t.id);
  const mvIds = meterValues.map((mv) => mvPayload(mv).transactionId).filter((id): id is number => id != null);
  const allIds = [...new Set([...completedIds, ...mvIds])];
  return allIds.map((txId) => {
    const completed = transactions.find((t) => t.id === txId);
    if (completed && typeof completed.duration === 'number') return { id: txId, text: `Transaction ${txId} (${completed.duration.toFixed(0)}m)` };

    const forTx = meterValues.filter((mv) => mvPayload(mv).transactionId === txId);
    if (forTx.length > 0) {
      let begin: Date | null = null;
      let end: Date | null = null;
      for (const mv of forTx) {
        for (const reading of mvPayload(mv).meterValue ?? []) {
          const ctx = reading.sampledValue[0]?.context;
          const t = new Date(reading.timestamp);
          if (ctx === 'Transaction.Begin' && (!begin || t < begin)) begin = t;
          if (ctx === 'Transaction.End' && (!end || t > end)) end = t;
        }
      }
      if (begin && end) return { id: txId, text: `Transaction ${txId} (${((end.getTime() - begin.getTime()) / 60000).toFixed(0)}m)` };
    }
    return { id: txId, text: `Transaction ${txId} (Meter Data)` };
  });
}

export interface TxMetrics { durationMin: number | null; energy: number | null; }

/** Per-tx duration (Transaction.Begin→End) + energy (Σ Energy.Active.Import.Interval/Outlet) (HTML 8163). */
export function getTransactionMetrics(txId: string | number, meterValues: ParsedMessage[]): TxMetrics {
  const forTx = meterValues.filter((mv) => String(mvPayload(mv).transactionId) === String(txId));
  let begin: MeterValueReading | null = null;
  let end: MeterValueReading | null = null;
  let total = 0;
  let found = false;
  for (const mv of forTx) {
    for (const reading of mvPayload(mv).meterValue ?? []) {
      const ctx = reading.sampledValue[0]?.context;
      const t = new Date(reading.timestamp);
      if (ctx === 'Transaction.Begin' && (!begin || t < new Date(begin.timestamp))) begin = reading;
      if (ctx === 'Transaction.End' && (!end || t > new Date(end.timestamp))) end = reading;
      const interval = reading.sampledValue.find((sv) => sv.measurand === 'Energy.Active.Import.Interval' && sv.location === 'Outlet');
      if (interval && interval.value) { total += parseFloat(interval.value); found = true; }
    }
  }
  const durationMin = begin && end ? (new Date(end.timestamp).getTime() - new Date(begin.timestamp).getTime()) / 60000 : null;
  return { durationMin, energy: found ? total : null };
}

/** ZUC = "Zero Useful Charge" — sessions whose dispensed energy is < 1 kWh (HTML 8717). */
export function identifyZUCSessions(allTxIds: number[], meterValues: ParsedMessage[]): number[] {
  return allTxIds.filter((id) => { const m = getTransactionMetrics(id, meterValues); return m.energy !== null && m.energy < 1000; });
}

export interface MinMax { max: string; min: string; }
export interface TxStats {
  currentOutlet: MinMax; currentEV: MinMax; voltageOutlet: MinMax; voltageEV: MinMax;
  tempBody: MinMax; tempInlet: MinMax; tempOutlet: MinMax; tempOutlet2: MinMax;
  powerFactor: MinMax; powerOutlet: MinMax; soc: { start: string; end: string };
}

/** Per-measurand max/min (+ SoC start/end) over a transaction's pivoted rows (HTML 8672). */
export function calculateTransactionStats(txId: string | number, rows: MvRow[]): TxStats | null {
  const txData = rows.filter((row) => row['Transaction ID'] === String(txId));
  if (txData.length === 0) return null;
  const maxMin = (key: string): MinMax => {
    const values = txData.map((row) => parseFloat(row[key])).filter((v) => !isNaN(v) && v > 0);
    return values.length === 0 ? { max: 'N/A', min: 'N/A' } : { max: Math.max(...values).toFixed(2), min: Math.min(...values).toFixed(2) };
  };
  const startEnd = (key: string): { start: string; end: string } => {
    const values = txData.map((row) => ({ value: parseFloat(row[key]), ts: row['UTC Time Stamp'] }))
      .filter((v) => !isNaN(v.value) && v.value > 0)
      .sort((a, b) => new Date(a.ts).getTime() - new Date(b.ts).getTime());
    return values.length === 0 ? { start: 'N/A', end: 'N/A' } : { start: values[0].value.toFixed(2), end: values[values.length - 1].value.toFixed(2) };
  };
  return {
    currentOutlet: maxMin('Current.Import/A/Outlet'), currentEV: maxMin('Current.Import/A/EV'),
    voltageOutlet: maxMin('Voltage/V/Outlet'), voltageEV: maxMin('Voltage/V/EV'),
    tempBody: maxMin('Temperature/Celsius/Body'), tempInlet: maxMin('Temperature/Celsius/Inlet'),
    tempOutlet: maxMin('Temperature/Celsius/Outlet'), tempOutlet2: maxMin('Temperature/Celsius/Outlet#2'),
    powerFactor: maxMin('Power.Factor/Percent/Inlet'), powerOutlet: maxMin('Power.Active.Import/W/Outlet'),
    soc: startEnd('SoC/Percent/EV'),
  };
}

/** Detailed-statistics table HTML for a single transaction (HTML 8061-8157). */
function statsTableHtml(s: TxStats): string {
  const mm = (label: string, v: MinMax): string => `<tr><td class="px-4 py-2 font-medium text-gray-900 dark:text-gray-100">${label}</td><td class="px-4 py-2 text-gray-700 dark:text-gray-300">${v.max}</td><td class="px-4 py-2 text-gray-700 dark:text-gray-300">${v.min}</td><td class="px-4 py-2 text-gray-500 dark:text-gray-400">-</td><td class="px-4 py-2 text-gray-500 dark:text-gray-400">-</td></tr>`;
  const se = (label: string, v: { start: string; end: string }): string => `<tr><td class="px-4 py-2 font-medium text-gray-900 dark:text-gray-100">${label}</td><td class="px-4 py-2 text-gray-500 dark:text-gray-400">-</td><td class="px-4 py-2 text-gray-500 dark:text-gray-400">-</td><td class="px-4 py-2 text-gray-700 dark:text-gray-300">${v.start}</td><td class="px-4 py-2 text-gray-700 dark:text-gray-300">${v.end}</td></tr>`;
  return `<div class="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
    <h4 class="text-md font-semibold text-gray-800 dark:text-gray-200 mb-3">📊 Detailed Statistics</h4>
    <div class="overflow-x-auto"><table class="min-w-full text-sm">
      <thead class="bg-gray-50 dark:bg-gray-700"><tr>
        <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Parameter</th>
        <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Max Value</th>
        <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Min Value</th>
        <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Start Value</th>
        <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">End Value</th>
      </tr></thead>
      <tbody class="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
        ${mm('Target Current (A) — EV Demand', s.currentEV)}
        ${mm('Present Current (A) — Charger Output', s.currentOutlet)}
        ${mm('Target Voltage (V) — EV Demand', s.voltageEV)}
        ${mm('Present Voltage (V) — Charger Output', s.voltageOutlet)}
        ${mm('Temperature Body (°C)', s.tempBody)}
        ${mm('Temperature Inlet (°C)', s.tempInlet)}
        ${mm('Temperature Outlet (°C)', s.tempOutlet)}
        ${mm('Temperature Outlet#2 (°C)', s.tempOutlet2)}
        ${mm('Power Factor (%)', s.powerFactor)}
        ${mm('Power Outlet (W)', s.powerOutlet)}
        ${se('SoC EV (%)', s.soc)}
      </tbody></table></div></div>`;
}

const TH = 'px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider';
const SELECT = 'mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md dark:bg-gray-800 dark:border-gray-600';

function summaryCard(id: string, label: string, color: string): HTMLElement {
  return el('div', { className: `text-center p-3 bg-${color}-50 dark:bg-${color}-900/20 rounded-lg` }, [
    el('div', { className: `text-2xl font-bold text-${color}-600 dark:text-${color}-400`, text: '-', attrs: { id: `${id}-value` } }),
    el('div', { className: `text-xs text-${color}-600 dark:text-${color}-400`, text: label, attrs: { id: `${id}-label` } }),
  ]);
}

export function renderMeterValues(r: AnalysisResult): HTMLElement {
  const meterValues = r.messageGroups.MeterValues;
  const txInfo = buildTxInfo(r.transactions, meterValues);

  // Transaction selector + View button.
  const selector = el('select', { className: 'block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm', attrs: { id: 'transaction-selector' },
    html: `<option value="">Select a Transaction</option><option value="all">All Transactions</option><option value="zuc">ZUC Sessions (Energy &lt; 1 kWh)</option>` + txInfo.map((i) => `<option value="${i.id}">${i.text}</option>`).join('') });
  const graphsContainer = el('div', { className: 'grid grid-cols-1 lg:grid-cols-2 gap-4', attrs: { id: 'transaction-graphs-container' } });
  const viewBtn = el('button', { className: 'bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed', text: 'View Meter Values', attrs: { id: 'view-meter-values-btn', disabled: '' } });

  const cards = el('div', { className: 'grid grid-cols-2 md:grid-cols-4 gap-4' }, [
    summaryCard('summary-card-1', 'Transaction ID', 'blue'),
    summaryCard('summary-card-2', 'Meter Readings', 'green'),
    summaryCard('summary-card-3', 'Energy (Wh)', 'purple'),
    summaryCard('summary-card-4', 'Duration (min)', 'orange'),
  ]);
  const banner = el('div', { className: 'mt-3 text-sm', attrs: { id: 'internal-tx-id-banner' } });
  const statsContainer = el('div', { className: 'mt-4', attrs: { id: 'detailed-stats-container' } });

  const setCard = (n: number, label: string, value: string): void => {
    cards.querySelector(`#summary-card-${n}-label`)!.textContent = label;
    cards.querySelector(`#summary-card-${n}-value`)!.textContent = value;
  };

  // Populate the 4 summary cards + internal-tx banner + detailed stats (no charts — those are 3c).
  const updateSummary = (sel: string): void => {
    if (sel === 'all') {
      const allIds = txInfo.map((i) => i.id);
      const completed = r.transactions.filter((t) => typeof t.duration === 'number' && typeof t.totalEnergy === 'number');
      const totalEnergyKwh = completed.reduce((s, t) => s + (t.totalEnergy as number), 0);
      const totalDur = completed.reduce((s, t) => s + (t.duration as number), 0);
      const zuc = identifyZUCSessions(allIds, meterValues);
      setCard(1, 'Total Transactions', String(allIds.length));
      setCard(2, 'Total Energy (kWh)', totalEnergyKwh.toFixed(2));
      setCard(3, 'Avg Duration/Tx (min)', completed.length > 0 ? (totalDur / completed.length).toFixed(2) : 'N/A');
      setCard(4, 'ZUC Sessions', `${zuc.length} (${allIds.length > 0 ? ((zuc.length / allIds.length) * 100).toFixed(1) : '0.0'}%)`);
      banner.innerHTML = '';
      statsContainer.innerHTML = '<p class="text-sm text-gray-500 dark:text-gray-400 italic mt-2">Detailed Statistics are available for individual transactions only. Please select a specific transaction.</p>';
      return;
    }
    if (sel === 'zuc') {
      const zuc = identifyZUCSessions(txInfo.map((i) => i.id), meterValues);
      let totalEnergy = 0;
      let totalDuration = 0;
      let withMetrics = 0;
      for (const id of zuc) {
        const m = getTransactionMetrics(id, meterValues);
        if (m.energy !== null) totalEnergy += m.energy;
        if (m.durationMin !== null) { totalDuration += m.durationMin; withMetrics++; }
      }
      setCard(1, 'ZUC Sessions', String(zuc.length));
      setCard(2, 'Total Energy (Wh)', totalEnergy.toFixed(2));
      setCard(3, 'Avg Duration (min)', withMetrics > 0 ? (totalDuration / withMetrics).toFixed(2) : 'N/A');
      setCard(4, 'Avg Energy (Wh)', zuc.length > 0 ? (totalEnergy / zuc.length).toFixed(2) : 'N/A');
      banner.innerHTML = '';
      statsContainer.innerHTML = '';
      return;
    }
    setCard(1, 'Transaction ID', sel);
    const forTx = meterValues.filter((mv) => String(mvPayload(mv).transactionId) === sel);
    const readings = forTx.reduce((acc, mv) => acc + (mvPayload(mv).meterValue?.length ?? 0), 0);
    setCard(2, 'Meter Readings', String(readings));
    const m = getTransactionMetrics(sel, meterValues);
    setCard(3, 'Energy (Wh)', m.energy !== null ? m.energy.toFixed(2) : 'N/A');
    setCard(4, 'Duration (min)', m.durationMin !== null ? m.durationMin.toFixed(2) : 'N/A');
    const itx = r.internalTxMap.get(String(sel));
    banner.innerHTML = itx
      ? `<span class="text-gray-500 dark:text-gray-400">Internal TX ID: </span><span class="font-mono text-indigo-700 dark:text-indigo-300 font-semibold">${itx}</span>`
      : `<span class="text-gray-400 dark:text-gray-500 italic">Internal TX ID: — (not found in log)</span>`;
    const stats = calculateTransactionStats(sel, pivotedRows);
    statsContainer.innerHTML = stats ? statsTableHtml(stats) : '';
  };

  // Filters.
  const dateFilter = el('select', { className: SELECT, attrs: { id: 'filter-date' }, html: '<option>All Dates</option>' });
  const txIdFilter = el('select', { className: SELECT, attrs: { id: 'filter-txid' }, html: '<option>All Transactions</option>' });
  const applyBtn = el('button', { className: 'bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg', text: 'Apply Filters' });
  const clearBtn = el('button', { className: 'bg-gray-300 hover:bg-gray-400 text-gray-800 font-semibold py-2 px-4 rounded-lg dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500', text: 'Clear All' });

  const tbody = el('tbody', { className: 'bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700', attrs: { id: 'meter-values-body' } });
  const table = el('table', { className: 'min-w-full divide-y divide-gray-200 dark:divide-gray-700', attrs: { id: 'meter-values-table' } }, [
    el('thead', { className: 'bg-gray-50 dark:bg-gray-700 sticky top-0' }, [el('tr', {}, MV_HEADERS.map((h) => el('th', { className: TH, text: h })))]),
    tbody,
  ]);

  let pivotedRows: MvRow[] = [];
  const renderRows = (rows: MvRow[]): void => {
    if (rows.length === 0) {
      tbody.replaceChildren(el('tr', {}, [el('td', { className: 'px-6 py-4 text-center text-sm text-gray-500 dark:text-gray-400', attrs: { colspan: String(MV_HEADERS.length) }, text: 'No meter values match the current selection.' })]));
      return;
    }
    tbody.replaceChildren(...rows.map((row) =>
      el('tr', {}, MV_HEADERS.map((h) => el('td', { className: 'px-6 py-4 whitespace-nowrap text-sm', text: row[h] || '' })))));
  };

  const applyFilters = (): void => {
    const d = (dateFilter as HTMLSelectElement).value;
    const t = (txIdFilter as HTMLSelectElement).value;
    renderRows(pivotedRows.filter((row) =>
      (d === 'All Dates' || new Date(row['UTC Time Stamp']).toLocaleDateString() === d) &&
      (t === 'All Transactions' || row['Transaction ID'] === t)));
  };

  const view = (): void => {
    const sel = (selector as HTMLSelectElement).value;
    if (!sel) return;
    let filtered: ParsedMessage[];
    if (sel === 'all') filtered = meterValues;
    else if (sel === 'zuc') {
      const zucIds = new Set(identifyZUCSessions(txInfo.map((i) => i.id), meterValues).map(String));
      filtered = meterValues.filter((mv) => zucIds.has(String(mvPayload(mv).transactionId)));
    } else filtered = meterValues.filter((mv) => String(mvPayload(mv).transactionId) === sel);
    pivotedRows = pivotMeterValues(filtered);
    const dates = [...new Set(pivotedRows.map((row) => new Date(row['UTC Time Stamp']).toLocaleDateString()))].sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
    const txIds = [...new Set(pivotedRows.map((row) => row['Transaction ID']))].sort();
    (dateFilter as HTMLElement).innerHTML = '<option>All Dates</option>' + dates.map((x) => `<option>${x}</option>`).join('');
    (txIdFilter as HTMLElement).innerHTML = '<option>All Transactions</option>' + txIds.map((x) => `<option>${x}</option>`).join('');
    renderRows(pivotedRows);
    updateSummary(sel);
    // Analysis graphs render for a specific transaction only (aggregate views show a hint).
    if (sel !== 'all' && sel !== 'zuc') {
      void renderTransactionGraphs(graphsContainer, pivotedRows, sel);
    } else {
      graphsContainer.replaceChildren(el('div', { className: 'col-span-2 text-center text-gray-500 dark:text-gray-400 py-8', text: 'Select a specific transaction to view analysis graphs.' }));
    }
  };

  selector.addEventListener('change', () => { (viewBtn as HTMLButtonElement).disabled = !(selector as HTMLSelectElement).value; });
  viewBtn.addEventListener('click', view);
  applyBtn.addEventListener('click', applyFilters);
  clearBtn.addEventListener('click', () => { (dateFilter as HTMLSelectElement).value = 'All Dates'; (txIdFilter as HTMLSelectElement).value = 'All Transactions'; renderRows(pivotedRows); });

  return el('div', {}, [
    el('div', { className: 'mb-6' }, [
      el('h3', { className: 'text-lg font-semibold text-gray-800 dark:text-gray-200 mb-3', text: 'Transaction Selection' }),
      el('div', { className: 'flex items-center space-x-4' }, [
        el('div', { className: 'flex-1' }, [el('label', { className: 'block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1', text: 'Select Transaction:', attrs: { for: 'transaction-selector' } }), selector]),
        viewBtn,
      ]),
    ]),
    el('div', { className: 'mb-6' }, [el('h3', { className: 'text-lg font-semibold text-gray-800 dark:text-gray-200 mb-3', text: 'Transaction Summary' }), cards, banner, statsContainer]),
    el('div', { className: 'mb-6' }, [el('h3', { className: 'text-lg font-semibold text-gray-800 dark:text-gray-200 mb-3', text: '📈 Transaction Analysis Graphs' }), graphsContainer]),
    el('div', { className: 'mb-4' }, [
      el('div', { className: 'p-4 bg-gray-50 dark:bg-gray-700 rounded-lg mb-4 border border-gray-200 dark:border-gray-600' }, [
        el('h4', { className: 'text-md font-semibold text-gray-800 dark:text-gray-200 mb-3', text: 'Column Filters' }),
        el('div', { className: 'grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4' }, [
          el('div', {}, [el('label', { className: 'block text-sm font-medium text-gray-700 dark:text-gray-300', text: 'Date', attrs: { for: 'filter-date' } }), dateFilter]),
          el('div', {}, [el('label', { className: 'block text-sm font-medium text-gray-700 dark:text-gray-300', text: 'Transaction ID', attrs: { for: 'filter-txid' } }), txIdFilter]),
        ]),
        el('div', { className: 'mt-4 flex items-center gap-4' }, [applyBtn, clearBtn]),
      ]),
      el('div', { className: 'overflow-auto max-h-[500px]' }, [table]),
    ]),
  ]);
}
