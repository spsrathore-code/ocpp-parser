// Filtering for 1.2 Downtime Detail.
//
// The subtotal strip is labelled "Filtered subtotal", so it has to mean it: the
// totals and the delta recompute from the visible rows on every change. A
// subtotal that ignored the filter would be worse than no subtotal, because it
// looks like it belongs to what you are reading.

import { formatDuration } from '../duration';

interface Filters {
  category: string;
  connector: string;
  pairing: string;
  delta: string;
  minAbs: number;
}

function matches(row: HTMLElement, f: Filters): boolean {
  if (f.category && row.dataset.category !== f.category) return false;
  if (f.connector && row.dataset.connector !== f.connector) return false;

  if (f.pairing === 'one-sided' && row.dataset.pairing === 'matched') return false;
  if (f.pairing && f.pairing !== 'one-sided' && row.dataset.pairing !== f.pairing) return false;

  const raw = row.dataset.delta;
  const delta = raw === '' || raw === undefined ? null : Number(raw);

  if (f.delta === 'material' && row.dataset.material !== '1') return false;
  // A row with no counterpart has no delta, so it cannot satisfy a
  // direction filter — excluding it is the honest answer, not treating
  // "unknown" as zero.
  if (f.delta === 'pos' && !(delta !== null && delta > 0)) return false;
  if (f.delta === 'neg' && !(delta !== null && delta < 0)) return false;

  if (f.minAbs > 0 && !(delta !== null && Math.abs(delta) >= f.minAbs)) return false;

  return true;
}

/** Wire the 1.2 filter controls inside `root`. No-op when the section is absent. */
export function initDowntimeDetailFilters(root: ParentNode): void {
  const bar = root.querySelector('#dd-filters');
  if (!bar) return;

  const rows = Array.from(root.querySelectorAll<HTMLElement>('tr.dd-row'));
  const totalA = root.querySelector<HTMLElement>('#dd-total-a');
  const totalB = root.querySelector<HTMLElement>('#dd-total-b');
  const totalDelta = root.querySelector<HTMLElement>('#dd-total-delta');
  const count = root.querySelector<HTMLElement>('#dd-count');
  const get = (id: string): HTMLSelectElement | HTMLInputElement | null =>
    root.querySelector<HTMLSelectElement | HTMLInputElement>(`#${id}`);

  const apply = (): void => {
    const f: Filters = {
      category: get('dd-category')?.value ?? '',
      connector: get('dd-connector')?.value ?? '',
      pairing: get('dd-pairing')?.value ?? '',
      delta: get('dd-delta')?.value ?? '',
      minAbs: Math.max(0, Number(get('dd-min')?.value) || 0),
    };

    let aSec = 0;
    let bSec = 0;
    let visible = 0;

    for (const row of rows) {
      const show = matches(row, f);
      row.hidden = !show;
      if (!show) continue;
      // Re-stripe as rows come and go, or the zebra reads as missing data.
      row.style.background = visible % 2 === 1 ? '#F5F6F8' : '#FFFFFF';
      aSec += Number(row.dataset.aSec) || 0;
      bSec += Number(row.dataset.bSec) || 0;
      visible += 1;
    }

    if (totalA) totalA.textContent = formatDuration(aSec);
    if (totalB) totalB.textContent = formatDuration(bSec);
    if (totalDelta) {
      const hours = Math.round(((aSec - bSec) / 3600) * 100) / 100;
      totalDelta.textContent = `${hours >= 0 ? '+' : '−'}${Math.abs(hours).toFixed(2)} hrs`;
      totalDelta.style.color = hours >= 0 ? '#B4462F' : '#1B7F5A';
    }
    if (count) count.textContent = String(visible);
  };

  for (const id of ['dd-category', 'dd-connector', 'dd-pairing', 'dd-delta', 'dd-min']) {
    const control = get(id);
    control?.addEventListener('change', apply);
    control?.addEventListener('input', apply);
  }
}
