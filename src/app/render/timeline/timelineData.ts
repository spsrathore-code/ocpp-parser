// Timeline data shaper — faithful port of legacy getTimelineDataForTx (HTML 7388–7507)
// and _tlTime (HTML 7510–7517). Pure functions; no DOM, no side effects.
// Adaptations from the legacy source:
//   1. allTransactions → transactions param; allMessages → messages param
//   2. tx.startMsg?.responsePayload → derived via messages.find(...)
//   3. Field guard: typeof tx.totalEnergy === 'number' (for anomaly arithmetic)

import type { Transaction, ParsedMessage } from '../../model/types';
import { convertToIST } from '../format';

// ── Public types ─────────────────────────────────────────────────────────────

export interface TlPoint { t: number; v: number; ctx: string; unit: string }
export interface TlMarker { t: number; label: string; color: string; tip: string }
export interface TlSwimlaneEvent { t: number; status: string; info: string }
export interface TlSwimlane { connectorId: number; events: TlSwimlaneEvent[] }
export interface TlMeterValues {
  soc: TlPoint[];
  energy: TlPoint[];
  power: TlPoint[];
  tempInlet: TlPoint[];
  tempOutlet: TlPoint[];
  tempBody: TlPoint[];
}
export interface TimelineData {
  tx: Transaction;
  winStart: number;
  winEnd: number;
  txStart: number;
  txStop: number | null;
  markers: TlMarker[];
  mv: TlMeterValues;
  swimlanes: TlSwimlane[];
}

// ── getTimelineDataForTx ─────────────────────────────────────────────────────

