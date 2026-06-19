// Meter Values "Transaction Analysis Graphs" — port of HTML 8732-8877+. Six line
// charts over a transaction's pivoted rows. `extractGraphData` is pure (testable);
// `renderTransactionGraphs` lazy-loads Chart.js and draws the six cards via a compact
// shared line-chart builder (the legacy repeats a full Chart config per graph).
//
// Deferred (visual enhancements): the per-graph 🔍 Enlarge modal + 📥 PNG download
// buttons. The charts + their data are faithful; colours match the legacy where known.

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

interface Series { label: string; data: number[]; color: string; yAxisID?: string }
interface GraphDef { id: string; title: string; series: Series[]; dualAxis?: { left: string; right: string } }

function graphDefs(txId: string | number, g: GraphData): GraphDef[] {
  return [
    { id: `current-chart-${txId}`, title: 'Current Profile', series: [
      { label: 'Target Current (A)', data: g.currentEV, color: '#FF8C00' },
      { label: 'Present Current (A)', data: g.currentOutlet, color: '#FFD700' },
    ] },
    { id: `voltage-chart-${txId}`, title: 'Voltage Profile', series: [
      { label: 'Target Voltage (V)', data: g.voltageEV, color: '#FF8C00' },
      { label: 'Present Voltage (V)', data: g.voltageOutlet, color: '#FFD700' },
    ] },
    { id: `power-soc-chart-${txId}`, title: 'Power vs SoC Curve', dualAxis: { left: 'Power (W)', right: 'SoC (%)' }, series: [
      { label: 'Power (W)', data: g.powerOutlet, color: '#22d3ee', yAxisID: 'yLeft' },
      { label: 'SoC (%)', data: g.socEV, color: '#a3e635', yAxisID: 'yRight' },
    ] },
    { id: `soc-timeline-chart-${txId}`, title: 'SoC Over Time Curve', series: [
      { label: 'SoC (%)', data: g.socEV, color: '#a3e635' },
    ] },
    { id: `temperature-chart-${txId}`, title: 'Temperature Analysis Curve', series: [
      { label: 'Body (°C)', data: g.tempBody, color: '#f87171' },
      { label: 'Inlet (°C)', data: g.tempInlet, color: '#fbbf24' },
      { label: 'Outlet (°C)', data: g.tempOutlet, color: '#34d399' },
      { label: 'Outlet#2 (°C)', data: g.tempOutlet2, color: '#60a5fa' },
    ] },
    { id: `power-current-voltage-chart-${txId}`, title: 'Power, Current & Voltage Over Time', series: [
      { label: 'Power (W)', data: g.powerOutlet, color: '#22d3ee' },
      { label: 'Current (A)', data: g.currentOutlet, color: '#FFD700' },
      { label: 'Voltage (V)', data: g.voltageOutlet, color: '#f472b6' },
    ] },
  ];
}

interface ChartCtor { new (canvas: HTMLCanvasElement, cfg: unknown): { destroy(): void } }
interface ContainerWithCharts extends HTMLElement { _charts?: { destroy(): void }[] }

/** Render (or re-render) the six analysis graphs for `txId` into `container`. Lazy-loads Chart.js. */
export async function renderTransactionGraphs(container: HTMLElement, rows: Row[], txId: string | number): Promise<void> {
  const c = container as ContainerWithCharts;
  c._charts?.forEach((ch) => ch.destroy());
  c._charts = [];
  container.replaceChildren();

  const g = extractGraphData(rows, txId);
  const defs = graphDefs(txId, g);
  const canvases: Record<string, HTMLCanvasElement> = {};
  for (const def of defs) {
    const canvas = el('canvas', { attrs: { id: def.id } }) as HTMLCanvasElement;
    canvases[def.id] = canvas;
    container.appendChild(el('div', { className: 'p-4 rounded-lg', attrs: { style: 'background-color:#000000;' } }, [
      el('div', { className: 'flex justify-between items-center mb-2' }, [
        el('h4', { className: 'text-md font-semibold text-white', text: def.title }),
        el('span', { className: 'text-xs text-gray-400', text: `Transaction ID: ${txId}` }),
      ]),
      el('div', { attrs: { style: 'position:relative;height:300px;background-color:#000000;' } }, [canvas]),
    ]));
  }

  const { Chart } = (await import('chart.js/auto')) as unknown as { Chart: ChartCtor };
  const WHITE = '#e5e7eb';
  for (const def of defs) {
    const scales: Record<string, unknown> = def.dualAxis
      ? { x: { ticks: { color: WHITE }, grid: { color: '#1f2937' } },
          yLeft: { type: 'linear', position: 'left', title: { display: true, text: def.dualAxis.left, color: WHITE }, ticks: { color: WHITE }, grid: { color: '#1f2937' } },
          yRight: { type: 'linear', position: 'right', title: { display: true, text: def.dualAxis.right, color: WHITE }, ticks: { color: WHITE }, grid: { drawOnChartArea: false } } }
      : { x: { ticks: { color: WHITE }, grid: { color: '#1f2937' } }, y: { ticks: { color: WHITE }, grid: { color: '#1f2937' } } };
    c._charts.push(new Chart(canvases[def.id], {
      type: 'line',
      data: { labels: g.timestamps, datasets: def.series.map((s) => ({ label: s.label, data: s.data, borderColor: s.color, backgroundColor: 'transparent', borderWidth: 2, tension: 0, pointRadius: 0, pointHoverRadius: 6, spanGaps: true, yAxisID: s.yAxisID })) },
      options: { plugins: { legend: { labels: { color: WHITE } } }, scales },
    }));
  }
}
