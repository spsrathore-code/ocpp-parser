import { describe, it, expect } from 'vitest';
import { mahindraCsvTimestampToUtcIso } from '../../src/app/cms/adapters/mahindraCsvTimestamps';

describe('mahindraCsvTimestampToUtcIso', () => {
  it('reads MM/DD/YYYY and subtracts the IST offset', () => {
    // Ground truth from the real export: this row's response payload carried
    // "currentTime":"2026-08-21T11:30:38.247Z".
    expect(mahindraCsvTimestampToUtcIso('08/21/2026 17:00:38')).toBe('2026-08-21T11:30:38.000Z');
  });

  it('reads a day <= 12 as the DAY, not the month', () => {
    // The whole point of a separate parser: 08/11/2026 is 11 August, not 8 November.
    expect(mahindraCsvTimestampToUtcIso('08/11/2026 10:00:00')).toBe('2026-08-11T04:30:00.000Z');
  });

  it('rolls back across midnight when IST is before 05:30', () => {
    expect(mahindraCsvTimestampToUtcIso('08/15/2026 00:00:54')).toBe('2026-08-14T18:30:54.000Z');
  });

  it('returns null for blank, malformed, or out-of-range input', () => {
    expect(mahindraCsvTimestampToUtcIso('')).toBeNull();
    expect(mahindraCsvTimestampToUtcIso('not a date')).toBeNull();
    expect(mahindraCsvTimestampToUtcIso('21/08/2026 17:00:38')).toBeNull(); // month 21
    expect(mahindraCsvTimestampToUtcIso('08/32/2026 17:00:38')).toBeNull(); // day 32
  });

  it('rejects out-of-range time components instead of rolling them over', () => {
    // Without these bounds, Date.UTC would silently roll 17:60:38 -> 18:00:38.
    expect(mahindraCsvTimestampToUtcIso('08/21/2026 25:00:00')).toBeNull();
    expect(mahindraCsvTimestampToUtcIso('08/21/2026 17:60:38')).toBeNull();
    expect(mahindraCsvTimestampToUtcIso('08/21/2026 17:00:60')).toBeNull();
  });

  it('accepts a real leap day and rejects a fake one', () => {
    // Pins the day-rollover check: Date.UTC turns Feb 29 in a non-leap year into
    // Mar 1, which must be rejected rather than silently accepted as another date.
    expect(mahindraCsvTimestampToUtcIso('02/29/2028 12:00:00')).toBe('2028-02-29T06:30:00.000Z');
    expect(mahindraCsvTimestampToUtcIso('02/29/2026 12:00:00')).toBeNull();
    expect(mahindraCsvTimestampToUtcIso('02/30/2026 12:00:00')).toBeNull();
  });
});