export function getTimelineDataForTx(
  txId: number,
  transactions: Transaction[],
  messages: ParsedMessage[],
): TimelineData | null {
  // Adaptation 1: param-based lookup (no allTransactions global)
  const tx = transactions.find((t) => t.id === txId);
  if (!tx || !tx.startTime) return null;

  const txStart = new Date(tx.startTime).getTime();
  const txStop = tx.stopTime ? new Date(tx.stopTime).getTime() : null;
  const winStart = txStart - 10 * 60 * 1000;
  const winEnd = (txStop || txStart) + 10 * 60 * 1000;

  // ── MeterValues breakdown from tx.meterValues ──
  const mv: TlMeterValues = { soc: [], energy: [], power: [], tempInlet: [], tempOutlet: [], tempBody: [] };
  (tx.meterValues || []).forEach((msg) => {
    const payload = msg.message?.[3] as Record<string, unknown> | undefined;
    const meterValueArr = (payload?.meterValue as Array<Record<string, unknown>> | undefined) || [];
    meterValueArr.forEach((entry) => {
      const ts = new Date((entry.timestamp as string) || msg.timestamp).getTime();
      const sampledValue = (entry.sampledValue as Array<Record<string, unknown>> | undefined) || [];
      sampledValue.forEach((sv) => {
        const v = parseFloat(sv.value as string);
        if (isNaN(v)) return;
        const p: TlPoint = { t: ts, v, ctx: (sv.context as string) || '', unit: (sv.unit as string) || '' };
        const m = (sv.measurand as string) || '';
        const loc = ((sv.location as string) || '').toLowerCase();
        if (m === 'SoC') mv.soc.push(p);
        else if (m.startsWith('Energy.Active.Import.Register')) mv.energy.push(p);
        else if (m.startsWith('Power.Active.Import')) mv.power.push(p);
        else if (m === 'Temperature' && loc === 'inlet') mv.tempInlet.push(p);
        else if (m === 'Temperature' && loc === 'outlet') mv.tempOutlet.push(p);
        else if (m === 'Temperature' && loc === 'body') mv.tempBody.push(p);
      });
    });
  });

  // ── StatusNotifications in window (from messages param directly) ──
  const statusInWin = messages.filter((m) => {
    if (m.message?.[2] !== 'StatusNotification' || m.direction !== 'sent') return false;
    const t = new Date(m.timestamp).getTime();
    return t >= winStart && t <= winEnd;
  });
  const onConn = statusInWin.filter((m) => {
    const payload = m.message?.[3] as Record<string, unknown> | undefined;
    return payload?.connectorId == tx.connectorId;
  });

  // ── Event markers ──
  const markers: TlMarker[] = [];
  const addM = (t: number, label: string, color: string, tip = ''): void => {
    markers.push({ t, label, color, tip });
  };

  // 1. Available before session
  const avBefore = onConn
    .filter((m) => {
      const p = m.message?.[3] as Record<string, unknown>;
      return p?.status === 'Available' && new Date(m.timestamp).getTime() < txStart;
    })
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];
  if (avBefore) addM(new Date(avBefore.timestamp).getTime(), '● Available', '#9ca3af');

  // 2. Preparing
  const prep = onConn.find((m) => {
    const p = m.message?.[3] as Record<string, unknown>;
    return p?.status === 'Preparing' && new Date(m.timestamp).getTime() < txStart;
  });
  if (prep) addM(new Date(prep.timestamp).getTime(), '⬡ Preparing', '#60a5fa');

  // 3. Authorization — scan messages for Authorize near txStart, fallback to StartTransaction response
  const authMsg = messages.find(
    (m) =>
      m.message?.[2] === 'Authorize' &&
      m.direction === 'sent' &&
      Math.abs(new Date(m.timestamp).getTime() - txStart) < 5 * 60 * 1000,
  );
  // Adaptation 2: no tx.startMsg — derive via messages
  const startTxMsg = messages.find(
    (m) =>
      m.message?.[2] === 'StartTransaction' &&
      (m.responsePayload as Record<string, unknown> | undefined)?.transactionId === txId,
  );
  const authStatus =
    (authMsg?.responsePayload as Record<string, unknown> | undefined)?.idTagInfo != null
      ? ((authMsg!.responsePayload as Record<string, unknown>).idTagInfo as Record<string, unknown>).status as string
      : (startTxMsg?.responsePayload as Record<string, unknown> | undefined)?.idTagInfo != null
        ? ((startTxMsg!.responsePayload as Record<string, unknown>).idTagInfo as Record<string, unknown>).status as string
        : undefined;
  if (authStatus) {
    const at = authMsg ? new Date(authMsg.timestamp).getTime() : txStart - 3000;
    addM(
      at,
      `🔑 Authorization · ${authStatus}`,
      authStatus === 'Accepted' ? '#22d3ee' : '#ef4444',
      `ID Tag: ${tx.idTag || '—'} | Status: ${authStatus}`,
    );
  }

  // 4. StartTransaction
  addM(
    txStart,
    '▶ StartTransaction',
    '#22c55e',
    `Connector: ${tx.connectorId} | ID Tag: ${tx.idTag || '—'}\nMeter Start: ${tx.meterStart != null ? tx.meterStart + ' Wh' : '—'}`,
  );

  // 5. Charging status after start
  const chargeSN = onConn.find((m) => {
    const p = m.message?.[3] as Record<string, unknown>;
    return p?.status === 'Charging' && new Date(m.timestamp).getTime() >= txStart;
  });
  if (chargeSN) addM(new Date(chargeSN.timestamp).getTime(), '⚡ Charging', '#4ade80');

  if (txStop) {
    // 6. Emergency Stop during session
    const eStop = statusInWin.find((m) => {
      const p = m.message?.[3] as Record<string, unknown>;
      const t = new Date(m.timestamp).getTime();
      return p?.vendorErrorCode === '17' && t >= txStart && t <= txStop!;
    });
    if (eStop) addM(new Date(eStop.timestamp).getTime(), '⚡ E-Stop', '#f97316');

    // 7. Reboot during session
    const reboot = messages.find((m) => {
      if (m.message?.[2] !== 'BootNotification' || m.direction !== 'sent') return false;
      const t = new Date(m.timestamp).getTime();
      return t >= txStart && t <= txStop!;
    });
    if (reboot) addM(new Date(reboot.timestamp).getTime(), '↺ Reboot', '#a855f7');

    // 8. StopTransaction
    const stopLabel =
      '■ Stop' + (tx.stopReason && tx.stopReason !== 'N/A' ? ' · ' + tx.stopReason : '');
    // Adaptation 3: guard typeof tx.totalEnergy === 'number'
    const energyStr =
      typeof tx.totalEnergy === 'number' ? tx.totalEnergy.toFixed(2) + ' kWh' : '—';
    addM(
      txStop,
      stopLabel,
      '#ef4444',
      `Reason: ${tx.stopReason || '—'} | Energy: ${energyStr}\nMeter Stop: ${tx.meterStop != null ? tx.meterStop + ' Wh' : '—'}`,
    );

    // 9. Finishing after stop
    const fin = onConn.find((m) => {
      const p = m.message?.[3] as Record<string, unknown>;
      return p?.status === 'Finishing' && new Date(m.timestamp).getTime() > txStop!;
    });
    if (fin) addM(new Date(fin.timestamp).getTime(), '🏁 Finishing', '#2dd4bf');

    // 10. Available after stop
    const avAfter = onConn.find((m) => {
      const p = m.message?.[3] as Record<string, unknown>;
      return p?.status === 'Available' && new Date(m.timestamp).getTime() > txStop!;
    });
    if (avAfter) addM(new Date(avAfter.timestamp).getTime(), '● Available', '#9ca3af');
  }

  markers.sort((a, b) => a.t - b.t);

  // ── Swimlanes ──
  const connIds = [
    ...new Set(
      statusInWin.map((m) => (m.message?.[3] as Record<string, unknown>)?.connectorId as number),
    ),
  ]
    .filter((c) => c != null)
    .sort((a, b) => a - b);

  const swimlanes: TlSwimlane[] = connIds.map((cid) => ({
    connectorId: cid,
    events: statusInWin
      .filter((m) => (m.message?.[3] as Record<string, unknown>)?.connectorId == cid)
      .map((m) => {
        const p = m.message?.[3] as Record<string, unknown>;
        return {
          t: new Date(m.timestamp).getTime(),
          status: p.status as string,
          info: (p.info as string) || '',
        };
      })
      .sort((a, b) => a.t - b.t),
  }));

  return { tx, winStart, winEnd, txStart, txStop, markers, mv, swimlanes };
}

// ── tlTime ───────────────────────────────────────────────────────────────────
// Port of legacy _tlTime (HTML 7510–7517).

export function tlTime(ts: number, short: boolean): string {
  try {
    const s = convertToIST(new Date(ts).toISOString()); // "DD/MM/YYYY HH:MM:SS IST"
    const parts = s.split(' '); // ["DD/MM/YYYY", "HH:MM:SS", "IST"]
    if (short) return (parts[1] || '').substring(0, 5);
    return parts[1] + ' IST';
  } catch {
    return new Date(ts).toISOString().substring(11, 19);
  }
}
