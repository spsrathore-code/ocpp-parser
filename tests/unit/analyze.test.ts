import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { analyzeLogLines } from '../../src/app/analyze';

function load(name: string): string[] {
  const path = fileURLToPath(new URL(`../../data/samples/${name}`, import.meta.url));
  return readFileSync(path, 'utf8').split(/\r?\n/);
}

describe('analyzeLogLines — full pipeline bundle (parity wiring)', () => {
  const result = analyzeLogLines(load('Sample OCPP Client Log .txt'), 'Sample OCPP Client Log .txt');

  it('produces every analysis field', () => {
    expect(result.transactions).toHaveLength(2);
    expect(result.messageGroups.StartTransaction.length).toBeGreaterThan(0);
    expect(Array.isArray(result.downtimes)).toBe(true);
    expect(result.wsHealth.connectionStatus).toBeDefined();
    expect(Array.isArray(result.protocol.groups)).toBe(true);
    expect(Array.isArray(result.connectorStats)).toBe(true);
    expect(Array.isArray(result.energyDispense)).toBe(true);
    expect(Array.isArray(result.incompleteTransactions)).toBe(true);
    expect(result.rawLogLines.length).toBeGreaterThan(0);
  });

  it('connector stats agree with transaction count', () => {
    const totalRows = result.connectorStats.reduce((n, r) => n + r.total, 0);
    expect(totalRows).toBe(result.transactions.length);
  });
});
