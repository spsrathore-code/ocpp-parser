import { describe, it, expect } from 'vitest';
import { sessionToLogLines, analyzeSession } from '../../src/simulator/session/toParser';
import type { SessionEntry } from '../../src/simulator/model/types';

describe('session → Parser', () => {
  it('formats lines the Parser regex accepts', () => {
    const lines = sessionToLogLines([
      { ts: '2026-07-03T10:00:00Z', direction: 'sent', frame: [2, 'id', 'Heartbeat', {}] },
      { ts: '2026-07-03T10:00:01Z', direction: 'received', frame: [3, 'id', {}] },
    ]);
    expect(lines[0]).toBe('[2026-07-03T10:00:00Z] >> message sent: [2,"id","Heartbeat",{}]');
    expect(lines[1]).toBe('[2026-07-03T10:00:01Z] << message received: [3,"id",{}]');
  });

  it('a Start→Stop session yields one analyzed transaction', () => {
    const entries: SessionEntry[] = [
      { ts: '2026-07-03T10:00:00Z', direction: 'sent', frame: [2, 's1', 'StartTransaction', { connectorId: 1, idTag: 'ABC', meterStart: 1000, timestamp: '2026-07-03T10:00:00Z' }] },
      { ts: '2026-07-03T10:00:00Z', direction: 'received', frame: [3, 's1', { transactionId: 555, idTagInfo: { status: 'Accepted' } }] },
      { ts: '2026-07-03T10:05:00Z', direction: 'sent', frame: [2, 'e1', 'StopTransaction', { transactionId: 555, meterStop: 5000, timestamp: '2026-07-03T10:05:00Z' }] },
      { ts: '2026-07-03T10:05:00Z', direction: 'received', frame: [3, 'e1', {}] },
    ];
    const result = analyzeSession(entries);
    expect(result.transactions.length).toBe(1);
    // Parser's Transaction.id = the CMS transactionId from the StartTx response payload.
    expect(result.transactions[0].id).toBe(555);
  });
});
