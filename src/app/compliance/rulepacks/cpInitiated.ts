// OCPP 1.6J §4 — CP-Initiated Operations compliance rule pack. Invariant text is
// verbatim from docs/business_case_compliance_check.md. Groups appended per task.
import type { ComplianceRule, RulePack } from '../types';
import { payload, resp, hasResp, msgId, itemOf, byAction, pairingResult } from '../helpers';
import type { ParsedMessage } from '../../model/types';

// ---- AUTH (§4.1) ----
const authRules: ComplianceRule[] = [
  {
    id: 'AUTH-001', specRef: '4.1', targetMessage: 'Authorize',
    invariant: 'Charging SHALL occur only after successful authorization',
    auditLogic: 'Each StartTransaction must have an Accepted authorization (StartTransaction.conf idTagInfo.status or a prior accepted Authorize for the idTag).',
    severity: 'Critical', tier: 'deterministic',
    evaluate: (ctx) => {
      const starts = ctx.messageGroups.StartTransaction;
      if (starts.length === 0) return { status: 'info', details: 'No StartTransactions to check', affected: [] };
      const bad = starts.filter((m) => {
        const r = resp<{ idTagInfo?: { status?: string } }>(m);
        return hasResp(m) && r?.idTagInfo?.status != null && r.idTagInfo.status !== 'Accepted';
      });
      return bad.length === 0
        ? { status: 'pass', details: 'All transactions started under an accepted authorization', affected: [] }
        : { status: 'fail', details: `${bad.length} StartTransaction(s) began without Accepted authorization`, affected: bad.map((m) => itemOf(m, msgId(m))) };
    },
  },
  {
    id: 'AUTH-002', specRef: '4.1', targetMessage: 'Authorize',
    invariant: 'Every Authorize.req SHALL receive Authorize.conf',
    auditLogic: 'Request-response pairing on Authorize.', severity: 'Critical', tier: 'deterministic',
    evaluate: (ctx) => pairingResult(byAction(ctx.messageGroups, 'Authorize'), 'Authorize'),
  },
  {
    id: 'AUTH-003', specRef: '4.1', targetMessage: 'Authorize',
    invariant: 'Authorize.req for stopping SHALL only occur if stop idTag differs from start idTag',
    auditLogic: 'Compare each transaction’s stop idTag to its start idTag; equal tags are a likely redundant stop-authorize.',
    severity: 'Major', tier: 'deterministic',
    evaluate: (ctx) => {
      const stops = ctx.messageGroups.StopTransaction;
      const starts = ctx.messageGroups.StartTransaction;
      const startTagByTx = new Map<number, string>();
      starts.forEach((m) => {
        const tid = resp<{ transactionId?: number }>(m)?.transactionId;
        const tag = payload<{ idTag?: string }>(m).idTag;
        if (tid != null && tag) startTagByTx.set(tid, tag);
      });
      const offenders: ParsedMessage[] = stops.filter((m) => {
        const p = payload<{ transactionId?: number; idTag?: string }>(m);
        return p.idTag != null && p.transactionId != null && startTagByTx.get(p.transactionId) === p.idTag;
      });
      if (stops.filter((m) => payload<{ idTag?: string }>(m).idTag != null).length === 0)
        return { status: 'info', details: 'No stop-side idTags to compare', affected: [] };
      return offenders.length === 0
        ? { status: 'pass', details: 'All stop idTags differ from their start idTag', affected: [] }
        : { status: 'warn', details: `${offenders.length} StopTransaction(s) re-used the start idTag`, affected: offenders.map((m) => itemOf(m, msgId(m))) };
    },
  },
  {
    id: 'AUTH-004', specRef: '4.1', targetMessage: 'Authorize',
    invariant: 'Authorize.req SHOULD only be used for charging authorization',
    auditLogic: 'Flag Authorize.req with no nearby StartTransaction for the same idTag (heuristic usage check).',
    severity: 'Minor', tier: 'heuristic',
    evaluate: (ctx) => {
      const auths = byAction(ctx.messageGroups, 'Authorize');
      if (auths.length === 0) return { status: 'info', details: 'No Authorize messages to check', affected: [] };
      const startTags = new Set(ctx.messageGroups.StartTransaction.map((m) => payload<{ idTag?: string }>(m).idTag).filter(Boolean) as string[]);
      const orphan = auths.filter((m) => { const t = payload<{ idTag?: string }>(m).idTag; return t != null && !startTags.has(t); });
      return orphan.length === 0
        ? { status: 'pass', details: 'All Authorize requests map to a charging session', affected: [] }
        : { status: 'warn', details: `${orphan.length} Authorize(s) with no matching StartTransaction idTag (inferred non-charging use)`, affected: orphan.map((m) => itemOf(m, msgId(m))) };
    },
  },
];

export const cpInitiatedPack: RulePack = {
  packId: 'ocpp-1.6j-section-4',
  packName: 'CP-Initiated Operations (§4)',
  groups: [
    { messageType: 'Authorize', prefix: 'AUTH', icon: '🔑', rules: authRules },
    // subsequent groups appended by Tasks 5–11
  ],
};
