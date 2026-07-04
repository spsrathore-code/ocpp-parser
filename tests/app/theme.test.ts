// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { initTheme } from '../../src/app/render/theme';

describe('theme toggle (delegated, global)', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove('dark');
    document.body.innerHTML = '';
  });

  it('applies the persisted theme on init', () => {
    localStorage.setItem('theme', 'dark');
    initTheme();
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });

  it('a [data-theme-toggle] click anywhere flips and persists the theme', () => {
    localStorage.setItem('theme', 'light');
    initTheme();
    expect(document.documentElement.classList.contains('dark')).toBe(false);

    const btn = document.createElement('button');
    btn.setAttribute('data-theme-toggle', '');
    document.body.appendChild(btn);

    btn.click();
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(localStorage.getItem('theme')).toBe('dark');

    btn.click();
    expect(document.documentElement.classList.contains('dark')).toBe(false);
    expect(localStorage.getItem('theme')).toBe('light');
  });
});
