// Render orchestrator — the legacy displayResults() (HTML 2020-2624), headless
// input. Appends the 19 sections in §19.4 order. Each section declares a `render`
// that returns its body; `collapsibleSection` provides the card + (optional) count
// in the header. Sections are swapped from placeholder to real one batch at a time.

import { el, clearChildren, collapsibleSection } from './dom';
import type { AnalysisResult } from '../analyze';
import { renderDebugInfo } from './sections/debugInfo';
import { renderBootNotifications } from './sections/bootNotifications';
import { renderStatusNotifications } from './sections/statusNotifications';
import { renderConnectorStats } from './sections/connectorStats';
import { renderHeartbeats } from './sections/heartbeats';
import { renderStartTransactions } from './sections/startTransactions';
import { renderStopTransactions } from './sections/stopTransactions';

export interface SectionDef {
  title: string;
  emoji: string;
  /** Optional count shown as `Title (N)` in the header (parity with the legacy "(N)" titles). */
  count?: (r: AnalysisResult) => number;
  /** Builds the section body. */
  render: (r: AnalysisResult) => HTMLElement;
}

/** Placeholder body used until a section's real renderer lands. */
function placeholder(text: string): (r: AnalysisResult) => HTMLElement {
  return () => el('p', { className: 'text-sm text-gray-600 dark:text-gray-400', text });
}

/** The §19.4 render order. Real renderers replace placeholders batch by batch. */
export const SECTION_ORDER: SectionDef[] = [
  { title: 'Debug Info', emoji: '🐞', render: renderDebugInfo },
  { title: 'Boot Notifications', emoji: '🔌', count: (r) => r.messageGroups.BootNotification.length, render: renderBootNotifications },
  { title: 'Heartbeats', emoji: '💓', count: (r) => r.messageGroups.Heartbeat.length, render: renderHeartbeats },
  { title: 'Status Notifications', emoji: '📋', count: (r) => r.messageGroups.StatusNotification.length, render: renderStatusNotifications },
  { title: 'Start Transactions', emoji: '▶️', count: (r) => r.messageGroups.StartTransaction.length, render: renderStartTransactions },
  { title: 'Stop Transactions', emoji: '⏹️', count: (r) => r.messageGroups.StopTransaction.length, render: renderStopTransactions },
  { title: 'Transaction Summary', emoji: '📊', render: placeholder('Transaction summary — pending Phase 3b') },
  { title: 'Connector Stats', emoji: '🔌', count: (r) => r.connectorStats.length, render: renderConnectorStats },
  { title: 'Transaction & Meter Values', emoji: '⚡', render: placeholder('Meter values — pending Phase 3b') },
  { title: 'Events', emoji: '📅', render: placeholder('Events — pending Phase 3b') },
  { title: 'Alerts', emoji: '🚨', render: placeholder('Alerts — pending Phase 3b') },
  { title: 'Downtime Report', emoji: '📉', render: placeholder('Downtime report — pending Phase 3b') },
  { title: 'Power Restore Missing Sync', emoji: '🔄', render: placeholder('Power-restore sync — pending Phase 3b') },
  { title: 'Emergency Stop Release', emoji: '🛑', render: placeholder('Emergency-stop release — pending Phase 3b') },
  { title: 'Fault Status Summary', emoji: '⚠️', render: placeholder('Fault status — pending Phase 3b') },
  { title: 'Incomplete Transactions', emoji: '🧩', render: placeholder('Incomplete transactions — pending Phase 3b') },
  { title: 'Energy Dispense Check', emoji: '⚡', render: placeholder('Energy dispense — pending Phase 3b') },
  { title: 'Protocol Compliance', emoji: '✅', render: placeholder('Protocol compliance — pending Phase 3b') },
  { title: 'WebSocket Health', emoji: '🌐', render: placeholder('WebSocket health — pending Phase 3b') },
];

/** Render every section into `container` (clears prior content first). */
export function renderResults(container: HTMLElement, result: AnalysisResult): void {
  clearChildren(container);
  for (const def of SECTION_ORDER) {
    const title = def.count ? `${def.title} (${def.count(result)})` : def.title;
    container.appendChild(collapsibleSection(title, def.emoji, def.render(result)));
  }
}
