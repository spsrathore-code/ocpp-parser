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

/** Sheet names that identify nothing — the export tool's default, not a charger. */
const GENERIC_SHEET = /^(sheet|table|data|log|logs|report|export|worksheet)\s*\d*$/i;

/** Strip an extension and directory noise off a file name. */
function baseName(fileName: string): string {
  return fileName.replace(/\.[^.]+$/, '').trim();
}

/**
 * The label to show for a site.
 *
 * Prefers the sheet name, which in a real customer export is the charger id.
 * When the sheet is called something generic like "Sheet1" it identifies
 * nothing, so `fallback` is used instead — the SLOT's label, not the individual
 * file's. That distinction matters both ways round: two chargers uploaded to
 * different slots must stay apart even though both sheets say "Sheet1", while
 * several monthly exports of ONE charger dropped into the same slot must still
 * merge into one continuous site.
 */
export function siteLabel(sheetName: string, fallback: string): string {
  const fromSheet = cleanSiteName(sheetName);
  if (fromSheet && !GENERIC_SHEET.test(fromSheet)) return fromSheet;
  return baseName(fallback) || fromSheet || sheetName;
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

async function ingestWorkbook(file: File, opts: IngestOptions, fallback: string): Promise<UptimeSource[]> {
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
    return rows.length ? [{ site: siteLabel(rows[0].sheetName, fallback), fileName: file.name, customerLabel: adapter.label, rows }] : [];
  }

  const sources: UptimeSource[] = [];
  for (const sheetName of sheets) {
    const rows = adapter.extractRowsFromSheet?.(workbook, sheetName) ?? [];
    if (rows.length === 0) continue;
    sources.push({ site: siteLabel(rows[0].sheetName, fallback), fileName: file.name, customerLabel: adapter.label, rows });
  }
  return sources;
}

async function ingestCsv(file: File, opts: IngestOptions, fallback: string): Promise<UptimeSource[]> {
  const grid = readCsvRows(await file.text());
  if (grid.length === 0) return [];

  const forced = opts.adapterId ? getCsvAdapter(opts.adapterId) : undefined;
  const adapter = forced ?? detectCsvAdapter(grid[0].map((c) => String(c ?? '')));
  if (!adapter) throw new Error(`Unrecognized CMS CSV format in "${file.name}".`);

  // A CSV has no sheets, so the file itself is one site.
  const { rows } = adapter.extractRows(grid, file.name);
  return rows.length ? [{ site: siteLabel(rows[0].sheetName, fallback), fileName: file.name, customerLabel: adapter.label, rows }] : [];
}

/** Append without spreading: a big log overflows V8's argument cap on push(...). */
function appendRows(target: CmsRow[], extra: CmsRow[]): void {
  for (const row of extra) target.push(row);
}

/**
 * Read one upload slot's files into per-site row batches.
 *
 * Sites with the same name WITHIN a slot are merged, so a single charger split
 * over several monthly exports is analyzed as one continuous site.
 */
export async function ingestUptimeSources(
  files: File[],
  opts: IngestOptions = {},
  fallbackLabel?: string,
): Promise<UptimeSource[]> {
  const merged = new Map<string, UptimeSource>();
  // One fallback for the whole slot, so generically-named sheets across several
  // files land on the same site instead of splitting per file.
  const fallback = fallbackLabel ?? (files[0] ? files[0].name : 'Site');

  for (const file of files) {
    const found = /\.csv$/i.test(file.name)
      ? await ingestCsv(file, opts, fallback)
      : await ingestWorkbook(file, opts, fallback);

    for (const source of found) {
      const existing = merged.get(source.site);
      if (existing) {
        appendRows(existing.rows, source.rows);
        if (!existing.fileName.includes(source.fileName)) existing.fileName += `, ${source.fileName}`;
      } else {
        merged.set(source.site, { ...source });
      }
    }
  }

  return [...merged.values()];
}

/** One upload slot: the files dropped into it, and the label shown for it. */
export interface UptimeSlot {
  label: string;
  files: File[];
  /** User-typed site name. OCPP 1.6J carries no charger id, station or model
   *  (Analysis_Spec_MD section 4.5), so when the operator wants a specific
   *  label there is nothing in the log to derive it from — they type it.
   *  Applied only when the slot yields ONE site; a multi-sheet workbook keeps
   *  its per-sheet names, since a single typed name cannot address them. */
  siteName?: string;
}

/**
 * Read every slot, keeping slots as separate sites.
 *
 * The slot is AUTHORITATIVE. A file placed in Site B is a different charger by
 * definition, so it must never merge into Site A even when both exports happen
 * to name their sheet the same thing — which is common, since a single-charger
 * export is often just "Sheet1". Merging on name alone silently collapsed two
 * uploads into one site and hid every comparison section.
 *
 * Colliding names are disambiguated with the slot label rather than merged.
 */
export async function ingestUptimeSlots(slots: UptimeSlot[], opts: IngestOptions = {}): Promise<UptimeSource[]> {
  const all: UptimeSource[] = [];
  const seen = new Set<string>();

  for (const slot of slots) {
    if (slot.files.length === 0) continue;
    const found = await ingestUptimeSources(slot.files, opts, slot.files[0]?.name);
    const override = slot.siteName?.trim();
    for (const source of found) {
      // A typed name addresses the slot, so it only applies when the slot is
      // unambiguously one site.
      let site = override && found.length === 1 ? override : source.site;
      if (seen.has(site)) {
        // Same charger id in two slots: keep both, labelled by slot.
        site = `${source.site} (${slot.label})`;
        let n = 2;
        while (seen.has(site)) site = `${source.site} (${slot.label} ${n++})`;
      }
      seen.add(site);
      all.push({ ...source, site });
    }
  }

  if (all.length === 0) throw new Error('No OCPP log rows found in the uploaded file(s).');
  return all;
}
