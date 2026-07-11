import { describe, it, expect } from 'vitest';
import {
  detectMissingBootAfterPowerRestore,
  detectMissingStatusAfterEmergencyStop,
} from '../../src/app/detect/missingSync';
import { detectIncompleteTransactions } from '../../src/app/detect/incompleteTransactions';
import type { Downtime } from '../../src/app/detect/types';
import type { ParsedMessage } from '../../src/app/model/types';
import { createMessageGroups } from '../../src/app/model/types';

function msg(action: string, payload: unknown, timestamp: string, lineNumber: number): ParsedMessage {
  return { timestamp, direction: 'sent', message: [2, `id-${lineNumber}`, action, payload], lineNumber, fileName: 'f' };
}

const resolvedPowerFailure: Downtime = {
  reason: 'Power Failure',
  startTime: '2025-08-22T05:00:00.000Z',
  startLineNumber: 10,
  endTime: '2025-08-22T05:05:00.000Z',
  endLineNumber: 20,
  lastSeenTime: '2025-08-22T05:00:00.000Z',
  lastSeenLineNumber: 10,
  duration: '00:05:00',
  ocppErrorCode: 'OtherError',
  cpoErrorCode: 'N/A',
  vendorErrorCode: '19',
};

describe('detectMissingBootAfterPowerRestore', () => {
  it('flags a Power Failure that recovered without a BootNotification', () => {
    const messages = [
      // recovery StatusNotification present, but no BootNotification in the window
      msg('StatusNotification', { connectorId: 1, errorCode: 'NoError', status: 'Available' }, '2025-08-22T05:04:00.000Z', 18),
    ];
    const flags = detectMissingBootAfterPowerRestore([resolvedPowerFailure], messages);
    expect(flags).toHaveLength(1);
    expect(flags[0]).toMatchObject({
      reason: 'Power Restore – Missing Sync',
      missingBoot: true,
      missingStatus: false,
      vendorErrorCode: '19',
    });
    expect(flags[0].recoveryStatusPerConnector).toEqual([{ connectorId: 1, status: 'Available' }]);
  });

  it('does not flag when both BootNotification and a recovery StatusNotification are present', () => {
    const messages = [
      msg('BootNotification', { chargePointVendor: 'Ador' }, '2025-08-22T05:03:00.000Z', 16),
      msg('StatusNotification', { connectorId: 1, errorCode: 'NoError', status: 'Available' }, '2025-08-22T05:04:00.000Z', 18),
    ];
    expect(detectMissingBootAfterPowerRestore([resolvedPowerFailure], messages)).toHaveLength(0);
  });

  it('ignores the PowerFailure StatusNotifications themselves when judging recovery', () => {
    const messages = [
      msg('BootNotification', {}, '2025-08-22T05:03:00.000Z', 16),
      // only a PowerFailure status in window → not a recovery status → missingStatus
      msg('StatusNotification', { status: 'Faulted', vendorErrorCode: '19', info: 'PowerFailure' }, '2025-08-22T05:04:00.000Z', 18),
    ];
    const flags = detectMissingBootAfterPowerRestore([resolvedPowerFailure], messages);
    expect(flags).toHaveLength(1);
    expect(flags[0].missingBoot).toBe(false);
    expect(flags[0].missingStatus).toBe(true);
  });
});

const resolvedEmergencyStop: Downtime = {
  reason: 'Emergency Stop',
  startTime: '2025-08-22T07:00:00.000Z',
  startLineNumber: 30,
  endTime: '2025-08-22T07:02:00.000Z',
  endLineNumber: 40,
  lastSeenTime: '2025-08-22T07:00:00.000Z',
  lastSeenLineNumber: 30,
  duration: '00:02:00',
  ocppErrorCode: 'OtherError',
  cpoErrorCode: 'N/A',
  vendorErrorCode: '17',
};

describe('detectMissingStatusAfterEmergencyStop', () => {
  it('always emits a flag; marks missingStatus=false when a recovery StatusNotification exists', () => {
    const messages = [
      msg('StatusNotification', { connectorId: 2, errorCode: 'NoError', status: 'Available' }, '2025-08-22T07:01:00.000Z', 38),
    ];
    const flags = detectMissingStatusAfterEmergencyStop([resolvedEmergencyStop], messages);
    expect(flags).toHaveLength(1);
    expect(flags[0]).toMatchObject({ reason: 'Emergency Stop – Status Update', missingStatus: false, vendorErrorCode: '17' });
    expect(flags[0].recoveryStatusPerConnector).toEqual([{ connectorId: 2, status: 'Available' }]);
  });

  it('marks missingStatus=true when no recovery StatusNotification is present', () => {
    const flags = detectMissingStatusAfterEmergencyStop([resolvedEmergencyStop], []);
    expect(flags).toHaveLength(1);
    expect(flags[0].missingStatus).toBe(true);
  });
});

describe('detectIncompleteTransactions', () => {
  it('detects a Start without a Stop and a Stop without a Start, and classifies location', () => {
    const groups = createMessageGroups();
    const start = msg('StartTransaction', { connectorId: 1 }, '2025-08-22T08:00:00.000Z', 1);
    start.responsePayload = { transactionId: 100 };
    groups.StartTransaction.push(start);
    groups.StopTransaction.push(msg('StopTransaction', { transactionId: 200 }, '2025-08-22T09:00:00.000Z', 2));

    const incomplete = detectIncompleteTransactions(groups, []);
    expect(incomplete).toHaveLength(2);

    const noStop = incomplete.find((i) => i.id === 100);
    expect(noStop).toMatchObject({ missing: 'Stop', connectorId: 1, location: 'Start of Logs' });

    const noStart = incomplete.find((i) => i.id === 200);
    expect(noStart).toMatchObject({ missing: 'Start', connectorId: 'N/A' });
  });
});
