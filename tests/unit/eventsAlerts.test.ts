// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import type { ParsedEvent, ParsedAlert } from '../../src/app/model/types';
import type { AnalysisResult } from '../../src/app/analyze';
import { renderEvents } from '../../src/app/render/sections/events';
import { renderAlerts } from '../../src/app/render/sections/alerts';

const ev = (over: Partial<ParsedEvent>): ParsedEvent =>
  ({ timestamp: '2025-08-22T00:00:00Z', type: 'info', chargerId: 'CP1', outlet: '1', payload: { a: 1 }, lineNumber: 1, fileName: 'log.txt', ...over });
const al = (over: Partial<ParsedAlert>): ParsedAlert =>
  ({ timestamp: '2025-08-22T00:00:00Z', chargerId: 'CP1', outlet: '1', code: 'E01', message: 'Overtemp', session: 'S1', lineNumber: 1, fileName: 'log.txt', ...over });

describe('renderEvents', () => {
  const r = { events: [ev({ type: 'alert', outlet: '1' }), ev({ type: 'info', outlet: '2' })] } as unknown as AnalysisResult;
  const body = renderEvents(r);

  it('renders 7 columns (Context Analysis deferred) and one row per event', () => {
    const headers = [...body.querySelectorAll('#events-table thead th')].map((th) => th.textContent);
    expect(headers).toEqual(['S.No.', 'File Name', 'Time Stamp', 'Type', 'Charger ID', 'Outlet', 'Payload']);
    expect(body.querySelectorAll('#events-table tbody tr')).toHaveLength(2);
  });

  it('filters rows by type substring', () => {
    const typeInput = body.querySelector('input') as HTMLInputElement; // first filter input = Type
    typeInput.value = 'alert';
    typeInput.dispatchEvent(new Event('input'));
    const rows = [...body.querySelectorAll('#events-table tbody tr')] as HTMLElement[];
    expect(rows[0].style.display).toBe('');
    expect(rows[1].style.display).toBe('none');
  });
});

describe('renderAlerts', () => {
  const r = { alerts: [al({ code: 'E01' }), al({ code: 'E99' })] } as unknown as AnalysisResult;
  const body = renderAlerts(r);

  it('renders 8 columns (Context Analysis deferred) and one row per alert', () => {
    const headers = [...body.querySelectorAll('#alerts-table thead th')].map((th) => th.textContent);
    expect(headers).toEqual(['S.No.', 'File Name', 'Time Stamp', 'Charger ID', 'Outlet', 'Code', 'Message', 'Session']);
    expect(body.querySelectorAll('#alerts-table tbody tr')).toHaveLength(2);
  });

  it('filters rows by code substring', () => {
    const inputs = body.querySelectorAll('input'); // [Outlet, Code, Message]
    const codeInput = inputs[1] as HTMLInputElement;
    codeInput.value = 'e99';
    codeInput.dispatchEvent(new Event('input'));
    const rows = [...body.querySelectorAll('#alerts-table tbody tr')] as HTMLElement[];
    expect(rows[0].style.display).toBe('none');
    expect(rows[1].style.display).toBe('');
  });
});
