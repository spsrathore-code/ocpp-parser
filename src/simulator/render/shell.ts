import { buildCatalog, getMessage } from '../catalog/buildCatalog';
import { renderSelector } from './selector';
import { renderParamForm, readForm } from './paramForm';
import { buildCallFrame, buildResultFrame, defaultResponse } from './payload';
import { validateFrame, formatViolations, newTracker } from '../validate/engineAdapter';
import { LogConsole } from './logConsole';
import { WsClient, type SocketLike } from '../transport/wsClient';
import { analyzeSession } from '../session/toParser';
import { renderResults } from '../../app/render/renderResults';
import type { MessageResult } from '../../services/validation';

export function renderShell(
  root: HTMLElement,
  opts: { makeSocket?: (url: string, proto: string) => SocketLike } = {},
): { mode: () => 'simulator' | 'cp'; container: HTMLElement } {
  root.innerHTML = `
    <div class="max-w-5xl mx-auto p-6 space-y-4">
      <h1 class="text-2xl font-bold">OCPP Simulator</h1>
      <div class="flex gap-4 items-center">
        <label><input type="radio" name="mode" value="simulator" checked /> Simulator Only</label>
        <label><input type="radio" name="mode" value="cp" /> Charge Point (CP) Mode</label>
      </div>
      <div data-role="connect-panel" class="hidden border-t pt-3 flex flex-wrap gap-2 items-center">
        <input data-role="ws-url" type="text" placeholder="wss://csms.example.com/CP_001" class="px-3 py-2 border rounded-md w-full md:w-96" />
        <button data-role="connect" class="bg-blue-600 text-white px-4 py-2 rounded-md">Connect</button>
        <button data-role="heartbeat" class="bg-gray-500 text-white px-4 py-2 rounded-md" disabled>Start Heartbeat</button>
        <span data-role="status" class="ml-2 text-sm">Disconnected</span>
      </div>
      <div data-role="selector"></div>
      <div data-role="form"></div>
      <button data-role="run" class="bg-indigo-600 text-white px-4 py-2 rounded-md" disabled>Run Simulation & Validate</button>
      <div data-role="validation"></div>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <pre data-role="req" class="bg-gray-900 text-white p-3 rounded-md text-xs overflow-auto"></pre>
        <pre data-role="res" class="bg-gray-900 text-white p-3 rounded-md text-xs overflow-auto"></pre>
      </div>
      <div data-role="log"></div>
      <div data-role="parser-results" class="mt-4"></div>
    </div>`;

  const catalog = buildCatalog();
  const form = root.querySelector<HTMLElement>('[data-role="form"]')!;
  const runBtn = root.querySelector<HTMLButtonElement>('[data-role="run"]')!;
  const valEl = root.querySelector<HTMLElement>('[data-role="validation"]')!;
  const reqEl = root.querySelector<HTMLElement>('[data-role="req"]')!;
  const resEl = root.querySelector<HTMLElement>('[data-role="res"]')!;
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
    runBtn.disabled = false;
  });

  function showValidation(r: MessageResult): void {
    const errs = formatViolations(r);
    valEl.innerHTML = r.ok
      ? `<div class="p-3 rounded-md bg-green-50 text-green-800">Validation: Valid</div>`
      : `<div class="p-3 rounded-md bg-red-50 text-red-800">Validation: Failed<ul class="list-disc ml-5">${errs.map(e => `<li>${e}</li>`).join('')}</ul></div>`;
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
