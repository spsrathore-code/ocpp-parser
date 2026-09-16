// Rendering for the two cross-site sections: ErrorCode_Comparison and
// Uptime_Comparison.

import { formatDuration } from '../duration';
import { ABSENT, type ErrorCodeComparison, type Verdict } from '../compare/errorCodeCompare';
import type { LineItemRow, MetricRow, UptimeComparison } from '../compare/uptimeCompare';

const esc = (s: string): string =>
  s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] as string));

const TH = 'px-3 py-2 text-left font-semibold text-gray-700 dark:text-gray-200 whitespace-nowrap';
const TD = 'px-3 py-2 text-gray-700 dark:text-gray-300';
const TABLE = 'min-w-full text-sm border-collapse';
const CARD = 'bg-white dark:bg-gray-800 rounded-lg shadow p-6';

function verdictBadge(v: Verdict): string {
  const style = v === 'MISMATCH'
    ? 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200'
    : v === 'n/a - one-sided fault'
      ? 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
      : 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200';
  return `<span class="inline-block px-2 py-0.5 rounded text-xs font-medium ${style}">${esc(v)}</span>`;
}

function readoutBlock(lines: string[]): string {
  if (lines.length === 0) return '';
  return `<div class="mt-4 bg-gray-50 dark:bg-gray-700/40 border border-gray-200 dark:border-gray-600 rounded-lg p-4">
    <h4 class="font-semibold text-gray-800 dark:text-gray-100 mb-2">Read-out</h4>
    <ul class="list-disc ml-5 space-y-1 text-sm text-gray-700 dark:text-gray-300">
      ${lines.map((l) => `<li>${esc(l)}</li>`).join('')}
    </ul></div>`;
}

// ---------------------------------------------------------------- ErrorCode

