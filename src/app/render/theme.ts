// Dark/light theme — faithful port of the v2026.05.14 tool's theme logic
// (HTML 251-302, UI-006). Toggles the `dark` class on <html> and persists the
// choice in localStorage['theme']; falls back to the OS preference when unset.

const KEY = 'theme';

function apply(dark: boolean): void {
  document.documentElement.classList.toggle('dark', dark);
}

function isDarkPreferred(): boolean {
  const stored = localStorage.getItem(KEY);
  if (stored === 'dark') return true;
  if (stored === 'light') return false;
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
}

/** Apply the persisted/preferred theme and wire the #theme-toggle-btn click. */
export function initTheme(): void {
  apply(isDarkPreferred());
  const btn = document.getElementById('theme-toggle-btn');
  btn?.addEventListener('click', () => {
    const nowDark = !document.documentElement.classList.contains('dark');
    apply(nowDark);
    localStorage.setItem(KEY, nowDark ? 'dark' : 'light');
  });
}
