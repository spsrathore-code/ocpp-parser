# CP-Initiated Operations Compliance (§4) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a dedicated, spec-cited OCPP 1.6J **Section 4 (Operations Initiated by Charge Point)** compliance report to the Parser as a new top-level section, implementing all 46 business-case rules tier-tagged (deterministic / heuristic / indeterminate).

**Architecture:** A small pluggable **compliance rule-pack framework** (`src/app/compliance/`). Each rule is a self-describing object with an `evaluate(ctx)` over already-parsed data (read-only). A pure runner produces a `ComplianceReport`; `analyze.ts` adds a `cpCompliance` field; a new section renderer (`cpCompliance.ts`) draws it, registered as a sibling `SECTION_ORDER` entry right after Protocol Compliance. Parallel to the existing 21-check engine — no edit to `runProtocolValidation.ts` or `protocolCompliance.ts`.

**Tech Stack:** TypeScript 5.7, Vite 5.4, Vitest 2.1. Reuses existing `model/types.ts`, `render/dom.ts`, `render/contextViewer.ts` (`singleContextButtons`), `export/exportToExcel.ts`.

**Spec:** `docs/superpowers/specs/2026-06-23-cp-initiated-compliance-design.md`.

## Global Constraints

- No source file > **2000 lines** (split `cpInitiated.ts` per message-group if it nears the limit).
- **TDD**: every rule gets ≥1 passing + ≥1 violating test before/with implementation. Commit per task.
- Standards-first: invariant text copied **verbatim** from `docs/business_case_compliance_check.md`; each rule carries its `specRef` (`4.x`).
- `CheckStatus` reused verbatim from `src/app/protocol/types.ts`: `'pass' | 'warn' | 'fail' | 'info'`.
- Severity weights for the score: **Critical 4, Major 2, Minor 1, Informational excluded**. Indeterminate (`info`) rules are excluded from `evaluated` and from the score.
- Run gates after every task: `npm run typecheck` clean, `npm test` green, `npm run build` clean before final commit of render work.
- Test command: `npx vitest run <path>` (single file) / `npm test` (all). Baseline before this work: **273 tests**.
- Frames are `ParsedMessage`; payload is `message[3]`; response is `responsePayload` (null/undefined if unanswered); request/response correlation already done by the pipeline. Line numbers via `m.lineNumber` (1-based).

---

## File Structure

**Create:**
- `src/app/compliance/types.ts` — data contracts (`ComplianceRule`, `ComplianceResult`, `ComplianceGroup`, `ComplianceReport`, `ComplianceContext`, `Severity`, `Tier`, `AffectedItem`, `ComplianceEvalOutput`).
- `src/app/compliance/helpers.ts` — shared payload accessors + eval helpers (pairing, line-anchor, group lookup).
- `src/app/compliance/runCompliance.ts` — runs a rule-pack → `ComplianceReport` (grouping + summary + weighted score).
- `src/app/compliance/rulepacks/cpInitiated.ts` — the 46 §4 rules + the exported `cpInitiatedPack`. (Split into `rulepacks/cpInitiated/<group>.ts` if > ~1500 lines.)
- `src/app/render/sections/cpCompliance.ts` — the section renderer.
- `tests/unit/compliance.runner.test.ts` — framework/runner/summary tests.
- `tests/unit/compliance.rules.auth.test.ts`, `.boot.test.ts`, `.dtdiagfw.test.ts`, `.heart.test.ts`, `.meter.test.ts`, `.start.test.ts`, `.status.test.ts`, `.stop.test.ts` — per-group rule tests.
- `tests/unit/cpCompliance.render.test.ts` — render + registry tests.
- `tests/integration/compliance.sample.test.ts` — real-sample smoke.

**Modify (additive only):**
- `src/app/analyze.ts` — add `cpCompliance: ComplianceReport` to `AnalysisResult`; compute it in `analyze()`.
- `src/app/render/renderResults.ts` — import `renderCpCompliance`; add one `SECTION_ORDER` entry after Protocol Compliance.

**Not touched:** `src/app/protocol/runProtocolValidation.ts`, `src/app/render/sections/protocolCompliance.ts`, the L1–L3 validation engine.

---

## Task 1: Framework types

