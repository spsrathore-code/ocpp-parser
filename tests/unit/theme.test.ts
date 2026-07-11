// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { initTheme } from '../../src/app/render/theme';

beforeEach(() => {
  localStorage.clear();
  document.documentElement.classList.remove('dark');
  document.body.innerHTML = '<button id="theme-toggle-btn"></button>';
});

describe('initTheme — dark/light persistence (UI-006)', () => {
  it('applies dark when localStorage theme=dark', () => {
    localStorage.setItem('theme', 'dark');
    initTheme();
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });

  it('toggles and persists on button click', () => {
    localStorage.setItem('theme', 'light');
    initTheme();
    expect(document.documentElement.classList.contains('dark')).toBe(false);
    document.getElementById('theme-toggle-btn')!.click();
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(localStorage.getItem('theme')).toBe('dark');
    document.getElementById('theme-toggle-btn')!.click();
    expect(localStorage.getItem('theme')).toBe('light');
  });
});
