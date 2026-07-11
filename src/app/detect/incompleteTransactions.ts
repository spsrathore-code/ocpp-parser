// Incomplete-transaction detection — faithful port of the v2026.05.14 tool's
// `detectIncompleteTransactions` (HTML 1230, spec FR-122/FR-123). Finds Starts
// with no Stop and Stops with no Start, then classifies each by position
// relative to complete transactions on the same connector.

import type { MessageGroups, Transaction } from '../model/types';
import type { IncompleteTransaction } from './types';

export function detectIncompleteTransactions(
  messageGroups: MessageGroups,
  transactions: Transaction[],
): IncompleteTransaction[] {
  const incomplete: IncompleteTransaction[] = [];

  const startedIds = new Set<number>();
  messageGroups.StartTransaction.forEach((startMsg) => {
    const txId = (startMsg.responsePayload as { transactionId?: number } | undefined)?.transactionId;
    if (txId) startedIds.add(txId);
  });

  const stoppedIds = new Set<number>();
  messageGroups.StopTransaction.forEach((stopMsg) => {
    const txId = (stopMsg.message[3] as { transactionId?: number }).transactionId;
    if (txId) stoppedIds.add(txId);
  });

  // 1. Start without Stop.
  messageGroups.StartTransaction.forEach((startMsg) => {
    const txId = (startMsg.responsePayload as { transactionId?: number } | undefined)?.transactionId;
    if (txId && !stoppedIds.has(txId)) {
      incomplete.push({
        id: txId,
        connectorId: (startMsg.message[3] as { connectorId?: number }).connectorId ?? 'N/A',
        refTime: startMsg.timestamp,
        missing: 'Stop',
      });
    }
  });

  // 2. Stop without Start — StopTransaction has no connectorId in OCPP 1.6.
  messageGroups.StopTransaction.forEach((stopMsg) => {
    const txId = (stopMsg.message[3] as { transactionId?: number }).transactionId;
    if (txId && !startedIds.has(txId)) {
      incomplete.push({
        id: txId,
        connectorId: 'N/A',
        refTime: stopMsg.timestamp,
        missing: 'Start',
      });
    }
  });

  // 3. Classify each by location relative to complete transactions on same connector.
  incomplete.forEach((inc) => {
    const connTxns = transactions
      .filter((tx) => tx.connectorId === inc.connectorId)
      .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

    const refTime = new Date(inc.refTime);
    const hasBefore = connTxns.some((tx) => new Date(tx.startTime) < refTime);
    const hasAfter = connTxns.some((tx) => new Date(tx.startTime) > refTime);

    if (!hasBefore) {
      inc.location = 'Start of Logs';
      inc.reason = 'Session likely started before this log file';
    } else if (!hasAfter) {
      inc.location = 'End of Logs';
      inc.reason = 'Session ongoing or continues in next log file';
    } else {
      inc.location = 'Between Logs';
      inc.reason = 'Genuine error — charger crash or lost message';
    }
  });

  return incomplete;
}
