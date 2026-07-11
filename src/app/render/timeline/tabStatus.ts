// Status tab renderer — faithful port of legacy _renderStatusTab (HTML 7741–7791).
// Pure HTML/CSS swimlanes; no Chart.js; dark inline styles throughout (parity).
// One swimlane per connector: colour-coded status blocks (width ∝ duration),
// vertical marker lines across all lanes, hover tips, and a status-colour legend.
// Empty-state: "No StatusNotification data in this window."

import type { TimelineData } from './timelineData';
import { tlTime } from './timelineData';

// ── Status colour map — exact copy from legacy HTML 7746–7750 ─────────────────

const statusColors: Record<string, string> = {
  Available:     '#374151',
  Preparing:     '#2563eb',
  Charging:      '#16a34a',
  SuspendedEV:   '#d97706',
  SuspendedEVSE: '#b45309',
  Finishing:     '#0d9488',
  Faulted:       '#dc2626',
  Unavailable:   '#4b5563',
};

// ── renderStatusTab ───────────────────────────────────────────────────────────

export function renderStatusTab(container: HTMLElement, data: TimelineData): void {
  const { winStart, winEnd, swimlanes, markers } = data;
  const span = winEnd - winStart || 1;
  const pct = (t: number): string =>
    Math.max(0, Math.min(100, ((t - winStart) / span) * 100)).toFixed(2);

  // ── Empty state (legacy 7752–7755) ──────────────────────────────────────────
  if (swimlanes.length === 0) {
    container.innerHTML =
      '<div style="display:flex;align-items:center;justify-content:center;height:200px;color:#6b7280;">No StatusNotification data in this window.</div>';
    return;
  }

  // ── Marker lines — shared across all lanes (legacy 7757–7759) ────────────────
  const mLines = markers
    .map(
      (m) =>
        `<div style="position:absolute;left:${pct(m.t)}%;top:0;bottom:0;width:1px;background:${m.color};opacity:0.5;z-index:1;" title="${m.label}"></div>`,
    )
    .join('');

  // ── Swimlane rows (legacy 7761–7778) ────────────────────────────────────────
  let html = '<div style="padding:4px 0;">';

  swimlanes.forEach((lane) => {
    let blocks = '';
    lane.events.forEach((ev, idx) => {
      const nextT  = idx < lane.events.length - 1 ? lane.events[idx + 1].t : winEnd;
      const left   = pct(ev.t);
      const width  = Math.max(0.3, parseFloat(pct(nextT)) - parseFloat(pct(ev.t))).toFixed(2);
      const bg     = statusColors[ev.status] ?? '#374151';
      const tip    = `${ev.status}${ev.info ? ' · ' + ev.info : ''}\n${tlTime(ev.t, false)}`;
      blocks +=
        `<div title="${tip}" style="position:absolute;left:${left}%;width:${width}%;height:100%;background:${bg};border-right:1px solid #111827;box-sizing:border-box;overflow:hidden;">` +
        `<span style="font-size:9px;color:#fff;padding:0 4px;line-height:28px;white-space:nowrap;display:inline-block;opacity:0.9;">${parseFloat(width) > 8 ? ev.status : ''}</span>` +
        `</div>`;
    });

    html +=
      `<div style="display:flex;align-items:center;margin-bottom:8px;">` +
      `<div style="width:86px;flex-shrink:0;color:#9ca3af;font-size:11px;padding-right:10px;text-align:right;">C${lane.connectorId}</div>` +
      `<div style="flex:1;position:relative;height:28px;background:#1f2937;border-radius:4px;overflow:hidden;">${mLines}${blocks}</div>` +
      `</div>`;
  });

  // ── Window start/end footer (legacy 7780–7783) ────────────────────────────
  html +=
    `<div style="display:flex;justify-content:space-between;margin-left:86px;margin-top:6px;">` +
    `<span style="color:#4b5563;font-size:10px;">${tlTime(winStart, false)}</span>` +
    `<span style="color:#4b5563;font-size:10px;">${tlTime(winEnd, false)}</span>` +
    `</div>`;

  // ── Status-colour legend (legacy 7785–7789) ──────────────────────────────────
  html += '<div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:14px;margin-left:86px;">';
  Object.entries(statusColors).forEach(([s, c]) => {
    html +=
      `<div style="display:flex;align-items:center;gap:4px;">` +
      `<div style="width:12px;height:12px;border-radius:2px;background:${c};"></div>` +
      `<span style="color:#9ca3af;font-size:11px;">${s}</span>` +
      `</div>`;
  });
  html += '</div></div>';

  container.innerHTML = html;
}
