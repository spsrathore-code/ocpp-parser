// Meter Values "Transaction Analysis Graphs" — faithful port of HTML 8761-9444 +
// the enlarge/download helpers (9447-9700). Six line charts over a transaction's
// pivoted rows, dark theme, with hover tooltips (interaction mode 'nearest',
// intersect:false), hidden points that light up on hover (pointHitRadius), dashed
// "Present" series, per-unit tooltip callbacks, and per-graph 🔍 Enlarge + 📥 PNG
// download. `extractGraphData` is pure (unit-tested); rendering lazy-loads Chart.js.

import { el } from '../dom';

type Row = Record<string, string>;

export interface GraphData {
  timestamps: string[];
  currentEV: number[]; currentOutlet: number[];
  voltageEV: number[]; voltageOutlet: number[];
  powerOutlet: number[]; socEV: number[];
  tempBody: number[]; tempInlet: number[]; tempOutlet: number[]; tempOutlet2: number[];
}

const num = (r: Row, k: string): number => parseFloat(r[k]) || 0;

/** Shape a transaction's pivoted rows into the per-series arrays the six graphs plot (HTML 8732). */
export function extractGraphData(rows: Row[], txId: string | number): GraphData {
  const sorted = rows
    .filter((r) => r['Transaction ID'] === String(txId))
    .sort((a, b) => new Date(a['UTC Time Stamp']).getTime() - new Date(b['UTC Time Stamp']).getTime());
  return {
    timestamps: sorted.map((r) => new Date(r['UTC Time Stamp']).toLocaleTimeString()),
    currentOutlet: sorted.map((r) => num(r, 'Current.Import/A/Outlet')),
    currentEV: sorted.map((r) => num(r, 'Current.Import/A/EV')),
    voltageOutlet: sorted.map((r) => num(r, 'Voltage/V/Outlet')),
    voltageEV: sorted.map((r) => num(r, 'Voltage/V/EV')),
    powerOutlet: sorted.map((r) => num(r, 'Power.Active.Import/W/Outlet')),
    socEV: sorted.map((r) => num(r, 'SoC/Percent/EV')),
    tempBody: sorted.map((r) => num(r, 'Temperature/Celsius/Body')),
    tempInlet: sorted.map((r) => num(r, 'Temperature/Celsius/Inlet')),
    tempOutlet: sorted.map((r) => num(r, 'Temperature/Celsius/Outlet')),
    tempOutlet2: sorted.map((r) => num(r, 'Temperature/Celsius/Outlet#2')),
  };
}

// ── Chart config builders (faithful to the legacy per-graph configs) ──

const WHITE = '#FFFFFF';
const GRID = '#333333';
type Dict = Record<string, unknown>;
interface TipItem { dataset: { label?: string }; parsed: { y: number }; label: string }

interface DsOpts { dash?: boolean; yAxisID?: string }
function ds(label: string, data: number[], color: string, opts: DsOpts = {}): Dict {
  return {
    label, data, borderColor: color, backgroundColor: 'transparent',
    borderWidth: opts.dash ? 3 : 2, ...(opts.dash ? { borderDash: [5, 5] } : {}),
    tension: 0, pointRadius: 0, pointHoverRadius: 8, pointHitRadius: 15,
    pointHoverBackgroundColor: color, pointHoverBorderColor: WHITE, pointHoverBorderWidth: 2,
    ...(opts.yAxisID ? { yAxisID: opts.yAxisID } : {}),
  };
}
const yAxis = (title: string): Dict => ({ title: { display: true, text: title, color: WHITE, font: { size: 12 } }, grid: { color: GRID, lineWidth: 1 }, ticks: { color: WHITE, font: { size: 10 } }, border: { color: WHITE } });
const xAxis = (title?: string): Dict => ({ ...(title ? { title: { display: true, text: title, color: WHITE, font: { size: 12 } } } : {}), grid: { color: GRID, lineWidth: 1 }, ticks: { color: WHITE, font: { size: 9 }, maxRotation: 45, minRotation: 45 }, border: { color: WHITE } });

function options(scales: Dict, label: (c: TipItem) => string, title?: (c: TipItem[]) => string): Dict {
  return {
    responsive: true, maintainAspectRatio: true, backgroundColor: '#000000',
    interaction: { mode: 'nearest', intersect: false, axis: 'x' },
    scales,
    plugins: {
      legend: { labels: { color: WHITE, font: { size: 11 }, usePointStyle: true, boxWidth: 40 } },
      tooltip: { enabled: true, backgroundColor: 'rgba(0, 0, 0, 0.9)', titleColor: WHITE, bodyColor: WHITE, borderColor: WHITE, borderWidth: 2, padding: 12, displayColors: true, callbacks: { ...(title ? { title } : {}), label } },
    },
  };
}

interface GraphDef { id: string; title: string; config: Dict }

