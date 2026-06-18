// Fault Status Summary section — faithful port of HTML 4916-5041. Filters Faulted
// StatusNotifications, groups by connector‖info‖vendorErrorCode, and renders a
// summary + grouped table. `computeFaultSummary` is pure. Always shown. Export → 3d.

import { el } from '../dom';
import type { ParsedMessage } from '../../model/types';
import type { AnalysisResult } from '../../analyze';

export interface FaultRow { connId: number | string; faultInfo: string; vendorCode: string; count: number; }
export interface FaultSummary { rows: FaultRow[]; totalFaultEvents: number; connectorsAffected: number; uniqueFaultTypes: number; }

interface StatusPayload { connectorId?: number; status?: string; info?: string; vendorErrorCode?: string; }

export function computeFaultSummary(statusNotifications: ParsedMessage[]): FaultSummary {
  const faulted = statusNotifications.filter((m) => (m.message[3] as StatusPayload | undefined)?.status === 'Faulted');

  const groupMap = new Map<string, number>();
  for (const m of faulted) {
    const p = m.message[3] as StatusPayload;
    const connId = p.connectorId !== undefined ? p.connectorId : 'N/A';
    const key = `${connId}||${p.info || 'N/A'}||${p.vendorErrorCode || 'N/A'}`;
    groupMap.set(key, (groupMap.get(key) ?? 0) + 1);
  }

  const rows: FaultRow[] = [...groupMap.entries()]
    .map(([key, count]) => {
      const [connId, faultInfo, vendorCode] = key.split('||');
      return { connId: isNaN(Number(connId)) ? connId : parseInt(connId, 10), faultInfo, vendorCode, count };
    })
    .sort((a, b) => (a.connId !== b.connId ? (a.connId > b.connId ? 1 : -1) : b.count - a.count));

  return {
    rows,
    totalFaultEvents: faulted.length,
    connectorsAffected: new Set(faulted.map((m) => (m.message[3] as StatusPayload).connectorId)).size,
    uniqueFaultTypes: new Set(faulted.map((m) => (m.message[3] as StatusPayload).info || 'N/A')).size,
  };
}

const TH = 'px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider';
const TD = 'px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100';

function card(label: string, value: number, color: string): HTMLElement {
  return el('div', { className: `bg-${color}-50 dark:bg-${color}-900/30 p-3 rounded-lg border border-${color}-200 dark:border-${color}-800` }, [
    el('div', { className: `text-xs font-medium text-${color}-600 dark:text-${color}-400 uppercase`, text: label }),
    el('div', { className: `text-2xl font-bold text-${color}-800 dark:text-${color}-200`, text: String(value) }),
  ]);
}

export function renderFaultStatusSummary(r: AnalysisResult): HTMLElement {
  const s = computeFaultSummary(r.messageGroups.StatusNotification);

  const cards = el('div', { className: 'mb-4 grid grid-cols-3 gap-3' }, [
    card('Total Fault Events', s.totalFaultEvents, 'red'),
    card('Connectors Affected', s.connectorsAffected, 'orange'),
    card('Unique Fault Types', s.uniqueFaultTypes, 'yellow'),
  ]);

  let content: HTMLElement;
  if (s.rows.length === 0) {
    content = el('div', { className: 'overflow-auto max-h-[500px]' }, [el('p', { className: 'text-sm text-gray-500 dark:text-gray-400 py-4 text-center', text: '✅ No faults recorded in this log.' })]);
  } else {
    const bodyRows = s.rows.map((row) =>
      el('tr', { className: 'hover:bg-gray-50 dark:hover:bg-gray-700/50' }, [
        el('td', { className: 'px-4 py-3 whitespace-nowrap text-sm font-semibold text-gray-900 dark:text-gray-100', text: String(row.connId) }),
        el('td', { className: TD, text: row.faultInfo }),
        el('td', { className: TD, text: row.vendorCode }),
        el('td', { className: 'px-4 py-3 whitespace-nowrap text-sm' }, [el('span', { className: 'inline-flex items-center px-2 py-1 rounded text-xs font-bold bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300', text: String(row.count) })]),
      ]));
    const table = el('table', { className: 'min-w-full divide-y divide-gray-200 dark:divide-gray-700', attrs: { id: 'fault-status-summary-table' } }, [
      el('thead', { className: 'bg-gray-50 dark:bg-gray-700 sticky top-0' }, [el('tr', {}, ['Connector ID', 'Fault Info', 'Vendor Error Code', 'Count'].map((h) => el('th', { className: TH, text: h })))]),
      el('tbody', { className: 'bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700' }, bodyRows),
    ]);
    content = el('div', { className: 'overflow-auto max-h-[500px]' }, [table]);
  }

  return el('div', {}, [cards, content]);
}
