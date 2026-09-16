// Stage 1 of the Uptime pipeline: CmsRow[] -> ExtractRow[] (Analysis_Spec_MD §3).
//
// The workbook does this with string FIND formulas because Excel has no JSON
// parser. We parse properly, which is strictly more correct: the string
// extractor only works for quoted string values (exactly why connectorId needed
// its own formula there) and would mis-read any value containing an escaped
// quote.
//
// Timestamp source rule (§8): use the Request payload `timestamp` where present;
// Heartbeat and BootNotification carry none, so the Response `currentTime` is
// their only time source. Both are kept per row — the analysis window is a
// MIN/MAX across both, over every row.

import type { CmsRow } from '../cms/types';
import type { ExtractRow } from './types';

/** OCPP CALL: [2, uniqueId, action, payload]. CALLRESULT: [3, uniqueId, payload]. */
const CALL_ACTION_INDEX = 2;
const CALL_PAYLOAD_INDEX = 3;
const RESULT_PAYLOAD_INDEX = 2;

/** Cheap scans used where a full parse would be wasted (see the MeterValues gate). */
const TIMESTAMP_RE = /"timestamp"\s*:\s*"([^"]+)"/;
const CURRENT_TIME_RE = /"currentTime"\s*:\s*"([^"]+)"/;
/** BootNotification.conf carries the Heartbeat interval the CMS assigned. */
const INTERVAL_RE = /"interval"\s*:\s*(\d+)/;
const ACTION_RE = /^\s*\[\s*2\s*,\s*"(?:[^"\\]|\\.)*"\s*,\s*"((?:[^"\\]|\\.)*)"/;

/** MeterValues are 70-85% of a log and feed none of these analyses (§14). */
const METER_VALUES = 'MeterValues';
/** The Mahindra exporter caps a cell at 4000 chars, cutting large payloads mid-JSON. */
const TRUNCATION_LIMIT = 4000;

type Payload = Record<string, unknown>;

/**
 * Parse an ISO instant to epoch ms, TRUNCATED TO WHOLE SECONDS.
 *
 * The workbook reads times with `MID(<iso>, 12, 8)` — an HH:MM:SS slice that
 * discards the fractional part — so every downstream duration is whole-second.
 * Keeping milliseconds here makes durations disagree with the reference by ±1 s
 * essentially at random, depending on which side of a second each bound fell.
 * Truncation (not rounding) is what the string slice does.
 */
function toEpoch(iso: unknown): number | null {
  if (typeof iso !== 'string' || iso === '') return null;
  const ms = Date.parse(iso);
  return Number.isNaN(ms) ? null : Math.floor(ms / 1000) * 1000;
}

/** Read a string-valued key, tolerating numbers (vendorErrorCode is often numeric). */
function str(payload: Payload | null, key: string): string {
  const v = payload?.[key];
  if (v === undefined || v === null) return '';
  return typeof v === 'string' ? v : String(v);
}

function num(payload: Payload | null, key: string): number | null {
  const v = payload?.[key];
  return typeof v === 'number' && Number.isFinite(v) ? v : null;
}

function safeParseArray(raw: string): unknown[] | null {
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null; // truncated or malformed row — degrade, never throw
  }
}

/** Action name without paying for a full parse of a huge payload. */
function actionOf(raw: string, parsed: unknown[] | null): string {
  if (parsed && typeof parsed[CALL_ACTION_INDEX] === 'string') return parsed[CALL_ACTION_INDEX] as string;
  return ACTION_RE.exec(raw)?.[1] ?? '';
}

/**
 * Parse CMS rows into the analysis's own Extract representation.
 * `sheetName` becomes the site identity, so one sheet is one site.
 */
export function extractRows(rows: CmsRow[]): ExtractRow[] {
  const out: ExtractRow[] = [];

  for (let i = 0; i < rows.length; i++) {
    const raw = rows[i];
    const requestLen = raw.requestString.length;

    // Response currentTime is scanned rather than parsed: it is a short, flat
    // payload, and this runs on every row including the MeterValues bulk.
    const respCurrentTimeUtc = toEpoch(CURRENT_TIME_RE.exec(raw.responseString)?.[1]);

    // Peek at the action before deciding whether the payload is worth parsing.
    const eventName = actionOf(raw.requestString, null) || actionOf(raw.requestString, safeParseArray(raw.requestString));
    const isMeterValues = eventName === METER_VALUES;

    // The MeterValues gate (§14): skip key extraction, keep the timestamp. The
    // window is a MIN/MAX over all rows, so blanking these would shift Total
    // Available Time and therefore move every uptime %.
    let payload: Payload | null = null;
    let timestampUtc: number | null = null;
    if (isMeterValues) {
      timestampUtc = toEpoch(TIMESTAMP_RE.exec(raw.requestString)?.[1]);
    } else {
      const parsed = safeParseArray(raw.requestString);
      const body = parsed?.[CALL_PAYLOAD_INDEX];
      payload = body && typeof body === 'object' ? (body as Payload) : null;
      timestampUtc = toEpoch(payload?.timestamp);
    }

    const errorCode = str(payload, 'errorCode');

    out.push({
      sourceRow: i + 1,
      site: raw.sheetName,
      eventName,
      timestampUtc,
      respCurrentTimeUtc,
      connectorId: num(payload, 'connectorId'),
      status: str(payload, 'status'),
      errorCode,
      vendorErrorCode: str(payload, 'vendorErrorCode'),
      info: str(payload, 'info'),
      reason: str(payload, 'reason'),
      firmwareVersion: str(payload, 'firmwareVersion'),
      chargePointVendor: str(payload, 'chargePointVendor'),
      heartbeatIntervalSec: eventName === 'BootNotification'
        ? (Number(INTERVAL_RE.exec(raw.responseString)?.[1]) || null)
        : null,
      requestLen,
      // Kept ungated: cheap, and this flag exists precisely to expose the
      // exporter's 4000-char cell cap that silently loses MeterValues tails.
      truncated: isMeterValues && requestLen >= TRUNCATION_LIMIT,
      // A fault is a StatusNotification whose errorCode is present and not
      // "NoError" (§8). NoError is the healthy status — it CLOSES episodes.
      isFaultStatus: eventName === 'StatusNotification' && errorCode !== '' && errorCode !== 'NoError',
    });
  }

  return out;
}

/** Read the CALLRESULT payload — used by callers that need response fields. */
export function resultPayload(responseString: string): Payload | null {
  const parsed = safeParseArray(responseString);
  const body = parsed?.[RESULT_PAYLOAD_INDEX];
  return body && typeof body === 'object' ? (body as Payload) : null;
}
