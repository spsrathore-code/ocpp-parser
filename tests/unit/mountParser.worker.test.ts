// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { analyzeLogLines } from '../../src/app/analyze';
import { SAMPLE_LINES } from '../fixtures/sampleLines';

const autoSaveSpy = vi.fn();
vi.mock('../../src/app/render/repository/autoSaveUx', () => ({
  autoSaveWithUx: (...args: unknown[]) => { autoSaveSpy(...args); return Promise.resolve(); },
}));
vi.mock('../../src/app/render/repository/panel', () => ({ initLogRepository: vi.fn().mockResolvedValue(undefined) }));
vi.mock('../../src/app/render/repository/loadAnalyze', () => ({ loadAndAnalyzeFromRepo: vi.fn() }));
vi.mock('../../src/app/worker/runner', () => ({
  runAnalysis: vi.fn(async (_req: unknown, onProgress: (l: string, p?: number) => void) => {
    onProgress('File 1/1: Processing lines 5/5…', 100);
    onProgress('Correlating & analyzing…');
    return { result: analyzeLogLines(SAMPLE_LINES, 'sample.log') };
  }),
}));

import { mountParser } from '../../src/app/nav/mountParser';
import { runAnalysis } from '../../src/app/worker/runner';

function fakeFile(name: string, text: string): File {
  return { name, text: async () => text } as unknown as File;
}

describe('mountParser via runner', () => {
  it('runs analysis through the runner, updates progress, autosaves, renders', async () => {
    const root = document.createElement('div');
    document.body.appendChild(root);
    mountParser(root);
    const input = root.querySelector<HTMLInputElement>('#log-file-input')!;
    const btn = root.querySelector<HTMLButtonElement>('#parse-log-btn')!;
    Object.defineProperty(input, 'files', { value: [fakeFile('sample.log', SAMPLE_LINES.join('\n'))] });
    input.dispatchEvent(new Event('change'));
    btn.click();
    const container = root.querySelector<HTMLElement>('#parsed-data-container')!;
    for (let i = 0; i < 100 && container.textContent === ''; i++) await new Promise((r) => setTimeout(r, 20));

    expect(vi.mocked(runAnalysis)).toHaveBeenCalledTimes(1);
    expect(container.textContent).toContain('Boot Notifications');
    expect(autoSaveSpy).toHaveBeenCalledWith('sample.log', SAMPLE_LINES.join('\n'));
    expect(root.querySelector('#progress-text')).not.toBeNull();
    expect(btn.disabled).toBe(false);
  });
});
