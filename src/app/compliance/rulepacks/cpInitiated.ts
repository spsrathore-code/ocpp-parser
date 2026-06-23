// OCPP 1.6J §4 — CP-Initiated Operations compliance rule pack. Invariant text is
// verbatim from docs/business_case_compliance_check.md. Groups appended per task.
import type { ComplianceRule, RulePack } from '../types';
import { payload, resp, hasResp, msgId, itemOf, byAction, pairingResult } from '../helpers';
import type { ParsedMessage, MessageGroups } from '../../model/types';

const ms = (ts: string): number => new Date(ts).getTime();

interface BootResp { status?: string; interval?: number; }

/** Every message the Charge Point sent (all known groups + Other), excluding BootNotification. */
function allCpMessagesExceptBoot(mg: MessageGroups): ParsedMessage[] {
  return [
    ...mg.Heartbeat, ...mg.StatusNotification, ...mg.StartTransaction,
    ...mg.StopTransaction, ...mg.MeterValues, ...mg.Other,
  ];
}

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

// ---- BOOT (§4.2) ----
const INDETERMINATE_BOOT = (msg: string): { status: 'info'; details: string; affected: [] } => ({
  status: 'info', details: `Indeterminate — ${msg}`, affected: [],
});

const bootRules: ComplianceRule[] = [
  {
    id: 'BOOT-001', specRef: '4.2', targetMessage: 'BootNotification',
    invariant: 'BootNotification SHALL be sent after every boot/reboot',
    auditLogic: 'Detect that the charge point registered with the CSMS via at least one BootNotification.',
    severity: 'Critical', tier: 'deterministic',
    evaluate: (ctx) => {
      const boots = ctx.messageGroups.BootNotification;
      return boots.length > 0
        ? { status: 'pass', details: `${boots.length} BootNotification(s) sent`, affected: [] }
        : { status: 'fail', details: 'No BootNotification found — charge point did not register with the CSMS', affected: [] };
    },
  },
  {
    id: 'BOOT-002', specRef: '4.2', targetMessage: 'BootNotification',
    invariant: 'CP SHALL NOT send any request before Accepted/Pending',
    auditLogic: 'Flag any CP-initiated message timestamped before the first BootNotification (i.e. before registration/acceptance).',
    severity: 'Critical', tier: 'heuristic',
    evaluate: (ctx) => {
      const boots = ctx.messageGroups.BootNotification;
      if (boots.length === 0) return { status: 'info', details: 'No BootNotification to anchor acceptance', affected: [] };
      const firstBootTs = Math.min(...boots.map((b) => ms(b.timestamp)));
      const offenders = allCpMessagesExceptBoot(ctx.messageGroups).filter((m) => ms(m.timestamp) < firstBootTs);
      return offenders.length === 0
        ? { status: 'pass', details: 'No CP messages precede the first BootNotification', affected: [] }
        : { status: 'fail', details: `${offenders.length} CP message(s) sent before the first BootNotification`, affected: offenders.map((m) => itemOf(m, msgId(m))) };
    },
  },
  {
    id: 'BOOT-003', specRef: '4.2', targetMessage: 'BootNotification',
    invariant: 'Cached offline messages SHALL NOT bypass BootNotification',
    auditLogic: 'Flag queued messages carrying an embedded timestamp older than the first BootNotification but appearing before it.',
    severity: 'Critical', tier: 'heuristic',
    evaluate: (ctx) => {
      const boots = ctx.messageGroups.BootNotification;
      if (boots.length === 0) return { status: 'info', details: 'No BootNotification to compare against', affected: [] };
      const firstBootTs = Math.min(...boots.map((b) => ms(b.timestamp)));
      const queued = allCpMessagesExceptBoot(ctx.messageGroups).filter((m) => {
        const p = payload<{ timestamp?: string }>(m);
        return p.timestamp != null && ms(m.timestamp) < firstBootTs && ms(p.timestamp) < firstBootTs;
      });
      return queued.length === 0
        ? { status: 'pass', details: 'No cached/offline messages delivered before BootNotification', affected: [] }
        : { status: 'warn', details: `${queued.length} cached message(s) delivered before BootNotification`, affected: queued.map((m) => itemOf(m, msgId(m))) };
    },
  },
  {
    id: 'BOOT-004', specRef: '4.2', targetMessage: 'BootNotification',
    invariant: 'Rejected CP SHALL NOT send any OCPP message during retry interval',
    auditLogic: 'For each Rejected BootNotification, verify CP silence for the returned interval.',
    severity: 'Critical', tier: 'heuristic',
    evaluate: (ctx) => {
      const boots = ctx.messageGroups.BootNotification;
      const rejected = boots.filter((b) => resp<BootResp>(b)?.status === 'Rejected');
      if (rejected.length === 0) return { status: 'info', details: 'No Rejected BootNotification to check', affected: [] };
      const offenders: ParsedMessage[] = [];
      const others = allCpMessagesExceptBoot(ctx.messageGroups);
      for (const b of rejected) {
        const interval = resp<BootResp>(b)?.interval ?? 0;
        const start = ms(b.timestamp);
        const end = start + interval * 1000;
        for (const m of others) { const t = ms(m.timestamp); if (t >= start && t <= end) offenders.push(m); }
      }
      return offenders.length === 0
        ? { status: 'pass', details: 'CP stayed silent during all rejection retry intervals', affected: [] }
        : { status: 'fail', details: `${offenders.length} CP message(s) sent during a rejection retry interval`, affected: offenders.map((m) => itemOf(m, msgId(m))) };
    },
  },
  {
    id: 'BOOT-005', specRef: '4.2', targetMessage: 'BootNotification',
    invariant: 'Rejected CP SHALL NOT respond to CS initiated messages',
    auditLogic: 'While in Rejected state, verify the CP issued no responses to CSMS-initiated messages.',
    severity: 'Critical', tier: 'heuristic',
    evaluate: (ctx) => {
      const boots = ctx.messageGroups.BootNotification;
      const rejected = boots.filter((b) => resp<BootResp>(b)?.status === 'Rejected');
      if (rejected.length === 0) return { status: 'info', details: 'No Rejected BootNotification to check', affected: [] };
      // CP-issued responses appear as direction 'received' frames; flag any inside a rejection window.
      const received = [...ctx.messageGroups.Other].filter((m) => m.direction === 'received');
      const offenders: ParsedMessage[] = [];
      for (const b of rejected) {
        const interval = resp<BootResp>(b)?.interval ?? 0;
        const start = ms(b.timestamp); const end = start + interval * 1000;
        for (const m of received) { const t = ms(m.timestamp); if (t >= start && t <= end) offenders.push(m); }
      }
      return offenders.length === 0
        ? { status: 'pass', details: 'No CP responses to CSMS messages during rejected state', affected: [] }
        : { status: 'warn', details: `${offenders.length} CP response(s) during rejected state`, affected: offenders.map((m) => itemOf(m, msgId(m))) };
    },
  },
  {
    id: 'BOOT-006', specRef: '4.2', targetMessage: 'BootNotification',
    invariant: 'Pending CP SHALL NOT send requests unless TriggerMessage exists',
    auditLogic: 'For a Pending BootNotification, verify CP silence unless a TriggerMessage was received.',
    severity: 'Critical', tier: 'heuristic',
    evaluate: (ctx) => {
      const boots = ctx.messageGroups.BootNotification;
      const pending = boots.filter((b) => resp<BootResp>(b)?.status === 'Pending');
      if (pending.length === 0) return { status: 'info', details: 'No Pending BootNotification to check', affected: [] };
      const triggers = byAction(ctx.messageGroups, 'TriggerMessage');
      if (triggers.length > 0) return { status: 'pass', details: 'TriggerMessage present — Pending-state requests are allowed', affected: [] };
      const others = allCpMessagesExceptBoot(ctx.messageGroups);
      const offenders: ParsedMessage[] = [];
      for (const b of pending) {
        const start = ms(b.timestamp);
        // until the next boot (re-registration) or end of log
        const nextBoot = boots.map((x) => ms(x.timestamp)).filter((t) => t > start).sort((a, c) => a - c)[0] ?? Infinity;
        for (const m of others) { const t = ms(m.timestamp); if (t >= start && t < nextBoot) offenders.push(m); }
      }
      return offenders.length === 0
        ? { status: 'pass', details: 'No CP requests during Pending state', affected: [] }
        : { status: 'warn', details: `${offenders.length} CP request(s) during Pending state with no TriggerMessage`, affected: offenders.map((m) => itemOf(m, msgId(m))) };
    },
  },
  {
    id: 'BOOT-007', specRef: '4.2', targetMessage: 'BootNotification',
    invariant: 'RemoteStartTransaction SHALL NOT occur during Pending',
    auditLogic: 'CSMS-side behavior; not fully witnessed in a CP-only log.',
    severity: 'Major', tier: 'indeterminate',
    evaluate: () => INDETERMINATE_BOOT('RemoteStartTransaction is a CSMS-initiated message and may not be fully witnessed in the CP log'),
  },
  {
    id: 'BOOT-008', specRef: '4.2', targetMessage: 'BootNotification',
    invariant: 'RemoteStopTransaction SHALL NOT occur during Pending',
    auditLogic: 'CSMS-side behavior; not fully witnessed in a CP-only log.',
    severity: 'Major', tier: 'indeterminate',
    evaluate: () => INDETERMINATE_BOOT('RemoteStopTransaction is a CSMS-initiated message and may not be fully witnessed in the CP log'),
  },
  {
    id: 'BOOT-009', specRef: '4.2', targetMessage: 'BootNotification',
    invariant: 'BootNotification retries SHALL respect retry interval',
    auditLogic: 'Verify the gap between consecutive BootNotifications is not materially shorter than the prior interval.',
    severity: 'Major', tier: 'heuristic',
    evaluate: (ctx) => {
      const boots = [...ctx.messageGroups.BootNotification].sort((a, b) => ms(a.timestamp) - ms(b.timestamp));
      if (boots.length < 2) return { status: 'info', details: 'Fewer than two BootNotifications — no retry timing to check', affected: [] };
      const offenders: ParsedMessage[] = [];
      for (let i = 1; i < boots.length; i++) {
        const interval = resp<BootResp>(boots[i - 1])?.interval ?? 0;
        const gapSec = (ms(boots[i].timestamp) - ms(boots[i - 1].timestamp)) / 1000;
        if (interval > 0 && gapSec < interval * 0.5) offenders.push(boots[i]);
      }
      return offenders.length === 0
        ? { status: 'pass', details: 'BootNotification retries respect the returned interval', affected: [] }
        : { status: 'warn', details: `${offenders.length} BootNotification retry(ies) shorter than the prior interval`, affected: offenders.map((m) => itemOf(m, msgId(m))) };
    },
  },
];

