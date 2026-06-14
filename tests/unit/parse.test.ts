import { describe, it, expect } from 'vitest';
import { parseJsonSafely } from '../../src/app/parse/parseJsonSafely';
import { parseLines } from '../../src/app/parse/parseLines';
import { correlateMessages } from '../../src/app/parse/correlate';
import { groupMessagesByType } from '../../src/app/parse/groupMessages';
import { SAMPLE_LINES } from '../fixtures/sampleLines';

describe('parseJsonSafely', () => {
  it('parses normal JSON', () => {
    expect(parseJsonSafely('{"a":1}')).toEqual({ a: 1 });
  });
  it('unescapes \\" before parsing (escaped-quote logs)', () => {
    expect(parseJsonSafely('{\\"a\\":\\"b\\"}')).toEqual({ a: 'b' });
  });
});

describe('parseLines', () => {
  const r = parseLines(SAMPLE_LINES, 'sample.log');

  it('extracts only lines with sent/received markers as messages', () => {
    // 2 requests + 2 responses + 1 DataTransfer request = 5 messages.
    expect(r.messages).toHaveLength(5);
    expect(r.messages[0]).toMatchObject({
      direction: 'sent',
      timestamp: '2025-08-22T02:50:56.554Z',
      lineNumber: 1,
      fileName: 'sample.log',
    });
    expect(r.messages[0].message[2]).toBe('BootNotification');
    expect(r.messages[1].direction).toBe('received');
  });

  it('separates alerts from events by type', () => {
    expect(r.alerts).toHaveLength(1);
    expect(r.alerts[0]).toMatchObject({ code: 'E01', message: 'Test alert', session: 's1', chargerId: 'CP1' });
    expect(r.events).toHaveLength(1);
    expect(r.events[0]).toMatchObject({ type: 'status', chargerId: 'CP1' });
  });

  it('builds internalTxMap from both the runtime-stop and stored-tx sources', () => {
    expect(r.internalTxMap.get('12345')).toBe('internal_transId_abc');
    expect(r.internalTxMap.get('67890')).toBe('internal_transId_def');
    expect(r.internalTxMap.size).toBe(2);
  });
});

describe('correlateMessages', () => {
  const { messages } = parseLines(SAMPLE_LINES, 'sample.log');
  const correlated = correlateMessages(messages);

  it('returns only requests, in first-seen order, with responsePayload attached', () => {
    expect(correlated.map(m => m.message[2])).toEqual(['BootNotification', 'Heartbeat', 'DataTransfer']);
    expect(correlated[0].responsePayload).toMatchObject({ status: 'Accepted', interval: 300 });
  });

  it('sets responsePayload = null for an unanswered request', () => {
    const dataTransfer = correlated.find(m => m.message[2] === 'DataTransfer');
    expect(dataTransfer?.responsePayload).toBeNull();
  });
});

describe('groupMessagesByType', () => {
  const { messages } = parseLines(SAMPLE_LINES, 'sample.log');
  const grouped = groupMessagesByType(correlateMessages(messages));

  it('buckets known actions and routes unknown ones to Other', () => {
    expect(grouped.BootNotification).toHaveLength(1);
    expect(grouped.Heartbeat).toHaveLength(1);
    expect(grouped.Other).toHaveLength(1); // DataTransfer is not a first-classed type
    expect(grouped.StartTransaction).toHaveLength(0);
  });
});
