// Post-processing detectors for fault recoveries that arrived without the
// expected re-sync messages. Faithful ports of the v2026.05.14 tool's
// `detectMissingBootAfterPowerRestore` (HTML 1072) and
// `detectMissingStatusAfterEmergencyStop` (HTML 1160). Both run on
// already-resolved downtimes from `detectDowntimes`.

import type { ParsedMessage } from '../model/types';
import type { Downtime, MissingSyncFlag, RecoveryConnectorStatus } from './types';

interface StatusPayload {
  connectorId?: number;
  status?: string;
  info?: string;
  vendorErrorCode?: string;
}

/** 30s buffer: physical connector StatusNotifications can lag the connector-0 trigger. */
const RECOVERY_BUFFER_MS = 30000;

function collectRecoveryStatuses(
  messages: ParsedMessage[],
  startTime: Date,
  checkEndTime: Date,
  isFaultStatus: (p: StatusPayload) => boolean,
): RecoveryConnectorStatus[] {
  const connectorStatusMap = new Map<number, string>();
  messages
    .filter((m) => {
      if (!m.message || m.message[2] !== 'StatusNotification') return false;
      const payload = m.message[3] as StatusPayload | undefined;
      if (!payload) return false;
      if (isFaultStatus(payload)) return false;
      const msgTime = new Date(m.timestamp);
      return msgTime > startTime && msgTime <= checkEndTime;
    })
    .forEach((m) => {
      const payload = m.message[3] as StatusPayload;
      if (payload && payload.status !== undefined && payload.connectorId !== undefined) {
        connectorStatusMap.set(payload.connectorId, payload.status);
      }
    });
  return [...connectorStatusMap.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([connectorId, status]) => ({ connectorId, status }));
}

/**
 * Flag resolved Power Failures that recovered without a BootNotification and/or
 * a (non-PowerFailure) StatusNotification in the recovery window.
 */
export function detectMissingBootAfterPowerRestore(
  downtimes: Downtime[],
  messages: ParsedMessage[],
): MissingSyncFlag[] {
  const flags: MissingSyncFlag[] = [];
  const resolvedPowerFailures = downtimes.filter((d) => d.reason === 'Power Failure' && d.endTime);

  resolvedPowerFailures.forEach((pf) => {
    const pfStartTime = new Date(pf.startTime);
    const pfEndTime = new Date(pf.endTime as string);
    const checkEndTime = new Date(pfEndTime.getTime() + RECOVERY_BUFFER_MS);

    const isPowerFailureStatus = (payload: StatusPayload): boolean =>
      payload.info === 'PowerFailure' || (payload.status === 'Faulted' && payload.vendorErrorCode === '19');

    const hasBoot = messages.some((m) => {
      if (!m.message || m.message[2] !== 'BootNotification') return false;
      const msgTime = new Date(m.timestamp);
      return msgTime >= pfStartTime && msgTime <= checkEndTime;
    });

    const recoveryStatusMsg = messages.find((m) => {
      if (!m.message || m.message[2] !== 'StatusNotification') return false;
      const payload = m.message[3] as StatusPayload | undefined;
      if (!payload) return false;
      if (isPowerFailureStatus(payload)) return false;
      const msgTime = new Date(m.timestamp);
      return msgTime > pfStartTime && msgTime <= checkEndTime;
    });
    const hasRecoveryStatus = !!recoveryStatusMsg;

    const recoveryStatusPerConnector = collectRecoveryStatuses(messages, pfStartTime, checkEndTime, isPowerFailureStatus);

    if (!hasBoot || !hasRecoveryStatus) {
      const missingItems: string[] = [];
      if (!hasBoot) missingItems.push('BootNotification');
      if (!hasRecoveryStatus) missingItems.push('StatusNotification');
      const missingText = missingItems.join(' and ');

      flags.push({
        reason: 'Power Restore – Missing Sync',
        startTime: pf.startTime,
        startLineNumber: pf.startLineNumber,
        endTime: pf.endTime as string,
        endLineNumber: pf.endLineNumber,
        duration: pf.duration,
        ocppErrorCode: pf.ocppErrorCode || 'OtherError',
        cpoErrorCode: pf.cpoErrorCode || 'N/A',
        vendorErrorCode: pf.vendorErrorCode || '19',
        info: `Power restored (line ${pf.endLineNumber}) but missing: ${missingText}. Power Failure started at line ${pf.startLineNumber}.`,
        missingBoot: !hasBoot,
        missingStatus: !hasRecoveryStatus,
        recoveryStatusPerConnector,
      });
    }
  });

  return flags;
}

/**
 * Flag every resolved Emergency Stop with whether its release came with a
 * (non-EmergencyPressed) StatusNotification. Unlike Power Failure, no
 * BootNotification is expected — so a flag is always emitted.
 */
export function detectMissingStatusAfterEmergencyStop(
  downtimes: Downtime[],
  messages: ParsedMessage[],
): MissingSyncFlag[] {
  const flags: MissingSyncFlag[] = [];
  const resolvedEmergencyStops = downtimes.filter((d) => d.reason === 'Emergency Stop' && d.endTime);

  resolvedEmergencyStops.forEach((es) => {
    const esStartTime = new Date(es.startTime);
    const esEndTime = new Date(es.endTime as string);
    const checkEndTime = new Date(esEndTime.getTime() + RECOVERY_BUFFER_MS);

    const isEmergencyStatus = (payload: StatusPayload): boolean =>
      payload.info === 'EmergencyPressed' || (payload.status === 'Faulted' && payload.vendorErrorCode === '17');

    const recoveryStatusMsg = messages.find((m) => {
      if (!m.message || m.message[2] !== 'StatusNotification') return false;
      const payload = m.message[3] as StatusPayload | undefined;
      if (!payload) return false;
      if (isEmergencyStatus(payload)) return false;
      const msgTime = new Date(m.timestamp);
      return msgTime > esStartTime && msgTime <= checkEndTime;
    });
    const hasRecoveryStatus = !!recoveryStatusMsg;

    const recoveryStatusPerConnector = collectRecoveryStatuses(messages, esStartTime, checkEndTime, isEmergencyStatus);

    flags.push({
      reason: 'Emergency Stop – Status Update',
      startTime: es.startTime,
      startLineNumber: es.startLineNumber,
      endTime: es.endTime as string,
      endLineNumber: es.endLineNumber,
      duration: es.duration,
      ocppErrorCode: es.ocppErrorCode || 'OtherError',
      cpoErrorCode: es.cpoErrorCode || 'N/A',
      vendorErrorCode: es.vendorErrorCode || '17',
      info: hasRecoveryStatus
        ? `Emergency Stop released (line ${es.endLineNumber}) with StatusNotification received. Emergency Stop started at line ${es.startLineNumber}.`
        : `Emergency Stop released (line ${es.endLineNumber}) but no StatusNotification received. Emergency Stop started at line ${es.startLineNumber}.`,
      missingStatus: !hasRecoveryStatus,
      recoveryStatusPerConnector,
    });
  });

  return flags;
}
