// Per-site rendering: the four blocks of Uptime_<Site> plus the outage
// drill-down, in the workbook's own order.

import { formatDuration, formatOutageText, toIstIso } from '../duration';
import { DERIVATION_TEXT, type CategoryRow, type SiteUptime, type UptimeOptions } from '../types';

const esc = (s: string): string =>
  s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] as string));

const pct = (n: number): string => `${n.toFixed(2)}%`;

const TH = 'px-3 py-2 text-left font-semibold text-gray-700 dark:text-gray-200';
const TD = 'px-3 py-2 text-gray-700 dark:text-gray-300';
const TABLE = 'min-w-full text-sm border-collapse';
const CARD = 'bg-white dark:bg-gray-800 rounded-lg shadow p-6';

function summaryBlock(title: string, rows: CategoryRow[], connectors: number[]): string {
  if (rows.length === 0) return '';
  const head = connectors.map((c) => `<th class="${TH}">C${c} Events</th><th class="${TH}">C${c} Downtime</th>`).join('');
  const body = rows.map((r) => {
    const cells = connectors.map((c) => {
      const cell = r.perConnector[c] ?? { events: 0, downtimeSec: 0 };
      return `<td class="${TD}">${cell.events}</td><td class="${TD} font-mono">${formatDuration(cell.downtimeSec)}</td>`;
    }).join('');
    return `<tr class="border-t border-gray-200 dark:border-gray-700"><td class="${TD}">${esc(r.key)}</td>${cells}<td class="${TD}">${r.totalEvents}</td><td class="${TD} font-mono">${formatDuration(r.totalDowntimeSec)}</td></tr>`;
  }).join('');
  const totalEvents = rows.reduce((n, r) => n + r.totalEvents, 0);
  const totalSecs = rows.reduce((n, r) => n + r.totalDowntimeSec, 0);
  const totalCells = connectors.map((c) => {
    const events = rows.reduce((n, r) => n + (r.perConnector[c]?.events ?? 0), 0);
    const secs = rows.reduce((n, r) => n + (r.perConnector[c]?.downtimeSec ?? 0), 0);
    return `<td class="${TD} font-semibold">${events}</td><td class="${TD} font-mono font-semibold">${formatDuration(secs)}</td>`;
  }).join('');

  return `
    <h4 class="font-semibold text-gray-800 dark:text-gray-100 mt-6 mb-2">${title}</h4>
    <div class="overflow-x-auto">
      <table class="${TABLE}">
        <thead class="bg-gray-50 dark:bg-gray-700/50"><tr><th class="${TH}">${title.includes('Code') ? 'Error Code' : 'Error Description'}</th>${head}<th class="${TH}">Total Events</th><th class="${TH}">Total Downtime</th></tr></thead>
        <tbody>${body}
          <tr class="border-t-2 border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/30">
            <td class="${TD} font-semibold">Total</td>${totalCells}
            <td class="${TD} font-semibold">${totalEvents}</td><td class="${TD} font-mono font-semibold">${formatDuration(totalSecs)}</td>
          </tr>
        </tbody>
      </table>
    </div>`;
}

function uptimeBlock(site: SiteUptime, options: UptimeOptions): string {
  const rows = site.perConnector.map((c) => `
    <tr class="border-t border-gray-200 dark:border-gray-700">
      <td class="${TD}">Connector ${c.connectorId}</td>
      <td class="${TD}">${c.outageEvents}</td>
      <td class="${TD} font-mono">${formatDuration(c.rawDowntimeSec)}</td>
      <td class="${TD} font-mono">${formatDuration(c.mergedDowntimeSec)}</td>
      <td class="${TD} font-mono">${formatDuration(c.overlapRemovedSec)}</td>
      <td class="${TD}">${pct(c.uptimeRawPct)}</td>
      <td class="${TD} font-semibold text-indigo-700 dark:text-indigo-300">${pct(c.uptimeAdjustedPct)}</td>
    </tr>`).join('');

  return `
    <h4 class="font-semibold text-gray-800 dark:text-gray-100 mt-6 mb-2">Uptime over the log window</h4>
    <div class="grid gap-2 sm:grid-cols-3 text-sm mb-3">
      <div><span class="text-gray-500 dark:text-gray-400">Window (IST)</span><br><span class="font-mono">${toIstIso(site.windowStartUtc)} → ${toIstIso(site.windowEndUtc)}</span></div>
      <div><span class="text-gray-500 dark:text-gray-400">Available per connector</span><br><span class="font-mono">${formatDuration(site.availableSec)}</span> (${site.availableSec.toLocaleString()} s)</div>
      <div><span class="text-gray-500 dark:text-gray-400">Site available</span><br><span class="font-mono">${formatDuration(site.siteAvailableSec)}</span></div>
    </div>
    <div class="overflow-x-auto">
      <table class="${TABLE}">
        <thead class="bg-gray-50 dark:bg-gray-700/50"><tr>
          <th class="${TH}"></th><th class="${TH}">Outage events</th><th class="${TH}">Downtime (raw)</th>
          <th class="${TH}">Downtime (merged)</th><th class="${TH}">Overlap removed</th>
          <th class="${TH}">Uptime % (raw)</th><th class="${TH}">Uptime % (adjusted)</th>
        </tr></thead>
        <tbody>${rows}
          <tr class="border-t-2 border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/30">
            <td class="${TD} font-semibold">Site</td>
            <td class="${TD} font-semibold">${site.outageRows.length}</td>
            <td class="${TD} font-mono font-semibold">${formatDuration(site.siteRawDowntimeSec)}</td>
            <td class="${TD} font-mono font-semibold">${formatDuration(site.siteMergedDowntimeSec)}</td>
            <td class="${TD} font-mono font-semibold">${formatDuration(site.siteRawDowntimeSec - site.siteMergedDowntimeSec)}</td>
            <td class="${TD} font-semibold">${pct(site.siteUptimeRawPct)}</td>
            <td class="${TD} font-semibold text-indigo-700 dark:text-indigo-300">${pct(site.siteUptimeAdjustedPct)}</td>
          </tr>
        </tbody>
      </table>
    </div>
`;
}

