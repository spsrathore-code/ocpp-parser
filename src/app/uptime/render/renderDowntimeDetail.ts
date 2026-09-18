// 1.2 Downtime Detail — the paired, event-by-event table.
//
// Layout follows the supplied reference: a filtered-subtotal strip above the
// header, then Site | Connector | Category | Start | End | Duration | log row
// (Start) | log row (End) for each site, then the delta.
//
// Excel's frozen panes become a sticky header; its conditional formatting
// becomes a CSS class. Both are free here, and the table still exports through
// the shared Excel/PNG controls.

import { formatDuration, toIstIso } from '../duration';
import type { DetailRow, DetailSide, DowntimeDetail } from '../compare/downtimeDetail';

const esc = (s: string): string =>
  s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] as string));

const NAVY = '#0C2340';
const SUBTOTAL_BG = '#FFF9E6';
const ZEBRA = '#F5F6F8';
const RULE = '#E3E6EB';
const CHARCOAL = '#2F3542';
const MUTED = '#9AA1AC';
const ALERT_BG = '#FDE2E4';
const ALERT_TEXT = '#B4462F';
const GROTESQUE = "font-family:Arial,Helvetica,'Segoe UI',Calibri,sans-serif";

const th = (label: string, align: 'left' | 'right' | 'center' = 'left'): string =>
  `<th style="padding:8px 10px;text-align:${align};color:#FFFFFF;font-weight:600;white-space:nowrap;${GROTESQUE};font-size:12px">${esc(label)}</th>`;

function td(content: string, align: 'left' | 'right' = 'left', extra = ''): string {
  return `<td style="padding:6px 10px;text-align:${align};color:${CHARCOAL};border-bottom:0.5px solid ${RULE};white-space:nowrap;${GROTESQUE};font-size:12px;${extra}">${content}</td>`;
}

/** One site's eight columns. A missing counterpart keeps its labels, greyed,
 *  so filtering stays symmetrical and the absence is visible rather than a hole. */
function sideCells(site: string, row: DetailRow, side: DetailSide | null): string {
  const grey = side ? '' : `color:${MUTED};font-style:italic;`;
  const label = (text: string): string => td(esc(text), 'left', grey);
  if (!side) {
    return label(site) + td(String(row.connectorId), 'right', grey) + label(row.category)
      + td('', 'left') + td('', 'left') + td('', 'right') + td('', 'right') + td('', 'right');
  }
  return label(site)
    + td(String(row.connectorId), 'right')
    + label(row.category)
    + td(toIstIso(side.startUtc), 'left')
    + td(side.endUtc === null ? '<span style="color:#9AA1AC">unresolved</span>' : toIstIso(side.endUtc), 'left')
    + td(side.durationSec === null ? '—' : formatDuration(side.durationSec), 'right')
    + td(String(side.startRow), 'right')
    + td(side.endRow === null ? '—' : String(side.endRow), 'right');
}

function deltaCell(row: DetailRow, highlightMin: number): string {
  if (row.deltaMin === null) return td('', 'right');
  const material = Math.abs(row.deltaMin) > highlightMin;
  const sign = row.deltaMin > 0 ? '+' : row.deltaMin < 0 ? '−' : '+';
  const text = `${sign}${Math.abs(row.deltaMin).toFixed(1)}`;
  const style = material
    ? `background:${ALERT_BG};color:${ALERT_TEXT};font-weight:700;`
    : '';
  return td(text, 'right', style);
}

