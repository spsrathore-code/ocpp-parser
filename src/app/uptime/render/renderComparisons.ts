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

/* ---- shared table treatment (section 1) -------------------------------------
 * A deliberately quiet "consulting" look: navy header, hairline gridlines, light
 * zebra, bold roll-ups, a pale navy band on the headline row, and colour ONLY on
 * delta numbers. Nothing shouts, so the figures that matter are what the eye
 * lands on. Used by every table in section 1 so they read as one family.
 */
const NAVY = '#0C2340';
const BAND = '#E8ECF3';
const ZEBRA = '#F5F6F8';
const RULE = '#E3E6EB';
const RULE_STRONG = '#CBD2DC';
const CHARCOAL = '#2F3542';
const GAIN = '#1B7F5A';
const LOSS = '#B4462F';
const MUTED = '#9AA1AC';
const GROTESQUE = "font-family:Arial,Helvetica,'Segoe UI',Calibri,sans-serif";

/** Navy header cell. */
function navyTh(label: string, align: 'left' | 'right'): string {
  return `<th style="padding:10px 12px;text-align:${align};color:#FFFFFF;font-weight:600;white-space:nowrap;${GROTESQUE}">${esc(label)}</th>`;
}

/** Body cell. `strong` bolds a roll-up; `total` adds the separating top rule. */
function bodyTd(
  content: string,
  align: 'left' | 'right',
  opts: { strong?: boolean; total?: boolean } = {},
): string {
  const weight = opts.strong ? 'font-weight:700;' : '';
  const top = opts.total ? `border-top:1px solid ${RULE_STRONG};` : '';
  return `<td style="padding:8px 12px;text-align:${align};color:${CHARCOAL};border-bottom:0.5px solid ${RULE};${top}${weight}${GROTESQUE}">${content}</td>`;
}

/** The shared table shell: navy head, hairline body, rounded hairline frame. */
function styledTable(head: string, body: string): string {
  return `
    <div class="overflow-x-auto mt-3 rounded-lg" style="border:0.5px solid ${RULE}">
      <table style="min-width:100%;border-collapse:collapse;background:#FFFFFF">
        <thead style="background:${NAVY}"><tr>${head}</tr></thead>
        <tbody>${body}</tbody>
      </table>
    </div>`;
}

/**
 * Tinted delta text — colour on the number only, never a filled cell.
 * Which direction counts as an improvement differs per row, so the caller says.
 */
function deltaText(value: number, render: (v: number) => string, higherIsBetter: boolean | null): string {
  if (value === 0) return `<span style="color:${MUTED}">—</span>`;
  const sign = value > 0 ? '+' : '−';
  const improved = higherIsBetter === null ? null : (value > 0) === higherIsBetter;
  const colour = improved === null ? CHARCOAL : improved ? GAIN : LOSS;
  return `<span style="color:${colour};font-weight:600">${sign}${render(Math.abs(value))}</span>`;
}

