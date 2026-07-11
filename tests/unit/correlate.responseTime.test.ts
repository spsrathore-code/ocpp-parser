import { describe, it, expect } from 'vitest';
import { correlateMessages } from '../../src/app/parse/correlate';
import type { ParsedMessage } from '../../src/app/model/types';

const msg = (o: Partial<ParsedMessage> & { message: unknown[] }): ParsedMessage => ({
  timestamp: '', direction: 'sent', lineNumber: 1, fileName: 'f', ...o,
} as ParsedMessage);

describe('correlateMessages — responseTimestamp', () => {
  it('attaches the CallResult timestamp to the request (for latency)', () => {
    const messages = [
      msg({ timestamp: '2026-07-09T05:58:11.201Z', direction: 'sent', message: [2, 'id1', 'Heartbeat', {}], lineNumber: 1 }),
      msg({ timestamp: '2026-07-09T05:58:11.313Z', direction: 'received', message: [3, 'id1', { currentTime: 'x' }], lineNumber: 2 }),
    ];
    const [req] = correlateMessages(messages);
    expect(req.responseTimestamp).toBe('2026-07-09T05:58:11.313Z');
    expect(req.responsePayload).toEqual({ currentTime: 'x' }); // unchanged
  });

  it('leaves responseTimestamp undefined for an unanswered request', () => {
    const [req] = correlateMessages([msg({ message: [2, 'x', 'Heartbeat', {}] })]);
    expect(req.responseTimestamp).toBeUndefined();
    expect(req.responsePayload).toBeNull();
  });
});
