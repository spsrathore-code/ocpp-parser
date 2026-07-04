// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderNavShell } from '../../src/app/nav/navShell';
import type { NavGroup } from '../../src/app/nav/navConfig';

function makeGroups(parserMount: () => void, simMount: () => void): NavGroup[] {
  return [
    {
      id: 'parser', label: 'Parser', views: [
        { id: 'client', label: 'Client Log Parser', enabled: true, mount: (c) => { c.innerHTML = '<div data-x="parser-view"></div>'; parserMount(); } },
        { id: 'cms-logs', label: 'CMS Log Parser', enabled: false },
      ],
    },
    {
      id: 'emulator', label: 'Emulator', views: [
        { id: 'sim', label: 'OCPP Simulator', enabled: true, mount: (c) => { c.innerHTML = '<div data-x="sim-view"></div>'; simMount(); } },
      ],
    },
    { id: 'cms', label: 'CMS', views: [{ id: 'csms', label: 'CSMS', enabled: false }] },
  ];
}

describe('navShell', () => {
  beforeEach(() => localStorage.clear());

  it('renders 3 Tier-1 groups and mounts the first view', () => {
    const root = document.createElement('div');
    renderNavShell(root, makeGroups(vi.fn(), vi.fn()));
    expect(root.querySelectorAll('[data-group]')).toHaveLength(3);
    expect(root.querySelector('[data-x="parser-view"]')).toBeTruthy();
  });

  it('keeps a view mounted (alive) when switching away and back', () => {
    const parserMount = vi.fn();
    const simMount = vi.fn();
    const root = document.createElement('div');
    renderNavShell(root, makeGroups(parserMount, simMount));
    (root.querySelector('[data-group="emulator"]') as HTMLElement).click();
    expect(root.querySelector('[data-x="sim-view"]')).toBeTruthy();
    // parser view still in the DOM but hidden (state preserved, not destroyed)
    const parserEl = root.querySelector('[data-view-key="parser:client"]')!;
    expect(parserEl.classList.contains('hidden')).toBe(true);
    (root.querySelector('[data-group="parser"]') as HTMLElement).click();
    expect(parserMount).toHaveBeenCalledTimes(1); // not re-mounted
    expect(simMount).toHaveBeenCalledTimes(1);
  });

  it('shows Tier-2 for a multi-view group with disabled entries disabled', () => {
    const root = document.createElement('div');
    renderNavShell(root, makeGroups(vi.fn(), vi.fn()));
    const cmsLogsBtn = root.querySelector('[data-view="cms-logs"]') as HTMLButtonElement;
    expect(cmsLogsBtn).toBeTruthy();
    expect(cmsLogsBtn.disabled).toBe(true);
  });

  it('shows a coming-soon placeholder for a group with no enabled views', () => {
    const root = document.createElement('div');
    renderNavShell(root, makeGroups(vi.fn(), vi.fn()));
    (root.querySelector('[data-group="cms"]') as HTMLElement).click();
    expect(root.querySelector('[data-role="placeholder"]')!.textContent).toMatch(/coming soon/i);
  });
});
