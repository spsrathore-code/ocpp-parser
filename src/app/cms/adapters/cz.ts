// CZ customer CMS-format adapter.
//
// CZ exports one sheet per charger (sheet name = charger id, e.g. "MH0055") with
// a 3-row preamble then columns: Sr No. | Request String | Response String |
// Request Time | Response Time. Sheet-scoring, header/column detection and the
// CreatedOn single-timestamp variant are ported from the proven archive logic
// (archive/OCPP Transaction Simulator Extended V3_17 Aug.html ~L1618-1760); the
// bespoke per-message parsing there is intentionally NOT ported — CmsRows feed the
// shared modern pipeline instead. Shared sheet helpers live in ./sheetUtils.

import * as XLSX from 'xlsx';
import type { WorkBook } from 'xlsx';
import type { CmsFormatAdapter, CmsRow } from '../types';
import { istToUtcIso } from '../timestamps';
import { CALL_RE, type Cell, readTop, pickDataSheet, findHeaderRow, colIndex, lowerHeaders, cellAt } from './sheetUtils';

export const czAdapter: CmsFormatAdapter = {
  id: 'cz',
  label: 'CZ',
  toUtcIso: istToUtcIso,

  detect(workbook: WorkBook): boolean {
    const sheet = workbook.Sheets[pickDataSheet(workbook)];
    if (!sheet) return false;
    const rows = readTop(sheet, 10);
    const headers = lowerHeaders(rows, findHeaderRow(rows));
    // CZ-distinctive: the paired "…String" request/response columns (and/or "Sr No.").
    // Requiring the "string" suffix avoids matching other customers (e.g. Mahindra's
    // bare Request/Response columns).
    const hasReqString = headers.some((h) => h.includes('request') && h.includes('string'));
    const hasRespString = headers.some((h) => h.includes('response') && h.includes('string'));
    const hasSrNo = headers.some((h) => h.startsWith('sr'));
    return (hasReqString && hasRespString) || (hasReqString && hasSrNo);
  },

  extractRows(workbook: WorkBook): CmsRow[] {
    const sheetName = pickDataSheet(workbook);
    const sheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json<Cell[]>(sheet, { header: 1, blankrows: false });
    if (data.length < 2) return [];

    const headerRow = findHeaderRow(data);
    const lc = (data[headerRow] || []).map((c) => String(c ?? '').trim().toLowerCase());

    const reqCol = colIndex(lc, (h) => h.includes('request') && h.includes('string')) >= 0
      ? colIndex(lc, (h) => h.includes('request') && h.includes('string'))
      : colIndex(lc, (h) => h.includes('request') || h.includes('message') || h.includes('content'));
    const respCol = colIndex(lc, (h) => h.includes('response'));
    const reqTimeCol = colIndex(lc, (h) => h.includes('request') && h.includes('time'));
    const respTimeCol = colIndex(lc, (h) => h.includes('response') && h.includes('time'));
    const srCol = colIndex(lc, (h) => h.startsWith('sr') || h.includes('serial'));
    // CreatedOn single-timestamp variant: one time column mirrored to both.
    const createdCol = colIndex(lc, (h) => h.replace(/\s/g, '') === 'createdon' || h === 'created' || (h.includes('time') && reqTimeCol < 0));

    const out: CmsRow[] = [];
    for (let r = headerRow + 1; r < data.length; r++) {
      const row = data[r] || [];
      const requestString = cellAt(row, reqCol);
      if (!requestString || !CALL_RE.test(requestString)) continue; // only OCPP CALL rows
      const reqTime = cellAt(row, reqTimeCol) || cellAt(row, createdCol);
      const respTime = cellAt(row, respTimeCol) || cellAt(row, createdCol);
      out.push({
        srNo: cellAt(row, srCol) || undefined,
        requestString,
        responseString: cellAt(row, respCol),
        requestTime: reqTime,
        responseTime: respTime,
        sheetName,
      });
    }
    return out;
  },
};
