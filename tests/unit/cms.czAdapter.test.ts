import { describe, it, expect } from 'vitest';
import * as XLSX from 'xlsx';
import { czAdapter } from '../../src/app/cms/adapters/cz';

/** Build a workbook that mimics the CZ CMS export layout. */
function czWorkbook(sheetName = 'MH0055', extraSheets: Record<string, unknown[][]> = {}): XLSX.WorkBook {
  const aoa = [
    ['Date', '08/08/2025, 00:00:00 - 09/08/2025, 23:59:59', '', '', '', ''],
    ['charger logs', '', '', '', '', ''],
    ['Sr No.', 'Request String', 'Response String', 'Request Time', 'Response Time', ''],
    ['1593', '[2,"uuid-hb","Heartbeat",{}]', '[3,"uuid-hb",{"currentTime":"2025-08-07T18:32:42.764Z"}]', '08/08/2025, 00:02:42', '08/08/2025, 00:02:42', ''],
    ['1594', '[2,"uuid-sn","StatusNotification",{"connectorId":1,"errorCode":"NoError","status":"Available"}]', '[3,"uuid-sn",{}]', '08/08/2025, 00:03:10', '08/08/2025, 00:03:10', ''],
  ];
  const wb = XLSX.utils.book_new();
  for (const [name, rows] of Object.entries(extraSheets)) {
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), name);
  }
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(aoa), sheetName);
  return wb;
}

describe('czAdapter.detect', () => {
  it('recognizes a CZ workbook (paired Request/Response columns)', () => {
    expect(czAdapter.detect(czWorkbook())).toBe(true);
  });

  it('rejects an unrelated workbook', () => {
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([['Name', 'Age'], ['x', 1]]), 'Sheet1');
    expect(czAdapter.detect(wb)).toBe(false);
  });
});

describe('czAdapter.extractRows', () => {
  it('extracts normalized CmsRows from the data sheet', () => {
    const rows = czAdapter.extractRows(czWorkbook());
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({
      srNo: '1593',
      requestString: '[2,"uuid-hb","Heartbeat",{}]',
      requestTime: '08/08/2025, 00:02:42',
      sheetName: 'MH0055',
    });
    expect(rows[0].responseString).toContain('currentTime');
  });

  it('picks the OCPP data sheet even when a metadata sheet comes first', () => {
    const wb = czWorkbook('MH0055', { Summary: [['meta', 'info'], ['charger', 'MH0055']] });
    const rows = czAdapter.extractRows(wb);
    expect(rows).toHaveLength(2);
    expect(rows[0].sheetName).toBe('MH0055');
  });
});
