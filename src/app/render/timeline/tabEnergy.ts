// Energy tab — faithful port of legacy _renderEnergyTab (HTML 7676–7739).
// Dual-axis line chart: SoC (%) left axis (0–100), Energy (kWh) right axis.
// Chart.js is lazy-loaded to keep it code-split and out of the jsdom test path.
// `buildEnergySeries` is pure and tested independently.

import { tlTime } from './timelineData';
import type { TimelineData } from './timelineData';
import type { TooltipItem } from 'chart.js';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface SocPoint    { x: number; y: number; ctx: string }
export interface EnergyPoint { x: number; y: number }

export interface EnergySeries {
  socPts:    SocPoint[];
  energyPts: EnergyPoint[];
}

// ── buildEnergySeries — PURE ──────────────────────────────────────────────────
// Port of the data-prep section in legacy _renderEnergyTab (HTML 7679–7691).
// Reads mv.soc / mv.energy from TimelineData; falls back to tx.socBegin/socEnd
// anchors when mv.soc is empty (legacy lines 7681–7685).
// Wh→kWh conversion mirrors legacy line 7690 exactly:
//   kWh if unit==='kWh'; divide by 1000 if unit==='Wh' OR raw value > 5000.

export function buildEnergySeries(data: TimelineData): EnergySeries {
  const { tx, mv } = data;

  // SoC dataset — use periodic samples; fallback to begin/end anchors
  let socPts: SocPoint[] = mv.soc.map((p) => ({ x: p.t, y: p.v, ctx: p.ctx }));
  if (socPts.length === 0 && tx.socBegin != null) {
    socPts = [
      {
        x: new Date(tx.startTime).getTime(),
        y: Number(tx.socBegin),
        ctx: 'Transaction.Begin',
      },
    ];
    if (tx.socEnd != null && tx.stopTime) {
      socPts.push({
        x: new Date(tx.stopTime).getTime(),
        y: Number(tx.socEnd),
        ctx: 'Transaction.End',
      });
    }
  }

  // Energy dataset — normalize to kWh (port of legacy line 7690)
  const energyPts: EnergyPoint[] = mv.energy.map((p) => ({
    x: p.t,
    y: p.unit === 'kWh' ? p.v : p.unit === 'Wh' || p.v > 5000 ? p.v / 1000 : p.v,
  }));

  return { socPts, energyPts };
}

// ── renderEnergyTab ───────────────────────────────────────────────────────────
// Port of legacy _renderEnergyTab (HTML 7676–7739).
// Lazy-loads Chart.js (code-split; never in jsdom test path).

export async function renderEnergyTab(
  container: HTMLElement,
  data: TimelineData,
  pushChart: (c: { destroy(): void }) => void,
): Promise<void> {
  const { socPts, energyPts } = buildEnergySeries(data);

  // No-data guard (legacy 7693–7696)
  if (socPts.length === 0 && energyPts.length === 0) {
    container.innerHTML =
      '<div style="display:flex;align-items:center;justify-content:center;height:320px;color:#6b7280;font-size:14px;">No MeterValues data available for this transaction.</div>';
    return;
  }

  // Canvas wrapper (legacy 7698–7702)
  const wrap = document.createElement('div');
  wrap.style.cssText = 'position:relative;height:380px;';
  const canvas = document.createElement('canvas');
  wrap.appendChild(canvas);
  container.appendChild(wrap);

  // Build datasets (legacy 7704–7716)
  const datasets: object[] = [];
  if (socPts.length > 0) {
    datasets.push({
      label: 'SoC (%)',
      data: socPts.map((p) => ({ x: p.x, y: p.y })),
      borderColor: '#22c55e',
      backgroundColor: '#22c55e18',
      yAxisID: 'ySoC',
      fill: true,
      tension: 0.3,
      pointRadius: 4,
      pointHoverRadius: 7,
      pointBackgroundColor: socPts.map((p) =>
        p.ctx && p.ctx.includes('Begin')
          ? '#86efac'
          : p.ctx && p.ctx.includes('End')
            ? '#16a34a'
            : '#22c55e',
      ),
    });
  }
  if (energyPts.length > 0) {
    datasets.push({
      label: 'Energy (kWh)',
      data: energyPts,
      borderColor: '#34d399',
      backgroundColor: 'transparent',
      yAxisID: 'yEnergy',
      fill: false,
      tension: 0.3,
      pointRadius: 3,
      borderDash: [5, 3],
    });
  }

  // Lazy-load Chart.js and instantiate (legacy 7718–7738)
  const { Chart } = await import('chart.js/auto');
  const chart = new Chart(canvas, {
    type: 'line',
    data: { datasets: datasets as ConstructorParameters<typeof Chart>[1]['data']['datasets'] },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { labels: { color: '#9ca3af', font: { size: 12 } } },
        tooltip: {
          backgroundColor: '#1f2937',
          titleColor: '#e5e7eb',
          bodyColor: '#d1d5db',
          borderColor: '#374151',
          borderWidth: 1,
          callbacks: {
            title: (items: TooltipItem<'line'>[]) => tlTime(Number(items[0]?.parsed.x), false),
            label: (item: TooltipItem<'line'>) =>
              `${item.dataset.label}: ${Number(item.parsed.y).toFixed(2)}`,
          },
        },
      },
      scales: {
        x: {
          type: 'linear',
          ticks: {
            color: '#6b7280',
            maxTicksLimit: 8,
            callback: (v: number | string) => tlTime(Number(v), true),
          },
          grid: { color: '#1f2937' },
        },
        ySoC: {
          type: 'linear',
          position: 'left',
          min: 0,
          max: 100,
          ticks: {
            color: '#22c55e',
            callback: (v: number | string) => v + '%',
          },
          grid: { color: '#374151' },
          title: { display: true, text: 'SoC (%)', color: '#22c55e', font: { size: 11 } },
        },
        yEnergy: {
          type: 'linear',
          position: 'right',
          ticks: {
            color: '#34d399',
            callback: (v: number | string) => Number(v).toFixed(1) + ' kWh',
          },
          grid: { display: false },
          title: { display: true, text: 'Energy (kWh)', color: '#34d399', font: { size: 11 } },
        },
      },
    },
  });

  // Register chart in lifecycle so tab-switching can destroy it (legacy 7738)
  pushChart(chart);
}
