// Derived validation KPIs — turns the engine's raw ValidationReport into the
// layer-organized, charger↔CMS-debugging metrics recommended in
// docs/Type Validation Metrics.md (L1 frame · L2 schema · L3 correlation ·
// orphans · latency · action-wise · overall compliance score).
//
// Pure + unit-tested. No engine change: everything is derived from report.messages
// (one MessageResult per frame, with kind/action/violations) and report.exchanges
// (status + latencyMs). L2 sub-categories use the Ajv `detail.keyword`.

import type { ValidationReport } from '../../../services/validation';

export type LatencyStatus = 'Healthy' | 'Warning' | 'Poor' | '—';

export interface ValidationMetrics {
  framesProcessed: number;
  totalCalls: number;
  totalResults: number;
  totalCallErrors: number; // OCPP CallError frames (type 4)
  validationSuccessPct: number;
  l1: { invalid: number; invalidPct: number; invalidByKind: Record<string, number> };
  l2: {
    violations: number; compliancePct: number;
    missingFields: number; typeErrors: number; enumErrors: number; otherErrors: number;
    topAction: { action: string; count: number } | null;
  };
  l3: { paired: number; pairingSuccessPct: number; mismatch: number; matchRatePct: number };
  orphans: { calls: number; responses: number; ratePct: number };
  latency: { avg: number | null; min: number | null; max: number | null; p95: number | null; p99: number | null; timeoutCount: number; status: LatencyStatus };
  actions: { action: string; calls: number; schemaViolations: number; avgRttMs: number | null }[];
  scores: { frame: number; schema: number; pairing: number; orphan: number; overall: number };
}

const TIMEOUT_MS = 1000; // > 1000 ms = "Poor" (docs/Type Validation Metrics.md §6)
const pct = (n: number, d: number): number => (d > 0 ? (n / d) * 100 : 0);
const round1 = (n: number): number => Math.round(n * 10) / 10;

/** nearest-rank percentile of a sorted ascending array. */
function percentile(sorted: number[], p: number): number | null {
  if (sorted.length === 0) return null;
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1));
  return sorted[idx];
}

export function computeValidationMetrics(report: ValidationReport): ValidationMetrics {
  const msgs = report.messages;
  const total = msgs.length;

  const totalCalls = msgs.filter((m) => m.kind === 'Call').length;
  const totalResults = msgs.filter((m) => m.kind === 'CallResult').length;
  const totalCallErrors = msgs.filter((m) => m.kind === 'CallError').length;

  // L1
  const l1Msgs = msgs.filter((m) => m.violations.some((v) => v.layer === 'L1'));
  const invalidByKind: Record<string, number> = {};
  for (const m of l1Msgs) { const k = m.kind ?? 'unknown'; invalidByKind[k] = (invalidByKind[k] ?? 0) + 1; }

  // L2 — count violations + sub-categorize via Ajv keyword; top offending action
  let missingFields = 0, typeErrors = 0, enumErrors = 0, otherErrors = 0, l2Violations = 0;
  const l2ByAction: Record<string, number> = {};
  const l2MsgCount = new Set<unknown>();
  for (const m of msgs) {
    let hasL2 = false;
    for (const v of m.violations) {
      if (v.layer !== 'L2') continue;
      l2Violations += 1; hasL2 = true;
      const kw = (v.detail as { keyword?: string } | undefined)?.keyword;
      if (kw === 'required') missingFields += 1;
      else if (kw === 'type') typeErrors += 1;
      else if (kw === 'enum') enumErrors += 1;
      else otherErrors += 1;
    }
    if (hasL2) { l2MsgCount.add(m); const a = m.action ?? '—'; l2ByAction[a] = (l2ByAction[a] ?? 0) + 1; }
  }
  const topAction = Object.entries(l2ByAction).sort((a, b) => b[1] - a[1])[0] ?? null;

  // L3
  const matched = report.exchanges.filter((x) => x.status === 'matched').length;
  const mismatch = report.exchanges.filter((x) => x.status === 'mismatch').length;

  // Latency
  const lats = report.exchanges.map((x) => x.latencyMs).filter((n): n is number => typeof n === 'number').sort((a, b) => a - b);
  const min = lats[0] ?? null;
  const max = lats[lats.length - 1] ?? null;
  const timeoutCount = lats.filter((n) => n > TIMEOUT_MS).length;
  const avg = report.summary.avgLatencyMs;
  const status: LatencyStatus = avg == null ? '—' : avg < 500 ? 'Healthy' : avg <= TIMEOUT_MS ? 'Warning' : 'Poor';

  // Action-wise
  const callsByAction: Record<string, number> = {};
  for (const m of msgs) if (m.kind === 'Call' && m.action) callsByAction[m.action] = (callsByAction[m.action] ?? 0) + 1;
  const rttByAction: Record<string, number[]> = {};
  for (const x of report.exchanges) if (x.action && typeof x.latencyMs === 'number') (rttByAction[x.action] ??= []).push(x.latencyMs);
  const actions = Object.keys(callsByAction).sort().map((action) => {
    const r = rttByAction[action] ?? [];
    return {
      action,
      calls: callsByAction[action],
      schemaViolations: l2ByAction[action] ?? 0,
      avgRttMs: r.length > 0 ? round1(r.reduce((s, n) => s + n, 0) / r.length) : null,
    };
  });

  // Scores (docs §9: 40% frame + 30% schema + 20% pairing + 10% orphan)
  const totalOrphans = report.summary.orphanCalls + report.summary.orphanResponses;
  const frameScore = round1(100 - pct(l1Msgs.length, total));
  const schemaScore = round1(100 - pct(l2MsgCount.size, total));
  const pairingScore = round1(pct(matched, totalCalls));
  const orphanScore = round1(100 - pct(totalOrphans, total));
  const overall = round1(0.4 * frameScore + 0.3 * schemaScore + 0.2 * pairingScore + 0.1 * orphanScore);

  return {
    framesProcessed: total,
    totalCalls, totalResults, totalCallErrors,
    validationSuccessPct: round1(pct(report.summary.valid, total)),
    l1: { invalid: l1Msgs.length, invalidPct: round1(pct(l1Msgs.length, total)), invalidByKind },
    l2: { violations: l2Violations, compliancePct: round1(100 - pct(l2MsgCount.size, total)), missingFields, typeErrors, enumErrors, otherErrors, topAction: topAction ? { action: topAction[0], count: topAction[1] } : null },
    l3: { paired: matched, pairingSuccessPct: round1(pct(matched, totalCalls)), mismatch, matchRatePct: round1(pct(matched, totalResults)) },
    orphans: { calls: report.summary.orphanCalls, responses: report.summary.orphanResponses, ratePct: round1(pct(totalOrphans, total)) },
    latency: { avg, min, max, p95: percentile(lats, 95), p99: percentile(lats, 99), timeoutCount, status },
    actions,
    scores: { frame: frameScore, schema: schemaScore, pairing: pairingScore, orphan: orphanScore, overall },
  };
}
