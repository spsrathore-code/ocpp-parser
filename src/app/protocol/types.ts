// Protocol Compliance Report data contracts (§11). Ported from the v2026.05.14
// tool's `runProtocolValidation` return shape (HTML 6353).

export type CheckStatus = 'pass' | 'warn' | 'fail' | 'info';

/** One protocol check (e.g. BOOT-001). */
export interface ProtocolCheck {
  id: string;
  description: string;
  status: CheckStatus;
  details: string;
  affectedItems: (string | number)[];
}

/** A group of related checks (BOOT, RESP, TXC, STATUS, MV). */
export interface ProtocolCheckGroup {
  id: string;
  name: string;
  icon: string;
  checks: ProtocolCheck[];
}

/** One stage of a transaction's lifecycle validation. */
export interface LifecycleStage {
  stage: string;
  status: CheckStatus;
  note: string;
}

/** Per-transaction lifecycle result (9–10 stages). */
export interface PerTransactionResult {
  txId: number;
  connectorId?: number;
  startTime?: string;
  stopTime?: string;
  idTag?: string;
  totalEnergy?: number | 'N/A';
  internalTransactionId: string | null;
  lifecycle: LifecycleStage[];
  overallStatus: 'pass' | 'warn' | 'fail';
  failedCount: number;
  warnCount: number;
}

export interface ProtocolSummary {
  total: number;
  passed: number;
  warnings: number;
  failed: number;
  info: number;
  evaluated: number;
  compliance: number; // percent: passed / evaluated
}

export interface ProtocolValidationResult {
  groups: ProtocolCheckGroup[];
  perTransactionResults: PerTransactionResult[];
  summary: ProtocolSummary;
}

/** Result of the L-001 phantom-connection heuristic. */
export interface PhantomResult {
  detected: boolean;
  unrespondedCount?: number;
  durationStr?: string;
  affectedMsgIds?: (string | number)[];
}
