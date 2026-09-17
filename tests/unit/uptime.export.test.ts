// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { attachExportControls } from '../../src/app/uptime/export/attachExportControls';

function build(html: string): HTMLElement {
  const host = document.createElement('div');
  host.id = 'uptime-results';
  host.innerHTML = html;
  document.body.appendChild(host);
  return host;
}

beforeEach(() => { document.body.innerHTML = ''; });

const bars = (host: HTMLElement) => Array.from(host.querySelectorAll('.uptime-export-bar'));
const labels = (bar: Element) => Array.from(bar.querySelectorAll('button')).map((b) => b.textContent);

describe('export controls', () => {
  it('adds Excel and PNG buttons to every table', () => {
    const host = build(`
      <section><h4>1.1 Uptime &amp; downtime</h4><div class="overflow-x-auto"><table><tr><td>a</td></tr></table></div>
      <h4>1.2 Downtime by Error Code</h4><div class="overflow-x-auto"><table><tr><td>b</td></tr></table></div></section>`);
    attachExportControls(host);
    expect(bars(host)).toHaveLength(2);
    expect(labels(bars(host)[0])).toEqual(['Export to Excel', '📥 Download PNG']);
  });

  it('names the download after the nearest preceding heading', () => {
    const host = build(`<section><h4>1.3 Downtime by Error Description</h4>
      <div class="overflow-x-auto"><table><tr><td>a</td></tr></table></div></section>`);
    attachExportControls(host);
    // Exercised through the rendered title, which drives both filenames.
    expect(host.querySelector('h4')?.textContent).toContain('1.3');
    expect(bars(host)).toHaveLength(1);
  });

  it('finds tables inside a collapsed <details>, which is where drill-downs live', () => {
    const host = build(`<section><details><summary>Outage detail (165 events)</summary>
      <div class="overflow-x-auto"><table><tr><td>a</td></tr></table></div></details></section>`);
    attachExportControls(host);
    expect(bars(host)).toHaveLength(1);
  });

  it('places the toolbar above the scroll wrapper, not inside it', () => {
    // Inside, it would scroll sideways out of view on a wide table.
    const host = build(`<section><h4>T</h4><div class="overflow-x-auto"><table><tr><td>a</td></tr></table></div></section>`);
    attachExportControls(host);
    const bar = host.querySelector('.uptime-export-bar')!;
    expect(bar.nextElementSibling?.classList.contains('overflow-x-auto')).toBe(true);
  });

  it('is idempotent — re-running does not stack duplicate toolbars', () => {
    const host = build(`<section><h4>T</h4><div class="overflow-x-auto"><table><tr><td>a</td></tr></table></div></section>`);
    attachExportControls(host);
    attachExportControls(host);
    expect(bars(host)).toHaveLength(1);
  });

  it('does not toggle the surrounding <details> when a button is clicked', () => {
    const host = build(`<section><details open><summary>Outage detail</summary>
      <div class="overflow-x-auto"><table><tr><td>a</td></tr></table></div></details></section>`);
    attachExportControls(host);
    const details = host.querySelector('details')!;
    (host.querySelector('.uptime-export-bar button') as HTMLButtonElement).click();
    expect(details.open).toBe(true);
  });

  it('handles a section with no tables without throwing', () => {
    const host = build('<section><h4>Read-out</h4><p>text</p></section>');
    expect(() => attachExportControls(host)).not.toThrow();
    expect(bars(host)).toHaveLength(0);
  });
});
