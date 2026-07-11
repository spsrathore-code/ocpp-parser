import { describe, it, expect } from 'vitest';
import { runCompliance, SEVERITY_WEIGHT } from '../../src/app/compliance/runCompliance';
import type { RulePack, ComplianceContext, ComplianceRule } from '../../src/app/compliance/types';
import { createMessageGroups } from '../../src/app/model/types';

const ctx: ComplianceContext = { messageGroups: createMessageGroups(), transactions: [], internalTxMap: new Map(), rawLogLines: [] };
const rule = (id: string, sev: ComplianceRule['severity'], tier: ComplianceRule['tier'], status: 'pass' | 'warn' | 'fail' | 'info'): ComplianceRule => ({
  id, specRef: '4.0', targetMessage: 'X', invariant: 'inv', auditLogic: 'logic', severity: sev, tier,
  evaluate: () => ({ status, details: 'd', affected: [] }),
});
const pack = (rules: ComplianceRule[]): RulePack => ({ packId: 'p', packName: 'P', groups: [{ messageType: 'X', prefix: 'X', icon: '🔧', rules }] });

describe('runCompliance', () => {
  it('groups results and tallies by status', () => {
    const r = runCompliance(pack([rule('X-1', 'Critical', 'deterministic', 'pass'), rule('X-2', 'Major', 'deterministic', 'fail')]), ctx);
    expect(r.groups).toHaveLength(1);
    expect(r.groups[0].results.map((x) => x.id)).toEqual(['X-1', 'X-2']);
    expect(r.summary.byStatus).toEqual({ pass: 1, warn: 0, fail: 1, info: 0 });
    expect(r.summary.total).toBe(2);
  });

  it('weights the score by severity; warn = half credit', () => {
    // Critical pass (4·1) + Major warn (2·0.5) = 5 of (4+2)=6 → 83
    const r = runCompliance(pack([rule('X-1', 'Critical', 'deterministic', 'pass'), rule('X-2', 'Major', 'heuristic', 'warn')]), ctx);
    expect(r.summary.weightedScore).toBe(83);
    expect(r.summary.evaluated).toBe(2);
  });

  it('excludes indeterminate (info) rules from evaluated and the score', () => {
    const r = runCompliance(pack([rule('X-1', 'Critical', 'deterministic', 'pass'), rule('X-2', 'Major', 'indeterminate', 'info')]), ctx);
    expect(r.summary.evaluated).toBe(1);
    expect(r.summary.weightedScore).toBe(100); // only the passing Critical counts
    expect(r.summary.byStatus.info).toBe(1);
  });

  it('returns 100 when nothing is evaluable', () => {
    const r = runCompliance(pack([rule('X-1', 'Major', 'indeterminate', 'info')]), ctx);
    expect(r.summary.weightedScore).toBe(100);
    expect(r.summary.evaluated).toBe(0);
  });

  it('records severity verbatim and copies rule metadata into results', () => {
    const r = runCompliance(pack([rule('X-1', 'Minor', 'deterministic', 'pass')]), ctx);
    expect(r.groups[0].results[0]).toMatchObject({ id: 'X-1', specRef: '4.0', severity: 'Minor', tier: 'deterministic', invariant: 'inv' });
    expect(SEVERITY_WEIGHT.Critical).toBe(4);
  });
});