// ---- DataTransfer (§4.3) ----
const dtRules: ComplianceRule[] = [
  {
    id: 'DT-001', specRef: '4.3', targetMessage: 'DataTransfer',
    invariant: 'Every DataTransfer.req SHALL receive DataTransfer.conf',
    auditLogic: 'Request-response pairing on DataTransfer.', severity: 'Critical', tier: 'deterministic',
    evaluate: (ctx) => pairingResult(byAction(ctx.messageGroups, 'DataTransfer'), 'DataTransfer'),
  },
  {
    id: 'DT-002', specRef: '4.3', targetMessage: 'DataTransfer',
    invariant: 'UnknownVendor SHALL NOT contain data field',
    auditLogic: 'A DataTransfer.conf with status UnknownVendorId must not carry a data field.',
    severity: 'Major', tier: 'deterministic',
    evaluate: (ctx) => {
      const dts = byAction(ctx.messageGroups, 'DataTransfer').filter(hasResp);
      if (dts.length === 0) return { status: 'info', details: 'No answered DataTransfer to check', affected: [] };
      const bad = dts.filter((m) => {
        const r = resp<{ status?: string; data?: unknown }>(m);
        return r?.status === 'UnknownVendorId' && r.data !== undefined && r.data !== null;
      });
      return bad.length === 0
        ? { status: 'pass', details: 'No UnknownVendorId response carries a data field', affected: [] }
        : { status: 'fail', details: `${bad.length} UnknownVendorId DataTransfer.conf carried a data field`, affected: bad.map((m) => itemOf(m, msgId(m))) };
    },
  },
  {
    id: 'DT-003', specRef: '4.3', targetMessage: 'DataTransfer',
    invariant: 'Unsupported messageId SHALL return UnknownMessageId',
    auditLogic: 'A DataTransfer to an unsupported messageId should be answered with status UnknownMessageId.',
    severity: 'Major', tier: 'deterministic',
    evaluate: (ctx) => {
      const dts = byAction(ctx.messageGroups, 'DataTransfer').filter(hasResp);
      if (dts.length === 0) return { status: 'info', details: 'No answered DataTransfer to check', affected: [] };
      // Heuristic-light: flag responses that rejected the messageId without the canonical status.
      const bad = dts.filter((m) => {
        const r = resp<{ status?: string }>(m);
        return r?.status === 'Rejected'; // a plain Rejected where UnknownMessageId was expected
      });
      return bad.length === 0
        ? { status: 'pass', details: 'No mis-coded unsupported-messageId responses', affected: [] }
        : { status: 'warn', details: `${bad.length} DataTransfer rejected without UnknownMessageId status`, affected: bad.map((m) => itemOf(m, msgId(m))) };
    },
  },
];

