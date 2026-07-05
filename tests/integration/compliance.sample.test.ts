import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { analyzeLogLines } from '../../src/app/analyze';

function load(name: string): string[] {
  const path = fileURLToPath(new URL(`../../data/samples/${name}`, import.meta.url));
  return readFileSync(path, 'utf8').split(/\r?\n/);
}

// Two representative real logs (the 37 MB .log is excluded to keep the suite fast).
const SAMPLES = [
  'Sample OCPP Client Log .txt',
  'TS0064 Emergency Stop No Available Status 13 March 2026.txt',
];

describe('§4 compliance over real sample logs', () => {
  for (const f of SAMPLES) {
    it(`runs without crashing and yields 49 results on ${f}`, () => {
      const r = analyzeLogLines(load(f), f);
      const results = r.cpCompliance.groups.flatMap((g) => g.results);
      expect(results).toHaveLength(49);
      // no rule throws → every result has a defined status
      expect(results.every((x) => ['pass', 'warn', 'fail', 'info'].includes(x.status))).toBe(true);
      // weighted score is a valid percent
      expect(r.cpCompliance.summary.weightedScore).toBeGreaterThanOrEqual(0);
      expect(r.cpCompliance.summary.weightedScore).toBeLessThanOrEqual(100);
    });
  }
});
