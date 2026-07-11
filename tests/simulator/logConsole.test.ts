// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { LogConsole } from '../../src/simulator/render/logConsole';

describe('LogConsole', () => {
  it('records entries and renders SENT/RECEIVED', () => {
    const mount = document.createElement('div');
    const lc = new LogConsole(mount);
    lc.log({ ts: '2026-07-03T10:00:00Z', direction: 'sent', frame: [2, 'id', 'Heartbeat', {}] });
    lc.log({ ts: '2026-07-03T10:00:01Z', direction: 'received', frame: [3, 'id', {}] });
    expect(lc.entries()).toHaveLength(2);
    expect(mount.textContent).toMatch(/SENT/);
    expect(mount.textContent).toMatch(/RECEIVED/);
  });
  it('fires onAnalyze with recorded entries', () => {
    const mount = document.createElement('div');
    const onAnalyze = vi.fn();
    const lc = new LogConsole(mount, { onAnalyze });
    lc.log({ ts: 't', direction: 'sent', frame: [2, 'id', 'Heartbeat', {}] });
    mount.querySelector<HTMLButtonElement>('[data-role="analyze"]')!.click();
    expect(onAnalyze).toHaveBeenCalledOnce();
    expect(onAnalyze.mock.calls[0][0]).toHaveLength(1);
  });
});
