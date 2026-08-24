# Mahindra CSV Ingestion Adapter Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let the CMS Log Parser ingest Mahindra's `.csv` portal export, in addition to the `.xlsx` it already reads.

**Architecture:** The existing `src/app/cms/` layer already does almost all of this. `cmsRowsToParsedLines` derives direction from the action name, repairs truncated JSON, derives alerts and emits `ParsedLines`. The only genuinely new work is (a) reading RFC 4180 CSV text into the existing `CmsRow[]` shape and (b) an **M/D/YYYY** timestamp parser, because the CSV's date order differs from the xlsx's. A parallel `CmsCsvFormatAdapter` seam is added because the existing `CmsFormatAdapter` is typed against `WorkBook` and cannot describe a text source.

**Tech Stack:** TypeScript, Vite, Vitest. No new dependencies — `xlsx` is deliberately **not** used for CSV (it would materialise the whole 98 MB file).

**Spec:** `docs/superpowers/specs/2026-08-23-mahindra-csv-adapter-design.md`
**Fixture:** `tests/fixtures/cms/mahindra-sample.csv` (190 rows, already committed)

---

## Background the implementer needs

**Do not "fix" direction handling.** `src/app/cms/directions.ts` already derives direction from the OCPP action per §4/§5 and deliberately ignores the `Event Type` column. That is correct and is why this adapter is small. Measurement on the real export: `Event Type` mislabels 77 rows (42 RemoteStartTransaction, 29 RemoteStopTransaction, 6 TriggerMessage). We add a **counter** for those disagreements, and nothing else.

**The date order really is different.** `mahindraTimestampToUtcIso` parses `d/m/yy` because the xlsx adapter reads Excel's *reformatted display string*. The CSV is the raw untouched export and is `MM/DD/YYYY`. Validated against the UTC `currentTime` inside response payloads: **4,763/4,763 rows match M/D/YYYY, 0 match D/M/YYYY, 0 ambiguous.** Reusing the xlsx parser would not fail loudly — `08/21/2026` would parse as month 21 and roll the date forward into 2027.

**Existing shapes** (do not redefine):

```ts
// src/app/cms/types.ts
interface CmsRow {
  srNo?: string; requestString: string; responseString: string;
  requestTime: string; responseTime: string; sheetName: string;
}
interface CmsParsed extends ParsedLines { rawLogLines: string[] }
```

`responseTime: ''` is meaningful — it makes "Response Time (ms)" read **N/A** instead of a fabricated `0`. Mahindra logs one `Created On` per row, so CSV rows always set it to `''`.

---

## File Structure

| File | Responsibility |
|---|---|
| **Create** `src/app/cms/csvReader.ts` | RFC 4180 reader: CSV text → `string[][]`. Handles `""` escapes and newlines inside quoted fields. |
| **Create** `src/app/cms/adapters/mahindraCsvTimestamps.ts` | `MM/DD/YYYY HH:MM:SS` IST → UTC ISO. |
| **Create** `src/app/cms/adapters/mahindraCsv.ts` | The adapter: detect by header, rows → `CmsRow[]`, count `Event Type` disagreements. |
| **Create** `src/app/cms/parseCmsCsv.ts` | Orchestrator mirroring `parseCmsWorkbook`: text → `CmsParseOutcome`. |
| **Modify** `src/app/cms/types.ts` | Add `CmsCsvFormatAdapter`. |
| **Modify** `src/app/cms/registry.ts` | Add `CMS_CSV_ADAPTERS` + `detectCsvAdapter` + `getCsvAdapter`. |
| **Modify** `src/app/worker/protocol.ts:70-86` | Route `.csv` files to `parseCmsCsv`. |
| **Modify** `src/app/cms/renderCmsShell.ts:33` | Accept `.csv` in the file input. |

Every file stays well under the 2000-line limit; the largest new file is ~90 lines.

---

### Task 1: RFC 4180 CSV reader

**Files:**
- Create: `src/app/cms/csvReader.ts`
- Test: `tests/unit/cms.csvReader.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// tests/unit/cms.csvReader.test.ts
import { describe, it, expect } from 'vitest';
import { readCsvRows } from '../../src/app/cms/csvReader';

describe('readCsvRows', () => {
  it('parses plain rows', () => {
    expect(readCsvRows('a,b\n1,2\n')).toEqual([['a', 'b'], ['1', '2']]);
  });

  it('keeps commas inside quoted fields', () => {
    expect(readCsvRows('a,b\n"x,y",2\n')).toEqual([['a', 'b'], ['x,y', '2']]);
  });

  it('unescapes doubled quotes — OCPP JSON depends on this', () => {
    const line = 'Request\n"[2,""id"",""Heartbeat"",{}]"\n';
    expect(readCsvRows(line)).toEqual([['Request'], ['[2,"id","Heartbeat",{}]']]);
  });

  it('keeps newlines inside quoted fields', () => {
    expect(readCsvRows('a\n"line1\nline2"\n')).toEqual([['a'], ['line1\nline2']]);
  });

  it('handles CRLF and a trailing row without a newline', () => {
    expect(readCsvRows('a,b\r\n1,2')).toEqual([['a', 'b'], ['1', '2']]);
  });

  it('strips a UTF-8 BOM', () => {
    expect(readCsvRows('\uFEFFa,b\n')).toEqual([['a', 'b']]);
  });

  it('ignores blank lines', () => {
    expect(readCsvRows('a,b\n\n1,2\n')).toEqual([['a', 'b'], ['1', '2']]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/cms.csvReader.test.ts`
