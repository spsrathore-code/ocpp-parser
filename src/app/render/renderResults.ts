// Render orchestrator — the legacy displayResults() (HTML 2020-2624), headless
// input. Appends the 19 sections in the §19.4 order. In Phase 3a every body is a
// placeholder; Phase 3b swaps each `summary` for the real section renderer, one at
// a time, without touching the ordering here.

import { el, clearChildren, collapsibleSection } from './dom';
import type { AnalysisResult } from '../analyze';

interface SectionDef {
  title: string;
  emoji: string;
  /** Count/summary used by the 3a placeholder; 3b replaces with the real renderer. */
  summary: (r: AnalysisResult) => string;
}

/** The §19.4 render order. Edited section-by-section in Phase 3b. */
export const SECTION_ORDER: SectionDef[] = [
  { title: 'Debug Info', emoji: '🐞', summary: (r) => `${r.messages.length} messages parsed` },
  { title: 'Boot Notifications', emoji: '🔌', summary: (r) => `${r.messageGroups.BootNotification.length} boot notifications` },
  { title: 'Heartbeats', emoji: '💓', summary: (r) => `${r.messageGroups.Heartbeat.length} heartbeats` },
  { title: 'Status Notifications', emoji: '📋', summary: (r) => `${r.messageGroups.StatusNotification.length} status notifications` },
  { title: 'Start Transactions', emoji: '▶️', summary: (r) => `${r.messageGroups.StartTransaction.length} start transactions` },
  { title: 'Stop Transactions', emoji: '⏹️', summary: (r) => `${r.messageGroups.StopTransaction.length} stop transactions` },
  { title: 'Transaction Summary', emoji: '📊', summary: (r) => `${r.transactions.length} complete transactions` },
  { title: 'Connector Stats', emoji: '🔌', summary: (r) => `${r.connectorStats.length} connectors` },
  { title: 'Transaction & Meter Values', emoji: '⚡', summary: (r) => `${r.transactions.length} transactions` },
  { title: 'Events', emoji: '📅', summary: (r) => `${r.events.length} events` },
  { title: 'Alerts', emoji: '🚨', summary: (r) => `${r.alerts.length} alerts` },
  { title: 'Downtime Report', emoji: '📉', summary: (r) => `${r.downtimes.length} downtimes` },
  { title: 'Power Restore Missing Sync', emoji: '🔄', summary: (r) => `${r.powerRestoreSync.length} flags` },
  { title: 'Emergency Stop Release', emoji: '🛑', summary: (r) => `${r.emergencyStopSync.length} flags` },
  { title: 'Fault Status Summary', emoji: '⚠️', summary: (r) => `${r.messageGroups.StatusNotification.length} status notifications scanned` },
  { title: 'Incomplete Transactions', emoji: '🧩', summary: (r) => `${r.incompleteTransactions.length} incomplete` },
  { title: 'Energy Dispense Check', emoji: '⚡', summary: (r) => `${r.energyDispense.length} connectors` },
  { title: 'Protocol Compliance', emoji: '✅', summary: (r) => `${r.protocol.groups.length} check groups` },
  { title: 'WebSocket Health', emoji: '🌐', summary: (r) => `status: ${r.wsHealth.connectionStatus}` },
];

/** Render every section into `container` (clears prior content first). */
export function renderResults(container: HTMLElement, result: AnalysisResult): void {
  clearChildren(container);
  for (const def of SECTION_ORDER) {
    const body = el('p', { className: 'text-sm text-gray-600 dark:text-gray-400', text: def.summary(result) });
    container.appendChild(collapsibleSection(def.title, def.emoji, body));
  }
}
