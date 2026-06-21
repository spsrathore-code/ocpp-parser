// Session Timeline modal shell — faithful port of legacy createSessionTimelineModal
// (HTML 7865–7931). Builds a fixed dark modal with 4-tab bar (Session · Energy ·
// Status · Telemetry), Chart.js instance lifecycle (destroy-on-tab-switch), and
// close via × button or backdrop click. Tab bodies are placeholders; real renderers
// land in Tasks 2–5.

import type { Transaction, ParsedMessage } from '../../model/types';
import { getTimelineDataForTx, tlTime } from './timelineData';

type ChartLike = { destroy(): void };

export function createSessionTimelineModal(
  txId: number,
  transactions: Transaction[],
  messages: ParsedMessage[],
): void {
  const data = getTimelineDataForTx(txId, transactions, messages);
  if (!data) {
    // eslint-disable-next-line no-alert
    alert('No timeline data found for TX ' + txId);
    return;
  }
  const { tx, txStart, txStop } = data;

  const overlay = document.createElement('div');
  overlay.style.cssText =
    'position:fixed;inset:0;background:rgba(0,0,0,0.85);z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px;';

  const modal = document.createElement('div');
  modal.setAttribute('data-timeline-modal', '');
  modal.style.cssText =
    'background:#111827;border-radius:12px;width:100%;max-width:1100px;max-height:90vh;overflow:hidden;display:flex;flex-direction:column;border:1px solid #374151;box-shadow:0 25px 60px rgba(0,0,0,0.7);';

  // Header
  const hdr = document.createElement('div');
  hdr.style.cssText =
    'display:flex;justify-content:space-between;align-items:center;padding:13px 20px;border-bottom:1px solid #374151;flex-shrink:0;';
  hdr.innerHTML = `
    <div>
      <span style="color:#c7d2fe;font-weight:600;font-size:14px;">📊 Session Timeline</span>
      <span style="color:#6b7280;font-size:12px;margin-left:12px;">TX ${tx.id} · Connector ${tx.connectorId} · ${tlTime(txStart, false)} → ${txStop ? tlTime(txStop, false) : 'Ongoing'}</span>
    </div>
    <button id="tl-close-btn" style="color:#9ca3af;background:#1f2937;border:1px solid #374151;cursor:pointer;font-size:13px;padding:4px 12px;border-radius:6px;">✕ Close</button>`;

  // Tab bar
  const tabBar = document.createElement('div');
  tabBar.style.cssText =
    'display:flex;border-bottom:1px solid #374151;flex-shrink:0;padding:0 20px;';
  (
    [
      ['session', 'Session'],
      ['energy', 'Energy'],
      ['status', 'Status'],
      ['telemetry', 'Telemetry'],
    ] as [string, string][]
  ).forEach(([key, label]) => {
    const btn = document.createElement('button');
    btn.dataset.tlTab = key;
    btn.textContent = label;
    btn.style.cssText =
      'padding:10px 18px;background:none;border:none;border-bottom:2px solid transparent;cursor:pointer;font-size:13px;font-weight:500;color:#6b7280;transition:color .15s,border-color .15s;';
    tabBar.appendChild(btn);
  });

  // Content area
  const content = document.createElement('div');
  content.style.cssText = 'flex:1;overflow:auto;padding:20px;';

  modal.appendChild(hdr);
  modal.appendChild(tabBar);
  modal.appendChild(content);
  overlay.appendChild(modal);

  // Chart tracker
  let activeCharts: ChartLike[] = [];
  const pushChart = (c: ChartLike): void => { activeCharts.push(c); };
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  void pushChart; // available for task 2–5 renderers
  const killCharts = (): void => {
    activeCharts.forEach((c) => { try { c.destroy(); } catch { /* ignore */ } });
    activeCharts = [];
  };

  const renderTab = (key: string): void => {
    tabBar.querySelectorAll('button[data-tl-tab]').forEach((b) => {
      const btn = b as HTMLButtonElement;
      const on = btn.dataset.tlTab === key;
      btn.style.color = on ? '#818cf8' : '#6b7280';
      btn.style.borderBottom = on ? '2px solid #818cf8' : '2px solid transparent';
    });
    killCharts();
    content.innerHTML = '';
    // Placeholder bodies — real renderers land in Tasks 2–5
    const label =
      key === 'session' ? 'Session' :
      key === 'energy' ? 'Energy' :
      key === 'status' ? 'Status' :
      'Telemetry';
    content.innerHTML = `<div style="color:#6b7280;font-size:13px;padding:20px 0;">${label} — rendered in 4d-${key === 'session' ? '2' : key === 'energy' ? '3' : key === 'status' ? '4' : '5'}</div>`;
  };

  tabBar.querySelectorAll('button[data-tl-tab]').forEach((b) =>
    b.addEventListener('click', () => renderTab((b as HTMLButtonElement).dataset.tlTab!)),
  );

  document.body.appendChild(overlay);
  renderTab('session');

  overlay.querySelector('#tl-close-btn')!.addEventListener('click', () => {
    killCharts();
    document.body.removeChild(overlay);
  });
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      killCharts();
      document.body.removeChild(overlay);
    }
  });
}

// ── wireTimelineButtons ───────────────────────────────────────────────────────
// Delegated handler mirroring the existing view-chart-btn pattern
// in transactionSummary.ts. Reads data-txid and calls createSessionTimelineModal.

export function wireTimelineButtons(
  root: HTMLElement,
  transactions: Transaction[],
  messages: ParsedMessage[],
): void {
  root.addEventListener('click', (e) => {
    const btn = (e.target as HTMLElement).closest('.view-timeline-btn') as HTMLElement | null;
    if (!btn || !root.contains(btn)) return;
    const txId = Number(btn.getAttribute('data-txid'));
    if (!txId) return;
    createSessionTimelineModal(txId, transactions, messages);
  });
}
