// Boot Notifications section — faithful port of HTML 2632-2723 (table portion),
// via the generic dataTable. The per-row Preview/Download "context" buttons are
// deferred to the dedicated context-viewer sub-phase. Missing fields render 'N/A'
// (dataTable's `|| 'N/A'`), a small improvement over the legacy raw 'undefined'.

import { dataTable, type Row } from '../table';
import { singleContextButtons } from '../contextViewer';
import type { AnalysisResult } from '../../analyze';

const HEADERS = ['Time Stamp', 'Message ID', 'Charge Point Vendor', 'Charge Point Model', 'Firmware Version', 'Response Status', 'Preview', 'Download'];

interface BootPayload { chargePointVendor?: string; chargePointModel?: string; firmwareVersion?: string; }
interface BootResponse { status?: string; }

export function renderBootNotifications(r: AnalysisResult): HTMLElement {
  const rows: Row[] = r.messageGroups.BootNotification.map((msg, i) => {
    const p = (msg.message[3] ?? {}) as BootPayload;
    const resp = (msg.responsePayload ?? null) as BootResponse | null;
    const btns = singleContextButtons('BootNotification', msg.lineNumber, i);
    return {
      fileName: msg.fileName,
      'Time Stamp': msg.timestamp,
      'Message ID': msg.message[1] as string,
      'Charge Point Vendor': p.chargePointVendor,
      'Charge Point Model': p.chargePointModel,
      'Firmware Version': p.firmwareVersion,
      'Response Status': resp ? (resp.status ?? 'N/A') : 'N/A',
      'Preview': btns.preview,
      'Download': btns.download,
    };
  });
  return dataTable(HEADERS, rows, 'boot-notifications-table', ['Preview', 'Download']);
}
