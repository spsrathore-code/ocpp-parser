// Pure runner: evaluates a rule pack against the parsed context → ComplianceReport.
import type {
  RulePack, ComplianceContext, ComplianceReport, ComplianceResult,
  ComplianceGroup, ComplianceSummary, Severity, SeverityTally, CheckStatus,
} from './types';

export const SEVERITY_WEIGHT: Record<Severity, number> = { Critical: 4, Major: 2, Minor: 1, Informational: 0 };
const PASS_FRACTION: Record<Exclude<CheckStatus, 'info'>, number> = { pass: 1, warn: 0.5, fail: 0 };
const emptyTally = (): SeverityTally => ({ pass: 0, warn: 0, fail: 0, info: 0 });

export function runCompliance(pack: RulePack, ctx: ComplianceContext): ComplianceReport {
  const groups: ComplianceGroup[] = pack.groups.map((g) => ({
    messageType: g.messageType, prefix: g.prefix, icon: g.icon,
    results: g.rules.map((rule): ComplianceResult => {
      const out = rule.evaluate(ctx);
      return {
        id: rule.id, specRef: rule.specRef, targetMessage: rule.targetMessage,
        invariant: rule.invariant, auditLogic: rule.auditLogic, severity: rule.severity, tier: rule.tier,
        status: out.status, details: out.details, affected: out.affected,
      };
    }),
  }));

  const all = groups.flatMap((g) => g.results);
  const byStatus = emptyTally();
  const bySeverity: Record<Severity, SeverityTally> = {
    Critical: emptyTally(), Major: emptyTally(), Minor: emptyTally(), Informational: emptyTally(),
  };
  let weightNum = 0, weightDen = 0, evaluated = 0;
  for (const r of all) {
    byStatus[r.status] += 1;
    bySeverity[r.severity][r.status] += 1;
    if (r.status === 'info') continue;            // indeterminate excluded
    evaluated += 1;
    const w = SEVERITY_WEIGHT[r.severity];
    weightNum += w * PASS_FRACTION[r.status];
    weightDen += w;
  }
  const summary: ComplianceSummary = {
    total: all.length, byStatus, bySeverity, evaluated,
    weightedScore: weightDen > 0 ? Math.round((weightNum / weightDen) * 100) : 100,
  };
  return { packId: pack.packId, packName: pack.packName, groups, summary };
}
