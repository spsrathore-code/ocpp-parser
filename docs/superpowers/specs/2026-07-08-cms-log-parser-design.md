# CMS Log Parser — Design & To-Do

> Date: 2026-07-08 · Tool #5 (Parser), new view **CMS Log Parser** in the OCPP Suite.
> Source of the already-built logic: `archive/OCPP Transaction Simulator Extended V3_17 Aug.html`.
> Governing principles: `operating-principles.md` (modularity, ≤2000 lines/file, Boil-the-Lake completeness, standards-first, tests + docs = Definition of Done).

---

## 1. Problem & Goal

Add a **CMS Log Parser** view that does for **CMS-side Excel logs** exactly what the
Client Log Parser does for **controller text logs**. CMS logs arrive as `.xlsx`
(one customer today — **CZ**; sample `data/samples/CZ CMS Logs Sample.xlsx`), and
future customers will supply their own Excel layouts. Because both sources carry
the **same OCPP 1.6J traffic**, all analysis logic is shared — only ingestion
differs.

**Success criteria**
- Upload a CZ CMS `.xlsx` → the same rich analysis the Client parser produces.
- All *relevant* Client-parser sections appear in the CMS parser (point #3).
- Adding a new customer = adding one adapter, no pipeline changes (point #2).
- `tsc` clean, `vitest` green (incl. a CZ-sample regression fixture), no file > 2000 lines.

## 2. Core architectural insight (why this is a port, not a rewrite)

The whole analysis + render stack runs on one contract:

```
ParsedLines = { messages: ParsedMessage[]; events: ParsedEvent[]; alerts: ParsedAlert[]; internalTxMap }
```

`analyze()` (`src/app/analyze.ts`) and `renderResults()` (21 sections in
`SECTION_ORDER`) are **source-agnostic**. Text path today:
`lines → parseLines() → ParsedLines`. We add a parallel CMS path:
`.xlsx → cmsExcelAdapter → ParsedLines`. Everything after that is reused verbatim —
correlate, groupMessages, processTransactions, detect/*, health/*, protocol/*,
compliance/*, all render sections, Excel export, context viewer.

**CZ row shape** (data starts after 3 header rows; sheet named by charger id, e.g. `MH0055`):

| Sr No. | Request String | Response String | Request Time | Response Time |
|--------|----------------|-----------------|--------------|---------------|
| 1593 | `[2,"<uuid>","Heartbeat",{}]` | `[3,"<uuid>",{"currentTime":"…Z"}]` | `08/08/2025, 00:02:42` | `08/08/2025, 00:02:42` |

Each row → **two** `ParsedMessage`s (the CALL and its CALLRESULT, same `msgId`) so
the existing `correlateMessages()` links `responsePayload` unchanged.

## 3. Decisions (RESOLVED 2026-07-08)

- **D1 — Events & Alerts → DERIVE.** CMS Excel has no free-text event/alert lines, so
  the CMS adapter **derives Alerts from `StatusNotification` where `errorCode ≠ NoError`**
  (standards-faithful, keeps the section meaningful). Events stay empty by nature.
- **D2 — Timestamp/timezone → STORE SORTABLE, DISPLAY IST.** CZ `Request Time` is IST
  `dd/mm/yyyy, HH:MM:SS`; payload `currentTime` is UTC. Adapter normalizes internally
  to a sortable canonical form but the UI renders the customer's original IST times.
- **D3 — Context viewer → SYNTHESIZE.** No raw text lines exist, so the adapter builds
  one readable line per Excel row (`[time] REQ … / RESP …`) into `rawLogLines` so
  Preview/Download "log context" keeps working.

## 4. To-Do List

### Phase A — Ingestion adapter (the only genuinely new code)
- [ ] A1. Confirm `xlsx` (SheetJS) is bundled for the browser path (already a dep via export). Verify tree-shaken/lazy import so it doesn't bloat the Client-parser entry.
- [ ] A2. Create `src/app/cms/` module dir (keep each file focused, ≤2000 lines).
- [ ] A3. Define `CmsFormatAdapter` interface + registry (scalable multi-customer): `{ id, label, detect(workbook): boolean, extractRows(workbook): CmsRow[] }`. Mirrors the pluggable rulepack pattern.
- [ ] A4. Implement **CZ adapter**: `findDataSheet()` scanner (port archive ~L1626–1649), column mapping (Sr No./Request/Response/Request Time/Response Time) **+ the `CreatedOn` single-timestamp variant** (archive ~L1656–1667).
- [ ] A5. Implement `detectAdapter(workbook)` — sniff columns → choose adapter; clear, actionable error if no adapter matches (unknown customer format).
- [ ] A6. Implement `cmsRowsToParsedLines(rows)` — core mapping: each row → request `ParsedMessage` (CALL) + response `ParsedMessage` (CALLRESULT) with normalized timestamps + shared `msgId`; emit `events`/`alerts` per **D1**.
- [ ] A7. Timestamp normalization (`dd/mm/yyyy, HH:MM:SS` IST → sortable canonical) per **D2**. Unit-tested.
- [ ] A8. `parseCmsWorkbook(arrayBuffer, fileName): Promise<ParsedLines>` orchestrator — async/chunked for large sheets (parity with `parseLinesAsync`), memory-lean `XLSX.read` opts (archive ~L1681–1706).

### Phase B — Wire the view
- [ ] B1. `mountCmsParser(container)` mirroring `mountParser`: `.xlsx/.xls` file input, drag-drop, load→analyze→render, load spinner, error surface (reuse `renderResults` + all sections + export + context viewer).
- [ ] B2. Flip `cms-logs` nav view to `enabled: true` + `mount: mountCmsParser` in `src/app/nav/navConfig.ts`.
- [ ] B3. `rawLogLines` for context viewer per **D3** (synthesize per-row text, or graceful disable).
- [ ] B4. Multi-file / multi-sheet upload parity (multiple customer files); note the known cross-file message-id-collision bug as a scope boundary.

### Phase C — Section parity & CMS-specific handling
- [ ] C1. Audit all 21 sections vs CMS data; document populated / empty-by-nature / needs-derivation. Resolve **D1**.
- [ ] C2. Debug Info section — show CMS source facts (customer/adapter, sheet, row count, request/response time range) instead of text-line stats.
- [ ] C3. Heartbeats / WebSocket Health — verify they populate from CMS Heartbeat pairs; check `direction` semantics (CMS perspective is inverted vs charger).
- [ ] C4. Downtime + Power-Restore / Emergency-Stop sync flags read text patterns absent from Excel — confirm graceful-empty behavior and document.

### Phase D — Tests, docs, tracking (Definition of Done)
- [ ] D1t. Unit tests: CZ adapter, `detectAdapter`, `cmsRowsToParsedLines`, timestamp normalization — against a CZ fixture.
- [ ] D2t. Integration test: `parseCmsWorkbook → analyze` on the real CZ sample; assert section counts.
- [ ] D3t. Commit a small golden fixture derived from `CZ CMS Logs Sample.xlsx`.
- [ ] D4d. Docs: `specs/requirements.md` (SSOT), `CLAUDE.md` tool table, `specs/roadmap.md`, `specs/tasks.md`, `CHANGELOG.md`; add **"How to add a new customer CMS format"** guide.
- [ ] D5g. Branch `feat/cms-log-parser`; `/review` + `/qa` before PR → merge.

## 4b. Build status (2026-07-09) — Phases A–C DONE

Branch `feat/cms-log-parser`. Full suite **410/410**, `tsc` clean. `src/app/cms/`:
`timestamps · directions · rowsToParsedLines · adapters/cz · registry ·
parseCmsWorkbook · mergeCmsParsed · renderCmsShell · mountCmsParser`. Nav view
enabled (lazy-mounted → xlsx stays a 429 kB separate chunk).

**Section-parity audit on the real CZ sample** (`data/samples/CZ CMS Logs Sample.xlsx`,
3204 messages, charger MH0055) — every relevant section populates:

| Populated ✅ | Empty by nature (Excel lacks the source data) |
|---|---|
| Debug Info, Boot (1), Heartbeats (311), Status (124), Start (12), Stop (13), Transaction Summary (12 txns), Connector Stats (2), Meter Values (1082), **Alerts (12, derived from faulted StatusNotifications)**, Downtime (1), Incomplete Tx (1), Energy Dispense (2), Fault Status Summary, Protocol Compliance, CP-Initiated Compliance §4 | **Events** (no free-text event lines), **Power-Restore / Emergency-Stop Sync** (weak signal in Excel), **WebSocket Health** (no WS ping/pong text) |

Debug-Info log span validated: 2025-08-08 00:00 → 2025-08-09 01:59 IST (25h 58m),
matching the file's stated date range. A Phase-C fix leads synthesized context-viewer
lines with the canonical UTC timestamp so the span scan isn't skewed by IST.

**Remaining:** Phase D (docs/tracking) + user visual verification + PR.

## 4c. Adding a new customer CMS format

1. Create `src/app/cms/adapters/<id>.ts` exporting a `CmsFormatAdapter`:
   - `detect(workbook)` — return true only for this customer's layout (be specific
     enough not to collide with other adapters).
   - `extractRows(workbook)` — normalize its sheet(s) to `CmsRow[]`
     (`requestString` / `responseString` / `requestTime` / `responseTime` /
     `sheetName` / optional `srNo`). Reuse the CZ helpers as a template.
   - If its wall-clock zone isn't IST, add a timestamp converter alongside
     `timestamps.ts` and use it in the adapter (store UTC ISO).
2. Register it in `src/app/cms/registry.ts` (`CMS_ADAPTERS`).
3. Add a fixture + adapter test mirroring `cms.czAdapter.test.ts`.
   Nothing downstream changes — the shared pipeline handles the rest.

## 5. Explicitly out of scope (v1)
- Non-CZ customer adapters (framework ready; adapters added on demand — point #2 part 2).
- Fixing the pre-existing cross-file message-id-collision bug (tracked separately).
- CSMS dashboard / other suite views.
