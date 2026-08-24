import { describe, it, expect } from 'vitest';
import { parseCmsCsv } from '../../src/app/cms/parseCmsCsv';

const CSV = [
  'Event Name,Event Type,Request,Response,Created On',
  'Heartbeat,Charger-CMS,"[2,""a"",""Heartbeat"",{}]","[3,""a"",{}]",08/21/2026 17:00:38',
].join('\n');

describe('parseCmsCsv', () => {
  it('parses a Mahindra CSV into ParsedLines', async () => {
    const out = await parseCmsCsv(CSV, 'Logs_of_charger__MPCKADC060_639229316915356646.csv');
    expect(out.adapter.id).toBe('mahindra-csv');
    expect(out.chargers).toEqual(['MPCKADC060']);
    expect(out.parsed.messages).toHaveLength(2); // CALL + CALLRESULT
    expect(out.parsed.messages[0].timestamp).toBe('2026-08-21T11:30:38.000Z');
    expect(out.directionMismatches).toBe(0);
  });

  it('throws a helpful error on an unrecognized header', async () => {
    await expect(parseCmsCsv('Time,Level\n1,2\n', 'other.csv'))
      .rejects.toThrow(/Unrecognized CMS CSV format/);
  });

  it('throws when the file has no OCPP CALL rows', async () => {
    const empty = 'Event Name,Event Type,Request,Response,Created On\n';
    await expect(parseCmsCsv(empty, 'x.csv')).rejects.toThrow(/no OCPP log rows/);
  });

  it('rejects a forced customer that does not match the file', async () => {
    await expect(parseCmsCsv(CSV, 'x.csv', { adapterId: 'nope' }))
      .rejects.toThrow(/Unknown CMS CSV customer/);
  });
});
