// CP-Initiated Operations Compliance (OCPP 1.6J §4) section. Sibling of Protocol
// Compliance — renders r.cpCompliance: per-group collapsible tables with Test ID,
// §Ref, Invariant, Severity, Tier, Status, Details, and Preview/Download context.
import { el } from '../dom';
import { singleContextButtons } from '../contextViewer';
import type { AnalysisResult } from '../../analyze';
import type { ComplianceGroup, ComplianceResult, CheckStatus, Tier } from '../../compliance/types';

const statusBadge = (s: CheckStatus): string =>
  s === 'pass' ? `<span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300">✓ PASS</span>`
  : s === 'fail' ? `<span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300">✗ FAIL</span>`
  : s === 'warn' ? `<span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300">⚠ WARN</span>`
  : `<span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300">— INDET.</span>`;
const tierTag = (t: Tier): string => {
  const dot = t === 'deterministic' ? '🟢' : t === 'heuristic' ? '🟡' : '🔴';
  return `<span class="text-xs text-gray-500 dark:text-gray-400" title="${t}">${dot}</span>`;
};
const rowBg = (s: CheckStatus): string => s === 'fail' ? 'bg-red-50 dark:bg-red-900/10' : s === 'warn' ? 'bg-yellow-50 dark:bg-yellow-900/10' : '';
const esc = (s: string): string => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function contextCell(res: ComplianceResult, idx: number): string {
  const anchor = res.affected.find((a) => a.lineNumber != null);
  if (!anchor) return '<span class="text-xs text-gray-400 dark:text-gray-500">—</span>';
  const { preview, download } = singleContextButtons(res.id, anchor.lineNumber!, idx, { preview: true });
  return `<div class="flex gap-1">${preview}${download}</div>`;
}

function groupBlock(group: ComplianceGroup, startIdx: number): HTMLElement {
  const failed = group.results.filter((c) => c.status === 'fail').length;
  const warn = group.results.filter((c) => c.status === 'warn').length;
  const groupBg = failed > 0 ? 'bg-red-50 dark:bg-red-900/20' : warn > 0 ? 'bg-yellow-50 dark:bg-yellow-900/20' : 'bg-green-50 dark:bg-green-900/20';
  const rows = group.results.map((res, i) => `
    <tr class="${rowBg(res.status)}">
      <td class="px-3 py-2 text-xs font-mono font-semibold text-gray-600 dark:text-gray-400 whitespace-nowrap">${res.id}</td>
      <td class="px-3 py-2 text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">§${res.specRef}</td>
      <td class="px-3 py-2 text-sm text-gray-800 dark:text-gray-200">${esc(res.invariant)}</td>
      <td class="px-3 py-2 text-xs whitespace-nowrap">${res.severity}</td>
      <td class="px-3 py-2 text-center">${tierTag(res.tier)}</td>
      <td class="px-3 py-2 whitespace-nowrap">${statusBadge(res.status)}</td>
      <td class="px-3 py-2 text-xs text-gray-600 dark:text-gray-400">${esc(res.details)}</td>
      <td class="px-3 py-2 whitespace-nowrap">${contextCell(res, startIdx + i)}</td>
    </tr>`).join('');

  const div = el('div', { className: 'mb-3 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden', attrs: { 'data-cpc-group': group.prefix } });
  const header = el('div', { className: `flex items-center justify-between p-3 cursor-pointer select-none ${groupBg}`, html: `
    <div class="flex items-center gap-2"><span class="text-base">${group.icon}</span>
      <span class="text-sm font-semibold text-gray-800 dark:text-gray-200">${group.messageType}</span>
      <span class="text-xs text-gray-500 dark:text-gray-400">${group.results.length} rule(s)</span></div>
    <svg class="cpc-chevron w-4 h-4 text-gray-400 transform transition-transform duration-200 rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/></svg>` });
  const body = el('div', { className: 'overflow-x-auto', html: `
    <table class="cp-compliance-table min-w-full divide-y divide-gray-200 dark:divide-gray-700">
      <thead class="bg-gray-50 dark:bg-gray-700/60"><tr>
        <th class="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Test ID</th>
        <th class="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">§Ref</th>
        <th class="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Invariant</th>
        <th class="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Severity</th>
        <th class="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Tier</th>
        <th class="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Status</th>
        <th class="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Details</th>
        <th class="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Context</th>
      </tr></thead><tbody>${rows}</tbody></table>` });
  header.addEventListener('click', () => { body.classList.toggle('hidden'); header.querySelector('.cpc-chevron')!.classList.toggle('rotate-180'); });
  div.append(header, body);
  return div;
}

export function renderCpCompliance(r: AnalysisResult): HTMLElement {
  const { groups, summary } = r.cpCompliance;
  const score = summary.weightedScore;
  const color = score >= 90 ? 'text-green-700 dark:text-green-300 bg-green-50 dark:bg-green-900/20 border-green-300'
    : score >= 70 ? 'text-yellow-700 dark:text-yellow-300 bg-yellow-50 dark:bg-yellow-900/20 border-yellow-300'
    : 'text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-900/20 border-red-300';
  const badge = el('div', { className: 'mb-3', html:
    `<span class="inline-flex items-center px-3 py-1 rounded-full text-sm font-bold border ${color}">${score}% Compliant</span>
     <span class="ml-3 text-xs text-gray-500 dark:text-gray-400">✓ ${summary.byStatus.pass} · ⚠ ${summary.byStatus.warn} · ✗ ${summary.byStatus.fail} · — ${summary.byStatus.info} indeterminate</span>
     <span class="ml-3 text-xs text-gray-400 dark:text-gray-500">Tiers: 🟢 deterministic · 🟡 heuristic · 🔴 indeterminate</span>` });

  // running index so each context button has a unique index across groups
  let idx = 0;
  const blocks = groups.map((g) => { const b = groupBlock(g, idx); idx += g.results.length; return b; });

  // a single hidden table carrying the export target id (rows mirror the visible report)
  const exportRows = groups.flatMap((g) => g.results).map((res) =>
    `<tr><td>${res.id}</td><td>${res.specRef}</td><td>${esc(res.targetMessage)}</td><td>${esc(res.invariant)}</td><td>${res.severity}</td><td>${res.tier}</td><td>${res.status}</td><td>${esc(res.details)}</td></tr>`).join('');
  const exportTable = el('table', { className: 'hidden', attrs: { id: 'cp-compliance-table' }, html:
    `<thead><tr><th>Test ID</th><th>Spec §</th><th>Target Message</th><th>Invariant</th><th>Severity</th><th>Tier</th><th>Status</th><th>Details</th></tr></thead><tbody>${exportRows}</tbody>` });

  return el('div', {}, [badge, ...blocks, exportTable]);
}
