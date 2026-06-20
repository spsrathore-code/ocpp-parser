# OCPP Validation Engine — Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the L1–L3 OCPP 1.6J Validation Engine — an isomorphic TypeScript package that validates RPC frame structure (L1), payload schema (L2), and request↔response correlation (L3), returning a consumer-agnostic `ValidationReport`, with an L4 extension point stubbed for Phase 2.

**Architecture:** Three internal units wired in a pipeline (per `docs/TYPEVALIDATION.md` §4): `messageValidator` (L1+L2, wraps `typed-ocpp`), `exchangeTracker` (L3, our code over `typed-ocpp.checkCallResult`), and `protocolValidator` (L4 stub — interface only). A `validateBatch` convenience runs the whole pipeline over a frame stream. All code lives in `src/services/validation/`; tests in `tests/`. The package builds to ESM+CJS (Node/CMS) and bundles for the browser (Parser UI) — the browser path was already proven viable by the spike (`scratchpad/spike-typed-ocpp/FINDINGS.md`).

**Tech Stack:** TypeScript 5.7 (strict, ESM), `typed-ocpp` 1.5.6 (pinned), Vitest 2 (tests), tsup 8 (ESM+CJS+d.ts build), esbuild 0.24 (browser bundle — same engine the spike proved).

---

## Source-of-truth references

- Spec: `docs/TYPEVALIDATION.md` — §4 architecture, §5 API/contract, §8 functional requirements (VAL-001…010), §10 testing, §6 schema drift.
- Spike findings (proven facts this plan relies on): `scratchpad/spike-typed-ocpp/FINDINGS.md`.
- `typed-ocpp` API actually used (verified in spike): `OCPP16.validateCall/validateCallResult/validateCallError` (each returns `boolean` and exposes `.errors` Ajv-style after a `false`), `OCPP16.checkCallResult(result, call)` (**result first**, returns `boolean` + `.errors`), `OCPP16.isCall/isCallResult/isCallError`, `OCPP16.schemas` (56 keys, e.g. `BootNotificationRequest` / `BootNotificationResponse`), `OCPP16.Action`.

---

## File structure

| Action | File | Responsibility |
|---|---|---|
| CREATE | `package.json` (repo root) | `@ador/ocpp-validation` package manifest, scripts, pinned deps |
| CREATE | `tsconfig.json` (repo root) | TypeScript strict config (bundler resolution) |
| CREATE | `vitest.config.ts` (repo root) | Test runner config |
| CREATE | `tsup.config.ts` (repo root) | Dual ESM/CJS + d.ts build config |
| CREATE | `src/services/validation/types.ts` | Shared types: `RawFrame`, `Violation`, `MessageResult`, `ExchangeResult`, `ValidationReport`, `ProtocolRule`, `ProtocolContext` (spec §5) |
| CREATE | `src/services/validation/messageValidator.ts` | L1 frame + L2 schema for a single frame → `validateMessage(frame)` |
| CREATE | `src/services/validation/exchangeTracker.ts` | L3 correlation → `ExchangeTracker` class |
| CREATE | `src/services/validation/protocolValidator.ts` | L4 stub → `registerProtocolRules` / `getRegisteredRules` / `clearProtocolRules` |
| CREATE | `src/services/validation/validateBatch.ts` | Convenience: run the full pipeline over a stream → `validateBatch(frames)` |
| CREATE | `src/services/validation/index.ts` | Public barrel (the only entry consumers import) |
| CREATE | `tests/unit/messageValidator.test.ts` | L1/L2 behaviour matrix (VAL-002, VAL-003) |
| CREATE | `tests/unit/exchangeTracker.test.ts` | L3 pairing/orphans/latency/mismatch (VAL-004, VAL-005, VAL-006) |
| CREATE | `tests/unit/protocolValidator.test.ts` | L4 extension point present, rules registered not executed (VAL-009) |
| CREATE | `tests/unit/validateBatch.test.ts` | End-to-end report + summary (VAL-007) |
| CREATE | `tests/integration/schema-drift.test.ts` | 56 local `.json` ↔ typed-ocpp bundled schemas (spec §6/§10) |
| DELETE the `.gitkeep` files in `src/services/`, `tests/unit/`, `tests/integration/` as those dirs gain real files |

**Module/import convention:** ESM, `moduleResolution: "Bundler"` — imports use **no file extension** (e.g. `from './types'`). Keep this consistent across every file.