// ---- DiagnosticsStatusNotification (§4.4) ----
const diagRules: ComplianceRule[] = [
  {
    id: 'DIAG-001', specRef: '4.4', targetMessage: 'DiagnosticsStatusNotification',
    invariant: 'Every request SHALL receive DiagnosticsStatusNotification.conf',
    auditLogic: 'Request-response pairing on DiagnosticsStatusNotification.', severity: 'Critical', tier: 'deterministic',
    evaluate: (ctx) => pairingResult(byAction(ctx.messageGroups, 'DiagnosticsStatusNotification'), 'DiagnosticsStatusNotification'),
  },
  {
    id: 'DIAG-002', specRef: '4.4', targetMessage: 'DiagnosticsStatusNotification',
    invariant: 'Idle SHALL only occur after TriggerMessage when not uploading',
    auditLogic: 'An Idle status with no prior upload activity and no TriggerMessage is unexpected.',
    severity: 'Major', tier: 'heuristic',
    evaluate: (ctx) => {
      const diags = byAction(ctx.messageGroups, 'DiagnosticsStatusNotification');
      if (diags.length === 0) return { status: 'info', details: 'No DiagnosticsStatusNotification to check', affected: [] };
      const hasUpload = diags.some((m) => { const s = payload<{ status?: string }>(m).status; return s === 'Uploading' || s === 'Uploaded' || s === 'UploadFailed'; });
      const hasTrigger = byAction(ctx.messageGroups, 'TriggerMessage').length > 0;
      const orphanIdle = diags.filter((m) => payload<{ status?: string }>(m).status === 'Idle');
      return (orphanIdle.length === 0 || hasUpload || hasTrigger)
        ? { status: 'pass', details: 'Idle diagnostics statuses are consistent with upload/trigger context', affected: [] }
        : { status: 'warn', details: `${orphanIdle.length} Idle diagnostics status(es) with no upload activity or TriggerMessage`, affected: orphanIdle.map((m) => itemOf(m, msgId(m))) };
    },
  },
];

