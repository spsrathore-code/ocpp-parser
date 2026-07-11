// Session tab renderer — faithful port of legacy _renderSessionTab
// (archive/parser-v2026.05.14/OCPP_Parser_Complete_2026.05.14.html lines 7519–7674).
//
// Field guards applied vs. the legacy source (legacy used loose null checks):
//   - tx.duration / tx.totalEnergy are `number | 'N/A'` → typeof guard before .toFixed()
//   - tx.socBegin / tx.socEnd are `string | undefined` → display x && x !== 'N/A' ? x + '%' : '—'
//   - Zero-Energy anomaly: typeof tx.totalEnergy === 'number' guard before arithmetic
// Inline dark-theme styles are preserved faithfully (the modal is not light/dark toggled).

import type { TimelineData } from './timelineData';
import { tlTime } from './timelineData';

// ── renderSessionTab ──────────────────────────────────────────────────────────

export function renderSessionTab(container: HTMLElement, data: TimelineData): void {
  const { tx, winStart, winEnd, txStart, txStop, markers } = data;
  const span = winEnd - winStart || 1;
  const pct  = (t: number): number => Math.max(0, Math.min(100, (t - winStart) / span * 100));
  const pctFmt = (t: number): string => pct(t).toFixed(2);

  // ── Anomaly detection (FR-217) ────────────────────────────────────────────
  const anomalies: [string, string][] = [];
  if (markers.find((m) => m.label.includes('E-Stop')))  anomalies.push(['Emergency Stop', '#f97316']);
  if (markers.find((m) => m.label.includes('Reboot')))  anomalies.push(['Mid-Session Reboot', '#a855f7']);
  // Guard: totalEnergy must be a number before arithmetic (not 'N/A')
  if (typeof tx.totalEnergy === 'number' && tx.totalEnergy * 1000 < 500 && txStop)
    anomalies.push(['Zero Energy', '#eab308']);

  const badgesHtml = anomalies
    .map(
      ([t, c]) =>
        `<span style="background:${c};color:#fff;font-size:11px;padding:3px 10px;border-radius:10px;">${t}</span>`,
    )
    .join('');

  // ── Duration display guard ────────────────────────────────────────────────
  const durationDisplay =
    typeof tx.duration === 'number' ? tx.duration.toFixed(1) + ' min' : '—';

  // ── Energy display guard ──────────────────────────────────────────────────
  const energyDisplay =
    typeof tx.totalEnergy === 'number' ? tx.totalEnergy.toFixed(2) + ' kWh' : '—';

  // ── SoC display guards (string | undefined, sentinel 'N/A') ──────────────
  const socBeginDisplay =
    tx.socBegin && tx.socBegin !== 'N/A' ? tx.socBegin + '%' : '—';
  const socEndDisplay =
    tx.socEnd && tx.socEnd !== 'N/A' ? tx.socEnd + '%' : '—';

  // ── Metadata card (FR-216) ────────────────────────────────────────────────
  let html = `<div style="background:#1f2937;border-radius:8px;padding:14px 18px;margin-bottom:20px;">
    <div style="display:flex;flex-wrap:wrap;gap:18px;align-items:center;">
        <div><div style="color:#6b7280;font-size:10px;text-transform:uppercase;letter-spacing:.05em;">TX ID</div><div style="color:#e5e7eb;font-weight:600;font-size:14px;">${tx.id}</div></div>
        <div><div style="color:#6b7280;font-size:10px;text-transform:uppercase;letter-spacing:.05em;">Connector</div><div style="color:#e5e7eb;font-weight:600;font-size:14px;">${tx.connectorId ?? '—'}</div></div>
        <div><div style="color:#6b7280;font-size:10px;text-transform:uppercase;letter-spacing:.05em;">ID Tag</div><div style="color:#e5e7eb;font-weight:600;font-size:14px;">${tx.idTag || '—'}</div></div>
        <div><div style="color:#6b7280;font-size:10px;text-transform:uppercase;letter-spacing:.05em;">Duration</div><div style="color:#e5e7eb;font-weight:600;font-size:14px;">${durationDisplay}</div></div>
        <div><div style="color:#6b7280;font-size:10px;text-transform:uppercase;letter-spacing:.05em;">Energy</div><div style="color:#e5e7eb;font-weight:600;font-size:14px;">${energyDisplay}</div></div>
        <div><div style="color:#6b7280;font-size:10px;text-transform:uppercase;letter-spacing:.05em;">SoC</div><div style="color:#e5e7eb;font-weight:600;font-size:14px;">${socBeginDisplay} → ${socEndDisplay}</div></div>
        <div><div style="color:#6b7280;font-size:10px;text-transform:uppercase;letter-spacing:.05em;">Stop Reason</div><div style="color:#e5e7eb;font-weight:600;font-size:14px;">${tx.stopReason || '—'}</div></div>
        ${badgesHtml}
    </div>
</div>`;

  // ── Helpers ───────────────────────────────────────────────────────────────
  const fmtGap = (ms: number): string | null => {
    if (ms <= 0) return null;
    if (ms < 60_000)   return `+${Math.round(ms / 1000)}s`;
    if (ms < 3_600_000) return `+${(ms / 60_000).toFixed(1)} min`;
    return `+${(ms / 3_600_000).toFixed(1)}h`;
  };

  // Color of the gap AFTER each marker — reflects the state just entered
  const stateColorAfter = (label: string): string => {
    if (label.includes('Charging'))       return '#22c55e55';
    if (label.includes('StartTrans'))     return '#22c55e2a';
    if (label.includes('Authorization'))  return '#22d3ee1a';
    if (label.includes('Preparing'))      return '#60a5fa1a';
    if (label.includes('E-Stop'))         return '#f973162a';
    if (label.includes('Stop'))           return '#ef44441a';
    if (label.includes('Finishing'))      return '#2dd4bf1a';
    if (label.includes('Reboot'))         return '#a855f71a';
    return '#37415133';
  };

  const extractIcon = (lbl: string): string => lbl.split(' ')[0];
  const flexRatio   = (from: number, to: number): string =>
    (Math.max(0, to - from) / span * 1000).toFixed(1);
  const N = markers.length;

  // ── Segmented timeline bar ────────────────────────────────────────────────
  // Gap segments are proportional to actual time; event blocks are fixed 26 px.
  // The charging gap (between Charging and Stop events) shows a duration label.
  let barSegs = '';
  let prevT = winStart;

  markers.forEach((m, i) => {
    const gapDur = m.t - prevT;
    if (gapDur > 0) {
      const gapColor = i === 0 ? '#37415133' : stateColorAfter(markers[i - 1].label);
      // Charging duration label — shown inside the gap before Stop if previous was Charging
      const isChargeGap =
        i > 0 &&
        (markers[i - 1].label.includes('Charging') || markers[i - 1].label.includes('StartTrans')) &&
        (m.label.includes('Stop') || m.label.includes('E-Stop'));
      const chargeDurStr = isChargeGap ? fmtGap(m.t - markers[i - 1].t) : null;
      barSegs += `<div style="flex:${flexRatio(prevT, m.t)};min-width:2px;background:${gapColor};height:100%;display:flex;align-items:center;justify-content:center;overflow:hidden;">
          ${chargeDurStr ? `<span style="color:#22c55e;font-size:10px;font-weight:600;white-space:nowrap;pointer-events:none;">⚡ ${chargeDurStr}</span>` : ''}
      </div>`;
    }
    const tipText = m.tip
      ? `${i + 1}. ${m.label}\n${tlTime(m.t, false)}\n${m.tip}`
      : `${i + 1}. ${m.label}\n${tlTime(m.t, false)}`;
    barSegs += `<div title="${tipText}"
                     style="flex:0 0 26px;height:100%;background:${m.color};display:flex;align-items:center;justify-content:center;font-size:13px;cursor:default;border-left:1px solid #0d111788;border-right:1px solid #0d111788;box-shadow:0 0 8px ${m.color}66;z-index:1;">${extractIcon(m.label)}</div>`;
    prevT = m.t;
  });

  if (prevT < winEnd) {
    const lastColor = N > 0 ? stateColorAfter(markers[N - 1].label) : '#37415133';
    barSegs += `<div style="flex:${flexRatio(prevT, winEnd)};min-width:2px;background:${lastColor};height:100%;"></div>`;
  }

  // ── Connector lines ───────────────────────────────────────────────────────
  // Each connector is a 1 px gradient line dropping from the event icon block
  // toward the stage card below. The X position uses a closed-form calc()
  // derived from the flex layout: center(event i) = pct(t)% + (i×26+13 − pct/100×N×26)px
  const connLines = markers
    .map((m, i) => {
      const p = pct(m.t);
      const adj = (i * 26 + 13 - (p / 100) * N * 26).toFixed(1);
      return `<div style="position:absolute;left:calc(${pct(m.t).toFixed(3)}% + ${adj}px);top:0;width:1px;height:100%;background:linear-gradient(to bottom,${m.color}cc,${m.color}22);transform:translateX(-0.5px);pointer-events:none;"></div>`;
    })
    .join('');

  html += `<div style="padding:10px 24px 0;">
    <div style="display:flex;height:28px;background:#374151;border-radius:8px;overflow:hidden;">${barSegs}</div>
    <div style="position:relative;height:32px;overflow:visible;">${connLines}</div>
    <div style="display:flex;justify-content:space-between;margin-top:2px;">
        <span style="color:#4b5563;font-size:10px;">${tlTime(winStart, false)}</span>
        <span style="color:#4b5563;font-size:10px;">${tlTime(winEnd, false)}</span>
    </div>
</div>`;

  // ── Stage chips ───────────────────────────────────────────────────────────
  const chipsHtml = markers
    .map((m, i) => {
      const nextGap = i < N - 1 ? fmtGap(markers[i + 1].t - m.t) : null;
      return `<div style="display:flex;flex-direction:column;gap:4px;background:#1f2937;border:1px solid #374151;border-top:2px solid ${m.color}99;border-left:3px solid ${m.color};border-radius:6px;padding:9px 12px;min-width:152px;flex:1 1 152px;max-width:220px;">
        <div style="display:flex;align-items:center;gap:6px;">
            <span style="color:#4b5563;font-size:10px;font-weight:600;background:#111827;border-radius:3px;padding:1px 5px;">${i + 1}</span>
            <span style="color:${m.color};font-size:12px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${m.label}</span>
        </div>
        <div style="color:#6b7280;font-size:10px;font-family:monospace;">
            ${tlTime(m.t, false)}
        </div>
        ${nextGap ? `<div style="color:#4b5563;font-size:10px;margin-top:2px;">⏱ ${nextGap} to next</div>` : ''}
    </div>`;
    })
    .join('');

  html += `<div style="margin-top:6px;">
    <div style="color:#4b5563;font-size:10px;text-transform:uppercase;letter-spacing:.06em;margin-bottom:8px;padding:0 4px;">
        Lifecycle Stages
    </div>
    <div style="display:flex;flex-wrap:wrap;gap:8px;">
        ${chipsHtml}
    </div>
</div>`;

  container.innerHTML = html;
}
