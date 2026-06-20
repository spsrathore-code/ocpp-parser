// Load & Analyze (FR-189): decompress a stored log and run it through the SAME
// parse pipeline as a fresh upload, rendering into the results container.

import { loadFromRepo } from '../../repository/repository';
import { analyzeLogLines } from '../../analyze';
import { renderResults } from '../renderResults';

export async function loadAndAnalyzeFromRepo(id: number, container: HTMLElement): Promise<void> {
  const entry = await loadFromRepo(id);
  if (!entry) return;
  const result = analyzeLogLines(entry.content.split(/\r?\n/), entry.meta.filename);
  renderResults(container, result);
  // scrollIntoView is a no-op in jsdom; guard for testability.
  container.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
}
