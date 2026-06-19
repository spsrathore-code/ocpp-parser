// Protocol Compliance Report section — faithful port of HTML 6368-6686. Compliance
// badge + 5 summary cards + two tabs: System Checks (collapsible per-group check
// tables) and Transaction Lifecycle (per-tx 10-stage flow + stage table). Renders
// `r.protocol` (Phase 2c `runProtocolValidation`). Export → 3d (none in legacy).

import { el } from '../dom';
import type { AnalysisResult } from '../../analyze';
import type { CheckStatus, ProtocolCheckGroup, PerTransactionResult } from '../../protocol/types';

const STAGE_LABELS = ['EV Conn', 'Start Tx', 'Auth', 'Charging', 'Begin MV', 'Periodic MV', 'Stop Tx', 'Stop ACK', 'Released', 'ID Map'];

const statusBadge = (s: CheckStatus): string =>
  s === 'pass' ? `<span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300">✓ PASS</span>`
  : s === 'fail' ? `<span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300">✗ FAIL</span>`
  : s === 'warn' ? `<span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300">⚠ WARN</span>`
  : `<span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300">— N/A</span>`;
const rowBg = (s: CheckStatus): string => s === 'fail' ? 'bg-red-50 dark:bg-red-900/10' : s === 'warn' ? 'bg-yellow-50 dark:bg-yellow-900/10' : '';
const stIcon = (s: CheckStatus): string => s === 'pass' ? '✓' : s === 'fail' ? '✗' : s === 'warn' ? '⚠' : '—';
const stPill = (s: CheckStatus): string =>
  s === 'pass' ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300'
  : s === 'fail' ? 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300'
  : s === 'warn' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300'
  : 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300';
const circleColor = (s: CheckStatus): string => s === 'pass' ? '#16a34a' : s === 'fail' ? '#dc2626' : s === 'warn' ? '#d97706' : '#6b7280';

function groupBlock(group: ProtocolCheckGroup): HTMLElement {
  const passed = group.checks.filter((c) => c.status === 'pass').length;
  const failed = group.checks.filter((c) => c.status === 'fail').length;
  const warn = group.checks.filter((c) => c.status === 'warn').length;
  const groupBg = failed > 0 ? 'bg-red-50 dark:bg-red-900/20' : warn > 0 ? 'bg-yellow-50 dark:bg-yellow-900/20' : 'bg-green-50 dark:bg-green-900/20';
  const groupBadge = failed > 0 ? `<span class="text-xs font-semibold px-2 py-0.5 rounded bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300">${failed} FAIL</span>`
    : warn > 0 ? `<span class="text-xs font-semibold px-2 py-0.5 rounded bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300">${warn} WARN</span>`
    : `<span class="text-xs font-semibold px-2 py-0.5 rounded bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300">ALL PASS</span>`;

  const rowsHtml = group.checks.map((check) => {
    const affected = check.affectedItems.length > 0
      ? check.affectedItems.slice(0, 5).map((id) => `<span class="inline-block px-1.5 py-0.5 rounded text-xs font-mono bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 mr-1 mb-0.5">${id}</span>`).join('') + (check.affectedItems.length > 5 ? `<span class="text-xs text-gray-400 dark:text-gray-500">+${check.affectedItems.length - 5} more</span>` : '')
      : '<span class="text-xs text-gray-400 dark:text-gray-500">—</span>';
    return `<tr class="${rowBg(check.status)} hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
      <td class="px-4 py-3 text-xs font-mono font-semibold text-gray-600 dark:text-gray-400 whitespace-nowrap">${check.id}</td>
      <td class="px-4 py-3 text-sm text-gray-800 dark:text-gray-200">${check.description}</td>
      <td class="px-4 py-3 whitespace-nowrap">${statusBadge(check.status)}</td>
      <td class="px-4 py-3 text-xs text-gray-600 dark:text-gray-400">${check.details}</td>
      <td class="px-4 py-3 text-xs">${affected}</td></tr>`;
  }).join('');

  const groupDiv = el('div', { className: 'mb-3 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden' });
  const groupHeader = el('div', { className: `flex items-center justify-between p-3 cursor-pointer select-none ${groupBg}`, html: `
    <div class="flex items-center gap-2"><span class="text-base">${group.icon}</span>
      <span class="text-sm font-semibold text-gray-800 dark:text-gray-200">${group.name}</span>
      <span class="text-xs text-gray-500 dark:text-gray-400">${passed}/${group.checks.length} passed</span></div>
    <div class="flex items-center gap-2">${groupBadge}
      <svg class="pv-grp-chevron w-4 h-4 text-gray-400 transform transition-transform duration-200 rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/></svg></div>` });
  const groupBody = el('div', { className: 'overflow-x-auto', html: `
    <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
      <thead class="bg-gray-50 dark:bg-gray-700/60 sticky top-0"><tr>
        <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider w-28">Check ID</th>
        <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Description</th>
        <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider w-24">Status</th>
        <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Details</th>
        <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider w-44">Affected Items</th>
      </tr></thead><tbody class="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">${rowsHtml}</tbody></table>` });
  groupHeader.addEventListener('click', () => {
    groupBody.classList.toggle('hidden');
    groupHeader.querySelector('.pv-grp-chevron')!.classList.toggle('rotate-180');
  });
  groupDiv.append(groupHeader, groupBody);
  return groupDiv;
}

