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

describe('BOOT rules', () => {
  it('BOOT-002 pass: CP messages all after the first BootNotification', () => {
    const g = createMessageGroups();
    g.BootNotification.push(mk('BootNotification', {}, `${T}00:00:00.000Z`, 1, { status: 'Accepted', interval: 300 }));
    g.Heartbeat.push(mk('Heartbeat', {}, `${T}00:01:00.000Z`, 2, { currentTime: `${T}00:01:00Z` }));
    expect(find(g, 'BOOT-002').status).toBe('pass');
  });
  it('BOOT-002 warn: a Heartbeat precedes the first BootNotification (heuristic, not a hard fail)', () => {
    const g = createMessageGroups();
    g.Heartbeat.push(mk('Heartbeat', {}, `${T}00:01:00.000Z`, 1, { currentTime: 't' }));
    g.BootNotification.push(mk('BootNotification', {}, `${T}00:05:00.000Z`, 2, { status: 'Accepted', interval: 300 }));
    const res = find(g, 'BOOT-002');
    expect(res.status).toBe('warn');
    expect(res.affected[0].lineNumber).toBe(1);
  });
  it('BOOT-002 FP-suppression: a message exactly at the boot timestamp passes', () => {
    const g = createMessageGroups();
    g.BootNotification.push(mk('BootNotification', {}, `${T}00:00:00.000Z`, 1, { status: 'Accepted', interval: 300 }));
    g.StatusNotification.push(mk('StatusNotification', { connectorId: 1, status: 'Available' }, `${T}00:00:00.000Z`, 2));
    expect(find(g, 'BOOT-002').status).toBe('pass');
  });

  it('BOOT-004 info: no rejected BootNotification', () => {
    const g = createMessageGroups();
    g.BootNotification.push(mk('BootNotification', {}, `${T}00:00:00.000Z`, 1, { status: 'Accepted', interval: 300 }));
    expect(find(g, 'BOOT-004').status).toBe('info');
  });
  it('BOOT-004 fail: a Heartbeat inside the rejection retry interval', () => {
    const g = createMessageGroups();
    g.BootNotification.push(mk('BootNotification', {}, `${T}00:00:00.000Z`, 1, { status: 'Rejected', interval: 300 }));
    g.Heartbeat.push(mk('Heartbeat', {}, `${T}00:02:00.000Z`, 2, { currentTime: 't' })); // 120s < 300s window
    expect(find(g, 'BOOT-004').status).toBe('fail');
  });

  it('BOOT-007 / BOOT-008 are indeterminate with a clear reason', () => {
    const g = createMessageGroups();
    g.BootNotification.push(mk('BootNotification', {}, `${T}00:00:00.000Z`, 1, { status: 'Pending', interval: 300 }));
    for (const id of ['BOOT-007', 'BOOT-008']) {
      const res = find(g, id);
      expect(res.status).toBe('info');
      expect(res.details).toContain('Indeterminate');
    }
  });
});
