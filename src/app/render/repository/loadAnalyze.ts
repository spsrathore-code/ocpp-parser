// Load & Analyze (FR-189): decompress a stored log and run it through the SAME
// parse pipeline as a fresh upload, rendering into the results container.

import { loadFromRepo } from '../../repository/repository';
import { analyzeLogLines } from '../../analyze';
import { renderResults } from '../renderResults';

export async function loadAndAnalyzeFromRepo(id: number, container: HTMLElement): Promise<void> {
  // Immediate feedback: decompress + the synchronous analyze can take a moment on
  // large logs, so show a spinner (and scroll to it) before the heavy work — this
  // stops the user re-clicking "Load & Analyze" thinking nothing happened.
  container.innerHTML = `<div class="flex items-center gap-3 p-6 text-gray-600 dark:text-gray-300" data-role="repo-loading">
    <span class="inline-block w-5 h-5 border-2 border-gray-300 border-t-indigo-600 rounded-full animate-spin"></span>
    <span>Loading &amp; analyzing…</span>
  </div>`;
  // scrollIntoView is a no-op in jsdom; guard for testability.
  container.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
  // Yield a frame so the spinner actually paints before the blocking parse.
  await new Promise((r) => setTimeout(r, 0));

  const entry = await loadFromRepo(id);
  if (!entry) {
    container.innerHTML = '<div class="p-6 text-red-600 dark:text-red-400">Stored log not found.</div>';
    return;
  }
  const result = analyzeLogLines(entry.content.split(/\r?\n/), entry.meta.filename);
  renderResults(container, result);
  container.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
}
