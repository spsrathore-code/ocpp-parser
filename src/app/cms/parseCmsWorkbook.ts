// CMS ingestion orchestrator: an .xlsx ArrayBuffer -> ParsedLines (+ raw lines).
//
// `xlsx` is imported lazily so it stays code-split out of the Client-parser entry.
// Read options are memory-lean (dense, no text/format/style/formula passes) —
// ported from the archive, which OOM'd on 50k-row customer workbooks otherwise.

import { detectAdapter, CMS_ADAPTERS } from './registry';
import { cmsRowsToParsedLines } from './rowsToParsedLines';
import type { CmsParsed, CmsFormatAdapter } from './types';

export interface CmsParseOutcome {
  parsed: CmsParsed;
  adapter: CmsFormatAdapter;
  /** Unique charger ids (sheet names) found in the workbook — for the source banner. */
  chargers: string[];
}

/** Parse a CMS Excel workbook into the shared pipeline's ParsedLines. */
export async function parseCmsWorkbook(
  arrayBuffer: ArrayBuffer,
  fileName: string,
): Promise<CmsParseOutcome> {
  const XLSX = await import('xlsx');
  const workbook = XLSX.read(arrayBuffer, {
    type: 'array',
    dense: true,
    cellText: false,
    cellNF: false,
    cellHTML: false,
    cellStyles: false,
    cellFormula: false,
    cellDates: false,
  });

  const adapter = detectAdapter(workbook);
  if (!adapter) {
    const supported = CMS_ADAPTERS.map((a) => a.label).join(', ');
    throw new Error(
      `Unrecognized CMS log format in "${fileName}". No customer adapter matched ` +
        `its layout. Supported formats: ${supported}. ` +
        `Add a new adapter under src/app/cms/adapters/ to support this customer.`,
    );
  }

  const rows = adapter.extractRows(workbook);
  if (rows.length === 0) {
    throw new Error(
      `"${fileName}" was recognized as ${adapter.label} format but contained no OCPP log rows.`,
    );
  }

  const chargers = [...new Set(rows.map((r) => r.sheetName).filter(Boolean))];
  const parsed = cmsRowsToParsedLines(rows, fileName);
  return { parsed, adapter, chargers };
}
