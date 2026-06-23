// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { analyzeLogLines } from '../../src/app/analyze';
import { renderResults, SECTION_ORDER } from '../../src/app/render/renderResults';

function load(name: string): string[] {
  return readFileSync(join(process.cwd(), 'data', 'samples', name), 'utf8').split(/\r?\n/);
}

describe('renderResults — 19 §19.4 sections (+ Phase-6 validation)', () => {
  const result = analyzeLogLines(load('Sample OCPP Client Log .txt'), 'Sample OCPP Client Log .txt');

  it('declares the §19.4 parity sections in order, then CP-Initiated Compliance and the validation section', () => {
    expect(SECTION_ORDER.map((s) => s.title)).toEqual([
      'Debug Info', 'Boot Notifications', 'Heartbeats', 'Status Notifications',
      'Start Transactions', 'Stop Transactions', 'Transaction Summary',
      'Connector Stats', 'Transaction & Meter Values', 'Events', 'Alerts',
      'Downtime Report', 'Power Restore Missing Sync', 'Emergency Stop Release',
      'Fault Status Summary', 'Incomplete Transactions', 'Energy Dispense Check',
      'Protocol Compliance', 'Protocol Compliance — CP-Initiated Operations (§4)',
      'WebSocket Health', 'Type-Aware Validation (L1–L3)',
    ]);
    // §4 compliance sibling after Protocol Compliance; Phase-6 validation last.
    expect(SECTION_ORDER).toHaveLength(21);
    expect(SECTION_ORDER[18].title).toBe('Protocol Compliance — CP-Initiated Operations (§4)');
    expect(SECTION_ORDER[20].title).toBe('Type-Aware Validation (L1–L3)');
  });

  it('renders one section element per entry, in order, into the container', () => {
    const container = document.createElement('div');
    renderResults(container, result);
    const sections = container.querySelectorAll('section');
    expect(sections).toHaveLength(21);
    expect(sections[0].textContent).toContain('Debug Info');
    expect(sections[19].textContent).toContain('WebSocket Health');
    expect(sections[20].textContent).toContain('Type-Aware Validation');
  });

  it('shows a count in the header for sections that declare one', () => {
    const container = document.createElement('div');
    renderResults(container, result);
    // Match on the section header button (Debug Info's body also contains the word
    // "Heartbeats" as a stat-card label, so match the header, not the whole section).
    const heartbeats = [...container.querySelectorAll('section')].find((s) => s.querySelector('button')?.textContent?.includes('Heartbeats'))!;
    // "Heartbeats (N)" — the count comes from messageGroups.Heartbeat.length
    expect(heartbeats.querySelector('button')!.textContent).toMatch(/Heartbeats \(\d+\)/);
  });

  it('puts an "Export to Excel" button on the 18 table sections (not Debug Info / Protocol)', () => {
    const container = document.createElement('div');
    renderResults(container, result);
    const exportBtns = [...container.querySelectorAll('button')].filter((b) => b.textContent === 'Export to Excel');
    // 17 legacy table sections + the new CP-Initiated Compliance (§4) section.
    expect(exportBtns).toHaveLength(18);
    const debug = [...container.querySelectorAll('section')].find((s) => s.querySelector('button')?.textContent?.includes('Debug Info'))!;
    expect([...debug.querySelectorAll('button')].some((b) => b.textContent === 'Export to Excel')).toBe(false);
  });

  it('clears prior content on re-render', () => {
    const container = document.createElement('div');
    renderResults(container, result);
    renderResults(container, result);
    expect(container.querySelectorAll('section')).toHaveLength(21);
  });
});
