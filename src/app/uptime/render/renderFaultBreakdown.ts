// Fault_Breakdown rendering: the cross-site view, then one pivot per site.

import type { FaultBreakdown } from '../compare/faultBreakdown';

const esc = (s: string): string =>
  s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] as string));

const TH = 'px-3 py-2 text-left font-semibold text-gray-700 dark:text-gray-200 whitespace-nowrap';
const TD = 'px-3 py-2 text-gray-700 dark:text-gray-300';
const TABLE = 'min-w-full text-sm border-collapse';
const DASH = '<span class="text-gray-400">–</span>';

export function renderFaultBreakdown(breakdown: FaultBreakdown, siteNames: string[]): string {
  const multiSite = siteNames.length > 1;

  const head = siteNames.map((site) => {
    const connectors = breakdown.connectorsBySite[site] ?? [0, 1, 2];
    return connectors.map((c) => `<th class="${TH}">${esc(site)} · C${c}</th>`).join('')
      + `<th class="${TH}">${esc(site)} · Total</th>`;
  }).join('');

  const body = breakdown.crossSite.map((row) => {
    const cells = siteNames.map((site) => {
      const connectors = breakdown.connectorsBySite[site] ?? [0, 1, 2];
      const cell = row.bySite[site];
      const perConnector = connectors
        .map((c) => `<td class="${TD}">${cell?.perConnector[c] ?? 0 ? cell!.perConnector[c] : DASH}</td>`)
        .join('');
      return perConnector + `<td class="${TD} font-medium">${cell ? cell.total : DASH}</td>`;
    }).join('');
    const oneSided = multiSite && Object.keys(row.bySite).length < siteNames.length;
    const statuses = siteNames
      .map((s) => `<td class="${TD} text-xs">${row.bySite[s]?.statuses ? esc(row.bySite[s].statuses) : DASH}</td>`)
      .join('');
    return `<tr class="border-t border-gray-200 dark:border-gray-700 ${oneSided ? 'bg-amber-50/60 dark:bg-amber-900/10' : ''}">
      <td class="${TD}">${esc(row.errorCode)}</td>
      <td class="${TD} font-mono">${esc(row.vendorErrorCode)}</td>
      <td class="${TD}">${esc(row.info)}</td>
      ${cells}
      ${multiSite ? `<td class="${TD} text-xs">${esc(row.presence)}</td>` : ''}
      ${statuses}
    </tr>`;
  }).join('');

  const totals = siteNames.map((site) => {
    const connectors = breakdown.connectorsBySite[site] ?? [0, 1, 2];
    const perConnector = connectors.map((c) => {
      const n = breakdown.crossSite.reduce((sum, r) => sum + (r.bySite[site]?.perConnector[c] ?? 0), 0);
      return `<td class="${TD} font-semibold">${n}</td>`;
    }).join('');
    const total = breakdown.crossSite.reduce((sum, r) => sum + (r.bySite[site]?.total ?? 0), 0);
    return perConnector + `<td class="${TD} font-semibold">${total}</td>`;
  }).join('');

  const pivots = breakdown.pivots.map((pivot) => `
    <details class="mt-4">
      <summary class="cursor-pointer font-semibold text-gray-800 dark:text-gray-100">
        ${esc(pivot.site)} — ${pivot.distinctCombinations} distinct combinations, ${pivot.totalFaultRows} fault rows
      </summary>
      <div class="overflow-x-auto mt-2 max-h-96 overflow-y-auto">
        <table class="${TABLE}">
          <thead class="bg-gray-50 dark:bg-gray-700/50 sticky top-0"><tr>
            <th class="${TH}">Connector</th><th class="${TH}">Status</th><th class="${TH}">Error Code</th>
            <th class="${TH}">Vendor Code</th><th class="${TH}">Info</th><th class="${TH}">Frequency</th>
          </tr></thead>
          <tbody>${pivot.rows.map((r) => `
            <tr class="border-t border-gray-200 dark:border-gray-700">
              <td class="${TD}">${r.connectorId}</td><td class="${TD}">${esc(r.status)}</td>
              <td class="${TD}">${esc(r.errorCode)}</td><td class="${TD} font-mono">${esc(r.vendorErrorCode)}</td>
              <td class="${TD}">${esc(r.info)}</td><td class="${TD} font-medium">${r.frequency}</td>
            </tr>`).join('')}</tbody>
        </table>
      </div>
    </details>`).join('');

  return `
    <section id="fault-breakdown" class="bg-white dark:bg-gray-800 rounded-lg shadow p-6 scroll-mt-4">
      <h3 class="text-lg font-bold text-gray-800 dark:text-gray-100">Fault Breakdown</h3>
      <p class="text-sm text-gray-600 dark:text-gray-300 mt-1">
        Fault rows keyed on error code + vendor code + fault text.
        ${multiSite ? 'One-sided faults — logged by one charger and not the other — are highlighted and sorted first.' : ''}
      </p>
      <p class="text-xs text-amber-700 dark:text-amber-300 mt-3">↔ This table is wider than the screen — scroll it sideways for the second site's columns, Presence, and the Status(es) columns.</p>
      <div class="overflow-x-auto mt-2 border border-gray-200 dark:border-gray-700 rounded-lg">
        <table class="${TABLE}">
          <thead class="bg-gray-50 dark:bg-gray-700/50"><tr>
            <th class="${TH}">Error Code</th><th class="${TH}">Vendor Code</th><th class="${TH}">Info</th>
            ${head}${multiSite ? `<th class="${TH}">Presence</th>` : ''}
            ${siteNames.map((s) => `<th class="${TH}">${esc(s)} Status(es)</th>`).join('')}
          </tr></thead>
          <tbody>${body}
            <tr class="border-t-2 border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/30">
              <td class="${TD} font-semibold">Total</td><td class="${TD}"></td><td class="${TD}"></td>
              ${totals}${multiSite ? `<td class="${TD}"></td>` : ''}
              ${siteNames.map(() => `<td class="${TD}"></td>`).join('')}
            </tr>
          </tbody>
        </table>
      </div>
      <p class="text-xs text-gray-500 dark:text-gray-400 mt-2">
        Rows are keyed on errorCode + vendorErrorCode + info, so the same fault text logged under two error codes
        appears twice — which is itself the finding the ErrorCode Comparison section examines.
      </p>
      ${pivots}
    </section>`;
}
