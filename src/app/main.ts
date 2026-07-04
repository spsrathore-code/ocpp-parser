// Vite entry point for the unified OCPP tool. Boots the two-tier navigation shell
// (design §4.1), which mounts the Parser and the OCPP Simulator as views. The
// former inline Parser bootstrap now lives in nav/mountParser.ts.

import { initTheme } from './render/theme';
import { renderNavShell } from './nav/navShell';

const root = document.querySelector<HTMLDivElement>('#app');
if (root) {
  initTheme();
  renderNavShell(root);
}
