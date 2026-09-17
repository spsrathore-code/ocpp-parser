// Put "Export to Excel" and "Download PNG" on every table in the Uptime view.
//
// Done as a pass over the rendered DOM rather than by editing each renderer.
// There are a dozen-odd tables across four sections and their subsections, and
// wiring each by hand guarantees that the next one added quietly ships without
// buttons. Walking the container means a table cannot be forgotten.
//
// The label comes from the nearest preceding heading, so a downloaded file is
// named after the section it came from ("1.2 Downtime by Error Code", not
// "table-7").

import { downloadTablePng } from './tableImage';

/** Nearest preceding h3/h4/summary text — the table's own section title. */
function titleFor(table: HTMLTableElement, fallback: string): string {
  let node: Element | null = table;
  while (node) {
    let sibling: Element | null = node.previousElementSibling;
    while (sibling) {
      if (/^(H3|H4|H5|SUMMARY)$/.test(sibling.tagName)) {
        const text = (sibling.textContent ?? '').replace(/\s+/g, ' ').trim();
        if (text) return text;
      }
      sibling = sibling.previousElementSibling;
    }
    node = node.parentElement;
    if (node?.id === 'uptime-results') break;
  }
  return fallback;
}

async function exportTable(table: HTMLTableElement, filename: string): Promise<void> {
  const XLSX = await import('xlsx');
  // Sheet names are capped at 31 chars by the format and cannot contain :\/?*[]
  const sheet = filename.replace(/[\\/?*[\]:]/g, ' ').slice(0, 31) || 'Sheet1';
  const wb = XLSX.utils.table_to_book(table, { sheet });
  XLSX.writeFile(wb, `${filename.replace(/[^A-Za-z0-9]+/g, '_').replace(/^_|_$/g, '')}.xlsx`);
}

function button(label: string, className: string, onClick: () => void): HTMLButtonElement {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = className;
  btn.textContent = label;
  btn.addEventListener('click', (e) => {
    // These sit inside <details> and collapsible cards; without this a click
    // would also toggle the section shut.
    e.stopPropagation();
    e.preventDefault();
    onClick();
  });
  return btn;
}

const EXCEL_CLASS = 'bg-green-600 hover:bg-green-700 text-white font-semibold py-1 px-3 rounded-lg text-xs';
const PNG_CLASS = 'bg-slate-600 hover:bg-slate-700 text-white font-semibold py-1 px-3 rounded-lg text-xs';

/**
 * Add an export toolbar above every table inside `container`.
 * Idempotent: re-running after a re-render will not stack duplicate toolbars.
 */
export function attachExportControls(container: HTMLElement, siteContext = ''): void {
  const tables = Array.from(container.querySelectorAll('table'));

  for (const table of tables) {
    // The scroll wrapper is what sits in the layout; the toolbar goes above it.
    const anchor = table.parentElement?.classList.contains('overflow-x-auto')
      ? table.parentElement
      : table;
    const previous = anchor.previousElementSibling;
    if (previous?.classList.contains('uptime-export-bar')) continue;

    const title = titleFor(table, 'Uptime table');
    const filename = siteContext ? `${siteContext} — ${title}` : title;

    const bar = document.createElement('div');
    bar.className = 'uptime-export-bar flex flex-wrap gap-2 mt-3 mb-1';
    bar.appendChild(button('Export to Excel', EXCEL_CLASS, () => { void exportTable(table, filename); }));
    bar.appendChild(button('📥 Download PNG', PNG_CLASS, () => { downloadTablePng(table, filename); }));

    anchor.parentElement?.insertBefore(bar, anchor);
  }
}
