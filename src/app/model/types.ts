// Canonical data model for the OCPP Client Log Parser.
// Ported verbatim from the SSOT spec (specs/requirements.md §19.3 "Core Data
// Structures"). These contracts are what the revamp must preserve for parity.

/** Raw OCPP RPC array as it appears in the log: [msgType, msgId, action, payload]. */
export type OcppRawMessage = unknown[];

export type Direction = 'sent' | 'received';

/**
 * A parsed OCPP message line.
 * `responsePayload` is attached later by `correlateMessages()` via `msgId`.
 */
export interface ParsedMessage {
  timestamp: string;
  direction: Direction;
  message: OcppRawMessage; // [msgType, msgId, action, payload]
  lineNumber: number;
  fileName: string;
  responsePayload?: unknown;
}

/** A parsed `handling [OCPP] event {...}` line. */
export interface ParsedEvent {
  timestamp: string;
  type: string;
  chargerId?: string;
  outlet?: string;
  payload: unknown;
  lineNumber: number;
  fileName: string;
}

/** A parsed event whose `type === "alert"`. */
export interface ParsedAlert {
  timestamp: string;
  chargerId?: string;
  outlet?: string;
  code?: string;
  message: string;
  session?: string;
  lineNumber: number;
  fileName: string;
}

/** Keys of `messageGroups` (from `groupMessagesByType`, keyed by `message[2]`). */
export const MESSAGE_GROUP_KEYS = [
  'BootNotification',
  'Heartbeat',
  'StatusNotification',
  'StartTransaction',
  'StopTransaction',
  'MeterValues',
  'Other',
] as const;

export type MessageGroupKey = (typeof MESSAGE_GROUP_KEYS)[number];

/** Messages grouped by action type. */
export type MessageGroups = Record<MessageGroupKey, ParsedMessage[]>;

/** Map<cmsTxId, internalTransactionId> — reset every parse (§16). */
export type InternalTxMap = Map<string, string>;

export type TxStatus = 'Aborted' | 'Completed';

/**
 * Canonical transaction object produced by `processTransactions`
 * (spec §19.3). `id` is the CMS transactionId taken from the StartTx
 * **responsePayload** (Bug Fix #1), not the request.
 */
export interface Transaction {
  id: number;
  startTime: string;
  stopTime?: string;
  meterStart?: number; // Wh
  meterStop?: number; // Wh
  connectorId?: number;
  idTag?: string;
  meterValues: ParsedMessage[]; // grouped MeterValues messages

  // Section 15 — offline replay
  isOfflineReplay: boolean;
  recordedTimestamp?: string;
  logTimestamp?: string;
  replayDelayMs?: number;

  // Section 16 — internal id mapping
  internalTransactionId?: string;

  // StopTx transactionData
  socBegin?: number;
  socEnd?: number;
  location?: string;

  duration?: number; // minutes (stop − start)
  totalEnergy?: number; // kWh ((meterStop − meterStart) / 1000)

  avgPower?: number; // kW (Power.Active.Import, W→kW)
  peakPower?: number; // kW

  maxTempInlet: number | null; // °C, null if none
  maxTempOutlet: number | null;
  maxTempBody: number | null;

  // Section 10.4 — current delivery (Current.Import Outlet-vs-EV pairs)
  currentPairCount?: number;
  avgCurrentOutlet?: number;
  avgCurrentEV?: number;

  // Section 10.3 — start/stop meter continuity (per connector)
  startStopDiff?: number | null;

  status: TxStatus;
}

/** Create an empty, fully-keyed `messageGroups` bucket. */
export function createMessageGroups(): MessageGroups {
  return {
    BootNotification: [],
    Heartbeat: [],
    StatusNotification: [],
    StartTransaction: [],
    StopTransaction: [],
    MeterValues: [],
    Other: [],
  };
}
