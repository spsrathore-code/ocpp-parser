// Telemetry tab — faithful port of legacy _renderTelemetryTab (HTML 7793–7863).
// Power (kW) chart and Temperature (°C) chart with per-curve threshold-breach
// point colouring: Inlet 60 °C / Outlet 65 °C / Body 60 °C.
// Chart.js is lazy-loaded (code-split; never instantiated in jsdom test path).

import { tlTime } from './timelineData';
import type { TimelineData } from './timelineData';
import type { TooltipItem } from 'chart.js';

// ── renderTelemetryTab ────────────────────────────────────────────────────────
// Port of legacy _renderTelemetryTab (HTML 7793–7863).
// Lazy-loads Chart.js and registers each chart via pushChart for lifecycle
// management (destroy on tab-switch).

export async function renderTelemetryTab(
  container: HTMLElement,
  data: TimelineData,
  pushChart: (c: { destroy(): void }) => void,
): Promise<void> {
  const { mv } = data;
  const hasPower = mv.power.length > 0;
  const hasTemp =
    mv.tempInlet.length > 0 || mv.tempOutlet.length > 0 || mv.tempBody.length > 0;

  // Empty-state guard (legacy 7798–7801, FR-230)
  if (!hasPower && !hasTemp) {
    container.innerHTML =
      '<div style="display:flex;align-items:center;justify-content:center;height:300px;color:#6b7280;font-size:14px;">Insufficient telemetry data for this transaction.</div>';
    return;
  }

  // ── Shared chart options factory (legacy 7803–7813) ──────────────────────
  // Typed via static TooltipItem import — avoids deep-partial ConstructorParameters
  // pitfall documented in task-5-brief.md.
  const chartOpts = (
    yLabel: string,
    yColor: string,
  ): object => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { labels: { color: '#9ca3af', font: { size: 11 } } },
      tooltip: {
        backgroundColor: '#1f2937',
        titleColor: '#e5e7eb',
        bodyColor: '#d1d5db',
        borderColor: '#374151',
        borderWidth: 1,
        callbacks: {
          title: (items: TooltipItem<'line'>[]) => tlTime(Number(items[0]?.parsed.x), false),
        },
      },
    },
    scales: {
      x: {
        type: 'linear',
        ticks: {
          color: '#6b7280',
          maxTicksLimit: 6,
          callback: (v: number | string) => tlTime(Number(v), true),
        },
        grid: { color: '#1f2937' },
      },
      y: {
        ticks: {
          color: yColor,
          callback: (v: number | string) => v + ' ' + yLabel,
        },
        grid: { color: '#374151' },
        title: { display: true, text: yLabel, color: yColor, font: { size: 10 } },
      },
    },
  });

  // ── DOM helpers (legacy 7815–7825) ───────────────────────────────────────
  const addLabel = (text: string): void => {
    const d = document.createElement('div');
    d.style.cssText = 'color:#9ca3af;font-size:11px;margin-bottom:4px;font-weight:500;';
    d.textContent = text;
    container.appendChild(d);
  };

  const addCanvas = (h: number): HTMLCanvasElement => {
    const w = document.createElement('div');
    w.style.cssText = `position:relative;height:${h}px;margin-bottom:4px;`;
    const c = document.createElement('canvas');
    w.appendChild(c);
    container.appendChild(w);
    return c;
  };

  // Lazy-load Chart.js (code-split; not imported at module level)
  const { Chart } = await import('chart.js/auto');

  // ── Power chart (legacy 7827–7835) ──────────────────────────────────────
  if (hasPower) {
    addLabel('Power (kW)');
    const c = addCanvas(175);
    pushChart(
      new Chart(c, {
        type: 'line',
        data: {
          datasets: [
            {
              label: 'Power (kW)',
              data: mv.power.map((p) => ({ x: p.t, y: p.v })),
              borderColor: '#22c55e',
              backgroundColor: '#22c55e18',
              fill: true,
              tension: 0.3,
              pointRadius: 3,
            },
          ],
        },
        options: chartOpts('kW', '#22c55e') as ConstructorParameters<typeof Chart>[1]['options'],
      }),
    );
  }

  // ── Divider between charts (legacy 7837–7840) ───────────────────────────
  if (hasPower && hasTemp) {
    const div = document.createElement('div');
    div.setAttribute('data-tl-divider', '');
    div.style.cssText = 'height:1px;background:#374151;margin:8px 0;';
    container.appendChild(div);
  }

  // ── Temperature chart (legacy 7842–7862) ─────────────────────────────────
  if (hasTemp) {
    const thresholds: Record<string, number> = { tempInlet: 60, tempOutlet: 65, tempBody: 60 };
    const colors: Record<string, string> = {
      tempInlet: '#fb923c',
      tempOutlet: '#f87171',
      tempBody: '#fbbf24',
    };
    const labels: Record<string, string> = {
      tempInlet: 'Inlet (°C)',
      tempOutlet: 'Outlet (°C)',
      tempBody: 'Body (°C)',
    };

    const datasets: object[] = [];
    (['tempInlet', 'tempOutlet', 'tempBody'] as const).forEach((key) => {
      const pts = mv[key];
      if (!pts.length) return;
      const thr = thresholds[key];
      const col = colors[key];
      datasets.push({
        label: labels[key],
        data: pts.map((p) => ({ x: p.t, y: p.v })),
        borderColor: col,
        backgroundColor: 'transparent',
        fill: false,
        tension: 0.3,
        pointRadius: pts.map((p) => (p.v > thr ? 6 : 3)),
        pointBackgroundColor: pts.map((p) => (p.v > thr ? '#ef4444' : col)),
        pointBorderColor: pts.map((p) => (p.v > thr ? '#ef4444' : col)),
      });
    });

    addLabel('Temperature (°C)');
    const c2 = addCanvas(175);
    pushChart(
      new Chart(c2, {
        type: 'line',
        data: { datasets: datasets as ConstructorParameters<typeof Chart>[1]['data']['datasets'] },
        options: chartOpts('°C', '#fb923c') as ConstructorParameters<typeof Chart>[1]['options'],
      }),
    );
  }
}
