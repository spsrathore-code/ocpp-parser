// Status Notifications section — faithful port of HTML 4144-4913 (layers 1-3 + the
// error-code rollup + filterable main table). `computeStatusAnalytics` is pure for
// testability; `renderStatusNotifications` draws the summary panel and the table.
//
// Deferred to Phase 3b-3b (the Repeated-RemoteStart auth-contention diagnostic):
// the "⚠ Repeat RemoteStart" summary card, the per-row "N× RS" pill + amber row
// highlight, and the threshold-driven problem-session panel.

import { el } from '../dom';
import type { ParsedMessage } from '../../model/types';
import type { AnalysisResult } from '../../analyze';

const DASH = '—';
const STATUS_ORDER = ['Available', 'Preparing', 'Charging', 'SuspendedEV', 'SuspendedEVSE', 'Finishing', 'Faulted', 'Unavailable', 'Reserved'];

export interface StatusRow {
  sno: number; fileName: string; logTs: string; payloadTs: string; connectorId: string;
  status: string; errorCode: string; vendorId: string; vendorErrorCode: string; info: string; sessionFlow: string;
}
export interface PerConnFlow { cid: string; cf: number; cs: number; ca: number; cflt: number; total: number; }
export interface ErrRow { errorCode: string; info: string; statuses: string; vendorErrorCode: string; vendorId: string; count: number; connectors: string[]; }
export interface StatusAnalytics {
  rows: StatusRow[];
  summary: { totalEvents: number; uniqueStatuses: number; faultedCount: number; errorCount: number; connectorCount: number };
  sortedStatuses: [string, number][];
  maxStatusCount: number;
  flow: { full: number; skipped: number; abandoned: number; faulted: number; perConn: PerConnFlow[] };
  errRows: ErrRow[];
}

interface StatusPayload {
  timestamp?: string; connectorId?: number; status?: string; errorCode?: string;
  vendorId?: string; vendorErrorCode?: string; info?: string;
}

