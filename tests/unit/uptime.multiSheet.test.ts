import { describe, it, expect } from 'vitest';
import * as XLSX from 'xlsx';
import { mahindraAdapter } from '../../src/app/cms/adapters/mahindra';
import { czAdapter } from '../../src/app/cms/adapters/cz';

// The Uptime view treats one sheet as one site, because the reference workbook
// holds both sites as two sheets of one file and Mahindra exports one sheet per
// charger. Both adapters' extractRows() call pickDataSheet(), which returns the
// single best-scoring sheet — so without listDataSheets() the Uptime view would
// analyze one site and SILENTLY DROP the rest. That is the failure this file
// exists to prevent.

const MAHINDRA_HEADER = ['Event Name', 'Event Type', 'Request', 'Response', 'Created On'];

function mahindraRow(action: string, when: string): (string | number)[] {
  return [
    action,
    'Charger-CMS',
    `[2,"id-${action}-${when}","${action}",{"connectorId":1}]`,
    `[3,"id-${action}-${when}",{"currentTime":"2026-08-11T00:0${when}:00.000Z"}]`,
    `11/08/2026 00:0${when}:00`,
  ];
}

/** A workbook with two charger sheets plus a computed sheet that must be ignored. */
function twoSiteWorkbook(): XLSX.WorkBook {
  const wb = XLSX.utils.book_new();
  const dc052 = XLSX.utils.aoa_to_sheet([MAHINDRA_HEADER, mahindraRow('Heartbeat', '1'), mahindraRow('StatusNotification', '2')]);
  const dc053 = XLSX.utils.aoa_to_sheet([MAHINDRA_HEADER, mahindraRow('Heartbeat', '3')]);
  // A derived/analysis sheet: no OCPP CALL strings, so it is not a log sheet.
  const summary = XLSX.utils.aoa_to_sheet([['Metric', 'Value'], ['Uptime %', '97.87%']]);
  XLSX.utils.book_append_sheet(wb, dc052, 'DC052 CMS Logs');
  XLSX.utils.book_append_sheet(wb, dc053, 'DC053 CMS Logs');
  XLSX.utils.book_append_sheet(wb, summary, 'Uptime_Comparison');
  return wb;
}

describe('mahindraAdapter.listDataSheets', () => {
  it('finds every log sheet, not just the best-scoring one', () => {
    const sheets = mahindraAdapter.listDataSheets!(twoSiteWorkbook());
    expect(sheets).toEqual(['DC052 CMS Logs', 'DC053 CMS Logs']);
  });

  it('excludes computed sheets that carry no OCPP CALL rows', () => {
    expect(mahindraAdapter.listDataSheets!(twoSiteWorkbook())).not.toContain('Uptime_Comparison');
  });
});

describe('mahindraAdapter.extractRowsFromSheet', () => {
  it('extracts only the named sheet, tagging rows with that sheet as the site', () => {
    const wb = twoSiteWorkbook();
    const rows = mahindraAdapter.extractRowsFromSheet!(wb, 'DC053 CMS Logs');
    expect(rows).toHaveLength(1);
    expect(rows[0].sheetName).toBe('DC053 CMS Logs');
    expect(rows[0].requestString).toContain('"Heartbeat"');
  });

  it('reaches a sheet that pickDataSheet would not have chosen', () => {
    const wb = twoSiteWorkbook();
    // DC052 scores higher (2 CALL rows vs 1), so extractRows() returns DC052.
    // Uptime must still be able to reach DC053 — the whole point of the change.
    expect(mahindraAdapter.extractRows(wb)).toHaveLength(2);
    expect(mahindraAdapter.extractRowsFromSheet!(wb, 'DC053 CMS Logs')).toHaveLength(1);
  });

  it('every listed sheet together covers all rows in the workbook', () => {
    const wb = twoSiteWorkbook();
    const total = mahindraAdapter
      .listDataSheets!(wb)
      .reduce((n, name) => n + mahindraAdapter.extractRowsFromSheet!(wb, name).length, 0);
    expect(total).toBe(3);
  });
});

// The CMS Log Parser view must be behaviourally unchanged by this refactor:
// extractRows() still means "the single best sheet".
describe('extractRows regression — single-sheet behaviour preserved', () => {
  it('mahindra extractRows still returns only the best-scoring sheet', () => {
    const rows = mahindraAdapter.extractRows(twoSiteWorkbook());
    expect(rows).toHaveLength(2);
    expect(new Set(rows.map((r) => r.sheetName))).toEqual(new Set(['DC052 CMS Logs']));
  });

  it('cz adapter also exposes the multi-sheet seam', () => {
    expect(typeof czAdapter.listDataSheets).toBe('function');
    expect(typeof czAdapter.extractRowsFromSheet).toBe('function');
  });
});
