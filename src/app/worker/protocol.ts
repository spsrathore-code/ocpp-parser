// Worker-side analysis protocol: request/reply message types + the pure
// handleRequest() that runs the existing pipelines. All heavy compute funnels
// through here so the worker file itself stays dispatch-only (and this logic
// stays unit-testable in node, where Worker doesn't exist).
//
// File objects are structured-cloneable, so requests carry File[] and the
// READING (file.text() / arrayBuffer, line split, XLSX.read) also happens off
// the main thread.

import { parseLinesAsync } from '../parse/parseLinesAsync';
import { appendAll } from '../parse/concatChunks';
import { analyze, mergeParsed, type AnalysisResult } from '../analyze';
import type { ParsedLines } from '../parse/parseLines';

export type AnalysisRequest =
  | { kind: 'text'; files: File[] }
  | { kind: 'cms'; files: File[] };

/** Per-file CMS outcome for the source-info banner. */
export interface CmsFileOutcome {
  name: string;
  label: string;
  chargers: string[];
  rows: number;
}

export interface AnalysisPayload {
  result: AnalysisResult;
  cms?: { outcomes: CmsFileOutcome[] };
}

export type ProgressFn = (label: string, pct?: number) => void;

export type WorkerReply =
  | { kind: 'progress'; label: string; pct?: number }
  | { kind: 'result'; payload: AnalysisPayload }
  | { kind: 'error'; message: string };

/** Run the requested pipeline. Throws on failure (caller converts to 'error'). */
export async function handleRequest(req: AnalysisRequest, progress: ProgressFn): Promise<AnalysisPayload> {
  if (req.kind === 'text') return handleText(req.files, progress);
  return handleCms(req.files, progress);
}

async function handleText(files: File[], progress: ProgressFn): Promise<AnalysisPayload> {
  const parts: ParsedLines[] = [];
  const allLines: string[] = [];
  const names: string[] = [];
  for (let fi = 0; fi < files.length; fi++) {
    const file = files[fi];
    const lines = (await file.text()).split(/\r?\n/);
    // Same chunked parse + progress format as the previous main-thread path.
    const parsed = await parseLinesAsync(lines, file.name, {
      onProgress: (done, total) => {
        const pct = total > 0 ? Math.round((done / total) * 100) : 100;
        progress(`File ${fi + 1}/${files.length}: Processing lines ${done}/${total}…`, pct);
      },
    });
    parts.push(parsed);
    appendAll(allLines, lines);
    names.push(file.name);
  }
  progress('Correlating & analyzing…');
  return { result: analyze(mergeParsed(parts), allLines, names) };
}

async function handleCms(_files: File[], _progress: ProgressFn): Promise<AnalysisPayload> {
  throw new Error('cms path implemented in Task 2');
}
