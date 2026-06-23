import { describe, it, expect } from 'vitest';
import { payload, resp, hasResp, msgId, itemOf, byAction, pairingResult } from '../../src/app/compliance/helpers';
import { createMessageGroups } from '../../src/app/model/types';
import type { ParsedMessage } from '../../src/app/model/types';

const mk = (action: string, p: unknown, line: number, rp?: unknown): ParsedMessage => {
  const m: ParsedMessage = { timestamp: '2025-01-01T00:00:00Z', direction: 'sent', message: [2, `id-${line}`, action, p], lineNumber: line, fileName: 'f' };
  if (rp !== undefined) m.responsePayload = rp;
  return m;
};

describe('compliance helpers', () => {
  it('accessors read payload, response, id', () => {
    const m = mk('Heartbeat', { a: 1 }, 5, { currentTime: 't' });
    expect(payload<{ a: number }>(m).a).toBe(1);
    expect(resp<{ currentTime: string }>(m)?.currentTime).toBe('t');
    expect(hasResp(m)).toBe(true);
    expect(msgId(m)).toBe('id-5');
    expect(itemOf(m, 'HB')).toEqual({ label: 'HB', lineNumber: 5 });
  });

  it('byAction: named group when keyed, else filters Other by action', () => {
    const g = createMessageGroups();
    g.Heartbeat.push(mk('Heartbeat', {}, 1));
    g.Other.push(mk('Authorize', { idTag: 'T' }, 2), mk('DataTransfer', { vendorId: 'v' }, 3));
    expect(byAction(g, 'Heartbeat')).toHaveLength(1);
    expect(byAction(g, 'Authorize').map((m) => m.lineNumber)).toEqual([2]);
    expect(byAction(g, 'DataTransfer')).toHaveLength(1);
    expect(byAction(g, 'Nope')).toHaveLength(0);
  });

  it('pairingResult: info when none, pass when all answered, fail with line-anchored unanswered', () => {
    expect(pairingResult([], 'Heartbeat').status).toBe('info');
    expect(pairingResult([mk('Heartbeat', {}, 1, { currentTime: 't' })], 'Heartbeat').status).toBe('pass');
    const r = pairingResult([mk('Heartbeat', {}, 1, { currentTime: 't' }), mk('Heartbeat', {}, 2)], 'Heartbeat');
    expect(r.status).toBe('fail');
    expect(r.affected).toEqual([{ label: 'id-2', lineNumber: 2 }]);
  });
});