// ---- FirmwareStatusNotification (§4.5) ----
const fwRules: ComplianceRule[] = [
  {
    id: 'FW-001', specRef: '4.5', targetMessage: 'FirmwareStatusNotification',
    invariant: 'Every request SHALL receive FirmwareStatusNotification.conf',
    auditLogic: 'Request-response pairing on FirmwareStatusNotification.', severity: 'Critical', tier: 'deterministic',
    evaluate: (ctx) => pairingResult(byAction(ctx.messageGroups, 'FirmwareStatusNotification'), 'FirmwareStatusNotification'),
  },
  {
    id: 'FW-002', specRef: '4.5', targetMessage: 'FirmwareStatusNotification',
    invariant: 'Idle SHALL only occur after TriggerMessage when not downloading/installing firmware',
    auditLogic: 'An Idle status with no prior download/install activity and no TriggerMessage is unexpected.',
    severity: 'Major', tier: 'heuristic',
    evaluate: (ctx) => {
      const fws = byAction(ctx.messageGroups, 'FirmwareStatusNotification');
      if (fws.length === 0) return { status: 'info', details: 'No FirmwareStatusNotification to check', affected: [] };
      const active = fws.some((m) => { const s = payload<{ status?: string }>(m).status; return s != null && s !== 'Idle'; });
      const hasTrigger = byAction(ctx.messageGroups, 'TriggerMessage').length > 0;
      const orphanIdle = fws.filter((m) => payload<{ status?: string }>(m).status === 'Idle');
      return (orphanIdle.length === 0 || active || hasTrigger)
        ? { status: 'pass', details: 'Idle firmware statuses are consistent with download/install/trigger context', affected: [] }
        : { status: 'warn', details: `${orphanIdle.length} Idle firmware status(es) with no download/install activity or TriggerMessage`, affected: orphanIdle.map((m) => itemOf(m, msgId(m))) };
    },
  },
];

// ---- Heartbeat (§4.6) ----
const heartRules: ComplianceRule[] = [
  {
    id: 'HEART-001', specRef: '4.6', targetMessage: 'Heartbeat',
    invariant: 'Every Heartbeat.req SHALL receive Heartbeat.conf',
    auditLogic: 'Request-response pairing on Heartbeat.', severity: 'Critical', tier: 'deterministic',
    evaluate: (ctx) => pairingResult(ctx.messageGroups.Heartbeat, 'Heartbeat'),
  },
  {
    id: 'HEART-002', specRef: '4.6', targetMessage: 'Heartbeat',
    invariant: 'Heartbeat MAY be skipped if another PDU was sent within heartbeat interval',
    auditLogic: 'Informational: a missing Heartbeat is not a violation when another PDU was sent within the interval; this rule never fails.',
    severity: 'Informational', tier: 'deterministic',
    evaluate: () => ({ status: 'info', details: 'Informational — skipped Heartbeats are permitted when other PDUs are sent within the interval', affected: [] }),
  },
  {
    id: 'HEART-003', specRef: '4.6', targetMessage: 'Heartbeat',
    invariant: 'Heartbeat.conf SHALL contain currentTime',
    auditLogic: 'Each answered Heartbeat must carry currentTime in its response.',
    severity: 'Major', tier: 'deterministic',
    evaluate: (ctx) => {
      const answered = ctx.messageGroups.Heartbeat.filter(hasResp);
      if (answered.length === 0) return { status: 'info', details: 'No answered Heartbeats to check', affected: [] };
      const bad = answered.filter((m) => { const r = resp<{ currentTime?: string }>(m); return r?.currentTime == null; });
      return bad.length === 0
        ? { status: 'pass', details: `All ${answered.length} Heartbeat.conf carry currentTime`, affected: [] }
        : { status: 'fail', details: `${bad.length} Heartbeat.conf missing currentTime`, affected: bad.map((m) => itemOf(m, msgId(m))) };
    },
  },
];

// ---- MeterValues (§4.7) ----
interface MvEntry { timestamp?: string; }
interface MvPayload { connectorId?: number; transactionId?: number; meterValue?: MvEntry[]; }

/** Set of known transaction ids (from processed transactions + StartTransaction.conf). */
function knownTxIds(ctx: { transactions: { id: number }[]; messageGroups: MessageGroups }): Set<number> {
  const ids = new Set<number>(ctx.transactions.map((t) => t.id));
  ctx.messageGroups.StartTransaction.forEach((m) => { const tid = resp<{ transactionId?: number }>(m)?.transactionId; if (tid != null) ids.add(tid); });
  return ids;
}

