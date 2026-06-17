// Stop Transactions section — faithful port of HTML 2324-2378. Unlike StartTx, the
// CMS transactionId is on the request payload (message[3].transactionId); txId===0
// means "no CMS id". SoC begin/end + location are scanned out of transactionData.

import { dataTable, type Row } from '../table';
import { fmtReplayDelay } from '../format';
import { OFFLINE_REPLAY_THRESHOLD_MS } from '../../model/config';
import type { AnalysisResult } from '../../analyze';

const HEADERS = ['Time Stamp', 'Transaction ID', 'Internal TX ID', 'Meter Stop', 'Stop Reason', 'SoC Begin (%)', 'SoC End (%)', 'Location', 'Tx Type', 'Replay Delay', 'Offline Replay'];
const DASH = '—';

interface SampledValue { measurand?: string; context?: string; value?: string; location?: string; }
interface StopPayload {
  timestamp?: string; transactionId?: number; meterStop?: number; reason?: string;
  transactionData?: { sampledValue?: SampledValue[] }[];
}

export function renderStopTransactions(r: AnalysisResult): HTMLElement {
  const rows: Row[] = r.messageGroups.StopTransaction.map((msg) => {
    const payload = (msg.message[3] ?? {}) as StopPayload;

    let socBegin = 'N/A';
    let socEnd = 'N/A';
    let location = 'N/A';
    if (Array.isArray(payload.transactionData)) {
      for (const data of payload.transactionData) {
        if (!Array.isArray(data.sampledValue)) continue;
        for (const sample of data.sampledValue) {
          if (sample.measurand !== 'SoC') continue;
          if (sample.context === 'Transaction.Begin') { socBegin = sample.value ?? 'N/A'; location = sample.location ?? 'N/A'; }
          else if (sample.context === 'Transaction.End') { socEnd = sample.value ?? 'N/A'; location = sample.location ?? 'N/A'; }
        }
      }
    }

    const lTs = new Date(msg.timestamp).getTime();
    const pTs = new Date(payload.timestamp ?? '').getTime();
    const delta = Math.abs(lTs - pTs);
    const isReplay = !isNaN(delta) && delta > OFFLINE_REPLAY_THRESHOLD_MS;
    const cmsTxId = payload.transactionId;
    const intTxId = cmsTxId === 0
      ? '⚠ txId=0 (No CMS ID)'
      : (r.internalTxMap.get(String(cmsTxId)) ?? DASH);

    return {
      fileName: msg.fileName,
      'Time Stamp': msg.timestamp,
      'Transaction ID': cmsTxId,
      'Internal TX ID': intTxId,
      'Meter Stop': payload.meterStop,
      'Stop Reason': payload.reason ?? 'N/A',
      'SoC Begin (%)': socBegin,
      'SoC End (%)': socEnd,
      'Location': location,
      'Tx Type': isReplay ? '📴 Offline' : '📡 Online',
      'Replay Delay': isReplay ? fmtReplayDelay(delta) : DASH,
      'Offline Replay': isReplay
        ? `⚠ Replayed  ·  Rec: ${new Date(payload.timestamp ?? '').toISOString()}  →  Sent: ${new Date(msg.timestamp).toISOString()}`
        : DASH,
    };
  });
  return dataTable(HEADERS, rows, 'stop-transactions-table');
}
