import { describe, it, expect } from 'vitest';
import * as XLSX from 'xlsx';
import { mahindraAdapter } from '../../src/app/cms/adapters/mahindra';
import { czAdapter } from '../../src/app/cms/adapters/cz';

/** Workbook mimicking the Mahindra CMS export layout. */
function mahindraWorkbook(sheetName = 'Logs_of_charger__MPCMHDC029_639'): XLSX.WorkBook {
  const aoa = [
    ['Event Name', 'Event Type', 'Request', 'Response', 'Created On'],
    ['Heartbeat', 'Charger-CMS', '[2,"h","Heartbeat",{}]', '[3,"h",{"currentTime":"2026-07-02T09:49:18.569Z"}]', '2/7/26 15:19'],
    ['RemoteStartTransaction', 'CMS-Charger', '[2,"r","RemoteStartTransaction",{"connectorId":2,"idTag":"4946"}]', '[3,"r",{"status":"Accepted"}]', '2/7/26 15:16'],
  ];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(aoa), sheetName);
  return wb;
}

/** Minimal CZ-format workbook (for cross-detection). */
function czWorkbook(): XLSX.WorkBook {
  const aoa = [
    ['Sr No.', 'Request String', 'Response String', 'Request Time', 'Response Time'],
    ['1', '[2,"a","Heartbeat",{}]', '[3,"a",{}]', '08/08/2025, 00:02:42', '08/08/2025, 00:02:42'],
  ];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(aoa), 'MH0055');
  return wb;
}

describe('mahindraAdapter.detect', () => {
  it('recognizes a Mahindra workbook (Event Name/Event Type + Created On)', () => {
    expect(mahindraAdapter.detect(mahindraWorkbook())).toBe(true);
  });
  it('does NOT match a CZ workbook', () => {
    expect(mahindraAdapter.detect(czWorkbook())).toBe(false);
  });
});

describe('cross-detection (no ambiguity after CZ detect tightening)', () => {
  it('CZ adapter does NOT match a Mahindra workbook', () => {
    expect(czAdapter.detect(mahindraWorkbook())).toBe(false);
  });
});

describe('mahindraAdapter.extractRows', () => {
  const rows = mahindraAdapter.extractRows(mahindraWorkbook());
  it('extracts CmsRows with the single Created-On mirrored to both times', () => {
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({
      requestString: '[2,"h","Heartbeat",{}]',
      requestTime: '2/7/26 15:19',
      responseTime: '2/7/26 15:19',
    });
    expect(rows[0].responseString).toContain('currentTime');
  });
  it('cleans the charger id from the sheet name', () => {
    expect(rows[0].sheetName).toBe('MPCMHDC029_639');
  });
});

describe('mahindraAdapter.toUtcIso', () => {
  it('parses the Mahindra d/m display string', () => {
    expect(mahindraAdapter.toUtcIso('2/7/26 15:19')).toBe('2026-07-02T09:49:00.000Z');
  });
});
