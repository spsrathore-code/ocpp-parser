// Debug Info section — faithful port of the legacy debug panel (HTML 2024-2255):
// summary counts, processed files, transaction-id / event-type chips, an alert-code
// rollup, and the UTC/IST log span. computeDebugStats is pure for testability.

import { el } from '../dom';
import { formatUtcIst, formatLogDuration } from '../format';
import type { AnalysisResult } from '../../analyze';

export interface AlertCodeRow { code: string; count: number; description: string; }
export interface DebugStats {
  counts: {
    startTransactions: number; meterValues: number; bootNotifications: number; heartbeats: number;
    totalMessages: number; statusNotifications: number; events: number; alerts: number;
  };
  filesProcessed: string[];
  transactionIds: number[];
  uniqueEventTypes: string[];
  alertCodes: AlertCodeRow[];
  startUtc: string; startIst: string; endUtc: string; endIst: string; duration: string;
}

const TS_RE = /\[([^\]]+)\]/;

export function computeDebugStats(r: AnalysisResult): DebugStats {
  const g = r.messageGroups;

  // Transaction ids — faithful to the legacy debug panel: request-payload field.
  const transactionIds = g.StartTransaction
    .map((m) => (m.message[3] as { transactionId?: number } | undefined)?.transactionId)
    .filter((id): id is number => !!id);

  const uniqueEventTypes = [...new Set(r.events.map((e) => e.type))];

  // Alert-code rollup (count desc), description = first non-'N/A' message for the code.
  const codeCounts = new Map<string, number>();
  for (const a of r.alerts) {
    const code = a.code || 'N/A';
    codeCounts.set(code, (codeCounts.get(code) ?? 0) + 1);
  }
  const alertCodes: AlertCodeRow[] = [...codeCounts.entries()]
    .map(([code, count]) => {
      const descs = r.alerts.filter((a) => String(a.code || 'N/A') === String(code)).map((a) => a.message || 'N/A').filter((m) => m !== 'N/A');
      return { code, count, description: descs.length > 0 ? descs[0] : 'No description available' };
    })
    .sort((a, b) => b.count - a.count);

  // Log span — message/event/alert timestamps + raw-line timestamps (avoid spread on big arrays).
  const stamps: Date[] = [
    ...r.messages.map((m) => new Date(m.timestamp)),
    ...r.events.map((e) => new Date(e.timestamp)),
    ...r.alerts.map((a) => new Date(a.timestamp)),
  ];
  for (const line of r.rawLogLines) {
    const m = line.match(TS_RE);
    if (m) { const d = new Date(m[1]); if (!isNaN(d.getTime())) stamps.push(d); }
  }
  const valid = stamps.filter((d) => !isNaN(d.getTime()));
  let start: Date | null = null;
  let end: Date | null = null;
  if (valid.length > 0) {
    start = valid.reduce((min, cur) => (cur < min ? cur : min));
    end = valid.reduce((max, cur) => (cur > max ? cur : max));
  }
  const startF = formatUtcIst(start);
  const endF = formatUtcIst(end);
  const duration = start && end ? formatLogDuration(end.getTime() - start.getTime()) : 'N/A';

  return {
    counts: {
      startTransactions: g.StartTransaction.length,
      meterValues: g.MeterValues.length,
      bootNotifications: g.BootNotification.length,
      heartbeats: g.Heartbeat.length,
      totalMessages: r.messages.length,
      statusNotifications: g.StatusNotification.length,
      events: r.events.length,
      alerts: r.alerts.length,
    },
    filesProcessed: r.filesProcessed.length > 0 ? r.filesProcessed : ['N/A'],
    transactionIds,
    uniqueEventTypes,
    alertCodes,
    startUtc: startF.utc, startIst: startF.ist, endUtc: endF.utc, endIst: endF.ist, duration,
  };
}

function statCard(value: number, label: string, color: string): HTMLElement {
  return el('div', { className: `text-center p-3 bg-${color}-50 dark:bg-${color}-900/20 rounded-lg` }, [
    el('div', { className: `text-2xl font-bold text-${color}-600 dark:text-${color}-400`, text: String(value) }),
    el('div', { className: `text-xs text-${color}-600 dark:text-${color}-400`, text: label }),
  ]);
}

