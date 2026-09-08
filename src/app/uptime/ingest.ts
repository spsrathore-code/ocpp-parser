// Uptime ingestion: files -> per-site CmsRow batches.
//
// Reuses the CMS customer adapters wholesale — the reference workbook's raw
// sheets are byte-identical to the Mahindra CMS export the suite already reads.
// What differs from the CMS Log Parser is the unit of analysis: there, one file
// is one charger; here ONE SHEET IS ONE SITE, so a single workbook can carry
// several sites (the reference workbook carries two) and must yield all of them.
//
// This deliberately does NOT go through parseCmsWorkbook, which converts rows to
// ParsedLines timestamped from `Created On` — the CMS capture time, which
// Analysis_Spec_MD §1 forbids using for any calculation.

import { detectAdapter, getAdapter, CMS_ADAPTERS, detectCsvAdapter, getCsvAdapter } from '../cms/registry';
import { readCsvRows } from '../cms/csvReader';
import type { CmsRow } from '../cms/types';

/**
 * Trim boilerplate off a sheet name to get a usable site label.
 *
 * Sheets are commonly named "<charger> CMS Logs" / "Logs of <charger>". Carrying
 * that suffix into the UI makes every comparison column read
 * "DC052 CMS Logs · C1", which is wide enough to push the second site's columns
 * (and the Presence and Status columns) off the side of the table.
 */
export function cleanSiteName(sheetName: string): string {
  const trimmed = sheetName
    .replace(/[\s_-]*(cms)?[\s_-]*logs?$/i, '')
    .replace(/^logs?[\s_-]*(of)?[\s_-]*(charger)?[\s_-]*/i, '')
    .trim();
  return trimmed || sheetName;
}

/** One site's raw rows, tagged with where they came from. */
export interface UptimeSource {
  site: string;
  fileName: string;
  customerLabel: string;
  rows: CmsRow[];
}

export interface IngestOptions {
  /** Force a customer adapter by id; otherwise auto-detect. */
  adapterId?: string;
}

/** Same memory-lean read options the CMS path uses (see parseCmsWorkbook). */
const READ_OPTIONS = {
  type: 'array' as const,
  dense: true,
  cellText: false,
  cellNF: true,
  cellHTML: false,
  cellStyles: false,
  cellFormula: false,
  cellDates: false,
};

async function ingestWorkbook(file: File, opts: IngestOptions): Promise<UptimeSource[]> {
  const XLSX = await import('xlsx');
  const workbook = XLSX.read(await file.arrayBuffer(), READ_OPTIONS);

  const forced = opts.adapterId ? getAdapter(opts.adapterId) : undefined;
  if (opts.adapterId && !forced) {
    throw new Error(`Unknown CMS customer "${opts.adapterId}". Supported: ${CMS_ADAPTERS.map((a) => a.id).join(', ')}.`);
  }
  if (forced && !forced.detect(workbook)) {
    throw new Error(
      `You selected ${forced.label}, but "${file.name}" doesn't match the ${forced.label} CMS format. ` +
      'Use Auto-detect or pick the correct customer.',
    );
  }
  const adapter = forced ?? detectAdapter(workbook);
  if (!adapter) {
    throw new Error(
      `Unrecognized CMS log format in "${file.name}". Supported customers: ${CMS_ADAPTERS.map((a) => a.label).join(', ')}.`,
    );
  }

  // One sheet = one site. Adapters without the multi-sheet seam degrade to their
  // single best sheet, which stays correct — just single-site.
  const sheets = adapter.listDataSheets?.(workbook);
  if (!sheets || sheets.length === 0) {
    const rows = adapter.extractRows(workbook);
    return rows.length ? [{ site: cleanSiteName(rows[0].sheetName), fileName: file.name, customerLabel: adapter.label, rows }] : [];
  }

  const sources: UptimeSource[] = [];
  for (const sheetName of sheets) {
    const rows = adapter.extractRowsFromSheet?.(workbook, sheetName) ?? [];
    if (rows.length === 0) continue;
    sources.push({ site: cleanSiteName(rows[0].sheetName), fileName: file.name, customerLabel: adapter.label, rows });
  }
  return sources;
}

async function ingestCsv(file: File, opts: IngestOptions): Promise<UptimeSource[]> {
  const grid = readCsvRows(await file.text());
  if (grid.length === 0) return [];

  const forced = opts.adapterId ? getCsvAdapter(opts.adapterId) : undefined;
  const adapter = forced ?? detectCsvAdapter(grid[0].map((c) => String(c ?? '')));
  if (!adapter) throw new Error(`Unrecognized CMS CSV format in "${file.name}".`);

  // A CSV has no sheets, so the file itself is one site.
  const { rows } = adapter.extractRows(grid, file.name);
  return rows.length ? [{ site: cleanSiteName(rows[0].sheetName), fileName: file.name, customerLabel: adapter.label, rows }] : [];
}

/**
 * Read every uploaded file into per-site row batches.
 * Sites with the same name across files are merged, so a charger split over
 * several exports is analyzed as one site rather than several partial ones.
 */
export async function ingestUptimeSources(files: File[], opts: IngestOptions = {}): Promise<UptimeSource[]> {
  const merged = new Map<string, UptimeSource>();

  for (const file of files) {
    const found = /\.csv$/i.test(file.name)
      ? await ingestCsv(file, opts)
      : await ingestWorkbook(file, opts);

    for (const source of found) {
      const existing = merged.get(source.site);
      if (existing) {
        existing.rows.push(...source.rows);
        if (!existing.fileName.includes(source.fileName)) existing.fileName += `, ${source.fileName}`;
      } else {
        merged.set(source.site, { ...source });
      }
    }
  }

  if (merged.size === 0) throw new Error('No OCPP log rows found in the uploaded file(s).');
  return [...merged.values()];
}
