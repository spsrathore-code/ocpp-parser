import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { parseLines } from '../../src/app/parse/parseLines';
import { correlateMessages } from '../../src/app/parse/correlate';
import { groupMessagesByType } from '../../src/app/parse/groupMessages';
import { processTransactions } from '../../src/app/parse/processTransactions';

function pipeline(name: string) {
  const path = fileURLToPath(new URL(`../../data/samples/${name}`, import.meta.url));
  const lines = readFileSync(path, 'utf8').split(/\r?\n/);
  const { messages, internalTxMap } = parseLines(lines, name);
  const grouped = groupMessagesByType(correlateMessages(messages));
  return processTransactions(grouped, internalTxMap);
}

describe('full parse→tx pipeline on real sample log (parity)', () => {
  const txs = pipeline('Sample OCPP Client Log .txt');

  it('builds the 2 complete transactions', () => {
    expect(txs).toHaveLength(2);
  });

  it('each transaction is well-formed', () => {
    for (const tx of txs) {
      expect(typeof tx.id).toBe('number');
      expect(typeof tx.meterStart).toBe('number');
      expect(typeof tx.meterStop).toBe('number');
      expect(['Completed', 'Aborted']).toContain(tx.status);
      expect(typeof tx.totalEnergy === 'number' || tx.totalEnergy === 'N/A').toBe(true);
    }
  });
});