export function renderDowntimeDetail(detail: DowntimeDetail): string {
  const { siteA, siteB, highlightMin } = detail;

  const subtotal = `
    <tr style="background:${SUBTOTAL_BG}">
      <td colspan="4" style="padding:6px 10px;font-weight:700;color:${CHARCOAL};${GROTESQUE};font-size:12px">Filtered subtotal →</td>
      <td style="padding:6px 10px;text-align:right;font-weight:700;color:${CHARCOAL};${GROTESQUE};font-size:12px">${esc(siteA)}:</td>
      <td id="dd-total-a" style="padding:6px 10px;text-align:right;font-weight:700;color:${CHARCOAL};font-family:monospace;font-size:12px">${formatDuration(detail.totalASec)}</td>
      <td colspan="6"></td>
      <td style="padding:6px 10px;text-align:right;font-weight:700;color:${CHARCOAL};${GROTESQUE};font-size:12px">${esc(siteB)}:</td>
      <td id="dd-total-b" style="padding:6px 10px;text-align:right;font-weight:700;color:${CHARCOAL};font-family:monospace;font-size:12px">${formatDuration(detail.totalBSec)}</td>
      <td colspan="2"></td>
      <td id="dd-total-delta" style="padding:6px 10px;text-align:right;font-weight:700;color:${detail.deltaHours >= 0 ? ALERT_TEXT : '#1B7F5A'};${GROTESQUE};font-size:12px">${detail.deltaHours >= 0 ? '+' : '−'}${Math.abs(detail.deltaHours).toFixed(2)} hrs</td>
    </tr>`;

  const header = `
    <tr style="background:${NAVY}">
      ${th('Site')}${th('Connector', 'right')}${th('Category')}${th('Start (UTC)')}${th('End (UTC)')}${th('Duration', 'right')}${th(`${siteA} log row (Start)`, 'right')}${th(`${siteA} log row (End)`, 'right')}
      ${th('Site')}${th('Connector', 'right')}${th('Category')}${th('Start (UTC)')}${th('End (UTC)')}${th('Duration', 'right')}${th(`${siteB} log row (Start)`, 'right')}${th(`${siteB} log row (End)`, 'right')}
      ${th('Delta', 'right')}
    </tr>`;

  const body = detail.rows.map((row, i) => {
    const zebra = i % 2 === 1 ? ZEBRA : '#FFFFFF';
    const pairing = row.a && row.b ? 'matched' : row.a ? 'a-only' : 'b-only';
    const material = row.deltaMin !== null && Math.abs(row.deltaMin) > highlightMin;
    return `<tr class="dd-row" data-zebra="${zebra}"
      data-connector="${row.connectorId}" data-category="${esc(row.category)}"
      data-pairing="${pairing}" data-material="${material ? '1' : '0'}"
      data-delta="${row.deltaMin === null ? '' : row.deltaMin}"
      data-a-sec="${row.a?.durationSec ?? 0}" data-b-sec="${row.b?.durationSec ?? 0}"
      style="background:${zebra}">${sideCells(siteA, row, row.a)}${sideCells(siteB, row, row.b)}${deltaCell(row, highlightMin)}</tr>`;
  }).join('');

  const recon = detail.reconciliation.map((r) => {
    const oneSided = r.aOnly + r.bOnly;
    return `<tr style="border-top:0.5px solid ${RULE}">
      <td style="padding:6px 10px;${GROTESQUE};font-size:12px">${esc(r.category)}</td>
      <td style="padding:6px 10px;text-align:right;${GROTESQUE};font-size:12px;font-weight:600">${r.matched}</td>
      <td style="padding:6px 10px;text-align:right;${GROTESQUE};font-size:12px">${r.aOnly}</td>
      <td style="padding:6px 10px;text-align:right;${GROTESQUE};font-size:12px">${r.bOnly}</td>
      <td style="padding:6px 10px;text-align:right;${GROTESQUE};font-size:12px;${oneSided ? `color:${ALERT_TEXT};font-weight:600` : ''}">${oneSided}</td>
    </tr>`;
  }).join('');

  return `
    <h4 class="font-semibold text-gray-800 dark:text-gray-100 mt-6">1.2 Downtime Detail — event by event</h4>
    <p class="text-sm text-gray-600 dark:text-gray-300 mt-1">
      Every downtime event on both chargers, paired by start time within
      ${Math.round(detail.toleranceSec / 60)} minutes and grouped by connector then category.
      A greyed half means that site never logged a counterpart — so a large Δ there is a
      <em>missing event</em>, not a longer one. Deltas over ${highlightMin} minutes are highlighted.
    </p>
    <div id="dd-filters" class="flex flex-wrap items-end gap-3 mt-3">
      <div>
        <label class="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1" for="dd-category">Category</label>
        <select id="dd-category" class="rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 text-sm px-3 py-1.5">
          <option value="">All</option>
          ${detail.reconciliation.map((r) => `<option value="${esc(r.category)}">${esc(r.category)}</option>`).join('')}
        </select>
      </div>
      <div>
        <label class="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1" for="dd-connector">Connector</label>
        <select id="dd-connector" class="rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 text-sm px-3 py-1.5">
          <option value="">All</option>
          ${[...new Set(detail.rows.map((r) => r.connectorId))].sort((x, y) => x - y).map((c) => `<option value="${c}">C${c}</option>`).join('')}
        </select>
      </div>
      <div>
        <label class="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1" for="dd-pairing">Pairing</label>
        <select id="dd-pairing" class="rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 text-sm px-3 py-1.5">
          <option value="">All</option>
          <option value="matched">Matched on both sites</option>
          <option value="one-sided">Site-specific (one side only)</option>
          <option value="a-only">${esc(siteA)} only</option>
          <option value="b-only">${esc(siteB)} only</option>
        </select>
      </div>
      <div>
        <label class="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1" for="dd-delta">Delta</label>
        <select id="dd-delta" class="rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 text-sm px-3 py-1.5">
          <option value="">Any</option>
          <option value="material">Highlighted only (&gt; ${highlightMin} min)</option>
          <option value="pos">${esc(siteA)} worse (Δ &gt; 0)</option>
          <option value="neg">${esc(siteB)} worse (Δ &lt; 0)</option>
        </select>
      </div>
      <div>
        <label class="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1" for="dd-min">Min |Δ| (min)</label>
        <input id="dd-min" type="number" min="0" step="1" placeholder="0"
          class="w-24 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 text-sm px-3 py-1.5" />
      </div>
      <div class="text-xs text-gray-500 dark:text-gray-400 pb-1.5">
        <span id="dd-count">${detail.rows.length}</span> of ${detail.rows.length} events
      </div>
    </div>
    <div class="overflow-auto mt-2 rounded-lg" style="border:0.5px solid ${RULE};max-height:640px">
      <table style="min-width:100%;border-collapse:collapse;background:#FFFFFF">
        <thead style="position:sticky;top:0;z-index:5">${subtotal}${header}</thead>
        <tbody>${body}</tbody>
      </table>
    </div>

    <div class="mt-3 rounded-lg p-3 text-xs" style="background:#F5F6F8;border:0.5px solid ${RULE};color:${CHARCOAL};${GROTESQUE}">
      <strong>How this reconciles with 1.1.</strong>
      The subtotal above is the <strong>sum of every event</strong>, so a minute covered by two categories at once
      is counted twice. Section 1.1's <em>Total downtime</em> is the same events with overlaps merged, which is why
      it reads lower. Both are correct; they answer different questions.
      <div class="mt-2 font-mono">
        ${esc(siteA)} — events ${formatDuration(detail.totalASec)} · 1.1 total ${formatDuration(detail.mergedASec)} · overlap removed ${formatDuration(detail.totalASec - detail.mergedASec)}<br>
        ${esc(siteB)} — events ${formatDuration(detail.totalBSec)} · 1.1 total ${formatDuration(detail.mergedBSec)} · overlap removed ${formatDuration(detail.totalBSec - detail.mergedBSec)}
      </div>
      <div class="mt-2">Per category, the two sections agree exactly — filter by a category above and compare it with 1.3.</div>
    </div>

    <h5 class="font-semibold text-gray-800 dark:text-gray-100 mt-5 text-sm">Matched vs site-specific</h5>
    <p class="text-xs text-gray-500 dark:text-gray-400">
      Tells you whether a difference is real or just an event one charger never logged.
    </p>
    <div class="overflow-x-auto mt-2 rounded-lg" style="border:0.5px solid ${RULE};max-width:640px">
      <table style="min-width:100%;border-collapse:collapse;background:#FFFFFF">
        <thead style="background:${NAVY}"><tr>
          ${th('Category')}${th('Matched', 'right')}${th(`${siteA} only`, 'right')}${th(`${siteB} only`, 'right')}${th('Site-specific', 'right')}
        </tr></thead>
        <tbody>${recon}</tbody>
      </table>
    </div>`;
}
