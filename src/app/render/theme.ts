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

/**
 * Apply the persisted/preferred theme and wire theme-toggle controls.
 *
 * Uses one delegated document-level listener so ANY toggle control works
 * regardless of when it mounts — the global nav-bar button (`[data-theme-toggle]`)
 * and a view's own button (`#theme-toggle-btn`) both toggle the theme. This is
 * important now that views mount lazily inside the nav shell.
 */
let toggleWired = false;

export function initTheme(): void {
  apply(isDarkPreferred());
  if (toggleWired) return; // idempotent — attach the delegated listener exactly once
  toggleWired = true;
  document.addEventListener('click', (e) => {
    const target = e.target as HTMLElement | null;
    if (!target?.closest('#theme-toggle-btn, [data-theme-toggle]')) return;
    const nowDark = !document.documentElement.classList.contains('dark');
    apply(nowDark);
    localStorage.setItem(KEY, nowDark ? 'dark' : 'light');
  });
}