export function computeStatusAnalytics(messages: ParsedMessage[]): StatusAnalytics {
  const rows: StatusRow[] = messages.map((msg, i) => {
    const p = (msg.message[3] ?? {}) as StatusPayload;
    return {
      sno: i + 1,
      fileName: msg.fileName || '',
      logTs: msg.timestamp || DASH,
      payloadTs: p.timestamp || DASH,
      connectorId: p.connectorId !== undefined ? String(p.connectorId) : DASH,
      status: p.status || DASH,
      errorCode: p.errorCode || DASH,
      vendorId: p.vendorId || DASH,
      vendorErrorCode: p.vendorErrorCode || DASH,
      info: p.info || DASH,
      sessionFlow: '',
    };
  });

  const summary = {
    totalEvents: messages.length,
    uniqueStatuses: new Set(rows.map((r) => r.status)).size,
    faultedCount: rows.filter((r) => r.status === 'Faulted').length,
    errorCount: rows.filter((r) => r.errorCode !== 'NoError' && r.errorCode !== DASH).length,
    connectorCount: new Set(rows.map((r) => r.connectorId)).size,
  };

  // Status distribution, ordered by the canonical status order then by count desc.
  const statusDist = new Map<string, number>();
  rows.forEach((r) => statusDist.set(r.status, (statusDist.get(r.status) ?? 0) + 1));
  const sortedStatuses: [string, number][] = [...statusDist.entries()].sort((a, b) => {
    const ai = STATUS_ORDER.indexOf(a[0]);
    const bi = STATUS_ORDER.indexOf(b[0]);
    if (ai !== -1 && bi !== -1) return ai - bi;
    if (ai !== -1) return -1;
    if (bi !== -1) return 1;
    return b[1] - a[1];
  });
  const maxStatusCount = statusDist.size > 0 ? Math.max(...statusDist.values()) : 0;

  // Session-flow analysis: what follows each "Preparing" per connector.
  const byConnector = new Map<string, { status: string; ts: string; origIdx: number }[]>();
  messages.forEach((msg, origIdx) => {
    const cid = String((msg.message[3] as StatusPayload)?.connectorId ?? 'N/A');
    if (!byConnector.has(cid)) byConnector.set(cid, []);
    byConnector.get(cid)!.push({ status: (msg.message[3] as StatusPayload)?.status ?? DASH, ts: msg.timestamp, origIdx });
  });
  let full = 0, skipped = 0, abandoned = 0, faulted = 0;
  const perConn: PerConnFlow[] = [];
  byConnector.forEach((evts, cid) => {
    evts.sort((a, b) => new Date(a.ts).getTime() - new Date(b.ts).getTime());
    let cf = 0, cs = 0, ca = 0, cflt = 0;
    for (let i = 0; i < evts.length; i++) {
      if (evts[i].status !== 'Preparing') continue;
      let next: string | null = null;
      let nextIdx = -1;
      for (let j = i + 1; j < evts.length; j++) {
        if (evts[j].status !== 'Preparing') { next = evts[j].status; nextIdx = evts[j].origIdx; break; }
      }
      let label = '';
      if (next === 'Charging') { cf++; label = 'Charging'; }
      else if (next === 'Finishing') { cs++; label = 'Finishing'; }
      else if (next === 'Available' || next === null) { ca++; label = 'Available'; }
      else if (next === 'Faulted') { cflt++; label = 'Faulted'; }
      else { ca++; label = 'Available'; }
      if (label) {
        rows[evts[i].origIdx].sessionFlow = label;
        if (nextIdx !== -1) rows[nextIdx].sessionFlow = label;
      }
    }
    full += cf; skipped += cs; abandoned += ca; faulted += cflt;
    const total = cf + cs + ca + cflt;
    if (total > 0 || evts.length > 0) perConn.push({ cid, cf, cs, ca, cflt, total });
  });
  perConn.sort((a, b) => String(a.cid).localeCompare(String(b.cid), undefined, { numeric: true }));

  // Error-code frequency (non-NoError), keyed by errorCode||info||vendorErrorCode||vendorId.
  // `info` is included in the key because it distinguishes otherwise-identical error
  // codes (e.g. the vendor's BMSCommunicationTimeout); statuses seen are collected.
  const errMap = new Map<string, { errorCode: string; info: string; statuses: Set<string>; vendorErrorCode: string; vendorId: string; connectors: Set<string>; count: number }>();
  rows.filter((r) => r.errorCode !== 'NoError' && r.errorCode !== DASH).forEach((r) => {
    const key = `${r.errorCode}||${r.info}||${r.vendorErrorCode}||${r.vendorId}`;
    if (!errMap.has(key)) errMap.set(key, { errorCode: r.errorCode, info: r.info, statuses: new Set(), vendorErrorCode: r.vendorErrorCode, vendorId: r.vendorId, connectors: new Set(), count: 0 });
    const e = errMap.get(key)!;
    e.count++;
    e.connectors.add(r.connectorId);
    if (r.status && r.status !== DASH) e.statuses.add(r.status);
  });
  const errRows: ErrRow[] = [...errMap.values()]
    .sort((a, b) => b.count - a.count)
    .map((e) => ({ errorCode: e.errorCode, info: e.info, statuses: [...e.statuses].join(', ') || DASH, vendorErrorCode: e.vendorErrorCode, vendorId: e.vendorId, count: e.count, connectors: [...e.connectors].sort((a, b) => String(a).localeCompare(String(b), undefined, { numeric: true })) }));

  return { rows, summary, sortedStatuses, maxStatusCount, flow: { full, skipped, abandoned, faulted, perConn }, errRows };
}

// ── Render helpers ──

