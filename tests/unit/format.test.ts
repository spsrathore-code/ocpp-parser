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
