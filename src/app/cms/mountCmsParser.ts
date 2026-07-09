// Mounts the CMS Log Parser view: upload Excel CMS logs -> shared analysis.
//
// Mirrors nav/mountParser.ts but for Excel: each file is read as an ArrayBuffer,
// parsed by the customer-detected adapter (parseCmsWorkbook), merged, then handed
// to the SAME analyze()/renderResults() the Client parser uses.

import { renderCmsShell } from './renderCmsShell';
import { parseCmsWorkbook } from './parseCmsWorkbook';
import { mergeCmsParsed } from './mergeCmsParsed';
import { analyze } from '../analyze';
import { renderResults } from '../render/renderResults';
import type { CmsParsed } from './types';

interface FileOutcome {
  name: string;
  label: string;
  sheet: string;
  rows: number;
}

export function mountCmsParser(mountEl: HTMLElement): void {
  const { fileInput, parseBtn, container, sourceInfo, progress } = renderCmsShell(mountEl);

  parseBtn.addEventListener('click', async () => {
    const files = Array.from(fileInput.files ?? []);
    if (files.length === 0) return;
    parseBtn.disabled = true;
    parseBtn.textContent = 'Analyzing…';
    progress.container.classList.remove('hidden');
    sourceInfo.classList.add('hidden');
    container.innerHTML = '';

    try {
      const parts: CmsParsed[] = [];
      const outcomes: FileOutcome[] = [];
      const names: string[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        progress.text.textContent = `Reading ${file.name} (${i + 1}/${files.length})…`;
        const ab = await file.arrayBuffer();
        const { parsed, adapter, chargers } = await parseCmsWorkbook(ab, file.name);
        parts.push(parsed);
        names.push(file.name);
        outcomes.push({ name: file.name, label: adapter.label, sheet: chargers.join(', ') || file.name, rows: parsed.messages.length });
      }

      const { parsed, rawLogLines } = mergeCmsParsed(parts);
      const result = analyze(parsed, rawLogLines, names);
      renderSourceInfo(sourceInfo, outcomes, result.messages.length, result.alerts.length);
      renderResults(container, result);
    } catch (err) {
      console.error('CMS parse/analyze failed:', err);
      container.innerHTML = `<div class="bg-red-50 dark:bg-red-900/20 border border-red-300 dark:border-red-700 text-red-700 dark:text-red-300 p-4 rounded-lg">Failed to process the CMS file(s): ${err instanceof Error ? err.message : String(err)}</div>`;
    } finally {
      progress.container.classList.add('hidden');
      parseBtn.textContent = 'Parse & Analyze';
      parseBtn.disabled = false;
    }
  });
}

/** Show a banner summarizing the detected customer format and per-file counts. */
function renderSourceInfo(host: HTMLElement, files: FileOutcome[], totalMessages: number, totalAlerts: number): void {
  const labels = Array.from(new Set(files.map((f) => f.label))).join(', ');
  const fileRows = files
    .map((f) => `<li><span class="font-medium">${f.name}</span> — ${f.label} · charger <span class="font-mono">${f.sheet}</span> · ${f.rows} messages</li>`)
    .join('');
  host.innerHTML = `
    <div class="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-lg p-4 text-sm text-gray-700 dark:text-gray-200">
      <div class="font-semibold mb-1">Source: ${labels} CMS format · ${files.length} file(s) · ${totalMessages} messages · ${totalAlerts} alerts</div>
      <ul class="list-disc ml-5 mt-1 space-y-0.5">${fileRows}</ul>
    </div>`;
  host.classList.remove('hidden');
}