const statusColor = (s: string): string => {
  if (s === 'Faulted') return 'text-red-600 dark:text-red-400 font-semibold';
  if (s === 'Charging') return 'text-green-600 dark:text-green-400 font-semibold';
  if (s === 'Preparing') return 'text-blue-600 dark:text-blue-400';
  if (s === 'Finishing') return 'text-orange-600 dark:text-orange-400';
  if (s === 'Unavailable') return 'text-gray-500 dark:text-gray-400';
  return '';
};
const statusBarColor = (s: string): string => {
  if (s === 'Available') return 'bg-teal-400';
  if (s === 'Preparing') return 'bg-blue-400';
  if (s === 'Charging') return 'bg-green-500';
  if (s === 'Finishing') return 'bg-orange-400';
  if (s === 'Faulted') return 'bg-red-500';
  if (s === 'Unavailable') return 'bg-gray-400';
  return 'bg-purple-400';
};

function summaryCard(value: number, label: string, color: string): HTMLElement {
  return el('div', { className: `bg-${color}-50 dark:bg-${color}-900/20 p-3 rounded-lg border border-${color}-200 dark:border-${color}-800 text-center` }, [
    el('div', { className: `text-2xl font-bold text-${color}-700 dark:text-${color}-300`, text: String(value) }),
    el('div', { className: `text-xs text-${color}-600 dark:text-${color}-400 mt-1 uppercase font-medium`, text: label }),
  ]);
}

function distributionPanel(a: StatusAnalytics): HTMLElement {
  const body = a.sortedStatuses.map(([st, cnt]) => {
    const pct = ((cnt / a.summary.totalEvents) * 100).toFixed(1);
    const barW = Math.round((cnt / a.maxStatusCount) * 100);
    return el('tr', {}, [
      el('td', { className: `py-1 pr-2 font-medium text-gray-800 dark:text-gray-200 ${statusColor(st)} whitespace-nowrap`, text: st }),
      el('td', { className: 'py-1 text-right pr-3 font-mono text-gray-700 dark:text-gray-300', text: String(cnt) }),
      el('td', { className: 'py-1 text-right pr-3 text-gray-500 dark:text-gray-400', text: `${pct}%` }),
      el('td', { className: 'py-1 w-full' }, [el('div', { className: `h-3 rounded ${statusBarColor(st)} opacity-80`, attrs: { style: `width:${barW}%;min-width:4px` } })]),
    ]);
  });
  return el('div', { className: 'bg-gray-50 dark:bg-gray-700/40 rounded-lg border border-gray-200 dark:border-gray-600 p-3' }, [
    el('h4', { className: 'text-sm font-semibold text-gray-700 dark:text-gray-200 mb-3', text: '📊 Status Distribution' }),
    el('table', { className: 'w-full text-sm' }, [
      el('thead', { html: `<tr>
        <th class="text-left text-xs font-medium text-gray-500 dark:text-gray-400 pb-2 uppercase">Status</th>
        <th class="text-right text-xs font-medium text-gray-500 dark:text-gray-400 pb-2 uppercase pr-3">Count</th>
        <th class="text-right text-xs font-medium text-gray-500 dark:text-gray-400 pb-2 uppercase pr-3">%</th>
        <th class="text-left text-xs font-medium text-gray-500 dark:text-gray-400 pb-2 uppercase">Bar</th>
      </tr>` }),
      el('tbody', {}, body),
    ]),
  ]);
}

