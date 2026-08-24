// Mounts the CMS Log Parser view: upload Excel CMS logs -> shared analysis.
// Compute (arrayBuffer read, XLSX.read, adapters, analyze) runs in the analysis
// Web Worker via runAnalysis() — the spinner now actually spins during parsing
// (spec: 2026-07-09-analysis-worker-design.md).

import { renderCmsShell } from './renderCmsShell';
import { runAnalysis } from '../worker/runner';
import { renderResults } from '../render/renderResults';
import type { CmsFileOutcome } from '../worker/protocol';

/** Yield one frame so the spinner can repaint before the (heavy) DOM render. */
function nextFrame(): Promise<void> {
  return new Promise((resolve) => {
    if (typeof requestAnimationFrame === 'function') requestAnimationFrame(() => resolve());
    else setTimeout(resolve, 0);
  });
}

export function mountCmsParser(mountEl: HTMLElement): void {
  const { fileInput, parseBtn, customerSelect, container, sourceInfo, progress } = renderCmsShell(mountEl);

  parseBtn.addEventListener('click', async () => {
    const files = Array.from(fileInput.files ?? []);
    if (files.length === 0) return;
    parseBtn.disabled = true;
    parseBtn.textContent = 'Analyzing…';
    progress.container.classList.remove('hidden');
    sourceInfo.classList.add('hidden');
    container.innerHTML = '';

    // Empty value = Auto-detect → undefined adapterId (registry detection).
    const adapterId = customerSelect.value || undefined;
    try {
      const { result, cms } = await runAnalysis({ kind: 'cms', files, adapterId }, (label) => {
        progress.text.textContent = label;
      });
      progress.text.textContent = 'Rendering…';
      await nextFrame();
      renderSourceInfo(sourceInfo, cms?.outcomes ?? [], result.messages.length, result.alerts.length);
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
function renderSourceInfo(host: HTMLElement, files: CmsFileOutcome[], totalMessages: number, totalAlerts: number): void {
  const labels = Array.from(new Set(files.map((f) => f.label))).join(', ');
  const fileRows = files
    .map((f) => {
      const mismatchNote = f.directionMismatches
        ? ` · <span class="text-amber-600 dark:text-amber-400" title="Indicative only: the Event Type column is not used for parsing — direction is always derived from the OCPP action. A legitimately Central-System-originated DataTransfer can also register as a false positive.">${f.directionMismatches} rows with a mislabelled Event Type</span>`
        : '';
      return `<li><span class="font-medium">${f.name}</span> — ${f.label} · charger <span class="font-mono">${f.chargers.join(', ') || f.name}</span> · ${f.rows} messages${mismatchNote}</li>`;
    })
    .join('');
  host.innerHTML = `
    <div class="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-lg p-4 text-sm text-gray-700 dark:text-gray-200">
      <div class="font-semibold mb-1">Source: ${labels} CMS format · ${files.length} file(s) · ${totalMessages} messages · ${totalAlerts} alerts</div>
      <ul class="list-disc ml-5 mt-1 space-y-0.5">${fileRows}</ul>
    </div>`;
  host.classList.remove('hidden');
}
