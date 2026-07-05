import { describe, it, expect } from 'vitest';
import { analyzeLogLines } from '../../src/app/analyze';

const L = (ts: string, dir: '>>' | '<<', frame: unknown[]) =>
  `[${ts}] ${dir === '>>' ? '>> message sent' : '<< message received'}: ${JSON.stringify(frame)}`;

function resultsFor(lines: string[]) {
  const r = analyzeLogLines(lines, 'synthetic.txt');
  return r.cpCompliance.groups.flatMap((g) => g.results);
}

describe('STATUS-010 — MeterValues must be preceded by a Charging status', () => {
  it('warns when MeterValues flow with no prior Charging status (charging after error)', () => {
    const lines = [
      L('2026-07-04T07:33:08.480Z', '>>', [2, 'm1', 'StatusNotification', { connectorId: 2, errorCode: 'NoError', status: 'Preparing', timestamp: '2026-07-04T07:33:08.480Z' }]),
      L('2026-07-04T07:37:24.941Z', '>>', [2, 'm2', 'StatusNotification', { connectorId: 2, errorCode: 'EVCommunicationError', info: 'BMSCommunicationTimeout', status: 'SuspendedEV', timestamp: '2026-07-04T07:37:24.941Z', vendorErrorCode: '1' }]),
      L('2026-07-04T07:38:18.742Z', '>>', [2, 'm4', 'StartTransaction', { connectorId: 2, idTag: '5448', meterStart: 3306340, timestamp: '2026-07-04T07:38:18.742Z' }]),
      L('2026-07-04T07:38:20.000Z', '<<', [3, 'm4', { transactionId: 555, idTagInfo: { status: 'Accepted' } }]),
      L('2026-07-04T07:38:25.000Z', '>>', [2, 'm5', 'MeterValues', { connectorId: 2, transactionId: 555, meterValue: [{ timestamp: '2026-07-04T07:38:25.000Z', sampledValue: [{ value: '100' }] }] }]),
    ];
    const s10 = resultsFor(lines).find((x) => x.id === 'STATUS-010')!;
    expect(s10.status).toBe('warn');
  });

  it('passes when a Charging status precedes the MeterValues', () => {
    const lines = [
      L('2026-07-04T07:33:08.480Z', '>>', [2, 'm1', 'StatusNotification', { connectorId: 2, errorCode: 'NoError', status: 'Charging', timestamp: '2026-07-04T07:33:08.480Z' }]),
      L('2026-07-04T07:38:25.000Z', '>>', [2, 'm5', 'MeterValues', { connectorId: 2, transactionId: 555, meterValue: [{ timestamp: '2026-07-04T07:38:25.000Z', sampledValue: [{ value: '100' }] }] }]),
    ];
    const s10 = resultsFor(lines).find((x) => x.id === 'STATUS-010')!;
    expect(s10.status).toBe('pass');
  });
});

describe('STATUS-011 — same fault must report a consistent errorCode', () => {
  it('warns when the same info+vendorErrorCode appears under two errorCodes', () => {
    const lines = [
      L('2026-07-04T07:37:24.941Z', '>>', [2, 'm2', 'StatusNotification', { connectorId: 2, errorCode: 'EVCommunicationError', info: 'BMSCommunicationTimeout', status: 'SuspendedEV', timestamp: '2026-07-04T07:37:24.941Z', vendorErrorCode: '1' }]),
      L('2026-07-04T07:37:38.203Z', '>>', [2, 'm3', 'StatusNotification', { connectorId: 2, errorCode: 'OtherError', info: 'BMSCommunicationTimeout', status: 'Finishing', timestamp: '2026-07-04T07:37:38.203Z', vendorErrorCode: '1' }]),
    ];
    const s11 = resultsFor(lines).find((x) => x.id === 'STATUS-011')!;
    expect(s11.status).toBe('warn');
    expect(s11.affected.length).toBe(2);
  });

  it('passes when each fault maps to a single errorCode', () => {
    const lines = [
      L('2026-07-04T07:37:24.941Z', '>>', [2, 'm2', 'StatusNotification', { connectorId: 2, errorCode: 'EVCommunicationError', info: 'BMSCommunicationTimeout', status: 'SuspendedEV', timestamp: '2026-07-04T07:37:24.941Z', vendorErrorCode: '1' }]),
      L('2026-07-04T07:37:38.203Z', '>>', [2, 'm3', 'StatusNotification', { connectorId: 2, errorCode: 'EVCommunicationError', info: 'BMSCommunicationTimeout', status: 'Finishing', timestamp: '2026-07-04T07:37:38.203Z', vendorErrorCode: '1' }]),
    ];
    const s11 = resultsFor(lines).find((x) => x.id === 'STATUS-011')!;
    expect(s11.status).toBe('pass');
  });
});
