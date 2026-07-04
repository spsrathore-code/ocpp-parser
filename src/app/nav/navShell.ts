// Two-tier navigation shell for the unified tool (design §4.1).
// Tier 1 = functional groups (Parser · Emulator · CMS); Tier 2 = contextual
// sub-tabs (shown only when a group has 2+ views). Views are mounted lazily on
// first activation and then KEPT ALIVE (toggled hidden) so per-view state — most
// importantly CP Mode's live WebSocket — survives switching between views.

import { NAV_GROUPS, type NavGroup } from './navConfig';

const STORAGE_KEY = 'ocpp-suite-active-view';

export function renderNavShell(root: HTMLElement, groups: NavGroup[] = NAV_GROUPS): void {
  root.innerHTML = `
    <div class="border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
      <div class="max-w-6xl mx-auto px-4 flex items-center gap-4">
        <span class="font-bold py-3 text-gray-800 dark:text-gray-100">OCPP Suite</span>
        <div data-role="tier1" class="flex gap-1"></div>
      </div>
      <div data-role="tier2" class="max-w-6xl mx-auto px-4 flex gap-1"></div>
    </div>
    <div data-role="views"></div>`;

  const tier1El = root.querySelector<HTMLElement>('[data-role="tier1"]')!;
  const tier2El = root.querySelector<HTMLElement>('[data-role="tier2"]')!;
  const viewsEl = root.querySelector<HTMLElement>('[data-role="views"]')!;
  const mounted = new Map<string, HTMLElement>();
  let placeholder: HTMLElement | null = null;

  const keyOf = (gid: string, vid: string) => `${gid}:${vid}`;

  let activeGroupId = groups[0].id;
  let activeViewId = (groups[0].views.find(v => v.enabled) ?? groups[0].views[0]).id;

  // Restore last view from storage (only if it still exists and is enabled).
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const [gid, vid] = saved.split(':');
      const g = groups.find(x => x.id === gid);
      const v = g?.views.find(x => x.id === vid && x.enabled);
      if (g && v) { activeGroupId = gid; activeViewId = vid; }
    }
  } catch { /* ignore storage errors */ }

  function renderTier1(): void {
    tier1El.innerHTML = groups.map(g => {
      const active = g.id === activeGroupId;
      const cls = active
        ? 'border-indigo-600 text-indigo-600'
        : 'border-transparent text-gray-600 dark:text-gray-300 hover:text-indigo-600';
      return `<button data-group="${g.id}" class="px-4 py-3 text-sm font-medium border-b-2 ${cls}">${g.label}</button>`;
    }).join('');
  }

  function renderTier2(): void {
    const g = groups.find(x => x.id === activeGroupId)!;
    if (g.views.length < 2) { tier2El.innerHTML = ''; tier2El.classList.add('hidden'); return; }
    tier2El.classList.remove('hidden');
    tier2El.innerHTML = g.views.map(v => {
      const active = v.id === activeViewId;
      const cls = v.enabled
        ? (active ? 'text-indigo-600 border-indigo-600' : 'text-gray-600 dark:text-gray-300 border-transparent hover:text-indigo-600')
        : 'text-gray-400 border-transparent cursor-not-allowed';
      const soon = v.enabled ? '' : ' <span class="text-xs">(soon)</span>';
      return `<button data-view="${v.id}" ${v.enabled ? '' : 'disabled'} class="px-3 py-2 text-sm border-b-2 ${cls}">${v.label}${soon}</button>`;
    }).join('');
  }

  function showComingSoon(label: string): void {
    mounted.forEach(el => el.classList.add('hidden'));
    if (!placeholder) {
      placeholder = document.createElement('div');
      placeholder.dataset.role = 'placeholder';
      placeholder.className = 'max-w-6xl mx-auto p-10 text-center text-gray-500';
      viewsEl.appendChild(placeholder);
    }
    placeholder.textContent = `${label} — coming soon.`;
    placeholder.classList.remove('hidden');
  }

  function showView(): void {
    const g = groups.find(x => x.id === activeGroupId)!;
    const v = g.views.find(x => x.id === activeViewId)!;
    if (!v.enabled || !v.mount) { showComingSoon(v.label); return; }
    placeholder?.classList.add('hidden');
    mounted.forEach(el => el.classList.add('hidden'));
    const key = keyOf(g.id, v.id);
    let el = mounted.get(key);
    if (!el) {
      el = document.createElement('div');
      el.dataset.viewKey = key;
      viewsEl.appendChild(el);
      mounted.set(key, el);
      v.mount(el); // lazy mount — happens exactly once per view
    }
    el.classList.remove('hidden');
  }

  function persist(): void {
    try { localStorage.setItem(STORAGE_KEY, keyOf(activeGroupId, activeViewId)); } catch { /* ignore */ }
  }

  function activate(): void {
    renderTier1();
    renderTier2();
    showView();
    persist();
  }

  tier1El.addEventListener('click', (e) => {
    const btn = (e.target as HTMLElement).closest('[data-group]') as HTMLElement | null;
    if (!btn) return;
    const gid = btn.dataset.group!;
    if (gid === activeGroupId) return;
    const g = groups.find(x => x.id === gid)!;
    activeGroupId = gid;
    activeViewId = (g.views.find(v => v.enabled) ?? g.views[0]).id;
    activate();
  });

  tier2El.addEventListener('click', (e) => {
    const btn = (e.target as HTMLElement).closest('[data-view]') as HTMLElement | null;
    if (!btn || btn.hasAttribute('disabled')) return;
    const vid = btn.dataset.view!;
    if (vid === activeViewId) return;
    activeViewId = vid;
    activate();
  });

  activate();
}
