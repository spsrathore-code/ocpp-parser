import { describe, it, expect } from 'vitest';
import { mahindraCsvAdapter } from '../../src/app/cms/adapters/mahindraCsv';

const HEADER = ['Event Name', 'Event Type', 'Request', 'Response', 'Created On'];

describe('mahindraCsvAdapter.detect', () => {
  it('accepts the Mahindra CSV header', () => {
    expect(mahindraCsvAdapter.detect(HEADER)).toBe(true);
  });

  it('is case- and whitespace-tolerant', () => {
    expect(mahindraCsvAdapter.detect([' event name ', 'EVENT TYPE', 'request', 'Response', 'created on'])).toBe(true);
  });

  it('rejects an unrelated CSV', () => {
    expect(mahindraCsvAdapter.detect(['Time', 'Level', 'Message'])).toBe(false);
  });
});

describe('mahindraCsvAdapter.extractRows', () => {
  const grid = [
    HEADER,
    ['Heartbeat', 'Charger-CMS', '[2,"a","Heartbeat",{}]', '[3,"a",{}]', '08/21/2026 17:00:38'],
    ['RemoteStartTransaction', 'Charger-CMS', '[2,"b","RemoteStartTransaction",{"connectorId":1}]', '[3,"b",{}]', '08/21/2026 17:01:00'],
    ['TriggerMessage', 'Charger-CMS', '[2,"c","TriggerMessage",{}]', '-Awaiting response from charger-', '08/21/2026 17:04:03'],
    ['Junk', 'Charger-CMS', 'not-a-call', '', '08/21/2026 17:05:00'],
  ];

  it('keeps only rows whose Request is an OCPP CALL', () => {
    expect(mahindraCsvAdapter.extractRows(grid, 'x.csv').rows).toHaveLength(3);
  });

  it('counts Event Type disagreements without acting on them', () => {
    expect(mahindraCsvAdapter.extractRows(grid, 'x.csv').directionMismatches).toBe(2);
  });

  it('puts Created On in requestTime and leaves responseTime blank', () => {
    const rows = mahindraCsvAdapter.extractRows(grid, 'x.csv').rows;
    const hb = rows.find((r) => r.requestString.includes('Heartbeat'))!;
    expect(hb.requestTime).toBe('08/21/2026 17:00:38');
    expect(hb.responseTime).toBe('');
  });

  it('drops the awaiting-response placeholder so no CALLRESULT is emitted', () => {
    const rows = mahindraCsvAdapter.extractRows(grid, 'x.csv').rows;
    const trig = rows.find((r) => r.requestString.includes('TriggerMessage'))!;
    expect(trig.responseString).toBe('');
  });

  it('derives the charger id from the file name', () => {
    const { rows } = mahindraCsvAdapter.extractRows(grid, 'Logs_of_charger__MPCKADC060_639229316915356646.csv');
    expect(rows[0].sheetName).toBe('MPCKADC060');
  });

  it('never returns an empty charger id', () => {
    const { rows } = mahindraCsvAdapter.extractRows(grid, '.csv');
    expect(rows[0].sheetName).toBeTruthy();
  });

  it('reverses the export, which the portal emits newest-first', () => {
    // Input grid is in portal order (newest-first is how the real file arrives);
    // output must be oldest-first so downstream correlation sees chronological data.
    const { rows } = mahindraCsvAdapter.extractRows(grid, 'x.csv');
    expect(rows.map((r) => r.requestTime)).toEqual([
      '08/21/2026 17:04:03',
      '08/21/2026 17:01:00',
      '08/21/2026 17:00:38',
    ]);
  });
});
