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
    else if (ch === '\r') { /* CRLF: swallow here, \n branch ends the row */ }
    else if (ch === '\n') { if (dirty || field) { endField(); endRow(); } }
    else field += ch;
  }
  if (dirty || field) { endField(); endRow(); }
  return rows;
}