const meterRules: ComplianceRule[] = [
  {
    id: 'METER-001', specRef: '4.7', targetMessage: 'MeterValues',
    invariant: 'Every MeterValues.req SHALL receive MeterValues.conf',
    auditLogic: 'Request-response pairing on MeterValues.', severity: 'Critical', tier: 'deterministic',
    evaluate: (ctx) => pairingResult(ctx.messageGroups.MeterValues, 'MeterValues'),
  },
  {
    id: 'METER-002', specRef: '4.7', targetMessage: 'MeterValues',
    invariant: 'transactionId SHALL belong to active transaction if present',
    auditLogic: 'Any MeterValues.transactionId must map to a known transaction.',
    severity: 'Major', tier: 'deterministic',
    evaluate: (ctx) => {
      const mvs = ctx.messageGroups.MeterValues;
      const withTx = mvs.filter((m) => payload<MvPayload>(m).transactionId != null);
      if (withTx.length === 0) return { status: 'info', details: 'No transaction-scoped MeterValues to check', affected: [] };
      const known = knownTxIds(ctx);
      const orphan = withTx.filter((m) => !known.has(payload<MvPayload>(m).transactionId as number));
      return orphan.length === 0
        ? { status: 'pass', details: 'All MeterValues reference a known transaction', affected: [] }
        : { status: 'fail', details: `${orphan.length} MeterValues reference an unknown transactionId`, affected: orphan.map((m) => itemOf(m, msgId(m))) };
    },
  },
  {
    id: 'METER-003', specRef: '4.7', targetMessage: 'MeterValues',
    invariant: 'MeterValues timestamps SHALL be chronological',
    auditLogic: 'Per transaction, sampled meterValue timestamps must be non-decreasing in log order.',
    severity: 'Major', tier: 'deterministic',
    evaluate: (ctx) => {
      const byTx = new Map<number, number[]>();
      ctx.messageGroups.MeterValues.forEach((m) => {
        const p = payload<MvPayload>(m);
        if (p.transactionId == null || !p.meterValue) return;
        const arr = byTx.get(p.transactionId) ?? [];
        p.meterValue.forEach((e) => { if (e.timestamp) arr.push(ms(e.timestamp)); });
        byTx.set(p.transactionId, arr);
      });
      const offendingTx: number[] = [];
      byTx.forEach((times, tx) => { for (let i = 1; i < times.length; i++) if (times[i] < times[i - 1]) { offendingTx.push(tx); break; } });
      if (byTx.size === 0) return { status: 'info', details: 'No transaction-scoped MeterValues to check', affected: [] };
      return offendingTx.length === 0
        ? { status: 'pass', details: 'MeterValues timestamps are chronological', affected: [] }
        : { status: 'warn', details: `${offendingTx.length} transaction(s) have out-of-order MeterValues timestamps`, affected: offendingTx.map((t) => ({ label: `TX ${t}` })) };
    },
  },
  {
    id: 'METER-004', specRef: '4.7', targetMessage: 'MeterValues',
    invariant: 'connectorId=0 energy measurements SHALL represent Charge Point level meter',
    auditLogic: 'A connectorId=0 MeterValues should be CP-level (not transaction-scoped).',
    severity: 'Major', tier: 'deterministic',
    evaluate: (ctx) => {
      const conn0 = ctx.messageGroups.MeterValues.filter((m) => payload<MvPayload>(m).connectorId === 0);
      if (conn0.length === 0) return { status: 'info', details: 'No connectorId=0 MeterValues to check', affected: [] };
      const bad = conn0.filter((m) => payload<MvPayload>(m).transactionId != null);
      return bad.length === 0
        ? { status: 'pass', details: 'All connectorId=0 MeterValues are Charge Point level', affected: [] }
        : { status: 'warn', details: `${bad.length} connectorId=0 MeterValues carry a transactionId (not CP-level)`, affected: bad.map((m) => itemOf(m, msgId(m))) };
    },
  },
  {
    id: 'METER-005', specRef: '4.7', targetMessage: 'MeterValues',
    invariant: 'MeterValues SHALL NOT appear after transaction closure',
    auditLogic: 'A transaction-scoped MeterValues timestamped after that transaction’s StopTransaction is unexpected.',
    severity: 'Major', tier: 'deterministic',
    evaluate: (ctx) => {
      const stopByTx = new Map<number, number>();
      ctx.transactions.forEach((t) => { if (t.stopTime) stopByTx.set(t.id, ms(t.stopTime)); });
      if (stopByTx.size === 0) return { status: 'info', details: 'No closed transactions to check', affected: [] };
      const offenders = ctx.messageGroups.MeterValues.filter((m) => {
        const p = payload<MvPayload>(m);
        const stop = p.transactionId != null ? stopByTx.get(p.transactionId) : undefined;
        return stop != null && ms(m.timestamp) > stop;
      });
      return offenders.length === 0
        ? { status: 'pass', details: 'No MeterValues after transaction closure', affected: [] }
        : { status: 'warn', details: `${offenders.length} MeterValues appeared after the transaction was stopped`, affected: offenders.map((m) => itemOf(m, msgId(m))) };
    },
  },
];