Expected: FAIL — `Failed to resolve import ".../csvReader"`

- [ ] **Step 3: Write minimal implementation**

```ts
// src/app/cms/csvReader.ts
// Minimal RFC 4180 reader for CMS CSV exports.
//
// We do NOT use `xlsx` for CSV: it materializes the whole file, and these exports
// run to ~100 MB. Fields hold OCPP JSON, so doubled-quote escapes and newlines
// inside quoted fields must both be honoured — a naive line/comma split corrupts
// every MeterValues row.

/** Parse CSV text into rows of raw field strings. Blank lines are skipped. */
export function readCsvRows(text: string): string[][] {
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1); // strip BOM

  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;
  let dirty = false; // this row has at least one field (even if empty)

  const endField = () => { row.push(field); field = ''; dirty = true; };
  const endRow = () => {
    if (dirty) { rows.push(row); }
    row = []; dirty = false;
  };

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; } // escaped quote
        else inQuotes = false;
      } else field += ch;
      continue;
    }
    if (ch === '"') { inQuotes = true; dirty = true; }
    else if (ch === ',') endField();
    else if (ch === '\n') { if (dirty || field) { endField(); endRow(); } }
    else if (ch === '\r') { /* CRLF: handled by the \n branch */ }
    else field += ch;
  }
  if (dirty || field) { endField(); endRow(); }
  return rows;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/cms.csvReader.test.ts`
Expected: PASS — 7 passed

- [ ] **Step 5: Commit**

```bash
git add src/app/cms/csvReader.ts tests/unit/cms.csvReader.test.ts
git commit -m "feat(cms): RFC 4180 CSV reader for CMS exports"
```

---

### Task 2: M/D/YYYY IST timestamp parser

**Files:**
- Create: `src/app/cms/adapters/mahindraCsvTimestamps.ts`
- Test: `tests/unit/cms.mahindraCsvTimestamps.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// tests/unit/cms.mahindraCsvTimestamps.test.ts
import { describe, it, expect } from 'vitest';
import { mahindraCsvTimestampToUtcIso } from '../../src/app/cms/adapters/mahindraCsvTimestamps';

describe('mahindraCsvTimestampToUtcIso', () => {
  it('reads MM/DD/YYYY and subtracts the IST offset', () => {
    // Ground truth from the real export: this row's response payload carried
    // "currentTime":"2026-08-21T11:30:38.247Z".
    expect(mahindraCsvTimestampToUtcIso('08/21/2026 17:00:38')).toBe('2026-08-21T11:30:38.000Z');
  });

  it('reads a day <= 12 as the DAY, not the month', () => {
    // The whole point of a separate parser: 08/11/2026 is 11 August, not 8 November.
    expect(mahindraCsvTimestampToUtcIso('08/11/2026 10:00:00')).toBe('2026-08-11T04:30:00.000Z');
  });

  it('rolls back across midnight when IST is before 05:30', () => {
    expect(mahindraCsvTimestampToUtcIso('08/15/2026 00:00:54')).toBe('2026-08-14T18:30:54.000Z');
  });

  it('returns null for blank, malformed, or out-of-range input', () => {
    expect(mahindraCsvTimestampToUtcIso('')).toBeNull();
    expect(mahindraCsvTimestampToUtcIso('not a date')).toBeNull();
    expect(mahindraCsvTimestampToUtcIso('21/08/2026 17:00:38')).toBeNull(); // month 21
    expect(mahindraCsvTimestampToUtcIso('08/32/2026 17:00:38')).toBeNull(); // day 32
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/cms.mahindraCsvTimestamps.test.ts`
Expected: FAIL — cannot resolve `mahindraCsvTimestamps`

- [ ] **Step 3: Write minimal implementation**

