import { describe, it, expect } from 'vitest';
import { istToUtcIso } from '../../src/app/cms/timestamps';

describe('istToUtcIso', () => {
  it('converts CZ IST wall-clock "dd/mm/yyyy, HH:MM:SS" to a UTC ISO instant (−5:30)', () => {
    // Proven by the sample: Request Time 08/08/2025, 00:02:42 IST
    // matches payload currentTime 2025-08-07T18:32:42Z (UTC).
    expect(istToUtcIso('08/08/2025, 00:02:42')).toBe('2025-08-07T18:32:42.000Z');
  });

  it('handles a day > 12 as dd/mm/yyyy (not mm/dd)', () => {
    expect(istToUtcIso('15/08/2025, 06:00:00')).toBe('2025-08-15T00:30:00.000Z');
  });

  it('accepts the space-separated variant without the comma', () => {
    expect(istToUtcIso('08/08/2025 00:02:42')).toBe('2025-08-07T18:32:42.000Z');
  });

  it('returns null for blank or unparseable input', () => {
    expect(istToUtcIso('')).toBeNull();
    expect(istToUtcIso('not a date')).toBeNull();
  });
});
