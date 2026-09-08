// Mounts the Uptime view: upload CMS logs -> per-site availability analysis.

import { renderUptimeShell } from './render/renderUptimeShell';
import { renderSiteUptime } from './render/renderSiteUptime';
import { ingestUptimeSources } from './ingest';
import { analyzeUptimeSources } from './analyzeUptime';
import { DEFAULT_UPTIME_OPTIONS, type UptimeOptions } from './types';

/** Yield a frame so the spinner repaints before the (heavy) DOM render. */
function nextFrame(): Promise<void> {
  return new Promise((resolve) => {
    if (typeof requestAnimationFrame === 'function') requestAnimationFrame(() => resolve());
    else setTimeout(resolve, 0);
  });
}

export function mountUptime(mountEl: HTMLElement): void {
  const shell = renderUptimeShell(mountEl);

  shell.analyzeBtn.addEventListener('click', async () => {
    const files = Array.from(shell.fileInput.files ?? []);
    if (files.length === 0) return;

    shell.analyzeBtn.disabled = true;
    shell.analyzeBtn.textContent = 'Analyzing…';
    shell.progress.container.classList.remove('hidden');
    shell.sourceInfo.classList.add('hidden');
    shell.container.innerHTML = '';

    const clusteringWindowSec = Number(shell.clusteringInput.value);
    const options: UptimeOptions = {
      clusteringWindowSec: Number.isFinite(clusteringWindowSec) && clusteringWindowSec >= 0
        ? clusteringWindowSec
        : DEFAULT_UPTIME_OPTIONS.clusteringWindowSec,
      countedCategories: shell.categoriesInput.value.split(',').map((s) => s.trim()).filter(Boolean),
    };

    try {
      shell.progress.text.textContent = `Reading ${files.length} file(s)…`;
      const sources = await ingestUptimeSources(files, { adapterId: shell.customerSelect.value || undefined });

      shell.progress.text.textContent = `Analyzing ${sources.length} site(s)…`;
      await nextFrame();
      const report = analyzeUptimeSources(sources, options);

      shell.progress.text.textContent = 'Rendering…';
      await nextFrame();

      shell.sourceInfo.innerHTML = `
        <div class="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-lg p-4 text-sm text-gray-700 dark:text-gray-200">
          <div class="font-semibold mb-1">
            ${report.sources.map((s) => s.customerLabel).filter((v, i, a) => a.indexOf(v) === i).join(', ')} format ·
            ${files.length} file(s) · ${report.sites.length} site(s)
          </div>
          <ul class="list-disc ml-5 mt-1 space-y-0.5">
            ${report.sources.map((s) => `<li><span class="font-medium">${s.site}</span> — ${s.rowCount.toLocaleString()} rows <span class="text-gray-500 dark:text-gray-400">(${s.fileName})</span></li>`).join('')}
          </ul>
          <div class="mt-2 text-xs text-gray-600 dark:text-gray-300">
            Clustering window ${options.clusteringWindowSec}s · counted categories: ${options.countedCategories.join(', ') || 'none'}
          </div>
        </div>`;
      shell.sourceInfo.classList.remove('hidden');

      shell.container.innerHTML = report.sites.map((site) => renderSiteUptime(site, options)).join('');
    } catch (err) {
      console.error('Uptime analysis failed:', err);
      shell.container.innerHTML = `<div class="bg-red-50 dark:bg-red-900/20 border border-red-300 dark:border-red-700 text-red-700 dark:text-red-300 p-4 rounded-lg">Failed to analyze the file(s): ${err instanceof Error ? err.message : String(err)}</div>`;
    } finally {
      shell.progress.container.classList.add('hidden');
      shell.analyzeBtn.textContent = 'Analyze Uptime';
      shell.analyzeBtn.disabled = false;
    }
  });
}
