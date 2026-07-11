// CMS ingestion orchestrator: an .xlsx ArrayBuffer -> ParsedLines (+ raw lines).
//
// `xlsx` is imported lazily so it stays code-split out of the Client-parser entry.
// Read options are memory-lean (dense, no text/format/style/formula passes) —
// ported from the archive, which OOM'd on 50k-row customer workbooks otherwise.

import { detectAdapter, getAdapter, CMS_ADAPTERS } from './registry';
import { cmsRowsToParsedLines } from './rowsToParsedLines';
import type { CmsParsed, CmsFormatAdapter } from './types';

export interface CmsParseOutcome {
  parsed: CmsParsed;
  adapter: CmsFormatAdapter;
  /** Unique charger ids (sheet names) found in the workbook — for the source banner. */
  chargers: string[];
}

export interface CmsParseOptions {
  /** Force a specific customer adapter by id (bypasses auto-detection). */
  adapterId?: string;
}

/** Parse a CMS Excel workbook into the shared pipeline's ParsedLines. */
export async function parseCmsWorkbook(
  arrayBuffer: ArrayBuffer,
  fileName: string,
  opts: CmsParseOptions = {},
): Promise<CmsParseOutcome> {
  const XLSX = await import('xlsx');
  const workbook = XLSX.read(arrayBuffer, {
    type: 'array',
    dense: true,
    cellText: false,
    // Keep number FORMAT codes (cheap — interned, not per-cell text) so adapters
    // can format date cells to their display string via sheet_to_json(raw:false).
    // Needed by Mahindra, whose raw Excel serial has an unreliable month.
    cellNF: true,
    cellHTML: false,
    cellStyles: false,
    cellFormula: false,
    cellDates: false,
  });

  let adapter: CmsFormatAdapter | null | undefined;
  if (opts.adapterId) {
    adapter = getAdapter(opts.adapterId);
    if (!adapter) {
      throw new Error(`Unknown CMS customer "${opts.adapterId}". Supported: ${CMS_ADAPTERS.map((a) => a.id).join(', ')}.`);
    }
    // Forcing a customer still sanity-checks the layout (detect is format-specific),
    // so picking the wrong customer fails sharply instead of parsing garbage.
    if (!adapter.detect(workbook)) {
      throw new Error(
        `You selected ${adapter.label}, but "${fileName}" doesn't match the ${adapter.label} CMS format. ` +
          `Use Auto-detect or pick the correct customer.`,
      );
    }
  } else {
    adapter = detectAdapter(workbook);
    if (!adapter) {
      const supported = CMS_ADAPTERS.map((a) => a.label).join(', ');
      throw new Error(
        `Unrecognized CMS log format in "${fileName}". No customer adapter matched ` +
          `its layout. Supported formats: ${supported}. ` +
          `Add a new adapter under src/app/cms/adapters/ to support this customer.`,
      );
    }
  }

  const rows = adapter.extractRows(workbook);
  if (rows.length === 0) {
    throw new Error(
      `"${fileName}" contained no OCPP log rows for the ${adapter.label} format` +
        (opts.adapterId ? ` — is "${fileName}" really a ${adapter.label} export? Try Auto-detect or another customer.` : '.'),
    );
  }

  const chargers = [...new Set(rows.map((r) => r.sheetName).filter(Boolean))];
  const parsed = cmsRowsToParsedLines(rows, fileName, adapter.toUtcIso);
  return { parsed, adapter, chargers };
}
