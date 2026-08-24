import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import * as XLSX from 'xlsx';
import { handleRequest } from '../../src/app/worker/protocol';

const SAMPLE = resolve(__dirname, '../../data/samples/CZ CMS Logs Sample.xlsx');

function fileFrom(buf: Buffer, name: string): File {
  return new File([buf], name);
}

describe('handleRequest — cms', () => {
  it('runs the CMS pipeline on the real CZ sample and returns outcomes', async () => {
    const labels: string[] = [];
    const { result, cms } = await handleRequest(
      { kind: 'cms', files: [fileFrom(readFileSync(SAMPLE), 'CZ.xlsx')] },
      (label) => labels.push(label),
    );
    expect(result.messages).toHaveLength(3204);   // QA baseline
    expect(result.transactions).toHaveLength(12); // QA baseline
    expect(result.alerts).toHaveLength(12);       // QA baseline
    expect(cms?.outcomes).toEqual([
      { name: 'CZ.xlsx', label: 'CZ', chargers: ['MH0055'], rows: 3204 },
    ]);
    expect(labels.some((l) => l.includes('CZ.xlsx'))).toBe(true);
  });

  it('threads a forced adapterId — wrong customer on a CZ file errors sharply', async () => {
    await expect(
      handleRequest({ kind: 'cms', files: [fileFrom(readFileSync(SAMPLE), 'CZ.xlsx')], adapterId: 'mahindra' }, () => {}),
    ).rejects.toThrow(/doesn't match the Mahindra CMS format/i);
  });

  it('propagates the unrecognized-format error message verbatim', async () => {
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([['a', 'b'], [1, 2]]), 'S');
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
    await expect(
      handleRequest({ kind: 'cms', files: [fileFrom(buf, 'x.xlsx')] }, () => {}),
    ).rejects.toThrow(/Unrecognized CMS log format/);
  });

  it('routes a .csv file through the CSV adapter', async () => {
    const csv = [
      'Event Name,Event Type,Request,Response,Created On',
      'Heartbeat,Charger-CMS,"[2,""a"",""Heartbeat"",{}]","[3,""a"",{}]",08/21/2026 17:00:38',
    ].join('\n');
    const file = new File([csv], 'Logs_of_charger__MPCKADC060_639229316915356646.csv', { type: 'text/csv' });
    const payload = await handleRequest({ kind: 'cms', files: [file] }, () => {});
    expect(payload.cms?.outcomes[0].label).toBe('Mahindra (CSV)');
    expect(payload.cms?.outcomes[0].chargers).toEqual(['MPCKADC060']);
    expect(payload.result.messages.length).toBe(2);
  });
});
