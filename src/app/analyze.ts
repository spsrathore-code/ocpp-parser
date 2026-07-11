// Pipeline orchestration core — runs the full Phase 1–2 analysis and returns one
// typed bundle. This is the headless counterpart of the legacy displayResults():
// it computes everything; the render layer only draws. Pure and DOM-free so it
// stays unit-testable. The chunked/async file driver lives in main.ts (UI shell).

import { parseLines, type ParsedLines } from './parse/parseLines';
import { appendAll } from './parse/concatChunks';
import { correlateMessages } from './parse/correlate';
import { groupMessagesByType } from './parse/groupMessages';
import { processTransactions } from './parse/processTransactions';
import { detectDowntimes } from './detect/detectDowntimes';
import { detectIncompleteTransactions } from './detect/incompleteTransactions';
import { detectMissingBootAfterPowerRestore, detectMissingStatusAfterEmergencyStop } from './detect/missingSync';
import { aggregateConnectorStats } from './health/connectorStats';
import { analyzeEnergyDispense } from './health/energyDispense';
import { runProtocolValidation } from './protocol/runProtocolValidation';
import { detectPhantomConnectionPattern } from './protocol/phantom';
import { analyzeWebSocketHealth } from './ws/wsHealth';
import { computeHeartbeatSummary, type HeartbeatSummary } from './health/heartbeatSummary';
import { runCompliance } from './compliance/runCompliance';
import { cpInitiatedPack } from './compliance/rulepacks/cpInitiated';
import type { ComplianceReport } from './compliance/types';

import type { MessageGroups, Transaction, InternalTxMap, ParsedMessage, ParsedEvent, ParsedAlert } from './model/types';
import type { Downtime, MissingSyncFlag, IncompleteTransaction } from './detect/types';
import type { ConnectorStatsRow, EnergyDispenseRow } from './health/types';
import type { ProtocolValidationResult, PhantomResult } from './protocol/types';
import type { WsHealth } from './ws/types';

/** Everything the render layer needs to draw the 19 sections (§19.4). */
export interface AnalysisResult {
  messages: ParsedMessage[];
  events: ParsedEvent[];
  alerts: ParsedAlert[];
  internalTxMap: InternalTxMap;
  messageGroups: MessageGroups;
  transactions: Transaction[];
  downtimes: Downtime[];
  incompleteTransactions: IncompleteTransaction[];
  powerRestoreSync: MissingSyncFlag[];
  emergencyStopSync: MissingSyncFlag[];
  connectorStats: ConnectorStatsRow[];
  energyDispense: EnergyDispenseRow[];
  protocol: ProtocolValidationResult;
  cpCompliance: ComplianceReport;
  phantom: PhantomResult;
  wsHealth: WsHealth;
  heartbeatSummary: HeartbeatSummary;
  rawLogLines: string[];
  filesProcessed: string[];
}

/** Merge per-file parse outputs into one combined `ParsedLines` (multi-file upload).
 *  Uses loop-append (not `push(...spread)`) so a large file's message array cannot
 *  overflow the JS argument-count cap. */
export function mergeParsed(parts: ParsedLines[]): ParsedLines {
  const merged: ParsedLines = { messages: [], events: [], alerts: [], internalTxMap: new Map() };
  for (const p of parts) {
    appendAll(merged.messages, p.messages);
    appendAll(merged.events, p.events);
    appendAll(merged.alerts, p.alerts);
    p.internalTxMap.forEach((v, k) => merged.internalTxMap.set(k, v));
  }
  return merged;
}

/** Run the whole analysis over already-merged parse output + the raw lines (all files). */
export function analyze(parsed: ParsedLines, rawLogLines: string[], filesProcessed: string[]): AnalysisResult {
  const { messages, events, alerts, internalTxMap } = parsed;
  const messageGroups = groupMessagesByType(correlateMessages(messages));
  const transactions = processTransactions(messageGroups, internalTxMap);

  const { downtimes, wsEvents } = detectDowntimes(rawLogLines, messages, alerts);
  const incompleteTransactions = detectIncompleteTransactions(messageGroups, transactions);
  const powerRestoreSync = detectMissingBootAfterPowerRestore(downtimes, messages);
  const emergencyStopSync = detectMissingStatusAfterEmergencyStop(downtimes, messages);

  const connectorStats = aggregateConnectorStats(transactions);
  const energyDispense = analyzeEnergyDispense(transactions);

  const protocol = runProtocolValidation(messageGroups, transactions, internalTxMap, rawLogLines);
  const cpCompliance = runCompliance(cpInitiatedPack, { messageGroups, transactions, internalTxMap, rawLogLines });
  const phantom = detectPhantomConnectionPattern(messageGroups.BootNotification, rawLogLines);
  const wsHealth = analyzeWebSocketHealth(wsEvents);

  // Configured heartbeat interval = the first BootNotification.conf `interval` (seconds).
  const bootInterval = firstBootInterval(messageGroups.BootNotification);
  const heartbeatSummary = computeHeartbeatSummary(messageGroups.Heartbeat, bootInterval);

  return {
    messages, events, alerts, internalTxMap, messageGroups, transactions,
    downtimes, incompleteTransactions, powerRestoreSync, emergencyStopSync,
    connectorStats, energyDispense, protocol, cpCompliance, phantom, wsHealth,
    heartbeatSummary, rawLogLines, filesProcessed,
  };
}

/** First `interval` (seconds) from any BootNotification.conf, or null. */
function firstBootInterval(bootNotifications: ParsedMessage[]): number | null {
  for (const m of bootNotifications) {
    const interval = (m.responsePayload as { interval?: unknown } | null | undefined)?.interval;
    if (typeof interval === 'number' && interval > 0) return interval;
  }
  return null;
}

/** Convenience: parse + analyze a single file's lines. */
export function analyzeLogLines(lines: string[], fileName: string): AnalysisResult {
  const parsed = parseLines(lines, fileName);
  return analyze(parsed, lines, [fileName]);
}
