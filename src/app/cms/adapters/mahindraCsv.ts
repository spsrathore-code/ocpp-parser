// Mahindra CSV CMS-format adapter.
//
// The portal exports a charger's log as CSV with columns:
//   Event Name | Event Type | Request | Response | Created On
// Rows are NEWEST-FIRST and are reversed here to chronological order.
//
// `Event Type` is NOT used for direction. It mislabels CSMS-initiated operations
// on the real export (42 RemoteStartTransaction, 29 RemoteStopTransaction,
// 6 TriggerMessage = 77 rows), while every CP-initiated action is labelled
// correctly — so trusting it looks right on 96% of rows and then mis-threads every
// remote-start. Direction comes from the action via ../directions.ts. Disagreements
// are counted so the CMS-side data-quality issue is reported, not hidden.
//
// Caveat: the count is indicative, not exact. ../directions.ts assumes
// `DataTransfer` is always CP-initiated, though OCPP 1.6J allows it in either
// direction, so a legitimately CSMS-originated `DataTransfer` row would register
// as a false-positive mismatch even though the CMS labelled it correctly.

import type { CmsCsvFormatAdapter, CmsCsvExtraction, CmsRow } from '../types';
import { mahindraCsvTimestampToUtcIso } from './mahindraCsvTimestamps';
import { isCpInitiated } from '../directions';

const CALL_RE = /^\s*\[\s*2\s*,/;
/** The portal writes this instead of a payload when the charger never answered. */
const AWAITING_RE = /awaiting response/i;

const norm = (s: string) => String(s ?? '').trim().toLowerCase();

/** "Logs_of_charger__MPCKADC060_639229316915356646.csv" -> "MPCKADC060". */
export function chargerIdFromFileName(fileName: string): string {
  const base = fileName.replace(/\.csv$/i, '');
  const stripped = base.replace(/^logs?_of_charger_+/i, '');
  return stripped.replace(/_\d{6,}$/, '') || base || fileName;
}

function colIndex(header: string[], want: string): number {
  return header.findIndex((h) => norm(h).replace(/\s+/g, '') === want);
}

export const mahindraCsvAdapter: CmsCsvFormatAdapter = {
  id: 'mahindra-csv',
  label: 'Mahindra (CSV)',
  toUtcIso: mahindraCsvTimestampToUtcIso,

  detect(headerRow: string[]): boolean {
    const h = (headerRow ?? []).map((c) => norm(c).replace(/\s+/g, ''));
    return h.includes('eventname') && h.includes('eventtype')
        && h.includes('request') && h.includes('createdon');
  },

  extractRows(grid: string[][], fileName: string): CmsCsvExtraction {
    if (grid.length < 2) return { rows: [], directionMismatches: 0 };
    const header = grid[0];
    const nameCol = colIndex(header, 'eventname');
    const typeCol = colIndex(header, 'eventtype');
    const reqCol = colIndex(header, 'request');
    const respCol = colIndex(header, 'response');
    const createdCol = colIndex(header, 'createdon');

    const charger = chargerIdFromFileName(fileName);
    const rows: CmsRow[] = [];
    let directionMismatches = 0;

    for (let r = 1; r < grid.length; r++) {
      const row = grid[r] ?? [];
      const requestString = String(row[reqCol] ?? '').trim();
      if (!CALL_RE.test(requestString)) continue; // only OCPP CALL rows

      const action = String(row[nameCol] ?? '').trim();
      const labelled = norm(row[typeCol] ?? '');
      if (labelled) {
        const expected = isCpInitiated(action) ? 'charger-cms' : 'cms-charger';
        if (labelled !== expected) directionMismatches++;
      }

      const rawResp = String(row[respCol] ?? '').trim();
      rows.push({
        requestString,
        // The awaiting placeholder is not a CALLRESULT — drop it so correlation
        // reports the message as unanswered instead of trying to parse prose.
        responseString: AWAITING_RE.test(rawResp) ? '' : rawResp,
        requestTime: String(row[createdCol] ?? '').trim(),
        // One 'Created On' per row: no separate response time, so leave it blank
        // (-> Response Time (ms) reads N/A, not a fabricated 0).
        responseTime: '',
        sheetName: charger,
      });
    }

    rows.reverse(); // the portal exports newest-first
    return { rows, directionMismatches };
  },
};
