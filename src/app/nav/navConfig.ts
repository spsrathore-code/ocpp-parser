// The single source of truth for the unified tool's navigation (design §4.1).
// Two tiers, grouped by function. To activate a future view later: set
// `enabled: true` and give it a `mount` function — nothing else changes.

import { mountParser } from './mountParser';
import { renderShell as renderSimulator } from '../../simulator/render/shell';

export interface NavView {
  id: string;
  label: string;
  enabled: boolean;
  /** Mounts the view's UI into the given container. Present only for enabled views. */
  mount?: (container: HTMLElement) => void;
}

export interface NavGroup {
  id: string;
  label: string;
  views: NavView[];
}

export const NAV_GROUPS: NavGroup[] = [
  {
    id: 'parser',
    label: 'Parser',
    views: [
      { id: 'client-logs', label: 'Client Log Parser', enabled: true, mount: mountParser },
      { id: 'cms-logs', label: 'CMS Log Parser', enabled: false },
    ],
  },
  {
    id: 'emulator',
    label: 'Emulator',
    views: [
      { id: 'ocpp-simulator', label: 'OCPP Simulator', enabled: true, mount: (c) => { renderSimulator(c); } },
      { id: 'transaction-flow', label: 'Transaction Flow Simulator', enabled: false },
    ],
  },
  {
    id: 'cms',
    label: 'CMS',
    views: [
      { id: 'csms', label: 'CSMS Dashboard', enabled: false },
    ],
  },
];
