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
const find = (groups: MessageGroups, id: string) => {
  const txMap: InternalTxMap = new Map();
  const txs = processTransactions(groups, txMap);
  const r = runCompliance(cpInitiatedPack, { messageGroups: groups, transactions: txs, internalTxMap: txMap, rawLogLines: [] });
  return r.groups.flatMap((g) => g.results).find((x) => x.id === id)!;
};

describe('START rules', () => {
  it('START-001 pass when answered, fail when not', () => {
    const pass = createMessageGroups();
    pass.StartTransaction.push(mk('StartTransaction', { connectorId: 1, idTag: 'T', meterStart: 0, timestamp: '2025-01-01T00:00:00Z' }, 1, { transactionId: 5, idTagInfo: { status: 'Accepted' } }));
    expect(find(pass, 'START-001').status).toBe('pass');
    const fail = createMessageGroups();
    fail.StartTransaction.push(mk('StartTransaction', { connectorId: 1, idTag: 'T', meterStart: 0, timestamp: '2025-01-01T00:00:00Z' }, 1));
    expect(find(fail, 'START-001').status).toBe('fail');
  });
  it('START-003 fail when transactionId missing from conf', () => {
    const g = createMessageGroups();
    g.StartTransaction.push(mk('StartTransaction', { connectorId: 1, idTag: 'T', meterStart: 0, timestamp: '2025-01-01T00:00:00Z' }, 1, { idTagInfo: { status: 'Accepted' } }));
    expect(find(g, 'START-003').status).toBe('fail');
  });
  it('START-002 info when there is no reservation context', () => {
    const g = createMessageGroups();
    g.StartTransaction.push(mk('StartTransaction', { connectorId: 1, idTag: 'T', meterStart: 0, timestamp: '2025-01-01T00:00:00Z' }, 1, { transactionId: 5, idTagInfo: { status: 'Accepted' } }));
    expect(find(g, 'START-002').status).toBe('info');
  });
});
