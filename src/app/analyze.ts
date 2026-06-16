// Pipeline orchestration core — runs the full Phase 1–2 analysis and returns one
// typed bundle. This is the headless counterpart of the legacy displayResults():
// it computes everything; the render layer only draws. Pure and DOM-free so it
// stays unit-testable. The chunked/async file driver lives in main.ts (UI shell).

import { parseLines, type ParsedLines } from './parse/parseLines';
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
  phantom: PhantomResult;
  wsHealth: WsHealth;
  rawLogLines: string[];
  filesProcessed: string[];
}

/** Merge per-file parse outputs into one combined `ParsedLines` (multi-file upload). */
export function mergeParsed(parts: ParsedLines[]): ParsedLines {
  const merged: ParsedLines = { messages: [], events: [], alerts: [], internalTxMap: new Map() };
  for (const p of parts) {
    merged.messages.push(...p.messages);
    merged.events.push(...p.events);
    merged.alerts.push(...p.alerts);
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
  const phantom = detectPhantomConnectionPattern(messageGroups.BootNotification, rawLogLines);
  const wsHealth = analyzeWebSocketHealth(wsEvents);

  return {
    messages, events, alerts, internalTxMap, messageGroups, transactions,
    downtimes, incompleteTransactions, powerRestoreSync, emergencyStopSync,
    connectorStats, energyDispense, protocol, phantom, wsHealth,
    rawLogLines, filesProcessed,
  };
}

/** Convenience: parse + analyze a single file's lines. */
export function analyzeLogLines(lines: string[], fileName: string): AnalysisResult {
  const parsed = parseLines(lines, fileName);
  return analyze(parsed, lines, [fileName]);
}
