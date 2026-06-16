// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { el, clearChildren, collapsibleSection } from '../../src/app/render/dom';

describe('el — typed element builder', () => {
  it('sets text, className, and attributes', () => {
    const node = el('button', { className: 'btn', text: 'Go', attrs: { id: 'x', disabled: '' } });
    expect(node.tagName).toBe('BUTTON');
    expect(node.className).toBe('btn');
    expect(node.textContent).toBe('Go');
    expect(node.id).toBe('x');
    expect(node.hasAttribute('disabled')).toBe(true);
  });

  it('appends element and string children', () => {
    const node = el('div', {}, [el('span', { text: 'a' }), 'b']);
    expect(node.children).toHaveLength(1);
    expect(node.textContent).toBe('ab');
  });

  it('sets innerHTML when html is provided', () => {
    const node = el('div', { html: '<i>x</i>' });
    expect(node.querySelector('i')?.textContent).toBe('x');
  });
});

describe('clearChildren', () => {
  it('removes all children', () => {
    const node = el('div', {}, [el('span', {}), el('span', {})]);
    clearChildren(node);
    expect(node.children).toHaveLength(0);
  });
});

describe('collapsibleSection — UI-002 collapsible, UI-011 emoji title', () => {
  it('builds a section with an emoji+title header and a body that toggles', () => {
    const body = el('p', { text: 'content' });
    const section = collapsibleSection('Boot Notifications', '🔌', body);
    expect(section.tagName).toBe('SECTION');
    const header = section.querySelector('button')!;
    expect(header.textContent).toContain('🔌');
    expect(header.textContent).toContain('Boot Notifications');
    const wrapper = section.querySelector('[data-collapsible-body]') as HTMLElement;
    expect(wrapper.contains(body)).toBe(true);
    expect(wrapper.classList.contains('hidden')).toBe(false);
    header.click();
    expect(wrapper.classList.contains('hidden')).toBe(true);
    header.click();
    expect(wrapper.classList.contains('hidden')).toBe(false);
  });
});
