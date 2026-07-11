import { describe, it, expect, vi } from 'vitest';
import { parseLines } from '../../src/app/parse/parseLines';
import { parseLinesAsync } from '../../src/app/parse/parseLinesAsync';

// Fixture exercises: a message, an event, an alert, and BOTH internalTxMap sources
// with the tricky ordering — a primary (unconditional) set followed in a LATER chunk
// by a backup (only-if-absent) set for the SAME id, which must NOT override.
const LINES = [
  '[2025-01-01T00:00:00Z] >> message sent: [2,"a","Heartbeat",{}]',                                                   // L1 message
  '[2025-01-01T00:00:01Z] [chg] handling [OCPP] event {"type":"info","chargerId":"C1","outlet":"1"}',                 // L2 event
  '[2025-01-01T00:00:02Z] [chg] handling [OCPP] event {"type":"alert","chargerId":"C1","payload":{"code":"E1"}}',     // L3 alert
  '[OCPPRuntime] New State --> stop Transaction {"transactionId":200,"internalTransactionId":"internal_transId_primary"}', // L4 primary 200→primary
  'Stored transactionId 200 for internalTransactionId internal_transId_backup',                                       // L5 backup 200 (must NOT override)
  'Stored transactionId 300 for internalTransactionId internal_transId_b300',                                         // L6 backup 300 (absent → set)
  '[2025-01-01T00:00:05Z] << message received: [3,"a",{}]',                                                           // L7 message
];

describe('parseLinesAsync — chunked async driver (parity with parseLines)', () => {
  it('produces output identical to synchronous parseLines, regardless of chunk size', async () => {
    const sync = parseLines(LINES, 'log.txt');
    const asyncRes = await parseLinesAsync(LINES, 'log.txt', { chunkSize: 2 });
    expect(asyncRes.messages).toEqual(sync.messages);
    expect(asyncRes.events).toEqual(sync.events);
    expect(asyncRes.alerts).toEqual(sync.alerts);
    expect([...asyncRes.internalTxMap].sort()).toEqual([...sync.internalTxMap].sort());
  });

  it('preserves ABSOLUTE line numbers across chunk boundaries', async () => {
    const r = await parseLinesAsync(LINES, 'log.txt', { chunkSize: 2 });
    // two messages: L1 and L7
    expect(r.messages.map((m) => m.lineNumber)).toEqual([1, 7]);
  });

  it('internalTxMap: a backup-source set in a LATER chunk does NOT override a primary set (shared accumulator)', async () => {
    // chunkSize 2 puts the primary (L4, index 3) and the backup (L5, index 4) in different chunks.
    const r = await parseLinesAsync(LINES, 'log.txt', { chunkSize: 2 });
    expect(r.internalTxMap.get('200')).toBe('internal_transId_primary'); // NOT _backup
    expect(r.internalTxMap.get('300')).toBe('internal_transId_b300');
  });

  it('reports progress per chunk, ending at done === total', async () => {
    const onProgress = vi.fn();
    await parseLinesAsync(LINES, 'log.txt', { chunkSize: 3, onProgress });
    expect(onProgress).toHaveBeenCalled();
    expect(onProgress.mock.calls.at(-1)).toEqual([LINES.length, LINES.length]);
  });

  it('handles an empty file without error', async () => {
    const r = await parseLinesAsync([], 'empty.txt');
    expect(r.messages).toEqual([]);
    expect([...r.internalTxMap]).toEqual([]);
  });
});

describe('parseLines — startLine offset (additive)', () => {
  it('offsets line numbers when a startLine is given (default 0 = unchanged)', () => {
    const line = '[2025-01-01T00:00:00Z] >> message sent: [2,"a","Heartbeat",{}]';
    expect(parseLines([line], 'l').messages[0].lineNumber).toBe(1);
    expect(parseLines([line], 'l', 1000).messages[0].lineNumber).toBe(1001);
  });
});
