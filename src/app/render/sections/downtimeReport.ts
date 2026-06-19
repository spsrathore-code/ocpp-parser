// Downtime Report section — faithful port of HTML 3046-3381. Summary cards, per-
// fault-type summary cards, a reason filter, and the main table. The per-row
// Preview/Download "context" buttons are deferred to the context-viewer sub-phase
// (so their two columns are omitted here). Export → 3d.

import { el } from '../dom';
import { convertToIST } from '../format';
import { downtimeContextButtons } from '../contextViewer';
import type { AnalysisResult } from '../../analyze';
import type { Downtime } from '../../detect/types';

const DISPLAY_NAMES: Record<string, string> = {
  'Connection Lost': 'Websocket Disconnected',
  'Power Failure': 'PowerLoss',
  'Input Under Voltage': 'UnderVoltage',
  'Emergency Stop': 'EmergencyStop',
};
const getDisplayName = (reason: string): string => DISPLAY_NAMES[reason] || reason;

function parseDurationToMs(duration: string | undefined): number | null {
  if (!duration || duration === 'Ongoing' || duration === 'N/A') return null;
  const parts = duration.split(':');
  if (parts.length !== 3) return null;
  return (parseInt(parts[0], 10) * 3600 + parseInt(parts[1], 10) * 60 + parseInt(parts[2], 10)) * 1000;
}
function formatDuration(ms: number | null): string {
  if (ms === null) return 'N/A';
  const s = Math.floor(ms / 1000);
  return `${String(Math.floor(s / 3600)).padStart(2, '0')}:${String(Math.floor((s % 3600) / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}
function formatDateDMY(utc: string): string {
  try {
    const d = new Date(new Date(utc).getTime() + 5.5 * 60 * 60 * 1000);
    return `${String(d.getUTCDate()).padStart(2, '0')}/${String(d.getUTCMonth() + 1).padStart(2, '0')}/${d.getUTCFullYear()} ${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}:${String(d.getUTCSeconds()).padStart(2, '0')} IST`;
  } catch { return 'N/A'; }
}

const HEADERS = ['S.No.', 'Downtime Reason', 'Issue Occurred (IST)', 'Resolved Time (IST)', 'Issue Duration (HH:MM:SS)', 'Error Code (OCPP)', 'CPO Error Code', 'Vendor Error Code', 'Info', 'Preview', 'Download'];
const TH = 'px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider sticky top-0 bg-gray-50 dark:bg-gray-700 z-10';
const TD = 'px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100';

function summaryCard(label: string, value: string, color: string): string {
  return `<div class="bg-${color}-50 dark:bg-${color}-900/30 p-3 rounded-lg border border-${color}-200 dark:border-${color}-800">
    <div class="text-xs font-medium text-${color}-600 dark:text-${color}-400 uppercase">${label}</div>
    <div class="text-lg font-bold text-${color}-800 dark:text-${color}-200">${value}</div></div>`;
}

export function renderDowntimeReport(r: AnalysisResult): HTMLElement {
  const downtimes = r.downtimes;
  const valid = downtimes.map((d) => parseDurationToMs(d.duration)).filter((d): d is number => d !== null);
  const totalMs = valid.reduce((s, d) => s + d, 0);
  const sortedByStart = [...downtimes].sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

  const summary = el('div', { className: 'mt-4 mb-4 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3', html:
    summaryCard('Total Events', String(downtimes.length), 'blue') +
    summaryCard('Total Duration', formatDuration(totalMs), 'red') +
    summaryCard('Avg Duration', formatDuration(valid.length ? totalMs / valid.length : null), 'orange') +
    summaryCard('Longest', formatDuration(valid.length ? Math.max(...valid) : null), 'purple') +
    summaryCard('Shortest', formatDuration(valid.length ? Math.min(...valid) : null), 'green') +
    summaryCard('First Downtime', sortedByStart.length ? formatDateDMY(sortedByStart[0].startTime) : 'N/A', 'cyan') +
    summaryCard('Last Downtime', sortedByStart.length ? formatDateDMY(sortedByStart[sortedByStart.length - 1].startTime) : 'N/A', 'pink') });

  // Per-fault-type summary cards.
  const faultTypes = [...new Set(downtimes.map((d) => d.reason))];
  const faultColor = (t: string): string => t === 'Connection Lost' ? 'indigo' : t === 'Power Failure' ? 'amber' : t === 'Emergency Stop' ? 'rose' : t.includes('Voltage') ? 'yellow' : 'gray';
  let individualHtml = '';
  if (faultTypes.length > 0) {
    individualHtml = '<div class="mt-4 mb-2"><h3 class="text-md font-semibold text-gray-700 dark:text-gray-300 mb-3">📊 Individual Fault Summary</h3></div><div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">';
    for (const ft of faultTypes) {
      const fd = downtimes.filter((d) => d.reason === ft);
      const fv = fd.map((d) => parseDurationToMs(d.duration)).filter((d): d is number => d !== null);
      const fTotal = fv.reduce((s, d) => s + d, 0);
      const fSorted = [...fd].sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
      const c = faultColor(ft);
      individualHtml += `<div class="bg-${c}-50 dark:bg-${c}-900/20 p-4 rounded-lg border border-${c}-200 dark:border-${c}-800">
        <div class="flex justify-between items-center mb-3"><h4 class="text-sm font-bold text-${c}-800 dark:text-${c}-200">${getDisplayName(ft)}</h4>
        <span class="bg-${c}-200 dark:bg-${c}-700 text-${c}-800 dark:text-${c}-100 text-xs font-semibold px-2 py-1 rounded">${fd.length} event${fd.length > 1 ? 's' : ''}</span></div>
        <div class="grid grid-cols-3 gap-2 text-xs">
          <div><div class="text-${c}-600 dark:text-${c}-400 uppercase font-medium">Total</div><div class="font-bold text-${c}-800 dark:text-${c}-200">${formatDuration(fTotal)}</div></div>
          <div><div class="text-${c}-600 dark:text-${c}-400 uppercase font-medium">Avg</div><div class="font-bold text-${c}-800 dark:text-${c}-200">${formatDuration(fv.length ? fTotal / fv.length : null)}</div></div>
          <div><div class="text-${c}-600 dark:text-${c}-400 uppercase font-medium">Longest</div><div class="font-bold text-${c}-800 dark:text-${c}-200">${formatDuration(fv.length ? Math.max(...fv) : null)}</div></div>
          <div><div class="text-${c}-600 dark:text-${c}-400 uppercase font-medium">Shortest</div><div class="font-bold text-${c}-800 dark:text-${c}-200">${formatDuration(fv.length ? Math.min(...fv) : null)}</div></div>
          <div class="col-span-2"><div class="text-${c}-600 dark:text-${c}-400 uppercase font-medium">First / Last</div><div class="font-bold text-${c}-800 dark:text-${c}-200 text-[10px]">${(fSorted.length ? formatDateDMY(fSorted[0].startTime) : 'N/A').split(' ')[0]} / ${(fSorted.length ? formatDateDMY(fSorted[fSorted.length - 1].startTime) : 'N/A').split(' ')[0]}</div></div>
        </div></div>`;
    }
    individualHtml += '</div>';
  }
  const individual = el('div', { html: individualHtml });

  // Reason filter.
  const filterSelect = el('select', { className: 'px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500', attrs: { id: 'downtime-reason-filter' },
    html: '<option value="all">All Reasons</option>' + [...new Set(downtimes.map((d) => d.reason))].map((reason) => `<option value="${reason}">${getDisplayName(reason)}</option>`).join('') });
  const filterDiv = el('div', { className: 'mt-4 mb-3 flex items-center gap-4' }, [
    el('label', { className: 'text-sm font-medium text-gray-700 dark:text-gray-300', text: 'Filter by Reason:' }), filterSelect,
  ]);

  const row = (d: Downtime, index: number): HTMLElement => {
    const btns = downtimeContextButtons(d.startLineNumber, d.endLineNumber, index, d.duration || 'N/A');
    return el('tr', { attrs: { 'data-reason': d.reason }, html: `
      <td class="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900 dark:text-gray-100">${index + 1}</td>
      <td class="${TD}">${getDisplayName(d.reason)}</td>
      <td class="${TD}">${convertToIST(d.startTime)}</td>
      <td class="${TD}">${d.endTime ? convertToIST(d.endTime) : 'Ongoing'}</td>
      <td class="${TD}">${d.duration || 'N/A'}</td>
      <td class="${TD}">${d.ocppErrorCode || 'N/A'}</td>
      <td class="${TD}">${d.cpoErrorCode || 'N/A'}</td>
      <td class="${TD}">${d.vendorErrorCode || 'N/A'}</td>
      <td class="px-6 py-4 text-sm text-gray-900 dark:text-gray-100 break-words max-w-md" title="${d.info || 'N/A'}">${d.info || 'N/A'}</td>
      <td class="px-6 py-4 whitespace-nowrap text-sm">${btns.preview}</td>
      <td class="px-6 py-4 whitespace-nowrap text-sm">${btns.download}</td>` });
  };

  const tbody = el('tbody', { className: 'bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700' }, downtimes.map(row));
  filterSelect.addEventListener('change', () => {
    const sel = (filterSelect as HTMLSelectElement).value;
    let visible = 0;
    tbody.querySelectorAll('tr').forEach((tr) => {
      const show = sel === 'all' || (tr as HTMLElement).dataset.reason === sel;
      (tr as HTMLElement).style.display = show ? '' : 'none';
      if (show) { visible++; const sno = tr.querySelector('td:first-child'); if (sno) sno.textContent = String(visible); }
    });
  });

  const table = el('table', { className: 'min-w-full divide-y divide-gray-200 dark:divide-gray-700', attrs: { id: 'downtime-report-table' } }, [
    el('thead', { className: 'bg-gray-50 dark:bg-gray-700' }, [el('tr', {}, HEADERS.map((h) => el('th', { className: TH, text: h })))]),
    tbody,
  ]);

  return el('div', {}, [summary, individual, filterDiv, el('div', { className: 'overflow-auto max-h-[500px]' }, [table])]);
}