export function renderErrorCodeComparison(cmp: ErrorCodeComparison, siteNames: string[]): string {
  const siteHead = (suffix: string): string =>
    siteNames.map((s) => `<th class="${TH}">${esc(s)} ${suffix}</th>`).join('');

  const labelTable = (rows: ErrorCodeComparison['byInfo'], keyLabel: string, valueLabel: string): string => `
    <div class="overflow-x-auto mt-3"><table class="${TABLE}">
      <thead class="bg-gray-50 dark:bg-gray-700/50"><tr>
        <th class="${TH}">${keyLabel}</th>${siteHead(valueLabel)}
        <th class="${TH}">Verdict</th>${siteHead('status(es)')}<th class="${TH}">Status verdict</th>${siteHead('rows')}
      </tr></thead>
      <tbody>${rows.map((r) => `
        <tr class="border-t border-gray-200 dark:border-gray-700">
          <td class="${TD}">${esc(r.key)}</td>
          ${siteNames.map((s) => `<td class="${TD}">${r.errorCodes[s] === ABSENT ? '<span class="text-gray-400">—</span>' : esc(r.errorCodes[s])}</td>`).join('')}
          <td class="${TD}">${verdictBadge(r.errorCodeVerdict)}</td>
          ${siteNames.map((s) => `<td class="${TD}">${r.statuses[s] === ABSENT ? '<span class="text-gray-400">—</span>' : esc(r.statuses[s])}</td>`).join('')}
          <td class="${TD}">${verdictBadge(r.statusVerdict)}</td>
          ${siteNames.map((s) => `<td class="${TD}">${r.rowCounts[s] ?? 0}</td>`).join('')}
        </tr>`).join('')}</tbody>
    </table></div>`;

  return `
    <section id="errorcode-comparison" class="${CARD} scroll-mt-4">
      <h3 class="text-lg font-bold text-gray-800 dark:text-gray-100">3) Error Code Comparison</h3>
      <p class="text-sm text-gray-600 dark:text-gray-300 mt-1">
        Read this <strong>before</strong> drawing conclusions from fault counts: if two releases code the same
        fault differently, comparing counts by error code is meaningless.
      </p>

      <h4 class="font-semibold text-gray-800 dark:text-gray-100 mt-5">3.1 Same fault, same label?</h4>
      ${labelTable(cmp.byInfo, 'Info (vendor fault text)', 'errorCode(s)')}

      <h4 class="font-semibold text-gray-800 dark:text-gray-100 mt-6">3.2 Keyed on vendor error code</h4>
      <p class="text-xs text-gray-500 dark:text-gray-400">The vendor code is the stable numeric identity — this catches pure relabelling.</p>
      ${labelTable(cmp.byVendorCode, 'Vendor Error Code', 'info text(s)')}

      <details class="mt-6">
        <summary class="cursor-pointer font-semibold text-gray-800 dark:text-gray-100">3.3 Full triplet inventory (${cmp.triplets.length} rows)</summary>
        <div class="overflow-x-auto mt-2 max-h-96 overflow-y-auto"><table class="${TABLE}">
          <thead class="bg-gray-50 dark:bg-gray-700/50 sticky top-0"><tr>
            <th class="${TH}">Info</th><th class="${TH}">errorCode</th><th class="${TH}">status</th>
            ${siteHead('rows')}<th class="${TH}">Presence</th>
          </tr></thead>
          <tbody>${cmp.triplets.map((t) => `
            <tr class="border-t border-gray-200 dark:border-gray-700">
              <td class="${TD}">${esc(t.info)}</td><td class="${TD}">${esc(t.errorCode)}</td><td class="${TD}">${esc(t.status)}</td>
              ${siteNames.map((s) => `<td class="${TD}">${t.rowCounts[s] ?? 0}</td>`).join('')}
              <td class="${TD} text-xs">${esc(t.presence)}</td>
            </tr>`).join('')}</tbody>
        </table></div>
      </details>

      <h4 class="font-semibold text-gray-800 dark:text-gray-100 mt-6">3.4 Ambiguous coding within a charger</h4>
      <p class="text-xs text-gray-500 dark:text-gray-400">
        A fault text logged under more than one errorCode by the <em>same</em> unit proves errorCode alone is not a valid fault key.
      </p>
      <div class="overflow-x-auto mt-3"><table class="${TABLE}">
        <thead class="bg-gray-50 dark:bg-gray-700/50"><tr>
          <th class="${TH}">Info</th>${siteHead('distinct errorCodes')}${siteHead('distinct statuses')}<th class="${TH}">Flag</th>
        </tr></thead>
        <tbody>${cmp.ambiguity.map((a) => `
          <tr class="border-t border-gray-200 dark:border-gray-700 ${a.flag.startsWith('AMBIGUOUS') ? 'bg-amber-50/60 dark:bg-amber-900/10' : ''}">
            <td class="${TD}">${esc(a.info)}</td>
            ${siteNames.map((s) => `<td class="${TD}">${a.distinctErrorCodes[s] ?? 0}</td>`).join('')}
            ${siteNames.map((s) => `<td class="${TD}">${a.distinctStatuses[s] ?? 0}</td>`).join('')}
            <td class="${TD} text-xs">${esc(a.flag)}</td>
          </tr>`).join('')}</tbody>
      </table></div>

      ${readoutBlock(cmp.readout)}
    </section>`;
}

// ------------------------------------------------------------------- Uptime

function deltaCell(value: number, kind: 'duration' | 'percent' | 'count'): string {
  if (value === 0) return `<td class="${TD} text-gray-400">—</td>`;
  const sign = value > 0 ? '+' : '−';
  const magnitude = Math.abs(value);
  const text = kind === 'duration' ? formatDuration(magnitude)
    : kind === 'percent' ? `${magnitude.toFixed(2)}%`
      : String(magnitude);
  // Deliberately uncoloured: whether "more" is good depends on the row.
  return `<td class="${TD} font-medium">${sign}${text}</td>`;
}

