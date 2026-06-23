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
const startStop = (txId: number, meterStart: number, meterStop: number): MessageGroups => {
  const g = createMessageGroups();
  g.StartTransaction.push(mk('StartTransaction', { connectorId: 1, idTag: 'T', meterStart, timestamp: `${T}00:10:00Z` }, `${T}00:10:00.000Z`, 1, { transactionId: txId, idTagInfo: { status: 'Accepted' } }));
  g.StopTransaction.push(mk('StopTransaction', { transactionId: txId, meterStop, timestamp: `${T}00:20:00Z` }, `${T}00:20:00.000Z`, 2, { idTagInfo: { status: 'Accepted' } }));
  return g;
};

describe('STOP rules', () => {
  it('STOP-001 pass/fail on pairing', () => {
    const pass = startStop(100, 1000, 6000);
    expect(find(pass, 'STOP-001').status).toBe('pass');
    const fail = createMessageGroups();
    fail.StopTransaction.push(mk('StopTransaction', { transactionId: 100, meterStop: 10 }, `${T}00:20:00.000Z`, 1));
    expect(find(fail, 'STOP-001').status).toBe('fail');
  });

  it('STOP-002 fail on unknown txId, warn on txId 0', () => {
    const unknown = createMessageGroups();
    unknown.StopTransaction.push(mk('StopTransaction', { transactionId: 999, meterStop: 10 }, `${T}00:20:00.000Z`, 1, {}));
    expect(find(unknown, 'STOP-002').status).toBe('fail');

    const zero = createMessageGroups();
    zero.StopTransaction.push(mk('StopTransaction', { transactionId: 0, meterStop: 10 }, `${T}00:20:00.000Z`, 1, {}));
    expect(find(zero, 'STOP-002').status).toBe('warn');
  });

  it('STOP-003 fail when meterStop < meterStart', () => {
    const g = startStop(100, 6000, 1000); // stop below start
    expect(find(g, 'STOP-003').status).toBe('fail');
  });

  it('STOP-004 / 005 / 006 are indeterminate with the config reason', () => {
    const g = startStop(100, 1000, 6000);
    for (const id of ['STOP-004', 'STOP-005', 'STOP-006']) {
      const res = find(g, id);
      expect(res.status).toBe('info');
      expect(res.details).toContain('config');
    }
  });
});
