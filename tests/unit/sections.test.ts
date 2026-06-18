// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import type { ParsedMessage } from '../../src/app/model/types';
import type { AnalysisResult } from '../../src/app/analyze';
import { renderHeartbeats } from '../../src/app/render/sections/heartbeats';
import { renderStartTransactions } from '../../src/app/render/sections/startTransactions';
import { renderStopTransactions } from '../../src/app/render/sections/stopTransactions';
import { renderBootNotifications } from '../../src/app/render/sections/bootNotifications';

function msg(over: Partial<ParsedMessage> & { message: unknown[] }): ParsedMessage {
  return { timestamp: '2025-08-22T00:00:00.000Z', direction: 'received', lineNumber: 1, fileName: 'log.txt', ...over } as ParsedMessage;
}

/** Minimal AnalysisResult carrying only the groups a section reads. */
function bundle(over: Partial<AnalysisResult>): AnalysisResult {
  return { messageGroups: { BootNotification: [], Heartbeat: [], StatusNotification: [], StartTransaction: [], StopTransaction: [], MeterValues: [], Other: [] }, internalTxMap: new Map(), ...over } as AnalysisResult;
}

describe('renderHeartbeats', () => {
  it('renders one row per heartbeat with timestamp, message id, and N/A response time', () => {
    const r = bundle({ messageGroups: { ...bundle({}).messageGroups, Heartbeat: [
      msg({ timestamp: '2025-08-22T01:00:00.000Z', message: [2, 'hb-1', 'Heartbeat', {}] }),
    ] } });
    const body = renderHeartbeats(r);
    const headers = [...body.querySelectorAll('thead th')].map((th) => th.textContent);
    expect(headers).toEqual(['S.No.', 'File Name', 'Time Stamp', 'Message ID', 'Response Time (ms)']);
    const cells = [...body.querySelectorAll('tbody tr td')].map((td) => td.textContent);
    expect(cells).toEqual(['1', 'log.txt', '2025-08-22T01:00:00.000Z', 'hb-1', 'N/A']);
  });
});

describe('renderStartTransactions', () => {
  it('maps CMS txId from responsePayload, internal id from the map, and marks online', () => {
    const ts = '2025-08-22T02:00:00.000Z';
    const start = msg({
      timestamp: ts,
      message: [2, 'st-1', 'StartTransaction', { timestamp: ts, connectorId: 1, idTag: 'TAG7', meterStart: 1000 }],
      responsePayload: { transactionId: 55, idTagInfo: { status: 'Accepted' } },
    });
    const r = bundle({
      messageGroups: { ...bundle({}).messageGroups, StartTransaction: [start] },
      internalTxMap: new Map([['55', 'internal_transId_abc']]),
    });
    const body = renderStartTransactions(r);
    const headers = [...body.querySelectorAll('thead th')].map((th) => th.textContent);
    expect(headers).toEqual(['S.No.', 'File Name', 'Time Stamp', 'Transaction ID', 'Internal TX ID', 'Connector ID', 'ID Tag', 'Meter Start', 'Response Status', 'Tx Type', 'Replay Delay', 'Offline Replay']);
    const cells = [...body.querySelectorAll('tbody tr td')].map((td) => td.textContent);
    expect(cells[3]).toBe('55');                 // Transaction ID
    expect(cells[4]).toBe('internal_transId_abc'); // Internal TX ID
    expect(cells[6]).toBe('TAG7');               // ID Tag
    expect(cells[9]).toContain('Online');        // Tx Type (📡 Online)
  });
});

describe('renderStopTransactions', () => {
  it('extracts SoC begin/end + location and resolves internal id', () => {
    const ts = '2025-08-22T03:00:00.000Z';
    const stop = msg({
      timestamp: ts,
      message: [2, 'sp-1', 'StopTransaction', {
        timestamp: ts, transactionId: 55, meterStop: 6000, reason: 'Local',
        transactionData: [{ sampledValue: [
          { measurand: 'SoC', context: 'Transaction.Begin', value: '20', location: 'EV' },
          { measurand: 'SoC', context: 'Transaction.End', value: '80', location: 'EV' },
        ] }],
      }],
    });
    const r = bundle({
      messageGroups: { ...bundle({}).messageGroups, StopTransaction: [stop] },
      internalTxMap: new Map([['55', 'internal_transId_abc']]),
    });
    const body = renderStopTransactions(r);
    const headers = [...body.querySelectorAll('thead th')].map((th) => th.textContent);
    expect(headers).toEqual(['S.No.', 'File Name', 'Time Stamp', 'Transaction ID', 'Internal TX ID', 'Meter Stop', 'Stop Reason', 'SoC Begin (%)', 'SoC End (%)', 'Location', 'Tx Type', 'Replay Delay', 'Offline Replay']);
    const cells = [...body.querySelectorAll('tbody tr td')].map((td) => td.textContent);
    expect(cells[3]).toBe('55');                 // Transaction ID
    expect(cells[4]).toBe('internal_transId_abc'); // Internal TX ID
    expect(cells[7]).toBe('20');                 // SoC Begin
    expect(cells[8]).toBe('80');                 // SoC End
    expect(cells[9]).toBe('EV');                 // Location
  });

  it('marks txId=0 with the no-CMS-id marker', () => {
    const ts = '2025-08-22T03:00:00.000Z';
    const stop = msg({ timestamp: ts, message: [2, 'sp-2', 'StopTransaction', { timestamp: ts, transactionId: 0, meterStop: 10 }] });
    const r = bundle({ messageGroups: { ...bundle({}).messageGroups, StopTransaction: [stop] }, internalTxMap: new Map() });
    const cells = [...renderStopTransactions(r).querySelectorAll('tbody tr td')].map((td) => td.textContent);
    expect(cells[4]).toContain('txId=0'); // Internal TX ID marker
  });
});

describe('renderBootNotifications', () => {
  it('renders vendor/model/firmware + response status', () => {
    const boot = msg({
      timestamp: '2025-08-22T00:00:00.000Z',
      message: [2, 'bn-1', 'BootNotification', { chargePointVendor: 'Ador', chargePointModel: 'DC60', firmwareVersion: '1.2.3' }],
      responsePayload: { status: 'Accepted' },
    });
    const r = bundle({ messageGroups: { ...bundle({}).messageGroups, BootNotification: [boot] } });
    const body = renderBootNotifications(r);
    const headers = [...body.querySelectorAll('thead th')].map((th) => th.textContent);
    expect(headers).toEqual(['S.No.', 'File Name', 'Time Stamp', 'Message ID', 'Charge Point Vendor', 'Charge Point Model', 'Firmware Version', 'Response Status']);
    const cells = [...body.querySelectorAll('tbody tr td')].map((td) => td.textContent);
    expect(cells).toEqual(['1', 'log.txt', '2025-08-22T00:00:00.000Z', 'bn-1', 'Ador', 'DC60', '1.2.3', 'Accepted']);
  });
});
