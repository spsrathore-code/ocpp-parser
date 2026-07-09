# CMS Multi-Customer Support (Mahindra · MSIL · selector UI) — Design

> Date: 2026-07-09 · Follows `2026-07-08-cms-log-parser-design.md` (§4c recipe).
> Branch: `feat/cms-multi-customer` (to be created off the merged integration branch
> once PR #3 and the worker PR land — user confirmed browser verification done).

## 1. Goal

Parse **Mahindra** (and later **MSIL**) CMS Excel logs in the CMS Log Parser,
alongside CZ (Chargezone). Formats may differ (columns, cell names, layout,
timestamps) but the **output is identical by construction**: every adapter
normalizes to `CmsRow[]` → shared `analyze()` → the same 21 sections. No analyzer
or render change is in scope, and none should be needed.

## 2. Decisions (user-confirmed 2026-07-09)

- **D1 — Upload UI = Option B:** ONE upload card + a **customer selector** above it:
  `Auto-detect · Chargezone · Mahindra · MSIL`. The selector is **generated from
  the adapter registry** (id + label), so registering a future adapter adds its
  option with zero UI edits. Rejected: (A) one upload card per customer — duplicated
  UI that grows linearly; (C) auto-detect only — no user override if two formats
  ever look alike.
- **D2 — Forced-adapter semantics:** choosing a customer bypasses `detect()` and
  uses that adapter directly; if `extractRows()` yields no OCPP rows, fail with a
  format-mismatch error naming the expected columns vs. what was found.
  `Auto-detect` (default) keeps today's behavior.
- **D3 — Sample-driven adapters:** no adapter is written without a real customer
  export in `data/samples/`. Mahindra sample: user supplying now. MSIL: adapter
  slot reserved; built when its sample arrives (the selector may list it as
  "coming soon"/disabled until an adapter is registered — driven by registry
  membership, not hardcoding).

## 3. Design

### 3.1 Registry extension (`src/app/cms/`)

- `registry.ts` — add `mahindraAdapter` (and later `msilAdapter`) to `CMS_ADAPTERS`.
- New: `getAdapter(id): CmsFormatAdapter | undefined` for forced selection.
- `parseCmsWorkbook(ab, fileName, opts?: { adapterId?: string })` — optional forced
  adapter; when set, skip detection. Mismatch error message must name the adapter
  label and the headers actually found (sharp diagnostics per D2).
- Worker protocol: `{ kind: 'cms', files, adapterId? }` — one optional field
  threaded through `runAnalysis` → `handleRequest` → `parseCmsWorkbook`.

### 3.2 Mahindra adapter (`src/app/cms/adapters/mahindra.ts`)

**Sample analysis (`data/samples/Mahindra CMS Log Sample.xlsx`, 2026-07-09):**
- One sheet `Logs_of_charger__MPCMHDC029_639`; **header at row 0** (no CZ preamble).
- Columns: `Event Name │ Event Type │ Request │ Response │ Created On`.
  - `Request` = CALL `[2,…]`, `Response` = CALLRESULT `[3,…]` — **paired like CZ**, so
    `cmsRowsToParsedLines` is unchanged.
  - `Event Type` = `Charger-CMS` / `CMS-Charger` — confirms direction, but the shared
    action-based §4/§5 derivation already yields the same result → **no model change**.
  - `Created On` = single IST timestamp (mirror to both req/resp times, the existing
    CreatedOn variant).

**Three verified issues this adapter must solve (probe 2026-07-09):**
- **A — detect collision:** `czAdapter.detect()` returns **true** on the Mahindra
  workbook (its rule is only "has request + response headers"). Fix both sides:
  (1) **tighten `czAdapter.detect`** to require a CZ-distinctive signal — `Request
  String`/`Response String` (the "string" suffix) or `Sr No.` — keeping the CZ sample
  passing; (2) **`mahindraAdapter.detect`** keys on its distinctive headers
  (`Event Name` + `Event Type` + `Created On`). Add a cross-detection regression test.
- **B — timestamp:** `istToUtcIso("2/7/26 15:19")` returns **null** (2-digit year, no
  seconds), and under the memory-lean read (`cellDates:false`) the cell arrives as an
  **Excel serial number** (`46060.638…`), not text. New
  `mahindraTimestampToUtcIso(value: string | number)` beside `timestamps.ts`:
  handle a serial (`XLSX.SSF`/epoch math → wall-clock components) **and** the
  `d/m/yy H:MM` string; treat as IST (verified: `15:19` vs payload `09:49:18Z` = +5:30)
  → UTC ISO. Unit-tested against both forms.
- **C — charger id:** `extractRows` should surface a clean charger id (strip the
  `Logs_of_charger__` prefix → `MPCMHDC029_639`) into `CmsRow.sheetName` for the banner.

`extractRows` reads timestamps with the numeric value preserved (so the serial isn't
stringified before conversion) — e.g. `sheet_to_json(..., { raw: true })` for the
Created-On column, or convert in the adapter when the cell is a number.

### 3.3 Selector UI (`renderCmsShell.ts` + `mountCmsParser.ts`)

- Shell gains a customer control (radio-pill row or `<select>`, Tailwind-consistent)
  rendered from `CMS_ADAPTERS` + a leading `Auto-detect`; default `Auto-detect`.
- Mount passes the selection as `adapterId` (undefined for auto).
- Source-info banner already names the detected/forced adapter label — unchanged.

## 4. Testing

- Mahindra fixture (trimmed real sample or synthesized workbook matching it) +
  adapter tests mirroring `cms.czAdapter.test.ts` (detect true/false vs CZ,
  extractRows shape, timestamps).
- Registry: `getAdapter`, forced-path success, forced-mismatch error text.
- Protocol: `adapterId` threading test.
- Shell/mount jsdom: selector renders all registry labels + Auto-detect; selection
  reaches `runAnalysis`.
- Cross-detection guard: CZ sample must NOT match `mahindraAdapter.detect`, and
  vice-versa (regression pin against ambiguity).
- Full CZ regression suite stays green (baselines 3204/12/12).

## 5. Success criteria

1. Mahindra sample → same analysis sections populated as CZ (values per its data).
2. CZ behavior unchanged (auto + forced).
3. Selector lists customers from the registry; forcing a wrong customer on a CZ
   file yields the sharp mismatch error.
4. `tsc` + build + full suite green.

## 6. Out of scope

- MSIL adapter until its sample arrives (slot + UI handling designed above).
- Any analyzer/render change (none expected; if the Mahindra format *forces* one,
  stop and surface it — that would violate the "same output" contract).
- Per-customer timezone plumbing beyond what the Mahindra sample actually needs.
