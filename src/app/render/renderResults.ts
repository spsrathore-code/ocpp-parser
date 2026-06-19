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
import { renderTransactionSummary } from './sections/transactionSummary';
import { renderEvents } from './sections/events';
import { renderAlerts } from './sections/alerts';
import { renderMeterValues } from './sections/meterValues';
import { renderFaultStatusSummary } from './sections/faultStatusSummary';
import { renderIncompleteTransactions } from './sections/incompleteTransactions';
import { renderEnergyDispense } from './sections/energyDispense';
import { renderDowntimeReport } from './sections/downtimeReport';
import { renderPowerRestoreSync, renderEmergencyStopRelease } from './sections/syncFlags';
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
  { title: 'Transaction Summary', emoji: '📊', count: (r) => r.transactions.length, render: renderTransactionSummary },
  { title: 'Connector Stats', emoji: '🔌', count: (r) => r.connectorStats.length, render: renderConnectorStats },
  { title: 'Transaction & Meter Values', emoji: '⚡', count: (r) => r.messageGroups.MeterValues.length, render: renderMeterValues },
  { title: 'Events', emoji: '📅', count: (r) => r.events.length, render: renderEvents },
  { title: 'Alerts', emoji: '🚨', count: (r) => r.alerts.length, render: renderAlerts },
  { title: 'Downtime Report', emoji: '📉', count: (r) => r.downtimes.length, render: renderDowntimeReport },
  { title: 'Power Restore Missing Sync', emoji: '🔄', count: (r) => r.powerRestoreSync.length, render: renderPowerRestoreSync },
  { title: 'Emergency Stop Release', emoji: '🛑', count: (r) => r.emergencyStopSync.length, render: renderEmergencyStopRelease },
  { title: 'Fault Status Summary', emoji: '⚠️', render: renderFaultStatusSummary },
  { title: 'Incomplete Transactions', emoji: '🧩', count: (r) => r.incompleteTransactions.length, render: renderIncompleteTransactions },
  { title: 'Energy Dispense Check', emoji: '⚡', count: (r) => r.energyDispense.length, render: renderEnergyDispense },
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
