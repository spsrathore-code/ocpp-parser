import { describe, it, expect } from 'vitest';
import { runCompliance } from '../../src/app/compliance/runCompliance';
import { cpInitiatedPack } from '../../src/app/compliance/rulepacks/cpInitiated';
import { createMessageGroups } from '../../src/app/model/types';
import { processTransactions } from '../../src/app/parse/processTransactions';
import type { ParsedMessage, InternalTxMap, MessageGroups } from '../../src/app/model/types';

const mk = (action: string, p: unknown, line: number, rp?: unknown): ParsedMessage => {
  const m: ParsedMessage = { timestamp: '2025-01-01T00:00:00.000Z', direction: 'sent', message: [2, `id-${line}`, action, p], lineNumber: line, fileName: 'f' };
  if (rp !== undefined) m.responsePayload = rp;
  return m;
};
const find = (groups: MessageGroups, id: string) => {
  const txMap: InternalTxMap = new Map();
  const txs = processTransactions(groups, txMap);
  const r = runCompliance(cpInitiatedPack, { messageGroups: groups, transactions: txs, internalTxMap: txMap, rawLogLines: [] });
  return r.groups.flatMap((g) => g.results).find((x) => x.id === id)!;
};

describe('DT / DIAG / FW rules', () => {
  it('DT-001 pass/fail on DataTransfer pairing (Other bucket)', () => {
    const pass = createMessageGroups();
    pass.Other.push(mk('DataTransfer', { vendorId: 'v' }, 1, { status: 'Accepted' }));
    expect(find(pass, 'DT-001').status).toBe('pass');

    const fail = createMessageGroups();
    fail.Other.push(mk('DataTransfer', { vendorId: 'v' }, 1));
    expect(find(fail, 'DT-001').status).toBe('fail');
  });

  it('DT-002 fail: UnknownVendorId response carries a data field', () => {
    const g = createMessageGroups();
    g.Other.push(mk('DataTransfer', { vendorId: 'v' }, 1, { status: 'UnknownVendorId', data: 'oops' }));
    expect(find(g, 'DT-002').status).toBe('fail');
  });

  it('DIAG-001 pass and FW-001 fail on pairing', () => {
    const g = createMessageGroups();
    g.Other.push(mk('DiagnosticsStatusNotification', { status: 'Uploaded' }, 1, {}));
    g.Other.push(mk('FirmwareStatusNotification', { status: 'Downloaded' }, 2)); // unanswered
    expect(find(g, 'DIAG-001').status).toBe('pass');
    expect(find(g, 'FW-001').status).toBe('fail');
  });
});
