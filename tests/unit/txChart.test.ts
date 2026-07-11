import { describe, it, expect } from 'vitest';
import type { Transaction, ParsedMessage } from '../../src/app/model/types';
import { buildTxChartData } from '../../src/app/render/charts/txChart';

function mv(ts: string, sampled: Record<string, unknown>[]): ParsedMessage {
  return { timestamp: ts, direction: 'received', lineNumber: 1, fileName: 'l', message: [2, 'id', 'MeterValues', { meterValue: [{ timestamp: ts, sampledValue: sampled }] }] } as ParsedMessage;
}
function tx(meterValues: ParsedMessage[]): Transaction {
  return { id: 1, startTime: '', meterValues, isOfflineReplay: false, logTimestamp: '', replayDelayMs: 0, internalTransactionId: null };
}

describe('buildTxChartData', () => {
  it('extracts SoC and Power (W→kW) per MeterValues message', () => {
    const d = buildTxChartData(tx([
      mv('2025-08-22T00:00:00.000Z', [{ measurand: 'SoC', value: '20' }, { measurand: 'Power.Active.Import', unit: 'W', value: '30000' }]),
      mv('2025-08-22T00:05:00.000Z', [{ measurand: 'SoC', value: '55' }, { measurand: 'Power.Active.Import', unit: 'kW', value: '32' }]),
    ]));
    expect(d.labels).toHaveLength(2);
    expect(d.socData).toEqual([20, 55]);
    expect(d.powerData).toEqual([30, 32]); // 30000 W → 30 kW; 32 kW stays
  });

  it('yields null for missing measurands', () => {
    const d = buildTxChartData(tx([mv('2025-08-22T00:00:00.000Z', [{ measurand: 'Temperature', value: '40' }])]));
    expect(d.socData).toEqual([null]);
    expect(d.powerData).toEqual([null]);
  });
});
