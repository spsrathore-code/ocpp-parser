// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { initDowntimeDetailFilters } from '../../src/app/uptime/render/downtimeDetailFilters';

/** Minimal stand-in for the rendered 1.2 markup. */
function build(rows: { cat: string; conn: number; pairing: string; delta: number | null; a: number; b: number }[]): HTMLElement {
  const host = document.createElement('div');
  host.innerHTML = `
    <div id="dd-filters">
      <select id="dd-category"><option value=""></option><option value="PowerFailure">PowerFailure</option><option value="Offline">Offline</option></select>
      <select id="dd-connector"><option value=""></option><option value="1">C1</option><option value="2">C2</option></select>
      <select id="dd-pairing"><option value=""></option><option value="matched"></option><option value="one-sided"></option><option value="a-only"></option><option value="b-only"></option></select>
      <select id="dd-delta"><option value=""></option><option value="material"></option><option value="pos"></option><option value="neg"></option></select>
      <input id="dd-min" type="number" />
    </div>
    <table><tbody>${rows.map((r) => `
      <tr class="dd-row" data-category="${r.cat}" data-connector="${r.conn}" data-pairing="${r.pairing}"
          data-material="${r.delta !== null && Math.abs(r.delta) > 5 ? '1' : '0'}"
          data-delta="${r.delta === null ? '' : r.delta}" data-a-sec="${r.a}" data-b-sec="${r.b}"></tr>`).join('')}
    </tbody></table>
    <span id="dd-total-a"></span><span id="dd-total-b"></span><span id="dd-total-delta"></span><span id="dd-count"></span>`;
  document.body.appendChild(host);
  initDowntimeDetailFilters(host);
  return host;
}

const visible = (h: HTMLElement) => Array.from(h.querySelectorAll<HTMLElement>('tr.dd-row')).filter((r) => !r.hidden);
const set = (h: HTMLElement, id: string, v: string) => {
  const el = h.querySelector<HTMLSelectElement | HTMLInputElement>(`#${id}`)!;
  el.value = v;
  el.dispatchEvent(new Event('change'));
};

const SAMPLE = [
  { cat: 'PowerFailure', conn: 1, pairing: 'matched', delta: 2, a: 600, b: 480 },
  { cat: 'PowerFailure', conn: 2, pairing: 'matched', delta: 44.4, a: 3600, b: 936 },
  { cat: 'Offline', conn: 1, pairing: 'a-only', delta: null, a: 300, b: 0 },
  { cat: 'Offline', conn: 1, pairing: 'b-only', delta: null, a: 0, b: 900 },
  { cat: 'PowerFailure', conn: 1, pairing: 'matched', delta: -8, a: 120, b: 600 },
];

beforeEach(() => { document.body.innerHTML = ''; });

describe('1.2 filters', () => {
  it('filters by category', () => {
    const h = build(SAMPLE);
    set(h, 'dd-category', 'Offline');
    expect(visible(h)).toHaveLength(2);
  });

  it('filters by connector', () => {
    const h = build(SAMPLE);
    set(h, 'dd-connector', '2');
    expect(visible(h)).toHaveLength(1);
  });

  it('filters to site-specific events, which is where a delta is misleading', () => {
    const h = build(SAMPLE);
    set(h, 'dd-pairing', 'one-sided');
    expect(visible(h)).toHaveLength(2);
  });

  it('filters to just the highlighted deltas', () => {
    const h = build(SAMPLE);
    set(h, 'dd-delta', 'material');
    expect(visible(h)).toHaveLength(2); // 44.4 and -8
  });

  it('filters by delta direction', () => {
    const h = build(SAMPLE);
    set(h, 'dd-delta', 'neg');
    expect(visible(h)).toHaveLength(1);
  });

  it('excludes unpaired rows from a direction filter rather than treating them as zero', () => {
    const h = build(SAMPLE);
    set(h, 'dd-delta', 'pos');
    expect(visible(h).every((r) => r.dataset.delta !== '')).toBe(true);
  });

  it('filters by a minimum absolute delta', () => {
    const h = build(SAMPLE);
    set(h, 'dd-min', '10');
    expect(visible(h)).toHaveLength(1); // only 44.4
  });

  it('combines filters', () => {
    const h = build(SAMPLE);
    set(h, 'dd-category', 'PowerFailure');
    set(h, 'dd-connector', '1');
    expect(visible(h)).toHaveLength(2);
  });

  it('recomputes the subtotal from the VISIBLE rows — it says "Filtered subtotal"', () => {
    const h = build(SAMPLE);
    set(h, 'dd-category', 'Offline');
    expect(h.querySelector('#dd-total-a')!.textContent).toBe('0:05:00');   // 300s
    expect(h.querySelector('#dd-total-b')!.textContent).toBe('0:15:00');   // 900s
    expect(h.querySelector('#dd-count')!.textContent).toBe('2');
  });

  it('recomputes the delta total and its sign', () => {
    const h = build(SAMPLE);
    set(h, 'dd-category', 'Offline');
    // 300 - 900 = -600s = -0.17h
    expect(h.querySelector('#dd-total-delta')!.textContent).toBe('−0.17 hrs');
  });

  it('restores everything when filters are cleared', () => {
    const h = build(SAMPLE);
    set(h, 'dd-category', 'Offline');
    set(h, 'dd-category', '');
    expect(visible(h)).toHaveLength(5);
  });

  it('does nothing when the section is absent', () => {
    const empty = document.createElement('div');
    expect(() => initDowntimeDetailFilters(empty)).not.toThrow();
  });
});
