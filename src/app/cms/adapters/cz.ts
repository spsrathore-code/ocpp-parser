// CZ customer CMS-format adapter.
//
// CZ exports one sheet per charger (sheet name = charger id, e.g. "MH0055") with
// a 3-row preamble then columns: Sr No. | Request String | Response String |
// Request Time | Response Time. Sheet-scoring, header/column detection and the
// CreatedOn single-timestamp variant are ported from the proven archive logic
// (archive/OCPP Transaction Simulator Extended V3_17 Aug.html ~L1618-1760); the
// bespoke per-message parsing there is intentionally NOT ported — CmsRows feed the
// shared modern pipeline instead.

import * as XLSX from 'xlsx';
import type { WorkBook, WorkSheet } from 'xlsx';
import type { CmsFormatAdapter, CmsRow } from '../types';

type Cell = string | number | boolean | null | undefined;

/** OCPP CALL marker used to score which sheet actually holds the logs. */
const CALL_RE = /\[\s*2\s*,\s*"/;

/** Read the first `maxRows` rows of a sheet as an array-of-arrays (memory-lean). */
function readTop(ws: WorkSheet, maxRows: number): Cell[][] {
  let range = ws['!ref'];
  if (range) {
    const r = XLSX.utils.decode_range(range);
    r.e.r = Math.min(r.e.r, r.s.r + maxRows - 1);
    range = XLSX.utils.encode_range(r);
  }
  return XLSX.utils.sheet_to_json<Cell[]>(ws, { header: 1, range, blankrows: false });
}

/** Pick the sheet richest in OCPP CALL arrays; fall back to the first sheet. */
function pickDataSheet(workbook: WorkBook): string {
  let bestName: string | null = null;
  let bestScore = -1;
  for (const name of workbook.SheetNames) {
    try {
      const rows = readTop(workbook.Sheets[name], 30);
      let score = 0;
      for (const row of rows) {
        for (const cell of row || []) {
          if (typeof cell === 'string' && CALL_RE.test(cell)) score++;
        }
      }
      if (score > bestScore) { bestScore = score; bestName = name; }
    } catch { /* unreadable sheet — skip */ }
  }
  return bestName || workbook.SheetNames[0];
}

/** Locate the header row: the first of the first 5 rows with a Request-ish and a Time/Date-ish cell. */
function findHeaderRow(rows: Cell[][]): number {
  for (let i = 0; i < Math.min(5, rows.length); i++) {
    const row = rows[i];
    if (!row || row.length < 2) continue;
    const cells = row.map((c) => String(c ?? '').toLowerCase());
    const hasReq = cells.some((c) => c.includes('request') || c.includes('message') || c.includes('string'));
    const hasTime = cells.some((c) => c.includes('time') || c.includes('date') || c.includes('created'));
    if (hasReq && hasTime) return i;
  }
  return 0;
}

/** First column index whose header matches `pred`, or -1. */
function colIndex(headers: string[], pred: (h: string) => boolean): number {
  return headers.findIndex((h) => pred(h));
}

export const czAdapter: CmsFormatAdapter = {
  id: 'cz',
  label: 'CZ',

  detect(workbook: WorkBook): boolean {
    const sheet = workbook.Sheets[pickDataSheet(workbook)];
    if (!sheet) return false;
    const rows = readTop(sheet, 10);
    const headers = (rows[findHeaderRow(rows)] || []).map((c) => String(c ?? '').toLowerCase());
    const hasRequest = headers.some((h) => h.includes('request'));
    const hasResponse = headers.some((h) => h.includes('response'));
    return hasRequest && hasResponse;
  },

  extractRows(workbook: WorkBook): CmsRow[] {
    const sheetName = pickDataSheet(workbook);
    const sheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json<Cell[]>(sheet, { header: 1, blankrows: false });
    if (data.length < 2) return [];

    const headerRow = findHeaderRow(data);
    const headers = (data[headerRow] || []).map((c) => String(c ?? '').trim());
    const lc = headers.map((h) => h.toLowerCase());

    const reqCol = colIndex(lc, (h) => h.includes('request') && h.includes('string')) >= 0
      ? colIndex(lc, (h) => h.includes('request') && h.includes('string'))
      : colIndex(lc, (h) => h.includes('request') || h.includes('message') || h.includes('content'));
    const respCol = colIndex(lc, (h) => h.includes('response'));
    const reqTimeCol = colIndex(lc, (h) => h.includes('request') && h.includes('time'));
    const respTimeCol = colIndex(lc, (h) => h.includes('response') && h.includes('time'));
    const srCol = colIndex(lc, (h) => h.startsWith('sr') || h.includes('serial'));
    // CreatedOn single-timestamp variant: one time column mirrored to both.
    const createdCol = colIndex(lc, (h) => h.replace(/\s/g, '') === 'createdon' || h === 'created' || (h.includes('time') && reqTimeCol < 0));

    const at = (row: Cell[], i: number): string => (i >= 0 && row[i] != null ? String(row[i]) : '');

    const out: CmsRow[] = [];
    for (let r = headerRow + 1; r < data.length; r++) {
      const row = data[r] || [];
      const requestString = at(row, reqCol);
      if (!requestString || !CALL_RE.test(requestString)) continue; // only OCPP CALL rows
      const reqTime = at(row, reqTimeCol) || at(row, createdCol);
      const respTime = at(row, respTimeCol) || at(row, createdCol);
      out.push({
        srNo: at(row, srCol) || undefined,
        requestString,
        responseString: at(row, respCol),
        requestTime: reqTime,
        responseTime: respTime,
        sheetName,
      });
    }
    return out;
  },
};
