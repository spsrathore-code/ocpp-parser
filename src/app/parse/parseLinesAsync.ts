// Chunked, UI-yielding parse driver — faithful restoration of the legacy
// `parseOcppLogsAsync` (HTML 1619: 1000-line chunks, progress, yield between chunks)
// that keeps the browser responsive on large files instead of blocking the main
// thread for one long synchronous parse.
//
// It reuses the pure per-line `parseLines` per chunk, threading ONE shared
// internalTxMap across chunks (so the backup-source "only if absent" check sees
// global state) and passing each chunk's absolute `startLine` offset (so line
// numbers stay file-absolute for the context-viewer). Output is identical to a
// single synchronous `parseLines` over the whole array — verified by parity tests.

import { parseLines, type ParsedLines } from './parseLines';
import type { InternalTxMap } from '../model/types';

export interface ParseAsyncOptions {
  /** Lines per chunk before yielding to the event loop. Legacy default: 1000. */
  chunkSize?: number;
  /** Called after each chunk with (linesProcessed, totalLines) for a progress UI. */
  onProgress?: (done: number, total: number) => void;
}

/** Yield to the event loop so the browser can paint between chunks. */
const yieldToEventLoop = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0));

export async function parseLinesAsync(
  lines: string[],
  fileName: string,
  opts: ParseAsyncOptions = {},
): Promise<ParsedLines> {
  const chunkSize = opts.chunkSize ?? 1000;
  const total = lines.length;

  const messages: ParsedLines['messages'] = [];
  const events: ParsedLines['events'] = [];
  const alerts: ParsedLines['alerts'] = [];
  const internalTxMap: InternalTxMap = new Map(); // shared accumulator across chunks

  for (let i = 0; i < total; i += chunkSize) {
    const chunk = lines.slice(i, i + chunkSize);
    const part = parseLines(chunk, fileName, i, internalTxMap);
    // messages/events/alerts are order-independent concat (chunks are sequential);
    // internalTxMap is the same shared reference, already mutated in place.
    messages.push(...part.messages);
    events.push(...part.events);
    alerts.push(...part.alerts);

    opts.onProgress?.(Math.min(i + chunkSize, total), total);
    if (i + chunkSize < total) await yieldToEventLoop();
  }

  return { messages, events, alerts, internalTxMap };
}
