// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { renderShell } from '../../src/simulator/render/shell';
import type { SocketLike } from '../../src/simulator/transport/wsClient';

describe('shell — Simulator Only', () => {
  it('validates and logs a faked exchange for a selected message', () => {
    const root = document.createElement('div');
    renderShell(root);
    const msg = root.querySelector<HTMLSelectElement>('[data-role="message"]')!;
    msg.value = 'Authorize';
    msg.dispatchEvent(new Event('change'));
    root.querySelector<HTMLInputElement>('[name="idTag"]')!.value = 'ABC';
    root.querySelector<HTMLButtonElement>('[data-role="run"]')!.click();
    expect(root.textContent).toMatch(/Valid|Success/i);
    expect(root.textContent).toMatch(/SENT/);
    expect(root.textContent).toMatch(/RECEIVED/);
  });
});

describe('shell — CP Mode', () => {
  it('connection panel toggles and a sent frame goes over the socket', () => {
    const sent: string[] = [];
    const fakeSocket: SocketLike = {
      readyState: 1,
      onopen: null, onmessage: null, onclose: null, onerror: null,
      send: (d: string) => sent.push(d),
      close: () => {},
    };
    const root = document.createElement('div');
    renderShell(root, { makeSocket: () => { queueMicrotask(() => fakeSocket.onopen?.()); return fakeSocket; } });

    const cp = root.querySelector<HTMLInputElement>('input[name="mode"][value="cp"]')!;
    cp.checked = true; cp.dispatchEvent(new Event('change'));
    expect(root.querySelector('[data-role="connect-panel"]')!.classList.contains('hidden')).toBe(false);

    root.querySelector<HTMLInputElement>('[data-role="ws-url"]')!.value = 'ws://x/CP_1';
    root.querySelector<HTMLButtonElement>('[data-role="connect"]')!.click();

    const msg = root.querySelector<HTMLSelectElement>('[data-role="message"]')!;
    msg.value = 'Authorize'; msg.dispatchEvent(new Event('change'));
    root.querySelector<HTMLInputElement>('[name="idTag"]')!.value = 'ABC';
    root.querySelector<HTMLButtonElement>('[data-role="run"]')!.click();
    expect(sent.some(s => s.includes('Authorize'))).toBe(true);
  });
});

describe('shell — Analyze in Parser', () => {
  it('renders results from the logged session', () => {
    const root = document.createElement('div');
    renderShell(root);
    const msg = root.querySelector<HTMLSelectElement>('[data-role="message"]')!;
    msg.value = 'Authorize'; msg.dispatchEvent(new Event('change'));
    root.querySelector<HTMLInputElement>('[name="idTag"]')!.value = 'ABC';
    root.querySelector<HTMLButtonElement>('[data-role="run"]')!.click();
    root.querySelector<HTMLButtonElement>('[data-role="analyze"]')!.click();
    expect(root.querySelector('[data-role="parser-results"]')!.children.length).toBeGreaterThan(0);
  });
});