function txBlock(tx: PerTransactionResult): HTMLElement {
  const txBg = tx.overallStatus === 'fail' ? 'bg-red-50 dark:bg-red-900/20' : tx.overallStatus === 'warn' ? 'bg-yellow-50 dark:bg-yellow-900/20' : 'bg-green-50 dark:bg-green-900/20';
  const txBadge = tx.overallStatus === 'fail' ? `<span class="text-xs font-semibold px-2 py-0.5 rounded bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300">${tx.failedCount} FAIL</span>`
    : tx.overallStatus === 'warn' ? `<span class="text-xs font-semibold px-2 py-0.5 rounded bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300">${tx.warnCount} WARN</span>`
    : `<span class="text-xs font-semibold px-2 py-0.5 rounded bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300">ALL PASS</span>`;
  const energyStr = typeof tx.totalEnergy === 'number' ? `${tx.totalEnergy.toFixed(2)} kWh` : 'N/A';
  const startStr = tx.startTime ? new Date(tx.startTime).toISOString().replace('T', ' ').slice(0, 19) + 'Z' : 'N/A';
  const itx = tx.internalTransactionId
    ? `<span class="text-xs font-mono text-indigo-600 dark:text-indigo-400" title="Internal TX ID">${tx.internalTransactionId}</span>`
    : `<span class="text-xs text-gray-400 dark:text-gray-500 italic">no internal id</span>`;

  const txDiv = el('div', { className: 'mb-3 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden' });
  const txHeader = el('div', { className: `flex items-center justify-between p-3 cursor-pointer select-none ${txBg}`, html: `
    <div class="flex items-center gap-3 flex-wrap">
      <span class="text-sm font-semibold text-gray-700 dark:text-gray-200">TX ${tx.txId}</span>
      <span class="text-xs px-2 py-0.5 rounded bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300">C${tx.connectorId}</span>
      <span class="text-xs font-mono text-gray-500 dark:text-gray-400">${startStr}</span>
      <span class="text-xs text-gray-500 dark:text-gray-400 font-medium">${energyStr}</span>${itx}</div>
    <div class="flex items-center gap-2 flex-shrink-0">${txBadge}
      <svg class="w-4 h-4 text-gray-400 pv-tx-chevron transform transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/></svg></div>` });

  // Stage flow (circles + connector lines).
  const flowInner = el('div', { className: 'flex items-start min-w-max mx-auto justify-center' });
  tx.lifecycle.forEach((stage, i) => {
    const icon = stage.status === 'fail' ? '✗' : stage.status === 'warn' ? '⚠' : String(i + 1);
    flowInner.appendChild(el('div', { className: 'flex flex-col items-center', attrs: { style: 'width:72px' }, html: `
      <div style="width:34px;height:34px;border-radius:50%;background:${circleColor(stage.status)};color:#fff;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:700;flex-shrink:0;box-shadow:0 1px 3px rgba(0,0,0,0.25);">${icon}</div>
      <div style="font-size:10px;color:#6b7280;text-align:center;margin-top:5px;max-width:68px;line-height:1.3;word-break:break-word;">${STAGE_LABELS[i] || `Stage ${i + 1}`}</div>` }));
    if (i < tx.lifecycle.length - 1) {
      flowInner.appendChild(el('div', { attrs: { style: `width:24px;height:2px;background:${circleColor(tx.lifecycle[i + 1].status)};margin-top:16px;flex-shrink:0;` } }));
    }
  });
  const flowDiv = el('div', { className: 'p-4 bg-gray-50 dark:bg-gray-700/30 border-b border-gray-200 dark:border-gray-700 overflow-x-auto' }, [flowInner]);

  const stageRows = tx.lifecycle.map((stage, i) => `
    <tr class="${rowBg(stage.status)} hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
      <td class="px-4 py-2.5 text-xs font-mono text-gray-400 dark:text-gray-500">${i + 1}</td>
      <td class="px-4 py-2.5 text-sm font-medium text-gray-800 dark:text-gray-200">${stage.stage}</td>
      <td class="px-4 py-2.5 whitespace-nowrap"><span class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold ${stPill(stage.status)}">${stIcon(stage.status)} ${stage.status.toUpperCase()}</span></td>
      <td class="px-4 py-2.5 text-xs text-gray-600 dark:text-gray-400">${stage.note}</td></tr>`).join('');
  const stageTable = el('div', { className: 'overflow-x-auto', html: `
    <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
      <thead class="bg-gray-50 dark:bg-gray-700/60"><tr>
        <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase w-8">#</th>
        <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Lifecycle Stage</th>
        <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase w-24">Status</th>
        <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Notes</th>
      </tr></thead><tbody class="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">${stageRows}</tbody></table>` });

  const txBody = el('div', { className: 'hidden' }, [flowDiv, stageTable]);
  txHeader.addEventListener('click', () => {
    txBody.classList.toggle('hidden');
    txHeader.querySelector('.pv-tx-chevron')!.classList.toggle('rotate-180');
  });
  txDiv.append(txHeader, txBody);
  return txDiv;
}

