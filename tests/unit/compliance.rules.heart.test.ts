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

describe('HEART rules', () => {
  it('HEART-001 pass when answered, fail when not', () => {
    const pass = createMessageGroups();
    pass.Heartbeat.push(mk('Heartbeat', {}, 1, { currentTime: 't' }));
    expect(find(pass, 'HEART-001').status).toBe('pass');
    const fail = createMessageGroups();
    fail.Heartbeat.push(mk('Heartbeat', {}, 1));
    expect(find(fail, 'HEART-001').status).toBe('fail');
  });
  it('HEART-003 fail when currentTime missing, pass when present', () => {
    const fail = createMessageGroups();
    fail.Heartbeat.push(mk('Heartbeat', {}, 1, {}));
    expect(find(fail, 'HEART-003').status).toBe('fail');
    const pass = createMessageGroups();
    pass.Heartbeat.push(mk('Heartbeat', {}, 1, { currentTime: '2025-01-01T00:00:00Z' }));
    expect(find(pass, 'HEART-003').status).toBe('pass');
  });
});
