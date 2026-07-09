import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import * as XLSX from 'xlsx';
import { parseCmsWorkbook } from '../../src/app/cms/parseCmsWorkbook';
import { analyze } from '../../src/app/analyze';

const SAMPLE = resolve(__dirname, '../../data/samples/CZ CMS Logs Sample.xlsx');

function toArrayBuffer(buf: Buffer): ArrayBuffer {
  return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer;
}

describe('parseCmsWorkbook — real CZ sample', () => {
  const ab = toArrayBuffer(readFileSync(SAMPLE));

  it('detects the CZ adapter and produces correlated messages', async () => {
    const { parsed, adapter, chargers } = await parseCmsWorkbook(ab, 'CZ CMS Logs Sample.xlsx');
    expect(adapter.id).toBe('cz');
    expect(chargers).toContain('MH0055'); // charger id = sheet name
    expect(parsed.messages.length).toBeGreaterThan(0);
    // one synthesized raw line per emitted message (context viewer contract).
    expect(parsed.rawLogLines.length).toBe(parsed.messages.length);
    expect(parsed.internalTxMap.size).toBe(0); // Excel has no internal-tx-id source
  });

  it('feeds analyze() so the shared pipeline yields real sections', async () => {
    const { parsed } = await parseCmsWorkbook(ab, 'CZ.xlsx');
    const result = analyze(parsed, parsed.rawLogLines, ['CZ.xlsx']);
    // The sample is dominated by Heartbeats — they must be grouped.
    expect(result.messageGroups.Heartbeat.length).toBeGreaterThan(0);
    expect(result.messages.length).toBeGreaterThan(0);
  });
});

describe('parseCmsWorkbook — errors', () => {
  it('throws a clear error when no adapter recognizes the workbook', async () => {
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([['a', 'b'], [1, 2]]), 'S');
    const ab = toArrayBuffer(XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer);
    await expect(parseCmsWorkbook(ab, 'x.xlsx')).rejects.toThrow(/unrecognized|unsupported|no.*adapter|format/i);
  });
});
