// The Uptime view's chrome: upload control, customer selector, thresholds
// panel, progress line and the results host. Mirrors renderCmsShell so the view
// feels like the rest of the suite.

import { CMS_ADAPTERS, CMS_CSV_ADAPTERS } from '../../cms/registry';
import { DEFAULT_COUNTED_CATEGORIES, DEFAULT_UPTIME_OPTIONS } from '../types';

export interface UptimeShell {
  fileInput: HTMLInputElement;
  analyzeBtn: HTMLButtonElement;
  customerSelect: HTMLSelectElement;
  clusteringInput: HTMLInputElement;
  categoriesInput: HTMLInputElement;
  container: HTMLElement;
  sourceInfo: HTMLElement;
  progress: { container: HTMLElement; text: HTMLElement };
}

export function renderUptimeShell(mountEl: HTMLElement): UptimeShell {
  const customerOptions = [...CMS_ADAPTERS, ...CMS_CSV_ADAPTERS]
    .map((a) => `<option value="${a.id}">${a.label}</option>`)
    .join('');

  mountEl.innerHTML = `
    <div class="space-y-6">
      <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h2 class="text-xl font-bold text-gray-800 dark:text-gray-100 mb-1">Charger Uptime Analysis</h2>
        <p class="text-sm text-gray-600 dark:text-gray-300 mb-4">
          Upload CMS log exports (<span class="font-mono">.xlsx</span> or <span class="font-mono">.csv</span>).
          Each sheet is treated as one site, so a workbook holding several chargers is analyzed as several sites
          and compared against each other.
        </p>

        <div class="flex flex-wrap items-end gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1" for="uptime-files">CMS log file(s)</label>
            <input id="uptime-files" type="file" multiple accept=".xlsx,.xls,.csv"
              class="block text-sm text-gray-700 dark:text-gray-200 file:mr-3 file:py-2 file:px-4 file:rounded-md file:border-0 file:bg-indigo-600 file:text-white hover:file:bg-indigo-700" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1" for="uptime-customer">Customer format</label>
            <select id="uptime-customer"
              class="rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 text-sm px-3 py-2">
              <option value="">Auto-detect</option>${customerOptions}
            </select>
          </div>
          <button id="uptime-analyze" type="button"
            class="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-5 py-2 rounded-md">Analyze Uptime</button>
        </div>

        <details class="mt-4">
          <summary class="cursor-pointer text-sm font-medium text-gray-700 dark:text-gray-200">Thresholds</summary>
          <div class="mt-3 grid gap-4 sm:grid-cols-2">
            <div>
              <label class="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1" for="uptime-clustering">Fault clustering window (seconds)</label>
              <input id="uptime-clustering" type="number" min="0" step="10" value="${DEFAULT_UPTIME_OPTIONS.clusteringWindowSec}"
                class="w-32 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 text-sm px-3 py-2" />
              <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">Repeats of the same fault on a connector inside this window are one episode.</p>
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1" for="uptime-categories">Downtime categories counted against uptime</label>
              <input id="uptime-categories" type="text" value="${DEFAULT_COUNTED_CATEGORIES.join(', ')}"
                class="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 text-sm px-3 py-2" />
              <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">Comma-separated. All other faults are measured and reported, but not subtracted.</p>
            </div>
          </div>
        </details>

        <div id="uptime-progress" class="hidden mt-4 flex items-center gap-3 text-sm text-gray-600 dark:text-gray-300">
          <span class="inline-block h-4 w-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></span>
          <span id="uptime-progress-text">Reading…</span>
        </div>
      </div>

      <div id="uptime-source" class="hidden"></div>
      <div id="uptime-results" class="space-y-6"></div>
    </div>`;

  const byId = <T extends HTMLElement>(id: string): T => mountEl.querySelector(`#${id}`) as T;
  return {
    fileInput: byId<HTMLInputElement>('uptime-files'),
    analyzeBtn: byId<HTMLButtonElement>('uptime-analyze'),
    customerSelect: byId<HTMLSelectElement>('uptime-customer'),
    clusteringInput: byId<HTMLInputElement>('uptime-clustering'),
    categoriesInput: byId<HTMLInputElement>('uptime-categories'),
    container: byId('uptime-results'),
    sourceInfo: byId('uptime-source'),
    progress: { container: byId('uptime-progress'), text: byId('uptime-progress-text') },
  };
}
