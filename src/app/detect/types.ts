// Detection-module data contracts (§9). Ported from the v2026.05.14 tool's
// downtime engine. Kept local to the detect module (decompose by responsibility).

import type { ParsedMessage, ParsedAlert } from '../model/types';

/** A harvested WebSocket heartbeat event (PING / PONG / server-PING). */
export interface WsEvent {
  ts: string; // raw `[timestamp]` from the log line
  t: Date; // parsed timestamp
  lineNo: number; // 1-based line number
}

/**
 * The three WS heartbeat streams harvested in the same pass as downtime
 * detection (FR-334). Replaces the legacy `window._wsPingEvents/_wsPongEvents/
 * _wsServerPings` globals — same data, returned instead of written to `window`.
 */
export interface WsEventStreams {
  pings: WsEvent[]; // `>> PING` (client → server)
  pongs: WsEvent[]; // `<< PONG` (server → client)
  serverPings: WsEvent[]; // `<< PING` (server → client)
}

/** OCPP / CPO / vendor error codes attributed to a downtime. */
export interface ErrorCodes {
  ocppErrorCode: string;
  cpoErrorCode: string;
  vendorErrorCode: string;
}

/** A detected downtime period (one fault occurrence). */
export interface Downtime {
  reason: string;
  startTime: string;
  startLineNumber: number;
  endTime: string | null;
  endLineNumber: number | null;
  /** Last time the fault was observed (for continuous-reporting faults). */
  lastSeenTime: string;
  lastSeenLineNumber: number;

  // --- attached on resolution / finalisation ---
  ocppErrorCode?: string;
  cpoErrorCode?: string;
  vendorErrorCode?: string;
  duration?: string; // "HH:MM:SS" when resolved, "Ongoing" when not
  info?: string; // human-readable start/recovery line breadcrumb
}

export type DowntimeEndPatternType =
  | 'bootnotification'
  | 'statusnotification'
  | 'log'
  | 'powerfailure_recovery'
  | 'emergencystop_recovery'
  | 'time_based_silence';

/** One way a downtime can be recognised as recovered. */
export interface DowntimeEndPattern {
  type: DowntimeEndPatternType;
  status?: string;
  first?: boolean;
  pattern?: RegExp;
  silenceThresholdMs?: number;
}

/** Per-reason detection rules (start match, recovery patterns, error codes). */
export interface DowntimeReasonConfig {
  startPattern: RegExp | null;
  customStartCheck?: (line: string) => boolean;
  /** Use the last PING/PONG as the downtime start (accurate Connection-Lost start). */
  useLastHeartbeatAsStart?: boolean;
  /** Fault re-reports continuously while active (e.g. Under Voltage). */
  isContinuousReporting?: boolean;
  endPatterns: DowntimeEndPattern[];
  extractErrorCodes: (downtime: Downtime, messages: ParsedMessage[], alerts: ParsedAlert[]) => ErrorCodes;
}

/** Reason name → its detection config. */
export type DowntimeConfig = Record<string, DowntimeReasonConfig>;

/** Return of `detectDowntimes`: the downtimes plus the same-pass WS harvest. */
export interface DetectDowntimesResult {
  downtimes: Downtime[];
  wsEvents: WsEventStreams;
}

/** Per-connector status captured during a fault recovery window. */
export interface RecoveryConnectorStatus {
  connectorId: number;
  status: string;
}

/**
 * A "missing sync" flag raised when a Power Failure / Emergency Stop recovered
 * without the expected BootNotification and/or StatusNotification (FR-075 area).
 */
export interface MissingSyncFlag {
  reason: string;
  startTime: string;
  startLineNumber: number;
  endTime: string;
  endLineNumber: number | null;
  duration?: string;
  ocppErrorCode: string;
  cpoErrorCode: string;
  vendorErrorCode: string;
  info: string;
  /** Present only for Power Restore (Emergency Stop expects no BootNotification). */
  missingBoot?: boolean;
  missingStatus: boolean;
  recoveryStatusPerConnector: RecoveryConnectorStatus[];
}

/** A transaction missing its Start or its Stop (FR-122/FR-123). */
export interface IncompleteTransaction {
  id: number;
  connectorId: number | string;
  refTime: string;
  missing: 'Start' | 'Stop';
  location?: 'Start of Logs' | 'End of Logs' | 'Between Logs';
  reason?: string;
}
