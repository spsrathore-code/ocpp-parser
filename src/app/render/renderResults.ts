// Render orchestrator — the legacy displayResults() (HTML 2020-2624), headless
// input. Appends the 19 sections in §19.4 order. Each section declares a `render`
// that returns its body; `collapsibleSection` provides the card + (optional) count
// in the header.

import { clearChildren, collapsibleSection } from './dom';
import { wireContextButtons } from './contextViewer';
import { exportButton } from '../export/exportToExcel';
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
import { renderProtocolCompliance } from './sections/protocolCompliance';
import { renderWebSocketHealth } from './sections/webSocketHealth';
import { renderHeartbeats } from './sections/heartbeats';
import { renderStartTransactions } from './sections/startTransactions';
import { renderStopTransactions } from './sections/stopTransactions';

export interface SectionDef {
  title: string;
  emoji: string;
  /** Optional count shown as `Title (N)` in the header (parity with the legacy "(N)" titles). */
  count?: (r: AnalysisResult) => number;
  /** Optional "Export to Excel" header button targeting a rendered table by id. */
  exportTable?: { id: string; file: string };
  /** Builds the section body. */
  render: (r: AnalysisResult) => HTMLElement;
}

/** The §19.4 render order — all 19 sections now have real renderers. */
export const SECTION_ORDER: SectionDef[] = [
  { title: 'Debug Info', emoji: '🐞', render: renderDebugInfo },
  { title: 'Boot Notifications', emoji: '🔌', count: (r) => r.messageGroups.BootNotification.length, exportTable: { id: 'boot-notifications-table', file: 'Boot_Notifications.xlsx' }, render: renderBootNotifications },
  { title: 'Heartbeats', emoji: '💓', count: (r) => r.messageGroups.Heartbeat.length, exportTable: { id: 'heartbeats-table', file: 'Heartbeats.xlsx' }, render: renderHeartbeats },
  { title: 'Status Notifications', emoji: '📋', count: (r) => r.messageGroups.StatusNotification.length, exportTable: { id: 'status-notifications-table', file: 'Status_Notifications.xlsx' }, render: renderStatusNotifications },
  { title: 'Start Transactions', emoji: '▶️', count: (r) => r.messageGroups.StartTransaction.length, exportTable: { id: 'start-transactions-table', file: 'Start_Transactions.xlsx' }, render: renderStartTransactions },
  { title: 'Stop Transactions', emoji: '⏹️', count: (r) => r.messageGroups.StopTransaction.length, exportTable: { id: 'stop-transactions-table', file: 'Stop_Transactions.xlsx' }, render: renderStopTransactions },
  { title: 'Transaction Summary', emoji: '📊', count: (r) => r.transactions.length, exportTable: { id: 'transaction-summary-table', file: 'Transaction_Summary.xlsx' }, render: renderTransactionSummary },
  { title: 'Connector Stats', emoji: '🔌', count: (r) => r.connectorStats.length, exportTable: { id: 'connector-stats-table', file: 'Connector_Stats.xlsx' }, render: renderConnectorStats },
  { title: 'Transaction & Meter Values', emoji: '⚡', count: (r) => r.messageGroups.MeterValues.length, exportTable: { id: 'meter-values-table', file: 'Meter_Values.xlsx' }, render: renderMeterValues },
  { title: 'Events', emoji: '📅', count: (r) => r.events.length, exportTable: { id: 'events-table', file: 'Events.xlsx' }, render: renderEvents },
  { title: 'Alerts', emoji: '🚨', count: (r) => r.alerts.length, exportTable: { id: 'alerts-table', file: 'Alerts.xlsx' }, render: renderAlerts },
  { title: 'Downtime Report', emoji: '📉', count: (r) => r.downtimes.length, exportTable: { id: 'downtime-report-table', file: 'Downtime_Report.xlsx' }, render: renderDowntimeReport },
  { title: 'Power Restore Missing Sync', emoji: '🔄', count: (r) => r.powerRestoreSync.length, exportTable: { id: 'power-restore-missing-sync-table', file: 'Power_Restore_Missing_Sync.xlsx' }, render: renderPowerRestoreSync },
  { title: 'Emergency Stop Release', emoji: '🛑', count: (r) => r.emergencyStopSync.length, exportTable: { id: 'emergency-stop-missing-status-table', file: 'Emergency_Stop_Missing_Status.xlsx' }, render: renderEmergencyStopRelease },
  { title: 'Fault Status Summary', emoji: '⚠️', exportTable: { id: 'fault-status-summary-table', file: 'Fault_Status_Summary.xlsx' }, render: renderFaultStatusSummary },
  { title: 'Incomplete Transactions', emoji: '🧩', count: (r) => r.incompleteTransactions.length, exportTable: { id: 'incomplete-transactions-table', file: 'Incomplete_Transactions.xlsx' }, render: renderIncompleteTransactions },
  { title: 'Energy Dispense Check', emoji: '⚡', count: (r) => r.energyDispense.length, exportTable: { id: 'energy-dispense-table', file: 'Energy_Dispense_Check.xlsx' }, render: renderEnergyDispense },
  { title: 'Protocol Compliance', emoji: '✅', render: renderProtocolCompliance },
  { title: 'WebSocket Health', emoji: '🌐', count: (r) => r.wsHealth.pingCount, exportTable: { id: 'ws-health-table', file: 'WebSocket_Health.xlsx' }, render: renderWebSocketHealth },
];

/** Render every section into `container` (clears prior content first). */
export function renderResults(container: HTMLElement, result: AnalysisResult): void {
  clearChildren(container);
  for (const def of SECTION_ORDER) {
    const title = def.count ? `${def.title} (${def.count(result)})` : def.title;
    const headerAction = def.exportTable ? exportButton(def.exportTable.id, def.exportTable.file) : undefined;
    container.appendChild(collapsibleSection(title, def.emoji, def.render(result), { headerAction }));
  }
  // One delegated handler powers every section's Preview/Download "log context" button.
  wireContextButtons(container, result.rawLogLines);
}
