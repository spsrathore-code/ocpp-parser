import { buildCatalog, getMessage } from '../catalog/buildCatalog';
import { renderSelector } from './selector';
import { renderParamForm, readForm } from './paramForm';
import { renderMessageFormat } from './messageFormat';
import { buildCallFrame, buildResultFrame, defaultResponse } from './payload';
import { validateFrame, formatViolations, newTracker } from '../validate/engineAdapter';
import { LogConsole } from './logConsole';
import { WsClient, type SocketLike } from '../transport/wsClient';
import { analyzeSession } from '../session/toParser';
import { renderResults } from '../../app/render/renderResults';
import type { MessageResult } from '../../services/validation';

const CARD = 'bg-white dark:bg-gray-800 p-6 rounded-lg shadow border border-gray-200 dark:border-gray-700';
const CODE = 'bg-gray-900 text-white p-4 rounded-lg text-xs overflow-auto whitespace-pre';

export function renderShell(
  root: HTMLElement,
  opts: { makeSocket?: (url: string, proto: string) => SocketLike } = {},
): { mode: () => 'simulator' | 'cp'; container: HTMLElement } {
  root.innerHTML = `
    <div class="max-w-6xl mx-auto p-6 space-y-6">

      <!-- Operating Mode -->
      <div class="max-w-2xl mx-auto ${CARD}">
        <h3 class="text-lg font-semibold text-center mb-3 text-gray-800 dark:text-gray-100">Operating Mode</h3>
        <div class="flex justify-center gap-6">
          <label class="flex items-center gap-2 cursor-pointer text-gray-800 dark:text-gray-200"><input type="radio" name="mode" value="simulator" checked /> Simulator Only</label>
          <label class="flex items-center gap-2 cursor-pointer text-gray-800 dark:text-gray-200"><input type="radio" name="mode" value="cp" /> Charge Point (CP) Mode</label>
        </div>
        <div data-role="connect-panel" class="hidden mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 flex flex-wrap gap-2 items-center justify-center">
          <input data-role="ws-url" type="text" placeholder="wss://csms.example.com/CP_001" class="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 w-full md:w-96" />
          <button data-role="connect" class="bg-blue-600 text-white px-4 py-2 rounded-md">Connect</button>
          <button data-role="heartbeat" class="bg-gray-500 text-white px-4 py-2 rounded-md" disabled>Start Heartbeat</button>
          <span data-role="status" class="ml-2 text-sm text-gray-600 dark:text-gray-300">Disconnected</span>
        </div>
      </div>

      <!-- Two columns -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">

        <!-- LEFT: message selection, description, format, validation -->
        <div class="space-y-6">
          <div>
            <label class="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">OCPP Message</label>
            <div data-role="selector"></div>
          </div>

          <div data-role="desc-card" class="${CARD} hidden">
            <h3 class="text-xl font-semibold mb-2 text-gray-800 dark:text-gray-100">Description</h3>
            <p data-role="desc" class="text-gray-600 dark:text-gray-300"></p>
          </div>

          <div data-role="format-card" class="${CARD} hidden">
            <h3 class="text-xl font-semibold mb-2 text-gray-800 dark:text-gray-100">Message Format</h3>
            <div data-role="format"></div>
          </div>

          <div data-role="validation"></div>
        </div>

        <!-- RIGHT: editable request params, request payload, response payload -->
        <div class="space-y-6">
          <div class="${CARD}">
            <h3 class="text-xl font-semibold mb-4 text-gray-800 dark:text-gray-100">Request Parameters (Editable)</h3>
            <div data-role="form"></div>
            <button data-role="run" class="mt-6 w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-4 rounded-md disabled:opacity-50" disabled>Run Simulation &amp; Validate Request</button>
          </div>

          <div class="${CARD}">
            <h3 class="text-xl font-semibold mb-3 text-gray-800 dark:text-gray-100">Request Payload</h3>
            <pre data-role="req" class="${CODE}">{}</pre>
          </div>

          <div class="${CARD}">
            <h3 class="text-xl font-semibold mb-3 text-gray-800 dark:text-gray-100">Response Payload</h3>
            <pre data-role="res" class="${CODE}">{}</pre>
          </div>
        </div>
      </div>

      <!-- OCPP Message Log (full width) -->
      <div class="${CARD}">
        <div data-role="log"></div>
      </div>
      <div data-role="parser-results"></div>
    </div>`;

  const catalog = buildCatalog();
  const form = root.querySelector<HTMLElement>('[data-role="form"]')!;
  const runBtn = root.querySelector<HTMLButtonElement>('[data-role="run"]')!;
  const valEl = root.querySelector<HTMLElement>('[data-role="validation"]')!;
  const reqEl = root.querySelector<HTMLElement>('[data-role="req"]')!;
  const resEl = root.querySelector<HTMLElement>('[data-role="res"]')!;
  const descCard = root.querySelector<HTMLElement>('[data-role="desc-card"]')!;
  const descEl = root.querySelector<HTMLElement>('[data-role="desc"]')!;
  const formatCard = root.querySelector<HTMLElement>('[data-role="format-card"]')!;
  const formatEl = root.querySelector<HTMLElement>('[data-role="format"]')!;
  const resultsEl = root.querySelector<HTMLElement>('[data-role="parser-results"]')!;
  const log = new LogConsole(root.querySelector('[data-role="log"]')!, {
    onAnalyze: (entries) => {
      resultsEl.innerHTML = '';
      const result = analyzeSession(entries);
      renderResults(resultsEl, result);
    },
  });
  const mode = () => (root.querySelector<HTMLInputElement>('input[name="mode"]:checked')!.value as 'simulator' | 'cp');

  // ---- CP-Mode transport ----
  const client = new WsClient(opts.makeSocket);
  const tracker = newTracker();
  const panel = root.querySelector<HTMLElement>('[data-role="connect-panel"]')!;
  const statusEl = root.querySelector<HTMLElement>('[data-role="status"]')!;
  const hbBtn = root.querySelector<HTMLButtonElement>('[data-role="heartbeat"]')!;
  let hbTimer: ReturnType<typeof setInterval> | null = null;

  root.querySelectorAll<HTMLInputElement>('input[name="mode"]').forEach(r =>
    r.addEventListener('change', () => panel.classList.toggle('hidden', mode() !== 'cp')));

  root.querySelector<HTMLButtonElement>('[data-role="connect"]')!.addEventListener('click', () => {
    const url = root.querySelector<HTMLInputElement>('[data-role="ws-url"]')!.value.trim();
    if (!/^wss?:\/\//.test(url)) { statusEl.textContent = 'Enter a ws:// or wss:// URL'; return; }
    statusEl.textContent = 'Connecting…';
    client.connect(url, {
      onOpen: () => { statusEl.textContent = 'Connected'; hbBtn.disabled = false; },
      onClose: () => { statusEl.textContent = 'Disconnected'; hbBtn.disabled = true; if (hbTimer) { clearInterval(hbTimer); hbTimer = null; } },
      onError: () => { statusEl.textContent = 'Error'; },
      onFrame: (frame) => {
        tracker.add(frame, new Date().toISOString());
        log.log({ ts: new Date().toISOString(), direction: 'received', frame });
        resEl.textContent = JSON.stringify(frame, null, 2);
      },
    });
  });

  hbBtn.addEventListener('click', () => {
    if (hbTimer) { clearInterval(hbTimer); hbTimer = null; hbBtn.textContent = 'Start Heartbeat'; return; }
    hbBtn.textContent = 'Stop Heartbeat';
    hbTimer = setInterval(() => {
      const frame = buildCallFrame('Heartbeat', crypto.randomUUID(), {});
      tracker.add(frame, new Date().toISOString());
      client.send(frame);
      log.log({ ts: new Date().toISOString(), direction: 'sent', frame });
    }, 30000);
  });

  // ---- Message selection + run ----
  let currentAction = '';
  renderSelector(root.querySelector('[data-role="selector"]')!, catalog, (action) => {
    currentAction = action;
    const def = getMessage(action)!;
    renderParamForm(form, def.request);
    descEl.textContent = def.description ?? '';
    descCard.classList.toggle('hidden', !def.description);
    formatEl.innerHTML = renderMessageFormat(def.request, def.response);
    formatCard.classList.remove('hidden');
    runBtn.disabled = false;
  });

  function showValidation(r: MessageResult): void {
    const errs = formatViolations(r);
    valEl.innerHTML = r.ok
      ? `<div class="p-4 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-800 dark:text-green-300"><span class="font-semibold">Validation: Valid</span></div>`
      : `<div class="p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-300"><span class="font-semibold">Validation: Failed</span><ul class="list-disc ml-5 mt-1">${errs.map(e => `<li>${e}</li>`).join('')}</ul></div>`;
  }

  runBtn.addEventListener('click', () => {
    if (!currentAction) return;
    const def = getMessage(currentAction)!;
    const payload = readForm(form, def.request);
    const callFrame = buildCallFrame(currentAction, 'sim-1', payload);
    const result = validateFrame(callFrame);
    showValidation(result);
    reqEl.textContent = JSON.stringify(callFrame, null, 2);
    if (mode() === 'simulator') {
      log.log({ ts: new Date().toISOString(), direction: 'sent', frame: callFrame });
      const res = defaultResponse(def.response);
      if (!result.ok && 'status' in res) res.status = 'Rejected';
      const resFrame = buildResultFrame('sim-1', res);
      resEl.textContent = JSON.stringify(resFrame, null, 2);
      log.log({ ts: new Date().toISOString(), direction: 'received', frame: resFrame });
    } else { // CP mode
      if (result.ok && client.isOpen()) {
        const id = crypto.randomUUID();
        const frame = buildCallFrame(currentAction, id, payload);
        tracker.add(frame, new Date().toISOString());
        client.send(frame);
        log.log({ ts: new Date().toISOString(), direction: 'sent', frame });
        resEl.textContent = 'Waiting for server response…';
      }
    }
  });

  return { mode, container: root };
}
