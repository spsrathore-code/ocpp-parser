// Heartbeats section — faithful port of HTML 2275-2288, plus (a) a real Response
// Time (ms) per row and (b) a Heartbeat Summary panel above the table.
//
// Response Time (ms) = correlated CallResult timestamp − request timestamp, shown
// when measurable (> 0), else 'N/A'.
// Heartbeat Summary = interval stats between consecutive Heartbeat.conf `currentTime`
// values (the authoritative CS timestamp), with missed-heartbeat highlighting.

import { el } from '../dom';
import { dataTable, type Row } from '../table';
import type { AnalysisResult } from '../../analyze';
import type { ParsedMessage } from '../../model/types';
import type { HeartbeatSummary, HeartbeatInterval } from '../../health/heartbeatSummary';

const HEADERS = ['Time Stamp', 'Message ID', 'Response Time (ms)'];

/** Request→response latency in whole ms, or 'N/A' if absent/unmeasurable/invalid. */
export function responseTimeMs(msg: ParsedMessage): string {
  if (!msg.responseTimestamp) return 'N/A';
  const req = new Date(msg.timestamp).getTime();
  const res = new Date(msg.responseTimestamp).getTime();
  if (Number.isNaN(req) || Number.isNaN(res)) return 'N/A';
  const diff = res - req;
  return diff > 0 ? String(diff) : 'N/A';
}

const fmt = (n: number | null): string => (n == null ? 'N/A' : n.toFixed(3));

function statCard(value: string, label: string, color: string): HTMLElement {
  return el('div', { className: `text-center p-3 bg-${color}-50 dark:bg-${color}-900/20 rounded-lg` }, [
    el('div', { className: `text-2xl font-bold text-${color}-600 dark:text-${color}-400`, text: value }),
    el('div', { className: `text-xs text-${color}-600 dark:text-${color}-400`, text: label }),
  ]);
}

/** The Heartbeat Summary panel (interval stats + missed-heartbeat highlights). */
function renderSummary(s: HeartbeatSummary): HTMLElement {
  const children: HTMLElement[] = [
    el('h3', { className: 'text-lg font-semibold text-gray-800 dark:text-gray-200 mb-3', text: '💓 Heartbeat Summary' }),
  ];

  if (s.intervalCount === 0) {
    children.push(el('div', { className: 'p-3 bg-gray-50 dark:bg-gray-700 rounded-lg text-sm text-gray-600 dark:text-gray-400', text: 'Not enough heartbeats to compute intervals (need at least 2 with a currentTime).' }));
    return el('div', { className: 'mb-6' }, children);
  }

  const expectedLabel = s.expectedSeconds == null
    ? 'Expected (s)'
    : `Expected (s) · ${s.expectedSource === 'configured' ? 'configured' : 'median'}`;

  children.push(el('div', { className: 'grid grid-cols-2 md:grid-cols-5 gap-3 mb-3' }, [
    statCard(String(s.total), 'Total Heartbeats', 'blue'),
    statCard(fmt(s.avgSeconds), 'Avg Interval (s)', 'green'),
    statCard(fmt(s.minSeconds), 'Min Interval (s)', 'purple'),
    statCard(fmt(s.maxSeconds), 'Max Interval (s)', 'orange'),
    statCard(fmt(s.expectedSeconds), expectedLabel, 'indigo'),
  ]));

  if (s.flagged.length > 0) {
    const rows = s.flagged.map((iv: HeartbeatInterval) =>
      el('tr', { className: 'border-b border-amber-100 dark:border-amber-800/40' }, [
        el('td', { className: 'py-1 px-2 font-mono text-gray-800 dark:text-gray-200', text: iv.fromTime }),
        el('td', { className: 'py-1 px-2 font-mono text-gray-800 dark:text-gray-200', text: iv.toTime }),
        el('td', { className: 'py-1 px-2 text-right font-semibold text-amber-700 dark:text-amber-300', text: iv.seconds.toFixed(3) }),
        el('td', { className: 'py-1 px-2 text-right text-amber-700 dark:text-amber-300', text: `~${iv.missedEstimate} missed` }),
      ]));
    children.push(el('div', { className: 'p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-300 dark:border-amber-700 rounded-lg' }, [
      el('div', { className: 'text-sm font-medium text-amber-800 dark:text-amber-300 mb-2', text: `⚠️ ${s.flagged.length} interval(s) ≥ 1.5× expected — likely missed heartbeats` }),
      el('div', { className: 'overflow-x-auto' }, [
        el('table', { className: 'min-w-full text-xs' }, [
          el('thead', {}, [el('tr', { className: 'border-b border-amber-200 dark:border-amber-700' }, [
            el('th', { className: 'text-left py-1 px-2 font-medium text-amber-700 dark:text-amber-400', text: 'From (currentTime)' }),
            el('th', { className: 'text-left py-1 px-2 font-medium text-amber-700 dark:text-amber-400', text: 'To (currentTime)' }),
            el('th', { className: 'text-right py-1 px-2 font-medium text-amber-700 dark:text-amber-400', text: 'Interval (s)' }),
            el('th', { className: 'text-right py-1 px-2 font-medium text-amber-700 dark:text-amber-400', text: 'Missed (est.)' }),
          ])]),
          el('tbody', {}, rows),
        ]),
      ]),
    ]));
  } else {
    children.push(el('div', { className: 'p-3 bg-green-50 dark:bg-green-900/20 border border-green-300 dark:border-green-700 rounded-lg text-sm text-green-700 dark:text-green-300', text: '✅ No missed heartbeats detected (all intervals within 1.5× the expected interval).' }));
  }

  return el('div', { className: 'mb-6' }, children);
}

export function renderHeartbeats(r: AnalysisResult): HTMLElement {
  const rows: Row[] = r.messageGroups.Heartbeat.map((msg) => ({
    fileName: msg.fileName,
    'Time Stamp': msg.timestamp,
    'Message ID': msg.message[1] as string,
    'Response Time (ms)': responseTimeMs(msg),
  }));
  return el('div', {}, [
    renderSummary(r.heartbeatSummary),
    dataTable(HEADERS, rows, 'heartbeats-table'),
  ]);
}
