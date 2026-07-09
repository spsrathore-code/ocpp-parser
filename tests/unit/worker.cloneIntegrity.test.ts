// Spec §4 guarantee: AnalysisResult must survive the worker's structured-clone
// boundary intact. If anyone ever adds a non-clonable field (function, DOM node,
// class instance relying on its prototype), this fails in CI — not in the browser.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { handleRequest } from '../../src/app/worker/protocol';
import { SAMPLE_LINES } from '../fixtures/sampleLines';

describe('AnalysisResult structured-clone integrity', () => {
  it('text-path result deep-equals its structuredClone', async () => {
    const file = new File([SAMPLE_LINES.join('\n')], 'sample.log');
    const { result } = await handleRequest({ kind: 'text', files: [file] }, () => {});
    const clone = structuredClone(result);
    expect(clone.internalTxMap).toBeInstanceOf(Map);
    expect(clone).toEqual(result);
  });

  it('cms-path result deep-equals its structuredClone (real CZ sample)', async () => {
    const buf = readFileSync(resolve(__dirname, '../../data/samples/CZ CMS Logs Sample.xlsx'));
    const { result } = await handleRequest({ kind: 'cms', files: [new File([buf], 'CZ.xlsx')] }, () => {});
    const clone = structuredClone(result);
    expect(clone.internalTxMap).toBeInstanceOf(Map);
    expect(clone.messages).toHaveLength(result.messages.length);
    expect(clone).toEqual(result);
  });
});