export function renderDebugInfo(r: AnalysisResult): HTMLElement {
  const s = computeDebugStats(r);

  const grid1 = el('div', { className: 'grid grid-cols-2 md:grid-cols-4 gap-3' }, [
    statCard(s.counts.startTransactions, 'Transactions', 'blue'),
    statCard(s.counts.meterValues, 'Meter Values', 'green'),
    statCard(s.counts.bootNotifications, 'Boot Notifications', 'purple'),
    statCard(s.counts.heartbeats, 'Heartbeats', 'orange'),
  ]);
  const grid2 = el('div', { className: 'grid grid-cols-2 md:grid-cols-4 gap-3' }, [
    statCard(s.counts.totalMessages, 'Total Messages', 'indigo'),
    statCard(s.counts.statusNotifications, 'Status Notifications', 'pink'),
    statCard(s.counts.events, 'Events', 'teal'),
    statCard(s.counts.alerts, 'Alerts', 'red'),
  ]);

  const children: HTMLElement[] = [grid1, grid2];

  if (s.filesProcessed[0] !== 'N/A') {
    children.push(el('div', { className: 'p-3 bg-cyan-50 dark:bg-cyan-900/20 rounded-lg' }, [
      el('div', { className: 'text-sm font-medium text-cyan-700 dark:text-cyan-300 mb-2', text: `📁 Files Processed: ${s.filesProcessed.length}` }),
      el('div', { className: 'flex flex-wrap gap-2' }, s.filesProcessed.map((f) =>
        el('span', { className: 'text-xs px-2 py-1 bg-cyan-100 dark:bg-cyan-800 text-cyan-700 dark:text-cyan-200 rounded', text: f }))),
    ]));
  }

  if (s.transactionIds.length > 0) {
    children.push(el('div', { className: 'p-3 bg-gray-50 dark:bg-gray-700 rounded-lg' }, [
      el('div', { className: 'text-sm text-gray-600 dark:text-gray-400 mb-1', html: `Transaction IDs: <span class="font-mono text-gray-800 dark:text-gray-200">${s.transactionIds.join(', ')}</span>` }),
    ]));
  }
  if (s.uniqueEventTypes.length > 0) {
    children.push(el('div', { className: 'p-3 bg-gray-50 dark:bg-gray-700 rounded-lg' }, [
      el('div', { className: 'text-sm text-gray-600 dark:text-gray-400 mb-1', html: `Event Types: <span class="font-mono text-gray-800 dark:text-gray-200">${s.uniqueEventTypes.join(', ')}</span>` }),
    ]));
  }

  if (s.alertCodes.length > 0) {
    const rows = s.alertCodes.map((item) =>
      el('tr', { className: 'border-b border-gray-100 dark:border-gray-600' }, [
        el('td', { className: 'py-1 px-2 font-mono text-gray-800 dark:text-gray-200', text: item.code }),
        el('td', { className: 'py-1 px-2 text-gray-600 dark:text-gray-400', text: String(item.count) }),
        el('td', { className: 'py-1 px-2 text-gray-800 dark:text-gray-200 break-words max-w-xs', text: item.description }),
      ]));
    children.push(el('div', { className: 'p-3 bg-gray-50 dark:bg-gray-700 rounded-lg' }, [
      el('div', { className: 'text-sm font-medium text-gray-700 dark:text-gray-300 mb-3', text: `Alert Codes Summary (${s.alertCodes.length} unique codes)` }),
      el('div', { className: 'overflow-x-auto' }, [
        el('table', { className: 'min-w-full text-xs' }, [
          el('thead', {}, [el('tr', { className: 'border-b border-gray-200 dark:border-gray-600' }, [
            el('th', { className: 'text-left py-1 px-2 font-medium text-gray-600 dark:text-gray-400', text: 'Alert Code' }),
            el('th', { className: 'text-left py-1 px-2 font-medium text-gray-600 dark:text-gray-400', text: 'Count' }),
            el('th', { className: 'text-left py-1 px-2 font-medium text-gray-600 dark:text-gray-400', text: 'Description' }),
          ])]),
          el('tbody', {}, rows),
        ]),
      ]),
    ]));
  }

  children.push(el('div', { className: 'p-3 bg-gray-50 dark:bg-gray-700 rounded-lg' }, [
    el('div', { className: 'text-sm text-gray-600 dark:text-gray-400 mb-2', text: 'Log Duration Information:' }),
    el('div', { className: 'grid grid-cols-1 md:grid-cols-2 gap-4 text-xs' }, [
      el('div', {}, [
        el('div', { className: 'font-medium text-gray-700 dark:text-gray-300 mb-1', text: 'Start Time:' }),
        el('div', { className: 'font-mono text-gray-800 dark:text-gray-200', text: `UTC: ${s.startUtc}` }),
        el('div', { className: 'font-mono text-gray-800 dark:text-gray-200', text: `IST: ${s.startIst}` }),
      ]),
      el('div', {}, [
        el('div', { className: 'font-medium text-gray-700 dark:text-gray-300 mb-1', text: 'End Time:' }),
        el('div', { className: 'font-mono text-gray-800 dark:text-gray-200', text: `UTC: ${s.endUtc}` }),
        el('div', { className: 'font-mono text-gray-800 dark:text-gray-200', text: `IST: ${s.endIst}` }),
      ]),
    ]),
    el('div', { className: 'mt-2 pt-2 border-t border-gray-200 dark:border-gray-600' }, [
      el('div', { className: 'font-medium text-gray-700 dark:text-gray-300', html: `Total Duration: <span class="font-mono text-gray-800 dark:text-gray-200">${s.duration}</span>` }),
    ]),
  ]));

  return el('div', { className: 'space-y-3' }, children);
}
