// Field-case regression (/qa): the DC060 log where charging resumed after an
// errored session with no Charging status, and the same fault (BMSCommunicationTimeout)
// was reported under two errorCodes. Guards STATUS-010 and STATUS-011.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { analyzeLogLines } from '../../src/app/analyze';

const FILE = 'DC060 After Error Charging happening.txt';

describe('STATUS-010 / STATUS-011 on the DC060 field log', () => {
  const lines = readFileSync(resolve('data/samples', FILE), 'utf8').split(/\r?\n/);
  const results = analyzeLogLines(lines, FILE).cpCompliance.groups.flatMap((g) => g.results);
  const byId = (id: string) => results.find((r) => r.id === id)!;

  it('STATUS-010 flags MeterValues with no preceding Charging status', () => {
    expect(byId('STATUS-010').status).toBe('warn');
  });

  it('STATUS-011 flags the same fault reported under inconsistent errorCodes', () => {
    const s11 = byId('STATUS-011');
    expect(s11.status).toBe('warn');
    // BMSCommunicationTimeout appears as both EVCommunicationError and OtherError.
    expect(s11.affected.length).toBeGreaterThanOrEqual(2);
  });
});
