import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { parseLines } from '../../src/app/parse/parseLines';
import { correlateMessages } from '../../src/app/parse/correlate';
import { groupMessagesByType } from '../../src/app/parse/groupMessages';

function load(name: string): string[] {
  const path = fileURLToPath(new URL(`../../data/samples/${name}`, import.meta.url));
  return readFileSync(path, 'utf8').split(/\r?\n/);
}

describe('parse pipeline on real sample log (parity invariants)', () => {
  const lines = load('Sample OCPP Client Log .txt');
  const { messages, events, alerts, internalTxMap } = parseLines(lines, 'sample1');
  const grouped = groupMessagesByType(correlateMessages(messages));

  it('parses without throwing and finds messages', () => {
    expect(messages.length).toBeGreaterThan(0);
  });

  it('finds the 2 transactions (Start + Stop) known to be in this log', () => {
    expect(grouped.StartTransaction.length).toBe(2);
    expect(grouped.StopTransaction.length).toBe(2);
  });

  it('attaches a StartTransaction responsePayload carrying transactionId (Fix #1 contract)', () => {
    for (const start of grouped.StartTransaction) {
      expect(start.responsePayload).toBeTruthy();
      expect((start.responsePayload as { transactionId?: number }).transactionId).toBeTypeOf('number');
    }
  });

  it('produces events/alerts arrays (may be empty) without error', () => {
    expect(Array.isArray(events)).toBe(true);
    expect(Array.isArray(alerts)).toBe(true);
    expect(internalTxMap instanceof Map).toBe(true);
  });
});
