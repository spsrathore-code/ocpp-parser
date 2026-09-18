// Make the top-level Uptime sections collapsible, matching the Parser.
//
// Only the numbered sections collapse — 1, 2, 3 and each per-site block. Their
// subsections stay open inside, because collapsing at both levels means two
// clicks to reach anything and a reader who cannot tell which level they closed.
//
// Sections start collapsed so a finished run opens as a short index of what was
// found, rather than several thousand pixels of table.

/** Called when a section opens, so layout-dependent work can be redone. */
export type OnExpand = (section: HTMLElement) => void;

const CHEVRON_OPEN = '▾';
const CHEVRON_SHUT = '▸';

export function makeSectionsCollapsible(
  container: HTMLElement,
  options: { startCollapsed?: boolean; onExpand?: OnExpand } = {},
): void {
  const startCollapsed = options.startCollapsed ?? true;

  for (const section of Array.from(container.querySelectorAll<HTMLElement>(':scope > section'))) {
    const heading = section.querySelector<HTMLElement>('h3');
    if (!heading || section.dataset.collapsible === 'ready') continue;
    section.dataset.collapsible = 'ready';

    // The per-site sections wrap their h3 in a flex header row alongside the
    // metadata line, so the split point is whichever direct child of the
    // section CONTAINS the heading — not the heading itself.
    let headerBlock: HTMLElement = heading;
    while (headerBlock.parentElement && headerBlock.parentElement !== section) {
      headerBlock = headerBlock.parentElement;
    }

    // Everything after that header block becomes the collapsible body.
    const body = document.createElement('div');
    body.dataset.collapsibleBody = '';
    let node = headerBlock.nextSibling;
    while (node) {
      const next = node.nextSibling;
      body.appendChild(node);
      node = next;
    }
    section.appendChild(body);

    const chevron = document.createElement('span');
    chevron.className = 'inline-block mr-2 select-none text-gray-400';
    chevron.textContent = startCollapsed ? CHEVRON_SHUT : CHEVRON_OPEN;
    heading.prepend(chevron);

    heading.setAttribute('role', 'button');
    heading.setAttribute('tabindex', '0');
    heading.setAttribute('aria-expanded', String(!startCollapsed));
    heading.classList.add('cursor-pointer', 'select-none');
    body.hidden = startCollapsed;

    const toggle = (): void => {
      const nowOpen = body.hidden;
      body.hidden = !nowOpen;
      chevron.textContent = nowOpen ? CHEVRON_OPEN : CHEVRON_SHUT;
      heading.setAttribute('aria-expanded', String(nowOpen));
      // Column freezing measures cell widths, which are zero while hidden — so
      // it has to run again once the section is actually on screen.
      if (nowOpen) options.onExpand?.(section);
    };

    heading.addEventListener('click', toggle);
    heading.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); }
    });
  }
}
