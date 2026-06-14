import { describe, it, expect } from 'vitest';
import { createMessageGroups } from '../../src/app/model/types';
import type { ParsedMessage, OcppRawMessage } from '../../src/app/model/types';
import { processTransactions } from '../../src/app/parse/processTransactions';

function m(message: OcppRawMessage, timestamp: string, responsePayload?: unknown): ParsedMessage {
  return { timestamp, direction: 'sent', message, lineNumber: 1, fileName: 't', responsePayload };
}

function buildGroups(opts: { reason?: string; startLogTs?: string; startPayloadTs?: string } = {}) {
  const g = createMessageGroups();
  g.StartTransaction.push(
    m(
      [2, 's1', 'StartTransaction', { connectorId: 1, idTag: 'TAG', meterStart: 1000, timestamp: opts.startPayloadTs ?? '2025-08-22T10:00:00Z' }],
      opts.startLogTs ?? '2025-08-22T10:00:00.000Z',
      { transactionId: 555 },
    ),
  );
  g.MeterValues.push(
    m(
      [2, 'm1', 'MeterValues', { transactionId: 555, meterValue: [{ sampledValue: [{ measurand: 'Power.Active.Import', value: '30000', unit: 'W' }] }] }],
      '2025-08-22T10:15:00.000Z',
    ),
  );
  g.StopTransaction.push(
    m(
      [2, 'e1', 'StopTransaction', {
        transactionId: 555,
        meterStop: 5000,
        reason: opts.reason ?? 'Local',
        transactionData: [{ sampledValue: [
          { measurand: 'SoC', context: 'Transaction.Begin', value: '20', location: 'EV' },
          { measurand: 'SoC', context: 'Transaction.End', value: '80', location: 'EV' },
        ] }],
      }],
      '2025-08-22T10:30:00.000Z',
    ),
  );
  return g;
}

describe('processTransactions — field computation (parity)', () => {
  const txs = processTransactions(buildGroups(), new Map());
  const tx = txs[0];

  it('returns one complete transaction with id from responsePayload', () => {
    expect(txs).toHaveLength(1);
    expect(tx.id).toBe(555);
  });

  it('computes meter, energy, and duration', () => {
    expect(tx.meterStart).toBe(1000);
    expect(tx.meterStop).toBe(5000);
    expect(tx.totalEnergy).toBe(4); // (5000-1000)/1000 kWh
    expect(tx.duration).toBe(30); // minutes
  });

  it('computes avg/peak power as toFixed(2) strings (W→kW)', () => {
    expect(tx.avgPower).toBe('30.00');
    expect(tx.peakPower).toBe('30.00');
  });

  it('extracts SoC and location from transactionData', () => {
    expect(tx.socBegin).toBe('20');
    expect(tx.socEnd).toBe('80');
    expect(tx.location).toBe('EV');
  });

  it('classifies status and sets first-on-connector startStopDiff to null', () => {
    expect(tx.status).toBe('Completed');
    expect(tx.startStopDiff).toBeNull();
  });

  it('is not flagged as offline replay when log/payload timestamps align', () => {
    expect(tx.isOfflineReplay).toBe(false);
    expect(tx.replayDelayMs).toBe(0);
  });
});

describe('processTransactions — variants', () => {
  it('classifies an EmergencyStop reason as Aborted', () => {
    const tx = processTransactions(buildGroups({ reason: 'EmergencyStop' }), new Map())[0];
    expect(tx.status).toBe('Aborted');
  });

  it('flags offline replay when log timestamp is >1h after the payload timestamp', () => {
    const tx = processTransactions(
      buildGroups({ startPayloadTs: '2025-08-22T08:00:00Z', startLogTs: '2025-08-22T10:00:00.000Z' }),
      new Map(),
    )[0];
    expect(tx.isOfflineReplay).toBe(true);
    expect(tx.replayDelayMs).toBeGreaterThan(3600000);
  });

  it('does NOT return a StartTransaction that has no matching StopTransaction', () => {
    const g = createMessageGroups();
    g.StartTransaction.push(
      m([2, 's1', 'StartTransaction', { connectorId: 1, meterStart: 1, timestamp: '2025-08-22T10:00:00Z' }], '2025-08-22T10:00:00.000Z', { transactionId: 999 }),
    );
    expect(processTransactions(g, new Map())).toHaveLength(0);
  });

  it('resolves internalTransactionId from the map', () => {
    const tx = processTransactions(buildGroups(), new Map([['555', 'internal_transId_xyz']]))[0];
    expect(tx.internalTransactionId).toBe('internal_transId_xyz');
  });
});
