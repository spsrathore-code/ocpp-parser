/** A raw, already-extracted OCPP RPC frame, e.g. [2,"id","BootNotification",{...}]. */
export type RawFrame = unknown[];

export type MessageKind = 'Call' | 'CallResult' | 'CallError';

export type ViolationLayer = 'L1' | 'L2' | 'L3';

/** A single validation failure at a specific ladder layer. */
export interface Violation {
  layer: ViolationLayer;
  /** FRAME_INVALID | SCHEMA_VIOLATION | RESULT_MISMATCH | UNMATCHED_CALL | UNMATCHED_RESPONSE */
  code: string;
  message: string;
  /** JSON pointer into the payload (schema errors). */
  path?: string;
  /** Raw underlying error (e.g. Ajv error object). */
  detail?: unknown;
}

/** Result of validating one frame in isolation (L1 + L2). */
export interface MessageResult {
  ok: boolean;
  kind?: MessageKind;
  action?: string;
  messageId?: string;
  violations: Violation[];
}

export type ExchangeStatus = 'matched' | 'orphan-call' | 'orphan-response' | 'mismatch';

/** Result of correlating a Call with its response (L3). */
export interface ExchangeResult {
  messageId: string;
  action?: string;
  status: ExchangeStatus;
  /** response.ts − call.ts when both timestamps are present. */
  latencyMs?: number;
  violations: Violation[];
}

/** The full consumer-agnostic report (§5, §8 VAL-007). */
export interface ValidationReport {
  messages: MessageResult[];
  exchanges: ExchangeResult[];
  summary: {
    total: number;
    valid: number;
    invalid: number;
    orphanCalls: number;
    orphanResponses: number;
    avgLatencyMs: number | null;
  };
}

// ---- L4 extension point (Phase 2 — interface only, not executed in Phase 1) ----

/** Context handed to L4 protocol rules. Expanded in Phase 2 with connector/transaction state. */
export interface ProtocolContext {
  report: ValidationReport;
}

export interface ProtocolRule {
  id: string;
  check(ctx: ProtocolContext): Violation[];
}

/** Shape of a typed-ocpp / Ajv validation error (subset we read). */
export interface SchemaError {
  message?: string;
  instancePath?: string;
  schemaPath?: string;
  keyword?: string;
  params?: Record<string, unknown>;
}
