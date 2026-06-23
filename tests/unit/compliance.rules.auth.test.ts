import { describe, it, expect } from 'vitest';
import { runCompliance } from '../../src/app/compliance/runCompliance';
import { cpInitiatedPack } from '../../src/app/compliance/rulepacks/cpInitiated';
import { createMessageGroups } from '../../src/app/model/types';
import { processTransactions } from '../../src/app/parse/processTransactions';
import type { ParsedMessage, InternalTxMap, MessageGroups } from '../../src/app/model/types';

const mk = (action: string, p: unknown, line: number, rp?: unknown): ParsedMessage => {
  const m: ParsedMessage = { timestamp: '2025-01-01T00:00:00.000Z', direction: 'sent', message: [2, `id-${line}`, action, p], lineNumber: line, fileName: 'f' };
  if (rp !== undefined) m.responsePayload = rp;
  return m;
};
const find = (groups: MessageGroups, txMap: InternalTxMap, id: string) => {
  const txs = processTransactions(groups, txMap);
  const r = runCompliance(cpInitiatedPack, { messageGroups: groups, transactions: txs, internalTxMap: txMap, rawLogLines: [] });
  return r.groups.flatMap((g) => g.results).find((x) => x.id === id)!;
};

describe('AUTH rules', () => {
  it('AUTH-002 pass: every Authorize.req answered', () => {
    const g = createMessageGroups();
    g.Other.push(mk('Authorize', { idTag: 'T1' }, 1, { idTagInfo: { status: 'Accepted' } })); // Authorize → Other bucket
    expect(find(g, new Map(), 'AUTH-002').status).toBe('pass');
  });
  it('AUTH-002 fail: unanswered Authorize.req is flagged + line-anchored', () => {
    const g = createMessageGroups();
    g.Other.push(mk('Authorize', { idTag: 'T1' }, 7));
    const res = find(g, new Map(), 'AUTH-002');
    expect(res.status).toBe('fail');
    expect(res.affected[0].lineNumber).toBe(7);
  });
  it('AUTH-003 warn: stop idTag equals start idTag', () => {
    const g = createMessageGroups();
    g.StartTransaction.push(mk('StartTransaction', { connectorId: 1, idTag: 'SAME', meterStart: 0, timestamp: '2025-01-01T00:00:00Z' }, 1, { transactionId: 5, idTagInfo: { status: 'Accepted' } }));
    g.StopTransaction.push(mk('StopTransaction', { transactionId: 5, meterStop: 10, idTag: 'SAME', timestamp: '2025-01-01T00:10:00Z' }, 2, { idTagInfo: { status: 'Accepted' } }));
    expect(find(g, new Map(), 'AUTH-003').status).toBe('warn');
  });
  it('AUTH-001 pass: no StartTransaction without an accepted authorization', () => {
    const g = createMessageGroups();
    g.StartTransaction.push(mk('StartTransaction', { connectorId: 1, idTag: 'T', meterStart: 0, timestamp: '2025-01-01T00:00:00Z' }, 1, { transactionId: 5, idTagInfo: { status: 'Accepted' } }));
    expect(find(g, new Map(), 'AUTH-001').status).toBe('pass');
  });
});
