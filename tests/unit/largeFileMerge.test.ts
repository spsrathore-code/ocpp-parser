// Regression: large multi-file uploads must not overflow the JS arg-count limit.
// A real sample (MH0135, 315k lines) exceeds the `push(...spread)` / apply cap,
// which previously threw "Maximum call stack size exceeded" and produced no results.
import { describe, it, expect } from 'vitest';
import { mergeParsed } from '../../src/app/analyze';
import { concatChunks } from '../../src/app/parse/concatChunks';
import type { ParsedLines } from '../../src/app/parse/parseLines';
import type { ParsedMessage } from '../../src/app/model/types';

const N = 300_001; // over the confirmed spread-overflow threshold

function bigParsed(tag: string): ParsedLines {
  const messages: ParsedMessage[] = new Array(N);
  for (let i = 0; i < N; i++) {
    messages[i] = { timestamp: 't', direction: 'sent', message: [2, `${tag}-${i}`, 'Heartbeat', {}], lineNumber: i + 1, fileName: tag };
  }
  return { messages, events: [], alerts: [], internalTxMap: new Map() };
}

describe('large multi-file accumulation does not overflow', () => {
  it('mergeParsed concatenates 300k+ messages across files without throwing', () => {
    const merged = mergeParsed([bigParsed('A'), bigParsed('B')]);
    expect(merged.messages.length).toBe(2 * N);
  });

  it('concatChunks flattens 300k+ lines across files without throwing', () => {
    const a = new Array(N).fill('x');
    const b = new Array(N).fill('y');
    const all = concatChunks([a, b]);
    expect(all.length).toBe(2 * N);
  });
});
