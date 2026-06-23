// Vite entry point — wires the app shell to the analysis pipeline and renderer.
// Multi-file upload: each file is read, parsed, and the parse outputs merged
// before a single analyze() pass (parity with the legacy sequential read + one
// displayResults). Reading is async to keep the UI responsive on large files.

import { renderShell } from './render/shell';
import { initTheme } from './render/theme';
import { renderResults } from './render/renderResults';
import { parseLinesAsync } from './parse/parseLinesAsync';
import { analyze, mergeParsed } from './analyze';
import { appendAll } from './parse/concatChunks';
import type { ParsedLines } from './parse/parseLines';
// autoSaveUploadedFile (./repository/autoSave) is the headless path — kept for tests; production uses UX wrapper below.
import { autoSaveWithUx } from './render/repository/autoSaveUx';
import { initLogRepository } from './render/repository/panel';
import { loadAndAnalyzeFromRepo } from './render/repository/loadAnalyze';

const root = document.querySelector<HTMLDivElement>('#app');
if (root) {
  const { fileInput, parseBtn, container, repoMount, progress } = renderShell(root);
  initTheme();

  // Mount the Log Repository panel above the upload card (FR-184).
  // Task 4: wire real Load & Analyze — loads from IndexedDB and renders into `container` (FR-189).
  void initLogRepository(repoMount, { onLoadAnalyze: (id) => loadAndAnalyzeFromRepo(id, container) });

  parseBtn.addEventListener('click', async () => {
    const files = Array.from(fileInput.files ?? []);
    if (files.length === 0) return;
    parseBtn.disabled = true;
    parseBtn.textContent = 'Parsing…';
    progress.container.classList.remove('hidden');
    try {
      const parts: ParsedLines[] = [];
      const allLines: string[] = [];
      const names: string[] = [];
      const totalFiles = files.length;
      for (let fi = 0; fi < files.length; fi++) {
        const file = files[fi];
        const text = await file.text();
        const lines = text.split(/\r?\n/);
        // Chunked async parse — yields between 1000-line chunks so the UI stays
        // responsive (and a progress bar updates) on large files (FR: no-freeze).
        const parsed = await parseLinesAsync(lines, file.name, {
          onProgress: (done, total) => {
            const pct = total > 0 ? Math.round((done / total) * 100) : 100;
            progress.text.textContent = `File ${fi + 1}/${totalFiles}: Processing lines ${done}/${total}…`;
            progress.percent.textContent = `${pct}%`;
            progress.bar.style.width = `${pct}%`;
          },
        });
        parts.push(parsed);
        appendAll(allLines, lines); // loop-append: a large file's lines would overflow `push(...lines)`
        names.push(file.name);
        void autoSaveWithUx(file.name, text);
      }
      const result = analyze(mergeParsed(parts), allLines, names);
      renderResults(container, result);
    } catch (err) {
      // Surface failures instead of silently rendering nothing (previously a large
      // file threw here and the empty `finally` hid it → "no results").
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
