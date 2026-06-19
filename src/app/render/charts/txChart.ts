// Per-transaction chart — faithful port of HTML 4057-4142. A dual-axis line chart:
// SoC (%) on the left axis, Power (kW) on the right. `buildTxChartData` is pure
// (one point per MeterValues message); `renderTransactionChart` lazy-loads Chart.js
// (keeps it out of the non-chart bundle + the jsdom test path) and draws onto a canvas.

import type { Transaction } from '../../model/types';

interface SampledValue { measurand?: string; unit?: string; value?: string }
interface MvReading { timestamp?: string; sampledValue?: SampledValue[] }
interface MvPayload { timestamp?: string; meterValue?: MvReading[] }

export interface TxChartData {
  labels: string[];
  socData: (number | null)[];
  powerData: (number | null)[];
}

/** One point per MeterValues message: SoC (%) and Power (kW, W→kW) from its sampled values. */
export function buildTxChartData(tx: Transaction): TxChartData {
  const points = tx.meterValues
    .map((mv) => {
      const payload = (mv.message[3] ?? {}) as MvPayload;
      const arr = payload.meterValue ?? [];
      const timestamp = arr.length > 0 ? arr[0].timestamp : payload.timestamp;
      let soc: number | null = null;
      let power: number | null = null;
      for (const entry of arr) {
        for (const sv of entry.sampledValue ?? []) {
          if (sv.measurand === 'SoC') soc = parseFloat(sv.value ?? '');
          else if (sv.measurand === 'Power.Active.Import') {
            let v = parseFloat(sv.value ?? '');
            if (sv.unit === 'W') v = v / 1000;
            power = v;
          }
        }
      }
      return { timestamp, soc, power };
    })
    .filter((p): p is { timestamp: string; soc: number | null; power: number | null } => !!p.timestamp);

  return {
    labels: points.map((p) => new Date(p.timestamp).toLocaleTimeString()),
    socData: points.map((p) => p.soc),
    powerData: points.map((p) => p.power),
  };
}

interface CanvasWithChart extends HTMLCanvasElement { _chart?: { destroy(): void } }

/** Draw (or redraw) the per-tx SoC+Power chart onto `canvas`. Lazy-loads Chart.js. */
export async function renderTransactionChart(canvas: HTMLCanvasElement, tx: Transaction): Promise<void> {
  const { Chart } = await import('chart.js/auto');
  const c = canvas as CanvasWithChart;
  c._chart?.destroy();
  const d = buildTxChartData(tx);
  c._chart = new Chart(canvas, {
    type: 'line',
    data: {
      labels: d.labels,
      datasets: [
        { label: 'SoC (%)', data: d.socData, borderColor: 'rgb(75, 192, 192)', backgroundColor: 'rgba(75, 192, 192, 0.1)', tension: 0.3, spanGaps: true, yAxisID: 'ySoC' },
        { label: 'Power (kW)', data: d.powerData, borderColor: 'rgb(255, 99, 132)', backgroundColor: 'rgba(255, 99, 132, 0.1)', tension: 0.3, spanGaps: true, yAxisID: 'yPower' },
      ],
    },
    options: {
      scales: {
        ySoC: { type: 'linear', display: true, position: 'left', title: { display: true, text: 'State of Charge (%)' } },
        yPower: { type: 'linear', display: true, position: 'right', title: { display: true, text: 'Power (kW)' }, grid: { drawOnChartArea: false } },
      },
    },
  });
}