function graphConfigs(txId: string | number, g: GraphData): GraphDef[] {
  return [
    { id: `current-chart-${txId}`, title: 'Current Profile', config: {
      type: 'line',
      data: { labels: g.timestamps, datasets: [ds('Target Current (A)', g.currentEV, '#FF8C00'), ds('Present Current (A)', g.currentOutlet, '#FFD700', { dash: true })] },
      options: options({ y: yAxis('Current (A)'), x: xAxis() }, (c) => `${c.dataset.label}: ${c.parsed.y.toFixed(2)} A`),
    } },
    { id: `voltage-chart-${txId}`, title: 'Voltage Profile', config: {
      type: 'line',
      data: { labels: g.timestamps, datasets: [ds('Target Voltage (V)', g.voltageEV, '#FF8C00'), ds('Present Voltage (V)', g.voltageOutlet, '#FFD700', { dash: true })] },
      options: options({ y: yAxis('Voltage (V)'), x: xAxis() }, (c) => `${c.dataset.label}: ${c.parsed.y.toFixed(2)} V`),
    } },
    { id: `power-soc-chart-${txId}`, title: 'Power vs SoC Curve', config: {
      type: 'line',
      data: { labels: g.socEV, datasets: [ds('Power vs SoC', g.powerOutlet, '#00FF00')] },
      options: options({ x: xAxis('SoC (%)'), y: yAxis('Power (W)') }, (c) => `Power: ${c.parsed.y.toFixed(2)} W`, (c) => `SoC: ${c[0].label}%`),
    } },
    { id: `soc-timeline-chart-${txId}`, title: 'SoC Over Time Curve', config: {
      type: 'line',
      data: { labels: g.timestamps, datasets: [ds('SoC (%)', g.socEV, '#00BFFF')] },
      options: options({ y: yAxis('SoC (%)'), x: xAxis() }, (c) => `SoC: ${c.parsed.y.toFixed(2)}%`),
    } },
    { id: `temperature-chart-${txId}`, title: 'Temperature Analysis Curve', config: {
      type: 'line',
      data: { labels: g.timestamps, datasets: [ds('Body (°C)', g.tempBody, '#FF6B6B'), ds('Inlet (°C)', g.tempInlet, '#4ECDC4'), ds('Outlet (°C)', g.tempOutlet, '#95E1D3'), ds('Outlet#2 (°C)', g.tempOutlet2, '#F38181')] },
      options: options({ y: yAxis('Temperature (°C)'), x: xAxis() }, (c) => `${c.dataset.label}: ${c.parsed.y.toFixed(2)}°C`),
    } },
    { id: `power-current-voltage-chart-${txId}`, title: 'Power, Current & Voltage Over Time', config: {
      type: 'line',
      data: { labels: g.timestamps, datasets: [
        ds('Power (W)', g.powerOutlet, '#00FF00', { yAxisID: 'y-left' }),
        ds('Current (A)', g.currentOutlet, '#FF8C00', { yAxisID: 'y-right' }),
        ds('Voltage (V)', g.voltageOutlet, '#00BFFF', { yAxisID: 'y-left' }),
      ] },
      options: options({
        'y-left': { type: 'linear', position: 'left', title: { display: true, text: 'Power (W) / Voltage (V)', color: WHITE, font: { size: 12 } }, grid: { color: GRID, lineWidth: 1 }, ticks: { color: WHITE, font: { size: 10 } }, border: { color: WHITE } },
        'y-right': { type: 'linear', position: 'right', title: { display: true, text: 'Current (A)', color: '#FF8C00', font: { size: 12 } }, grid: { display: false }, ticks: { color: '#FF8C00', font: { size: 10 } }, border: { color: '#FF8C00' } },
        x: xAxis(),
      }, (c) => { const v = c.parsed.y.toFixed(2); const l = c.dataset.label ?? ''; return l.includes('Power') ? `${l}: ${v} W` : l.includes('Current') ? `${l}: ${v} A` : `${l}: ${v} V`; }),
    } },
  ];
}

// ── PNG download + enlarge ──

function pngTimestamp(): string {
  const d = new Date(Date.now() + 5.5 * 60 * 60 * 1000);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const h = d.getUTCHours();
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${String(d.getUTCDate()).padStart(2, '0')}_${months[d.getUTCMonth()]}_${d.getUTCFullYear()}_${String(h12).padStart(2, '0')}_${String(d.getUTCMinutes()).padStart(2, '0')}_${ampm}`;
}

/** Compose a black-header PNG (title + tx id) above the chart canvas and download it (HTML 9479). */
function downloadChartPng(sourceCanvas: HTMLCanvasElement, title: string, txId: string | number): void {
  const headerHeight = 80;
  const temp = document.createElement('canvas');
  temp.width = sourceCanvas.width;
  temp.height = sourceCanvas.height + headerHeight;
  const ctx = temp.getContext('2d');
  if (!ctx) return;
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, temp.width, temp.height);
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 24px Arial';
  ctx.textAlign = 'left';
  ctx.fillText(title, 20, 35);
  ctx.fillStyle = '#999999';
  ctx.font = '16px Arial';
  ctx.textAlign = 'right';
  ctx.fillText(`Transaction ID: ${txId}`, temp.width - 20, 35);
  ctx.strokeStyle = '#333333';
  ctx.beginPath();
  ctx.moveTo(20, headerHeight - 20);
  ctx.lineTo(temp.width - 20, headerHeight - 20);
  ctx.stroke();
  ctx.drawImage(sourceCanvas, 0, headerHeight);
  temp.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title.replace(/[ /]/g, '_')}_TX_${txId}_${pngTimestamp()}.png`;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 'image/png', 1.0);
}