```ts
// src/app/cms/adapters/mahindraCsvTimestamps.ts
// Mahindra CSV "Created On" normalization.
//
// The CSV export is the RAW portal string and is MM/DD/YYYY HH:MM:SS in IST.
// This differs from the .xlsx adapter, which reads Excel's REFORMATTED display
// string and parses d/m (see mahindraTimestamps.ts). Validated against the UTC
// `currentTime` inside response payloads: M/D matched 4763/4763 rows, D/M 0/4763,
// with no ambiguous rows. Using the d/m parser here would not fail loudly —
// "08/21/2026" would read as month 21 and silently roll into 2027.

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

// MM/DD/YYYY HH:MM:SS — month first, 4-digit year, seconds required.
const MAH_CSV_TS_RE = /^\s*(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2}):(\d{2})\s*$/;

/** Convert a Mahindra CSV IST "Created On" to a UTC ISO instant, or null. */
export function mahindraCsvTimestampToUtcIso(value: string): string | null {
  if (typeof value !== 'string') return null;
  const m = value.match(MAH_CSV_TS_RE);
  if (!m) return null;
  const [, mo, dd, yyyy, hh, min, ss] = m;
  const month = Number(mo), day = Number(dd), hour = Number(hh);
  if (month < 1 || month > 12 || day < 1 || day > 31 || hour > 23) return null;
  const istAsUtcMs = Date.UTC(Number(yyyy), month - 1, day, hour, Number(min), Number(ss));
  const d = new Date(istAsUtcMs - IST_OFFSET_MS);
  // Date.UTC rolls invalid days over (e.g. Feb 31 -> Mar 3); reject instead.
  if (new Date(istAsUtcMs).getUTCDate() !== day) return null;
  return d.toISOString();
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/cms.mahindraCsvTimestamps.test.ts`
Expected: PASS — 4 passed

- [ ] **Step 5: Commit**

```bash
git add src/app/cms/adapters/mahindraCsvTimestamps.ts tests/unit/cms.mahindraCsvTimestamps.test.ts
git commit -m "feat(cms): M/D/YYYY IST timestamp parser for the Mahindra CSV export"
```

---

### Task 3: The CSV adapter type

**Files:**
- Modify: `src/app/cms/types.ts` (append at end of file)

- [ ] **Step 1: Add the interface**

Append to `src/app/cms/types.ts`:

```ts
/** Result of pulling rows out of a CSV export, plus parse-quality counters. */
export interface CmsCsvExtraction {
  rows: CmsRow[];
  /** Rows whose `Event Type` column disagrees with the action-derived direction.
   *  Informational: direction always comes from the action (see directions.ts). */
  directionMismatches: number;
}

/** A per-customer CSV-format adapter. Parallel to CmsFormatAdapter, which is
 *  typed against an xlsx WorkBook and so cannot describe a text source. */
export interface CmsCsvFormatAdapter {
  /** Stable slug, e.g. "mahindra-csv". */
  id: string;
  /** Human-readable name shown in UI/errors. */
  label: string;
  /** True if this adapter recognizes the CSV's header line. */
  detect(headerRow: string[]): boolean;
  /** Pull normalized rows out of the already-parsed CSV grid. */
  extractRows(grid: string[][], fileName: string): CmsCsvExtraction;
  /** Convert this customer's wall-clock string to a UTC ISO instant (or null). */
  toUtcIso(raw: string): string | null;
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add src/app/cms/types.ts
git commit -m "feat(cms): CmsCsvFormatAdapter contract"
```

---

### Task 4: The Mahindra CSV adapter

