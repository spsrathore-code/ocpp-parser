// Merge several parsed CMS files into one, offsetting each file's line numbers
// into the concatenated rawLogLines so the context viewer resolves the right line.
//
// Uses loop-append (not push(...spread)) so a large file's message array cannot
// overflow the JS argument-count cap — same guard as the text path's mergeParsed.

import { appendAll } from '../parse/concatChunks';
import type { CmsParsed } from './types';
import type { ParsedLines } from '../parse/parseLines';

export interface MergedCmsParsed {
  parsed: ParsedLines;
  rawLogLines: string[];
}

/** Combine per-file CMS parse outputs into one, with globally-correct lineNumbers. */
export function mergeCmsParsed(parts: CmsParsed[]): MergedCmsParsed {
  const parsed: ParsedLines = { messages: [], events: [], alerts: [], internalTxMap: new Map() };
  const rawLogLines: string[] = [];

  for (const part of parts) {
    const offset = rawLogLines.length;
    for (const m of part.messages) parsed.messages.push({ ...m, lineNumber: m.lineNumber + offset });
    for (const a of part.alerts) parsed.alerts.push({ ...a, lineNumber: a.lineNumber + offset });
    for (const e of part.events) parsed.events.push(e);
    part.internalTxMap.forEach((v, k) => parsed.internalTxMap.set(k, v));
    appendAll(rawLogLines, part.rawLogLines);
  }
  return { parsed, rawLogLines };
}
