// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import type { ParsedMessage } from '../../src/app/model/types';
import type { AnalysisResult } from '../../src/app/analyze';
import { computeStatusAnalytics, renderStatusNotifications } from '../../src/app/render/sections/statusNotifications';

function sn(ts: string, payload: Record<string, unknown>): ParsedMessage {
  return { timestamp: ts, direction: 'received', message: [2, 'id', 'StatusNotification', payload], lineNumber: 1, fileName: 'log.txt' } as ParsedMessage;
}
function bundle(messages: ParsedMessage[]): AnalysisResult {
  return {
    messages, events: [], alerts: [], rawLogLines: [], filesProcessed: ['log.txt'],
    messageGroups: { BootNotification: [], Heartbeat: [], StatusNotification: messages, StartTransaction: [], StopTransaction: [], MeterValues: [], Other: [] },
  } as unknown as AnalysisResult;
}

const MESSAGES = [
  sn('2025-08-22T00:00:00Z', { timestamp: '2025-08-22T00:00:00Z', connectorId: 1, status: 'Preparing', errorCode: 'NoError' }),
  sn('2025-08-22T00:01:00Z', { timestamp: '2025-08-22T00:01:00Z', connectorId: 1, status: 'Charging', errorCode: 'NoError' }),
  sn('2025-08-22T00:02:00Z', { timestamp: '2025-08-22T00:02:00Z', connectorId: 2, status: 'Faulted', errorCode: 'GroundFailure', vendorId: 'V1', vendorErrorCode: 'E9' }),
];

describe('computeStatusAnalytics', () => {
  const a = computeStatusAnalytics(MESSAGES);

  it('summarises counts', () => {
    expect(a.summary).toEqual({ totalEvents: 3, uniqueStatuses: 3, faultedCount: 1, errorCount: 1, connectorCount: 2 });
  });

  it('orders the status distribution by the canonical status order', () => {
    expect(a.sortedStatuses).toEqual([['Preparing', 1], ['Charging', 1], ['Faulted', 1]]);
    expect(a.maxStatusCount).toBe(1);
  });

  it('classifies session flow (Preparing → Charging = full) and tags both rows', () => {
    expect(a.flow.full).toBe(1);
    expect(a.flow.skipped).toBe(0);
    expect(a.rows[0].sessionFlow).toBe('Charging');
    expect(a.rows[1].sessionFlow).toBe('Charging');
    expect(a.rows[2].sessionFlow).toBe('');
  });

  it('rolls up non-NoError codes with their info, status, and connectors', () => {
    expect(a.errRows).toEqual([{ errorCode: 'GroundFailure', info: '—', statuses: 'Faulted', vendorErrorCode: 'E9', vendorId: 'V1', count: 1, connectors: ['2'] }]);
  });
});

describe('renderStatusNotifications', () => {
  const body = renderStatusNotifications(bundle(MESSAGES));

  it('renders the main table with the 10 §19.3 columns and one row per event', () => {
    const headers = [...body.querySelectorAll('#status-notifications-table thead th')].map((th) => th.textContent);
    expect(headers).toEqual(['S.No.', 'File Name', 'Log Timestamp', 'Payload Timestamp', 'Connector ID', 'Status', 'Error Code', 'Vendor ID', 'Vendor Error Code', 'Info']);
    expect(body.querySelectorAll('#status-notifications-table tbody tr')).toHaveLength(3);
  });

  it('renders the analytics panels', () => {
    expect(body.textContent).toContain('Status Distribution');
    expect(body.textContent).toContain('Session Flow Analysis');
    expect(body.textContent).toContain('Error Code Frequency');
  });
});
