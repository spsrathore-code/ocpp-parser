// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { freezeColumns } from '../../src/app/uptime/render/freezeColumns';

function table(html: string): HTMLTableElement {
  const host = document.createElement('div');
  host.innerHTML = `<table>${html}</table>`;
  document.body.appendChild(host);
  return host.querySelector('table')!;
}

const cells = (row: HTMLTableRowElement) => Array.from(row.cells);

beforeEach(() => { document.body.innerHTML = ''; });

describe('freezeColumns', () => {
  it('pins the first three cells of every row', () => {
    const t = table(`<thead><tr><th>Site</th><th>Conn</th><th>Category</th><th>Start</th></tr></thead>
      <tbody><tr><td>A</td><td>1</td><td>PF</td><td>x</td></tr></tbody>`);
    freezeColumns(t, 3);
    for (const row of Array.from(t.rows)) {
      expect(cells(row).slice(0, 3).every((c) => c.style.position === 'sticky')).toBe(true);
      expect(cells(row)[3].style.position).toBe('');
    }
  });

  it('gives every pinned cell an opaque background', () => {
    // A transparent sticky cell lets the scrolling columns show through it.
    const t = table(`<tbody><tr style="background:#F5F6F8"><td>A</td><td>1</td><td>PF</td><td>x</td></tr></tbody>`);
    freezeColumns(t, 3);
    const row = t.rows[0];
    expect(cells(row).slice(0, 3).every((c) => c.style.background !== '')).toBe(true);
  });

  it('defaults to white where the row declares no background', () => {
    const t = table('<tbody><tr><td>A</td><td>1</td><td>PF</td><td>x</td></tr></tbody>');
    freezeColumns(t, 3);
    expect(t.rows[0].cells[0].style.background).toBe('rgb(255, 255, 255)');
  });

  it('stacks header cells above body cells', () => {
    const t = table(`<thead><tr><th>a</th><th>b</th><th>c</th><th>d</th></tr></thead>
      <tbody><tr><td>1</td><td>2</td><td>3</td><td>4</td></tr></tbody>`);
    freezeColumns(t, 3);
    const head = Number(t.tHead!.rows[0].cells[0].style.zIndex);
    const body = Number(t.tBodies[0].rows[0].cells[0].style.zIndex);
    expect(head).toBeGreaterThan(body);
  });

  it('keeps frozen BODY cells below the sticky header container', () => {
    // 1.2's <thead> is sticky at z-index 5. A frozen body cell above that
    // scrolls up OVER the header while every other column passes underneath.
    const t = table(`<thead style="position:sticky;z-index:5"><tr><th>a</th><th>b</th><th>c</th><th>d</th></tr></thead>
      <tbody><tr><td>1</td><td>2</td><td>3</td><td>4</td></tr></tbody>`);
    freezeColumns(t, 3);
    const body = Number(t.tBodies[0].rows[0].cells[0].style.zIndex);
    expect(body).toBeLessThan(5);
  });

  it('skips a row whose leading cells are merged', () => {
    // The 1.2 subtotal strip spans four columns; pinning part of a colspan
    // would misalign the whole row.
    const t = table(`<thead><tr><td colspan="4">Filtered subtotal</td></tr>
      <tr><th>a</th><th>b</th><th>c</th><th>d</th></tr></thead>`);
    freezeColumns(t, 3);
    expect(t.rows[0].cells[0].style.position).toBe('');
    expect(t.rows[1].cells[0].style.position).toBe('sticky');
  });

  it('is idempotent — re-running after a re-stripe is safe', () => {
    const t = table('<tbody><tr><td>a</td><td>b</td><td>c</td><td>d</td></tr></tbody>');
    freezeColumns(t, 3);
    const before = t.rows[0].cells[1].style.left;
    freezeColumns(t, 3);
    expect(t.rows[0].cells[1].style.left).toBe(before);
  });

  it('leaves a short row alone rather than pinning cells it does not have', () => {
    const t = table('<tbody><tr><td>only</td></tr></tbody>');
    expect(() => freezeColumns(t, 3)).not.toThrow();
    expect(t.rows[0].cells[0].style.position).toBe('');
  });

  it('does nothing to an empty table', () => {
    expect(() => freezeColumns(table(''), 3)).not.toThrow();
  });
});

describe('freezeColumns — background inheritance', () => {
  it('takes the header colour from <thead> when the row does not carry it', () => {
    // 1.1 styles its <thead>, not each <tr>. Reading only the row turned the
    // navy header cells white the moment they were pinned.
    const host = document.createElement('div');
    host.innerHTML = `<table><thead style="background:#0C2340"><tr><th>a</th><th>b</th><th>c</th><th>d</th></tr></thead></table>`;
    document.body.appendChild(host);
    const t = host.querySelector('table')!;
    freezeColumns(t, 3);
    expect(t.tHead!.rows[0].cells[0].style.background).toBe('rgb(12, 35, 64)');
  });

  it('still prefers the row colour where the row declares one', () => {
    const host = document.createElement('div');
    host.innerHTML = `<table><thead style="background:#0C2340"><tr style="background:#FFF9E6"><td>a</td><td>b</td><td>c</td><td>d</td></tr></thead></table>`;
    document.body.appendChild(host);
    const t = host.querySelector('table')!;
    freezeColumns(t, 3);
    expect(t.rows[0].cells[0].style.background).toBe('rgb(255, 249, 230)');
  });
});
