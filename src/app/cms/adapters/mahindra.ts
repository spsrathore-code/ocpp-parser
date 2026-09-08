// Mahindra customer CMS-format adapter.
//
// Mahindra exports one sheet per charger (sheet name like
// "Logs_of_charger__MPCMHDC029_639") with the header on row 0 and columns:
// Event Name | Event Type | Request | Response | Created On.
//  - Request/Response are the paired OCPP CALL/CALLRESULT (same shape as CZ).
//  - Event Type ("Charger-CMS"/"CMS-Charger") only confirms direction — the shared
//    action-based §4/§5 mapping already derives it, so it is not needed here.
//  - Created On is a single IST wall-clock, read as FORMATTED TEXT and parsed as
//    d/m (see mahindraTimestamps for why the raw Excel serial must NOT be trusted).

import * as XLSX from 'xlsx';
import type { WorkBook, WorkSheet } from 'xlsx';
import type { CmsFormatAdapter, CmsRow } from '../types';
import { mahindraTimestampToUtcIso } from './mahindraTimestamps';
import { CALL_RE, type Cell, readTop, pickDataSheet, listLogSheets, findHeaderRow, colIndex, lowerHeaders, cellAt } from './sheetUtils';

/** Strip the "Logs_of_charger__" prefix Mahindra puts on sheet names → clean charger id. */
function cleanChargerId(sheetName: string): string {
  return sheetName.replace(/^logs?_of_charger_+/i, '') || sheetName;
}

/** Mahindra-distinctive header shape: "Event Name" + "Event Type" (with Created On). */
function looksMahindra(sheet: WorkSheet): boolean {
  const rows = readTop(sheet, 10);
  const headers = lowerHeaders(rows, findHeaderRow(rows));
  const hasEventName = headers.some((h) => h.includes('event') && h.includes('name'));
  const hasEventType = headers.some((h) => h.includes('event') && h.includes('type'));
  return hasEventName && hasEventType;
}

export const mahindraAdapter: CmsFormatAdapter = {
  id: 'mahindra',
  label: 'Mahindra',
  toUtcIso: mahindraTimestampToUtcIso,

  detect(workbook: WorkBook): boolean {
    const sheet = workbook.Sheets[pickDataSheet(workbook)];
    if (!sheet) return false;
    return looksMahindra(sheet);
  },

  listDataSheets(workbook: WorkBook): string[] {
    return listLogSheets(workbook, looksMahindra);
  },

  /** Unchanged behaviour for the CMS Log Parser: the single best-scoring sheet. */
  extractRows(workbook: WorkBook): CmsRow[] {
    return mahindraAdapter.extractRowsFromSheet!(workbook, pickDataSheet(workbook));
  },

  extractRowsFromSheet(workbook: WorkBook, sheetName: string): CmsRow[] {
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) return [];
    // raw:false → date cells become their display string ("2/7/26 15:19") rather than
    // the unreliable serial (parseCmsWorkbook keeps cellNF:true so this can format).
    const data = XLSX.utils.sheet_to_json<Cell[]>(sheet, { header: 1, blankrows: false, raw: false });
    if (data.length < 2) return [];

    const headerRow = findHeaderRow(data);
    const lc = (data[headerRow] || []).map((c) => String(c ?? '').trim().toLowerCase());

    const reqCol = colIndex(lc, (h) => h === 'request' || (h.includes('request') && !h.includes('time')));
    const respCol = colIndex(lc, (h) => h === 'response' || (h.includes('response') && !h.includes('time')));
    const createdCol = colIndex(lc, (h) => h.replace(/\s/g, '') === 'createdon' || h.includes('created') || h.includes('time') || h.includes('date'));

    const charger = cleanChargerId(sheetName);
    const out: CmsRow[] = [];
    for (let r = headerRow + 1; r < data.length; r++) {
      const row = data[r] || [];
      const requestString = cellAt(row, reqCol);
      if (!requestString || !CALL_RE.test(requestString)) continue; // only OCPP CALL rows
      const created = cellAt(row, createdCol); // single 'Created On' timestamp
      out.push({
        requestString,
        responseString: cellAt(row, respCol),
        requestTime: created,
        // Mahindra logs one 'Created On' per message — there is NO separate response
        // time, so leave it blank (→ Response Time (ms) reads N/A, not a fake 0).
        responseTime: '',
        sheetName: charger,
      });
    }
    return out;
  },
};
