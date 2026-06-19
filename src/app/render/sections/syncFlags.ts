// Power-Restore Missing Sync (HTML 3384-3532) and Emergency-Stop Release (HTML
// 3535-3673) sections — faithful ports over `r.powerRestoreSync` /
// `r.emergencyStopSync` (Phase 2a `detectMissingSync`). Both are summary-cards +
// badge-table. The per-row Preview/Download "context" buttons are deferred to the
// context-viewer sub-phase (their two columns omitted here). Export → 3d.

import { el } from '../dom';
import { convertToIST } from '../format';
import type { AnalysisResult } from '../../analyze';
import type { MissingSyncFlag, RecoveryConnectorStatus } from '../../detect/types';

const TH = 'px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider sticky top-0 bg-gray-50 dark:bg-gray-700 z-10';
const TD = 'px-4 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100';
const PRESENT = '<span class="inline-flex items-center px-2 py-1 rounded text-xs font-semibold bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300">✅ Present</span>';
const MISSING = '<span class="inline-flex items-center px-2 py-1 rounded text-xs font-semibold bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300">❌ Missing</span>';

function card(label: string, value: number, color: string): string {
  return `<div class="bg-${color}-50 dark:bg-${color}-900/30 p-3 rounded-lg border border-${color}-200 dark:border-${color}-800">
    <div class="text-xs font-medium text-${color}-600 dark:text-${color}-400 uppercase">${label}</div>
    <div class="text-2xl font-bold text-${color}-800 dark:text-${color}-200">${value}</div></div>`;
}

function statusReceivedCell(recovery: RecoveryConnectorStatus[]): string {
  if (!recovery || recovery.length === 0) return '<span class="inline-flex items-center px-2 py-1 rounded text-xs font-semibold bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400">— Not Received</span>';
  return recovery.map(({ connectorId, status }) =>
    `<span class="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 mr-1 mb-1 whitespace-nowrap"><span class="text-blue-500 dark:text-blue-400">C${connectorId}:</span>${status}</span>`).join('');
}

const table = (id: string, headers: string[], rows: HTMLElement[]): HTMLElement =>
  el('div', { className: 'mt-4 overflow-auto max-h-[500px]' }, [
    el('table', { className: 'min-w-full divide-y divide-gray-200 dark:divide-gray-700', attrs: { id } }, [
      el('thead', { className: 'bg-gray-50 dark:bg-gray-700 sticky top-0' }, [el('tr', {}, headers.map((h) => el('th', { className: TH, text: h })))]),
      el('tbody', { className: 'bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700' }, rows),
    ]),
  ]);

export function renderPowerRestoreSync(r: AnalysisResult): HTMLElement {
  const flags = r.powerRestoreSync;
  const cards = el('div', { className: 'mt-4 mb-4 grid grid-cols-2 md:grid-cols-4 gap-3', html:
    card('Total Flags', flags.length, 'amber') +
    card('Missing BootNotification', flags.filter((f) => f.missingBoot).length, 'red') +
    card('Missing StatusNotification', flags.filter((f) => f.missingStatus).length, 'orange') +
    card('Both Missing', flags.filter((f) => f.missingBoot && f.missingStatus).length, 'rose') });

  const HEADERS = ['S.No.', 'PowerLoss Timestamp (UTC)', 'PowerLoss Start (IST)', 'Power Restored (IST)', 'Duration (HH:MM:SS)', 'Missing BootNotification', 'Missing StatusNotification', 'StatusNotification Status Received', 'OCPP Error Code', 'Vendor Error Code', 'Details'];
  const rows = flags.map((f: MissingSyncFlag, i) =>
    el('tr', { className: 'bg-amber-50 dark:bg-amber-900/10 hover:bg-amber-100 dark:hover:bg-amber-900/30', html: `
      <td class="px-4 py-4 whitespace-nowrap text-sm font-semibold text-gray-900 dark:text-gray-100">${i + 1}</td>
      <td class="px-4 py-4 whitespace-nowrap text-sm font-mono text-blue-700 dark:text-blue-400 select-all">${f.startTime || 'N/A'}</td>
      <td class="${TD}">${convertToIST(f.startTime)}</td>
      <td class="${TD}">${f.endTime ? convertToIST(f.endTime) : 'Ongoing'}</td>
      <td class="${TD}">${f.duration || 'N/A'}</td>
      <td class="px-4 py-4 whitespace-nowrap text-sm">${f.missingBoot ? MISSING : PRESENT}</td>
      <td class="px-4 py-4 whitespace-nowrap text-sm">${f.missingStatus ? MISSING : PRESENT}</td>
      <td class="px-4 py-4 text-sm">${statusReceivedCell(f.recoveryStatusPerConnector)}</td>
      <td class="${TD}">${f.ocppErrorCode || 'N/A'}</td>
      <td class="${TD}">${f.vendorErrorCode || 'N/A'}</td>
      <td class="px-4 py-4 text-sm text-gray-900 dark:text-gray-100 break-words max-w-xs" title="${f.info || 'N/A'}">${f.info || 'N/A'}</td>` }));

  return el('div', {}, [cards, table('power-restore-missing-sync-table', HEADERS, rows)]);
}

export function renderEmergencyStopRelease(r: AnalysisResult): HTMLElement {
  const flags = r.emergencyStopSync;
  const cards = el('div', { className: 'mt-4 mb-4 grid grid-cols-3 gap-3', html:
    card('Total Emergency Stops', flags.length, 'red') +
    card('StatusNotification Received', flags.filter((f) => !f.missingStatus).length, 'green') +
    card('Missing StatusNotification', flags.filter((f) => f.missingStatus).length, 'orange') });

  const HEADERS = ['S.No.', 'EmergencyStop Timestamp (UTC)', 'EmergencyStop Start (IST)', 'Emergency Released (IST)', 'Duration (HH:MM:SS)', 'Missing StatusNotification', 'StatusNotification Status Received', 'OCPP Error Code', 'Vendor Error Code', 'Details'];
  const rows = flags.map((f: MissingSyncFlag, i) =>
    el('tr', { className: f.missingStatus ? 'bg-red-50 dark:bg-red-900/10 hover:bg-red-100 dark:hover:bg-red-900/30' : 'bg-green-50 dark:bg-green-900/10 hover:bg-green-100 dark:hover:bg-green-900/30', html: `
      <td class="px-4 py-4 whitespace-nowrap text-sm font-semibold text-gray-900 dark:text-gray-100">${i + 1}</td>
      <td class="px-4 py-4 whitespace-nowrap text-sm font-mono text-blue-700 dark:text-blue-400 select-all">${f.startTime || 'N/A'}</td>
      <td class="${TD}">${convertToIST(f.startTime)}</td>
      <td class="${TD}">${f.endTime ? convertToIST(f.endTime) : 'Ongoing'}</td>
      <td class="${TD}">${f.duration || 'N/A'}</td>
      <td class="px-4 py-4 whitespace-nowrap text-sm">${f.missingStatus ? MISSING : PRESENT}</td>
      <td class="px-4 py-4 text-sm">${statusReceivedCell(f.recoveryStatusPerConnector)}</td>
      <td class="${TD}">${f.ocppErrorCode || 'N/A'}</td>
      <td class="${TD}">${f.vendorErrorCode || 'N/A'}</td>
      <td class="px-4 py-4 text-sm text-gray-900 dark:text-gray-100 break-words max-w-xs" title="${f.info || 'N/A'}">${f.info || 'N/A'}</td>` }));

  return el('div', {}, [cards, table('emergency-stop-missing-status-table', HEADERS, rows)]);
}