function flowPanel(a: StatusAnalytics): HTMLElement {
  const totalFlow = a.flow.full + a.flow.skipped + a.flow.abandoned + a.flow.faulted;
  const pct = (n: number): string => (totalFlow > 0 ? ((n / totalFlow) * 100).toFixed(1) : '0.0');
  const flowCard = (n: number, p: string, color: string, label: string, sub: string) =>
    el('div', { className: `bg-${color}-50 dark:bg-${color}-900/20 rounded p-2 border border-${color}-200 dark:border-${color}-800` }, [
      el('div', { className: `text-lg font-bold text-${color}-700 dark:text-${color}-300`, html: `${n} <span class="text-xs font-normal">(${p}%)</span>` }),
      el('div', { className: `text-xs text-${color}-600 dark:text-${color}-400 font-medium`, text: label }),
      el('div', { className: 'text-xs text-gray-400 dark:text-gray-500', text: sub }),
    ]);

  const children: HTMLElement[] = [
    el('h4', { className: 'text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1', text: '⚡ Session Flow Analysis' }),
    el('p', { className: 'text-xs text-gray-500 dark:text-gray-400 mb-3', html: 'What happened after each <span class="font-semibold text-blue-600 dark:text-blue-400">Preparing</span> event? A successful session goes Preparing → Charging → Finishing/Available.' }),
    el('div', { className: 'grid grid-cols-2 gap-2 mb-3' }, [
      flowCard(a.flow.full, pct(a.flow.full), 'green', '✅ Preparing → Charging', 'Session started normally'),
      flowCard(a.flow.skipped, pct(a.flow.skipped), 'orange', '⚠ Preparing → Finishing', 'Stopped before charging'),
      flowCard(a.flow.abandoned, pct(a.flow.abandoned), 'yellow', '⚠ Preparing → Available', 'Abandoned / no auth'),
      flowCard(a.flow.faulted, pct(a.flow.faulted), 'red', '✗ Preparing → Faulted', 'Fault before charging'),
    ]),
  ];

  if (a.flow.perConn.length > 0) {
    const connRows = a.flow.perConn.map((r) =>
      el('tr', { className: 'border-t border-gray-200 dark:border-gray-600' }, [
        el('td', { className: 'py-0.5 pr-2 font-semibold text-gray-700 dark:text-gray-300', text: `C${r.cid}` }),
        el('td', { className: 'text-center py-0.5 px-1 text-green-700 dark:text-green-300 font-mono', text: r.cf ? String(r.cf) : DASH }),
        el('td', { className: 'text-center py-0.5 px-1 text-orange-600 dark:text-orange-400 font-mono', text: r.cs ? String(r.cs) : DASH }),
        el('td', { className: 'text-center py-0.5 px-1 text-yellow-700 dark:text-yellow-300 font-mono', text: r.ca ? String(r.ca) : DASH }),
        el('td', { className: 'text-center py-0.5 px-1 text-red-600 dark:text-red-400 font-mono', text: r.cflt ? String(r.cflt) : DASH }),
      ]));
    children.push(el('table', { className: 'w-full text-xs mt-1' }, [
      el('thead', { html: `<tr class="text-gray-500 dark:text-gray-400 uppercase">
        <th class="text-left pb-1 pr-2">Connector</th>
        <th class="text-center pb-1 px-1 text-green-600 dark:text-green-400">→ Charging</th>
        <th class="text-center pb-1 px-1 text-orange-500 dark:text-orange-400">→ Finishing</th>
        <th class="text-center pb-1 px-1 text-yellow-600 dark:text-yellow-400">→ Available</th>
        <th class="text-center pb-1 px-1 text-red-500 dark:text-red-400">→ Faulted</th>
      </tr>` }),
      el('tbody', {}, connRows),
    ]));
  }

  return el('div', { className: 'bg-gray-50 dark:bg-gray-700/40 rounded-lg border border-gray-200 dark:border-gray-600 p-3' }, children);
}

