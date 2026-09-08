import { describe, it, expect } from 'vitest';
import { extractRows } from '../../src/app/uptime/extract';
import type { CmsRow } from '../../src/app/cms/types';

function row(requestString: string, responseString = '', sheetName = 'DC052'): CmsRow {
  return { requestString, responseString, requestTime: '', responseTime: '', sheetName };
}

const statusNotification = (opts: Partial<{ connectorId: number; status: string; errorCode: string; vendorErrorCode: string; info: string; timestamp: string }> = {}) =>
  row(
    JSON.stringify([2, 'id-1', 'StatusNotification', {
      connectorId: opts.connectorId ?? 1,
      status: opts.status ?? 'Faulted',
      errorCode: opts.errorCode ?? 'OtherError',
      vendorErrorCode: opts.vendorErrorCode ?? '17',
      info: opts.info ?? 'EmergencyPressed',
      timestamp: opts.timestamp ?? '2026-08-11T00:05:00.000Z',
    }]),
  );

describe('extractRows — timestamp source rule', () => {
  it('takes the instant from the Request payload timestamp when present', () => {
    const [r] = extractRows([statusNotification({ timestamp: '2026-08-11T00:05:00.000Z' })]);
    expect(r.timestampUtc).toBe(Date.UTC(2026, 7, 11, 0, 5, 0));
    expect(r.eventName).toBe('StatusNotification');
  });

  it('falls back to the Response currentTime for Heartbeat, which carries no request timestamp', () => {
    const [r] = extractRows([
      row('[2,"h1","Heartbeat",{}]', '[3,"h1",{"currentTime":"2026-08-11T00:01:18.554Z"}]'),
    ]);
    expect(r.timestampUtc).toBeNull();
    expect(r.respCurrentTimeUtc).toBe(Date.UTC(2026, 7, 11, 0, 1, 18, 554));
  });

  it('reads BootNotification time from the response, and the vendor from the request', () => {
    const [r] = extractRows([
      row(
        '[2,"b1","BootNotification",{"chargePointVendor":"Mahindra","chargePointModel":"MPC","firmwareVersion":"release-1.2.63"}]',
        '[3,"b1",{"currentTime":"2026-08-11T02:00:00.000Z","interval":120,"status":"Accepted"}]',
      ),
    ]);
    expect(r.eventName).toBe('BootNotification');
    expect(r.respCurrentTimeUtc).toBe(Date.UTC(2026, 7, 11, 2, 0, 0));
    expect(r.chargePointVendor).toBe('Mahindra');
    expect(r.firmwareVersion).toBe('release-1.2.63');
  });
});

describe('extractRows — fault identification', () => {
  it('flags a StatusNotification with a real errorCode as a fault', () => {
    const [r] = extractRows([statusNotification({ errorCode: 'OtherError', info: 'EmergencyPressed' })]);
    expect(r.isFaultStatus).toBe(true);
    expect(r.info).toBe('EmergencyPressed');
    expect(r.vendorErrorCode).toBe('17');
  });

  it('does NOT flag NoError — that is the healthy status, and it closes episodes', () => {
    const [r] = extractRows([statusNotification({ errorCode: 'NoError', status: 'Available' })]);
    expect(r.isFaultStatus).toBe(false);
  });

  it('does not flag a StatusNotification with no errorCode at all', () => {
    const [r] = extractRows([row('[2,"s1","StatusNotification",{"connectorId":1,"status":"Available"}]')]);
    expect(r.isFaultStatus).toBe(false);
  });

  it('does not flag a non-StatusNotification even if it mentions an error', () => {
    const [r] = extractRows([row('[2,"d1","DataTransfer",{"vendorId":"x","data":"errorCode: OtherError"}]')]);
    expect(r.isFaultStatus).toBe(false);
  });

  it('reads connectorId 0 as the whole unit, not as missing', () => {
    const [r] = extractRows([statusNotification({ connectorId: 0 })]);
    expect(r.connectorId).toBe(0);
  });
});

describe('extractRows — MeterValues performance gate', () => {
  const meterValues = row(
    JSON.stringify([2, 'm1', 'MeterValues', {
      connectorId: 1,
      transactionId: 42,
      meterValue: [{ timestamp: '2026-08-11T03:00:00.000Z', sampledValue: [{ value: '230', measurand: 'Voltage' }] }],
    }]),
  );

  it('still extracts the timestamp — the analysis window is a MIN/MAX over ALL rows', () => {
    // Gating this would shift Total Available Time and move every uptime %.
    const [r] = extractRows([meterValues]);
    expect(r.timestampUtc).toBe(Date.UTC(2026, 7, 11, 3, 0, 0));
  });

  it('skips payload key extraction, which is pure waste for MeterValues', () => {
    const [r] = extractRows([meterValues]);
    expect(r.connectorId).toBeNull();
    expect(r.status).toBe('');
    expect(r.isFaultStatus).toBe(false);
  });

  it('still flags truncation, which is why requestLen is never gated', () => {
    const long = row(`[2,"m2","MeterValues",{"meterValue":[{"timestamp":"2026-08-11T03:00:00.000Z","x":"${'y'.repeat(4000)}"`);
    const [r] = extractRows([long]);
    expect(r.requestLen).toBeGreaterThanOrEqual(4000);
    expect(r.truncated).toBe(true);
  });

  it('does not flag a short MeterValues row as truncated', () => {
    expect(extractRows([meterValues])[0].truncated).toBe(false);
  });
});

describe('extractRows — robustness', () => {
  it('survives a malformed request without throwing, and marks nothing as a fault', () => {
    const [r] = extractRows([row('[2,"bad","StatusNotification",{"connectorId":')]);
    expect(r.isFaultStatus).toBe(false);
    expect(r.timestampUtc).toBeNull();
  });

  it('numbers rows 1-based within their sheet and carries the sheet as the site', () => {
    const rows = extractRows([statusNotification(), statusNotification()]);
    expect(rows.map((r) => r.sourceRow)).toEqual([1, 2]);
    expect(rows[0].site).toBe('DC052');
  });
});
