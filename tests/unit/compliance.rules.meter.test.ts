import { describe, it, expect } from 'vitest';
import { runCompliance } from '../../src/app/compliance/runCompliance';
import { cpInitiatedPack } from '../../src/app/compliance/rulepacks/cpInitiated';
import { createMessageGroups } from '../../src/app/model/types';
import { processTransactions } from '../../src/app/parse/processTransactions';
import type { ParsedMessage, InternalTxMap, MessageGroups } from '../../src/app/model/types';

const T = '2025-08-22T';
const mk = (action: string, p: unknown, ts: string, line: number, rp?: unknown): ParsedMessage => {
  const m: ParsedMessage = { timestamp: ts, direction: 'sent', message: [2, `id-${line}`, action, p], lineNumber: line, fileName: 'f' };
  if (rp !== undefined) m.responsePayload = rp;
  return m;
};
const find = (groups: MessageGroups, id: string) => {
  const txMap: InternalTxMap = new Map();
  const txs = processTransactions(groups, txMap);
  const r = runCompliance(cpInitiatedPack, { messageGroups: groups, transactions: txs, internalTxMap: txMap, rawLogLines: [] });
  return r.groups.flatMap((g) => g.results).find((x) => x.id === id)!;
};

describe('METER rules', () => {
  it('METER-002 fail: MeterValues references an unknown transactionId', () => {
    const g = createMessageGroups();
    g.MeterValues.push(mk('MeterValues', { transactionId: 999, meterValue: [{ timestamp: `${T}00:10:00Z`, sampledValue: [] }] }, `${T}00:10:00.000Z`, 1, {}));
    expect(find(g, 'METER-002').status).toBe('fail');
  });

  it('METER-003 warn: out-of-order meterValue timestamps within a transaction', () => {
    const g = createMessageGroups();
    g.MeterValues.push(mk('MeterValues', {
      transactionId: 100,
      meterValue: [{ timestamp: `${T}00:15:00Z`, sampledValue: [] }, { timestamp: `${T}00:10:00Z`, sampledValue: [] }],
    }, `${T}00:15:00.000Z`, 1, {}));
    expect(find(g, 'METER-003').status).toBe('warn');
  });

  it('METER-005 warn: MeterValues after the transaction is stopped', () => {
    const g = createMessageGroups();
    g.StartTransaction.push(mk('StartTransaction', { connectorId: 1, idTag: 'T', meterStart: 1000, timestamp: `${T}00:10:00Z` }, `${T}00:10:00.000Z`, 1, { transactionId: 100, idTagInfo: { status: 'Accepted' } }));
    g.StopTransaction.push(mk('StopTransaction', { transactionId: 100, meterStop: 6000, timestamp: `${T}00:20:00Z` }, `${T}00:20:00.000Z`, 2, { idTagInfo: { status: 'Accepted' } }));
    g.MeterValues.push(mk('MeterValues', { transactionId: 100, meterValue: [{ timestamp: `${T}00:25:00Z`, sampledValue: [] }] }, `${T}00:25:00.000Z`, 3, {}));
    expect(find(g, 'METER-005').status).toBe('warn');
  });
});