interface ChartInstance { destroy(): void; canvas: HTMLCanvasElement }
interface ChartCtor { new (canvas: HTMLCanvasElement, cfg: unknown): ChartInstance }
interface ContainerWithCharts extends HTMLElement { _charts?: ChartInstance[] }

/** Enlarged-chart modal (HTML 9536): re-renders the same config full-size with a Download PNG. */
function openEnlargeModal(Chart: ChartCtor, def: GraphDef, txId: string | number): void {
  document.getElementById('graph-enlarge-modal')?.remove();
  const enlargedCanvas = el('canvas', { attrs: { id: 'enlarged-chart' } }) as HTMLCanvasElement;
  const dlBtn = el('button', { className: 'bg-green-500 hover:bg-green-600 text-white py-2 px-4 rounded', text: '📥 Download PNG' });
  const closeBtn = el('button', { className: 'bg-gray-500 hover:bg-gray-600 text-white py-2 px-4 rounded', text: '✕ Close' });
  const modal = el('div', { className: 'fixed inset-0 bg-black bg-opacity-95 flex items-center justify-center z-50', attrs: { id: 'graph-enlarge-modal' } }, [
    el('div', { className: 'w-[95vw] h-[90vh] bg-gray-900 rounded-lg p-6 flex flex-col' }, [
      el('div', { className: 'flex justify-between items-center mb-4' }, [
        el('div', {}, [el('h3', { className: 'text-xl font-semibold text-white', text: def.title }), el('span', { className: 'text-sm text-gray-400', text: `Transaction ID: ${txId}` })]),
        el('div', { className: 'flex gap-2' }, [dlBtn, closeBtn]),
      ]),
      el('div', { className: 'flex-1 bg-black rounded p-4 flex items-center justify-center' }, [
        el('div', { attrs: { style: 'width:100%;height:100%;position:relative;' } }, [enlargedCanvas]),
      ]),
    ]),
  ]);
  // Clone config + allow full-height (maintainAspectRatio:false).
  const cfg = JSON.parse(JSON.stringify(def.config)) as Dict;
  (cfg.options as Dict).maintainAspectRatio = false;
  // JSON-clone dropped the tooltip callbacks (functions) — restore them from the live config.
  ((cfg.options as Dict).plugins as Dict).tooltip = ((def.config.options as Dict).plugins as Dict).tooltip;
  const close = (): void => { chart.destroy(); modal.remove(); };
  closeBtn.addEventListener('click', close);
  modal.addEventListener('click', (e) => { if (e.target === modal) close(); });
  document.body.appendChild(modal);
  const chart = new Chart(enlargedCanvas, cfg);
  dlBtn.addEventListener('click', () => downloadChartPng(enlargedCanvas, def.title, txId));
}

/** Render (or re-render) the six analysis graphs for `txId` into `container`. Lazy-loads Chart.js. */
export async function renderTransactionGraphs(container: HTMLElement, rows: Row[], txId: string | number): Promise<void> {
  const c = container as ContainerWithCharts;
  c._charts?.forEach((ch) => ch.destroy());
  c._charts = [];
  container.replaceChildren();

  const defs = graphConfigs(txId, extractGraphData(rows, txId));
  const { Chart } = (await import('chart.js/auto')) as unknown as { Chart: ChartCtor };

  for (const def of defs) {
    const canvas = el('canvas', { attrs: { id: def.id } }) as HTMLCanvasElement;
    const enlargeBtn = el('button', { className: 'bg-purple-500 hover:bg-purple-600 text-white py-1 px-2 rounded text-xs', text: '🔍 Enlarge' });
    const downloadBtn = el('button', { className: 'bg-green-500 hover:bg-green-600 text-white py-1 px-2 rounded text-xs', text: '📥 Download' });
    container.appendChild(el('div', { className: 'p-4 rounded-lg', attrs: { style: 'background-color:#000000;' } }, [
      el('div', { className: 'flex justify-between items-center mb-2' }, [
        el('h4', { className: 'text-md font-semibold text-white', text: def.title }),
        el('span', { className: 'text-xs text-gray-400', text: `Transaction ID: ${txId}` }),
      ]),
      el('div', { className: 'flex justify-end gap-2 mb-2' }, [enlargeBtn, downloadBtn]),
      el('div', { attrs: { style: 'position:relative;height:300px;background-color:#000000;' } }, [canvas]),
    ]));
    const chart = new Chart(canvas, def.config);
    c._charts.push(chart);
    enlargeBtn.addEventListener('click', () => openEnlargeModal(Chart, def, txId));
    downloadBtn.addEventListener('click', () => downloadChartPng(canvas, def.title, txId));
  }
}
