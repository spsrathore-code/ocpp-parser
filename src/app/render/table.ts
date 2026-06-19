// Generic data-table body — faithful port of the table portion of the legacy
// createCollapsibleSection (HTML 5043-5143). Returns a scrollable wrapper holding
// a <table>; the collapsible card + title/count come from collapsibleSection.
// A stable `tableId` is set so Phase 3d export can target the table.

import { el } from './dom';

/** A table row: header-name → cell value. `fileName` (if present) becomes a dedicated column. */
export type Row = Record<string, unknown> & { fileName?: string };

const TH = 'px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider sticky top-0 bg-gray-50 dark:bg-gray-700 z-10';
const TH_SNO = 'px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider sticky left-0 top-0 bg-gray-50 dark:bg-gray-700 z-20';
const TD = 'px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100';
const TD_SNO = 'px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900 dark:text-gray-100 sticky left-0 bg-white dark:bg-gray-800 z-10';

/** Faithful cell text: `value || 'N/A'` (renders 0 / '' as 'N/A', matching the legacy). */
function cellText(value: unknown): string {
  return String((value as string | number | undefined) || 'N/A');
}

export function dataTable(headers: string[], rows: Row[], tableId?: string, htmlColumns: readonly string[] = []): HTMLElement {
  const hasFileName = rows.length > 0 && Object.prototype.hasOwnProperty.call(rows[0], 'fileName');

  const headRow = el('tr', {}, [
    el('th', { className: TH_SNO, text: 'S.No.', attrs: { scope: 'col' } }),
    ...(hasFileName ? [el('th', { className: TH, text: 'File Name', attrs: { scope: 'col' } })] : []),
    ...headers.map((h) => el('th', { className: TH, text: h, attrs: { scope: 'col' } })),
  ]);

  const bodyRows = rows.map((row, i) =>
    el('tr', {}, [
      el('td', { className: TD_SNO, text: String(i + 1) }),
      ...(hasFileName ? [el('td', { className: TD, text: cellText(row.fileName), attrs: { title: cellText(row.fileName) } })] : []),
      ...headers.map((h) => htmlColumns.includes(h)
        ? el('td', { className: TD, html: String(row[h] ?? '') })
        : el('td', { className: TD, text: cellText(row[h]) })),
    ]),
  );

  const table = el('table', {
    className: 'min-w-full divide-y divide-gray-200 dark:divide-gray-700',
    attrs: tableId ? { id: tableId } : {},
  }, [
    el('thead', { className: 'bg-gray-50 dark:bg-gray-700' }, [headRow]),
    el('tbody', { className: 'bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700' }, bodyRows),
  ]);

  return el('div', { className: 'overflow-auto max-h-[500px]' }, [table]);
}
