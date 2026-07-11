// Shared contracts for the CMS (Excel) ingestion layer.
//
// A CMS log is an .xlsx of paired OCPP request/response strings. Each customer
// may lay the sheet out differently, so extraction is pluggable: one
// `CmsFormatAdapter` per customer format (CZ first), chosen by `detect()`.
// Every adapter normalizes to the same `CmsRow[]`, which the shared
// `cmsRowsToParsedLines` turns into the pipeline's `ParsedLines`.

import type { WorkBook } from 'xlsx';
import type { ParsedLines } from '../parse/parseLines';

/** One normalized CMS log row: a request/response pair with their wall-clock times. */
export interface CmsRow {
  /** Source serial number, if the format has one (informational). */
  srNo?: string;
  /** Raw OCPP CALL JSON string, e.g. `[2,"<id>","Heartbeat",{}]`. */
  requestString: string;
  /** Raw OCPP CALLRESULT JSON string, e.g. `[3,"<id>",{...}]`. May be empty. */
  responseString: string;
  /** Raw request wall-clock string in the customer's zone (e.g. CZ IST). May be empty. */
  requestTime: string;
  /** Raw response wall-clock string in the customer's zone. May be empty. */
  responseTime: string;
  /** Sheet name — for CZ this is the charger id (e.g. "MH0055"). */
  sheetName: string;
}

/** A per-customer Excel-format adapter. Register new customers by adding one. */
export interface CmsFormatAdapter {
  /** Stable slug, e.g. "cz". */
  id: string;
  /** Human-readable name shown in UI/errors, e.g. "CZ". */
  label: string;
  /** True if this adapter recognizes the workbook's layout. */
  detect(workbook: WorkBook): boolean;
  /** Pull normalized rows out of the workbook (with raw customer wall-clock times). */
  extractRows(workbook: WorkBook): CmsRow[];
  /** Convert this customer's wall-clock time string to a UTC ISO instant (or null).
   *  Each customer owns its format; the shared mapper stays format-agnostic. */
  toUtcIso(raw: string): string | null;
}

/** `ParsedLines` plus the synthesized raw text lines the context-viewer needs. */
export interface CmsParsed extends ParsedLines {
  /** One readable text line per emitted message, indexed by `ParsedMessage.lineNumber`. */
  rawLogLines: string[];
}