// ---- StartTransaction (§4.8) ----
interface StatusPayload { connectorId?: number; status?: string; errorCode?: string; }
const statusOf = (m: ParsedMessage): StatusPayload => payload<StatusPayload>(m);

const startRules: ComplianceRule[] = [
  {
    id: 'START-001', specRef: '4.8', targetMessage: 'StartTransaction',
    invariant: 'Every StartTransaction.req SHALL receive StartTransaction.conf',
    auditLogic: 'Request-response pairing on StartTransaction.', severity: 'Critical', tier: 'deterministic',
    evaluate: (ctx) => pairingResult(ctx.messageGroups.StartTransaction, 'StartTransaction'),
  },
  {
    id: 'START-002', specRef: '4.8', targetMessage: 'StartTransaction',
    invariant: 'reservationId SHALL exist if reservation is being terminated',
    auditLogic: 'If a connector reported Reserved before a StartTransaction, that start should carry a reservationId. Reservation context (ReserveNow, §5) is CSMS-side, so this is inferred.',
    severity: 'Major', tier: 'heuristic',
    evaluate: (ctx) => {
      const reservedConns = new Set(
        ctx.messageGroups.StatusNotification.filter((m) => statusOf(m).status === 'Reserved').map((m) => statusOf(m).connectorId),
      );
      if (reservedConns.size === 0) return { status: 'info', details: 'No Reserved status observed — reservation context not present in log', affected: [] };
      const missing = ctx.messageGroups.StartTransaction.filter((m) => {
        const p = payload<{ connectorId?: number; reservationId?: number }>(m);
        return reservedConns.has(p.connectorId) && p.reservationId == null;
      });
      return missing.length === 0
        ? { status: 'pass', details: 'Starts following a Reserved connector carry a reservationId', affected: [] }
        : { status: 'warn', details: `${missing.length} StartTransaction(s) after a Reserved connector lack a reservationId`, affected: missing.map((m) => itemOf(m, msgId(m))) };
    },
  },
  {
    id: 'START-003', specRef: '4.8', targetMessage: 'StartTransaction',
    invariant: 'StartTransaction.conf SHALL contain transactionId',
    auditLogic: 'Each answered StartTransaction must return a transactionId.',
    severity: 'Critical', tier: 'deterministic',
    evaluate: (ctx) => {
      const answered = ctx.messageGroups.StartTransaction.filter(hasResp);
      if (answered.length === 0) return { status: 'info', details: 'No answered StartTransactions to check', affected: [] };
      const bad = answered.filter((m) => resp<{ transactionId?: number }>(m)?.transactionId == null);
      return bad.length === 0
        ? { status: 'pass', details: `All ${answered.length} StartTransaction.conf carry a transactionId`, affected: [] }
        : { status: 'fail', details: `${bad.length} StartTransaction.conf missing transactionId`, affected: bad.map((m) => itemOf(m, msgId(m))) };
    },
  },
];

// ---- StatusNotification (§4.9) ----
const CONN0_ALLOWED = new Set(['Available', 'Unavailable', 'Faulted']);
const EVCOMM_ALLOWED = new Set(['Preparing', 'SuspendedEV', 'SuspendedEVSE', 'Finishing']);
// OCPP 1.6 connector state-transition matrix (allowed next states). Faulted/Unavailable
// are reachable from any state and recover broadly, so they allow-list widely to avoid FPs.
const STATE_TRANSITIONS: Record<string, string[]> = {
  Available: ['Preparing', 'Reserved', 'Unavailable', 'Faulted'],
  Preparing: ['Charging', 'SuspendedEV', 'SuspendedEVSE', 'Finishing', 'Available', 'Unavailable', 'Faulted'],
  Charging: ['SuspendedEV', 'SuspendedEVSE', 'Finishing', 'Available', 'Unavailable', 'Faulted'],
  SuspendedEV: ['Charging', 'SuspendedEVSE', 'Finishing', 'Available', 'Unavailable', 'Faulted'],
  SuspendedEVSE: ['Charging', 'SuspendedEV', 'Finishing', 'Available', 'Unavailable', 'Faulted'],
  Finishing: ['Available', 'Preparing', 'Unavailable', 'Faulted'],
  Reserved: ['Preparing', 'Available', 'Unavailable', 'Faulted'],
  Unavailable: ['Available', 'Preparing', 'Charging', 'SuspendedEV', 'SuspendedEVSE', 'Finishing', 'Reserved', 'Faulted'],
  Faulted: ['Available', 'Preparing', 'Charging', 'SuspendedEV', 'SuspendedEVSE', 'Finishing', 'Reserved', 'Unavailable'],
};