function errorPanel(a: StatusAnalytics): HTMLElement | null {
  if (a.errRows.length === 0) return null;
  const body = a.errRows.map((e) =>
    el('tr', { className: 'border-t border-gray-200 dark:border-gray-600' }, [
      el('td', { className: 'py-1.5 pr-4 font-semibold text-red-700 dark:text-red-300', text: e.errorCode }),
      el('td', { className: 'py-1.5 pr-4 text-gray-700 dark:text-gray-200', text: e.info }),
      el('td', { className: 'py-1.5 pr-4 text-gray-600 dark:text-gray-300', text: e.statuses }),
      el('td', { className: 'py-1.5 pr-4 text-gray-700 dark:text-gray-300', text: e.vendorErrorCode }),
      el('td', { className: 'py-1.5 pr-4 text-gray-600 dark:text-gray-400', text: e.vendorId }),
      el('td', { className: 'py-1.5 pr-4 text-center font-mono font-semibold text-gray-800 dark:text-gray-200', text: String(e.count) }),
      el('td', { className: 'py-1.5 text-gray-500 dark:text-gray-400 text-xs', text: e.connectors.join(', ') }),
    ]));
  return el('div', { className: 'bg-gray-50 dark:bg-gray-700/40 rounded-lg border border-gray-200 dark:border-gray-600 p-3 mb-4' }, [
    el('h4', { className: 'text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2', html: '🔴 Error Code Frequency <span class="text-xs font-normal text-gray-400">(non-NoError only)</span>' }),
    el('table', { className: 'w-full text-sm' }, [
      el('thead', { className: 'text-xs text-gray-500 dark:text-gray-400 uppercase', html: `<tr>
        <th class="text-left pb-2 pr-4">Error Code</th>
        <th class="text-left pb-2 pr-4">Info</th>
        <th class="text-left pb-2 pr-4">Status</th>
        <th class="text-left pb-2 pr-4">Vendor Error Code</th>
        <th class="text-left pb-2 pr-4">Vendor ID</th>
        <th class="text-center pb-2 pr-4">Count</th>
        <th class="text-left pb-2">Connectors</th>
      </tr>` }),
      el('tbody', {}, body),
    ]),
  ]);
}

const TABLE_COLS = ['S.No.', 'File Name', 'Log Timestamp', 'Payload Timestamp', 'Connector ID', 'Status', 'Error Code', 'Vendor ID', 'Vendor Error Code', 'Info'];
const TH = 'px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider sticky top-0 bg-gray-50 dark:bg-gray-700 z-10 whitespace-nowrap';
const TD = 'px-4 py-2.5 text-sm text-gray-900 dark:text-gray-100 whitespace-nowrap';

