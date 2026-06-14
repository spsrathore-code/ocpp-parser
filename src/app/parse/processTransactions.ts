import { OFFLINE_REPLAY_THRESHOLD_MS } from '../model/config';
import type { Transaction, MessageGroups, InternalTxMap, TxStatus } from '../model/types';

interface SampledValue {
  measurand?: string;
  value?: string;
  unit?: string;
  location?: string;
  context?: string;
}
interface MeterValueEntry {
  sampledValue?: SampledValue[];
}
interface TxDataEntry {
  sampledValue?: SampledValue[];
}

const ABORTED_REASONS = ['EmergencyStop', 'HardReset', 'SoftReset', 'UnlockCommand', 'PowerLoss', 'Reboot'];

/**
 * Build canonical transactions from grouped messages — faithful port of the
 * tool's `processTransactions` (spec §19.3). Only transactions with a matching
 * StopTransaction are returned (a start with no stop stays unreturned, exactly as
 * the original — the Incomplete-Transaction section handles those separately).
 *
 * Deviation from the original (behaviour-preserving): `internalTxMap` is passed in
 * rather than read from a global.
 */
export function processTransactions(
  messageGroups: MessageGroups,
  internalTxMap: InternalTxMap,
): Transaction[] {
  const transactions: Transaction[] = [];
  const transactionMap = new Map<number, Transaction>();

  // --- StartTransaction ---
  for (const startMsg of messageGroups.StartTransaction) {
    const txId = (startMsg.responsePayload as { transactionId?: number } | null)?.transactionId;
    if (txId) {
      const payload = startMsg.message[3] as {
        meterStart?: number;
        connectorId?: number;
        idTag?: string;
        timestamp?: string;
      };
      const logTs = new Date(startMsg.timestamp).getTime();
      const payloadTs = new Date(payload.timestamp ?? '').getTime();
      const tsDelta = Math.abs(logTs - payloadTs);
      const isReplay = !isNaN(tsDelta) && tsDelta > OFFLINE_REPLAY_THRESHOLD_MS;
      transactionMap.set(txId, {
        id: txId,
        startTime: startMsg.timestamp,
        meterStart: payload.meterStart,
        connectorId: payload.connectorId,
        idTag: payload.idTag,
        meterValues: [],
        isOfflineReplay: isReplay,
        recordedTimestamp: payload.timestamp,
        logTimestamp: startMsg.timestamp,
        replayDelayMs: isReplay ? tsDelta : 0,
        internalTransactionId: internalTxMap.get(String(txId)) || null,
      });
    }
  }

  // --- MeterValues ---
  for (const mvMsg of messageGroups.MeterValues) {
    const txId = (mvMsg.message[3] as { transactionId?: number }).transactionId;
    const tx = txId != null ? transactionMap.get(txId) : undefined;
    if (tx) tx.meterValues.push(mvMsg);
  }

  // --- StopTransaction ---
  for (const stopMsg of messageGroups.StopTransaction) {
    const stopPayload = stopMsg.message[3] as {
      transactionId?: number;
      meterStop?: number;
      reason?: string;
      transactionData?: TxDataEntry[];
    };
    const txId = stopPayload.transactionId;
    const tx = txId != null ? transactionMap.get(txId) : undefined;
    if (!tx) continue;

    tx.stopTime = stopMsg.timestamp;
    tx.meterStop = stopPayload.meterStop;
    const stopReason = stopPayload.reason || 'N/A';
    tx.stopReason = stopReason;

    // SoC from transactionData
    let socBegin = 'N/A';
    let socEnd = 'N/A';
    let location = 'N/A';
    if (Array.isArray(stopPayload.transactionData)) {
      for (const data of stopPayload.transactionData) {
        if (Array.isArray(data.sampledValue)) {
          for (const sample of data.sampledValue) {
            if (sample.measurand === 'SoC') {
              if (sample.context === 'Transaction.Begin') {
                socBegin = sample.value ?? 'N/A';
                location = sample.location || 'N/A';
              } else if (sample.context === 'Transaction.End') {
                socEnd = sample.value ?? 'N/A';
                location = sample.location || 'N/A';
              }
            }
          }
        }
      }
    }
    tx.socBegin = socBegin;
    tx.socEnd = socEnd;
    tx.location = location;

    // duration + totalEnergy
    try {
      tx.duration = (new Date(tx.stopTime).getTime() - new Date(tx.startTime).getTime()) / 1000 / 60;
      tx.totalEnergy = ((tx.meterStop as number) - (tx.meterStart as number)) / 1000;
    } catch {
      tx.duration = 'N/A';
      tx.totalEnergy = 'N/A';
    }

    // avg/peak power (Power.Active.Import, W→kW)
    const powerReadings: number[] = [];
    for (const mv of tx.meterValues) {
      const mvPayload = mv.message[3] as { meterValue?: MeterValueEntry[] };
      if (mvPayload.meterValue) {
        for (const entry of mvPayload.meterValue) {
          const ps = entry.sampledValue?.find(sv => sv.measurand === 'Power.Active.Import');
          if (ps) {
            let val = parseFloat(ps.value as string);
            if (ps.unit === 'W') val = val / 1000;
            if (!isNaN(val)) powerReadings.push(val);
          }
        }
      }
    }
    tx.avgPower =
      powerReadings.length > 0
        ? (powerReadings.reduce((a, b) => a + b, 0) / powerReadings.length).toFixed(2)
        : 'N/A';
    tx.peakPower = powerReadings.length > 0 ? Math.max(...powerReadings).toFixed(2) : 'N/A';

    // max temperature per location (FR-097) — from MeterValues + StopTx transactionData
    const tempInlet: number[] = [];
    const tempOutlet: number[] = [];
    const tempBody: number[] = [];
    const collectTemp = (svs?: SampledValue[]): void => {
      if (!svs) return;
      for (const sv of svs) {
        if (sv.measurand === 'Temperature') {
          const val = parseFloat(sv.value as string);
          if (isNaN(val)) continue;
          const loc = (sv.location || '').toLowerCase();
          if (loc === 'inlet') tempInlet.push(val);
          else if (loc.startsWith('outlet')) tempOutlet.push(val);
          else if (loc === 'body') tempBody.push(val);
        }
      }
    };
    for (const mv of tx.meterValues) {
      const mvPayload = mv.message[3] as { meterValue?: MeterValueEntry[] };
      if (mvPayload.meterValue) for (const entry of mvPayload.meterValue) collectTemp(entry.sampledValue);
    }
    if (Array.isArray(stopPayload.transactionData)) {
      for (const data of stopPayload.transactionData) collectTemp(data.sampledValue);
    }
    tx.maxTempInlet = tempInlet.length > 0 ? Math.max(...tempInlet) : null;
    tx.maxTempOutlet = tempOutlet.length > 0 ? Math.max(...tempOutlet) : null;
    tx.maxTempBody = tempBody.length > 0 ? Math.max(...tempBody) : null;

    // Current.Import Outlet-vs-EV pairs (FR-108) — paired at MeterValues message level
    const currentPairs: { outlet: number; ev: number }[] = [];
    for (const mv of tx.meterValues) {
      const mvPayload = mv.message[3] as { meterValue?: MeterValueEntry[] };
      if (mvPayload.meterValue) {
        const outletVals: number[] = [];
        const evVals: number[] = [];
        for (const entry of mvPayload.meterValue) {
          if (!entry.sampledValue) continue;
          for (const sv of entry.sampledValue) {
            if (sv.measurand === 'Current.Import') {
              const val = parseFloat(sv.value as string);
              if (isNaN(val) || val < 0) continue;
              const loc = (sv.location || '').toLowerCase();
              if (loc === 'outlet') outletVals.push(val);
              else if (loc === 'ev') evVals.push(val);
            }
          }
        }
        if (outletVals.length > 0 && evVals.length > 0) {
          const outlet = outletVals.reduce((a, b) => a + b, 0) / outletVals.length;
          const ev = evVals.reduce((a, b) => a + b, 0) / evVals.length;
          currentPairs.push({ outlet, ev });
        }
      }
    }
    tx.currentPairCount = currentPairs.length;
    if (currentPairs.length > 0) {
      tx.avgCurrentOutlet = parseFloat(
        (currentPairs.reduce((s, p) => s + p.outlet, 0) / currentPairs.length).toFixed(2),
      );
      tx.avgCurrentEV = parseFloat(
        (currentPairs.reduce((s, p) => s + p.ev, 0) / currentPairs.length).toFixed(2),
      );
    } else {
      tx.avgCurrentOutlet = null;
      tx.avgCurrentEV = null;
    }

    // status
    const status: TxStatus = ABORTED_REASONS.includes(stopReason) ? 'Aborted' : 'Completed';
    tx.status = status;

    transactions.push(tx);
    transactionMap.delete(txId as number);
  }

  // --- Start/Stop Meter Continuity per connector (FR-102..106) ---
  const byConnector = new Map<number | string, Transaction[]>();
  for (const tx of transactions) {
    const cid = tx.connectorId ?? 'unknown';
    if (!byConnector.has(cid)) byConnector.set(cid, []);
    byConnector.get(cid)!.push(tx);
  }
  for (const txList of byConnector.values()) {
    txList.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
    txList.forEach((tx, i) => {
      if (i === 0) {
        tx.startStopDiff = null;
      } else {
        const prev = txList[i - 1];
        if (typeof prev.meterStop === 'number' && typeof tx.meterStart === 'number') {
          tx.startStopDiff = prev.meterStop - tx.meterStart;
        } else {
          tx.startStopDiff = null;
        }
      }
    });
  }

  return transactions;
}