---

### Task 1: Bootstrap the package and tooling

**Files:**
- Create: `package.json`, `tsconfig.json`, `vitest.config.ts`, `tsup.config.ts` (all at repo root)

- [ ] **Step 1: Create `package.json`**

```json
{
  "name": "@ador/ocpp-validation",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "description": "Isomorphic OCPP 1.6J validation engine (L1 frame + L2 schema + L3 correlation). Shared core of the Ador OCPP tool suite.",
  "main": "./dist/index.cjs",
  "module": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js",
      "require": "./dist/index.cjs"
    }
  },
  "files": ["dist"],
  "scripts": {
    "build": "tsup",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "test:watch": "vitest",
    "bundle:browser": "esbuild src/services/validation/index.ts --bundle --format=esm --platform=browser --outfile=dist/browser/ocpp-validation.js --log-level=info"
  },
  "dependencies": {
    "typed-ocpp": "1.5.6"
  },
  "devDependencies": {
    "esbuild": "0.24.2",
    "tsup": "8.3.5",
    "typescript": "5.7.2",
    "vitest": "2.1.8"
  }
}
```

- [ ] **Step 2: Create `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "lib": ["ES2022", "DOM"],
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "declaration": true,
    "resolveJsonModule": true,
    "outDir": "dist",
    "rootDir": "."
  },
  "include": ["src/services/validation", "tests"]
}
```

- [ ] **Step 3: Create `vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
  },
});
```

- [ ] **Step 4: Create `tsup.config.ts`**

```ts
import { defineConfig } from 'tsup';

export default defineConfig({
  entry: { index: 'src/services/validation/index.ts' },
  format: ['esm', 'cjs'],
  dts: true,
  clean: true,
  sourcemap: true,
  target: 'es2022',
  outExtension({ format }) {
    return { js: format === 'cjs' ? '.cjs' : '.js' };
  },
});
```

- [ ] **Step 5: Install dependencies**

