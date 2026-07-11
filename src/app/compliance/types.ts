// Pluggable compliance rule-pack framework — data contracts. A rule pack is a
// set of self-describing rules; each evaluate()s over already-parsed data and
// returns a status + narrative + affected items. First pack: OCPP 1.6J §4.
import type { CheckStatus } from '../protocol/types';
import type { MessageGroups, Transaction, InternalTxMap } from '../model/types';

export type { CheckStatus };
export type Severity = 'Critical' | 'Major' | 'Minor' | 'Informational';
export type Tier = 'deterministic' | 'heuristic' | 'indeterminate';

/** One affected item; `lineNumber` (1-based) enables the Preview/Download context viewer. */
export interface AffectedItem {
  label: string;
  lineNumber?: number;
}

/** Read-only view of the parsed log a rule evaluates against. */
export interface ComplianceContext {
  messageGroups: MessageGroups;
  transactions: Transaction[];
  internalTxMap: InternalTxMap;
  rawLogLines: string[];
}

export interface ComplianceEvalOutput {
  status: CheckStatus;
  details: string;
  affected: AffectedItem[];
}

export interface ComplianceRule {
  id: string;            // 'AUTH-002'
  specRef: string;       // '4.1'
  targetMessage: string; // 'Authorize'
  invariant: string;     // SHALL/SHOULD text, verbatim from the business-case doc
  auditLogic: string;    // human-readable "how we check it"
  severity: Severity;
  tier: Tier;
  evaluate(ctx: ComplianceContext): ComplianceEvalOutput;
}

export interface ComplianceResult extends ComplianceEvalOutput {
  id: string;
  specRef: string;
  targetMessage: string;
  invariant: string;
  auditLogic: string;
  severity: Severity;
  tier: Tier;
}

export interface ComplianceGroup {
  messageType: string;   // 'Authorize'
  prefix: string;        // 'AUTH'
  icon: string;
  results: ComplianceResult[];
}

export type SeverityTally = { pass: number; warn: number; fail: number; info: number };

export interface ComplianceSummary {
  total: number;
  byStatus: SeverityTally;
  bySeverity: Record<Severity, SeverityTally>;
  evaluated: number;     // total − info(indeterminate)
  weightedScore: number; // 0–100, Critical-weighted; info excluded
}

export interface ComplianceReport {
  packId: string;        // 'ocpp-1.6j-section-4'
  packName: string;      // 'CP-Initiated Operations (§4)'
  groups: ComplianceGroup[];
  summary: ComplianceSummary;
}

/** A rule pack = metadata + ordered groups of rules. */
export interface RulePack {
  packId: string;
  packName: string;
  groups: { messageType: string; prefix: string; icon: string; rules: ComplianceRule[] }[];
}
