// @vitest-environment jsdom
// Regression guard for the silent-failure class (same lesson as the June
// large-file bug): if Chart.js fails to load or construct, the graphs area must
// SAY so — not stay blank. (Field report 2026-07-09: "graphs are not coming",
// no visible error, because renderTransactionGraphs errors were void-swallowed.)
import { describe, it, expect, vi } from 'vitest';

vi.mock('chart.js/auto', () => ({
  Chart: class {
    constructor() { throw new Error('Chart.js exploded'); }
  },
}));

import { renderTransactionGraphs } from '../../src/app/render/charts/meterValueGraphs';

describe('renderTransactionGraphs error surfacing', () => {
  it('renders a visible error message into the container when charting throws', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const rows = [{ 'Transaction ID': '55', 'UTC Time Stamp': '2025-08-22T00:00:00.000Z', 'SoC/Percent/EV': '20' }];
    await renderTransactionGraphs(container, rows, 55);
    expect(container.textContent).toContain('Failed to render analysis graphs');
    expect(container.textContent).toContain('Chart.js exploded');
  });
});
