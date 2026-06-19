// Excel export — faithful port of the legacy `exportTableToExcel` (HTML 7933).
// Exports a rendered <table> (by DOM id) to an .xlsx via SheetJS. xlsx is
// lazy-imported so it only loads when the user actually exports (code-split).

import { el } from '../render/dom';

/** Export the table with `tableId` to `filename`.xlsx. No-op (logs) if the table is absent. */
export async function exportTableToExcel(tableId: string, filename: string): Promise<void> {
  const table = document.getElementById(tableId);
  if (!table) {
    console.error('Table not found for export:', tableId);
    return;
  }
  const XLSX = await import('xlsx');
  const wb = XLSX.utils.table_to_book(table, { sheet: 'Sheet1' });
  XLSX.writeFile(wb, filename);
}

/** A green "Export to Excel" button wired to export `tableId` → `filename` (stops the collapse toggle). */
export function exportButton(tableId: string, filename: string): HTMLButtonElement {
  const btn = el('button', {
    className: 'bg-green-600 hover:bg-green-700 text-white font-semibold py-1 px-3 rounded-lg text-sm',
    text: 'Export to Excel',
    attrs: { type: 'button' },
  });
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    void exportTableToExcel(tableId, filename);
  });
  return btn;
}