/** 1.1 — the headline metric table. */
function metricTable(cmp: UptimeComparison): string {
  const { siteNames } = cmp;
  const head = navyTh('Metric', 'left')
    + siteNames.map((s) => {
      const connectors = cmp.connectorsBySite[s] ?? [];
      return connectors.map((c) => navyTh(`${s} · C${c}`, 'right')).join('') + navyTh(`${s} · Site`, 'right');
    }).join('')
    + navyTh('Δ Site', 'right');

  const body = cmp.metrics.map((m, i) => {
    const headline = m.label === 'Uptime %';
    const rowBg = headline ? BAND : (i % 2 === 1 ? ZEBRA : '#FFFFFF');
    const tone = headline ? `color:${NAVY};font-weight:700;` : `color:${CHARCOAL};`;
    const cell = `padding:8px 12px;border-bottom:0.5px solid ${RULE};${GROTESQUE};${tone}`;
    const fmt = (v: number): string => m.kind === 'duration' ? formatDuration(v)
      : m.kind === 'percent' ? `${v.toFixed(2)}%` : String(v);
    const render = (v: number): string => m.kind === 'duration' ? formatDuration(v)
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
      ${values}
      <td style="${cell};text-align:right">${deltaText(m.delta, render, m.higherIsBetter)}</td>
    </tr>`;
  }).join('');

  // The overlap correction is evidence for the headline, not a metric to quote,
  // so it sits in a footnote instead of its own row.
  const overlap = cmp.siteNames
    .filter((s) => (cmp.overlapRemovedSec[s] ?? 0) > 0)
    .map((s) => `${esc(s)} ${formatDuration(cmp.overlapRemovedSec[s])}`)
    .join(', ');

  return `
    ${styledTable(head, body)}
    <p style="margin-top:8px;font-size:12px;color:#6B7280;line-height:1.55;${GROTESQUE}">
      <strong style="color:${CHARCOAL}">The category rows do not sum to Total downtime, by design.</strong>
      Each category is measured independently and they overlap — one power cut shows up as
      <em>PowerFailure</em> (the connector recovering) and as <em>Offline</em> (the charger unreachable while it
      reboots). Adding them would count the same minute twice, so <strong style="color:${CHARCOAL}">Total downtime is
      their union</strong>, not their sum.
      ${overlap ? `Double-counting removed: ${overlap}.` : 'No outages overlapped.'}
      <br>
      Δ Site: <span style="color:${GAIN};font-weight:600">green</span> = improvement over ${esc(cmp.baselineSite)},
      <span style="color:${LOSS};font-weight:600">terracotta</span> = regression.
    </p>`;
}

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

function lineItemTable(rows: LineItemRow[], siteNames: string[], keyLabel: string): string {
  const totals = siteNames.map((s) => ({
    events: rows.reduce((n, r) => n + (r.events[s] ?? 0), 0),
    seconds: rows.reduce((n, r) => n + (r.downtimeSec[s] ?? 0), 0),
  }));

  const head = navyTh(keyLabel, 'left')
    + siteNames.map((s) => navyTh(`${s} events`, 'right') + navyTh(`${s} downtime`, 'right')).join('')
    + navyTh('Δ downtime', 'right');

  const body = rows.map((r, i) => {
    const zebra = i % 2 === 1 ? ZEBRA : '#FFFFFF';
    const cells = siteNames
      .map((s) => bodyTd(String(r.events[s] ?? 0), 'right') + bodyTd(formatDuration(r.downtimeSec[s] ?? 0), 'right'))
      .join('');
    // More downtime is always the worse outcome here, so the tint is fixed.
    const delta = bodyTd(deltaText(r.deltaSec, formatDuration, false), 'right');
    return `<tr style="background:${zebra}">${bodyTd(esc(r.key), 'left')}${cells}${delta}</tr>`;
  }).join('');

  const totalRow = `<tr style="background:#FFFFFF">
    ${bodyTd('Total', 'left', { strong: true, total: true })}
    ${totals.map((t) => bodyTd(String(t.events), 'right', { strong: true, total: true })
      + bodyTd(formatDuration(t.seconds), 'right', { strong: true, total: true })).join('')}
    ${bodyTd('', 'right', { total: true })}
  </tr>`;

  return styledTable(head, body + totalRow);
}

/** 1.4 — connector-0 downtime. No delta: the block is explicitly non-additive. */
function chargerLevelTable(cmp: UptimeComparison): string {
  const { siteNames } = cmp;
  const head = navyTh('Error description (connector 0)', 'left')
    + siteNames.map((s) => navyTh(`${s} episodes`, 'right') + navyTh(`${s} downtime`, 'right')).join('')
    + navyTh('Counted in connectors?', 'right');

  const body = cmp.chargerLevel.map((r, i) => {
    const zebra = i % 2 === 1 ? ZEBRA : '#FFFFFF';
    const cells = siteNames
      .map((s) => bodyTd(String(r.episodes[s] ?? 0), 'right') + bodyTd(formatDuration(r.downtimeSec[s] ?? 0), 'right'))
      .join('');
    return `<tr style="background:${zebra}">${bodyTd(esc(r.errorDescription), 'left')}${cells}${bodyTd('No', 'right')}</tr>`;
  }).join('');

  return styledTable(head, body);
}

export function renderUptimeComparison(cmp: UptimeComparison): string {
  const { siteNames } = cmp;

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
        ${chargerLevelTable(cmp)}` : ''}

      ${readoutBlock(cmp.readout)}
    </section>`;
}
