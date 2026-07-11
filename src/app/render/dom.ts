// Thin typed DOM helper for the render layer. Produces the same markup the
// v2026.05.14 tool built with createElement + Tailwind innerHTML strings, with
// less repetition and full type-safety. No framework — plain DOM (TR-004).

export interface ElProps {
  className?: string;
  text?: string;
  /** Raw HTML for the element body (Tailwind-class markup). Mutually exclusive with `children`/`text`. */
  html?: string;
  attrs?: Record<string, string>;
}

/** Build an element: `el('div', { className, text|html, attrs }, children)`. */
export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  props: ElProps = {},
  children: (Node | string)[] = [],
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (props.className) node.className = props.className;
  if (props.html !== undefined) node.innerHTML = props.html;
  else if (props.text !== undefined) node.textContent = props.text;
  if (props.attrs) for (const [k, v] of Object.entries(props.attrs)) node.setAttribute(k, v);
  for (const child of children) node.append(child);
  return node;
}

/** Remove every child of a node (replaces `container.innerHTML = ''`). */
export function clearChildren(node: Element): void {
  while (node.firstChild) node.removeChild(node.firstChild);
}

/**
 * Collapsible section wrapper (UI-002). Header shows `emoji  title` and toggles
 * the body's `hidden` class. Body starts expanded. The card carries the standard
 * section chrome; per-section gradient (UI-007) is applied by callers via `bodyClassName`.
 */
export interface CollapsibleOpts {
  bodyClassName?: string;
  /** Optional element shown at the header's right (e.g. an "Export to Excel" button). Not nested in the toggle button. */
  headerAction?: HTMLElement;
}

export function collapsibleSection(
  title: string,
  emoji: string,
  body: HTMLElement,
  opts: CollapsibleOpts = {},
): HTMLElement {
  const section = el('section', {
    className: 'bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 mb-6',
  });
  // Title is its own button (owns the collapse toggle); the action slot sits beside it
  // in a flex row — never nest the action inside the toggle button.
  const titleBtn = el('button', {
    className: 'flex items-center gap-2 text-xl font-semibold text-gray-800 dark:text-gray-200 text-left',
    text: `${emoji}  ${title}`,
  });
  const headerRow = el('div', { className: 'flex justify-between items-center mb-4 gap-3' },
    opts.headerAction ? [titleBtn, opts.headerAction] : [titleBtn]);
  const wrapper = el('div', { className: opts.bodyClassName ?? '', attrs: { 'data-collapsible-body': '' } }, [body]);
  titleBtn.addEventListener('click', () => wrapper.classList.toggle('hidden'));
  section.append(headerRow, wrapper);
  return section;
}
