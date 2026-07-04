// Entry point for the OCPP Simulator page.
import { renderShell } from './render/shell';

const root = document.querySelector<HTMLDivElement>('#app');
if (root) {
  renderShell(root);
}
