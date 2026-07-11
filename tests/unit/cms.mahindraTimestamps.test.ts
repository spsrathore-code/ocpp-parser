import { describe, it, expect } from 'vitest';
import { mahindraTimestampToUtcIso } from '../../src/app/cms/adapters/mahindraTimestamps';

// Mahindra "Created On" is an IST wall-clock displayed as "d/m/yy H:MM". The adapter
// reads it as FORMATTED TEXT (parseCmsWorkbook uses cellNF:true), never the raw Excel
// serial — the serial in this export decodes to the wrong month (m/d confusion: serial
// 46060 = Feb 7, but the OCPP payload proves the event is 2 July; d/m matched the
// payload 295/460 rows, m/d 0/460). Verified IST: 2/7/26 15:19 == payload
// currentTime 2026-07-02T09:49Z (+5:30). Store the UTC instant.
describe('mahindraTimestampToUtcIso', () => {
  it('parses "d/m/yy H:MM" as day/month (IST) → UTC ISO', () => {
    expect(mahindraTimestampToUtcIso('2/7/26 15:19')).toBe('2026-07-02T09:49:00.000Z');
  });

  it('a day > 12 confirms the d/m order', () => {
    expect(mahindraTimestampToUtcIso('15/12/26 06:00')).toBe('2026-12-15T00:30:00.000Z');
  });

  it('accepts an optional seconds field', () => {
    expect(mahindraTimestampToUtcIso('2/7/26 15:19:18')).toBe('2026-07-02T09:49:18.000Z');
  });

  it('rejects a raw Excel serial number (unreliable month) → null', () => {
    expect(mahindraTimestampToUtcIso(46060.638402777775 as unknown as string)).toBeNull();
  });

  it('returns null for blank or unparseable input', () => {
    expect(mahindraTimestampToUtcIso('')).toBeNull();
    expect(mahindraTimestampToUtcIso('not a date')).toBeNull();
  });
});
