// Type-Aware Validation (L1–L3) section — Phase 6 integration of the in-repo
// OCPP Validation Engine (src/services/validation). Feeds the parser's already-
// extracted frames into validateBatch and renders the layer-organized KPIs from
// docs/Type Validation Metrics.md (charger↔CMS debugging view, not a bare pass/fail).
//
// Additive: no existing section changes. The engine pulls in typed-ocpp (~822 kb)
// so it is LAZY-loaded (dynamic import → Vite code-splits). Run is on-demand.
// All report cells are textContent (engine /cso note: violations may carry log payload).
// Arch: docs/superpowers/specs/2026-06-22-parser-phase6-validation-integration-arch.md

import { el } from '../dom';
import { computeValidationMetrics } from './validationMetrics';
import type { AnalysisResult } from '../../analyze';
import type { ParsedMessage } from '../../model/types';
import type { RawFrame, ValidationReport } from '../../../services/validation';

/** Adapter: parser messages → engine frames. `OcppRawMessage` ≡ `RawFrame`, so this
 *  is a faithful pass-through of `.message` + the log `.timestamp` (no mutation). */
export function framesFromMessages(messages: ParsedMessage[]): { frame: RawFrame; ts?: string }[] {
  return messages.map((m) => ({ frame: m.message, ts: m.timestamp }));
}

const CARD = 'bg-gray-50 dark:bg-gray-700/40 rounded-lg px-4 py-3 text-center';
const TH = 'px-3 py-2 text-left font-semibold text-gray-700 dark:text-gray-200 whitespace-nowrap';
const TD = 'px-3 py-2 align-top text-gray-800 dark:text-gray-100';

function card(label: string, value: string, valueClass = ''): HTMLElement {
  return el('div', { className: CARD }, [
    el('div', { className: 'text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400', text: label }),
    el('div', { className: `text-lg font-semibold ${valueClass}`, text: value }),
  ]);
}

function table(headers: string[], rows: HTMLElement[]): HTMLElement {
  return el('div', { className: 'overflow-x-auto mt-2' }, [
    el('table', { className: 'min-w-full text-sm' }, [
      el('thead', { className: 'bg-gray-100 dark:bg-gray-700' }, [
        el('tr', {}, headers.map((h) => el('th', { className: TH, text: h }))),
      ]),
      el('tbody', {}, rows),
    ]),
  ]);
}

/** A titled layer panel (L1/L2/L3/Latency) listing label → value rows. */
function layerBlock(title: string, rows: [string, string][]): HTMLElement {
  return el('div', { className: 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4' }, [
    el('h4', { className: 'font-semibold text-gray-800 dark:text-gray-100 mb-2', text: title }),
    el('dl', { className: 'space-y-1' }, rows.map(([k, v]) =>
      el('div', { className: 'flex justify-between gap-4 text-sm' }, [
        el('dt', { className: 'text-gray-500 dark:text-gray-400', text: k }),
        el('dd', { className: 'font-medium text-gray-800 dark:text-gray-100', text: v }),
      ]))),
  ]);
}

