import { describe, it, expect } from 'vitest';
import { cpInitiatedPack } from '../../src/app/compliance/rulepacks/cpInitiated';

describe('cpInitiatedPack completeness', () => {
  it('declares all 10 §4 message groups', () => {
    expect(cpInitiatedPack.groups.map((g) => g.prefix)).toEqual(
      ['AUTH', 'BOOT', 'DT', 'DIAG', 'FW', 'HEART', 'METER', 'START', 'STATUS', 'STOP'],
    );
  });
  it('contains exactly 46 rules with unique ids', () => {
    const ids = cpInitiatedPack.groups.flatMap((g) => g.rules.map((r) => r.id));
    expect(ids).toHaveLength(46);
    expect(new Set(ids).size).toBe(46);
  });
  it('every rule has verbatim invariant text + a 4.x specRef + a valid severity/tier', () => {
    for (const g of cpInitiatedPack.groups) for (const r of g.rules) {
      expect(r.invariant.length).toBeGreaterThan(10);
      expect(r.specRef).toMatch(/^4\.\d+$/);
      expect(['Critical', 'Major', 'Minor', 'Informational']).toContain(r.severity);
      expect(['deterministic', 'heuristic', 'indeterminate']).toContain(r.tier);
    }
  });
});
