// The Uptime view's chrome: upload control, customer selector, thresholds
// panel, progress line and the results host. Mirrors renderCmsShell so the view
// feels like the rest of the suite.

import { CMS_ADAPTERS, CMS_CSV_ADAPTERS } from '../../cms/registry';
import { DEFAULT_COUNTED_CATEGORIES, DEFAULT_UPTIME_OPTIONS } from '../types';

export interface UptimeShell {
  /** Site A — required. */
  fileInput: HTMLInputElement;
  /** Site B — optional; supplying it turns on the comparison sections. */
  fileInputB: HTMLInputElement;
  /** Optional site labels. OCPP carries no charger id, so these are typed. */
  siteNameA: HTMLInputElement;
  siteNameB: HTMLInputElement;
  analyzeBtn: HTMLButtonElement;
  customerSelect: HTMLSelectElement;
  clusteringInput: HTMLInputElement;
  timeoutInput: HTMLInputElement;
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

        <div class="grid gap-4 sm:grid-cols-2">
          <div class="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
            <label class="block text-sm font-semibold text-gray-800 dark:text-gray-100 mb-1" for="uptime-files">Site A <span class="text-red-600">*</span></label>
            <p class="text-xs text-gray-500 dark:text-gray-400 mb-2">The first charger's CMS log export.</p>
            <input id="uptime-files" type="file" multiple accept=".xlsx,.xls,.csv"
              class="block w-full text-sm text-gray-700 dark:text-gray-200 file:mr-3 file:py-2 file:px-4 file:rounded-md file:border-0 file:bg-indigo-600 file:text-white hover:file:bg-indigo-700" />
            <label class="block text-xs font-medium text-gray-600 dark:text-gray-300 mt-3 mb-1" for="uptime-name-a">Site name <span class="text-gray-400">(optional)</span></label>
            <input id="uptime-name-a" type="text" placeholder="e.g. DC052 — auto-detected if blank"
              class="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 text-sm px-3 py-2" />
          </div>
          <div class="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
            <label class="block text-sm font-semibold text-gray-800 dark:text-gray-100 mb-1" for="uptime-files-b">Site B <span class="text-gray-400 font-normal">(optional)</span></label>
            <p class="text-xs text-gray-500 dark:text-gray-400 mb-2">The second charger, to compare against Site A.</p>
            <input id="uptime-files-b" type="file" multiple accept=".xlsx,.xls,.csv"
              class="block w-full text-sm text-gray-700 dark:text-gray-200 file:mr-3 file:py-2 file:px-4 file:rounded-md file:border-0 file:bg-gray-600 file:text-white hover:file:bg-gray-700" />
            <label class="block text-xs font-medium text-gray-600 dark:text-gray-300 mt-3 mb-1" for="uptime-name-b">Site name <span class="text-gray-400">(optional)</span></label>
            <input id="uptime-name-b" type="text" placeholder="e.g. DC053 — auto-detected if blank"
              class="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 text-sm px-3 py-2" />
          </div>
        </div>

        <div class="flex flex-wrap items-end gap-4 mt-4">
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
        <p class="text-xs text-gray-500 dark:text-gray-400 mt-2">
          Leave <em>Site name</em> blank and the label is taken from the sheet name (boilerplate like
          "CMS Logs" stripped), falling back to the file name when the sheet is called something generic
          like "Sheet1". OCPP 1.6J carries no charger id, so type a name whenever you want a specific one.
          A workbook whose sheets hold several chargers is split into one site per sheet automatically —
          so the DC052/DC053 reference file can go into Site A on its own and still compare.
        </p>

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
              <label class="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1" for="uptime-timeout">Communication timeout (seconds)</label>
              <input id="uptime-timeout" type="number" min="0" step="30" placeholder="Auto"
                class="w-32 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 text-sm px-3 py-2" />
              <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Silence longer than this counts as a communication loss. Leave blank to derive it per charger from
                its own <span class="font-mono">BootNotification</span> Heartbeat interval (1.5 &times; the interval,
                so a 120 s heartbeat gives 180 s).
              </p>
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
    fileInputB: byId<HTMLInputElement>('uptime-files-b'),
    siteNameA: byId<HTMLInputElement>('uptime-name-a'),
    siteNameB: byId<HTMLInputElement>('uptime-name-b'),
    analyzeBtn: byId<HTMLButtonElement>('uptime-analyze'),
    customerSelect: byId<HTMLSelectElement>('uptime-customer'),
    clusteringInput: byId<HTMLInputElement>('uptime-clustering'),
    timeoutInput: byId<HTMLInputElement>('uptime-timeout'),
    categoriesInput: byId<HTMLInputElement>('uptime-categories'),
    container: byId('uptime-results'),
    sourceInfo: byId('uptime-source'),
    progress: { container: byId('uptime-progress'), text: byId('uptime-progress-text') },
  };
}
