// Vite entry point — wires the app shell to the analysis pipeline and renderer.
// Multi-file upload: each file is read, parsed, and the parse outputs merged
// before a single analyze() pass (parity with the legacy sequential read + one
// displayResults). Reading is async to keep the UI responsive on large files.

import { renderShell } from './render/shell';
import { initTheme } from './render/theme';
import { renderResults } from './render/renderResults';
import { parseLines } from './parse/parseLines';
import { analyze, mergeParsed } from './analyze';
import type { ParsedLines } from './parse/parseLines';
import { autoSaveUploadedFile } from './repository/autoSave';
import { initLogRepository } from './render/repository/panel';

const root = document.querySelector<HTMLDivElement>('#app');
if (root) {
  const { fileInput, parseBtn, container, repoMount } = renderShell(root);
  initTheme();

  // Mount the Log Repository panel above the upload card (FR-184).
  // onLoadAnalyze stub — Task 4 replaces this with the real loadAndAnalyzeFromRepo call.
  void initLogRepository(repoMount, { onLoadAnalyze: () => {} });

  parseBtn.addEventListener('click', async () => {
    const files = Array.from(fileInput.files ?? []);
    if (files.length === 0) return;
    parseBtn.disabled = true;
    parseBtn.textContent = 'Parsing…';
    try {
      const parts: ParsedLines[] = [];
      const allLines: string[] = [];
      const names: string[] = [];
      for (const file of files) {
        const text = await file.text();
        const lines = text.split(/\r?\n/);
        parts.push(parseLines(lines, file.name));
        allLines.push(...lines);
        names.push(file.name);
        void autoSaveUploadedFile(file.name, text);
      }
      const result = analyze(mergeParsed(parts), allLines, names);
      renderResults(container, result);
    } finally {
      parseBtn.textContent = 'Parse Files';
      parseBtn.disabled = false;
    }
  });
}