function lineItemTable(rows: LineItemRow[], siteNames: string[], keyLabel: string): string {
  const totals = siteNames.map((s) => ({
    site: s,
    events: rows.reduce((n, r) => n + (r.events[s] ?? 0), 0),
    seconds: rows.reduce((n, r) => n + (r.downtimeSec[s] ?? 0), 0),
  }));
  return `
    <div class="overflow-x-auto mt-3"><table class="${TABLE}">
      <thead class="bg-gray-50 dark:bg-gray-700/50"><tr>
        <th class="${TH}">${keyLabel}</th>
        ${siteNames.map((s) => `<th class="${TH}">${esc(s)} events</th><th class="${TH}">${esc(s)} downtime</th>`).join('')}
        <th class="${TH}">Δ downtime</th>
      </tr></thead>
      <tbody>${rows.map((r) => `
        <tr class="border-t border-gray-200 dark:border-gray-700">
          <td class="${TD}">${esc(r.key)}</td>
          ${siteNames.map((s) => `<td class="${TD}">${r.events[s] ?? 0}</td><td class="${TD} font-mono">${formatDuration(r.downtimeSec[s] ?? 0)}</td>`).join('')}
          ${deltaCell(r.deltaSec, 'duration')}
        </tr>`).join('')}
        <tr class="border-t-2 border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/30">
          <td class="${TD} font-semibold">Total</td>
          ${totals.map((t) => `<td class="${TD} font-semibold">${t.events}</td><td class="${TD} font-mono font-semibold">${formatDuration(t.seconds)}</td>`).join('')}
          <td class="${TD}"></td>
        </tr>
      </tbody>
    </table></div>`;
}

/* ---- 1.1 metric table -------------------------------------------------------
 * A deliberately quiet "consulting" treatment: navy header, hairline gridlines,
 * light zebra, bold Site roll-ups, a pale navy band on the headline row, and
 * colour ONLY on the delta number. Nothing shouts, so the one row that matters
 * (overlap-adjusted uptime) is the thing the eye lands on.
 */
const NAVY = '#0C2340';
const BAND = '#E8ECF3';
const ZEBRA = '#F5F6F8';
const RULE = '#E3E6EB';
const CHARCOAL = '#2F3542';
const GAIN = '#1B7F5A';
const LOSS = '#B4462F';
const GROTESQUE = "font-family:Arial,Helvetica,'Segoe UI',Calibri,sans-serif";

/** Delta cell for the metric table: tinted text, never a filled cell. */
function metricDelta(m: MetricRow): string {
  const base = `padding:8px 12px;text-align:right;border-bottom:0.5px solid ${RULE};${GROTESQUE}`;
  if (m.delta === 0) return `<td style="${base};color:#9AA1AC">—</td>`;
  const text = m.kind === 'duration' ? formatDuration(Math.abs(m.delta))
    : m.kind === 'percent' ? `${Math.abs(m.delta).toFixed(2)}%`
      : String(Math.abs(m.delta));
  const sign = m.delta > 0 ? '+' : '−';
  // Improvement is green, regression terracotta — but which direction counts as
  // an improvement depends on the row, so it comes from the metric itself.
  const improved = m.higherIsBetter === null ? null : (m.delta > 0) === m.higherIsBetter;
  const colour = improved === null ? CHARCOAL : improved ? GAIN : LOSS;
  return `<td style="${base};color:${colour};font-weight:600">${sign}${text}</td>`;
}

function metricTable(cmp: UptimeComparison): string {
  const { siteNames } = cmp;
  const th = (label: string, align: string): string =>
    `<th style="padding:10px 12px;text-align:${align};color:#FFFFFF;font-weight:600;white-space:nowrap;${GROTESQUE}">${esc(label)}</th>`;

  const head = th('Metric', 'left')
    + siteNames.map((s) => {
      const connectors = cmp.connectorsBySite[s] ?? [];
      return connectors.map((c) => th(`${s} · C${c}`, 'right')).join('') + th(`${s} · Site`, 'right');
    }).join('')
    + th('Δ Site', 'right');

  const body = cmp.metrics.map((m, i) => {
    const headline = m.label === 'Uptime % (overlap-adjusted)';
    const zebra = i % 2 === 1 ? ZEBRA : '#FFFFFF';
    const rowBg = headline ? BAND : zebra;
    const weight = headline ? 'font-weight:700;' : '';
    const colour = headline ? `color:${NAVY};` : `color:${CHARCOAL};`;
    const cell = `padding:8px 12px;border-bottom:0.5px solid ${RULE};${GROTESQUE};${colour}${weight}`;
    const fmt = (v: number): string => m.kind === 'duration' ? formatDuration(v)
      : m.kind === 'percent' ? `${v.toFixed(2)}%` : String(v);

    const values = siteNames.map((s) => {
      const connectors = cmp.connectorsBySite[s] ?? [];
      const detail = connectors
        .map((c) => `<td style="${cell};text-align:right">${fmt(m.perConnector[s]?.[c] ?? 0)}</td>`)
        .join('');
      // Site roll-ups are bolded so they read apart from the C1/C2 detail.
      return detail + `<td style="${cell};text-align:right;font-weight:700">${fmt(m.site[s] ?? 0)}</td>`;
    }).join('');

    return `<tr style="background:${rowBg}">
      <td style="${cell}">${esc(m.label)}${headline ? ' — headline' : ''}</td>
      ${values}${metricDelta(m)}
    </tr>`;
  }).join('');

  return `
    <div class="overflow-x-auto mt-3 rounded-lg" style="border:0.5px solid ${RULE}">
      <table style="min-width:100%;border-collapse:collapse;background:#FFFFFF">
        <thead style="background:${NAVY}"><tr>${head}</tr></thead>
        <tbody>${body}</tbody>
      </table>
    </div>
    <p style="margin-top:6px;font-size:12px;color:#6B7280;${GROTESQUE}">
      Δ Site: <span style="color:${GAIN};font-weight:600">green</span> = improvement over ${esc(cmp.baselineSite)},
      <span style="color:${LOSS};font-weight:600">terracotta</span> = regression.
    </p>`;
}

