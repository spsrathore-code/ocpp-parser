// Render a rendered <table> to a PNG, with no external dependency.
//
// The suite's existing PNG download works on Chart.js canvases, which are
// already pixels. These sections are HTML tables, so they have to be drawn.
// html2canvas would do it, but adding a dependency for one button is a poor
// trade on a page that loads Tailwind from a CDN and keeps its bundle lean.
//
// Styles are read back from the DOM with getComputedStyle rather than
// re-declared here, so the image matches whatever is on screen — including the
// navy header treatment, the zebra striping, the delta tints, and the viewer's
// light or dark theme.

/** Timestamp suffix, matching the chart downloads: YYYY-MM-DD_HH-MM-SS. */
function pngTimestamp(): string {
  const d = new Date();
  const p = (n: number): string => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}_${p(d.getHours())}-${p(d.getMinutes())}-${p(d.getSeconds())}`;
}

/** First non-transparent background walking up from the cell. */
function backgroundOf(cell: HTMLElement): string {
  let node: HTMLElement | null = cell;
  while (node) {
    const bg = getComputedStyle(node).backgroundColor;
    if (bg && bg !== 'transparent' && !bg.startsWith('rgba(0, 0, 0, 0)')) return bg;
    node = node.parentElement;
  }
  return '#FFFFFF';
}

/** Break `text` into lines that fit `maxWidth`, truncating the last with an ellipsis. */
function wrap(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, maxLines: number): string[] {
  if (ctx.measureText(text).width <= maxWidth) return [text];
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (ctx.measureText(next).width <= maxWidth) { current = next; continue; }
    if (current) lines.push(current);
    current = word;
    if (lines.length === maxLines) break;
  }
  if (current && lines.length < maxLines) lines.push(current);
  // Anything that still overflows gets an ellipsis, so the image never lies by
  // silently cropping mid-word.
  const last = lines[lines.length - 1];
  if (last !== undefined && ctx.measureText(last).width > maxWidth) {
    let trimmed = last;
    while (trimmed.length > 1 && ctx.measureText(`${trimmed}…`).width > maxWidth) {
      trimmed = trimmed.slice(0, -1);
    }
    lines[lines.length - 1] = `${trimmed}…`;
  }
  return lines;
}

/** Draw `table` (plus a title bar) onto a canvas at 2x for a crisp image. */
export function tableToCanvas(table: HTMLTableElement, title: string): HTMLCanvasElement | null {
  const scale = 2;
  const titleBar = title ? 56 : 0;
  const width = Math.max(table.scrollWidth, table.offsetWidth);
  const height = table.offsetHeight;

  const canvas = document.createElement('canvas');
  canvas.width = width * scale;
  canvas.height = (height + titleBar) * scale;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.scale(scale, scale);

  const pageBg = getComputedStyle(document.body).backgroundColor || '#FFFFFF';
  ctx.fillStyle = pageBg.startsWith('rgba(0, 0, 0, 0)') ? '#FFFFFF' : pageBg;
  ctx.fillRect(0, 0, width, height + titleBar);

  if (title) {
    ctx.fillStyle = '#0C2340';
    ctx.fillRect(0, 0, width, titleBar);
    ctx.fillStyle = '#FFFFFF';
    ctx.font = "bold 20px Arial, Helvetica, sans-serif";
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(title, 16, titleBar / 2);
  }

  const tableTop = table.getBoundingClientRect().top;
  const tableLeft = table.getBoundingClientRect().left;

  for (const row of Array.from(table.rows)) {
    for (const cell of Array.from(row.cells)) {
      const box = cell.getBoundingClientRect();
      const x = box.left - tableLeft;
      const y = box.top - tableTop + titleBar;
      const style = getComputedStyle(cell);

      ctx.fillStyle = backgroundOf(cell);
      ctx.fillRect(x, y, box.width, box.height);

      // Hairline rule, matching the table's own bottom border.
      const border = style.borderBottomColor;
      if (border && !border.startsWith('rgba(0, 0, 0, 0)')) {
        ctx.strokeStyle = border;
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(x, y + box.height);
        ctx.lineTo(x + box.width, y + box.height);
        ctx.stroke();
      }

      const text = (cell.textContent ?? '').replace(/\s+/g, ' ').trim();
      if (!text) continue;

      const size = parseFloat(style.fontSize) || 13;
      const weight = style.fontWeight;
      ctx.font = `${weight === '400' || weight === 'normal' ? '' : 'bold '}${size}px Arial, Helvetica, sans-serif`;
      ctx.fillStyle = style.color;
      ctx.textBaseline = 'middle';

      const padX = 12;
      const maxWidth = box.width - padX * 2;
      const maxLines = Math.max(1, Math.floor(box.height / (size * 1.35)));
      const lines = wrap(ctx, text, maxWidth, maxLines);
      const lineHeight = size * 1.35;
      const blockTop = y + box.height / 2 - ((lines.length - 1) * lineHeight) / 2;

      const align = style.textAlign === 'right' ? 'right' : style.textAlign === 'center' ? 'center' : 'left';
      ctx.textAlign = align;
      const tx = align === 'right' ? x + box.width - padX : align === 'center' ? x + box.width / 2 : x + padX;
      lines.forEach((line, i) => ctx.fillText(line, tx, blockTop + i * lineHeight));
    }
  }

  return canvas;
}

/** Render `table` to a PNG and trigger a download. */
export function downloadTablePng(table: HTMLTableElement, title: string): void {
  const canvas = tableToCanvas(table, title);
  if (!canvas) return;
  canvas.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title.replace(/[^A-Za-z0-9]+/g, '_').replace(/^_|_$/g, '') || 'table'}_${pngTimestamp()}.png`;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 'image/png', 1.0);
}
