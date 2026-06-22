// Shared "log context" viewer — faithful port of the v2026.05.14 context helpers
// (HTML 8369-8669): show/download the ±25 raw log lines around an entry. Replaces
// the legacy global onclick handlers (previewBootContext/downloadDowntimeContext/…)
// with one delegated click handler wired once on the results container; buttons
// carry `data-ctx-*` attributes. Used by Boot, Events, Alerts, Downtime, and the
// two sync-flag sections.

const RADIUS = 25;

// Yellow highlight for the focused/discrepancy line in a Preview (HTML) report.
const HL_OPEN = '<span style="background:#fde047;color:#111827;font-weight:600;">';
const HL_CLOSE = '</span>';

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** ±radius lines around a 1-based lineNumber. */
export interface Context { startLine: number; endLine: number; lines: string[]; }
export function extractContext(rawLogLines: string[], lineNumber: number, radius = RADIUS): Context {
  const startLine = Math.max(1, lineNumber - radius);
  const endLine = Math.min(rawLogLines.length, lineNumber + radius);
  return { startLine, endLine, lines: rawLogLines.slice(startLine - 1, endLine) };
}

function nowIst(): string {
  const d = new Date(Date.now() + 5.5 * 60 * 60 * 1000);
  return `${String(d.getUTCDate()).padStart(2, '0')}/${String(d.getUTCMonth() + 1).padStart(2, '0')}/${d.getUTCFullYear()} ${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}:${String(d.getUTCSeconds()).padStart(2, '0')} IST`;
}

/** Single-point report (Boot / Events / Alerts). `forDownload` → plain text; else HTML-escaped for the modal. */
export function buildSingleReport(label: string, lineNumber: number, rawLogLines: string[], index: number, forDownload: boolean): string {
  const ctx = extractContext(rawLogLines, lineNumber);
  let report = `${label.toUpperCase()} CONTEXT ANALYSIS REPORT\n`;
  report += `Generated on: ${nowIst()}\n`;
  report += `${label} Index: ${index + 1}\n`;
  report += `Log context (lines ${ctx.startLine} to ${ctx.endLine})\n\n`;
  ctx.lines.forEach((line, idx) => {
    const cur = ctx.startLine + idx;
    const isTarget = cur === lineNumber;
    const marker = isTarget ? ` ← ${label}` : '';
    const text = `[${cur}] ${forDownload ? line : escapeHtml(line)}${marker}`;
    // Preview (HTML): highlight the target line in yellow so the discrepancy stands out.
    report += !forDownload && isTarget ? `${HL_OPEN}${text}${HL_CLOSE}\n` : `${text}\n`;
  });
  return report;
}

/** Range report (Downtime / sync flags) — merged start+end windows. */
export function buildDowntimeReport(startLineNumber: number, endLineNumber: number | null, rawLogLines: string[], index: number, duration: string, forDownload: boolean): string {
  const win = (ln: number): [number, number] => [Math.max(1, ln - RADIUS), Math.min(rawLogLines.length, ln + RADIUS)];
  const [sS, sE] = win(startLineNumber);
  const included = new Set<number>();
  const items: { lineNumber: number; line: string }[] = [];
  for (let i = sS - 1; i < sE; i++) { if (!included.has(i)) { included.add(i); items.push({ lineNumber: i + 1, line: rawLogLines[i] ?? '' }); } }
  if (endLineNumber && endLineNumber !== startLineNumber) {
    const [eS, eE] = win(endLineNumber);
    for (let i = eS - 1; i < eE; i++) { if (!included.has(i)) { included.add(i); items.push({ lineNumber: i + 1, line: rawLogLines[i] ?? '' }); } }
  }
  items.sort((a, b) => a.lineNumber - b.lineNumber);
  const startLog = rawLogLines[startLineNumber - 1] || 'N/A';
  const endLog = endLineNumber ? (rawLogLines[endLineNumber - 1] || 'N/A') : 'N/A (Ongoing)';
  const esc = (s: string): string => (forDownload ? s : escapeHtml(s));

  let report = `DOWNTIME CONTEXT ANALYSIS REPORT\n`;
  report += `Generated on: ${nowIst()}\n\n`;
  report += `Downtime Index: ${index + 1}\n`;
  report += `Issue Duration: ${duration}\n\n`;
  report += `Downtime Start Line: ${startLineNumber}\n${esc(startLog)}\n\n`;
  report += `Downtime End Line: ${endLineNumber || 'N/A (Ongoing)'}\n${esc(endLog)}\n\n`;
  report += `Log context (lines ${items[0]?.lineNumber ?? startLineNumber} to ${items[items.length - 1]?.lineNumber ?? endLineNumber ?? startLineNumber}):\n${'─'.repeat(50)}\n\n`;
  items.forEach((item) => {
    const isTarget = item.lineNumber === startLineNumber || item.lineNumber === endLineNumber;
    const marker = item.lineNumber === startLineNumber ? ' ← DOWNTIME START' : item.lineNumber === endLineNumber ? ' ← DOWNTIME END' : '';
    const text = `[${item.lineNumber}] ${esc(item.line)}${marker}`;
    report += !forDownload && isTarget ? `${HL_OPEN}${text}${HL_CLOSE}\n` : `${text}\n`;
  });
  return report;
}

