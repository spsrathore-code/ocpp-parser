// Type-Aware Validation (L1–L3) section — Phase 6 integration of the in-repo
// OCPP Validation Engine (src/services/validation). Feeds the parser's already-
// extracted frames into validateBatch and renders the ValidationReport.
//
// New capability beyond v2026.05.14 parity. Additive: no existing section changes.
// Arch: docs/superpowers/specs/2026-06-22-parser-phase6-validation-integration-arch.md
//
// The engine pulls in typed-ocpp (~822 kb) so it is LAZY-loaded (dynamic import →
// Vite code-splits it). Run is on-demand (button). All report cells are rendered as
// textContent (engine /cso note: Violation.message/detail may carry raw log payload).

import { el } from '../dom';
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
  return el('div', { className: 'overflow-x-auto mt-3' }, [
    el('table', { className: 'min-w-full text-sm' }, [
      el('thead', { className: 'bg-gray-100 dark:bg-gray-700' }, [
        el('tr', {}, headers.map((h) => el('th', { className: TH, text: h }))),
      ]),
      el('tbody', {}, rows),
    ]),
  ]);
}

/** Render a ValidationReport into `body` (replaces prior content). textContent only. */
export function renderValidationReport(body: HTMLElement, report: ValidationReport): void {
  const s = report.summary;
  const cards = el('div', { className: 'grid grid-cols-2 md:grid-cols-6 gap-3' }, [
    card('Total', String(s.total)),
    card('Valid', String(s.valid), 'text-green-600 dark:text-green-400'),
    card('Invalid', String(s.invalid), s.invalid > 0 ? 'text-red-600 dark:text-red-400' : ''),
    card('Orphan Calls', String(s.orphanCalls), s.orphanCalls > 0 ? 'text-amber-600 dark:text-amber-400' : ''),
    card('Orphan Resp.', String(s.orphanResponses), s.orphanResponses > 0 ? 'text-amber-600 dark:text-amber-400' : ''),
    card('Avg Latency', s.avgLatencyMs == null ? '—' : `${s.avgLatencyMs.toFixed(0)} ms`),
  ]);

  // Violations (L1/L2 from per-message results; L3 from exchanges)
  const vRows: HTMLElement[] = [];
  for (const m of report.messages) {
    for (const v of m.violations) {
      vRows.push(el('tr', { className: 'border-b border-gray-100 dark:border-gray-700' }, [
        el('td', { className: TD, text: m.messageId ?? '—' }),
        el('td', { className: TD, text: m.kind ?? '—' }),
        el('td', { className: TD, text: m.action ?? '—' }),
        el('td', { className: TD, text: v.layer }),
        el('td', { className: TD, text: v.code }),
        el('td', { className: TD, text: v.message }),
        el('td', { className: TD, text: v.path ?? '' }),
      ]));
    }
  }
  const violations = vRows.length > 0
    ? el('div', {}, [el('h4', { className: 'mt-5 font-semibold text-gray-800 dark:text-gray-100', text: `Violations (${vRows.length})` }),
        table(['Msg ID', 'Kind', 'Action', 'Layer', 'Code', 'Message', 'Path'], vRows)])
    : el('p', { className: 'mt-5 text-green-700 dark:text-green-400', text: '✅ No L1/L2 frame or schema violations.' });

  // Problem exchanges (orphans / mismatches)
  const problem = report.exchanges.filter((x) => x.status !== 'matched');
  const xRows = problem.map((x) => el('tr', { className: 'border-b border-gray-100 dark:border-gray-700' }, [
    el('td', { className: TD, text: x.messageId }),
    el('td', { className: TD, text: x.action ?? '—' }),
    el('td', { className: TD, text: x.status }),
    el('td', { className: TD, text: x.latencyMs == null ? '—' : `${x.latencyMs} ms` }),
  ]));
  const exchanges = problem.length > 0
    ? el('div', {}, [el('h4', { className: 'mt-5 font-semibold text-gray-800 dark:text-gray-100', text: `Unmatched / mismatched exchanges (${problem.length})` }),
        table(['Msg ID', 'Action', 'Status', 'Latency'], xRows)])
    : el('p', { className: 'mt-5 text-green-700 dark:text-green-400', text: '✅ All request↔response exchanges matched.' });

  body.replaceChildren(cards, violations, exchanges);
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
