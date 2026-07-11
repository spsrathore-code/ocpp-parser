// Shared Excel-sheet helpers for CMS format adapters (sheet-scoring, header/column
// detection). Ported from the proven archive logic; used by every customer adapter
// so the per-customer files only encode what is genuinely customer-specific.

import * as XLSX from 'xlsx';
import type { WorkBook, WorkSheet } from 'xlsx';

export type Cell = string | number | boolean | null | undefined;

/** OCPP CALL marker used to score which sheet actually holds the logs, and to keep only CALL rows. */
export const CALL_RE = /\[\s*2\s*,\s*"/;

/** Read the first `maxRows` rows of a sheet as an array-of-arrays (memory-lean). */
export function readTop(ws: WorkSheet, maxRows: number): Cell[][] {
  let range = ws['!ref'];
  if (range) {
    const r = XLSX.utils.decode_range(range);
    r.e.r = Math.min(r.e.r, r.s.r + maxRows - 1);
    range = XLSX.utils.encode_range(r);
  }
  return XLSX.utils.sheet_to_json<Cell[]>(ws, { header: 1, range, blankrows: false });
}

/** Pick the sheet richest in OCPP CALL arrays; fall back to the first sheet. */
export function pickDataSheet(workbook: WorkBook): string {
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
export function findHeaderRow(rows: Cell[][]): number {
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

/** First column index whose lowercased header matches `pred`, or -1. */
export function colIndex(headers: string[], pred: (h: string) => boolean): number {
  return headers.findIndex((h) => pred(h));
}

/** Lowercased header row at the detected header index. */
export function lowerHeaders(rows: Cell[][], headerRow: number): string[] {
  return (rows[headerRow] || []).map((c) => String(c ?? '').toLowerCase());
}

/** Cell value as a trimmed string, or '' if absent. */
export function cellAt(row: Cell[], i: number): string {
  return i >= 0 && row[i] != null ? String(row[i]) : '';
}
