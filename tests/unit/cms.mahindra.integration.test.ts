import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseCmsWorkbook } from '../../src/app/cms/parseCmsWorkbook';
import { analyze } from '../../src/app/analyze';

const SAMPLE = resolve(__dirname, '../../data/samples/Mahindra CMS Log Sample.xlsx');

function ab(): ArrayBuffer {
  const buf = readFileSync(SAMPLE);
  return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer;
}

describe('Mahindra CMS — real sample end-to-end', () => {
  it('auto-detects the Mahindra adapter and analyzes into real sections', async () => {
    const { parsed, adapter, chargers } = await parseCmsWorkbook(ab(), 'Mahindra.xlsx');
    expect(adapter.id).toBe('mahindra');
    expect(chargers[0]).toBe('MPCMHDC029_639'); // cleaned charger id
    expect(parsed.messages.length).toBeGreaterThan(0);

    const r = analyze(parsed, parsed.rawLogLines, ['Mahindra.xlsx']);
    expect(r.messageGroups.Heartbeat.length).toBeGreaterThan(0);
  });

  it('converts the serial "Created On" via the display string to the correct UTC date', async () => {
    const { parsed } = await parseCmsWorkbook(ab(), 'Mahindra.xlsx');
    // Every timestamp must be a valid ISO-UTC instant (proves the d/m display-string
    // path ran — the raw serial would have produced the wrong month or empty).
    const iso = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
    const stamps = parsed.messages.map((m) => m.timestamp).filter(Boolean);
    expect(stamps.length).toBeGreaterThan(0);
    expect(stamps.every((t) => iso.test(t))).toBe(true);
    // Sample's first Heartbeat is 2026-07-02 (July), never 2026-02 (Feb, the serial trap).
    expect(stamps.some((t) => t.startsWith('2026-07'))).toBe(true);
    expect(stamps.some((t) => t.startsWith('2026-02'))).toBe(false);
  });

  it('forced adapterId parses too, and a wrong forced customer errors clearly', async () => {
    const forced = await parseCmsWorkbook(ab(), 'Mahindra.xlsx', { adapterId: 'mahindra' });
    expect(forced.adapter.id).toBe('mahindra');
    await expect(parseCmsWorkbook(ab(), 'Mahindra.xlsx', { adapterId: 'cz' }))
      .rejects.toThrow(/doesn't match the CZ CMS format/i);
  });
});
