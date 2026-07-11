// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import type { AnalysisResult } from '../../src/app/analyze';
import type { Downtime, MissingSyncFlag } from '../../src/app/detect/types';
import { renderDowntimeReport } from '../../src/app/render/sections/downtimeReport';
import { renderPowerRestoreSync, renderEmergencyStopRelease } from '../../src/app/render/sections/syncFlags';

const dt = (over: Partial<Downtime>): Downtime =>
  ({ reason: 'Connection Lost', startTime: '2025-08-22T00:00:00.000Z', startLineNumber: 1, endTime: '2025-08-22T00:05:00.000Z', endLineNumber: 9, lastSeenTime: '', lastSeenLineNumber: 0, duration: '00:05:00', ...over });
const flag = (over: Partial<MissingSyncFlag>): MissingSyncFlag =>
  ({ reason: 'x', startTime: '2025-08-22T00:00:00.000Z', startLineNumber: 1, endTime: '2025-08-22T00:05:00.000Z', endLineNumber: 9, ocppErrorCode: 'NoError', cpoErrorCode: 'N/A', vendorErrorCode: 'N/A', info: '', missingStatus: true, recoveryStatusPerConnector: [], ...over });

describe('renderDowntimeReport', () => {
  const body = renderDowntimeReport({ downtimes: [dt({ reason: 'Power Failure' }), dt({ reason: 'Connection Lost' })] } as unknown as AnalysisResult);

  it('renders 11 columns (incl. Preview/Download) and maps reason display names', () => {
    const headers = [...body.querySelectorAll('#downtime-report-table thead th')].map((th) => th.textContent);
    expect(headers).toEqual(['S.No.', 'Downtime Reason', 'Issue Occurred (IST)', 'Resolved Time (IST)', 'Issue Duration (HH:MM:SS)', 'Error Code (OCPP)', 'CPO Error Code', 'Vendor Error Code', 'Info', 'Preview', 'Download']);
    expect(body.textContent).toContain('PowerLoss'); // 'Power Failure' → 'PowerLoss'
    expect(body.textContent).toContain('Websocket Disconnected'); // 'Connection Lost'
  });

  it('filters rows by reason', () => {
    const sel = body.querySelector('#downtime-reason-filter') as HTMLSelectElement;
    sel.value = 'Power Failure';
    sel.dispatchEvent(new Event('change'));
    const visible = [...body.querySelectorAll('#downtime-report-table tbody tr')].filter((r) => (r as HTMLElement).style.display !== 'none');
    expect(visible).toHaveLength(1);
  });
});

describe('renderPowerRestoreSync', () => {
  it('renders cards + 11-col table with boot/status badges', () => {
    const body = renderPowerRestoreSync({ powerRestoreSync: [flag({ missingBoot: true, missingStatus: false, recoveryStatusPerConnector: [{ connectorId: 1, status: 'Available' }] })] } as unknown as AnalysisResult);
    const headers = [...body.querySelectorAll('#power-restore-missing-sync-table thead th')].map((th) => th.textContent);
    expect(headers).toContain('Missing BootNotification');
    expect(headers).toHaveLength(13); // + Preview + Download
    expect(body.textContent).toContain('C1:');
  });
});

describe('renderEmergencyStopRelease', () => {
  it('renders cards + 12-col table (incl. Preview/Download)', () => {
    const body = renderEmergencyStopRelease({ emergencyStopSync: [flag({ missingStatus: true })] } as unknown as AnalysisResult);
    const headers = [...body.querySelectorAll('#emergency-stop-missing-status-table thead th')].map((th) => th.textContent);
    expect(headers).toHaveLength(12);
    expect(headers).toContain('Preview');
  });
});