export function renderStatusNotifications(r: AnalysisResult): HTMLElement {
  const a = computeStatusAnalytics(r.messageGroups.StatusNotification);
  const content = el('div', { className: 'mt-4' });

  // Summary cards (Repeat-RemoteStart card deferred to 3b-3b).
  const summaryPanel = el('div', { className: 'mb-5' }, [
    el('div', { className: 'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-4' }, [
      summaryCard(a.summary.totalEvents, 'Total Events', 'blue'),
      summaryCard(a.summary.uniqueStatuses, 'Unique Statuses', 'purple'),
      summaryCard(a.summary.faultedCount, 'Faulted Events', 'red'),
      summaryCard(a.summary.errorCount, 'Error Events', 'orange'),
      summaryCard(a.summary.connectorCount, 'Connectors', 'teal'),
    ]),
    el('div', { className: 'grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4' }, [distributionPanel(a), flowPanel(a)]),
  ]);
  const errPanel = errorPanel(a);
  if (errPanel) summaryPanel.appendChild(errPanel);
  content.appendChild(summaryPanel);

  content.appendChild(el('hr', { className: 'border-gray-200 dark:border-gray-600 mb-4' }));

  // Filter bar (Connector / Status / Error Code / Vendor ID / Vendor Error / Info + Session Flow).
  const filterFields: { label: string; key: keyof StatusRow }[] = [
    { label: 'Connector ID', key: 'connectorId' },
    { label: 'Status', key: 'status' },
    { label: 'Error Code', key: 'errorCode' },
    { label: 'Vendor ID', key: 'vendorId' },
    { label: 'Vendor Error Code', key: 'vendorErrorCode' },
    { label: 'Info', key: 'info' },
  ];
  const uniq = (key: keyof StatusRow): string[] =>
    [...new Set(a.rows.map((row) => String(row[key])))].filter((v) => v && v !== DASH).sort((x, y) => x.localeCompare(y, undefined, { numeric: true }));
  const selects: Partial<Record<keyof StatusRow, HTMLSelectElement>> = {};
  const filterBar = el('div', { className: 'mb-3 flex flex-wrap gap-3 items-end' });
  for (const { label, key } of filterFields) {
    const sel = el('select', { className: 'text-sm border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-blue-500', html: `<option value="">All</option>` + uniq(key).map((v) => `<option value="${v}">${v}</option>`).join('') });
    selects[key] = sel;
    filterBar.appendChild(el('div', { className: 'flex flex-col' }, [el('label', { className: 'text-xs font-medium text-gray-500 dark:text-gray-400 mb-1', text: label }), sel]));
  }
  const flowSel = el('select', { className: 'text-sm border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-blue-500', html: `
    <option value="">All</option>
    <option value="Charging">✅ Preparing → Charging</option>
    <option value="Finishing">⚠ Preparing → Finishing</option>
    <option value="Available">⚠ Preparing → Available</option>
    <option value="Faulted">✗ Preparing → Faulted</option>` });
  filterBar.appendChild(el('div', { className: 'flex flex-col' }, [el('label', { className: 'text-xs font-medium text-gray-500 dark:text-gray-400 mb-1', text: 'Session Flow' }), flowSel]));
  const clearBtn = el('button', { className: 'text-xs px-3 py-1 rounded bg-gray-200 hover:bg-gray-300 dark:bg-gray-600 dark:hover:bg-gray-500 text-gray-700 dark:text-gray-200 self-end', text: 'Clear Filters' });
  filterBar.appendChild(clearBtn);
  const countLabel = el('span', { className: 'text-xs text-gray-400 dark:text-gray-500 self-end ml-auto', text: `${a.rows.length} of ${a.rows.length} shown` });
  filterBar.appendChild(countLabel);
  content.appendChild(filterBar);

  // Main table.
  const tbody = el('tbody', { className: 'bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700' });
  const buildTbody = (filtered: StatusRow[]): void => {
    tbody.replaceChildren(...filtered.map((row) =>
      el('tr', { className: row.status === 'Faulted' ? 'bg-red-50 dark:bg-red-900/10 hover:bg-red-100 dark:hover:bg-red-900/20' : 'hover:bg-gray-50 dark:hover:bg-gray-700/40' }, [
        el('td', { className: `${TD} font-semibold`, text: String(row.sno) }),
        el('td', { className: `${TD} text-gray-500 dark:text-gray-400 max-w-[140px] truncate`, text: row.fileName || 'N/A', attrs: { title: row.fileName } }),
        el('td', { className: `${TD} font-mono text-xs`, text: row.logTs }),
        el('td', { className: `${TD} font-mono text-xs`, text: row.payloadTs }),
        el('td', { className: TD, text: row.connectorId }),
        el('td', { className: `${TD} ${statusColor(row.status)}`, text: row.status }),
        el('td', { className: TD, text: row.errorCode }),
        el('td', { className: TD, text: row.vendorId }),
        el('td', { className: TD, text: row.vendorErrorCode }),
        el('td', { className: TD, text: row.info }),
      ])));
    countLabel.textContent = `${filtered.length} of ${a.rows.length} shown`;
  };
  buildTbody(a.rows);

  const applyFilters = (): void => {
    const active = filterFields.filter(({ key }) => selects[key]!.value);
    const flowFilter = flowSel.value;
    let filtered = active.length === 0 ? a.rows : a.rows.filter((row) => active.every(({ key }) => String(row[key]) === selects[key]!.value));
    if (flowFilter) filtered = filtered.filter((row) => row.sessionFlow === flowFilter);
    buildTbody(filtered);
  };
  for (const { key } of filterFields) selects[key]!.addEventListener('change', applyFilters);
  flowSel.addEventListener('change', applyFilters);
  clearBtn.addEventListener('click', () => {
    for (const { key } of filterFields) selects[key]!.value = '';
    flowSel.value = '';
    buildTbody(a.rows);
  });

  const table = el('table', { className: 'min-w-full divide-y divide-gray-200 dark:divide-gray-700', attrs: { id: 'status-notifications-table' } }, [
    el('thead', { className: 'bg-gray-50 dark:bg-gray-700' }, [el('tr', {}, TABLE_COLS.map((c) => el('th', { className: TH, text: c })))]),
    tbody,
  ]);
  content.appendChild(el('div', { className: 'overflow-auto max-h-[500px]' }, [table]));

  return content;
}