export function downloadTextFile(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function showContextModal(title: string, htmlContent: string): void {
  document.getElementById('context-preview-modal')?.remove();
  const modal = document.createElement('div');
  modal.id = 'context-preview-modal';
  modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
  modal.innerHTML = `
    <div class="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-11/12 max-w-4xl max-h-[90vh] flex flex-col">
      <div class="flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-700">
        <h3 class="text-xl font-semibold text-gray-900 dark:text-gray-100">${title}</h3>
        <button data-ctx-close class="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">✕</button>
      </div>
      <div class="p-4 overflow-auto flex-1">
        <pre class="text-xs font-mono text-gray-800 dark:text-gray-200 whitespace-pre-wrap bg-gray-50 dark:bg-gray-900 p-4 rounded border border-gray-200 dark:border-gray-700">${htmlContent}</pre>
      </div>
      <div class="flex justify-end gap-2 p-4 border-t border-gray-200 dark:border-gray-700">
        <button data-ctx-close class="bg-gray-500 hover:bg-gray-600 text-white py-2 px-4 rounded">Close</button>
      </div>
    </div>`;
  const close = (): void => modal.remove();
  modal.addEventListener('click', (e) => { if (e.target === modal || (e.target as HTMLElement).hasAttribute('data-ctx-close')) close(); });
  document.body.appendChild(modal);
}

const BTN_PREVIEW = 'bg-purple-500 hover:bg-purple-600 text-white py-1 px-3 rounded text-xs';
const BTN_DOWNLOAD = 'bg-blue-500 hover:bg-blue-600 text-white py-1 px-3 rounded text-xs';

/** Buttons for a single-point context (returns HTML cells' inner markup). */
export function singleContextButtons(label: string, lineNumber: number, index: number, opts: { preview?: boolean } = {}): { preview: string; download: string } {
  const base = `data-ctx-label="${label}" data-ctx-line="${lineNumber}" data-ctx-index="${index}"`;
  return {
    preview: opts.preview === false ? '' : `<button type="button" class="${BTN_PREVIEW}" ${base} data-ctx-action="preview">👁️ Preview</button>`,
    download: `<button type="button" class="${BTN_DOWNLOAD}" ${base} data-ctx-action="download">📄 Download</button>`,
  };
}

/** Buttons for a range (downtime/sync) context. */
export function downtimeContextButtons(startLine: number, endLine: number | null, index: number, duration: string): { preview: string; download: string } {
  const base = `data-ctx-dt="1" data-ctx-start="${startLine}" data-ctx-end="${endLine ?? ''}" data-ctx-index="${index}" data-ctx-duration="${duration}"`;
  return {
    preview: `<button type="button" class="${BTN_PREVIEW}" ${base} data-ctx-action="preview">👁️ Preview</button>`,
    download: `<button type="button" class="${BTN_DOWNLOAD}" ${base} data-ctx-action="download">📄 Download</button>`,
  };
}

/** Wire one delegated click handler on `container` for every `data-ctx-action` button inside it.
 *  Idempotent — replaces any handler from a previous render (rawLogLines may have changed). */
const CTX_HANDLER = Symbol('ctxHandler');
export function wireContextButtons(container: HTMLElement, rawLogLines: string[]): void {
  const holder = container as HTMLElement & { [CTX_HANDLER]?: (e: Event) => void };
  if (holder[CTX_HANDLER]) container.removeEventListener('click', holder[CTX_HANDLER]);
  const handler = (e: Event): void => {
    const btn = (e.target as HTMLElement).closest('[data-ctx-action]') as HTMLElement | null;
    if (!btn || !container.contains(btn)) return;
    const action = btn.getAttribute('data-ctx-action')!;
    const index = parseInt(btn.getAttribute('data-ctx-index') || '0', 10);

    if (btn.hasAttribute('data-ctx-dt')) {
      const start = parseInt(btn.getAttribute('data-ctx-start')!, 10);
      const endRaw = btn.getAttribute('data-ctx-end');
      const end = endRaw ? parseInt(endRaw, 10) : null;
      const duration = btn.getAttribute('data-ctx-duration') || 'N/A';
      if (action === 'download') downloadTextFile(buildDowntimeReport(start, end, rawLogLines, index, duration, true), `Downtime_Context_${index + 1}_Start_${start}_End_${end ?? 'NA'}.txt`);
      else showContextModal('Downtime Context Preview', buildDowntimeReport(start, end, rawLogLines, index, duration, false));
      return;
    }

    const label = btn.getAttribute('data-ctx-label') || 'Entry';
    const line = parseInt(btn.getAttribute('data-ctx-line')!, 10);
    if (action === 'download') downloadTextFile(buildSingleReport(label, line, rawLogLines, index, true), `${label.replace(/\s+/g, '')}_Context_${index + 1}_Line_${line}.txt`);
    else showContextModal(`${label} Context Preview`, buildSingleReport(label, line, rawLogLines, index, false));
  };
  holder[CTX_HANDLER] = handler;
  container.addEventListener('click', handler);
}
