// Start Transactions section — faithful port of HTML 2296-2321. CMS transactionId
// is read from the StartTx responsePayload (Bug Fix #1); internal id from the map.
// Offline-replay = |logTs − payloadTs| > OFFLINE_REPLAY_THRESHOLD_MS (FR-279/280).

import { dataTable, type Row } from '../table';
import { fmtReplayDelay } from '../format';
import { OFFLINE_REPLAY_THRESHOLD_MS } from '../../model/config';
import type { AnalysisResult } from '../../analyze';

const HEADERS = ['Time Stamp', 'Transaction ID', 'Internal TX ID', 'Connector ID', 'ID Tag', 'Meter Start', 'Response Status', 'Tx Type', 'Replay Delay', 'Offline Replay'];

interface StartPayload { timestamp?: string; connectorId?: number; idTag?: string; meterStart?: number; }
interface StartResponse { transactionId?: number; idTagInfo?: { status?: string }; }
const DASH = '—';

export function renderStartTransactions(r: AnalysisResult): HTMLElement {
  const rows: Row[] = r.messageGroups.StartTransaction.map((msg) => {
    const payload = (msg.message[3] ?? {}) as StartPayload;
    const resp = (msg.responsePayload ?? null) as StartResponse | null;
    const lTs = new Date(msg.timestamp).getTime();
    const pTs = new Date(payload.timestamp ?? '').getTime();
    const delta = Math.abs(lTs - pTs);
    const isReplay = !isNaN(delta) && delta > OFFLINE_REPLAY_THRESHOLD_MS;
    const cmsTxId = resp?.transactionId;
    const intTxId = cmsTxId ? (r.internalTxMap.get(String(cmsTxId)) ?? DASH) : DASH;
    return {
      fileName: msg.fileName,
      'Time Stamp': msg.timestamp,
      'Transaction ID': cmsTxId,
      'Internal TX ID': intTxId,
      'Connector ID': payload.connectorId,
      'ID Tag': payload.idTag,
      'Meter Start': payload.meterStart,
      'Response Status': resp?.idTagInfo ? (resp.idTagInfo.status ?? 'N/A') : 'N/A',
      'Tx Type': isReplay ? '📴 Offline' : '📡 Online',
      'Replay Delay': isReplay ? fmtReplayDelay(delta) : DASH,
      'Offline Replay': isReplay
        ? `⚠ Replayed  ·  Rec: ${new Date(payload.timestamp ?? '').toISOString()}  →  Sent: ${new Date(msg.timestamp).toISOString()}`
        : DASH,
    };
  });
  return dataTable(HEADERS, rows, 'start-transactions-table');
}
