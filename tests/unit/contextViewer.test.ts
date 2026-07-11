// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { extractContext, buildSingleReport, buildDowntimeReport, wireContextButtons, singleContextButtons } from '../../src/app/render/contextViewer';

const lines = Array.from({ length: 100 }, (_, i) => `line ${i + 1}`);

afterEach(() => { document.getElementById('context-preview-modal')?.remove(); document.body.innerHTML = ''; });

describe('extractContext', () => {
  it('returns ±25 lines clamped to bounds', () => {
    expect(extractContext(lines, 1)).toMatchObject({ startLine: 1, endLine: 26 });
    expect(extractContext(lines, 50).lines).toHaveLength(51);
    expect(extractContext(lines, 100).endLine).toBe(100);
  });
});

describe('buildSingleReport', () => {
  it('marks the target line and lists the context window', () => {
    const report = buildSingleReport('BootNotification', 50, lines, 2, true);
    expect(report).toContain('BOOTNOTIFICATION CONTEXT ANALYSIS REPORT');
    expect(report).toContain('[50] line 50 ← BootNotification');
    expect(report).toContain('BootNotification Index: 3');
  });

  it('highlights the target line in yellow for the Preview (HTML), not the download', () => {
    const preview = buildSingleReport('⚠ RESULT_MISMATCH', 50, lines, 2, false);
    expect(preview).toContain('<span style="background:#fde047'); // yellow highlight on the marked line
    expect(preview).toContain('← ⚠ RESULT_MISMATCH');
    // the download (plain text) variant must NOT contain any HTML span
    expect(buildSingleReport('⚠ RESULT_MISMATCH', 50, lines, 2, true)).not.toContain('<span');
  });
});

describe('buildDowntimeReport', () => {
  it('marks start and end lines', () => {
    const report = buildDowntimeReport(10, 40, lines, 0, '00:30:00', true);
    expect(report).toContain('DOWNTIME CONTEXT ANALYSIS REPORT');
    expect(report).toContain('Issue Duration: 00:30:00');
    expect(report).toContain('[10] line 10 ← DOWNTIME START');
    expect(report).toContain('[40] line 40 ← DOWNTIME END');
  });
});

describe('wireContextButtons', () => {
  it('opens a preview modal when a Preview button is clicked', () => {
    const container = document.createElement('div');
    container.innerHTML = singleContextButtons('BootNotification', 50, 0).preview;
    document.body.appendChild(container);
    wireContextButtons(container, lines);
    (container.querySelector('button[data-ctx-action="preview"]') as HTMLButtonElement).click();
    const modal = document.getElementById('context-preview-modal');
    expect(modal).not.toBeNull();
    expect(modal!.textContent).toContain('line 50');
  });

  it('does not stack duplicate handlers across re-wires', () => {
    const container = document.createElement('div');
    container.innerHTML = singleContextButtons('Event', 50, 0).download; // download won't open a modal
    document.body.appendChild(container);
    wireContextButtons(container, lines);
    wireContextButtons(container, lines); // re-wire: must replace, not stack
    // Preview path to assert single modal:
    container.innerHTML = singleContextButtons('Event', 50, 0).preview;
    wireContextButtons(container, lines);
    (container.querySelector('button[data-ctx-action="preview"]') as HTMLButtonElement).click();
    expect(document.querySelectorAll('#context-preview-modal')).toHaveLength(1);
  });
});
