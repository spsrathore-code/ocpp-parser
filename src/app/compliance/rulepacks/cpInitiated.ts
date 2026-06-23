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
    // subsequent groups appended by Tasks 8–11
  ],
};