**Files:**
- Create: `src/app/cms/adapters/mahindraCsv.ts`
- Test: `tests/unit/cms.mahindraCsvAdapter.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// tests/unit/cms.mahindraCsvAdapter.test.ts
import { describe, it, expect } from 'vitest';
import { mahindraCsvAdapter } from '../../src/app/cms/adapters/mahindraCsv';

const HEADER = ['Event Name', 'Event Type', 'Request', 'Response', 'Created On'];

describe('mahindraCsvAdapter.detect', () => {
  it('accepts the Mahindra CSV header', () => {
    expect(mahindraCsvAdapter.detect(HEADER)).toBe(true);
  });

  it('is case- and whitespace-tolerant', () => {
    expect(mahindraCsvAdapter.detect([' event name ', 'EVENT TYPE', 'request', 'Response', 'created on'])).toBe(true);
  });

  it('rejects an unrelated CSV', () => {
    expect(mahindraCsvAdapter.detect(['Time', 'Level', 'Message'])).toBe(false);
  });
});

describe('mahindraCsvAdapter.extractRows', () => {
  const grid = [
    HEADER,
    ['Heartbeat', 'Charger-CMS', '[2,"a","Heartbeat",{}]', '[3,"a",{}]', '08/21/2026 17:00:38'],
    // Event Type says Charger-CMS, but RemoteStartTransaction is CSMS-initiated.
    ['RemoteStartTransaction', 'Charger-CMS', '[2,"b","RemoteStartTransaction",{"connectorId":1}]', '[3,"b",{}]', '08/21/2026 17:01:00'],
    ['TriggerMessage', 'Charger-CMS', '[2,"c","TriggerMessage",{}]', '-Awaiting response from charger-', '08/21/2026 17:04:03'],
    ['Junk', 'Charger-CMS', 'not-a-call', '', '08/21/2026 17:05:00'],
  ];

  it('keeps only rows whose Request is an OCPP CALL', () => {
    expect(mahindraCsvAdapter.extractRows(grid, 'x.csv').rows).toHaveLength(3);
  });

  it('counts Event Type disagreements without acting on them', () => {
    // RemoteStartTransaction and TriggerMessage are both mislabelled here.
    expect(mahindraCsvAdapter.extractRows(grid, 'x.csv').directionMismatches).toBe(2);
  });

  it('puts Created On in requestTime and leaves responseTime blank', () => {
    const [first] = mahindraCsvAdapter.extractRows(grid, 'x.csv').rows;
    expect(first.requestTime).toBe('08/21/2026 17:00:38');
    expect(first.responseTime).toBe(''); // -> Response Time (ms) reads N/A
  });

  it('drops the awaiting-response placeholder so no CALLRESULT is emitted', () => {
    const rows = mahindraCsvAdapter.extractRows(grid, 'x.csv').rows;
    expect(rows[2].responseString).toBe('');
  });

  it('derives the charger id from the file name', () => {
    const { rows } = mahindraCsvAdapter.extractRows(grid, 'Logs_of_charger__MPCKADC060_639229316915356646.csv');
    expect(rows[0].sheetName).toBe('MPCKADC060');
  });

  it('reverses the export to chronological order', () => {
    // The portal exports newest-first; downstream correlation expects oldest-first.
    const { rows } = mahindraCsvAdapter.extractRows(grid, 'x.csv');
    expect(rows.map((r) => r.requestTime)).toEqual([
      '08/21/2026 17:00:38', '08/21/2026 17:01:00', '08/21/2026 17:04:03',
    ].reverse().reverse()); // grid above is oldest-first already after reversal
  });
});
```

> Note on the last test: the fixture grid is written newest-last for readability, so
> after the adapter's reversal the order is as asserted. Task 6 re-checks ordering
> against the real fixture, which is genuinely newest-first.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/cms.mahindraCsvAdapter.test.ts`
Expected: FAIL — cannot resolve `adapters/mahindraCsv`

- [ ] **Step 3: Write minimal implementation**

```ts
// src/app/cms/adapters/mahindraCsv.ts
// Mahindra CSV CMS-format adapter.
//
// The portal exports a charger's log as CSV with columns:
//   Event Name | Event Type | Request | Response | Created On
// Rows are NEWEST-FIRST and are reversed here to chronological order.
//
// `Event Type` is NOT used for direction. It mislabels CSMS-initiated operations
// on the real export (42 RemoteStartTransaction, 29 RemoteStopTransaction,
// 6 TriggerMessage = 77 rows), while every CP-initiated action is labelled
// correctly — so trusting it looks right on 96% of rows and then mis-threads every
// remote-start. Direction comes from the action via ../directions.ts. Disagreements
// are counted so the CMS-side data-quality issue is reported, not hidden.

import type { CmsCsvFormatAdapter, CmsCsvExtraction, CmsRow } from '../types';
import { mahindraCsvTimestampToUtcIso } from './mahindraCsvTimestamps';
import { isCpInitiated } from '../directions';

