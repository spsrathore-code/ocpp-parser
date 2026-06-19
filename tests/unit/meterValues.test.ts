// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import type { ParsedMessage, Transaction } from '../../src/app/model/types';
import type { AnalysisResult } from '../../src/app/analyze';
import { pivotMeterValues, buildTxInfo, renderMeterValues, MV_HEADERS, getTransactionMetrics, calculateTransactionStats } from '../../src/app/render/sections/meterValues';

function mvMsg(txId: number, readingTs: string, sampled: Record<string, unknown>[], over: Partial<ParsedMessage> = {}): ParsedMessage {
  return {
    timestamp: '2025-08-22T00:00:00.000Z', direction: 'received', lineNumber: 1, fileName: 'log.txt',
    message: [2, 'id', 'MeterValues', { transactionId: txId, connectorId: 1, meterValue: [{ timestamp: readingTs, sampledValue: sampled }] }],
    ...over,
  } as ParsedMessage;
}
function tx(over: Partial<Transaction>): Transaction {
  return { id: 1, startTime: '', meterValues: [], isOfflineReplay: false, logTimestamp: '', replayDelayMs: 0, internalTransactionId: null, ...over };
}

describe('pivotMeterValues', () => {
  it('pivots readings by timestamp into measurand/unit/location columns', () => {
    const rows = pivotMeterValues([
      mvMsg(55, '2025-08-22T00:00:10.000Z', [
        { measurand: 'Energy.Active.Import.Register', unit: 'Wh', location: 'Outlet', value: '1000', context: 'Sample.Periodic' },
        { measurand: 'SoC', unit: 'Percent', location: 'EV', value: '42' },
      ]),
    ]);
    expect(rows).toHaveLength(1);
    expect(rows[0]['Transaction ID']).toBe('55');
    expect(rows[0]['Context']).toBe('Sample.Periodic');
    expect(rows[0]['Energy.Active.Import.Register/Wh/Outlet']).toBe('1000');
    expect(rows[0]['SoC/Percent/EV']).toBe('42');
    expect(rows[0]['Tx Type']).toBe('📡 Online');
  });

  it('routes a second Outlet temperature to the Outlet#2 column', () => {
    const rows = pivotMeterValues([
      mvMsg(1, '2025-08-22T00:00:10.000Z', [
        { measurand: 'Temperature', unit: 'Celsius', location: 'Outlet', value: '40' },
        { measurand: 'Temperature', unit: 'Celsius', location: 'Outlet', value: '41' },
      ]),
    ]);
    expect(rows[0]['Temperature/Celsius/Outlet']).toBe('40');
    expect(rows[0]['Temperature/Celsius/Outlet#2']).toBe('41');
  });
});

describe('buildTxInfo', () => {
  it('labels completed transactions with duration and meter-only ids with (Meter Data)', () => {
    const info = buildTxInfo([tx({ id: 55, duration: 30 })], [mvMsg(55, '2025-08-22T00:00:10.000Z', []), mvMsg(99, '2025-08-22T01:00:00.000Z', [])]);
    expect(info.find((i) => i.id === 55)!.text).toBe('Transaction 55 (30m)');
    expect(info.find((i) => i.id === 99)!.text).toBe('Transaction 99 (Meter Data)');
  });
});

describe('renderMeterValues', () => {
  const r = { transactions: [tx({ id: 55, duration: 30 })], internalTxMap: new Map<string, string>(), messageGroups: { MeterValues: [mvMsg(55, '2025-08-22T00:00:10.000Z', [{ measurand: 'SoC', unit: 'Percent', location: 'EV', value: '42' }])] } } as unknown as AnalysisResult;
  const body = renderMeterValues(r);

  it('renders the selector (All + per-tx) and the fixed meter-values headers', () => {
    const opts = [...body.querySelectorAll('#transaction-selector option')].map((o) => (o as HTMLOptionElement).value);
    expect(opts).toContain('all');
    expect(opts).toContain('55');
    const headers = [...body.querySelectorAll('#meter-values-table thead th')].map((th) => th.textContent);
    expect(headers).toEqual(MV_HEADERS);
  });

  it('populates the table AND summary cards + detailed stats when a tx is selected and View is clicked', () => {
    const selector = body.querySelector('#transaction-selector') as HTMLSelectElement;
    const viewBtn = body.querySelector('#view-meter-values-btn') as HTMLButtonElement;
    selector.value = '55';
    selector.dispatchEvent(new Event('change'));
    expect(viewBtn.disabled).toBe(false);
    viewBtn.click();
    expect(body.querySelectorAll('#meter-values-body tr').length).toBeGreaterThan(0);
    // Summary cards populated (not the initial '-')
    expect(body.querySelector('#summary-card-1-value')!.textContent).toBe('55'); // Transaction ID
    expect(body.querySelector('#summary-card-2-value')!.textContent).toBe('1');  // Meter Readings
    // Detailed Statistics table appears for a specific transaction
    expect(body.querySelector('#detailed-stats-container')!.textContent).toContain('Detailed Statistics');
  });
});

describe('getTransactionMetrics', () => {
  it('computes energy from interval samples and duration from begin/end', () => {
    const msgs = [
      mvMsg(55, '2025-08-22T00:00:00.000Z', [{ measurand: 'Energy.Active.Import.Interval', unit: 'Wh', location: 'Outlet', value: '500', context: 'Transaction.Begin' }]),
      mvMsg(55, '2025-08-22T00:10:00.000Z', [{ measurand: 'Energy.Active.Import.Interval', unit: 'Wh', location: 'Outlet', value: '700', context: 'Transaction.End' }]),
    ];
    const m = getTransactionMetrics(55, msgs);
    expect(m.energy).toBe(1200);
    expect(m.durationMin).toBe(10);
  });
});

describe('calculateTransactionStats', () => {
  it('returns per-measurand max/min and SoC start/end', () => {
    const rows = pivotMeterValues([
      mvMsg(55, '2025-08-22T00:00:00.000Z', [{ measurand: 'SoC', unit: 'Percent', location: 'EV', value: '20' }, { measurand: 'Current.Import', unit: 'A', location: 'Outlet', value: '30' }]),
      mvMsg(55, '2025-08-22T00:05:00.000Z', [{ measurand: 'SoC', unit: 'Percent', location: 'EV', value: '80' }, { measurand: 'Current.Import', unit: 'A', location: 'Outlet', value: '50' }]),
    ]);
    const s = calculateTransactionStats(55, rows)!;
    expect(s.currentOutlet).toEqual({ max: '50.00', min: '30.00' });
    expect(s.soc).toEqual({ start: '20.00', end: '80.00' });
  });
});
