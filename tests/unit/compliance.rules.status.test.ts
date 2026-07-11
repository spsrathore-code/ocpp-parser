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
const sn = (connectorId: number, status: string, ts: string, line: number, errorCode = 'NoError') =>
  mk('StatusNotification', { connectorId, status, errorCode }, ts, line, {});
const find = (groups: MessageGroups, id: string) => {
  const txMap: InternalTxMap = new Map();
  const txs = processTransactions(groups, txMap);
  const r = runCompliance(cpInitiatedPack, { messageGroups: groups, transactions: txs, internalTxMap: txMap, rawLogLines: [] });
  return r.groups.flatMap((g) => g.results).find((x) => x.id === id)!;
};

describe('STATUS rules', () => {
  it('STATUS-002 fail: connectorId=0 reports a disallowed state', () => {
    const g = createMessageGroups();
    g.StatusNotification.push(sn(0, 'Charging', `${T}00:00:00.000Z`, 1));
    expect(find(g, 'STATUS-002').status).toBe('fail');
  });

  it('STATUS-003 warn on illegal transition, pass on a legal path', () => {
    const bad = createMessageGroups();
    bad.StatusNotification.push(sn(1, 'Available', `${T}00:00:00.000Z`, 1), sn(1, 'Charging', `${T}00:01:00.000Z`, 2));
    expect(find(bad, 'STATUS-003').status).toBe('warn');

    const good = createMessageGroups();
    good.StatusNotification.push(
      sn(1, 'Available', `${T}00:00:00.000Z`, 1),
      sn(1, 'Preparing', `${T}00:01:00.000Z`, 2),
      sn(1, 'Charging', `${T}00:02:00.000Z`, 3),
    );
    expect(find(good, 'STATUS-003').status).toBe('pass');
  });

  it('STATUS-006 fail: EVCommunicationError with a disallowed status', () => {
    const g = createMessageGroups();
    g.StatusNotification.push(sn(1, 'Charging', `${T}00:00:00.000Z`, 1, 'EVCommunicationError'));
    expect(find(g, 'STATUS-006').status).toBe('fail');
  });

  it('STATUS-009 is indeterminate with the config reason', () => {
    const g = createMessageGroups();
    g.StatusNotification.push(sn(1, 'Available', `${T}00:00:00.000Z`, 1));
    const res = find(g, 'STATUS-009');
    expect(res.status).toBe('info');
    expect(res.details).toContain('config');
  });
});
