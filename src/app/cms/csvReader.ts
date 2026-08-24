// Minimal RFC 4180 reader for CMS CSV exports.
//
// We do NOT use `xlsx` for CSV. The caller already reads the whole file into one
// string via file.text(), and this reader itself builds a complete string[][], so
// "avoids materializing the file" isn't the win — xlsx materializes it too. The
// real win is skipping xlsx's per-cell object overhead and its date/number-format
// pass (irrelevant to raw CSV text), and keeping a ~100 MB export off the workbook
// code path entirely. Fields hold OCPP JSON, so doubled-quote escapes and newlines
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
    // Outside quotes, \r and \n both end a row. A CRLF pair ends exactly one row:
    // \r defers to the following \n so CR and CRLF and lone LF all behave alike.
    else if (ch === '\r') { if (text[i + 1] !== '\n') { if (dirty || field) { endField(); endRow(); } } }
    else if (ch === '\n') { if (dirty || field) { endField(); endRow(); } }
    else field += ch;
  }
  if (dirty || field) { endField(); endRow(); }
  return rows;
}
