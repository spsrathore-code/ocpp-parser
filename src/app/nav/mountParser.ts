// Mounts the Client Log Parser view into a given container.
// Compute (file read, chunked parse, analyze) runs in the analysis Web Worker
// via runAnalysis() — the main thread only auto-saves and renders, so large
// files no longer freeze the UI (spec: 2026-07-09-analysis-worker-design.md).

import { renderShell } from '../render/shell';
import { renderResults } from '../render/renderResults';
import { runAnalysis } from '../worker/runner';
import { autoSaveWithUx } from '../render/repository/autoSaveUx';
import { initLogRepository } from '../render/repository/panel';
import { loadAndAnalyzeFromRepo } from '../render/repository/loadAnalyze';

/** Yield one frame so progress UI can repaint before the (heavy) DOM render. */
function nextFrame(): Promise<void> {
  return new Promise((resolve) => {
    if (typeof requestAnimationFrame === 'function') requestAnimationFrame(() => resolve());
    else setTimeout(resolve, 0);
  });
}

export function mountParser(mountEl: HTMLElement): void {
  const { fileInput, parseBtn, container, repoMount, progress } = renderShell(mountEl);

  // Log Repository panel (FR-184/189) — unchanged, stays on the main thread.
  void initLogRepository(repoMount, { onLoadAnalyze: (id) => loadAndAnalyzeFromRepo(id, container) });

  parseBtn.addEventListener('click', async () => {
    const files = Array.from(fileInput.files ?? []);
    if (files.length === 0) return;
    parseBtn.disabled = true;
    parseBtn.textContent = 'Parsing…';
    progress.container.classList.remove('hidden');
    try {
      // Auto-save is main-thread and failure-isolated — unchanged behavior.
      for (const file of files) {
        void file.text().then((text) => autoSaveWithUx(file.name, text));
      }
      const { result } = await runAnalysis({ kind: 'text', files }, (label, pct) => {
        progress.text.textContent = label;
        if (pct !== undefined) {
          progress.percent.textContent = `${pct}%`;
          progress.bar.style.width = `${pct}%`;
        }
      });
      progress.text.textContent = 'Rendering…';
      await nextFrame();
      renderResults(container, result);
    } catch (err) {
      // Surface failures instead of silently rendering nothing.
      console.error('Parse/analyze failed:', err);
      container.innerHTML = `<div class="bg-red-50 dark:bg-red-900/20 border border-red-300 dark:border-red-700 text-red-700 dark:text-red-300 p-4 rounded-lg">Failed to process the uploaded file(s): ${err instanceof Error ? err.message : String(err)}</div>`;
    } finally {
      progress.container.classList.add('hidden');
      progress.bar.style.width = '0%';
      parseBtn.textContent = 'Parse Files';
      parseBtn.disabled = false;
    }
  });
}
