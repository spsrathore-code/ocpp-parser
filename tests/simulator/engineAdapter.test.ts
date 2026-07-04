import { describe, it, expect } from 'vitest';
import { validateFrame, formatViolations } from '../../src/simulator/validate/engineAdapter';

describe('engineAdapter', () => {
  it('passes a valid Authorize Call', () => {
    const r = validateFrame([2, 'id-1', 'Authorize', { idTag: 'ABC' }]);
    expect(r.ok).toBe(true);
    expect(formatViolations(r)).toEqual([]);
  });
  it('flags a schema violation (missing required idTag) as an L2 failure', () => {
    const r = validateFrame([2, 'id-2', 'Authorize', {}]);
    expect(r.ok).toBe(false);
    // The engine reports schema failures at L2 (message text is engine-defined).
    expect(r.violations.some(v => v.layer === 'L2')).toBe(true);
    expect(formatViolations(r).join(' ')).toMatch(/\[L2\]/);
  });
  it('flags a malformed frame (L1)', () => {
    const r = validateFrame([2, 'id-3', 'Authorize']); // only 3 elements
    expect(r.ok).toBe(false);
    expect(r.violations[0].layer).toBe('L1');
  });
});
