// Mounts the Uptime view: upload CMS logs -> per-site availability analysis.

import { renderUptimeShell } from './render/renderUptimeShell';
import { renderSiteUptime } from './render/renderSiteUptime';
import { renderFaultBreakdown } from './render/renderFaultBreakdown';
import { buildFaultBreakdown } from './compare/faultBreakdown';
import { renderErrorCodeComparison, renderUptimeComparison } from './render/renderComparisons';
import { buildErrorCodeComparison } from './compare/errorCodeCompare';
import { buildUptimeComparison } from './compare/uptimeCompare';
import { buildDowntimeDetail } from './compare/downtimeDetail';
import { ingestUptimeSlots } from './ingest';
import { analyzeUptimeSources } from './analyzeUptime';
import { attachExportControls } from './export/attachExportControls';
import { initDowntimeDetailFilters } from './render/downtimeDetailFilters';
import { DEFAULT_UPTIME_OPTIONS, type UptimeOptions } from './types';

/**
 * Yield a frame so the spinner repaints before the (heavy) DOM render.
 *
 * Races requestAnimationFrame against a timer, because rAF does NOT fire while
 * the tab is in the background. Waiting on it alone means switching away
 * mid-analysis hangs the run at "Analyzing…" forever, with no error and no way
 * back short of a reload — the spinner is a nicety, so it must never be able to
 * block the result.
 */
function nextFrame(): Promise<void> {
  return new Promise((resolve) => {
    let settled = false;
    const finish = (): void => {
      if (settled) return;
      settled = true;
      resolve();
    };
    if (typeof requestAnimationFrame === 'function') requestAnimationFrame(finish);
    setTimeout(finish, 50);
  });
}

export function mountUptime(mountEl: HTMLElement): void {
  const shell = renderUptimeShell(mountEl);

  shell.analyzeBtn.addEventListener('click', async () => {
    const filesA = Array.from(shell.fileInput.files ?? []);
    const filesB = Array.from(shell.fileInputB.files ?? []);
    const files = [...filesA, ...filesB];
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
      // Blank means derive per charger from its BootNotification interval.
      communicationTimeoutSec: shell.timeoutInput.value.trim() === '' || !Number.isFinite(Number(shell.timeoutInput.value))
        ? null
        : Math.max(0, Number(shell.timeoutInput.value)),
    };

    try {
      shell.progress.text.textContent = `Reading ${files.length} file(s)…`;
      // Slots stay separate sites: a file in Site B is a different charger even
      // when both exports name their sheet the same thing.
      const sources = await ingestUptimeSlots(
        [
          { label: 'Site A', files: filesA, siteName: shell.siteNameA.value },
          { label: 'Site B', files: filesB, siteName: shell.siteNameB.value },
        ],
        { adapterId: shell.customerSelect.value || undefined },
      );

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
            Clustering window ${options.clusteringWindowSec}s ·
            comms timeout ${options.communicationTimeoutSec === null
              ? report.sites.map((s) => `${s.site} ${s.effectiveTimeoutSec}s${s.heartbeatIntervalSec ? ` (from ${s.heartbeatIntervalSec}s heartbeat)` : ' (no BootNotification — fallback)'}`).join(', ')
              : `${options.communicationTimeoutSec}s (manual)`} ·
            counted categories: ${options.countedCategories.join(', ') || 'none'}
          </div>
        </div>`;
      shell.sourceInfo.classList.remove('hidden');

      const siteNames = report.sites.map((s) => s.site);
      // Comparison first: the end goal is comparing a pair of chargers, so the
      // cross-site answer leads and the per-site detail backs it up. The
      // per-site cards are long, and burying the comparison under them made it
      // read as missing.
      const comparison = report.sites.length > 1
        ? renderUptimeComparison(
            buildUptimeComparison(report.sites, options, report.baselineSite),
            buildDowntimeDetail(report.sites[0], report.sites[1], { categories: options.countedCategories }),
          )
          + renderFaultBreakdown(buildFaultBreakdown(report.sites), siteNames)
          + renderErrorCodeComparison(buildErrorCodeComparison(report.sites), siteNames)
        : `<div class="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-200 text-sm rounded-lg p-4">
             <strong>Only one site loaded.</strong> Add a second charger's log under <em>Site B</em> to unlock the
             cross-site sections: Fault Breakdown, Error Code Comparison and Uptime Comparison.
           </div>`;

      // Section index. The per-site cards are long (a 165-row outage table each),
      // so without this the comparison sections sit far below the fold and read
      // as missing.
      const link = (href: string, label: string): string =>
        `<a href="#${href}" class="px-3 py-1.5 rounded-md bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-sm text-indigo-700 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-gray-600">${label}</a>`;
      const multiSite = report.sites.length > 1;
      const siteLinks = report.sites
        .map((s, i) => link(
          `site-${s.site.replace(/[^a-zA-Z0-9]+/g, '-').toLowerCase()}`,
          `${multiSite ? `${i + 4}) ` : ''}${s.site}`,
        ))
        .join('');
      const compareLinks = multiSite
        ? link('uptime-comparison', '1) Uptime Comparison')
          + link('fault-breakdown', '2) Fault Breakdown')
          + link('errorcode-comparison', '3) Error Code Comparison')
        : '';
      const index = `
        <div class="bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 rounded-lg p-3">
          <div class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Sections</div>
          <div class="flex flex-wrap gap-2">${compareLinks}${siteLinks}</div>
        </div>`;

      shell.container.innerHTML =
        index + comparison + report.sites.map((site, i) => renderSiteUptime(site, options, multiSite ? i + 4 : undefined)).join('');

      initDowntimeDetailFilters(shell.container);

      // Every table gets Excel + PNG controls. Done as a DOM pass so a section
      // added later cannot ship without them.
      for (const section of Array.from(shell.container.querySelectorAll<HTMLElement>('section'))) {
        const site = report.sites.find((s) => section.id === `site-${s.site.replace(/[^a-zA-Z0-9]+/g, '-').toLowerCase()}`);
        attachExportControls(section, site ? site.site : '');
      }
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