function chargerLevelBlock(site: SiteUptime): string {
  if (site.chargerLevel.length === 0) return '';
  const rows = site.chargerLevel.map((r) => `
    <tr class="border-t border-gray-200 dark:border-gray-700">
      <td class="${TD}">${esc(r.errorDescription)}</td><td class="${TD}">${r.episodes}</td>
      <td class="${TD} font-mono">${formatDuration(r.downtimeSec)}</td><td class="${TD}">No</td>
    </tr>`).join('');
  return `
    <h4 class="font-semibold text-gray-800 dark:text-gray-100 mt-6 mb-2">Connector 0 — charger-level faults</h4>
    <div class="bg-amber-50 dark:bg-amber-900/20 border border-amber-300 dark:border-amber-700 text-amber-800 dark:text-amber-200 text-xs rounded p-3 mb-2">
      <strong>Non-additive.</strong> These are measured against ONE log window, not one per connector, and are
      <strong>not</strong> included in the connector or site figures above. Adding them in would double-count.
    </div>
    <div class="overflow-x-auto"><table class="${TABLE}">
      <thead class="bg-gray-50 dark:bg-gray-700/50"><tr><th class="${TH}">Error Description</th><th class="${TH}">Episodes</th><th class="${TH}">Downtime</th><th class="${TH}">Counted in connectors?</th></tr></thead>
      <tbody>${rows}</tbody></table></div>`;
}

function outageTable(site: SiteUptime): string {
  const rows = site.outageRows.map((r) => `
    <tr class="border-t border-gray-200 dark:border-gray-700">
      <td class="${TD}">${r.connectorId}</td>
      <td class="${TD}">${esc(r.errorCode)}</td>
      <td class="${TD}">${esc(r.errorDescription)}</td>
      <td class="${TD}">${esc(r.vendorErrorCode)}</td>
      <td class="${TD} font-mono whitespace-nowrap">${toIstIso(r.startUtc)}</td>
      <td class="${TD} font-mono whitespace-nowrap">${r.endUtc === null ? '—' : toIstIso(r.endUtc)}</td>
      <td class="${TD} whitespace-nowrap">${formatOutageText(r.durationSec)}</td>
      <td class="${TD} text-xs text-gray-500 dark:text-gray-400">${esc(DERIVATION_TEXT[r.derivation])}</td>
    </tr>`).join('');
  return `
    <details class="mt-6">
      <summary class="cursor-pointer font-semibold text-gray-800 dark:text-gray-100">Outage detail (${site.outageRows.length} connector-events)</summary>
      <div class="overflow-x-auto mt-2 max-h-96 overflow-y-auto"><table class="${TABLE}">
        <thead class="bg-gray-50 dark:bg-gray-700/50 sticky top-0"><tr>
          <th class="${TH}">Conn</th><th class="${TH}">Error Code</th><th class="${TH}">Description</th><th class="${TH}">Vendor</th>
          <th class="${TH}">Start (IST)</th><th class="${TH}">End (IST)</th><th class="${TH}">Duration</th><th class="${TH}">Derivation</th>
        </tr></thead><tbody>${rows}</tbody></table></div>
    </details>`;
}

export function renderSiteUptime(site: SiteUptime, options: UptimeOptions, sectionNumber?: number): string {
  const caveat = site.unresolvedCount > 0
    ? `<div class="bg-amber-50 dark:bg-amber-900/20 border border-amber-300 dark:border-amber-700 text-amber-800 dark:text-amber-200 text-xs rounded p-3 mt-4">
         <strong>${site.unresolvedCount} outage(s) never closed</strong> before the log ended. They carry no duration and are
         excluded from every total, so downtime here is understated by an unknown amount.
       </div>`
    : '';

  const anchor = `site-${site.site.replace(/[^a-zA-Z0-9]+/g, '-').toLowerCase()}`;
  return `
    <section id="${anchor}" class="${CARD} scroll-mt-4">
      <div class="flex flex-wrap items-baseline justify-between gap-2">
        <h3 class="text-lg font-bold text-gray-800 dark:text-gray-100">${sectionNumber ? `${sectionNumber}) ` : ''}${esc(site.site)} — Site Uptime</h3>
        <div class="text-sm text-gray-500 dark:text-gray-400">
          ${site.oem ? `${esc(site.oem)} · ` : ''}${site.logRowCount.toLocaleString()} rows ·
          ${site.faultRowCount} fault rows · ${site.faultEpisodeCount} episodes ·
          ${site.offlineWindowCount} offline windows from ${site.bootNotificationCount} boots
          ${site.firmwareVersions.length ? ` · fw ${esc(site.firmwareVersions.join(', '))}` : ''}
        </div>
      </div>
      <div class="mt-3 text-3xl font-bold text-indigo-700 dark:text-indigo-300">${pct(site.siteUptimeAdjustedPct)}
        <span class="text-sm font-normal text-gray-500 dark:text-gray-400">site uptime (overlap-adjusted)</span>
      </div>
      ${uptimeBlock(site, options)}
      ${summaryBlock('Downtime by Error Code', site.byErrorCode, site.connectors)}
      ${summaryBlock('Downtime by Error Description', site.byErrorDescription, site.connectors)}
      ${chargerLevelBlock(site)}
      ${outageTable(site)}
      ${caveat}
    </section>`;
}
