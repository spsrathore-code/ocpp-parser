// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { cmsRowsToParsedLines } from '../../src/app/cms/rowsToParsedLines';
import { czAdapter } from '../../src/app/cms/adapters/cz';
import type { CmsRow } from '../../src/app/cms/types';

// The real Excel parse is proven headlessly by cms.parseCmsWorkbook.test.ts (node
// env). xlsx changes code paths under jsdom, so here we mock the workbook parse and
// verify the VIEW WIRING: file input -> analyze() -> renderResults() -> source banner.
vi.mock('../../src/app/cms/parseCmsWorkbook', () => ({
  parseCmsWorkbook: vi.fn(async (_ab: ArrayBuffer, fileName: string) => {
    const rows: CmsRow[] = [
      { requestString: '[2,"h","Heartbeat",{}]', responseString: '[3,"h",{"currentTime":"2025-08-07T18:32:42.764Z"}]', requestTime: '08/08/2025, 00:02:42', responseTime: '08/08/2025, 00:02:42', sheetName: 'MH0055' },
      { requestString: '[2,"s","StatusNotification",{"connectorId":1,"errorCode":"GroundFailure","status":"Faulted"}]', responseString: '[3,"s",{}]', requestTime: '08/08/2025, 00:03:00', responseTime: '08/08/2025, 00:03:00', sheetName: 'MH0055' },
    ];
    return { parsed: cmsRowsToParsedLines(rows, fileName), adapter: czAdapter, chargers: ['MH0055'] };
  }),
}));

import { mountCmsParser } from '../../src/app/cms/mountCmsParser';

function fakeFile(name: string): File {
  return { name, arrayBuffer: async () => new ArrayBuffer(8) } as unknown as File;
}

describe('mountCmsParser view wiring', () => {
  it('parses an upload and renders analysis sections + source banner', async () => {
    const root = document.createElement('div');
    document.body.appendChild(root);
    mountCmsParser(root);

    const input = root.querySelector<HTMLInputElement>('#cms-log-file-input')!;
    const btn = root.querySelector<HTMLButtonElement>('#cms-parse-btn')!;
    Object.defineProperty(input, 'files', { value: [fakeFile('CZ.xlsx')] });
    input.dispatchEvent(new Event('change'));
    expect(btn.disabled).toBe(false);

    btn.click();
    const container = root.querySelector<HTMLElement>('#cms-parsed-data-container')!;
    for (let i = 0; i < 100 && container.textContent === ''; i++) await new Promise((r) => setTimeout(r, 20));

    expect(container.textContent).toContain('Heartbeats');
    expect(container.textContent).toContain('Status Notifications');
    expect(container.textContent).toContain('Alerts'); // derived from the faulted StatusNotification
    expect(container.textContent).not.toContain('Failed to process');

    const info = root.querySelector<HTMLElement>('#cms-source-info')!;
    expect(info.classList.contains('hidden')).toBe(false);
    expect(info.textContent).toContain('CZ');
    expect(info.textContent).toContain('MH0055');
  });

  it('shows an error panel when parsing throws', async () => {
    const mod = await import('../../src/app/cms/parseCmsWorkbook');
    vi.mocked(mod.parseCmsWorkbook).mockRejectedValueOnce(new Error('Unrecognized CMS log format'));

    const root = document.createElement('div');
    document.body.appendChild(root);
    mountCmsParser(root);
    const input = root.querySelector<HTMLInputElement>('#cms-log-file-input')!;
    const btn = root.querySelector<HTMLButtonElement>('#cms-parse-btn')!;
    Object.defineProperty(input, 'files', { value: [fakeFile('bad.xlsx')] });
    input.dispatchEvent(new Event('change'));

    btn.click();
    const container = root.querySelector<HTMLElement>('#cms-parsed-data-container')!;
    for (let i = 0; i < 100 && container.textContent === ''; i++) await new Promise((r) => setTimeout(r, 20));

    expect(container.textContent).toContain('Failed to process');
    expect(container.textContent).toContain('Unrecognized CMS log format');
    expect(btn.disabled).toBe(false); // re-enabled after failure
  });
});