export function renderUptimeComparison(cmp: UptimeComparison): string {
  const { siteNames } = cmp;

  const chargerRows = cmp.chargerLevel.map((r) => `
    <tr class="border-t border-gray-200 dark:border-gray-700">
      <td class="${TD}">${esc(r.errorDescription)}</td>
      ${siteNames.map((s) => `<td class="${TD}">${r.episodes[s] ?? 0}</td><td class="${TD} font-mono">${formatDuration(r.downtimeSec[s] ?? 0)}</td>`).join('')}
      <td class="${TD}">No</td>
    </tr>`).join('');

  return `
    <section id="uptime-comparison" class="${CARD} scroll-mt-4">
      <h3 class="text-lg font-bold text-gray-800 dark:text-gray-100">1) Uptime Comparison</h3>

      <h4 class="font-semibold text-gray-800 dark:text-gray-100 mt-5">1.1 Uptime &amp; downtime</h4>
      <p class="text-sm text-gray-600 dark:text-gray-300 mt-1">
        Δ is measured against <strong>${esc(cmp.baselineSite)}</strong> (the baseline site).
      </p>
      ${metricTable(cmp)}

      <h4 class="font-semibold text-gray-800 dark:text-gray-100 mt-6">1.2 Downtime by Error Code — line item</h4>
      <p class="text-xs text-gray-500 dark:text-gray-400">Counts EVERY category, not just those subtracted from uptime — so these totals are larger by design.</p>
      ${lineItemTable(cmp.byErrorCode, siteNames, 'Error Code')}

      <h4 class="font-semibold text-gray-800 dark:text-gray-100 mt-6">1.3 Downtime by Error Description — line item</h4>
      ${lineItemTable(cmp.byErrorDescription, siteNames, 'Error Description')}

      ${cmp.chargerLevel.length ? `
        <h4 class="font-semibold text-gray-800 dark:text-gray-100 mt-6">1.4 Connector 0 — charger-level fault downtime</h4>
        <div class="bg-amber-50 dark:bg-amber-900/20 border border-amber-300 dark:border-amber-700 text-amber-800 dark:text-amber-200 text-xs rounded p-3 mt-2">
          <strong>Non-additive.</strong> Measured against ONE log window, not one per connector, and not included in
          any figure above. PowerFailure is excluded here: its connector-0 events are zero-duration markers whose real
          restoration is carried by the Offline window.
        </div>
        <div class="overflow-x-auto mt-2"><table class="${TABLE}">
          <thead class="bg-gray-50 dark:bg-gray-700/50"><tr>
            <th class="${TH}">Error Description (connector 0)</th>
            ${siteNames.map((s) => `<th class="${TH}">${esc(s)} episodes</th><th class="${TH}">${esc(s)} downtime</th>`).join('')}
            <th class="${TH}">Counted in connectors?</th>
          </tr></thead><tbody>${chargerRows}</tbody>
        </table></div>` : ''}

      ${readoutBlock(cmp.readout)}
    </section>`;
}