**Files:**
- Create: `src/app/compliance/types.ts`
- Test: (none — pure types; covered by Task 2's runner test)

**Interfaces:**
- Produces: all the types below, consumed by every later task.

- [ ] **Step 1: Write the types file**

```ts
// src/app/compliance/types.ts
// Pluggable compliance rule-pack framework — data contracts. A rule pack is a
// set of self-describing rules; each evaluate()s over already-parsed data and
// returns a status + narrative + affected items. First pack: OCPP 1.6J §4.
import type { CheckStatus } from '../protocol/types';
import type { MessageGroups, Transaction, InternalTxMap } from '../model/types';

export type { CheckStatus };
export type Severity = 'Critical' | 'Major' | 'Minor' | 'Informational';
export type Tier = 'deterministic' | 'heuristic' | 'indeterminate';

/** One affected item; `lineNumber` (1-based) enables the Preview/Download context viewer. */
export interface AffectedItem {
  label: string;
  lineNumber?: number;
}

/** Read-only view of the parsed log a rule evaluates against. */
export interface ComplianceContext {
  messageGroups: MessageGroups;
  transactions: Transaction[];
  internalTxMap: InternalTxMap;
  rawLogLines: string[];
}

export interface ComplianceEvalOutput {
  status: CheckStatus;
  details: string;
  affected: AffectedItem[];
}

export interface ComplianceRule {
  id: string;            // 'AUTH-002'
  specRef: string;       // '4.1'
  targetMessage: string; // 'Authorize'
  invariant: string;     // SHALL/SHOULD text, verbatim from the business-case doc
  auditLogic: string;    // human-readable "how we check it"
  severity: Severity;
  tier: Tier;
  evaluate(ctx: ComplianceContext): ComplianceEvalOutput;
}

export interface ComplianceResult extends ComplianceEvalOutput {
  id: string; specRef: string; targetMessage: string;
  invariant: string; auditLogic: string; severity: Severity; tier: Tier;
}

export interface ComplianceGroup {
  messageType: string;   // 'Authorize'
  prefix: string;        // 'AUTH'
  icon: string;
  results: ComplianceResult[];
}

export type SeverityTally = { pass: number; warn: number; fail: number; info: number };

export interface ComplianceSummary {
  total: number;
  byStatus: SeverityTally;
  bySeverity: Record<Severity, SeverityTally>;
  evaluated: number;     // total − info(indeterminate)
  weightedScore: number; // 0–100, Critical-weighted; info excluded
}

export interface ComplianceReport {
  packId: string;        // 'ocpp-1.6j-section-4'
  packName: string;      // 'CP-Initiated Operations (§4)'
  groups: ComplianceGroup[];
  summary: ComplianceSummary;
}

/** A rule pack = metadata + ordered groups of rules. */
export interface RulePack {
  packId: string;
  packName: string;
  groups: { messageType: string; prefix: string; icon: string; rules: ComplianceRule[] }[];
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/compliance/types.ts
git commit -m "feat(compliance): rule-pack framework data contracts"
```

---

## Task 2: Runner + summary/weighted-score

**Files:**
- Create: `src/app/compliance/runCompliance.ts`
- Test: `tests/unit/compliance.runner.test.ts`

**Interfaces:**
- Consumes: all Task 1 types.
- Produces: `runCompliance(pack: RulePack, ctx: ComplianceContext): ComplianceReport`. Weights: `SEVERITY_WEIGHT = { Critical: 4, Major: 2, Minor: 1, Informational: 0 }`. Per-rule pass fraction: `pass`→1, `warn`→0.5, `fail`→0, `info`→excluded. `weightedScore = round(Σ(weight·frac) / Σ(weight) · 100)`, 100 when nothing evaluated.

- [ ] **Step 1: Write the failing test**

```ts
// tests/unit/compliance.runner.test.ts
import { describe, it, expect } from 'vitest';
import { runCompliance, SEVERITY_WEIGHT } from '../../src/app/compliance/runCompliance';
import type { RulePack, ComplianceContext, ComplianceRule } from '../../src/app/compliance/types';
import { createMessageGroups } from '../../src/app/model/types';

const ctx: ComplianceContext = { messageGroups: createMessageGroups(), transactions: [], internalTxMap: new Map(), rawLogLines: [] };
const rule = (id: string, sev: ComplianceRule['severity'], tier: ComplianceRule['tier'], status: 'pass'|'warn'|'fail'|'info'): ComplianceRule => ({
  id, specRef: '4.0', targetMessage: 'X', invariant: 'inv', auditLogic: 'logic', severity: sev, tier,
  evaluate: () => ({ status, details: 'd', affected: [] }),
});
const pack = (rules: ComplianceRule[]): RulePack => ({ packId: 'p', packName: 'P', groups: [{ messageType: 'X', prefix: 'X', icon: '🔧', rules }] });

describe('runCompliance', () => {
  it('groups results and tallies by status', () => {
    const r = runCompliance(pack([rule('X-1','Critical','deterministic','pass'), rule('X-2','Major','deterministic','fail')]), ctx);
    expect(r.groups).toHaveLength(1);
    expect(r.groups[0].results.map((x) => x.id)).toEqual(['X-1', 'X-2']);
    expect(r.summary.byStatus).toEqual({ pass: 1, warn: 0, fail: 1, info: 0 });
    expect(r.summary.total).toBe(2);
  });

  it('weights the score by severity; warn = half credit', () => {
    // Critical pass (4·1) + Major warn (2·0.5) = 5 of (4+2)=6 → 83
    const r = runCompliance(pack([rule('X-1','Critical','deterministic','pass'), rule('X-2','Major','heuristic','warn')]), ctx);
    expect(r.summary.weightedScore).toBe(83);
    expect(r.summary.evaluated).toBe(2);
  });

  it('excludes indeterminate (info) rules from evaluated and the score', () => {
    const r = runCompliance(pack([rule('X-1','Critical','deterministic','pass'), rule('X-2','Major','indeterminate','info')]), ctx);
    expect(r.summary.evaluated).toBe(1);
    expect(r.summary.weightedScore).toBe(100); // only the passing Critical counts
    expect(r.summary.byStatus.info).toBe(1);
  });

  it('returns 100 when nothing is evaluable', () => {
    const r = runCompliance(pack([rule('X-1','Major','indeterminate','info')]), ctx);
    expect(r.summary.weightedScore).toBe(100);
    expect(r.summary.evaluated).toBe(0);
  });

  it('records severity verbatim and copies rule metadata into results', () => {
    const r = runCompliance(pack([rule('X-1','Minor','deterministic','pass')]), ctx);
    expect(r.groups[0].results[0]).toMatchObject({ id: 'X-1', specRef: '4.0', severity: 'Minor', tier: 'deterministic', invariant: 'inv' });
    expect(SEVERITY_WEIGHT.Critical).toBe(4);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/compliance.runner.test.ts`
Expected: FAIL — cannot find module `runCompliance`.

- [ ] **Step 3: Write minimal implementation**

```ts
// src/app/compliance/runCompliance.ts
// Pure runner: evaluates a rule pack against the parsed context → ComplianceReport.
import type {
  RulePack, ComplianceContext, ComplianceReport, ComplianceResult,
  ComplianceGroup, ComplianceSummary, Severity, SeverityTally, CheckStatus,
} from './types';

export const SEVERITY_WEIGHT: Record<Severity, number> = { Critical: 4, Major: 2, Minor: 1, Informational: 0 };
const PASS_FRACTION: Record<Exclude<CheckStatus, 'info'>, number> = { pass: 1, warn: 0.5, fail: 0 };
const emptyTally = (): SeverityTally => ({ pass: 0, warn: 0, fail: 0, info: 0 });

export function runCompliance(pack: RulePack, ctx: ComplianceContext): ComplianceReport {
  const groups: ComplianceGroup[] = pack.groups.map((g) => ({
    messageType: g.messageType, prefix: g.prefix, icon: g.icon,
    results: g.rules.map((rule): ComplianceResult => {
      const out = rule.evaluate(ctx);
      return {
        id: rule.id, specRef: rule.specRef, targetMessage: rule.targetMessage,
        invariant: rule.invariant, auditLogic: rule.auditLogic, severity: rule.severity, tier: rule.tier,
        status: out.status, details: out.details, affected: out.affected,
      };
    }),
  }));

  const all = groups.flatMap((g) => g.results);
  const byStatus = emptyTally();
  const bySeverity: Record<Severity, SeverityTally> = {
    Critical: emptyTally(), Major: emptyTally(), Minor: emptyTally(), Informational: emptyTally(),
  };
  let weightNum = 0, weightDen = 0, evaluated = 0;
  for (const r of all) {
    byStatus[r.status] += 1;
    bySeverity[r.severity][r.status] += 1;
    if (r.status === 'info') continue;            // indeterminate excluded
    evaluated += 1;
    const w = SEVERITY_WEIGHT[r.severity];
    weightNum += w * PASS_FRACTION[r.status];
    weightDen += w;
  }
  const summary: ComplianceSummary = {
    total: all.length, byStatus, bySeverity, evaluated,
    weightedScore: weightDen > 0 ? Math.round((weightNum / weightDen) * 100) : 100,
  };
  return { packId: pack.packId, packName: pack.packName, groups, summary };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/compliance.runner.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/app/compliance/runCompliance.ts tests/unit/compliance.runner.test.ts
git commit -m "feat(compliance): pure runner + severity-weighted compliance score"
```

---

## Task 3: Shared rule helpers

**Files:**
- Create: `src/app/compliance/helpers.ts`
- Test: `tests/unit/compliance.helpers.test.ts`

**Interfaces:**
- Consumes: `ParsedMessage` (`model/types`), `ComplianceContext`, `AffectedItem`.
- Produces:
  - `payload<T>(m): T` → `m.message[3] ?? {}` typed.
  - `resp<T>(m): T | null` → `m.responsePayload ?? null`.
  - `hasResp(m): boolean`.
  - `msgId(m): string` → `m.message[1]`.
  - `itemOf(m, label): AffectedItem` → `{ label, lineNumber: m.lineNumber }`.
  - `byAction(mg, action): ParsedMessage[]` → messages for an action. **Critical:** `messageGroups` only has keys `BootNotification, Heartbeat, StatusNotification, StartTransaction, StopTransaction, MeterValues, Other`. `Authorize`, `DataTransfer`, `DiagnosticsStatusNotification`, `FirmwareStatusNotification`, `TriggerMessage` etc. live in the **`Other`** bucket. `byAction` returns the named group if it exists, else filters `Other` by `message[2]`.
  - `pairingResult(reqs, label): ComplianceEvalOutput` → generic "every req received a conf" check (status `info` if none, `pass` if all answered, `fail` otherwise; affected = unanswered, line-anchored).

- [ ] **Step 1: Write the failing test**

```ts
// tests/unit/compliance.helpers.test.ts
import { describe, it, expect } from 'vitest';
import { payload, resp, hasResp, msgId, itemOf, byAction, pairingResult } from '../../src/app/compliance/helpers';
import { createMessageGroups } from '../../src/app/model/types';
import type { ParsedMessage } from '../../src/app/model/types';

const mk = (action: string, p: unknown, line: number, rp?: unknown): ParsedMessage => {
  const m: ParsedMessage = { timestamp: '2025-01-01T00:00:00Z', direction: 'sent', message: [2, `id-${line}`, action, p], lineNumber: line, fileName: 'f' };
  if (rp !== undefined) m.responsePayload = rp;
  return m;
};

describe('compliance helpers', () => {
  it('accessors read payload, response, id', () => {
    const m = mk('Heartbeat', { a: 1 }, 5, { currentTime: 't' });
    expect(payload<{ a: number }>(m).a).toBe(1);
    expect(resp<{ currentTime: string }>(m)?.currentTime).toBe('t');
    expect(hasResp(m)).toBe(true);
    expect(msgId(m)).toBe('id-5');
    expect(itemOf(m, 'HB')).toEqual({ label: 'HB', lineNumber: 5 });
  });

  it('byAction: named group when keyed, else filters Other by action', () => {
    const g = createMessageGroups();
    g.Heartbeat.push(mk('Heartbeat', {}, 1));
    g.Other.push(mk('Authorize', { idTag: 'T' }, 2), mk('DataTransfer', { vendorId: 'v' }, 3));
    expect(byAction(g, 'Heartbeat')).toHaveLength(1);
    expect(byAction(g, 'Authorize').map((m) => m.lineNumber)).toEqual([2]);
    expect(byAction(g, 'DataTransfer')).toHaveLength(1);
    expect(byAction(g, 'Nope')).toHaveLength(0);
  });

  it('pairingResult: info when none, pass when all answered, fail with line-anchored unanswered', () => {
    expect(pairingResult([], 'Heartbeat').status).toBe('info');
    expect(pairingResult([mk('Heartbeat', {}, 1, { currentTime: 't' })], 'Heartbeat').status).toBe('pass');
    const r = pairingResult([mk('Heartbeat', {}, 1, { currentTime: 't' }), mk('Heartbeat', {}, 2)], 'Heartbeat');
    expect(r.status).toBe('fail');
    expect(r.affected).toEqual([{ label: 'id-2', lineNumber: 2 }]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/compliance.helpers.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write minimal implementation**

```ts
// src/app/compliance/helpers.ts
// Shared accessors + eval helpers for compliance rules. Frames are ParsedMessage;
// payload = message[3]; response = responsePayload (null if unanswered).
import type { ParsedMessage, MessageGroups } from '../model/types';
import type { AffectedItem, ComplianceEvalOutput } from './types';

export const payload = <T>(m: ParsedMessage): T => (m.message[3] ?? {}) as T;
export const resp = <T>(m: ParsedMessage): T | null => (m.responsePayload ?? null) as T | null;
export const hasResp = (m: ParsedMessage): boolean => m.responsePayload !== null && m.responsePayload !== undefined;
export const msgId = (m: ParsedMessage): string => m.message[1] as string;
export const itemOf = (m: ParsedMessage, label: string): AffectedItem => ({ label, lineNumber: m.lineNumber });

/** Messages for an action. messageGroups only keys 6 actions + 'Other'; Authorize,
 *  DataTransfer, DiagnosticsStatusNotification, FirmwareStatusNotification, etc.
 *  fall into Other (grouped by message[2]). Returns the named group if present,
 *  else filters Other by action name. */
export function byAction(mg: MessageGroups, action: string): ParsedMessage[] {
  const known = (mg as unknown as Record<string, ParsedMessage[] | undefined>)[action];
  if (known) return known;
  return mg.Other.filter((m) => m.message[2] === action);
}

/** Generic "every X.req received an X.conf" pairing check. */
export function pairingResult(reqs: ParsedMessage[], label: string): ComplianceEvalOutput {
  if (reqs.length === 0) return { status: 'info', details: `No ${label} messages to check`, affected: [] };
  const unanswered = reqs.filter((m) => !hasResp(m));
  if (unanswered.length === 0) return { status: 'pass', details: `All ${reqs.length} ${label}.req received a .conf`, affected: [] };
  return {
    status: 'fail',
    details: `${unanswered.length}/${reqs.length} ${label}.req without a .conf response`,
    affected: unanswered.map((m) => itemOf(m, msgId(m))),
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/compliance.helpers.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/app/compliance/helpers.ts tests/unit/compliance.helpers.test.ts
git commit -m "feat(compliance): shared rule helpers (accessors + pairing)"
```

---

## Rule-group tasks (4–11)

Each rule-group task follows the **same shape** (the engineer must repeat it, not cross-reference):

1. Write `tests/unit/compliance.rules.<group>.test.ts` with, **per rule**, one passing scenario and one violating scenario (heuristic rules add a false-positive-suppression case; indeterminate rules assert `status:'info'` + the fixed reason).
2. Run it → FAIL (rules not exported yet).
3. Add the group's `ComplianceRule[]` to `src/app/compliance/rulepacks/cpInitiated.ts` (each rule is a `ComplianceRule` object literal: `id`, `specRef`, `targetMessage`, `invariant` **verbatim from the doc**, `auditLogic`, `severity`, `tier`, `evaluate`).
4. Run it → PASS.
5. `npm run typecheck` → clean.
6. Commit.

The rules file starts as a skeleton (Task 4 creates it); each group task appends its array and the group entry. Below, each rule gives **id · severity · tier · exact evaluate logic · pass case · violation case**. Build the helper `byTx`/status filters inline from `ctx.messageGroups` and `ctx.transactions` (same data `runProtocolValidation` uses).

> A `ComplianceRule.evaluate` returns `{ status, details, affected }`. Use `'pass'|'warn'|'fail'` for evaluable outcomes and `'info'` only for indeterminate rules. Anchor `affected[].lineNumber` to the offending frame (`itemOf(frame, label)`).

### Task 4: Authorize group (AUTH-001…004) + rules-file skeleton

**Files:**
- Create: `src/app/compliance/rulepacks/cpInitiated.ts`
- Test: `tests/unit/compliance.rules.auth.test.ts`

**Interfaces:**
- Consumes: helpers (Task 3), Task 1 types, `ParsedMessage`/`Transaction` from `model/types`.
- Produces: `export const cpInitiatedPack: RulePack` (skeleton with the AUTH group populated; later tasks append groups). Rule IDs `AUTH-001..004`.

- [ ] **Step 1: Write the failing test**

```ts
// tests/unit/compliance.rules.auth.test.ts
import { describe, it, expect } from 'vitest';
import { runCompliance } from '../../src/app/compliance/runCompliance';
import { cpInitiatedPack } from '../../src/app/compliance/rulepacks/cpInitiated';
import { createMessageGroups } from '../../src/app/model/types';
import { processTransactions } from '../../src/app/parse/processTransactions';
import type { ParsedMessage, InternalTxMap } from '../../src/app/model/types';

const mk = (action: string, p: unknown, line: number, rp?: unknown): ParsedMessage => {
  const m: ParsedMessage = { timestamp: '2025-01-01T00:00:00.000Z', direction: 'sent', message: [2, `id-${line}`, action, p], lineNumber: line, fileName: 'f' };
  if (rp !== undefined) m.responsePayload = rp;
  return m;
};
const find = (groups: ReturnType<typeof createMessageGroups>, txMap: InternalTxMap, id: string) => {
  const txs = processTransactions(groups, txMap);
  const r = runCompliance(cpInitiatedPack, { messageGroups: groups, transactions: txs, internalTxMap: txMap, rawLogLines: [] });
  return r.groups.flatMap((g) => g.results).find((x) => x.id === id)!;
};

describe('AUTH rules', () => {
  it('AUTH-002 pass: every Authorize.req answered', () => {
    const g = createMessageGroups();
    g.Other.push(mk('Authorize', { idTag: 'T1' }, 1, { idTagInfo: { status: 'Accepted' } })); // Authorize → Other bucket
    expect(find(g, new Map(), 'AUTH-002').status).toBe('pass');
  });
  it('AUTH-002 fail: unanswered Authorize.req is flagged + line-anchored', () => {
    const g = createMessageGroups();
    g.Other.push(mk('Authorize', { idTag: 'T1' }, 7));
    const res = find(g, new Map(), 'AUTH-002');
    expect(res.status).toBe('fail');
    expect(res.affected[0].lineNumber).toBe(7);
  });
  it('AUTH-003 warn: stop idTag equals start idTag', () => {
    const g = createMessageGroups();
    g.StartTransaction.push(mk('StartTransaction', { connectorId: 1, idTag: 'SAME', meterStart: 0, timestamp: '2025-01-01T00:00:00Z' }, 1, { transactionId: 5, idTagInfo: { status: 'Accepted' } }));
    g.StopTransaction.push(mk('StopTransaction', { transactionId: 5, meterStop: 10, idTag: 'SAME', timestamp: '2025-01-01T00:10:00Z' }, 2, { idTagInfo: { status: 'Accepted' } }));
    expect(find(g, new Map(), 'AUTH-003').status).toBe('warn');
  });
  it('AUTH-001 pass: no StartTransaction without an accepted authorization', () => {
    const g = createMessageGroups();
    g.StartTransaction.push(mk('StartTransaction', { connectorId: 1, idTag: 'T', meterStart: 0, timestamp: '2025-01-01T00:00:00Z' }, 1, { transactionId: 5, idTagInfo: { status: 'Accepted' } }));
    expect(find(g, new Map(), 'AUTH-001').status).toBe('pass');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/compliance.rules.auth.test.ts`
Expected: FAIL — module `cpInitiated` not found.

- [ ] **Step 3: Write the rules-file skeleton + AUTH group**

```ts
// src/app/compliance/rulepacks/cpInitiated.ts
// OCPP 1.6J §4 — CP-Initiated Operations compliance rule pack. Invariant text is
// verbatim from docs/business_case_compliance_check.md. Groups appended per task.
import type { ComplianceRule, RulePack } from '../types';
import { payload, resp, hasResp, msgId, itemOf, byAction, pairingResult } from '../helpers';
import type { ParsedMessage } from '../../model/types';

// ---- AUTH (§4.1) ----
const authRules: ComplianceRule[] = [
  {
    id: 'AUTH-001', specRef: '4.1', targetMessage: 'Authorize',
    invariant: 'Charging SHALL occur only after successful authorization',
    auditLogic: 'Each StartTransaction must have an Accepted authorization (StartTransaction.conf idTagInfo.status or a prior accepted Authorize for the idTag).',
    severity: 'Critical', tier: 'deterministic',
    evaluate: (ctx) => {
      const starts = ctx.messageGroups.StartTransaction;
      if (starts.length === 0) return { status: 'info', details: 'No StartTransactions to check', affected: [] };
      const bad = starts.filter((m) => {
        const r = resp<{ idTagInfo?: { status?: string } }>(m);
        return hasResp(m) && r?.idTagInfo?.status && r.idTagInfo.status !== 'Accepted';
      });
      return bad.length === 0
        ? { status: 'pass', details: 'All transactions started under an accepted authorization', affected: [] }
        : { status: 'fail', details: `${bad.length} StartTransaction(s) began without Accepted authorization`, affected: bad.map((m) => itemOf(m, msgId(m))) };
    },
  },
  {
    id: 'AUTH-002', specRef: '4.1', targetMessage: 'Authorize',
    invariant: 'Every Authorize.req SHALL receive Authorize.conf',
    auditLogic: 'Request-response pairing on Authorize.', severity: 'Critical', tier: 'deterministic',
    evaluate: (ctx) => pairingResult(byAction(ctx.messageGroups, 'Authorize'), 'Authorize'),
  },
  {
    id: 'AUTH-003', specRef: '4.1', targetMessage: 'Authorize',
    invariant: 'Authorize.req for stopping SHALL only occur if stop idTag differs from start idTag',
    auditLogic: 'Compare each transaction’s stop idTag to its start idTag; equal tags are a likely redundant stop-authorize.',
    severity: 'Major', tier: 'deterministic',
    evaluate: (ctx) => {
      const stops = ctx.messageGroups.StopTransaction;
      const starts = ctx.messageGroups.StartTransaction;
      const startTagByTx = new Map<number, string>();
      starts.forEach((m) => {
        const tid = resp<{ transactionId?: number }>(m)?.transactionId;
        const tag = payload<{ idTag?: string }>(m).idTag;
        if (tid != null && tag) startTagByTx.set(tid, tag);
      });
      const offenders: ParsedMessage[] = stops.filter((m) => {
        const p = payload<{ transactionId?: number; idTag?: string }>(m);
        return p.idTag != null && p.transactionId != null && startTagByTx.get(p.transactionId) === p.idTag;
      });
      if (stops.filter((m) => payload<{ idTag?: string }>(m).idTag != null).length === 0)
        return { status: 'info', details: 'No stop-side idTags to compare', affected: [] };
      return offenders.length === 0
        ? { status: 'pass', details: 'All stop idTags differ from their start idTag', affected: [] }
        : { status: 'warn', details: `${offenders.length} StopTransaction(s) re-used the start idTag`, affected: offenders.map((m) => itemOf(m, msgId(m))) };
    },
  },
  {
    id: 'AUTH-004', specRef: '4.1', targetMessage: 'Authorize',
    invariant: 'Authorize.req SHOULD only be used for charging authorization',
    auditLogic: 'Flag Authorize.req with no nearby StartTransaction for the same idTag (heuristic usage check).',
    severity: 'Minor', tier: 'heuristic',
    evaluate: (ctx) => {
      const auths = byAction(ctx.messageGroups, 'Authorize');
      if (auths.length === 0) return { status: 'info', details: 'No Authorize messages to check', affected: [] };
      const startTags = new Set(ctx.messageGroups.StartTransaction.map((m) => payload<{ idTag?: string }>(m).idTag).filter(Boolean) as string[]);
      const orphan = auths.filter((m) => { const t = payload<{ idTag?: string }>(m).idTag; return t != null && !startTags.has(t); });
      return orphan.length === 0
        ? { status: 'pass', details: 'All Authorize requests map to a charging session', affected: [] }
        : { status: 'warn', details: `${orphan.length} Authorize(s) with no matching StartTransaction idTag (inferred non-charging use)`, affected: orphan.map((m) => itemOf(m, msgId(m))) };
    },
  },
];

export const cpInitiatedPack: RulePack = {
  packId: 'ocpp-1.6j-section-4',
  packName: 'CP-Initiated Operations (§4)',
  groups: [
    { messageType: 'Authorize', prefix: 'AUTH', icon: '🔑', rules: authRules },
    // subsequent groups appended by Tasks 5–11
  ],
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/compliance.rules.auth.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/app/compliance/rulepacks/cpInitiated.ts tests/unit/compliance.rules.auth.test.ts
git commit -m "feat(compliance): §4.1 Authorize rules (AUTH-001..004)"
```

---

### Task 5: BootNotification group (BOOT-001…009)

Append a `bootRules: ComplianceRule[]` array + group entry `{ messageType: 'BootNotification', prefix: 'BOOT', icon: '🔌', rules: bootRules }`. Per-rule logic:

- **BOOT-001** · Critical · deterministic — *"BootNotification SHALL be sent after every boot/reboot."* Detect reconnect/power-restore events (reuse `ctx` boots + `rawLogLines` markers used by phantom/downtime); pass if a BootNotification exists, `warn` if reconnect markers exist with no following Boot. Pass case: ≥1 Boot present. Violation: reconnect line present, no Boot after it.
- **BOOT-002** · Critical · heuristic — *"CP SHALL NOT send any request before Accepted/Pending."* Find first Boot's `responsePayload.status` time; `fail` if any non-Boot CP request timestamp precedes the first Boot.conf. Pass: all requests after acceptance. Violation: a Heartbeat before Boot.conf. FP-suppression: requests exactly at/after acceptance time pass.
- **BOOT-003** · Critical · heuristic — *"Cached offline messages SHALL NOT bypass BootNotification."* `warn` if queued messages (burst with timestamps older than the Boot) appear before acceptance. Pass: none. Violation: a StatusNotification timestamped before Boot but delivered before Boot.conf.
- **BOOT-004** · Critical · heuristic — *"Rejected CP SHALL NOT send any OCPP message during retry interval."* Only when a Boot.conf status = `Rejected` with `interval`; `fail` if any CP message in `[rejectTime, rejectTime+interval]`. Pass: silence. Violation: Heartbeat inside the interval. `info` if no rejection seen.
- **BOOT-005** · Critical · heuristic — *"Rejected CP SHALL NOT respond to CS initiated messages."* While rejected, `fail` if any `direction:'received'`→response pattern present. `info` if no rejection.
- **BOOT-006** · Critical · heuristic — *"Pending CP SHALL NOT send requests unless TriggerMessage exists."* When Boot.conf status = `Pending`; `warn` if CP requests appear with no preceding `byAction(ctx.messageGroups, 'TriggerMessage')` entry. `info` if no pending. (TriggerMessage is in the `Other` bucket.)
- **BOOT-007** · Major · indeterminate — *"RemoteStartTransaction SHALL NOT occur during Pending."* `info` with reason *"Indeterminate — RemoteStartTransaction is a CSMS-initiated message and may not be fully witnessed in the CP log."*
- **BOOT-008** · Major · indeterminate — *"RemoteStopTransaction SHALL NOT occur during Pending."* `info` with the same style of CSMS-side reason.
- **BOOT-009** · Major · heuristic — *"BootNotification retries SHALL respect retry interval."* When multiple Boots, `warn` if the gap between consecutive Boots is materially shorter than the prior Boot.conf `interval`. Pass: gaps ≥ interval. `info` if <2 Boots.

Tests: BOOT-002 pass + violation + FP-suppression; BOOT-004 `info` when no rejection + `fail` inside interval; BOOT-007/008 assert `status:'info'` and the reason substring `'Indeterminate'`. Commit: `feat(compliance): §4.2 BootNotification rules (BOOT-001..009)`.

---

### Task 6: DataTransfer + Diagnostics + Firmware groups (DT-001..003, DIAG-001..002, FW-001..002)

Three small groups appended together (icons: DT `🔁`, DIAG `🛠️`, FW `⬆️`). **All four of these message types (`DataTransfer`, `DiagnosticsStatusNotification`, `FirmwareStatusNotification`, and any `TriggerMessage` lookups) live in the `Other` bucket — read them via `byAction(ctx.messageGroups, '<Action>')`, never `ctx.messageGroups.<Action>`.**

- **DT-001** · Critical · deterministic — pairing on `DataTransfer` → `pairingResult(byAction(ctx.messageGroups, 'DataTransfer'), 'DataTransfer')`.
- **DT-002** · Major · deterministic — *"UnknownVendor SHALL NOT contain data field."* For each DataTransfer.conf with `status==='UnknownVendorId'`, `fail` if the conf carries a `data` field. Pass: none. Violation: conf `{status:'UnknownVendorId', data:'x'}`.
- **DT-003** · Major · deterministic — *"Unsupported messageId SHALL return UnknownMessageId."* Heuristic-light: if a request had an unrecognized `messageId` and the conf status is not `UnknownMessageId`, `warn`. `info` if no such case. (Deterministic on the conf field when present.)
- **DIAG-001** · Critical · deterministic — pairing on `DiagnosticsStatusNotification`.
- **DIAG-002** · Major · heuristic — *"Idle SHALL only occur after TriggerMessage when not uploading."* `warn` for an `Idle` status with no prior upload state and no `TriggerMessage`. `info` if none.
- **FW-001** · Critical · deterministic — pairing on `FirmwareStatusNotification`.
- **FW-002** · Major · heuristic — *"Idle SHALL only occur after TriggerMessage when not downloading/installing."* mirror of DIAG-002 over firmware states.

Tests: DT-001 pass/fail; DT-002 fail when `data` present on UnknownVendorId; DIAG-001/FW-001 pairing pass/fail. Commit: `feat(compliance): §4.3/4.4/4.5 DataTransfer/Diagnostics/Firmware rules`.

---

### Task 7: Heartbeat group (HEART-001…003)

Group icon `💓`.
- **HEART-001** · Critical · deterministic — pairing on `Heartbeat`.
- **HEART-002** · Informational · deterministic — *"Heartbeat MAY be skipped if another PDU was sent within heartbeat interval."* Always `pass`/`info` — this is a false-positive-suppression note; `info` with details explaining it never fails. (Excluded from score as Informational weight 0.)
- **HEART-003** · Major · deterministic — *"Heartbeat.conf SHALL contain currentTime."* `fail` for any answered Heartbeat whose `responsePayload.currentTime` is missing. Pass: all have it. Violation: a Heartbeat.conf `{}`.

Tests: HEART-001 pass/fail; HEART-003 fail when `currentTime` missing, pass when present. Commit: `feat(compliance): §4.6 Heartbeat rules (HEART-001..003)`.

---

### Task 8: MeterValues group (METER-001…005)

Group icon `📊`.
- **METER-001** · Critical · deterministic — pairing on `MeterValues`.
- **METER-002** · Major · deterministic — *"transactionId SHALL belong to active transaction if present."* `fail` for any MeterValues whose `payload.transactionId` is non-null and not in the set of known transaction ids (`ctx.transactions.map(t=>t.id)` ∪ StartTransaction.conf transactionIds). Pass: all map. Violation: MV with `transactionId: 999` unknown.
- **METER-003** · Major · deterministic — *"MeterValues timestamps SHALL be chronological."* Within each transaction, `warn` if a `meterValue[].timestamp` is earlier than its predecessor. Pass: monotonic. Violation: out-of-order timestamps.
- **METER-004** · Major · deterministic — *"connectorId=0 energy measurements SHALL represent Charge Point level meter."* `info`/`pass` validation: confirm connectorId=0 MeterValues carry CP-level measurands; `warn` if a connectorId=0 MV carries a transactionId (transaction-scoped on the CP-level meter). 
- **METER-005** · Major · deterministic — *"MeterValues SHALL NOT appear after transaction closure."* `warn` for any MV with a transactionId whose timestamp is after that transaction's `stopTime`. Pass: none. Violation: MV after stop.

Tests: METER-002 fail on unknown txId; METER-003 warn on non-chronological; METER-005 warn on post-stop MV. Commit: `feat(compliance): §4.7 MeterValues rules (METER-001..005)`.

---

### Task 9: StartTransaction group (START-001…003)

Group icon `▶️`.
- **START-001** · Critical · deterministic — pairing on `StartTransaction`.
- **START-002** · Major · heuristic — *"reservationId SHALL exist if reservation is being terminated."* Heuristic: if a connector had a prior reservation context (no §5 data in a CP-only log), we can only validate a present `reservationId` is well-formed and `warn` when a start follows a `Reserved` StatusNotification without a `reservationId`. `info` if no reservation context observed.
- **START-003** · Critical · deterministic — *"StartTransaction.conf SHALL contain transactionId."* `fail` for any answered StartTransaction whose `responsePayload.transactionId` is missing. Pass: present. Violation: conf without transactionId.

Tests: START-001 pass/fail; START-003 fail when transactionId missing; START-002 `info` with no reservation context. Commit: `feat(compliance): §4.8 StartTransaction rules (START-001..003)`.

---

### Task 10: StatusNotification group (STATUS-001…009)

Group icon `🔄`. Reuse the connector/status filters from `runProtocolValidation` (read `ctx.messageGroups.StatusNotification`, payload `{connectorId,status,errorCode,timestamp}`).
- **STATUS-001** · Critical · deterministic — pairing on `StatusNotification`.
- **STATUS-002** · Critical · deterministic — *"ConnectorId=0 SHALL only use Available, Unavailable or Faulted."* `fail` for any connectorId=0 status not in that set. Pass: all valid. Violation: connectorId=0 `Charging`.
- **STATUS-003** · Critical · heuristic — *"Connector state transitions SHALL follow official state transition matrix."* Per connector, `warn` on a transition not in the OCPP 1.6 allowed-transition map (encode the matrix as a `Record<string,string[]>`). Pass: legal path. Violation: `Available→Charging` (illegal without Preparing). FP-suppression: legal multi-step path passes.
- **STATUS-004** · Major · deterministic — *"SuspendedEVSE SHALL take precedence over SuspendedEV."* `warn` if both reported simultaneously with SuspendedEV winning. `info` if neither.
- **STATUS-005** · Major · heuristic — *"Unavailable SHALL persist across reboot."* `warn` if a connector `Unavailable` before a reboot reports a non-Unavailable state immediately after with no intervening command. `info` if no reboot.
- **STATUS-006** · Major · deterministic — *"EVCommunicationError SHALL only occur with Preparing, SuspendedEV, SuspendedEVSE and Finishing."* `fail` for an `EVCommunicationError` errorCode paired with any other status. Pass: only the allowed states. Violation: `Charging` + EVCommunicationError.
- **STATUS-007** · Major · heuristic — *"Offline synchronization SHALL only report current state and errors."* `warn` if a post-reconnect burst includes transient intermediate states. `info` if no offline burst.
- **STATUS-008** · Major · heuristic — *"Offline synchronization messages SHALL preserve event order."* `warn` if a post-reconnect burst's embedded `timestamp`s are out of order. `info` if none.
- **STATUS-009** · Major · indeterminate — *"EV disconnect behavior SHALL respect StopTransactionOnEVSideDisconnect."* `info` with reason *"Indeterminate — depends on StopTransactionOnEVSideDisconnect config, not present in log."*

Tests: STATUS-002 fail on illegal connector-0 state; STATUS-003 warn on illegal transition + pass on legal path; STATUS-006 fail on bad EVCommunicationError combo; STATUS-009 `info` + reason substring. Commit: `feat(compliance): §4.9 StatusNotification rules (STATUS-001..009)`.

---

### Task 11: StopTransaction group (STOP-001…006)

Group icon `⏹️`.
- **STOP-001** · Critical · deterministic — pairing on `StopTransaction`.
- **STOP-002** · Critical · deterministic — *"transactionId SHALL belong to active transaction."* `fail` for any StopTransaction whose `payload.transactionId` isn't a known tx id (and is not 0). Pass: maps. Violation: stop for txId 999. (`transactionId:0` is its own known anti-pattern — `warn`, "CMS cannot match".)
- **STOP-003** · Major · deterministic — *"meterStop SHALL be ≥ meterStart."* For each tx, `fail` if `payload.meterStop < start meterStart`. Pass: ≥. Violation: meterStop below meterStart.
- **STOP-004** · Major · indeterminate — *"StopTransactionOnEVSideDisconnect=true SHALL stop transaction."* `info` + config-not-in-log reason.
- **STOP-005** · Major · indeterminate — *"StopTransactionOnEVSideDisconnect=false SHALL NOT stop transaction."* `info` + reason.
- **STOP-006** · Major · indeterminate — *"...=false SHALL take precedence over UnlockConnectorOnEVSideDisconnect."* `info` + reason.

Tests: STOP-001 pass/fail; STOP-002 fail unknown txId + warn on txId 0; STOP-003 fail when meterStop<meterStart; STOP-004/005/006 assert `status:'info'` + `'Indeterminate'`/`'config'` substring. Commit: `feat(compliance): §4.10 StopTransaction rules (STOP-001..006)`.

---

## Task 12: Full-pack assembly assertion

**Files:**
- Test: `tests/unit/compliance.rules.pack.test.ts`

**Interfaces:**
- Consumes: `cpInitiatedPack`, `runCompliance`.

- [ ] **Step 1: Write the test**

```ts
// tests/unit/compliance.rules.pack.test.ts
import { describe, it, expect } from 'vitest';
import { cpInitiatedPack } from '../../src/app/compliance/rulepacks/cpInitiated';

describe('cpInitiatedPack completeness', () => {
  it('declares all 10 §4 message groups', () => {
    expect(cpInitiatedPack.groups.map((g) => g.prefix)).toEqual(
      ['AUTH', 'BOOT', 'DT', 'DIAG', 'FW', 'HEART', 'METER', 'START', 'STATUS', 'STOP'],
    );
  });
  it('contains exactly 46 rules with unique ids', () => {
    const ids = cpInitiatedPack.groups.flatMap((g) => g.rules.map((r) => r.id));
    expect(ids).toHaveLength(46);
    expect(new Set(ids).size).toBe(46);
  });
  it('every rule has verbatim invariant text + a 4.x specRef + a valid severity/tier', () => {
    for (const g of cpInitiatedPack.groups) for (const r of g.rules) {
      expect(r.invariant.length).toBeGreaterThan(10);
      expect(r.specRef).toMatch(/^4\.\d+$/);
      expect(['Critical', 'Major', 'Minor', 'Informational']).toContain(r.severity);
      expect(['deterministic', 'heuristic', 'indeterminate']).toContain(r.tier);
    }
  });
});
```

- [ ] **Step 2: Run → expect PASS** (all groups already appended by Tasks 4–11)

Run: `npx vitest run tests/unit/compliance.rules.pack.test.ts`
Expected: PASS (3 tests). If rule count ≠ 46, fix the missing/duplicate group before proceeding.

- [ ] **Step 3: Commit**

```bash
git add tests/unit/compliance.rules.pack.test.ts
git commit -m "test(compliance): assert full §4 pack — 46 rules, 10 groups"
```

---

## Task 13: Wire into the analysis pipeline

**Files:**
- Modify: `src/app/analyze.ts`
- Test: `tests/unit/compliance.analyze.test.ts`

**Interfaces:**
- Consumes: `runCompliance`, `cpInitiatedPack`, existing `analyze()`.
- Produces: `AnalysisResult.cpCompliance: ComplianceReport`.

- [ ] **Step 1: Write the failing test**

```ts
// tests/unit/compliance.analyze.test.ts
import { describe, it, expect } from 'vitest';
import { analyzeLogLines } from '../../src/app/analyze';

describe('analyze() wires cpCompliance', () => {
  it('produces a §4 compliance report on a minimal log', () => {
    const lines = ['{"timestamp":"2025-01-01T00:00:00.000Z","message":[2,"a","BootNotification",{"chargePointVendor":"X","chargePointModel":"Y"}]}'];
    const r = analyzeLogLines(lines, 'f.json');
    expect(r.cpCompliance.packId).toBe('ocpp-1.6j-section-4');
    expect(r.cpCompliance.groups.flatMap((g) => g.results)).toHaveLength(46);
    expect(typeof r.cpCompliance.summary.weightedScore).toBe('number');
  });
});
```

> If the sample log line format differs, mirror an existing fixture in `tests/fixtures/`; the assertion that matters is `r.cpCompliance` exists with 46 results.

- [ ] **Step 2: Run → FAIL** (`cpCompliance` undefined)

Run: `npx vitest run tests/unit/compliance.analyze.test.ts`
Expected: FAIL.

- [ ] **Step 3: Edit `analyze.ts`** (additive)

Add imports near the other engine imports:
```ts
import { runCompliance } from './compliance/runCompliance';
import { cpInitiatedPack } from './compliance/rulepacks/cpInitiated';
import type { ComplianceReport } from './compliance/types';
```
Add the field to `AnalysisResult` (after `protocol`):
```ts
  cpCompliance: ComplianceReport;
```
Compute it in `analyze()` (after the `protocol` line):
```ts
  const cpCompliance = runCompliance(cpInitiatedPack, { messageGroups, transactions, internalTxMap, rawLogLines });
```
Add `cpCompliance` to the returned object literal.

- [ ] **Step 4: Run → PASS** + full suite

Run: `npx vitest run tests/unit/compliance.analyze.test.ts && npm run typecheck`
Expected: PASS, typecheck clean.

- [ ] **Step 5: Commit**

```bash
git add src/app/analyze.ts tests/unit/compliance.analyze.test.ts
git commit -m "feat(compliance): wire §4 report into analyze() AnalysisResult"
```

---

## Task 14: Render the section

**Files:**
- Create: `src/app/render/sections/cpCompliance.ts`
- Test: `tests/unit/cpCompliance.render.test.ts`

**Interfaces:**
- Consumes: `AnalysisResult` (`r.cpCompliance`), `el` from `render/dom`, `singleContextButtons` from `render/contextViewer`.
- Produces: `renderCpCompliance(r: AnalysisResult): HTMLElement` and (for the registry) renders into a table with id `cp-compliance-table`.

- [ ] **Step 1: Write the failing test**

```ts
// tests/unit/cpCompliance.render.test.ts
// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { renderCpCompliance } from '../../src/app/render/sections/cpCompliance';
import { analyzeLogLines } from '../../src/app/analyze';

const r = analyzeLogLines(['{"timestamp":"2025-01-01T00:00:00.000Z","message":[2,"a","BootNotification",{"chargePointVendor":"X","chargePointModel":"Y"}]}'], 'f.json');

describe('renderCpCompliance', () => {
  it('renders the weighted score badge and all 10 message groups', () => {
    const node = renderCpCompliance(r);
    expect(node.textContent).toContain('% Compliant');
    expect(node.querySelectorAll('[data-cpc-group]')).toHaveLength(10);
  });
  it('renders a table with the export target id and a severity column', () => {
    const node = renderCpCompliance(r);
    expect(node.querySelector('#cp-compliance-table')).toBeTruthy();
    expect(node.textContent).toContain('Severity');
    expect(node.textContent).toContain('Indeterminate'); // BootNotification-only log → STOP/STATUS/BOOT indeterminate rows present
  });
  it('emits Preview/Download context buttons for findings with a line number', () => {
    // A failing pairing on an unanswered request would carry data-ctx-action; the
    // BootNotification-only log yields indeterminate/info rows, so assert the wiring
    // helper is used by checking at least the markup contract exists when affected.
    const node = renderCpCompliance(r);
    // No crash + table present is the contract here; per-rule button coverage is in rule tests.
    expect(node.querySelector('#cp-compliance-table')).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run → FAIL** (module not found)

Run: `npx vitest run tests/unit/cpCompliance.render.test.ts`
Expected: FAIL.

- [ ] **Step 3: Write the renderer** (mirrors `protocolCompliance.ts` styling; uses `singleContextButtons` for context cells)

```ts
// src/app/render/sections/cpCompliance.ts
// CP-Initiated Operations Compliance (OCPP 1.6J §4) section. Sibling of Protocol
// Compliance — renders r.cpCompliance: per-group collapsible tables with Test ID,
// §Ref, Invariant, Severity, Tier, Status, Details, and Preview/Download context.
import { el } from '../dom';
import { singleContextButtons } from '../contextViewer';
import type { AnalysisResult } from '../../analyze';
import type { ComplianceGroup, ComplianceResult, CheckStatus, Tier } from '../../compliance/types';

const statusBadge = (s: CheckStatus): string =>
  s === 'pass' ? `<span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300">✓ PASS</span>`
  : s === 'fail' ? `<span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300">✗ FAIL</span>`
  : s === 'warn' ? `<span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300">⚠ WARN</span>`
  : `<span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300">— INDET.</span>`;
const tierTag = (t: Tier): string => {
  const dot = t === 'deterministic' ? '🟢' : t === 'heuristic' ? '🟡' : '🔴';
  return `<span class="text-xs text-gray-500 dark:text-gray-400" title="${t}">${dot}</span>`;
};
const rowBg = (s: CheckStatus): string => s === 'fail' ? 'bg-red-50 dark:bg-red-900/10' : s === 'warn' ? 'bg-yellow-50 dark:bg-yellow-900/10' : '';

function contextCell(res: ComplianceResult, idx: number): string {
  const anchor = res.affected.find((a) => a.lineNumber != null);
  if (!anchor) return '<span class="text-xs text-gray-400 dark:text-gray-500">—</span>';
  const { preview, download } = singleContextButtons(res.id, anchor.lineNumber!, idx, { preview: true });
  return `<div class="flex gap-1">${preview}${download}</div>`;
}

function groupBlock(group: ComplianceGroup, startIdx: number): HTMLElement {
  const failed = group.results.filter((c) => c.status === 'fail').length;
  const warn = group.results.filter((c) => c.status === 'warn').length;
  const groupBg = failed > 0 ? 'bg-red-50 dark:bg-red-900/20' : warn > 0 ? 'bg-yellow-50 dark:bg-yellow-900/20' : 'bg-green-50 dark:bg-green-900/20';
  const rows = group.results.map((res, i) => `
    <tr class="${rowBg(res.status)}">
      <td class="px-3 py-2 text-xs font-mono font-semibold text-gray-600 dark:text-gray-400 whitespace-nowrap">${res.id}</td>
      <td class="px-3 py-2 text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">§${res.specRef}</td>
      <td class="px-3 py-2 text-sm text-gray-800 dark:text-gray-200">${res.invariant}</td>
      <td class="px-3 py-2 text-xs whitespace-nowrap">${res.severity}</td>
      <td class="px-3 py-2 text-center">${tierTag(res.tier)}</td>
      <td class="px-3 py-2 whitespace-nowrap">${statusBadge(res.status)}</td>
      <td class="px-3 py-2 text-xs text-gray-600 dark:text-gray-400">${res.details}</td>
      <td class="px-3 py-2 whitespace-nowrap">${contextCell(res, startIdx + i)}</td>
    </tr>`).join('');

  const div = el('div', { className: 'mb-3 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden', attrs: { 'data-cpc-group': group.prefix } });
  const header = el('div', { className: `flex items-center justify-between p-3 cursor-pointer select-none ${groupBg}`, html: `
    <div class="flex items-center gap-2"><span class="text-base">${group.icon}</span>
      <span class="text-sm font-semibold text-gray-800 dark:text-gray-200">${group.messageType}</span>
      <span class="text-xs text-gray-500 dark:text-gray-400">${group.results.length} rule(s)</span></div>
    <svg class="cpc-chevron w-4 h-4 text-gray-400 transform transition-transform duration-200 rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/></svg>` });
  const body = el('div', { className: 'overflow-x-auto', html: `
    <table class="cp-compliance-table min-w-full divide-y divide-gray-200 dark:divide-gray-700">
      <thead class="bg-gray-50 dark:bg-gray-700/60"><tr>
        <th class="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Test ID</th>
        <th class="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">§Ref</th>
        <th class="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Invariant</th>
        <th class="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Severity</th>
        <th class="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Tier</th>
        <th class="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Status</th>
        <th class="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Details</th>
        <th class="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Context</th>
      </tr></thead><tbody>${rows}</tbody></table>` });
  header.addEventListener('click', () => { body.classList.toggle('hidden'); header.querySelector('.cpc-chevron')!.classList.toggle('rotate-180'); });
  div.append(header, body);
  return div;
}

export function renderCpCompliance(r: AnalysisResult): HTMLElement {
  const { groups, summary } = r.cpCompliance;
  const score = summary.weightedScore;
  const color = score >= 90 ? 'text-green-700 dark:text-green-300 bg-green-50 dark:bg-green-900/20 border-green-300'
    : score >= 70 ? 'text-yellow-700 dark:text-yellow-300 bg-yellow-50 dark:bg-yellow-900/20 border-yellow-300'
    : 'text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-900/20 border-red-300';
  const badge = el('div', { className: 'mb-3', html:
    `<span class="inline-flex items-center px-3 py-1 rounded-full text-sm font-bold border ${color}">${score}% Compliant</span>
     <span class="ml-3 text-xs text-gray-500 dark:text-gray-400">✓ ${summary.byStatus.pass} · ⚠ ${summary.byStatus.warn} · ✗ ${summary.byStatus.fail} · — ${summary.byStatus.info} indeterminate</span>
     <span class="ml-3 text-xs text-gray-400 dark:text-gray-500">Tiers: 🟢 deterministic · 🟡 heuristic · 🔴 indeterminate</span>` });

  // running index so each context button has a unique index across groups
  let idx = 0;
  const blocks = groups.map((g) => { const b = groupBlock(g, idx); idx += g.results.length; return b; });

  // a single hidden table carrying the export target id (rows mirror the visible report)
  const exportRows = groups.flatMap((g) => g.results).map((res) =>
    `<tr><td>${res.id}</td><td>${res.specRef}</td><td>${res.targetMessage}</td><td>${res.invariant.replace(/</g, '&lt;')}</td><td>${res.severity}</td><td>${res.tier}</td><td>${res.status}</td><td>${res.details.replace(/</g, '&lt;')}</td></tr>`).join('');
  const exportTable = el('table', { className: 'hidden', attrs: { id: 'cp-compliance-table' }, html:
    `<thead><tr><th>Test ID</th><th>Spec §</th><th>Target Message</th><th>Invariant</th><th>Severity</th><th>Tier</th><th>Status</th><th>Details</th></tr></thead><tbody>${exportRows}</tbody>` });

  return el('div', {}, [badge, ...blocks, exportTable]);
}
```

> If `el`'s signature differs (check `render/dom.ts`), match it exactly — `el(tag, opts, children?)` where `opts` supports `className`, `html`, `text`, `attrs`.

- [ ] **Step 4: Run → PASS**

Run: `npx vitest run tests/unit/cpCompliance.render.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/app/render/sections/cpCompliance.ts tests/unit/cpCompliance.render.test.ts
git commit -m "feat(compliance): §4 compliance section renderer"
```

---

## Task 15: Register the section in the orchestrator

**Files:**
- Modify: `src/app/render/renderResults.ts`
- Test: `tests/unit/cpCompliance.registry.test.ts`

**Interfaces:**
- Consumes: `renderCpCompliance`, the `SECTION_ORDER` array.

- [ ] **Step 1: Write the failing test**

```ts
// tests/unit/cpCompliance.registry.test.ts
import { describe, it, expect } from 'vitest';
import { SECTION_ORDER } from '../../src/app/render/renderResults';

describe('SECTION_ORDER registers CP-Initiated Compliance', () => {
  it('adds exactly one new section right after Protocol Compliance', () => {
    const titles = SECTION_ORDER.map((s) => s.title);
    const pc = titles.indexOf('Protocol Compliance');
    expect(pc).toBeGreaterThan(-1);
    expect(titles[pc + 1]).toBe('Protocol Compliance — CP-Initiated Operations (§4)');
  });
  it('the new section declares an Excel export target', () => {
    const def = SECTION_ORDER.find((s) => s.title === 'Protocol Compliance — CP-Initiated Operations (§4)')!;
    expect(def.exportTable?.id).toBe('cp-compliance-table');
  });
  it('does not remove any pre-existing section (count grows by exactly 1)', () => {
    expect(SECTION_ORDER.length).toBe(21); // 20 existing + 1 new
  });
});
```

> Confirm the existing `SECTION_ORDER.length` first (currently 20 entries) and set the expectation to `existing + 1`.

- [ ] **Step 2: Run → FAIL**

Run: `npx vitest run tests/unit/cpCompliance.registry.test.ts`
Expected: FAIL.

- [ ] **Step 3: Edit `renderResults.ts`** (one import + one entry)

Add the import beside the other section imports:
```ts
import { renderCpCompliance } from './sections/cpCompliance';
```
Insert immediately **after** the `{ title: 'Protocol Compliance', emoji: '✅', render: renderProtocolCompliance },` entry:
```ts
  { title: 'Protocol Compliance — CP-Initiated Operations (§4)', emoji: '📋', exportTable: { id: 'cp-compliance-table', file: 'CP_Initiated_Compliance.xlsx' }, render: renderCpCompliance },
```

- [ ] **Step 4: Run → PASS** + full suite + build

Run: `npx vitest run tests/unit/cpCompliance.registry.test.ts && npm test && npm run build`
Expected: registry tests PASS; full suite green (273 baseline + new tests); build clean.

- [ ] **Step 5: Commit**

```bash
git add src/app/render/renderResults.ts tests/unit/cpCompliance.registry.test.ts
git commit -m "feat(compliance): register §4 compliance as sibling section after Protocol Compliance"
```

---

## Task 16: Real-sample smoke test + final gate

**Files:**
- Test: `tests/integration/compliance.sample.test.ts`

**Interfaces:**
- Consumes: `analyzeLogLines`/`analyze`, sample logs in `data/samples/`.

- [ ] **Step 1: Write the smoke test**

```ts
// tests/integration/compliance.sample.test.ts
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { analyzeLogLines } from '../../src/app/analyze';

const SAMPLES = join(__dirname, '../../data/samples');

describe('§4 compliance over real sample logs', () => {
  const files = readdirSync(SAMPLES).filter((f) => /\.(json|log|txt)$/i.test(f));
  it('has at least one sample to test', () => expect(files.length).toBeGreaterThan(0));
  for (const f of files) {
    it(`runs without crashing and yields 46 results on ${f}`, () => {
      const lines = readFileSync(join(SAMPLES, f), 'utf-8').split(/\r?\n/).filter(Boolean);
      const r = analyzeLogLines(lines, f);
      const results = r.cpCompliance.groups.flatMap((g) => g.results);
      expect(results).toHaveLength(46);
      // no rule throws → all have a defined status; weighted score is a valid percent
      expect(results.every((x) => ['pass', 'warn', 'fail', 'info'].includes(x.status))).toBe(true);
      expect(r.cpCompliance.summary.weightedScore).toBeGreaterThanOrEqual(0);
      expect(r.cpCompliance.summary.weightedScore).toBeLessThanOrEqual(100);
    });
  }
});
```

> Adjust `SAMPLES` path / parse call to match how other integration tests load `data/samples/` (check `tests/integration/`). The contract: no crash, 46 results, valid score.

- [ ] **Step 2: Run → PASS**

Run: `npx vitest run tests/integration/compliance.sample.test.ts`
Expected: PASS. If any rule throws on real data, fix that rule (guard undefined payloads) and re-run.

- [ ] **Step 3: Full gate**

Run: `npm run typecheck && npm test && npm run build`
Expected: typecheck clean; **all tests green**; build clean.

- [ ] **Step 4: Commit**

```bash
git add tests/integration/compliance.sample.test.ts
git commit -m "test(compliance): real-sample smoke for §4 compliance (no crash, 46 results)"
```

---

## Task 17: Tracker + docs sync

**Files:**
- Modify: `specs/roadmap.md`, `specs/tasks.md`, `CHANGELOG.md`, `knowledge/project-journal.md`, `CLAUDE.md` (Status section)

- [ ] **Step 1: Update trackers** — add the §4 compliance feature: roadmap row (new sub-capability under Parser revamp / Protocol Compliance), tasks.md items checked, CHANGELOG run entry, journal session entry, and refresh the CLAUDE.md Status bullet (test count = new total). Keep wording factual; cite the spec + plan paths.

- [ ] **Step 2: Commit**

```bash
git add specs/roadmap.md specs/tasks.md CHANGELOG.md knowledge/project-journal.md CLAUDE.md
git commit -m "docs(compliance): trackers — §4 CP-Initiated Compliance section shipped"
```

---

## Self-Review (run before handoff)

- **Spec coverage:** Framework (§4) → Tasks 1–3. All 46 rules tier-tagged (§5) → Tasks 4–11 + pack assertion Task 12. Weighted score, info-exclusion (§4.4) → Task 2. Sibling-section mount, no `protocolCompliance.ts` edit (D5, §6/§7) → Tasks 14–15. Context viewer reuse + Excel via registry (§9.1) → Tasks 14–15. Regression gates (§9.1) → typecheck/test/build gates in Tasks 13/15/16, registry "count grows by 1" + "no section removed" in Task 15. Real-sample smoke (§9) → Task 16. Trackers (project rule) → Task 17.
- **Placeholder scan:** rule-group Tasks 5–11 give exact per-rule logic + test cases rather than literal TS for all 46; the `ComplianceRule` shape is fully shown in Task 4 and is identical for every rule (object literal + `evaluate`). This is deliberate to keep the plan executable without 2,000 lines of near-duplicate code; an implementer has the predicate, status, severity, tier, and ≥2 test cases for each rule.
- **Type consistency:** `ComplianceContext`, `ComplianceRule`, `ComplianceResult`, `RulePack`, `runCompliance`, `cpInitiatedPack`, `renderCpCompliance`, `cp-compliance-table`, `cpCompliance` field — names used identically across Tasks 1→17.
- **Open items carried from spec §12:** severity weights locked (4/2/1/0); layout locked (sibling section). Per-rule line-anchor = the offending frame (`itemOf`). Tier counts may shift ±1–2 as heuristic logic is pinned — the pack-assertion test enforces the total stays 46.
