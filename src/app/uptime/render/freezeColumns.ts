// Freeze the leading columns of a wide table, so the row keeps its identity
// while you scroll sideways.
//
// These tables are wide by nature — 1.1 carries a column group per site, 1.2
// carries seventeen — and once "Site / Connector / Category" scrolls off, every
// remaining number belongs to a row you can no longer name.
//
// Offsets are measured rather than declared: column widths depend on site names
// and category text, so any hardcoded value would be wrong for somebody's data.
//
// Sticky cells sit above the scrolling content, so each one needs its own opaque
// background — a transparent cell would let the columns underneath show through
// it. The background is copied from the row, which is also why this has to be
// re-run after anything that re-stripes rows (the 1.2 filters do).

/** Apply, or re-apply, sticky positioning to the first `count` columns. */
export function freezeColumns(table: HTMLTableElement, count = 3): void {
  const rows = Array.from(table.rows);
  if (rows.length === 0) return;

  // Widths come from the widest row that actually has the columns — the header.
  const reference = rows.find((r) => r.cells.length >= count && !hasSpan(r, count));
  if (!reference) return;

  const offsets: number[] = [];
  let running = 0;
  for (let i = 0; i < count; i += 1) {
    offsets.push(running);
    running += reference.cells[i].getBoundingClientRect().width;
  }

  for (const row of rows) {
    // A row whose leading cells are merged (the subtotal strip) has no column 1
    // to pin; pinning part of a colspan would misalign the whole row.
    if (hasSpan(row, count) || row.cells.length < count) continue;

    const inHead = row.parentElement?.tagName === 'THEAD';
    const background = opaqueBackground(row);

    for (let i = 0; i < count; i += 1) {
      const cell = row.cells[i];
      cell.style.position = 'sticky';
      cell.style.left = `${offsets[i]}px`;
      // Above the body, and above the sticky header's own stacking context so a
      // frozen header cell stays on top of both axes at the corner.
      cell.style.zIndex = inHead ? '4' : '2';
      cell.style.background = background;
    }
  }
}

function hasSpan(row: HTMLTableRowElement, count: number): boolean {
  for (let i = 0; i < Math.min(count, row.cells.length); i += 1) {
    if (row.cells[i].colSpan > 1) return true;
  }
  return false;
}

/**
 * The row's background, resolved to something opaque.
 *
 * Walks up to the ancestors, because a table can carry its header colour on the
 * <thead> rather than each <tr> — 1.1 does exactly that, and reading only the
 * row turned its navy header cells white the moment they were pinned.
 */
function opaqueBackground(row: HTMLTableRowElement): string {
  let node: HTMLElement | null = row;
  while (node) {
    const colour = node.style.backgroundColor || getComputedStyle(node).backgroundColor;
    if (colour && !colour.startsWith('rgba(0, 0, 0, 0)') && colour !== 'transparent') return colour;
    node = node.parentElement;
    if (node?.tagName === 'BODY') break;
  }
  return '#FFFFFF';
}

/** Freeze every table inside `root` that is wide enough to need it. */
export function freezeWideTables(root: ParentNode, count = 3): void {
  for (const table of Array.from(root.querySelectorAll<HTMLTableElement>('table'))) {
    if (table.rows.length === 0) continue;
    // Only worth doing where the table actually overflows its container.
    const scroller = table.parentElement;
    if (scroller && table.scrollWidth <= scroller.clientWidth) continue;
    freezeColumns(table, count);
  }
}
