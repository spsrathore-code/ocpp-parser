// CMS CSV ingestion orchestrator: CSV text -> ParsedLines (+ raw lines).
// Mirrors parseCmsWorkbook, but the source is text so no xlsx import is needed
// (which also keeps ~100 MB exports off the xlsx code path entirely).

import { readCsvRows } from './csvReader';
import { detectCsvAdapter, getCsvAdapter, CMS_CSV_ADAPTERS } from './registry';
import { cmsRowsToParsedLines } from './rowsToParsedLines';
import type { CmsParsed, CmsCsvFormatAdapter } from './types';

export interface CmsCsvParseOutcome {
  parsed: CmsParsed;
  adapter: CmsCsvFormatAdapter;
  chargers: string[];
  /** Rows whose Event Type column disagreed with the action-derived direction. */
  directionMismatches: number;
}

export interface CmsCsvParseOptions {
  /** Force a specific customer adapter by id (bypasses auto-detection). */
  adapterId?: string;
}

/** Parse CMS CSV text into the shared pipeline's ParsedLines. */
export async function parseCmsCsv(
  text: string,
  fileName: string,
  opts: CmsCsvParseOptions = {},
): Promise<CmsCsvParseOutcome> {
  const grid = readCsvRows(text);
  const header = grid[0] ?? [];

  let adapter: CmsCsvFormatAdapter | null | undefined;
  if (opts.adapterId) {
    adapter = getCsvAdapter(opts.adapterId);
    if (!adapter) {
      throw new Error(`Unknown CMS CSV customer "${opts.adapterId}". Supported: ${CMS_CSV_ADAPTERS.map((a) => a.id).join(', ')}.`);
    }
    if (!adapter.detect(header)) {
      throw new Error(
        `You selected ${adapter.label}, but "${fileName}" doesn't match that CSV format. ` +
          `Use Auto-detect or pick the correct customer.`,
      );
    }
  } else {
    adapter = detectCsvAdapter(header);
    if (!adapter) {
      const supported = CMS_CSV_ADAPTERS.map((a) => a.label).join(', ');
      throw new Error(
        `Unrecognized CMS CSV format in "${fileName}". No customer adapter matched its ` +
          `columns. Supported formats: ${supported}. ` +
          `Add a new adapter under src/app/cms/adapters/ to support this customer.`,
      );
    }
  }

  const { rows, directionMismatches } = adapter.extractRows(grid, fileName);
  if (rows.length === 0) {
    throw new Error(`"${fileName}" contained no OCPP log rows for the ${adapter.label} format.`);
  }

  const chargers = [...new Set(rows.map((r) => r.sheetName).filter(Boolean))];
  const parsed = cmsRowsToParsedLines(rows, fileName, adapter.toUtcIso);
  return { parsed, adapter, chargers, directionMismatches };
}
