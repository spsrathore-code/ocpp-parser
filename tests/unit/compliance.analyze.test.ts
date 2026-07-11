import { describe, it, expect } from 'vitest';
import { analyzeLogLines } from '../../src/app/analyze';

describe('analyze() wires cpCompliance', () => {
  it('produces a §4 compliance report on a minimal log', () => {
    const lines = ['{"timestamp":"2025-01-01T00:00:00.000Z","message":[2,"a","BootNotification",{"chargePointVendor":"X","chargePointModel":"Y"}]}'];
    const r = analyzeLogLines(lines, 'f.json');
    expect(r.cpCompliance.packId).toBe('ocpp-1.6j-section-4');
    expect(r.cpCompliance.groups.flatMap((g) => g.results)).toHaveLength(49);
    expect(typeof r.cpCompliance.summary.weightedScore).toBe('number');
  });
});