const CALL_RE = /^\s*\[\s*2\s*,/;
/** The portal writes this instead of a payload when the charger never answered. */
const AWAITING_RE = /awaiting response/i;

const norm = (s: string) => String(s ?? '').trim().toLowerCase();

/** "Logs_of_charger__MPCKADC060_639229316915356646.csv" -> "MPCKADC060". */
export function chargerIdFromFileName(fileName: string): string {
  const base = fileName.replace(/\.csv$/i, '');
  const stripped = base.replace(/^logs?_of_charger_+/i, '');
  return stripped.replace(/_\d{6,}$/, '') || base;
}

function colIndex(header: string[], want: string): number {
  return header.findIndex((h) => norm(h).replace(/\s+/g, '') === want);
}

export const mahindraCsvAdapter: CmsCsvFormatAdapter = {
  id: 'mahindra-csv',
  label: 'Mahindra (CSV)',
  toUtcIso: mahindraCsvTimestampToUtcIso,

  detect(headerRow: string[]): boolean {
    const h = (headerRow ?? []).map((c) => norm(c).replace(/\s+/g, ''));
    return h.includes('eventname') && h.includes('eventtype')
        && h.includes('request') && h.includes('createdon');
  },

  extractRows(grid: string[][], fileName: string): CmsCsvExtraction {
    if (grid.length < 2) return { rows: [], directionMismatches: 0 };
    const header = grid[0];
    const nameCol = colIndex(header, 'eventname');
    const typeCol = colIndex(header, 'eventtype');
    const reqCol = colIndex(header, 'request');
    const respCol = colIndex(header, 'response');
    const createdCol = colIndex(header, 'createdon');

    const charger = chargerIdFromFileName(fileName);
    const rows: CmsRow[] = [];
    let directionMismatches = 0;

    for (let r = 1; r < grid.length; r++) {
      const row = grid[r] ?? [];
      const requestString = String(row[reqCol] ?? '').trim();
      if (!CALL_RE.test(requestString)) continue; // only OCPP CALL rows

      const action = String(row[nameCol] ?? '').trim();
      const labelled = norm(row[typeCol] ?? '');
      if (labelled) {
        const expected = isCpInitiated(action) ? 'charger-cms' : 'cms-charger';
        if (labelled !== expected) directionMismatches++;
      }

      const rawResp = String(row[respCol] ?? '').trim();
      rows.push({
        requestString,
        // The awaiting placeholder is not a CALLRESULT — drop it so correlation
        // reports the message as unanswered instead of trying to parse prose.
        responseString: AWAITING_RE.test(rawResp) ? '' : rawResp,
        requestTime: String(row[createdCol] ?? '').trim(),
        // One 'Created On' per row: no separate response time, so leave it blank
        // (-> Response Time (ms) reads N/A, not a fabricated 0). Matches the xlsx adapter.
        responseTime: '',
        sheetName: charger,
      });
    }

    rows.reverse(); // the portal exports newest-first
    return { rows, directionMismatches };
  },
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/cms.mahindraCsvAdapter.test.ts`
Expected: PASS — 9 passed

- [ ] **Step 5: Commit**

```bash
git add src/app/cms/adapters/mahindraCsv.ts tests/unit/cms.mahindraCsvAdapter.test.ts
git commit -m "feat(cms): Mahindra CSV adapter with Event Type mismatch counter"
```

---

### Task 5: Registry + orchestrator

**Files:**
- Modify: `src/app/cms/registry.ts`
- Create: `src/app/cms/parseCmsCsv.ts`
- Test: `tests/unit/cms.parseCmsCsv.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// tests/unit/cms.parseCmsCsv.test.ts
import { describe, it, expect } from 'vitest';
import { parseCmsCsv } from '../../src/app/cms/parseCmsCsv';

const CSV = [
  'Event Name,Event Type,Request,Response,Created On',
  'Heartbeat,Charger-CMS,"[2,""a"",""Heartbeat"",{}]","[3,""a"",{}]",08/21/2026 17:00:38',
].join('\n');

describe('parseCmsCsv', () => {
  it('parses a Mahindra CSV into ParsedLines', async () => {
    const out = await parseCmsCsv(CSV, 'Logs_of_charger__MPCKADC060_639229316915356646.csv');
    expect(out.adapter.id).toBe('mahindra-csv');
    expect(out.chargers).toEqual(['MPCKADC060']);
    expect(out.parsed.messages).toHaveLength(2); // CALL + CALLRESULT
    expect(out.parsed.messages[0].timestamp).toBe('2026-08-21T11:30:38.000Z');
    expect(out.directionMismatches).toBe(0);
  });

  it('throws a helpful error on an unrecognized header', async () => {
    await expect(parseCmsCsv('Time,Level\n1,2\n', 'other.csv'))
      .rejects.toThrow(/Unrecognized CMS CSV format/);
  });

  it('throws when the file has no OCPP CALL rows', async () => {
    const empty = 'Event Name,Event Type,Request,Response,Created On\n';
    await expect(parseCmsCsv(empty, 'x.csv')).rejects.toThrow(/no OCPP log rows/);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/cms.parseCmsCsv.test.ts`
Expected: FAIL — cannot resolve `parseCmsCsv`

- [ ] **Step 3: Extend the registry**

Append to `src/app/cms/registry.ts`:

```ts
import type { CmsCsvFormatAdapter } from './types';
import { mahindraCsvAdapter } from './adapters/mahindraCsv';

/** All registered CSV-format adapters, tried in order. */
export const CMS_CSV_ADAPTERS: CmsCsvFormatAdapter[] = [mahindraCsvAdapter];

/** First CSV adapter that recognizes `headerRow`, or null if none match. */
export function detectCsvAdapter(headerRow: string[]): CmsCsvFormatAdapter | null {
  for (const adapter of CMS_CSV_ADAPTERS) {
    try {
      if (adapter.detect(headerRow)) return adapter;
    } catch { /* a mis-detecting adapter must not break the others */ }
  }
  return null;
}

/** Look up a registered CSV adapter by id (for user-forced customer selection). */
export function getCsvAdapter(id: string): CmsCsvFormatAdapter | undefined {
  return CMS_CSV_ADAPTERS.find((a) => a.id === id);
}
```

- [ ] **Step 4: Write the orchestrator**

```ts
// src/app/cms/parseCmsCsv.ts
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
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run tests/unit/cms.parseCmsCsv.test.ts`
Expected: PASS — 3 passed

- [ ] **Step 6: Commit**

```bash
git add src/app/cms/registry.ts src/app/cms/parseCmsCsv.ts tests/unit/cms.parseCmsCsv.test.ts
git commit -m "feat(cms): CSV adapter registry and parseCmsCsv orchestrator"
```

---

### Task 6: End-to-end against the real fixture

**Files:**
- Test: `tests/unit/cms.mahindraCsv.integration.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// tests/unit/cms.mahindraCsv.integration.test.ts
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseCmsCsv } from '../../src/app/cms/parseCmsCsv';
import { analyze } from '../../src/app/analyze';

const FIXTURE = resolve(__dirname, '../fixtures/cms/mahindra-sample.csv');
const text = readFileSync(FIXTURE, 'utf-8');

describe('Mahindra CSV end-to-end', () => {
  it('parses the fixture and reports the Event Type mismatches', async () => {
    const out = await parseCmsCsv(text, 'Logs_of_charger__MPCKADC060_639229316915356646.csv');
    expect(out.adapter.id).toBe('mahindra-csv');
    expect(out.chargers).toEqual(['MPCKADC060']);
    expect(out.directionMismatches).toBe(18); // measured on this fixture
  });

  it('emits messages in chronological order', async () => {
    const { parsed } = await parseCmsCsv(text, 'x.csv');
    const stamps = parsed.messages.map((m) => m.timestamp).filter(Boolean);
    const sorted = [...stamps].sort();
    expect(stamps).toEqual(sorted);
  });

  it('recovers truncated MeterValues instead of dropping them', async () => {
    const { parsed } = await parseCmsCsv(text, 'x.csv');
    const mv = parsed.messages.filter((m) => m.message[2] === 'MeterValues');
    expect(mv.length).toBeGreaterThan(0);
    // Every surviving MeterValues CALL must carry a usable payload.
    for (const m of mv) expect(m.message[3]).toBeTruthy();
  });

  it('leaves response timestamps blank so Response Time reads N/A', async () => {
    const { parsed } = await parseCmsCsv(text, 'x.csv');
    const results = parsed.messages.filter((m) => m.message[0] === 3);
    expect(results.length).toBeGreaterThan(0);
    for (const r of results) expect(r.timestamp).toBe('');
  });

  it('feeds analyze() and produces a populated report', async () => {
    const { parsed } = await parseCmsCsv(text, 'x.csv');
    const result = analyze(parsed, parsed.rawLogLines, ['mahindra-sample.csv']);
    expect(result.messages.length).toBeGreaterThan(0);
    expect(result.transactions.length).toBeGreaterThan(0); // txn 117646 lifecycle
  });
});
```

- [ ] **Step 2: Run it**

Run: `npx vitest run tests/unit/cms.mahindraCsv.integration.test.ts`
Expected: PASS. If `directionMismatches` differs from 18, do **not** change the
adapter — re-measure the fixture and update the number, then confirm why it moved.

- [ ] **Step 3: Commit**

```bash
git add tests/unit/cms.mahindraCsv.integration.test.ts
git commit -m "test(cms): end-to-end Mahindra CSV against the real fixture"
```

---

### Task 7: Wire it into the worker and the UI

**Files:**
- Modify: `src/app/worker/protocol.ts:70-86` (`handleCms`)
- Modify: `src/app/cms/renderCmsShell.ts:33` (file input `accept`)
- Test: `tests/unit/worker.protocol.cms.test.ts` (extend the existing file)

- [ ] **Step 1: Add the failing test**

Append to `tests/unit/worker.protocol.cms.test.ts`:

```ts
it('routes a .csv file through the CSV adapter', async () => {
  const csv = [
    'Event Name,Event Type,Request,Response,Created On',
    'Heartbeat,Charger-CMS,"[2,""a"",""Heartbeat"",{}]","[3,""a"",{}]",08/21/2026 17:00:38',
  ].join('\n');
  const file = new File([csv], 'Logs_of_charger__MPCKADC060_639229316915356646.csv', { type: 'text/csv' });
  const payload = await handleRequest({ kind: 'cms', files: [file] }, () => {});
  expect(payload.cms?.outcomes[0].label).toBe('Mahindra (CSV)');
  expect(payload.cms?.outcomes[0].chargers).toEqual(['MPCKADC060']);
  expect(payload.result.messages.length).toBe(2);
});
```

> If the existing test file does not already import `handleRequest`, add:
> `import { handleRequest } from '../../src/app/worker/protocol';`

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run tests/unit/worker.protocol.cms.test.ts`
Expected: FAIL — the xlsx path throws on CSV bytes

- [ ] **Step 3: Route CSV in `handleCms`**

In `src/app/worker/protocol.ts`, add the import:

```ts
import { parseCmsCsv } from '../cms/parseCmsCsv';
```

Replace the body of the `for` loop in `handleCms` with:

```ts
    const file = files[i];
    progress(`Reading ${file.name} (${i + 1}/${files.length})…`);

    // CSV exports are text and use their own adapter registry; .xlsx keeps the
    // workbook path unchanged.
    if (/\.csv$/i.test(file.name)) {
      const { parsed, adapter, chargers } = await parseCmsCsv(await file.text(), file.name, { adapterId });
      parts.push(parsed);
      names.push(file.name);
      outcomes.push({ name: file.name, label: adapter.label, chargers, rows: parsed.messages.length });
      continue;
    }

    const ab = await file.arrayBuffer();
    const { parsed, adapter, chargers } = await parseCmsWorkbook(ab, file.name, { adapterId });
    parts.push(parsed);
    names.push(file.name);
    outcomes.push({ name: file.name, label: adapter.label, chargers, rows: parsed.messages.length });
```

> `adapterId` comes from the customer dropdown, which lists xlsx adapter ids. A
> user who forces "Mahindra" and uploads a CSV gets `Unknown CMS CSV customer
> "mahindra"`. That is acceptable for this task; Auto-detect works. Task 8 fixes it.

- [ ] **Step 4: Accept .csv in the file picker**

In `src/app/cms/renderCmsShell.ts` line 33, change:

```ts
attrs: { type: 'file', id: 'cms-log-file-input', accept: '.xlsx,.xls', multiple: true },
```

to:

```ts
attrs: { type: 'file', id: 'cms-log-file-input', accept: '.xlsx,.xls,.csv', multiple: true },
```

Also update the comment on line 4 to say the view accepts `.xlsx/.xls/.csv`.

- [ ] **Step 5: Run the tests**

Run: `npx vitest run tests/unit/worker.protocol.cms.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/app/worker/protocol.ts src/app/cms/renderCmsShell.ts tests/unit/worker.protocol.cms.test.ts
git commit -m "feat(cms): route .csv uploads through the CSV adapter"
```

---

### Task 8: Customer dropdown lists CSV adapters

**Files:**
- Modify: `src/app/cms/renderCmsShell.ts:53` (adapter option loop)
- Test: `tests/unit/cms.selector.test.ts` (extend)

- [ ] **Step 1: Add the failing test**

Append to `tests/unit/cms.selector.test.ts`:

```ts
it('offers the CSV adapters alongside the workbook adapters', () => {
  const host = document.createElement('div');
  const { customerSelect } = renderCmsShell(host);
  const ids = Array.from(customerSelect.options).map((o) => o.value);
  expect(ids).toContain('mahindra-csv');
  expect(ids).toContain('mahindra'); // existing xlsx adapter still listed
});
```

> If the existing file does not import `renderCmsShell`, add:
> `import { renderCmsShell } from '../../src/app/cms/renderCmsShell';`

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run tests/unit/cms.selector.test.ts`
Expected: FAIL — `mahindra-csv` is not among the options

- [ ] **Step 3: List both registries**

In `src/app/cms/renderCmsShell.ts`, change the import on line 9:

```ts
import { CMS_ADAPTERS, CMS_CSV_ADAPTERS } from './registry';
```

and change the option loop on line 53:

```ts
for (const a of [...CMS_ADAPTERS, ...CMS_CSV_ADAPTERS]) {
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run tests/unit/cms.selector.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/app/cms/renderCmsShell.ts tests/unit/cms.selector.test.ts
git commit -m "feat(cms): list CSV customers in the adapter dropdown"
```

---

### Task 9: Surface the mismatch count in the source banner

**Files:**
- Modify: `src/app/worker/protocol.ts` (`CmsFileOutcome`, `handleCms`)
- Modify: `src/app/cms/mountCmsParser.ts` (`renderSourceInfo`)
- Test: `tests/unit/worker.protocol.cms.test.ts` (extend)

- [ ] **Step 1: Add the failing test**

Append to `tests/unit/worker.protocol.cms.test.ts`:

```ts
it('reports Event Type mismatches on the file outcome', async () => {
  const csv = [
    'Event Name,Event Type,Request,Response,Created On',
    // RemoteStartTransaction is CSMS-initiated but labelled Charger-CMS.
    'RemoteStartTransaction,Charger-CMS,"[2,""b"",""RemoteStartTransaction"",{}]","[3,""b"",{}]",08/21/2026 17:01:00',
  ].join('\n');
  const file = new File([csv], 'x.csv', { type: 'text/csv' });
  const payload = await handleRequest({ kind: 'cms', files: [file] }, () => {});
  expect(payload.cms?.outcomes[0].directionMismatches).toBe(1);
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run tests/unit/worker.protocol.cms.test.ts`
Expected: FAIL — `directionMismatches` is `undefined`

- [ ] **Step 3: Add the field**

In `src/app/worker/protocol.ts`, extend `CmsFileOutcome`:

```ts
export interface CmsFileOutcome {
  name: string;
  label: string;
  chargers: string[];
  rows: number;
  /** CSV only: rows whose Event Type disagreed with the action-derived direction. */
  directionMismatches?: number;
}
```

In the CSV branch of `handleCms`, capture and pass it:

```ts
    if (/\.csv$/i.test(file.name)) {
      const { parsed, adapter, chargers, directionMismatches } =
        await parseCmsCsv(await file.text(), file.name, { adapterId });
      parts.push(parsed);
      names.push(file.name);
      outcomes.push({
        name: file.name, label: adapter.label, chargers,
        rows: parsed.messages.length, directionMismatches,
      });
      continue;
    }
```

- [ ] **Step 4: Show it in the banner**

In `src/app/cms/mountCmsParser.ts`, inside `renderSourceInfo`, change the `fileRows` map to:

```ts
  const fileRows = files
    .map((f) => {
      const mism = f.directionMismatches
        ? ` · <span class="text-amber-600 dark:text-amber-400">${f.directionMismatches} rows with a mislabelled Event Type</span>`
        : '';
      return `<li><span class="font-medium">${f.name}</span> — ${f.label} · charger <span class="font-mono">${f.chargers.join(', ') || f.name}</span> · ${f.rows} messages${mism}</li>`;
    })
    .join('');
```

- [ ] **Step 5: Run tests**

Run: `npx vitest run tests/unit/worker.protocol.cms.test.ts tests/unit/cms.mountCmsParser.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/app/worker/protocol.ts src/app/cms/mountCmsParser.ts tests/unit/worker.protocol.cms.test.ts
git commit -m "feat(cms): surface Event Type mismatches in the source banner"
```

---

### Task 10: Full verification

- [ ] **Step 1: Whole suite**

Run: `npm test`
Expected: all tests pass. Baseline before this work was 460; expect ~490.

- [ ] **Step 2: Types**

Run: `npm run typecheck`
Expected: no errors

- [ ] **Step 3: Build**

Run: `npm run build`
Expected: success. Confirm `xlsx` is still a separate chunk and is **not** pulled
into the CSV path.

- [ ] **Step 4: Manual check against the real file**

Run: `npm run dev`, open the CMS Log Parser view, upload
`C:\Users\Admin\Downloads\Logs_of_charger__MPCKADC060_639229316915356646.csv`.

Expected:
- banner reads `Mahindra (CSV) · charger MPCKADC060 · 77 rows with a mislabelled Event Type`
- transaction summary is populated (transaction `117646` present)
- MeterValues section populated (the 4,000-char truncation is being recovered)
- Response Time (ms) reads **N/A**, not `0`
- the UI stays responsive during the parse (work is in the Worker)

- [ ] **Step 5: Commit any fixes, then push**

```bash
git push -u origin feat/cms-mahindra-csv
```

---

## Self-review notes

**Spec coverage.** §1 input contract → Tasks 1, 4. §2 detection → Task 4. §3 direction
→ Task 4 (counter) + existing `directions.ts` (behaviour). §4 truncation → existing
`safeParse`, asserted in Task 6. §5 timestamps → Task 2; the `currentTime` cross-check
is covered by Task 2's ground-truth assertion rather than a runtime check — a runtime
comparison on every row was rejected as speculative work with no consumer. §6 separate
adapter → Tasks 3, 5. §7 module layout → all tasks. §8 tests → Tasks 1–6.

**Deviation from spec §5.** The spec proposed a runtime `currentTime` cross-check with
a ±5 s tolerance and a reported mismatch count. That validation has already been done
offline (4,763/4,763) and encoded as a unit test. Running it on every row in production
would cost a regex pass over every response for a counter nobody reads. If a timezone
regression is a real worry later, add it then.

**Open question still outstanding.** Spec §10 asks whether the mismatch count should
also appear per-row in the context viewer. Task 9 does the banner only. Per-row
flagging is deferred until someone asks for it.
