// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';

interface CmsRequest { kind: string; files: unknown[]; adapterId?: string }
const runAnalysisMock = vi.fn(async (_req: CmsRequest, _onProgress?: (l: string) => void) => ({
  result: { messages: [], alerts: [], messageGroups: {}, transactions: [] },
  cms: { outcomes: [] },
}));
vi.mock('../../src/app/worker/runner', () => ({ runAnalysis: (req: CmsRequest, onProgress?: (l: string) => void) => runAnalysisMock(req, onProgress) }));
// Avoid pulling the full render pipeline for this wiring test.
vi.mock('../../src/app/render/renderResults', () => ({ renderResults: vi.fn() }));

import { renderCmsShell } from '../../src/app/cms/renderCmsShell';
import { mountCmsParser } from '../../src/app/cms/mountCmsParser';

describe('CMS customer selector', () => {
  it('renders Auto-detect + one option per registered adapter', () => {
    const root = document.createElement('div');
    renderCmsShell(root);
    const sel = root.querySelector<HTMLSelectElement>('#cms-customer-select')!;
    const opts = [...sel.options].map((o) => o.textContent);
    expect(opts[0]).toMatch(/auto-detect/i);
    expect(opts).toContain('CZ');
    expect(opts).toContain('Mahindra');
    // Default is Auto-detect (empty value → undefined adapterId).
    expect(sel.value).toBe('');
  });

  it('passes the chosen customer to runAnalysis as adapterId', async () => {
    runAnalysisMock.mockClear();
    const root = document.createElement('div');
    document.body.appendChild(root);
    mountCmsParser(root);
    const sel = root.querySelector<HTMLSelectElement>('#cms-customer-select')!;
    const input = root.querySelector<HTMLInputElement>('#cms-log-file-input')!;
    const btn = root.querySelector<HTMLButtonElement>('#cms-parse-btn')!;

    sel.value = 'mahindra';
    Object.defineProperty(input, 'files', { value: [{ name: 'x.xlsx' } as File] });
    input.dispatchEvent(new Event('change'));
    btn.click();
    await new Promise((r) => setTimeout(r, 30));

    expect(runAnalysisMock).toHaveBeenCalledTimes(1);
    expect(runAnalysisMock.mock.calls[0][0]).toMatchObject({ kind: 'cms', adapterId: 'mahindra' });
  });

  it('sends adapterId undefined when Auto-detect is selected', async () => {
    runAnalysisMock.mockClear();
    const root = document.createElement('div');
    document.body.appendChild(root);
    mountCmsParser(root);
    const input = root.querySelector<HTMLInputElement>('#cms-log-file-input')!;
    const btn = root.querySelector<HTMLButtonElement>('#cms-parse-btn')!;
    Object.defineProperty(input, 'files', { value: [{ name: 'x.xlsx' } as File] });
    input.dispatchEvent(new Event('change'));
    btn.click();
    await new Promise((r) => setTimeout(r, 30));

    expect(runAnalysisMock.mock.calls[0][0]).toMatchObject({ kind: 'cms' });
    expect(runAnalysisMock.mock.calls[0][0].adapterId).toBeUndefined();
  });
});
