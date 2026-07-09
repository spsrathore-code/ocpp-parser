import { describe, it, expect } from 'vitest';
import { handleRequest } from '../../src/app/worker/protocol';
import { analyzeLogLines } from '../../src/app/analyze';
import { SAMPLE_LINES } from '../fixtures/sampleLines';

const text = SAMPLE_LINES.join('\n');

describe('handleRequest — text', () => {
  it('produces the same AnalysisResult as the direct pipeline', async () => {
    const file = new File([text], 'sample.log');
    const labels: string[] = [];
    const { result, cms } = await handleRequest(
      { kind: 'text', files: [file] },
      (label) => labels.push(label),
    );
    const direct = analyzeLogLines(SAMPLE_LINES, 'sample.log');
    expect(result.messages).toHaveLength(direct.messages.length);
    expect(result.transactions).toEqual(direct.transactions);
    expect(result.messageGroups.BootNotification).toHaveLength(1);
    expect(result.rawLogLines).toEqual(SAMPLE_LINES);
    expect(cms).toBeUndefined();
    expect(labels.some((l) => l.includes('File 1/1'))).toBe(true);
    expect(labels.some((l) => l.toLowerCase().includes('analyz'))).toBe(true);
  });

  it('merges multiple files in order', async () => {
    const a = new File([text], 'a.log');
    const b = new File([text], 'b.log');
    const { result } = await handleRequest({ kind: 'text', files: [a, b] }, () => {});
    expect(result.filesProcessed).toEqual(['a.log', 'b.log']);
    expect(result.rawLogLines).toHaveLength(SAMPLE_LINES.length * 2);
  });
});
