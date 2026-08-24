import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseCmsCsv } from '../../src/app/cms/parseCmsCsv';
import { analyze } from '../../src/app/analyze';

const FIXTURE = resolve(__dirname, '../fixtures/cms/mahindra-sample.csv');
const text = readFileSync(FIXTURE, 'utf-8');

describe('Mahindra CSV end-to-end', () => {
  it('parses the fixture and reports the Event Type mismatches', async () => {
    const out = await parseCmsCsv(text, 'Logs_of_charger__MPCKADC060_639229316915356646.csv');
    expect(out.adapter.id).toBe('mahindra-csv');
    expect(out.chargers).toEqual(['MPCKADC060']);
    expect(out.directionMismatches).toBe(18);
  });

  it('emits messages in chronological order', async () => {
    const { parsed } = await parseCmsCsv(text, 'x.csv');
    const stamps = parsed.messages.map((m) => m.timestamp).filter(Boolean);
    const sorted = [...stamps].sort();
    expect(stamps).toEqual(sorted);
  });

  it('recovers truncated MeterValues instead of dropping them', async () => {
    const { parsed } = await parseCmsCsv(text, 'x.csv');
    const mv = parsed.messages.filter((m) => m.message[2] === 'MeterValues');
    expect(mv.length).toBeGreaterThan(0);
    for (const m of mv) expect(m.message[3]).toBeTruthy();
  });

  it('skips the unsalvageable row without throwing', async () => {
    const { parsed } = await parseCmsCsv(text, 'x.csv');
    const ids = parsed.messages.map((m) => m.message[1]);
    expect(ids).not.toContain('00000000-0000-4000-8000-000000000001');
  });

  it('leaves response timestamps blank so Response Time reads N/A', async () => {
    const { parsed } = await parseCmsCsv(text, 'x.csv');
    const results = parsed.messages.filter((m) => m.message[0] === 3);
    expect(results.length).toBeGreaterThan(0);
    for (const r of results) expect(r.timestamp).toBe('');
  });

  it('gives mislabelled rows the direction the action implies, not the label', async () => {
    // RemoteStartTransaction is CSMS-initiated. The export labels many of these
    // rows "Charger-CMS"; direction must still come from the action. If someone
    // makes the adapter trust Event Type, this fails while the counter tests do not.
    const { parsed } = await parseCmsCsv(text, 'x.csv');
    const rs = parsed.messages.filter((m) => m.message[2] === 'RemoteStartTransaction');
    expect(rs.length).toBeGreaterThan(0);
    for (const m of rs) expect(m.direction).toBe('received');
  });

  it('feeds analyze() and produces a populated report', async () => {
    const { parsed } = await parseCmsCsv(text, 'x.csv');
    const result = analyze(parsed, parsed.rawLogLines, ['mahindra-sample.csv']);
    expect(result.messages.length).toBeGreaterThan(0);

    // Transaction 117646 (Authorize -> StartTransaction -> MeterValues -> StopTransaction)
    // is reconstructed by processTransactions() and returned on
    // AnalysisResult.transactions[].id (src/app/model/types.ts Transaction.id).
    const tx = result.transactions.find((t) => t.id === 117646);
    expect(tx).toBeDefined();
    expect(tx?.meterValues.length).toBeGreaterThan(0);
    expect(tx?.stopTime).toBeTruthy();
  });
});
