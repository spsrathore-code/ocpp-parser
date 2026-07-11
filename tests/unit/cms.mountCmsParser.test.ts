// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { cmsRowsToParsedLines } from '../../src/app/cms/rowsToParsedLines';
import { analyze } from '../../src/app/analyze';
import type { CmsRow } from '../../src/app/cms/types';

// Real Excel parsing is proven in node-env tests (worker.protocol.cms). Here we
// mock the runner and verify the VIEW WIRING: upload → progress → sections +
// source banner; error → panel.
const runAnalysisMock = vi.fn();
vi.mock('../../src/app/worker/runner', () => ({ runAnalysis: (...a: never[]) => runAnalysisMock(...a) }));

import { mountCmsParser } from '../../src/app/cms/mountCmsParser';

function okPayload(fileName: string) {
  const rows: CmsRow[] = [
    { requestString: '[2,"h","Heartbeat",{}]', responseString: '[3,"h",{"currentTime":"2025-08-07T18:32:42.764Z"}]', requestTime: '08/08/2025, 00:02:42', responseTime: '08/08/2025, 00:02:42', sheetName: 'MH0055' },
    { requestString: '[2,"s","StatusNotification",{"connectorId":1,"errorCode":"GroundFailure","status":"Faulted"}]', responseString: '[3,"s",{}]', requestTime: '08/08/2025, 00:03:00', responseTime: '08/08/2025, 00:03:00', sheetName: 'MH0055' },
  ];
  const parsed = cmsRowsToParsedLines(rows, fileName);
  return {
    result: analyze(parsed, parsed.rawLogLines, [fileName]),
    cms: { outcomes: [{ name: fileName, label: 'CZ', chargers: ['MH0055'], rows: parsed.messages.length }] },
  };
}

function fakeFile(name: string): File {
  return { name } as unknown as File;
}

async function mountAndParse(files: File[]) {
  const root = document.createElement('div');
  document.body.appendChild(root);
  mountCmsParser(root);
  const input = root.querySelector<HTMLInputElement>('#cms-log-file-input')!;
  const btn = root.querySelector<HTMLButtonElement>('#cms-parse-btn')!;
  Object.defineProperty(input, 'files', { value: files });
  input.dispatchEvent(new Event('change'));
  btn.click();
  const container = root.querySelector<HTMLElement>('#cms-parsed-data-container')!;
  for (let i = 0; i < 100 && container.textContent === ''; i++) await new Promise((r) => setTimeout(r, 20));
  return { root, container, btn };
}

describe('mountCmsParser via runner', () => {
  it('renders sections + source banner from the runner payload', async () => {
    runAnalysisMock.mockImplementationOnce(async (_req: unknown, onProgress: (l: string) => void) => {
      onProgress('Reading CZ.xlsx (1/1)…');
      return okPayload('CZ.xlsx');
    });
    const { root, container } = await mountAndParse([fakeFile('CZ.xlsx')]);
    expect(container.textContent).toContain('Heartbeats');
    expect(container.textContent).toContain('Alerts');
    const info = root.querySelector<HTMLElement>('#cms-source-info')!;
    expect(info.classList.contains('hidden')).toBe(false);
    expect(info.textContent).toContain('CZ');
    expect(info.textContent).toContain('MH0055');
  });

  it('shows the error panel with the verbatim message when the runner rejects', async () => {
    runAnalysisMock.mockRejectedValueOnce(new Error('Unrecognized CMS log format'));
    const { container, btn } = await mountAndParse([fakeFile('bad.xlsx')]);
    expect(container.textContent).toContain('Failed to process');
    expect(container.textContent).toContain('Unrecognized CMS log format');
    expect(btn.disabled).toBe(false);
  });
});
