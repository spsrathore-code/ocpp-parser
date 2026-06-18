import { describe, it, expect } from 'vitest';
import { fmtReplayDelay } from '../../src/app/render/format';

describe('fmtReplayDelay — faithful port (HTML 237)', () => {
  it('formats sub-minute as seconds', () => {
    expect(fmtReplayDelay(5000)).toBe('5s');
  });
  it('drops seconds once minutes/hours/days are present', () => {
    expect(fmtReplayDelay(2 * 3600000 + 30 * 60000 + 9000)).toBe('2h 30m');
  });
  it('includes days', () => {
    expect(fmtReplayDelay(86400000 + 3600000)).toBe('1d 1h');
  });
  it('zero is 0s', () => {
    expect(fmtReplayDelay(0)).toBe('0s');
  });
});

import { formatUtcIst, formatLogDuration } from '../../src/app/render/format';

describe('formatUtcIst — UTC + IST (UTC+5:30) display (HTML 2098)', () => {
  it('formats a date into utc and ist strings', () => {
    const d = new Date('2025-08-22T00:00:00.000Z');
    expect(formatUtcIst(d)).toEqual({ utc: '2025-08-22 00:00:00Z', ist: '2025-08-22 05:30:00 IST' });
  });
  it('returns N/A for null', () => {
    expect(formatUtcIst(null)).toEqual({ utc: 'N/A', ist: 'N/A' });
  });
});

describe('formatLogDuration', () => {
  it('formats milliseconds as "Xh Ym"', () => {
    expect(formatLogDuration(2 * 3600000 + 35 * 60000)).toBe('2h 35m');
  });
});
