import { describe, it, expect } from 'vitest';
import { detectDowntimes } from '../../src/app/detect/detectDowntimes';
import type { ParsedMessage, ParsedAlert } from '../../src/app/model/types';
import {
  CONNECTION_LOST_LINES,
  POWER_FAILURE_LINES,
  EMERGENCY_STOP_LINES,
  UNDER_VOLTAGE_LINES,
  WS_EVENT_LINES,
} from '../fixtures/downtimeLines';

const NO_MESSAGES: ParsedMessage[] = [];
const NO_ALERTS: ParsedAlert[] = [];

describe('detectDowntimes — Connection Lost', () => {
  const { downtimes } = detectDowntimes(CONNECTION_LOST_LINES, NO_MESSAGES, NO_ALERTS);

  it('starts the downtime at the last PONG and ends at BootNotification Accepted', () => {
    expect(downtimes).toHaveLength(1);
    expect(downtimes[0]).toMatchObject({
      reason: 'Connection Lost',
      startTime: '2025-08-22T02:50:00.100Z', // last PONG, not the disconnect line
      startLineNumber: 2,
      endLineNumber: 4,
      duration: '00:00:59',
      ocppErrorCode: 'N/A',
    });
  });
});

describe('detectDowntimes — Power Failure', () => {
  const { downtimes } = detectDowntimes(POWER_FAILURE_LINES, NO_MESSAGES, NO_ALERTS);

  it('detects start and resolves on connector-0 NoError recovery, with fixed error codes', () => {
    expect(downtimes).toHaveLength(1);
    expect(downtimes[0]).toMatchObject({
      reason: 'Power Failure',
      startTime: '2025-08-22T05:00:00.000Z',
      endTime: '2025-08-22T05:05:00.000Z',
      duration: '00:05:00',
      ocppErrorCode: 'OtherError',
      vendorErrorCode: '19',
    });
  });
});

describe('detectDowntimes — Emergency Stop', () => {
  const { downtimes } = detectDowntimes(EMERGENCY_STOP_LINES, NO_MESSAGES, NO_ALERTS);

  it('detects start and resolves on connector-0 recovery, with vendor code 17', () => {
    expect(downtimes).toHaveLength(1);
    expect(downtimes[0]).toMatchObject({
      reason: 'Emergency Stop',
      startTime: '2025-08-22T07:00:00.000Z',
      endTime: '2025-08-22T07:02:00.000Z',
      duration: '00:02:00',
      ocppErrorCode: 'OtherError',
      vendorErrorCode: '17',
    });
  });
});

describe('detectDowntimes — Input Under Voltage (continuous, silence recovery)', () => {
  const { downtimes } = detectDowntimes(UNDER_VOLTAGE_LINES, NO_MESSAGES, NO_ALERTS);

  it('recovers via 1-minute silence, ending at the last-seen report time', () => {
    expect(downtimes).toHaveLength(1);
    expect(downtimes[0]).toMatchObject({
      reason: 'Input Under Voltage',
      startTime: '2025-08-22T06:00:00.000Z',
      endTime: '2025-08-22T06:00:10.000Z', // last-seen report, not the idle line
      endLineNumber: 2,
      duration: '00:00:10',
      vendorErrorCode: '26',
    });
  });
});

describe('detectDowntimes — ongoing (no recovery)', () => {
  it('reports an unresolved downtime as Ongoing with a null endTime', () => {
    const { downtimes } = detectDowntimes([POWER_FAILURE_LINES[0]], NO_MESSAGES, NO_ALERTS);
    expect(downtimes).toHaveLength(1);
    expect(downtimes[0].endTime).toBeNull();
    expect(downtimes[0].duration).toBe('Ongoing');
  });
});

describe('detectDowntimes — WebSocket event harvest (FR-334)', () => {
  it('collects PING / PONG / server-PING events in the same pass', () => {
    const { wsEvents } = detectDowntimes(WS_EVENT_LINES, NO_MESSAGES, NO_ALERTS);
    expect(wsEvents.pings.map(e => e.lineNo)).toEqual([1]);
    expect(wsEvents.pongs.map(e => e.lineNo)).toEqual([2]);
    expect(wsEvents.serverPings.map(e => e.lineNo)).toEqual([3]);
    expect(wsEvents.pings[0].ts).toBe('2025-08-22T01:00:00.000Z');
  });
});
