import { OCPP16 } from 'typed-ocpp';
import type { RawFrame, MessageResult, MessageKind, Violation, SchemaError } from './types';

const CALL = 2;
const CALL_RESULT = 3;
const CALL_ERROR = 4;

function frameInvalid(message: string): Violation {
  return { layer: 'L1', code: 'FRAME_INVALID', message };
}

function detectKind(frame: RawFrame): MessageKind | null {
  switch (frame[0]) {
    case CALL: return 'Call';
    case CALL_RESULT: return 'CallResult';
    case CALL_ERROR: return 'CallError';
    default: return null;
  }
}

function isPlainObject(v: unknown): boolean {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

/** L1 structural check, kept independent of schema so we can distinguish L1 from L2. */
function structuralViolation(frame: RawFrame, kind: MessageKind): Violation | null {
  if (kind === 'Call') {
    if (frame.length !== 4) return frameInvalid('Call frame must have 4 elements: [2, messageId, action, payload]');
    if (typeof frame[1] !== 'string') return frameInvalid('Call messageId must be a string');
    if (typeof frame[2] !== 'string') return frameInvalid('Call action must be a string');
    if (!isPlainObject(frame[3])) return frameInvalid('Call payload must be an object');
  } else if (kind === 'CallResult') {
    if (frame.length !== 3) return frameInvalid('CallResult frame must have 3 elements: [3, messageId, payload]');
    if (typeof frame[1] !== 'string') return frameInvalid('CallResult messageId must be a string');
    if (!isPlainObject(frame[2])) return frameInvalid('CallResult payload must be an object');
  } else {
    if (frame.length !== 5) return frameInvalid('CallError frame must have 5 elements: [4, messageId, errorCode, errorDescription, errorDetails]');
    if (typeof frame[1] !== 'string') return frameInvalid('CallError messageId must be a string');
    if (typeof frame[2] !== 'string') return frameInvalid('CallError errorCode must be a string');
    if (typeof frame[3] !== 'string') return frameInvalid('CallError errorDescription must be a string');
  }
  return null;
}

/** typed-ocpp validators carry an Ajv-style `.errors` array after returning false. */
type ValidatorFn = ((frame: unknown) => boolean) & { errors?: SchemaError[] | null };

function schemaValidatorFor(kind: MessageKind): ValidatorFn {
  if (kind === 'Call') return OCPP16.validateCall as unknown as ValidatorFn;
  if (kind === 'CallResult') return OCPP16.validateCallResult as unknown as ValidatorFn;
  return OCPP16.validateCallError as unknown as ValidatorFn;
}

/**
 * Validate one already-extracted OCPP frame: L1 frame structure + L2 schema.
 * Stateless. For CallResult/CallError the action-specific response schema is
 * enforced later during correlation (L3, checkCallResult) — the frame alone
 * has no action to key on.
 */
export function validateMessage(frame: RawFrame): MessageResult {
  if (!Array.isArray(frame) || frame.length === 0) {
    return { ok: false, violations: [frameInvalid('Frame must be a non-empty array')] };
  }

  const kind = detectKind(frame);
  if (kind === null) {
    return { ok: false, violations: [frameInvalid(`Unknown MessageTypeId: ${String(frame[0])}`)] };
  }

  const messageId = typeof frame[1] === 'string' ? frame[1] : undefined;
  const action = kind === 'Call' && typeof frame[2] === 'string' ? (frame[2] as string) : undefined;

  const structural = structuralViolation(frame, kind);
  if (structural) {
    return { ok: false, kind, action, messageId, violations: [structural] };
  }

  const validate = schemaValidatorFor(kind);
  if (validate(frame) === true) {
    return { ok: true, kind, action, messageId, violations: [] };
  }

  const errors = validate.errors ?? [];
  const violations: Violation[] = errors.length > 0
    ? errors.map((e): Violation => ({
        layer: 'L2',
        code: 'SCHEMA_VIOLATION',
        message: e.message ?? 'schema violation',
        path: e.instancePath || e.schemaPath || undefined,
        detail: e,
      }))
    : [{ layer: 'L2', code: 'SCHEMA_VIOLATION', message: 'payload failed schema validation' }];

  return { ok: false, kind, action, messageId, violations };
}