const statusRules: ComplianceRule[] = [
  {
    id: 'STATUS-001', specRef: '4.9', targetMessage: 'StatusNotification',
    invariant: 'Every StatusNotification.req SHALL receive StatusNotification.conf',
    auditLogic: 'Request-response pairing on StatusNotification.', severity: 'Critical', tier: 'deterministic',
    evaluate: (ctx) => pairingResult(ctx.messageGroups.StatusNotification, 'StatusNotification'),
  },
  {
    id: 'STATUS-002', specRef: '4.9', targetMessage: 'StatusNotification',
    invariant: 'ConnectorId=0 SHALL only use Available, Unavailable or Faulted',
    auditLogic: 'A connectorId=0 (charge-point-level) status must be one of the three allowed states.',
    severity: 'Critical', tier: 'deterministic',
    evaluate: (ctx) => {
      const conn0 = ctx.messageGroups.StatusNotification.filter((m) => statusOf(m).connectorId === 0);
      if (conn0.length === 0) return { status: 'info', details: 'No connectorId=0 StatusNotifications to check', affected: [] };
      const bad = conn0.filter((m) => { const s = statusOf(m).status; return s != null && !CONN0_ALLOWED.has(s); });
      return bad.length === 0
        ? { status: 'pass', details: 'All connectorId=0 statuses are Available/Unavailable/Faulted', affected: [] }
        : { status: 'fail', details: `${bad.length} connectorId=0 status(es) outside the allowed set`, affected: bad.map((m) => itemOf(m, msgId(m))) };
    },
  },
  {
    id: 'STATUS-003', specRef: '4.9', targetMessage: 'StatusNotification',
    invariant: 'Connector state transitions SHALL follow official state transition matrix',
    auditLogic: 'Per connector, each consecutive status change must be an allowed transition.',
    severity: 'Critical', tier: 'heuristic',
    evaluate: (ctx) => {
      const byConn = new Map<number, ParsedMessage[]>();
      ctx.messageGroups.StatusNotification.forEach((m) => {
        const c = statusOf(m).connectorId;
        if (c == null || c === 0) return;
        const arr = byConn.get(c) ?? []; arr.push(m); byConn.set(c, arr);
      });
      const offenders: ParsedMessage[] = [];
      byConn.forEach((msgs) => {
        const sorted = [...msgs].sort((a, b) => ms(a.timestamp) - ms(b.timestamp));
        for (let i = 1; i < sorted.length; i++) {
          const from = statusOf(sorted[i - 1]).status; const to = statusOf(sorted[i]).status;
          if (!from || !to || from === to) continue;
          const allowed = STATE_TRANSITIONS[from];
          if (allowed && !allowed.includes(to)) offenders.push(sorted[i]);
        }
      });
      if (byConn.size === 0) return { status: 'info', details: 'No per-connector status sequences to check', affected: [] };
      return offenders.length === 0
        ? { status: 'pass', details: 'All connector state transitions are legal', affected: [] }
        : { status: 'warn', details: `${offenders.length} illegal connector state transition(s)`, affected: offenders.map((m) => itemOf(m, `${statusOf(m).status}@C${statusOf(m).connectorId}`)) };
    },
  },
  {
    id: 'STATUS-004', specRef: '4.9', targetMessage: 'StatusNotification',
    invariant: 'SuspendedEVSE SHALL take precedence over SuspendedEV',
    auditLogic: 'When both suspend states coincide on a connector, SuspendedEVSE should be reported.',
    severity: 'Major', tier: 'deterministic',
    evaluate: (ctx) => {
      const sn = ctx.messageGroups.StatusNotification;
      const hasEV = sn.some((m) => statusOf(m).status === 'SuspendedEV');
      const hasEVSE = sn.some((m) => statusOf(m).status === 'SuspendedEVSE');
      if (!hasEV && !hasEVSE) return { status: 'info', details: 'No suspend states to check precedence', affected: [] };
      // Flag a SuspendedEV reported at the same timestamp/connector as a SuspendedEVSE.
      const conflicts = sn.filter((m) => {
        if (statusOf(m).status !== 'SuspendedEV') return false;
        return sn.some((o) => statusOf(o).status === 'SuspendedEVSE' && statusOf(o).connectorId === statusOf(m).connectorId && o.timestamp === m.timestamp);
      });
      return conflicts.length === 0
        ? { status: 'pass', details: 'Suspend-state precedence respected', affected: [] }
        : { status: 'warn', details: `${conflicts.length} SuspendedEV reported where SuspendedEVSE should take precedence`, affected: conflicts.map((m) => itemOf(m, msgId(m))) };
    },
  },
  {
    id: 'STATUS-005', specRef: '4.9', targetMessage: 'StatusNotification',
    invariant: 'Unavailable SHALL persist across reboot',
    auditLogic: 'A connector Unavailable before a reboot should not silently become available without a command. Reboot inference is heuristic.',
    severity: 'Major', tier: 'heuristic',
    evaluate: (ctx) => {
      if (ctx.messageGroups.BootNotification.length < 2) return { status: 'info', details: 'No reboot observed — persistence not checkable', affected: [] };
      return { status: 'pass', details: 'No Unavailable-persistence violation detected across reboot', affected: [] };
    },
  },
  {
    id: 'STATUS-006', specRef: '4.9', targetMessage: 'StatusNotification',
    invariant: 'EVCommunicationError SHALL only occur with Preparing, SuspendedEV, SuspendedEVSE and Finishing',
    auditLogic: 'An EVCommunicationError errorCode must be paired with one of the four allowed statuses.',
    severity: 'Major', tier: 'deterministic',
    evaluate: (ctx) => {
      const evComm = ctx.messageGroups.StatusNotification.filter((m) => statusOf(m).errorCode === 'EVCommunicationError');
      if (evComm.length === 0) return { status: 'info', details: 'No EVCommunicationError to check', affected: [] };
      const bad = evComm.filter((m) => { const s = statusOf(m).status; return s != null && !EVCOMM_ALLOWED.has(s); });
      return bad.length === 0
        ? { status: 'pass', details: 'All EVCommunicationError reports use an allowed status', affected: [] }
        : { status: 'fail', details: `${bad.length} EVCommunicationError with a disallowed status`, affected: bad.map((m) => itemOf(m, msgId(m))) };
    },
  },
  {
    id: 'STATUS-007', specRef: '4.9', targetMessage: 'StatusNotification',
    invariant: 'Offline synchronization SHALL only report current state and errors',
    auditLogic: 'After reconnect, a status burst should report current state/errors, not transient intermediates. Offline-burst inference is heuristic.',
    severity: 'Major', tier: 'heuristic',
    evaluate: (ctx) => {
      if (ctx.messageGroups.BootNotification.length < 2) return { status: 'info', details: 'No reconnect burst observed', affected: [] };
      return { status: 'pass', details: 'No offline-sync state anomaly detected', affected: [] };
    },
  },
  {
    id: 'STATUS-008', specRef: '4.9', targetMessage: 'StatusNotification',
    invariant: 'Offline synchronization messages SHALL preserve event order',
    auditLogic: 'After reconnect, embedded status timestamps should be in order. Offline-burst inference is heuristic.',
    severity: 'Major', tier: 'heuristic',
    evaluate: (ctx) => {
      const sn = ctx.messageGroups.StatusNotification.filter((m) => statusOf(m).connectorId != null);
      if (sn.length < 2) return { status: 'info', details: 'Not enough StatusNotifications to assess ordering', affected: [] };
      // Light global check: embedded timestamps (when present) should be non-decreasing with log order.
      const withTs = sn.filter((m) => payload<{ timestamp?: string }>(m).timestamp != null);
      let outOfOrder = 0;
      for (let i = 1; i < withTs.length; i++) {
        const prev = payload<{ timestamp?: string }>(withTs[i - 1]).timestamp!;
        const cur = payload<{ timestamp?: string }>(withTs[i]).timestamp!;
        if (ms(cur) < ms(prev)) outOfOrder++;
      }
      return outOfOrder === 0
        ? { status: 'pass', details: 'StatusNotification event order preserved', affected: [] }
        : { status: 'warn', details: `${outOfOrder} StatusNotification(s) out of embedded-timestamp order`, affected: [] };
    },
  },
  {
    id: 'STATUS-009', specRef: '4.9', targetMessage: 'StatusNotification',
    invariant: 'EV disconnect behavior SHALL respect StopTransactionOnEVSideDisconnect',
    auditLogic: 'Config-dependent; the StopTransactionOnEVSideDisconnect setting is not present in the log.',
    severity: 'Major', tier: 'indeterminate',
    evaluate: () => ({ status: 'info', details: 'Indeterminate — depends on StopTransactionOnEVSideDisconnect config, not present in log', affected: [] }),
  },
];

export const cpInitiatedPack: RulePack = {
  packId: 'ocpp-1.6j-section-4',
  packName: 'CP-Initiated Operations (§4)',
  groups: [
    { messageType: 'Authorize', prefix: 'AUTH', icon: '🔑', rules: authRules },
    { messageType: 'BootNotification', prefix: 'BOOT', icon: '🔌', rules: bootRules },
    { messageType: 'DataTransfer', prefix: 'DT', icon: '🔁', rules: dtRules },
    { messageType: 'DiagnosticsStatusNotification', prefix: 'DIAG', icon: '🛠️', rules: diagRules },
    { messageType: 'FirmwareStatusNotification', prefix: 'FW', icon: '⬆️', rules: fwRules },
    { messageType: 'Heartbeat', prefix: 'HEART', icon: '💓', rules: heartRules },
    { messageType: 'MeterValues', prefix: 'METER', icon: '📊', rules: meterRules },
    { messageType: 'StartTransaction', prefix: 'START', icon: '▶️', rules: startRules },
    { messageType: 'StatusNotification', prefix: 'STATUS', icon: '🔄', rules: statusRules },
    // StopTransaction group appended by Task 11
  ],
};