export function renderProtocolCompliance(r: AnalysisResult): HTMLElement {
  const { groups, perTransactionResults, summary } = r.protocol;

  const cards = el('div', { className: 'grid grid-cols-5 gap-3 mt-4 mb-4', html: `
    <div class="bg-gray-50 dark:bg-gray-700/50 p-3 rounded-lg text-center border border-gray-200 dark:border-gray-600"><div class="text-2xl font-bold text-gray-700 dark:text-gray-200">${summary.total}</div><div class="text-xs text-gray-500 dark:text-gray-400 mt-1 uppercase font-medium tracking-wide">Total Checks</div></div>
    <div class="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg text-center border border-green-200 dark:border-green-800"><div class="text-2xl font-bold text-green-700 dark:text-green-300">${summary.passed}</div><div class="text-xs text-green-600 dark:text-green-400 mt-1 uppercase font-medium tracking-wide">✓ Passed</div></div>
    <div class="bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded-lg text-center border border-yellow-200 dark:border-yellow-800"><div class="text-2xl font-bold text-yellow-700 dark:text-yellow-300">${summary.warnings}</div><div class="text-xs text-yellow-600 dark:text-yellow-400 mt-1 uppercase font-medium tracking-wide">⚠ Warnings</div></div>
    <div class="bg-red-50 dark:bg-red-900/20 p-3 rounded-lg text-center border border-red-200 dark:border-red-800"><div class="text-2xl font-bold text-red-700 dark:text-red-300">${summary.failed}</div><div class="text-xs text-red-600 dark:text-red-400 mt-1 uppercase font-medium tracking-wide">✗ Failed</div></div>
    <div class="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg text-center border border-blue-200 dark:border-blue-800"><div class="text-2xl font-bold text-blue-700 dark:text-blue-300">${summary.info}</div><div class="text-xs text-blue-600 dark:text-blue-400 mt-1 uppercase font-medium tracking-wide">— N/A</div></div>` });

  const complianceColor = summary.compliance >= 90 ? 'text-green-700 dark:text-green-300 bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-700'
    : summary.compliance >= 70 ? 'text-yellow-700 dark:text-yellow-300 bg-yellow-50 dark:bg-yellow-900/20 border-yellow-300 dark:border-yellow-700'
    : 'text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-900/20 border-red-300 dark:border-red-700';
  const complianceBadge = el('div', { className: 'mb-1', html: `<span class="inline-flex items-center px-3 py-1 rounded-full text-sm font-bold border ${complianceColor}">${summary.compliance}% Compliant</span>` });

  const systemPanel = el('div', {}, groups.map(groupBlock));
  const lifecyclePanel = el('div', { className: 'hidden' }, perTransactionResults.length === 0
    ? [el('p', { className: 'text-sm text-gray-500 dark:text-gray-400 py-6 text-center', text: 'No transactions found in this log.' })]
    : perTransactionResults.map(txBlock));

  const tabSystem = el('button', { className: 'px-4 py-2 text-sm font-medium border-b-2 border-indigo-500 text-indigo-600 dark:text-indigo-400 transition-colors', text: `🔧 System Checks (${summary.total})` });
  const tabLifecycle = el('button', { className: 'px-4 py-2 text-sm font-medium border-b-2 border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors', text: `⚡ Transaction Lifecycle (${perTransactionResults.length})` });
  const ACTIVE = 'px-4 py-2 text-sm font-medium border-b-2 border-indigo-500 text-indigo-600 dark:text-indigo-400 transition-colors';
  const INACTIVE = 'px-4 py-2 text-sm font-medium border-b-2 border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors';
  tabSystem.addEventListener('click', () => { systemPanel.classList.remove('hidden'); lifecyclePanel.classList.add('hidden'); tabSystem.className = ACTIVE; tabLifecycle.className = INACTIVE; });
  tabLifecycle.addEventListener('click', () => { lifecyclePanel.classList.remove('hidden'); systemPanel.classList.add('hidden'); tabLifecycle.className = ACTIVE; tabSystem.className = INACTIVE; });

  const tabBar = el('div', { className: 'border-b border-gray-200 dark:border-gray-700 mb-4' }, [el('nav', { className: 'flex gap-1' }, [tabSystem, tabLifecycle])]);

  return el('div', {}, [complianceBadge, cards, tabBar, systemPanel, lifecyclePanel]);
}
