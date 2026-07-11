// Protocol Compliance Report engine — faithful port of the v2026.05.14 tool's
// `runProtocolValidation` (HTML 5934, spec §11). Produces 5 groups of system
// checks (BOOT, RESP, TXC, STATUS, MV) + a per-transaction lifecycle (10 stages)
// + a compliance summary. The DOM section (createProtocolValidationSection) is a
// Phase-3 render concern and is NOT ported here.
//
// Deviations (behaviour-preserving): `internalTxMap` and `rawLogLines` are passed
// in rather than read from globals (`internalTxMap` / `window.rawLogLines`).
//
// NOTE: the source defines 21 system checks (BOOT 6 · RESP 3 · TXC 3 · STATUS 5 ·
// MV 4); the spec doc's "24" is a documentation drift. The source is canonical.

import type { MessageGroups, Transaction, ParsedMessage, InternalTxMap } from '../model/types';
import type {
  CheckStatus,
  ProtocolCheck,
  ProtocolCheckGroup,
  LifecycleStage,
  PerTransactionResult,
  ProtocolValidationResult,
} from './types';
import { detectPhantomConnectionPattern } from './phantom';

// ---- typed payload accessors (frames are `unknown[]`) ----
interface BootResp { status?: string; interval?: number; }
interface IdTagInfo { status?: string; }
interface StartResp { transactionId?: number; idTagInfo?: IdTagInfo; }
interface StatusPayload { connectorId?: number; status?: string; errorCode?: string; timestamp?: string; }
interface StartPayload { connectorId?: number; idTag?: string; }
interface StopPayload { transactionId?: number; }
interface SampledValue { context?: string; measurand?: string; value?: string; unit?: string; }
interface MeterValueEntry { sampledValue?: SampledValue[]; }
interface MeterValuesPayload { transactionId?: number; meterValue?: MeterValueEntry[]; }

const statusOf = (m: ParsedMessage): StatusPayload => (m.message[3] ?? {}) as StatusPayload;
const startPayloadOf = (m: ParsedMessage): StartPayload => (m.message[3] ?? {}) as StartPayload;
const stopPayloadOf = (m: ParsedMessage): StopPayload => (m.message[3] ?? {}) as StopPayload;
const mvPayloadOf = (m: ParsedMessage): MeterValuesPayload => (m.message[3] ?? {}) as MeterValuesPayload;
const bootRespOf = (m: ParsedMessage): BootResp | null => (m.responsePayload ?? null) as BootResp | null;
const startRespOf = (m: ParsedMessage): StartResp | null => (m.responsePayload ?? null) as StartResp | null;
const msgId = (m: ParsedMessage): string => m.message[1] as string;
const hasResp = (m: ParsedMessage): boolean => m.responsePayload !== null && m.responsePayload !== undefined;

