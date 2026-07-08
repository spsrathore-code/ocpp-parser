import { describe, it, expect } from 'vitest';
import * as XLSX from 'xlsx';
import { CMS_ADAPTERS, detectAdapter } from '../../src/app/cms/registry';

function czWorkbook(): XLSX.WorkBook {
  const aoa = [
    ['Sr No.', 'Request String', 'Response String', 'Request Time', 'Response Time'],
    ['1', '[2,"a","Heartbeat",{}]', '[3,"a",{}]', '08/08/2025, 00:02:42', '08/08/2025, 00:02:42'],
  ];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(aoa), 'MH0055');
  return wb;
}

describe('CMS adapter registry', () => {
  it('registers at least the CZ adapter', () => {
    expect(CMS_ADAPTERS.map((a) => a.id)).toContain('cz');
  });

  it('detectAdapter returns the CZ adapter for a CZ workbook', () => {
    expect(detectAdapter(czWorkbook())?.id).toBe('cz');
  });

  it('detectAdapter returns null when no adapter matches', () => {
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([['a', 'b'], [1, 2]]), 'S');
    expect(detectAdapter(wb)).toBeNull();
  });
});
