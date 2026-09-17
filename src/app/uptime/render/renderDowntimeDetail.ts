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
      <td style="padding:6px 10px;text-align:right;font-weight:700;color:${CHARCOAL};font-family:monospace;font-size:12px">${formatDuration(detail.totalASec)}</td>
      <td colspan="6"></td>
      <td style="padding:6px 10px;text-align:right;font-weight:700;color:${CHARCOAL};${GROTESQUE};font-size:12px">${esc(siteB)}:</td>
      <td style="padding:6px 10px;text-align:right;font-weight:700;color:${CHARCOAL};font-family:monospace;font-size:12px">${formatDuration(detail.totalBSec)}</td>
      <td colspan="2"></td>
      <td style="padding:6px 10px;text-align:right;font-weight:700;color:${detail.deltaHours >= 0 ? ALERT_TEXT : '#1B7F5A'};${GROTESQUE};font-size:12px">${detail.deltaHours >= 0 ? '+' : '−'}${Math.abs(detail.deltaHours).toFixed(2)} hrs</td>
    </tr>`;

  const header = `
    <tr style="background:${NAVY}">
      ${th('Site')}${th('Connector', 'right')}${th('Category')}${th('Start (UTC)')}${th('End (UTC)')}${th('Duration', 'right')}${th(`${siteA} log row (Start)`, 'right')}${th(`${siteA} log row (End)`, 'right')}
      ${th('Site')}${th('Connector', 'right')}${th('Category')}${th('Start (UTC)')}${th('End (UTC)')}${th('Duration', 'right')}${th(`${siteB} log row (Start)`, 'right')}${th(`${siteB} log row (End)`, 'right')}
      ${th(`Duration Delta (${siteA} − ${siteB}) — row: min | subtotal: hrs`, 'right')}
    </tr>`;

  const body = detail.rows.map((row, i) => {
    const zebra = i % 2 === 1 ? ZEBRA : '#FFFFFF';
    return `<tr style="background:${zebra}">${sideCells(siteA, row, row.a)}${sideCells(siteB, row, row.b)}${deltaCell(row, highlightMin)}</tr>`;
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
    <div class="overflow-auto mt-3 rounded-lg" style="border:0.5px solid ${RULE};max-height:640px">
      <table style="min-width:100%;border-collapse:collapse;background:#FFFFFF">
        <thead style="position:sticky;top:0;z-index:1">${subtotal}${header}</thead>
        <tbody>${body}</tbody>
      </table>
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