Run: `npm install`
Expected: completes; `node_modules/typed-ocpp` present at `1.5.6`; `package-lock.json` created. (The only audit warning will be esbuild's dev-server advisory — a build-time devDependency, irrelevant per FINDINGS.md.)

- [ ] **Step 6: Verify the toolchain runs with a throwaway smoke test**

Create `tests/unit/smoke.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { OCPP16 } from 'typed-ocpp';

describe('toolchain smoke', () => {
  it('typed-ocpp loads and exposes 56 schemas', () => {
    expect(Object.keys(OCPP16.schemas).length).toBe(56);
  });
});
```

Run: `npm test`
Expected: 1 test passes. Confirms TS+ESM+Vitest+typed-ocpp all resolve.

- [ ] **Step 7: Remove the smoke test (it has served its purpose)**

Run: `git rm -f tests/unit/smoke.test.ts` (or delete the file)

- [ ] **Step 8: Commit**

```bash
git add package.json package-lock.json tsconfig.json vitest.config.ts tsup.config.ts
git commit -m "chore: bootstrap @ador/ocpp-validation package (TS + Vitest + tsup, typed-ocpp pinned)"
```

---

### Task 2: Define the shared type contract

**Files:**
- Create: `src/services/validation/types.ts`

- [ ] **Step 1: Write `src/services/validation/types.ts`**

This is the §5 contract verbatim, made concrete. Every later file imports from here.

```ts
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
```

- [ ] **Step 2: Verify it type-checks**

Run: `npm run typecheck`
Expected: PASS (no errors). Types-only file; no test needed.

- [ ] **Step 3: Commit**

```bash
git add src/services/validation/types.ts
git commit -m "feat(validation): define shared result contract (Violation, MessageResult, ExchangeResult, ValidationReport)"
```

---

### Task 3: messageValidator — L1 frame + L2 schema (VAL-002, VAL-003)

**Files:**
- Create: `src/services/validation/messageValidator.ts`
- Test: `tests/unit/messageValidator.test.ts`

- [ ] **Step 1: Write the failing test**

`tests/unit/messageValidator.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { validateMessage } from '../../src/services/validation/messageValidator';

describe('validateMessage — L1 frame structure', () => {
  it('rejects a non-array frame as L1/FRAME_INVALID', () => {
    const r = validateMessage('not-an-array' as unknown as unknown[]);
    expect(r.ok).toBe(false);
    expect(r.violations[0]).toMatchObject({ layer: 'L1', code: 'FRAME_INVALID' });
  });

  it('rejects an unknown MessageTypeId (9) as L1/FRAME_INVALID', () => {
    const r = validateMessage([9, 'uid-3', 'BootNotification', {}]);
    expect(r.ok).toBe(false);
    expect(r.violations[0]).toMatchObject({ layer: 'L1', code: 'FRAME_INVALID' });
  });

  it('rejects a Call with wrong arity as L1/FRAME_INVALID', () => {
    const r = validateMessage([2, 'uid', 'BootNotification']); // missing payload
    expect(r.ok).toBe(false);
    expect(r.violations[0].layer).toBe('L1');
  });

  it('classifies a valid Call: kind=Call, action, messageId', () => {
    const r = validateMessage([2, 'uid-1', 'BootNotification', { chargePointVendor: 'Ador', chargePointModel: 'DC-60' }]);
    expect(r.ok).toBe(true);
    expect(r.kind).toBe('Call');
    expect(r.action).toBe('BootNotification');
    expect(r.messageId).toBe('uid-1');
    expect(r.violations).toHaveLength(0);
  });
});

describe('validateMessage — L2 schema', () => {
  it('flags a missing required field as L2/SCHEMA_VIOLATION with a path', () => {
    const r = validateMessage([2, 'uid-2', 'BootNotification', { chargePointVendor: 'Ador' }]); // missing chargePointModel
    expect(r.ok).toBe(false);
    expect(r.kind).toBe('Call');
    expect(r.violations.some(v => v.layer === 'L2' && v.code === 'SCHEMA_VIOLATION')).toBe(true);
  });

  it('accepts a structurally valid CallResult (action-specific schema enforced later at L3)', () => {
    const r = validateMessage([3, 'uid-1', { status: 'Accepted', currentTime: '2026-06-13T10:00:00Z', interval: 300 }]);
    expect(r.ok).toBe(true);
    expect(r.kind).toBe('CallResult');
    expect(r.messageId).toBe('uid-1');
  });

  it('classifies a CallError frame', () => {
    const r = validateMessage([4, 'uid-9', 'NotSupported', 'Not supported', {}]);
    expect(r.kind).toBe('CallError');
    expect(r.messageId).toBe('uid-9');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/messageValidator.test.ts`
Expected: FAIL — cannot resolve `messageValidator` (module not yet created).

- [ ] **Step 3: Write the implementation**

`src/services/validation/messageValidator.ts`:

```ts
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/messageValidator.test.ts`
Expected: PASS — all cases green.

- [ ] **Step 5: Commit**

```bash
git add src/services/validation/messageValidator.ts tests/unit/messageValidator.test.ts
git rm -f --ignore-unmatch src/services/.gitkeep tests/unit/.gitkeep
git commit -m "feat(validation): messageValidator — L1 frame + L2 schema (VAL-002, VAL-003)"
```

---

### Task 4: exchangeTracker — L3 correlation, orphans, latency (VAL-004, VAL-005, VAL-006)

**Files:**
- Create: `src/services/validation/exchangeTracker.ts`
- Test: `tests/unit/exchangeTracker.test.ts`

- [ ] **Step 1: Write the failing test**

`tests/unit/exchangeTracker.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { ExchangeTracker } from '../../src/services/validation/exchangeTracker';

const bootCall = [2, 'uid-1', 'BootNotification', { chargePointVendor: 'Ador', chargePointModel: 'DC-60' }];
const bootResult = [3, 'uid-1', { status: 'Accepted', currentTime: '2026-06-13T10:00:00Z', interval: 300 }];

describe('ExchangeTracker — matching (VAL-004)', () => {
  it('pairs a Call with its matching CallResult as status=matched', () => {
    const t = new ExchangeTracker();
    t.add(bootCall);
    t.add(bootResult);
    const ex = t.finalize();
    expect(ex).toHaveLength(1);
    expect(ex[0]).toMatchObject({ messageId: 'uid-1', action: 'BootNotification', status: 'matched' });
    expect(ex[0].violations).toHaveLength(0);
  });

  it('flags a response whose payload does not match its Call as mismatch/RESULT_MISMATCH', () => {
    const t = new ExchangeTracker();
    t.add(bootCall);
    // A BootNotification result is missing required fields → checkCallResult fails
    t.add([3, 'uid-1', { currentTime: '2026-06-13T10:00:00Z' }]);
    const ex = t.finalize();
    expect(ex[0].status).toBe('mismatch');
    expect(ex[0].violations.some(v => v.layer === 'L3' && v.code === 'RESULT_MISMATCH')).toBe(true);
  });
});

describe('ExchangeTracker — orphans (VAL-005)', () => {
  it('reports a Call with no response as orphan-call/UNMATCHED_CALL', () => {
    const t = new ExchangeTracker();
    t.add(bootCall);
    const ex = t.finalize();
    expect(ex[0].status).toBe('orphan-call');
    expect(ex[0].violations[0].code).toBe('UNMATCHED_CALL');
  });

  it('reports a response with no Call as orphan-response/UNMATCHED_RESPONSE', () => {
    const t = new ExchangeTracker();
    t.add([3, 'ghost', { status: 'Accepted', currentTime: '2026-06-13T10:00:00Z', interval: 300 }]);
    const ex = t.finalize();
    expect(ex[0].status).toBe('orphan-response');
    expect(ex[0].violations[0].code).toBe('UNMATCHED_RESPONSE');
  });

  it('resolves an out-of-order response that arrives before its Call', () => {
    const t = new ExchangeTracker();
    t.add(bootResult);       // response first
    t.add(bootCall);         // call later
    const ex = t.finalize();
    expect(ex).toHaveLength(1);
    expect(ex[0].status).toBe('matched');
  });
});

describe('ExchangeTracker — latency (VAL-006)', () => {
  it('computes latencyMs from the two timestamps', () => {
    const t = new ExchangeTracker();
    t.add(bootCall, '2026-06-13T10:00:00.000Z');
    t.add(bootResult, '2026-06-13T10:00:00.250Z');
    const ex = t.finalize();
    expect(ex[0].latencyMs).toBe(250);
  });

  it('leaves latencyMs undefined when a timestamp is missing', () => {
    const t = new ExchangeTracker();
    t.add(bootCall, '2026-06-13T10:00:00.000Z');
    t.add(bootResult); // no ts
    const ex = t.finalize();
    expect(ex[0].latencyMs).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/exchangeTracker.test.ts`
Expected: FAIL — cannot resolve `exchangeTracker`.

- [ ] **Step 3: Write the implementation**

`src/services/validation/exchangeTracker.ts`:

```ts
import { OCPP16 } from 'typed-ocpp';
import { validateMessage } from './messageValidator';
import type { RawFrame, MessageResult, ExchangeResult, ExchangeStatus, Violation, SchemaError } from './types';

interface PendingCall {
  messageId: string;
  action?: string;
  ts?: string;
  frame: RawFrame;
}

interface PendingResponse {
  messageId: string;
  kind: 'CallResult' | 'CallError';
  frame: RawFrame;
  ts?: string;
}

type CheckFn = ((result: unknown, call: unknown) => boolean) & { errors?: SchemaError[] | null };
const checkCallResult = OCPP16.checkCallResult as unknown as CheckFn;

function computeLatency(callTs?: string, respTs?: string): number | undefined {
  if (!callTs || !respTs) return undefined;
  const a = Date.parse(callTs);
  const b = Date.parse(respTs);
  if (Number.isNaN(a) || Number.isNaN(b)) return undefined;
  return b - a;
}

/**
 * Correlates Calls with their responses over a stream of frames (L3).
 * Stateful: `add` each frame as it arrives, then `finalize` to resolve
 * remaining orphans and emit the exchange list.
 */
export class ExchangeTracker {
  private readonly calls = new Map<string, PendingCall>();
  private readonly earlyResponses: PendingResponse[] = [];
  private readonly resolved = new Set<string>();
  private readonly exchanges: ExchangeResult[] = [];

  add(frame: RawFrame, ts?: string): MessageResult {
    const result = validateMessage(frame);
    const id = result.messageId;
    if (!id) return result; // un-correlatable (e.g. L1-invalid frame)

    if (result.kind === 'Call') {
      this.calls.set(id, { messageId: id, action: result.action, ts, frame });
      // A response may have arrived earlier (out of order) — resolve it now.
      const pending = this.earlyResponses.find(r => r.messageId === id);
      if (pending) this.resolvePair(this.calls.get(id)!, pending);
    } else if (result.kind === 'CallResult' || result.kind === 'CallError') {
      const call = this.calls.get(id);
      const resp: PendingResponse = { messageId: id, kind: result.kind, frame, ts };
      if (call && !this.resolved.has(id)) this.resolvePair(call, resp);
      else this.earlyResponses.push(resp);
    }
    return result;
  }

  private resolvePair(call: PendingCall, resp: PendingResponse): void {
    this.resolved.add(call.messageId);
    const violations: Violation[] = [];
    let status: ExchangeStatus = 'matched';

    if (resp.kind === 'CallResult') {
      const matched = checkCallResult(resp.frame, call.frame);
      if (matched !== true) {
        status = 'mismatch';
        violations.push({
          layer: 'L3',
          code: 'RESULT_MISMATCH',
          message: `CallResult ${call.messageId} does not match its ${call.action ?? 'Call'}`,
          detail: checkCallResult.errors ?? undefined,
        });
      }
    }
    // A CallError is a legitimate response to its Call — counts as matched.

    this.exchanges.push({
      messageId: call.messageId,
      action: call.action,
      status,
      latencyMs: computeLatency(call.ts, resp.ts),
      violations,
    });
  }

  finalize(): ExchangeResult[] {
    // Early responses that never found a Call → orphan-response.
    for (const resp of this.earlyResponses) {
      if (this.resolved.has(resp.messageId)) continue;
      this.exchanges.push({
        messageId: resp.messageId,
        status: 'orphan-response',
        violations: [{
          layer: 'L3',
          code: 'UNMATCHED_RESPONSE',
          message: `Response ${resp.messageId} has no matching Call`,
        }],
      });
    }
    // Calls that never got a response → orphan-call.
    for (const call of this.calls.values()) {
      if (this.resolved.has(call.messageId)) continue;
      this.exchanges.push({
        messageId: call.messageId,
        action: call.action,
        status: 'orphan-call',
        violations: [{
          layer: 'L3',
          code: 'UNMATCHED_CALL',
          message: `Call ${call.messageId} (${call.action ?? 'unknown'}) has no response`,
        }],
      });
    }
    return this.exchanges;
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/exchangeTracker.test.ts`
Expected: PASS — matched, mismatch, both orphan kinds, out-of-order, and latency all green.

- [ ] **Step 5: Commit**

```bash
git add src/services/validation/exchangeTracker.ts tests/unit/exchangeTracker.test.ts
git commit -m "feat(validation): exchangeTracker — L3 correlation, orphans, latency (VAL-004/005/006)"
```

---

### Task 5: protocolValidator — L4 extension point stub (VAL-009)

**Files:**
- Create: `src/services/validation/protocolValidator.ts`
- Test: `tests/unit/protocolValidator.test.ts`

- [ ] **Step 1: Write the failing test**

`tests/unit/protocolValidator.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import {
  registerProtocolRules,
  getRegisteredRules,
  clearProtocolRules,
} from '../../src/services/validation/protocolValidator';
import type { ProtocolRule } from '../../src/services/validation/types';

const ruleA: ProtocolRule = { id: 'no-stop-before-start', check: () => [] };
const ruleB: ProtocolRule = { id: 'boot-before-core', check: () => [] };

describe('protocolValidator — L4 extension point (VAL-009)', () => {
  beforeEach(() => clearProtocolRules());

  it('registers rules and exposes them', () => {
    registerProtocolRules([ruleA, ruleB]);
    expect(getRegisteredRules().map(r => r.id)).toEqual(['no-stop-before-start', 'boot-before-core']);
  });

  it('does not register a duplicate rule id', () => {
    registerProtocolRules([ruleA]);
    registerProtocolRules([ruleA]);
    expect(getRegisteredRules()).toHaveLength(1);
  });

  it('does NOT execute rules in Phase 1 (registration only)', () => {
    let called = false;
    registerProtocolRules([{ id: 'spy', check: () => { called = true; return []; } }]);
    // Nothing in Phase 1 invokes check(); registration must not call it.
    expect(called).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/protocolValidator.test.ts`
Expected: FAIL — cannot resolve `protocolValidator`.

- [ ] **Step 3: Write the implementation**

`src/services/validation/protocolValidator.ts`:

```ts
import type { ProtocolRule } from './types';

/**
 * L4 protocol/state validation extension point (Phase 2 — §9).
 * Phase 1 reserves the interface and registry so rules can plug in later
 * WITHOUT changing L1–L3. Registered rules are NOT executed in Phase 1.
 */
const registry: ProtocolRule[] = [];

export function registerProtocolRules(rules: ProtocolRule[]): void {
  for (const rule of rules) {
    if (!registry.some(r => r.id === rule.id)) registry.push(rule);
  }
}

export function getRegisteredRules(): readonly ProtocolRule[] {
  return registry;
}

export function clearProtocolRules(): void {
  registry.length = 0;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/protocolValidator.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/services/validation/protocolValidator.ts tests/unit/protocolValidator.test.ts
git commit -m "feat(validation): protocolValidator L4 extension point stub (VAL-009)"
```

---

### Task 6: validateBatch + public barrel (VAL-007, VAL-001, VAL-008)

**Files:**
- Create: `src/services/validation/validateBatch.ts`
- Create: `src/services/validation/index.ts`
- Test: `tests/unit/validateBatch.test.ts`

- [ ] **Step 1: Write the failing test**

`tests/unit/validateBatch.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { validateBatch } from '../../src/services/validation/index';

const bootCall = [2, 'uid-1', 'BootNotification', { chargePointVendor: 'Ador', chargePointModel: 'DC-60' }];
const bootResult = [3, 'uid-1', { status: 'Accepted', currentTime: '2026-06-13T10:00:00Z', interval: 300 }];
const heartbeatCallNoResponse = [2, 'uid-2', 'Heartbeat', {}];

describe('validateBatch — end-to-end report (VAL-007)', () => {
  it('produces messages, exchanges, and an accurate summary', () => {
    const report = validateBatch([
      { frame: bootCall, ts: '2026-06-13T10:00:00.000Z' },
      { frame: bootResult, ts: '2026-06-13T10:00:00.200Z' },
      { frame: heartbeatCallNoResponse },
    ]);

    expect(report.messages).toHaveLength(3);
    expect(report.summary.total).toBe(3);
    expect(report.summary.valid).toBe(3);
    expect(report.summary.invalid).toBe(0);

    // One matched exchange (Boot) + one orphan call (Heartbeat).
    expect(report.exchanges).toHaveLength(2);
    expect(report.summary.orphanCalls).toBe(1);
    expect(report.summary.orphanResponses).toBe(0);
    expect(report.summary.avgLatencyMs).toBe(200);
  });

  it('counts invalid messages in the summary', () => {
    const report = validateBatch([
      { frame: [2, 'bad', 'BootNotification', { chargePointVendor: 'Ador' }] }, // missing model
    ]);
    expect(report.summary.invalid).toBe(1);
    expect(report.summary.valid).toBe(0);
  });

  it('avgLatencyMs is null when no exchange has both timestamps', () => {
    const report = validateBatch([{ frame: heartbeatCallNoResponse }]);
    expect(report.summary.avgLatencyMs).toBeNull();
  });
});

describe('public barrel (VAL-008 isomorphic surface)', () => {
  it('re-exports the full public API', async () => {
    const api = await import('../../src/services/validation/index');
    expect(typeof api.validateMessage).toBe('function');
    expect(typeof api.ExchangeTracker).toBe('function');
    expect(typeof api.validateBatch).toBe('function');
    expect(typeof api.registerProtocolRules).toBe('function');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/validateBatch.test.ts`
Expected: FAIL — `index` / `validateBatch` not found.

- [ ] **Step 3: Write `src/services/validation/validateBatch.ts`**

```ts
import { ExchangeTracker } from './exchangeTracker';
import type { RawFrame, MessageResult, ValidationReport } from './types';

/**
 * Convenience: run the full L1–L3 pipeline over a stream of frames and return
 * the complete report. Deterministic and side-effect-free (VAL-010).
 */
export function validateBatch(frames: { frame: RawFrame; ts?: string }[]): ValidationReport {
  const tracker = new ExchangeTracker();
  const messages: MessageResult[] = [];

  for (const { frame, ts } of frames) {
    messages.push(tracker.add(frame, ts));
  }
  const exchanges = tracker.finalize();

  const valid = messages.filter(m => m.ok).length;
  const orphanCalls = exchanges.filter(e => e.status === 'orphan-call').length;
  const orphanResponses = exchanges.filter(e => e.status === 'orphan-response').length;

  const latencies = exchanges
    .map(e => e.latencyMs)
    .filter((n): n is number => typeof n === 'number');
  const avgLatencyMs = latencies.length > 0
    ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length)
    : null;

  return {
    messages,
    exchanges,
    summary: {
      total: messages.length,
      valid,
      invalid: messages.length - valid,
      orphanCalls,
      orphanResponses,
      avgLatencyMs,
    },
  };
}
```

- [ ] **Step 4: Write `src/services/validation/index.ts`**

```ts
// Public surface of @ador/ocpp-validation — the only module consumers import.
export { validateMessage } from './messageValidator';
export { ExchangeTracker } from './exchangeTracker';
export { validateBatch } from './validateBatch';
export {
  registerProtocolRules,
  getRegisteredRules,
  clearProtocolRules,
} from './protocolValidator';
export type {
  RawFrame,
  MessageKind,
  ViolationLayer,
  Violation,
  MessageResult,
  ExchangeStatus,
  ExchangeResult,
  ValidationReport,
  ProtocolContext,
  ProtocolRule,
} from './types';
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run tests/unit/validateBatch.test.ts`
Expected: PASS.

- [ ] **Step 6: Run the full suite + typecheck**

Run: `npm test && npm run typecheck`
Expected: all unit tests PASS; `tsc --noEmit` clean.

- [ ] **Step 7: Commit**

```bash
git add src/services/validation/validateBatch.ts src/services/validation/index.ts tests/unit/validateBatch.test.ts
git commit -m "feat(validation): validateBatch convenience + public barrel (VAL-007/008)"
```

---

### Task 7: Schema drift-check integration test (spec §6, §10)

**Files:**
- Create: `tests/integration/schema-drift.test.ts`

**Verified facts (from introspection, do not re-derive):** local dir `src/schemas/ocpp-1.6/` holds exactly 56 files named `Authorize.json` (request) and `AuthorizeResponse.json` (response). typed-ocpp `OCPP16.schemas` has exactly 56 keys named `AuthorizeRequest` / `AuthorizeResponse`. Mapping: a request file `X.json` ↔ key `XRequest`; a response file `XResponse.json` ↔ key `XResponse`.

- [ ] **Step 1: Write the test**

`tests/integration/schema-drift.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { OCPP16 } from 'typed-ocpp';

const localDir = fileURLToPath(new URL('../../src/schemas/ocpp-1.6', import.meta.url));

/** Local file basename → typed-ocpp schema key. */
function fileToKey(file: string): string {
  const base = file.replace(/\.json$/, '');
  return base.endsWith('Response') ? base : `${base}Request`;
}

describe('schema drift — local 56 .json vs typed-ocpp bundled (spec §6/§10)', () => {
  const localKeys = readdirSync(localDir)
    .filter(f => f.endsWith('.json'))
    .map(fileToKey)
    .sort();
  const libKeys = Object.keys(OCPP16.schemas).sort();

  it('both sources expose exactly 56 schemas', () => {
    expect(localKeys).toHaveLength(56);
    expect(libKeys).toHaveLength(56);
  });

  it('the local reference set matches the typed-ocpp runtime set (no drift)', () => {
    const onlyLocal = localKeys.filter(k => !libKeys.includes(k));
    const onlyLib = libKeys.filter(k => !localKeys.includes(k));
    expect({ onlyLocal, onlyLib }).toEqual({ onlyLocal: [], onlyLib: [] });
  });
});
```

- [ ] **Step 2: Run test to verify it passes**

Run: `npx vitest run tests/integration/schema-drift.test.ts`
Expected: PASS — both sets are 56 and identical after mapping. (If it ever FAILS in future, that is the drift alarm doing its job: a schema was added/removed/renamed on one side.)

- [ ] **Step 3: Commit**

```bash
git add tests/integration/schema-drift.test.ts
git rm -f --ignore-unmatch tests/integration/.gitkeep
git commit -m "test(validation): schema drift-check — 56 local .json vs typed-ocpp bundled (§6/§10)"
```

---

### Task 8: Build, browser-bundle smoke, and workflow update

**Files:**
- Modify: `.gitignore` (ensure `dist/` and `node_modules/` ignored)
- Modify: `skills/WORKFLOW.md` (mark validation-engine Build phase active)

- [ ] **Step 1: Ensure build artifacts are git-ignored**

Check `.gitignore` contains `node_modules/` and `dist/`. If `dist/` is absent, add it:

```
dist/
```

Run: `git check-ignore dist node_modules`
Expected: both paths echoed (both ignored).

- [ ] **Step 2: Build the package (ESM + CJS + types)**

Run: `npm run build`
Expected: tsup emits `dist/index.js`, `dist/index.cjs`, `dist/index.d.ts` with no errors.

- [ ] **Step 3: Browser-bundle smoke (confirms the isomorphic claim end-to-end)**

Run: `npm run bundle:browser`
Expected: esbuild writes `dist/browser/ocpp-validation.js`, **0 errors / 0 warnings** — matching the spike result (no Node built-ins to polyfill). This is the same `--platform=browser` gate the spike passed; it must stay green now that the engine is real code.

- [ ] **Step 4: Full green check**

Run: `npm test && npm run typecheck && npm run build`
Expected: all tests PASS, typecheck clean, build succeeds.

- [ ] **Step 5: Update `skills/WORKFLOW.md`**

Replace the placeholder feature block with the validation-engine entry. Set Think + Plan to Complete, Build to Active, with these exact rows:

```markdown
## Feature: OCPP Validation Engine (L1–L3)  |  Started: 2026-06-13

| Phase   | Skill(s)                                  | Status      | Date       |
|---------|-------------------------------------------|-------------|------------|
| Think   | /office-hours, /spec                      | ✅ Complete | 2026-06-06 |
| Plan    | /plan-eng-review                          | ✅ Complete | 2026-06-13 |
| Build   | /build-complete (checkpoint, not impl.)   | ⏳ Active   |            |
| Review  | /review + /cso                            | ⬜ Pending  |            |
| Test    | /qa                                       | ⬜ Pending  |            |
| Ship    | /ship + /document-release + /canary       | ⬜ Pending  |            |
| Reflect | /retro + /learn                           | ⬜ Pending  |            |

### Key outputs
- **Think:** `docs/TYPEVALIDATION.md` (spec), spike `scratchpad/spike-typed-ocpp/FINDINGS.md`
- **Plan:** `docs/superpowers/plans/2026-06-13-validation-engine-phase1.md`
- **Build:** branch `feat/validation-engine`; engine in `src/services/validation/`
```

- [ ] **Step 6: Commit**

```bash
git add .gitignore skills/WORKFLOW.md
git commit -m "chore(validation): build config green + mark Build phase active in WORKFLOW"
```

---

## Spec coverage check (self-review)

| Spec requirement | Covered by |
|---|---|
| VAL-001 accepts extracted array, no parsing | `validateMessage` / `validateBatch` take `RawFrame`; no fs/parse code (Task 3, 6) |
| VAL-002 frame structure, FRAME_INVALID | `messageValidator` structural checks (Task 3) |
| VAL-003 schema, SCHEMA_VIOLATION + path | `messageValidator` L2 via typed-ocpp Ajv errors (Task 3) |
| VAL-004 pair + RESULT_MISMATCH | `ExchangeTracker.resolvePair` + checkCallResult (Task 4) |
| VAL-005 orphans | orphan-call / orphan-response in `finalize` (Task 4) |
| VAL-006 latency/RTT + average | `computeLatency` + `validateBatch` avg (Task 4, 6) |
| VAL-007 consumer-agnostic ValidationReport | `validateBatch` → `ValidationReport`, no UI (Task 6) |
| VAL-008 isomorphic | tsup ESM+CJS + esbuild browser smoke (Task 1, 8) |
| VAL-009 L4 extension point, not implemented | `protocolValidator` register-only, not executed (Task 5) |
| VAL-010 deterministic, side-effect-free | pure functions, no network/disk at runtime (Task 6) |
| §6/§10 schema drift-check | `schema-drift.test.ts` (Task 7) |

**Deferred to Phase 2 (out of scope here, by design):** L4 rule execution and the rule catalog (§9); exhaustive per-action valid/invalid fixtures for all 56 message types (Phase 1 covers the behavioural matrix + full 56-schema coverage via the drift test); vendoring of typed-ocpp (§11 — npm-pinned now, vendoring is the documented insurance step).

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-06-13-validation-engine-phase1.md`. Two execution options:

**1. Subagent-Driven (recommended)** — dispatch a fresh subagent per task, review between tasks, fast iteration.

**2. Inline Execution** — execute tasks in this session via executing-plans, batch execution with checkpoints.

Which approach?
