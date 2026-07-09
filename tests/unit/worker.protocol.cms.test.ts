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

  it('propagates the unrecognized-format error message verbatim', async () => {
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([['a', 'b'], [1, 2]]), 'S');
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
    await expect(
      handleRequest({ kind: 'cms', files: [fileFrom(buf, 'x.xlsx')] }, () => {}),
    ).rejects.toThrow(/Unrecognized CMS log format/);
  });
});
