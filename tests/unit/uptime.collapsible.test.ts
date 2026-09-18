// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { makeSectionsCollapsible } from '../../src/app/uptime/render/collapsibleSections';

function build(): HTMLElement {
  const host = document.createElement('div');
  host.id = 'uptime-results';
  host.innerHTML = `
    <div class="index">Sections</div>
    <section id="uptime-comparison"><h3>1) Uptime Comparison</h3>
      <h4>1.1 Uptime &amp; downtime</h4><table><tr><td>a</td></tr></table>
      <h4>1.2 Downtime Detail</h4><table><tr><td>b</td></tr></table></section>
    <section id="fault-breakdown"><h3>2) Fault Breakdown</h3><table><tr><td>c</td></tr></table></section>`;
  document.body.appendChild(host);
  return host;
}

const sections = (h: HTMLElement) => Array.from(h.querySelectorAll('section'));
const bodyOf = (s: Element) => s.querySelector<HTMLElement>('[data-collapsible-body]')!;

beforeEach(() => { document.body.innerHTML = ''; });

describe('collapsible Uptime sections', () => {
  it('collapses every top-level section by default', () => {
    const h = build();
    makeSectionsCollapsible(h);
    expect(sections(h).every((s) => bodyOf(s).hidden)).toBe(true);
  });

  it('moves everything after the heading into the collapsible body', () => {
    const h = build();
    makeSectionsCollapsible(h);
    const body = bodyOf(sections(h)[0]);
    expect(body.querySelectorAll('table')).toHaveLength(2);
    expect(body.querySelectorAll('h4')).toHaveLength(2);
  });

  it('does NOT make subsections collapsible — only the section', () => {
    // Two collapse levels means two clicks to reach anything, and a reader who
    // cannot tell which level they closed.
    const h = build();
    makeSectionsCollapsible(h);
    const h4s = Array.from(h.querySelectorAll('h4'));
    expect(h4s.every((e) => e.getAttribute('role') !== 'button')).toBe(true);
  });

  it('toggles open and shut on click', () => {
    const h = build();
    makeSectionsCollapsible(h);
    const section = sections(h)[0];
    const heading = section.querySelector('h3') as HTMLElement;
    heading.click();
    expect(bodyOf(section).hidden).toBe(false);
    heading.click();
    expect(bodyOf(section).hidden).toBe(true);
  });

  it('re-runs layout work when a section opens', () => {
    // Column freezing measures cell widths, which are zero while hidden.
    const onExpand = vi.fn();
    const h = build();
    makeSectionsCollapsible(h, { onExpand });
    (sections(h)[0].querySelector('h3') as HTMLElement).click();
    expect(onExpand).toHaveBeenCalledTimes(1);
    (sections(h)[0].querySelector('h3') as HTMLElement).click();
    expect(onExpand).toHaveBeenCalledTimes(1); // not on collapse
  });

  it('opens on Enter and Space for keyboard users', () => {
    const h = build();
    makeSectionsCollapsible(h);
    const section = sections(h)[0];
    const heading = section.querySelector('h3') as HTMLElement;
    heading.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    expect(bodyOf(section).hidden).toBe(false);
  });

  it('reports its state to assistive technology', () => {
    const h = build();
    makeSectionsCollapsible(h);
    const heading = sections(h)[0].querySelector('h3') as HTMLElement;
    expect(heading.getAttribute('aria-expanded')).toBe('false');
    heading.click();
    expect(heading.getAttribute('aria-expanded')).toBe('true');
  });

  it('can start expanded when asked', () => {
    const h = build();
    makeSectionsCollapsible(h, { startCollapsed: false });
    expect(sections(h).every((s) => bodyOf(s).hidden)).toBe(false);
  });

  it('is idempotent — a second pass does not re-wrap the body', () => {
    const h = build();
    makeSectionsCollapsible(h);
    makeSectionsCollapsible(h);
    expect(sections(h)[0].querySelectorAll('[data-collapsible-body]')).toHaveLength(1);
  });

  it('ignores non-section siblings like the index bar', () => {
    const h = build();
    makeSectionsCollapsible(h);
    expect(h.querySelector('.index')?.hasAttribute('data-collapsible-body')).toBe(false);
  });
});

describe('collapsible — headings nested in a header row', () => {
  it('collapses a per-site section whose h3 sits inside a flex header row', () => {
    // renderSiteUptime pairs the title with a metadata line in a flex row, so
    // the h3 is not a direct child of the <section>.
    const host = document.createElement('div');
    host.id = 'uptime-results';
    host.innerHTML = `<section id="site-dc052">
      <div class="flex"><h3>4) DC052 — Site Uptime</h3><div>meta</div></div>
      <table><tr><td>a</td></tr></table></section>`;
    document.body.appendChild(host);
    makeSectionsCollapsible(host);
    const body = host.querySelector<HTMLElement>('[data-collapsible-body]')!;
    expect(body.hidden).toBe(true);
    expect(body.querySelector('table')).not.toBeNull();
    // The metadata line belongs to the header, not the body.
    expect(body.textContent).not.toContain('meta');
  });
});
