import type { SessionEntry } from '../model/types';

export class LogConsole {
  private _entries: SessionEntry[] = [];
  private list: HTMLElement;

  constructor(private mount: HTMLElement, private opts: { onAnalyze?: (entries: SessionEntry[]) => void } = {}) {
    mount.innerHTML = `
      <div class="flex justify-between items-center mb-2">
        <h3 class="font-semibold">OCPP Message Log</h3>
        <div class="flex gap-2">
          <button data-role="analyze" class="text-sm bg-indigo-600 text-white px-3 py-1 rounded-md">Analyze in Parser</button>
          <button data-role="clear" class="text-sm bg-gray-200 px-3 py-1 rounded-md">Clear</button>
        </div>
      </div>
      <div data-role="list" class="bg-gray-900 text-white p-3 rounded-md h-64 overflow-y-auto font-mono text-xs"></div>`;
    this.list = mount.querySelector('[data-role="list"]')!;
    mount.querySelector('[data-role="clear"]')!.addEventListener('click', () => this.clear());
    mount.querySelector('[data-role="analyze"]')!.addEventListener('click', () => this.opts.onAnalyze?.(this._entries));
  }

  log(entry: SessionEntry): void {
    this._entries.push(entry);
    const tag = entry.direction === 'sent' ? 'SENT' : 'RECEIVED';
    const color = entry.direction === 'sent' ? 'text-green-400' : 'text-blue-400';
    const row = document.createElement('div');
    row.innerHTML = `<span class="text-gray-500">${entry.ts}</span> <span class="${color} font-bold">${tag.padEnd(8)}</span> ${JSON.stringify(entry.frame)}`;
    this.list.appendChild(row);
    this.list.scrollTop = this.list.scrollHeight;
  }

  clear(): void { this._entries = []; this.list.innerHTML = ''; }
  entries(): SessionEntry[] { return this._entries.slice(); }
}
