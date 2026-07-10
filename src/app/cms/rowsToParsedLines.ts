// Core CMS mapping: normalized Excel rows -> the pipeline's ParsedLines.
//
// Each row carries a paired CALL + CALLRESULT. We emit them as two ParsedMessages
// sharing the msgId, so the existing `correlateMessages` links them exactly as it
// does for text logs — every downstream section then works unchanged.
//
// Design decisions (see docs/superpowers/specs/2026-07-08-cms-log-parser-design.md):
//  - D1: Alerts are derived from StatusNotification with errorCode != NoError,
//        because CMS Excel has no free-text alert lines.
//  - D2: timestamps normalized to UTC ISO (render layer shows IST).
//  - D3: one synthesized raw text line per message powers the context viewer.

import { parseJsonSafely } from '../parse/parseJsonSafely';
import { istToUtcIso } from './timestamps';
import { requestDirection, responseDirection } from './directions';
import type { CmsRow, CmsParsed } from './types';
import type { ParsedMessage, ParsedAlert, OcppRawMessage } from '../model/types';

/** errorCode values that are NOT faults (OCPP 1.6J StatusNotification.errorCode). */
const NON_FAULT_ERROR_CODES = new Set<string>(['NoError', '', 'N/A']);

interface StatusPayload {
  connectorId?: number | string;
  errorCode?: string;
  status?: string;
  info?: string;
  vendorErrorCode?: string;
}

/**
 * Turn normalized CMS rows into ParsedLines + the synthesized raw log lines.
 * `toUtcIso` converts a customer's wall-clock string to a UTC ISO instant; it
 * defaults to the CZ (IST) parser so existing callers are unchanged, and each
 * adapter passes its own (parseCmsWorkbook wires `adapter.toUtcIso`).
 */
export function cmsRowsToParsedLines(
  rows: CmsRow[],
  fileName: string,
  toUtcIso: (raw: string) => string | null = istToUtcIso,
): CmsParsed {
  const messages: ParsedMessage[] = [];
  const alerts: ParsedAlert[] = [];
  const rawLogLines: string[] = [];

  for (const row of rows) {
    const call = safeParse(row.requestString);
    // A valid request is an OCPP CALL: [2, msgId, action, payload].
    if (!Array.isArray(call) || call[0] !== 2 || typeof call[2] !== 'string') continue;

    const action = call[2] as string;
    const reqTs = toUtcIso(row.requestTime) ?? toUtcIso(row.responseTime) ?? '';

    rawLogLines.push(synthLine(row, 'REQ', reqTs, row.requestTime, row.requestString));
    messages.push({
      timestamp: reqTs,
      direction: requestDirection(action),
      message: call,
      lineNumber: rawLogLines.length,
      fileName,
    });

    // Response is optional: only emit when present and a well-formed CALLRESULT.
    if (row.responseString) {
      const result = safeParse(row.responseString);
      if (Array.isArray(result) && result[0] === 3) {
        // Empty responseTime = format has no separate response time (e.g. Mahindra's
        // single Created On) → leave the response timestamp blank so the Response
        // Time (ms) reads N/A rather than a fabricated 0. Formats with a real
        // response-time column (CZ) parse to a value and read 0 when equal.
        const respTs = toUtcIso(row.responseTime) ?? '';
        rawLogLines.push(synthLine(row, 'RESP', respTs, row.responseTime, row.responseString));
        messages.push({
          timestamp: respTs,
          direction: responseDirection(action),
          message: result,
          lineNumber: rawLogLines.length,
          fileName,
        });
      }
    }

    // D1 — derive an Alert from a faulted StatusNotification.
    if (action === 'StatusNotification') {
      const p = (call[3] ?? {}) as StatusPayload;
      const code = (p.errorCode ?? '').trim();
      if (!NON_FAULT_ERROR_CODES.has(code)) {
        alerts.push({
          timestamp: reqTs,
          chargerId: row.sheetName || 'N/A',
          outlet: p.connectorId != null ? String(p.connectorId) : 'N/A',
          code,
          message: p.info || p.status || code,
          session: 'N/A',
          lineNumber: messages[messages.length - 1]?.lineNumber ?? rawLogLines.length,
          fileName,
        });
      }
    }
  }

  // Excel logs carry no [OCPPRuntime]/Stored-transactionId lines, so there is no
  // internal-transaction-id source; the map stays empty (processTransactions copes).
  return { messages, alerts, events: [], internalTxMap: new Map(), rawLogLines };
}

/** Parse an OCPP string, returning null instead of throwing on malformed JSON. */
function safeParse(s: string): OcppRawMessage | null {
  try {
    const v = parseJsonSafely(s);
    return Array.isArray(v) ? (v as OcppRawMessage) : null;
  } catch {
    return null;
  }
}

/**
 * Synthesized log line for the context viewer. Leads with the canonical UTC
 * timestamp (matching ParsedMessage.timestamp, so the Debug-Info span scan agrees)
 * and appends the original IST wall-clock for human traceability.
 */
function synthLine(row: CmsRow, kind: 'REQ' | 'RESP', utcTs: string, wallTime: string, ocpp: string): string {
  const sr = row.srNo ? `#${row.srNo} ` : '';
  const ist = wallTime ? ` (IST ${wallTime})` : '';
  return `[${utcTs || 'N/A'}] ${sr}${row.sheetName} ${kind}${ist}: ${ocpp}`;
}