/** Render a ValidationReport into `body` (replaces prior content). textContent only. */
export function renderValidationReport(body: HTMLElement, report: ValidationReport): void {
  const m = computeValidationMetrics(report);
  const scoreClass = m.scores.overall >= 95 ? 'text-green-600 dark:text-green-400'
    : m.scores.overall >= 80 ? 'text-amber-600 dark:text-amber-400'
    : 'text-red-600 dark:text-red-400';
  const orphanCount = m.orphans.calls + m.orphans.responses;

  // Top-level KPIs (docs/Type Validation Metrics.md §"top-level KPIs")
  const kpis = el('div', { className: 'grid grid-cols-2 md:grid-cols-4 gap-3' }, [
    card('Frames Processed', String(m.framesProcessed)),
    card('Validation Success', `${m.validationSuccessPct}%`, m.validationSuccessPct < 100 ? 'text-amber-600 dark:text-amber-400' : 'text-green-600 dark:text-green-400'),
    card('Schema Compliance', `${m.l2.compliancePct}%`),
    card('Pairing Success', `${m.l3.pairingSuccessPct}%`),
    card('Orphan Count', String(orphanCount), orphanCount > 0 ? 'text-amber-600 dark:text-amber-400' : ''),
    card('Avg RTT', m.latency.avg == null ? '—' : `${m.latency.avg} ms`),
    card('P95 RTT', m.latency.p95 == null ? '—' : `${m.latency.p95} ms`),
    card('Compliance Score', `${m.scores.overall}%`, scoreClass),
  ]);

  // Per-layer breakdown (makes it self-evident L1/L2/L3 each ran)
  const layers = el('div', { className: 'grid grid-cols-1 md:grid-cols-3 gap-3 mt-4' }, [
    layerBlock('L1 — RPC Frame', [
      ['Well-formed', String(m.framesProcessed - m.l1.invalid)],
      ['Malformed (FRAME_INVALID)', `${m.l1.invalid} (${m.l1.invalidPct}%)`],
      ['Frame Score', `${m.scores.frame}%`],
    ]),
    layerBlock('L2 — Schema', [
      ['Violations (SCHEMA_VIOLATION)', String(m.l2.violations)],
      ['Missing / Type / Enum', `${m.l2.missingFields} / ${m.l2.typeErrors} / ${m.l2.enumErrors}`],
      ['Top offending action', m.l2.topAction ? `${m.l2.topAction.action} (${m.l2.topAction.count})` : '—'],
      ['Schema Score', `${m.scores.schema}%`],
    ]),
    layerBlock('L3 — Correlation', [
      ['Paired exchanges', String(m.l3.paired)],
      ['Result mismatch', String(m.l3.mismatch)],
      ['Orphan calls / responses', `${m.orphans.calls} / ${m.orphans.responses}`],
      ['Pairing Score', `${m.scores.pairing}%`],
    ]),
  ]);

  const latency = el('div', { className: 'mt-3' }, [
    layerBlock(`Latency (RTT) — ${m.latency.status}`, [
      ['Average', m.latency.avg == null ? '—' : `${m.latency.avg} ms`],
      ['Min / Max', `${m.latency.min ?? '—'} / ${m.latency.max ?? '—'} ms`],
      ['P95 / P99', `${m.latency.p95 ?? '—'} / ${m.latency.p99 ?? '—'} ms`],
      ['Timeouts (> 1000 ms)', String(m.latency.timeoutCount)],
    ]),
  ]);

  // Action-wise rollup (docs §7)
  const actionRows = m.actions.map((a) => el('tr', { className: 'border-b border-gray-100 dark:border-gray-700' }, [
    el('td', { className: TD, text: a.action }),
    el('td', { className: TD, text: String(a.calls) }),
    el('td', { className: TD, text: String(a.schemaViolations) }),
    el('td', { className: TD, text: a.avgRttMs == null ? '—' : `${a.avgRttMs} ms` }),
  ]));
  const actionWise = m.actions.length > 0
    ? el('div', { className: 'mt-5' }, [el('h4', { className: 'font-semibold text-gray-800 dark:text-gray-100', text: 'Action-wise' }), table(['Action', 'Calls', 'Schema Viol.', 'Avg RTT'], actionRows)])
    : el('div');

  // Detail: L1/L2 violations list
  const vRows: HTMLElement[] = [];
  for (const msg of report.messages) for (const v of msg.violations) {
    if (v.layer === 'L3') continue;
    vRows.push(el('tr', { className: 'border-b border-gray-100 dark:border-gray-700' }, [
      el('td', { className: TD, text: msg.messageId ?? '—' }),
      el('td', { className: TD, text: msg.kind ?? '—' }),
      el('td', { className: TD, text: msg.action ?? '—' }),
      el('td', { className: TD, text: v.layer }),
      el('td', { className: TD, text: v.code }),
      el('td', { className: TD, text: v.message }),
      el('td', { className: TD, text: v.path ?? '' }),
    ]));
  }
  const violations = vRows.length > 0
    ? el('div', { className: 'mt-5' }, [el('h4', { className: 'font-semibold text-gray-800 dark:text-gray-100', text: `Violations (${vRows.length})` }), table(['Msg ID', 'Kind', 'Action', 'Layer', 'Code', 'Message', 'Path'], vRows)])
    : el('p', { className: 'mt-5 text-green-700 dark:text-green-400', text: '✅ No L1/L2 frame or schema violations.' });

  // Detail: problem exchanges
  const problem = report.exchanges.filter((x) => x.status !== 'matched');
  const xRows = problem.map((x) => el('tr', { className: 'border-b border-gray-100 dark:border-gray-700' }, [
    el('td', { className: TD, text: x.messageId }),
    el('td', { className: TD, text: x.action ?? '—' }),
    el('td', { className: TD, text: x.status }),
    el('td', { className: TD, text: x.latencyMs == null ? '—' : `${x.latencyMs} ms` }),
  ]));
  const exchanges = problem.length > 0
    ? el('div', { className: 'mt-5' }, [el('h4', { className: 'font-semibold text-gray-800 dark:text-gray-100', text: `Unmatched / mismatched exchanges (${problem.length})` }), table(['Msg ID', 'Action', 'Status', 'Latency'], xRows)])
    : el('p', { className: 'mt-5 text-green-700 dark:text-green-400', text: '✅ All request↔response exchanges matched.' });

  body.replaceChildren(kpis, layers, latency, actionWise, violations, exchanges);
}

/** The section body: an on-demand "Run" button that lazy-loads the engine. */
export function renderValidationSection(r: AnalysisResult): HTMLElement {
  const info = el('p', { className: 'text-sm text-gray-600 dark:text-gray-400 mb-3',
    text: 'Type-aware L1–L3 validation (frame · schema · request↔response correlation) via the in-repo OCPP Validation Engine. Runs on demand.' });
  const result = el('div', { attrs: { 'data-validation-result': '' } });
  const btn = el('button', {
    className: 'bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg disabled:opacity-50',
    text: '🔎 Run Type-Aware Validation (L1–L3)', attrs: { type: 'button', 'data-run-validation': '' },
  }) as HTMLButtonElement;

  btn.addEventListener('click', async () => {
    const frames = framesFromMessages(r.messages);
    if (frames.length === 0) {
      result.replaceChildren(el('p', { className: 'mt-3 text-gray-500', text: 'No OCPP messages to validate.' }));
      return;
    }
    btn.disabled = true;
    btn.textContent = 'Validating…';
    try {
      const { validateBatch } = await import('../../../services/validation');
      renderValidationReport(result, validateBatch(frames));
    } catch (err) {
      result.replaceChildren(el('p', { className: 'mt-3 text-red-600 dark:text-red-400', text: 'Validation engine failed to load.' }));
      console.warn('Type-aware validation failed:', err);
    } finally {
      btn.disabled = false;
      btn.textContent = '🔎 Run Type-Aware Validation (L1–L3)';
    }
  });

  return el('div', {}, [info, btn, result]);
}
