// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { dataTable, type Row } from '../../src/app/render/table';

describe('dataTable — generic table body (port of createCollapsibleSection)', () => {
  const rows: Row[] = [
    { fileName: 'a.txt', 'Time Stamp': '2025-01-01', 'Message ID': 'm1' },
    { fileName: 'a.txt', 'Time Stamp': '2025-01-02', 'Message ID': 'm2' },
  ];
  const table = dataTable(['Time Stamp', 'Message ID'], rows, 'heartbeats-table');

  it('sets the table id', () => {
    expect(table.querySelector('table')!.id).toBe('heartbeats-table');
  });

  it('renders S.No. + File Name + header columns', () => {
    const ths = [...table.querySelectorAll('thead th')].map((th) => th.textContent);
    expect(ths).toEqual(['S.No.', 'File Name', 'Time Stamp', 'Message ID']);
  });

  it('renders one row per datum with a 1-based S.No.', () => {
    const bodyRows = table.querySelectorAll('tbody tr');
    expect(bodyRows).toHaveLength(2);
    const firstCells = [...bodyRows[0].querySelectorAll('td')].map((td) => td.textContent);
    expect(firstCells).toEqual(['1', 'a.txt', '2025-01-01', 'm1']);
  });

  it('omits the File Name column when rows lack fileName, and shows N/A for missing/zero', () => {
    const t = dataTable(['Meter Start'], [{ 'Meter Start': 0 }]);
    const ths = [...t.querySelectorAll('thead th')].map((th) => th.textContent);
    expect(ths).toEqual(['S.No.', 'Meter Start']);
    const cells = [...t.querySelectorAll('tbody td')].map((td) => td.textContent);
    expect(cells).toEqual(['1', 'N/A']); // 0 || 'N/A' === 'N/A' (faithful to legacy)
  });
});