export function runProtocolValidation(
  messageGroups: MessageGroups,
  transactions: Transaction[],
  internalTxMap: InternalTxMap,
  rawLogLines: string[],
): ProtocolValidationResult {
  const groups: ProtocolCheckGroup[] = [];
  const boots = messageGroups.BootNotification || [];
  const heartbeats = messageGroups.Heartbeat || [];
  const startTxs = messageGroups.StartTransaction || [];
  const stopTxs = messageGroups.StopTransaction || [];
  const statusNotifs = messageGroups.StatusNotification || [];
  const meterValues = messageGroups.MeterValues || [];
  const completeTxs = transactions.filter((tx) => tx.stopTime);

  // ── GROUP 1: BOOT & REGISTRATION ──
  const bootGroup: ProtocolCheckGroup = { id: 'BOOT', name: 'Boot & Registration', icon: '🔌', checks: [] };
  bootGroup.checks.push({
    id: 'BOOT-001',
    description: 'BootNotification sent on startup',
    status: boots.length > 0 ? 'pass' : 'fail',
    details: boots.length > 0 ? `${boots.length} BootNotification(s) sent` : 'No BootNotification found — charger did not register with CSMS',
    affectedItems: [],
  });
  const bootsNoResp = boots.filter((b) => !hasResp(b));
  const bootsWithResp = boots.filter((b) => hasResp(b));
  bootGroup.checks.push({
    id: 'BOOT-002',
    description: 'BootNotification responses received from CSMS',
    status: boots.length === 0 ? 'info' : bootsNoResp.length === 0 ? 'pass' : bootsWithResp.length === 0 ? 'fail' : 'warn',
    details:
      boots.length === 0
        ? 'No BootNotifications to check'
        : bootsNoResp.length === 0
          ? `All ${boots.length} BootNotification(s) received a response`
          : `${bootsNoResp.length}/${boots.length} BootNotification(s) without response — possible Phantom Connection or CSMS outage`,
    affectedItems: bootsNoResp.map(msgId),
  });
  const bootsRejected = bootsWithResp.filter((b) => bootRespOf(b)?.status !== 'Accepted');
  bootGroup.checks.push({
    id: 'BOOT-003',
    description: 'BootNotification accepted by CSMS (status = Accepted)',
    status: bootsWithResp.length === 0 ? 'info' : bootsRejected.length === 0 ? 'pass' : 'fail',
    details:
      bootsWithResp.length === 0
        ? 'No responded BootNotifications to check'
        : bootsRejected.length === 0
          ? `CSMS accepted all ${bootsWithResp.length} BootNotification(s)`
          : `${bootsRejected.length} BootNotification(s) rejected — statuses: ${[...new Set(bootsRejected.map((b) => bootRespOf(b)?.status || 'Unknown'))].join(', ')}`,
    affectedItems: bootsRejected.map(msgId),
  });
  const phantom = detectPhantomConnectionPattern(boots, rawLogLines);
  bootGroup.checks.push({
    id: 'BOOT-004',
    description: 'No Phantom Connection (L-001: BootNotification silence with PING/PONG alive)',
    status: phantom.detected ? 'fail' : 'pass',
    details: phantom.detected
      ? `🔴 PHANTOM CONNECTION: ${phantom.unrespondedCount} unanswered BootNotification(s) while PING/PONG active — WebSocket transport alive, CSMS application layer silent. Duration: ${phantom.durationStr}`
      : 'No phantom connection pattern detected',
    affectedItems: phantom.affectedMsgIds || [],
  });
  const firstBootTime = boots.length > 0
    ? boots.reduce((min, b) => (new Date(b.timestamp) < new Date(min) ? b.timestamp : min), boots[0].timestamp)
    : null;
  const availableAfterBoot = firstBootTime
    ? statusNotifs.filter((m) => statusOf(m).status === 'Available' && new Date(m.timestamp) > new Date(firstBootTime))
    : [];
  bootGroup.checks.push({
    id: 'BOOT-005',
    description: 'StatusNotification(Available) received on connectors after boot',
    status: boots.length === 0 ? 'info' : availableAfterBoot.length > 0 ? 'pass' : 'warn',
    details:
      boots.length === 0
        ? 'No BootNotifications to check'
        : availableAfterBoot.length > 0
          ? `${availableAfterBoot.length} Available status(es) received after BootNotification`
          : 'No Available StatusNotification after boot — charger may not have reached ready state',
    affectedItems: [],
  });
  bootGroup.checks.push({
    id: 'BOOT-006',
    description: 'Heartbeat messages present (active CSMS connection maintained)',
    status: heartbeats.length > 0 ? 'pass' : 'warn',
    details: heartbeats.length > 0 ? `${heartbeats.length} Heartbeat message(s) found` : 'No Heartbeat messages — very short log window or connection not maintained',
    affectedItems: [],
  });
  groups.push(bootGroup);

  // ── GROUP 2: RESPONSE INTEGRITY ──
  const respGroup: ProtocolCheckGroup = { id: 'RESP', name: 'Response Integrity', icon: '📨', checks: [] };
  const startNoResp = startTxs.filter((m) => !hasResp(m));
  respGroup.checks.push({
    id: 'RESP-001',
    description: 'All StartTransaction requests received responses',
    status: startTxs.length === 0 ? 'info' : startNoResp.length === 0 ? 'pass' : 'fail',
    details:
      startTxs.length === 0
        ? 'No StartTransactions to check'
        : startNoResp.length === 0
          ? `All ${startTxs.length} StartTransaction(s) received responses`
          : `${startNoResp.length}/${startTxs.length} StartTransaction(s) without response — CSMS may have missed session start`,
    affectedItems: startNoResp.map(msgId),
  });
  const stopNoResp = stopTxs.filter((m) => !hasResp(m));
  respGroup.checks.push({
    id: 'RESP-002',
    description: 'All StopTransaction requests received responses',
    status: stopTxs.length === 0 ? 'info' : stopNoResp.length === 0 ? 'pass' : 'warn',
    details:
      stopTxs.length === 0
        ? 'No StopTransactions to check'
        : stopNoResp.length === 0
          ? `All ${stopTxs.length} StopTransaction(s) received responses`
          : `${stopNoResp.length}/${stopTxs.length} StopTransaction(s) without response — session may remain open in CSMS`,
    affectedItems: stopNoResp.map(msgId),
  });
  const hbResponded = heartbeats.filter((m) => hasResp(m));
  const hbRate = heartbeats.length > 0 ? (hbResponded.length / heartbeats.length) * 100 : null;
  respGroup.checks.push({
    id: 'RESP-003',
    description: 'Heartbeat response rate ≥ 95%',
    status: hbRate === null ? 'info' : hbRate >= 95 ? 'pass' : 'warn',
    details: hbRate === null ? 'No Heartbeats to check' : `${hbResponded.length}/${heartbeats.length} Heartbeats responded (${hbRate.toFixed(1)}%)`,
    affectedItems: [],
  });
  groups.push(respGroup);

  // ── GROUP 3: TRANSACTION COMPLETENESS ──
  const txcGroup: ProtocolCheckGroup = { id: 'TXC', name: 'Transaction Completeness', icon: '⚡', checks: [] };
  const incompleteTxs = transactions.filter((tx) => !tx.stopTime);
  txcGroup.checks.push({
    id: 'TXC-001',
    description: 'All started transactions have a matching StopTransaction',
    status: transactions.length === 0 ? 'info' : incompleteTxs.length === 0 ? 'pass' : 'warn',
    details:
      transactions.length === 0
        ? 'No transactions to check'
        : incompleteTxs.length === 0
          ? `All ${completeTxs.length} transaction(s) completed normally`
          : `${incompleteTxs.length} transaction(s) without StopTransaction — may be mid-log boundary or session interrupted`,
    affectedItems: incompleteTxs.map((tx) => tx.id),
  });
  const invalidAuthTxs = startTxs.filter((m) => {
    const s = startRespOf(m)?.idTagInfo?.status;
    return s === 'Invalid' || s === 'Blocked';
  });
  txcGroup.checks.push({
    id: 'TXC-002',
    description: 'All StartTransactions authorized by CSMS (idTagInfo.status = Accepted)',
    status: startTxs.filter((m) => hasResp(m)).length === 0 ? 'info' : invalidAuthTxs.length === 0 ? 'pass' : 'fail',
    details:
      startTxs.filter((m) => hasResp(m)).length === 0
        ? 'No responded StartTransactions to check'
        : invalidAuthTxs.length === 0
          ? 'All responded StartTransaction(s) were authorized'
          : `${invalidAuthTxs.length} StartTransaction(s) returned Invalid/Blocked — queued session rejected (open CMS session), expired tag, or access config issue`,
    affectedItems: invalidAuthTxs.map((m) => startRespOf(m)?.transactionId ?? msgId(m)),
  });
  const zeroEnergyTxs = completeTxs.filter((tx) => {
    const wh = typeof tx.totalEnergy === 'number' ? tx.totalEnergy * 1000 : NaN;
    return !isNaN(wh) && wh < 500;
  });
  txcGroup.checks.push({
    id: 'TXC-003',
    description: 'No zero-energy completed transactions (< 500 Wh dispensed)',
    status: completeTxs.length === 0 ? 'info' : zeroEnergyTxs.length === 0 ? 'pass' : 'warn',
    details:
      completeTxs.length === 0
        ? 'No completed transactions to check'
        : zeroEnergyTxs.length === 0
          ? 'All completed transactions dispensed ≥ 500 Wh'
          : `${zeroEnergyTxs.length} transaction(s) with < 500 Wh — cable lock failure, auth rejection mid-session, or charger fault`,
    affectedItems: zeroEnergyTxs.map((tx) => tx.id),
  });
  groups.push(txcGroup);

  // ── GROUP 4: STATUS TRANSITION SEQUENCE ──
  const statusGroup: ProtocolCheckGroup = { id: 'STATUS', name: 'Status Transition Sequence', icon: '🔄', checks: [] };
  const physConnIds = [...new Set(statusNotifs.map((m) => statusOf(m).connectorId))].filter(
    (id): id is number => id !== 0 && id !== undefined,
  );
  const connsNoAvailable = physConnIds.filter(
    (cid) => !statusNotifs.some((m) => statusOf(m).connectorId === cid && statusOf(m).status === 'Available'),
  );
  statusGroup.checks.push({
    id: 'STATUS-001',
    description: 'All connectors report Available status at some point',
    status: physConnIds.length === 0 ? 'info' : connsNoAvailable.length === 0 ? 'pass' : 'warn',
    details:
      physConnIds.length === 0
        ? 'No StatusNotifications found'
        : connsNoAvailable.length === 0
          ? `All ${physConnIds.length} connector(s) reported Available`
          : `Connector(s) ${connsNoAvailable.join(', ')} never reported Available — persistent fault or incomplete log`,
    affectedItems: connsNoAvailable.map((c) => `C${c}`),
  });
  const faultedDuringCharge: { txId: number; count: number }[] = [];
  completeTxs.forEach((tx) => {
    const s = new Date(tx.startTime);
    const e = new Date(tx.stopTime as string);
    const faults = statusNotifs.filter((m) => {
      const p = statusOf(m);
      if (p.status !== 'Faulted') return false;
      if (p.connectorId !== tx.connectorId && p.connectorId !== 0) return false;
      const t = new Date(m.timestamp);
      return t > s && t < e;
    });
    if (faults.length > 0) faultedDuringCharge.push({ txId: tx.id, count: faults.length });
  });
  statusGroup.checks.push({
    id: 'STATUS-002',
    description: 'No Faulted status during active charging sessions',
    status: faultedDuringCharge.length === 0 ? (completeTxs.length > 0 ? 'pass' : 'info') : 'warn',
    details:
      faultedDuringCharge.length === 0
        ? completeTxs.length > 0
          ? 'No Faulted StatusNotification during active transactions'
          : 'No completed transactions to check'
        : `${faultedDuringCharge.length} transaction(s) had Faulted status during charging`,
    affectedItems: faultedDuringCharge.map((f) => f.txId),
  });
  const txsNoPreparing = completeTxs.filter((tx) => {
    if (!tx.startTime) return false;
    const s = new Date(tx.startTime);
    return !statusNotifs.some((m) => {
      const p = statusOf(m);
      return (
        p.connectorId === tx.connectorId &&
        p.status === 'Preparing' &&
        new Date(m.timestamp) <= s &&
        new Date(m.timestamp) >= new Date(s.getTime() - 10 * 60 * 1000)
      );
    });
  });
  statusGroup.checks.push({
    id: 'STATUS-003',
    description: 'StatusNotification(Preparing) precedes each StartTransaction',
    status: completeTxs.length === 0 ? 'info' : txsNoPreparing.length === 0 ? 'pass' : 'warn',
    details:
      completeTxs.length === 0
        ? 'No transactions to check'
        : txsNoPreparing.length === 0
          ? 'All transactions preceded by Preparing status'
          : `${txsNoPreparing.length} transaction(s) missing Preparing status — possible remote start or log boundary`,
    affectedItems: txsNoPreparing.map((tx) => tx.id),
  });
  const txsNoCharging = completeTxs.filter((tx) => {
    if (!tx.startTime || !tx.stopTime) return false;
    const s = new Date(tx.startTime);
    const e = new Date(tx.stopTime);
    return !statusNotifs.some((m) => {
      const p = statusOf(m);
      return p.connectorId === tx.connectorId && p.status === 'Charging' && new Date(m.timestamp) >= s && new Date(m.timestamp) <= e;
    });
  });
  statusGroup.checks.push({
    id: 'STATUS-004',
    description: 'StatusNotification(Charging) present during active transaction',
    status: completeTxs.length === 0 ? 'info' : txsNoCharging.length === 0 ? 'pass' : 'warn',
    details:
      completeTxs.length === 0
        ? 'No transactions to check'
        : txsNoCharging.length === 0
          ? 'All transactions had Charging status during session'
          : `${txsNoCharging.length} transaction(s) missing Charging status — EV may not have accepted power or status not reported`,
    affectedItems: txsNoCharging.map((tx) => tx.id),
  });
  const txsNoRelease = completeTxs.filter((tx) => {
    const e = new Date(tx.stopTime as string);
    return !statusNotifs.some((m) => {
      const p = statusOf(m);
      return (
        p.connectorId === tx.connectorId &&
        (p.status === 'Finishing' || p.status === 'Available') &&
        new Date(m.timestamp) >= e &&
        new Date(m.timestamp) <= new Date(e.getTime() + 10 * 60 * 1000)
      );
    });
  });
  statusGroup.checks.push({
    id: 'STATUS-005',
    description: 'Connector reports Finishing/Available after each StopTransaction',
    status: completeTxs.length === 0 ? 'info' : txsNoRelease.length === 0 ? 'pass' : 'warn',
    details:
      completeTxs.length === 0
        ? 'No completed transactions to check'
        : txsNoRelease.length === 0
          ? 'All completed transactions followed by proper connector status release'
          : `${txsNoRelease.length} transaction(s) missing Finishing/Available after StopTransaction`,
    affectedItems: txsNoRelease.map((tx) => tx.id),
  });
  groups.push(statusGroup);

  // ── GROUP 5: METER VALUES INTEGRITY ──
  const mvGroup: ProtocolCheckGroup = { id: 'MV', name: 'MeterValues Integrity', icon: '📊', checks: [] };
  const txsWithBeginMV = new Set<number | undefined>();
  meterValues.forEach((mv) => {
    const p = mvPayloadOf(mv);
    if (p.meterValue) {
      p.meterValue.forEach((entry) => {
        if (entry.sampledValue?.some((sv) => sv.context === 'Transaction.Begin')) txsWithBeginMV.add(p.transactionId);
      });
    }
  });
  const txsNoBeginMV = completeTxs.filter((tx) => !txsWithBeginMV.has(tx.id));
  mvGroup.checks.push({
    id: 'MV-001',
    description: 'Transaction.Begin MeterValues present for all transactions',
    status: completeTxs.length === 0 ? 'info' : txsNoBeginMV.length === 0 ? 'pass' : 'warn',
    details:
      completeTxs.length === 0
        ? 'No completed transactions to check'
        : txsNoBeginMV.length === 0
          ? `All ${completeTxs.length} transaction(s) have Transaction.Begin MeterValues`
          : `${txsNoBeginMV.length} transaction(s) missing Transaction.Begin MeterValues`,
    affectedItems: txsNoBeginMV.map((tx) => tx.id),
  });
  const txsWithPeriodicMV = new Set<number | undefined>();
  meterValues.forEach((mv) => {
    const p = mvPayloadOf(mv);
    if (p.meterValue?.some((e) => e.sampledValue?.some((sv) => sv.context === 'Sample.Periodic')))
      txsWithPeriodicMV.add(p.transactionId);
  });
  const txsNoPeriodicMV = completeTxs.filter(
    (tx) => !txsWithPeriodicMV.has(tx.id) && typeof tx.duration === 'number' && tx.duration > 2,
  );
  mvGroup.checks.push({
    id: 'MV-002',
    description: 'Periodic MeterValues (Sample.Periodic) present during transactions',
    status: completeTxs.length === 0 ? 'info' : txsNoPeriodicMV.length === 0 ? 'pass' : 'warn',
    details:
      completeTxs.length === 0
        ? 'No transactions to check'
        : txsNoPeriodicMV.length === 0
          ? 'All applicable transactions have periodic MeterValues'
          : `${txsNoPeriodicMV.length} transaction(s) longer than 2 min with no periodic MeterValues`,
    affectedItems: txsNoPeriodicMV.map((tx) => tx.id),
  });
  const validTxIds = new Set<number>([
    ...startTxs.map((m) => startRespOf(m)?.transactionId).filter((x): x is number => Boolean(x)),
    ...transactions.map((tx) => tx.id),
  ]);
  const orphanedMVCount = meterValues.filter((mv) => {
    const id = mvPayloadOf(mv).transactionId;
    return id != null && !validTxIds.has(id);
  }).length;
  mvGroup.checks.push({
    id: 'MV-003',
    description: 'No orphaned MeterValues (all reference valid transaction IDs)',
    status: orphanedMVCount === 0 ? 'pass' : 'warn',
    details:
      orphanedMVCount === 0
        ? 'All MeterValues reference valid transaction IDs'
        : `${orphanedMVCount} MeterValue message(s) reference unknown transaction IDs — likely queued burst delivery from prior session`,
    affectedItems: [],
  });
  const continuityIssues = transactions.filter((tx) => typeof tx.startStopDiff === 'number' && Math.abs(tx.startStopDiff) > 10);
  mvGroup.checks.push({
    id: 'MV-004',
    description: 'Meter start/stop continuity between consecutive sessions (diff < 10 Wh)',
    status: transactions.filter((tx) => tx.startStopDiff !== null && tx.startStopDiff !== undefined).length === 0
      ? 'info'
      : continuityIssues.length === 0 ? 'pass' : 'warn',
    details:
      transactions.filter((tx) => tx.startStopDiff !== null && tx.startStopDiff !== undefined).length === 0
        ? 'No consecutive sessions on same connector to check'
        : continuityIssues.length === 0
          ? 'Meter readings are continuous between consecutive sessions'
          : `${continuityIssues.length} transaction(s) with meter discontinuity > 10 Wh — idle draw, unreported sessions, or meter fault`,
    affectedItems: continuityIssues.map((tx) => tx.id),
  });
  groups.push(mvGroup);

  // ── PER-TRANSACTION LIFECYCLE ──
  const perTransactionResults: PerTransactionResult[] = transactions.map((tx) => {
    const txStart = tx.startTime ? new Date(tx.startTime) : null;
    const txStop = tx.stopTime ? new Date(tx.stopTime) : null;
    const startMsg = startTxs.find((m) => startRespOf(m)?.transactionId === tx.id);
    const stopMsg = stopTxs.find((m) => stopPayloadOf(m).transactionId === tx.id);
    const mk = (stage: string, status: CheckStatus, note: string): LifecycleStage => ({ stage, status, note });
    const internalTxId = tx.internalTransactionId || internalTxMap.get(String(tx.id)) || null;
    const stopTxIdZero = !!stopMsg && stopPayloadOf(stopMsg).transactionId === 0;

    const preparingFound = !!txStart && statusNotifs.find((m) => {
      const p = statusOf(m);
      return (
        p.connectorId === tx.connectorId &&
        p.status === 'Preparing' &&
        new Date(m.timestamp) <= txStart &&
        new Date(m.timestamp) >= new Date(txStart.getTime() - 10 * 60 * 1000)
      );
    });
    const chargingFound = !!txStart && statusNotifs.find((m) => {
      const p = statusOf(m);
      return (
        p.connectorId === tx.connectorId &&
        p.status === 'Charging' &&
        new Date(m.timestamp) >= txStart &&
        (!txStop || new Date(m.timestamp) <= txStop)
      );
    });
    const releaseFound = txStop
      ? statusNotifs.find((m) => {
          const p = statusOf(m);
          return (
            p.connectorId === tx.connectorId &&
            (p.status === 'Finishing' || p.status === 'Available') &&
            new Date(m.timestamp) >= txStop &&
            new Date(m.timestamp) <= new Date(txStop.getTime() + 10 * 60 * 1000)
          );
        })
      : undefined;

    const periodicCount = meterValues.filter((mv) => {
      const p = mvPayloadOf(mv);
      return p.transactionId === tx.id && p.meterValue?.some((e) => e.sampledValue?.some((sv) => sv.context === 'Sample.Periodic'));
    }).length;

    const authStatus = startMsg ? startRespOf(startMsg)?.idTagInfo?.status : undefined;
    const stopRespOk = !!stopMsg && hasResp(stopMsg);

    const lifecycle: LifecycleStage[] = [
      mk(
        'EV Connected — Preparing',
        !txStart ? 'info' : preparingFound ? 'pass' : 'warn',
        !txStart ? 'N/A' : preparingFound ? `Connector ${tx.connectorId} → Preparing` : 'No Preparing status before StartTransaction (possible remote start or log boundary)',
      ),
      mk('StartTransaction Sent', startMsg ? 'pass' : 'fail', startMsg ? `TX ${tx.id} — ID tag: ${tx.idTag || 'N/A'}` : 'StartTransaction message not found'),
      mk(
        'CSMS Authorization',
        !authStatus ? 'warn' : authStatus === 'Accepted' ? 'pass' : 'fail',
        authStatus ? `CSMS: ${authStatus}` : 'No authorization response received',
      ),
      mk('Charging — Power Delivery', !txStart ? 'info' : chargingFound ? 'pass' : 'warn', chargingFound ? `Connector ${tx.connectorId} → Charging` : 'No Charging status during transaction'),
      mk('MeterValues: Transaction.Begin', txsWithBeginMV.has(tx.id) ? 'pass' : 'warn', txsWithBeginMV.has(tx.id) ? 'Transaction.Begin MeterValues received' : 'No Transaction.Begin MeterValues'),
      mk(
        'MeterValues: Periodic Samples',
        periodicCount >= 1 ? 'pass' : typeof tx.duration === 'number' && tx.duration < 2 ? 'info' : 'warn',
        periodicCount > 0 ? `${periodicCount} periodic sample(s) during session` : 'No periodic MeterValues received',
      ),
      mk('StopTransaction Sent', stopMsg ? 'pass' : tx.stopTime ? 'warn' : 'fail', stopMsg ? `Reason: ${tx.stopReason || 'N/A'}` : 'No StopTransaction — session may be ongoing or interrupted'),
      mk('CSMS Stop Acknowledged', !stopMsg ? 'info' : stopRespOk ? 'pass' : 'fail', !stopMsg ? 'N/A' : stopRespOk ? 'CSMS acknowledged StopTransaction' : 'No response — CSMS may not have closed session'),
      mk(
        'Session Released — Finishing/Available',
        !txStop ? 'info' : releaseFound ? 'pass' : 'warn',
        !txStop ? 'Session not yet ended' : releaseFound ? `Connector ${tx.connectorId} → ${statusOf(releaseFound).status}` : 'Connector did not report Finishing/Available after StopTransaction',
      ),
      mk(
        'CMS ↔ Internal TX ID',
        stopTxIdZero ? 'fail' : internalTxId ? 'pass' : 'warn',
        stopTxIdZero
          ? `StopTransaction sent with transactionId=0 — CMS cannot match session. Internal: ${internalTxId || 'N/A'}`
          : internalTxId
            ? `CMS: ${tx.id} ↔ Internal: ${internalTxId}`
            : 'Internal TX ID not found in log (runtime line absent or older firmware)',
      ),
    ];

    const failedCount = lifecycle.filter((s) => s.status === 'fail').length;
    const warnCount = lifecycle.filter((s) => s.status === 'warn').length;
    return {
      txId: tx.id,
      connectorId: tx.connectorId,
      startTime: tx.startTime,
      stopTime: tx.stopTime,
      idTag: tx.idTag,
      totalEnergy: tx.totalEnergy,
      internalTransactionId: internalTxId,
      lifecycle,
      overallStatus: failedCount > 0 ? 'fail' : warnCount > 0 ? 'warn' : 'pass',
      failedCount,
      warnCount,
    };
  });

  // ── SUMMARY ──
  const allChecks = groups.flatMap((g) => g.checks);
  const infoCount = allChecks.filter((c) => c.status === 'info').length;
  const passedCount = allChecks.filter((c) => c.status === 'pass').length;
  const warnCount = allChecks.filter((c) => c.status === 'warn').length;
  const failedCount = allChecks.filter((c) => c.status === 'fail').length;
  const evaluated = allChecks.length - infoCount;
  const compliance = evaluated > 0 ? Math.round((passedCount / evaluated) * 100) : 100;

  return {
    groups,
    perTransactionResults,
    summary: {
      total: allChecks.length,
      passed: passedCount,
      warnings: warnCount,
      failed: failedCount,
      info: infoCount,
      evaluated,
      compliance,
    },
  };
}
