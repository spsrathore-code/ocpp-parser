// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { analyzeLogLines } from '../../src/app/analyze';
import { renderResults, SECTION_ORDER } from '../../src/app/render/renderResults';

function load(name: string): string[] {
  return readFileSync(join(process.cwd(), 'data', 'samples', name), 'utf8').split(/\r?\n/);
}

describe('renderResults — 19 sections in §19.4 order', () => {
  const result = analyzeLogLines(load('Sample OCPP Client Log .txt'), 'Sample OCPP Client Log .txt');

  it('declares exactly the 19 §19.4 sections in order', () => {
    expect(SECTION_ORDER.map((s) => s.title)).toEqual([
      'Debug Info', 'Boot Notifications', 'Heartbeats', 'Status Notifications',
      'Start Transactions', 'Stop Transactions', 'Transaction Summary',
      'Connector Stats', 'Transaction & Meter Values', 'Events', 'Alerts',
      'Downtime Report', 'Power Restore Missing Sync', 'Emergency Stop Release',
      'Fault Status Summary', 'Incomplete Transactions', 'Energy Dispense Check',
      'Protocol Compliance', 'WebSocket Health',
    ]);
  });

  it('renders one section element per entry, in order, into the container', () => {
    const container = document.createElement('div');
    renderResults(container, result);
    const sections = container.querySelectorAll('section');
    expect(sections).toHaveLength(19);
    expect(sections[0].textContent).toContain('Debug Info');
    expect(sections[18].textContent).toContain('WebSocket Health');
  });

  it('shows a count in the header for sections that declare one', () => {
    const container = document.createElement('div');
    renderResults(container, result);
    const heartbeats = [...container.querySelectorAll('section')].find((s) => s.textContent?.includes('Heartbeats'))!;
    // "Heartbeats (N)" — the count comes from messageGroups.Heartbeat.length
    expect(heartbeats.querySelector('button')!.textContent).toMatch(/Heartbeats \(\d+\)/);
  });

  it('clears prior content on re-render', () => {
    const container = document.createElement('div');
    renderResults(container, result);
    renderResults(container, result);
    expect(container.querySelectorAll('section')).toHaveLength(19);
  });
});
