// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import {
  framesFromMessages,
  renderValidationReport,
  renderValidationSection,
} from '../../src/app/render/sections/validation';
import { validateBatch } from '../../src/services/validation';
import type { ValidationReport } from '../../src/services/validation';
import type { ParsedMessage } from '../../src/app/model/types';
import type { AnalysisResult } from '../../src/app/analyze';

function msg(message: unknown[], timestamp = '2025-01-01T00:00:00Z'): ParsedMessage {
  return { timestamp, direction: 'sent', message, lineNumber: 1, fileName: 'l' } as ParsedMessage;
}
function resultWith(messages: ParsedMessage[]): AnalysisResult {
  return { messages } as unknown as AnalysisResult;
}

describe('framesFromMessages (adapter fidelity — Test plan #1)', () => {
  it('passes each message frame + timestamp through unmodified', () => {
    const m = [msg([2, 'a', 'Heartbeat', {}]), msg([3, 'a', {}], '2025-01-01T00:00:01Z')];
    const frames = framesFromMessages(m);
    expect(frames).toHaveLength(2);
    expect(frames[0].frame).toBe(m[0].message); // same reference, no mutation
    expect(frames[0].ts).toBe('2025-01-01T00:00:00Z');
    expect(frames[1].ts).toBe('2025-01-01T00:00:01Z');
  });
});

describe('renderValidationReport (cards + tables, textContent)', () => {
  const report: ValidationReport = {
    messages: [
      { ok: false, kind: 'Call', action: 'StatusNotification', messageId: 'm1',
        violations: [{ layer: 'L2', code: 'SCHEMA_VIOLATION', message: 'missing connectorId', path: '/connectorId' }] },
    ],
    exchanges: [{ messageId: 'm2', action: 'Heartbeat', status: 'orphan-call', violations: [] }],
    summary: { total: 3, valid: 1, invalid: 1, orphanCalls: 1, orphanResponses: 0, avgLatencyMs: 12.4 },
  };

  it('renders summary cards and a violations row', () => {
    const body = document.createElement('div');
    renderValidationReport(body, report);
    expect(body.textContent).toContain('Frames Processed');
    expect(body.textContent).toContain('Compliance Score');
    expect(body.textContent).toContain('L1 — RPC Frame'); // layer breakdown visible
    expect(body.textContent).toContain('SCHEMA_VIOLATION');
    expect(body.textContent).toContain('/connectorId');
    expect(body.textContent).toContain('orphan-call'); // problem exchange listed
    expect(body.textContent).toContain('12.4 ms'); // avg RTT
  });

  it('shows positive states when clean (Test plan #2-ish)', () => {
    const body = document.createElement('div');
    renderValidationReport(body, { messages: [], exchanges: [], summary: { total: 0, valid: 0, invalid: 0, orphanCalls: 0, orphanResponses: 0, avgLatencyMs: null } });
    expect(body.textContent).toContain('No L1/L2');
    expect(body.textContent).toContain('All request');
  });

  it('renders violation text as textContent — no XSS (Test plan #7)', () => {
    const body = document.createElement('div');
    renderValidationReport(body, {
      messages: [{ ok: false, messageId: 'm', violations: [{ layer: 'L2', code: 'X', message: '<img src=x onerror=alert(1)>' }] }],
      exchanges: [], summary: { total: 1, valid: 0, invalid: 1, orphanCalls: 0, orphanResponses: 0, avgLatencyMs: null },
    });
    expect(body.querySelector('img')).toBeNull(); // not parsed as HTML
    expect(body.textContent).toContain('<img src=x onerror=alert(1)>'); // literal text
  });
});

describe('renderValidationSection (on-demand button + empty-state)', () => {
  it('renders the info + run button', () => {
    const body = renderValidationSection(resultWith([msg([2, 'a', 'Heartbeat', {}])]));
    expect(body.querySelector('[data-run-validation]')).not.toBeNull();
    expect(body.textContent).toContain('Type-aware');
  });

  it('shows empty-state when there are no messages (Test plan #6)', async () => {
    const body = renderValidationSection(resultWith([]));
    body.querySelector<HTMLButtonElement>('[data-run-validation]')!.click();
    await Promise.resolve();
    expect(body.textContent).toContain('No OCPP messages to validate');
  });
});

describe('adapter → engine wiring (end-to-end smoke — Test plan #2/#4)', () => {
  it('validateBatch over framesFromMessages returns a report with the frame total', () => {
    const messages = [msg([2, 'a', 'Heartbeat', {}]), msg([3, 'a', { currentTime: '2025-01-01T00:00:00Z' }])];
    const report = validateBatch(framesFromMessages(messages));
    expect(report.summary.total).toBe(2);
    expect(Array.isArray(report.messages)).toBe(true);
    expect(Array.isArray(report.exchanges)).toBe(true);
  });
});
