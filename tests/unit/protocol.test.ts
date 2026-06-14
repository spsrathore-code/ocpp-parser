import { describe, it, expect } from 'vitest';
import { runProtocolValidation } from '../../src/app/protocol/runProtocolValidation';
import { detectPhantomConnectionPattern } from '../../src/app/protocol/phantom';
import { processTransactions } from '../../src/app/parse/processTransactions';
import { createMessageGroups } from '../../src/app/model/types';
import type { ParsedMessage, InternalTxMap } from '../../src/app/model/types';

function mkMsg(action: string, payload: unknown, ts: string, lineNumber: number, responsePayload?: unknown): ParsedMessage {
  const m: ParsedMessage = { timestamp: ts, direction: 'sent', message: [2, `id-${lineNumber}`, action, payload], lineNumber, fileName: 'f' };
  if (responsePayload !== undefined) m.responsePayload = responsePayload;
  return m;
}

const T = '2025-08-22T';

/** One clean, fully-compliant transaction with every lifecycle status present. */
function happyScenario() {
  const groups = createMessageGroups();
  groups.BootNotification.push(
    mkMsg('BootNotification', { chargePointVendor: 'Ador', chargePointModel: 'DC-60' }, `${T}00:00:00.000Z`, 1, {
      status: 'Accepted',
      interval: 300,
      currentTime: `${T}00:00:00Z`,
    }),
  );
  groups.Heartbeat.push(mkMsg('Heartbeat', {}, `${T}00:01:00.000Z`, 2, { currentTime: `${T}00:01:00Z` }));
  groups.StatusNotification.push(
    mkMsg('StatusNotification', { connectorId: 1, status: 'Available', errorCode: 'NoError' }, `${T}00:05:00.000Z`, 3),
    mkMsg('StatusNotification', { connectorId: 1, status: 'Preparing', errorCode: 'NoError' }, `${T}00:09:00.000Z`, 4),
    mkMsg('StatusNotification', { connectorId: 1, status: 'Charging', errorCode: 'NoError' }, `${T}00:11:00.000Z`, 7),
    mkMsg('StatusNotification', { connectorId: 1, status: 'Finishing', errorCode: 'NoError' }, `${T}00:20:30.000Z`, 12),
  );
  groups.StartTransaction.push(
    mkMsg('StartTransaction', { connectorId: 1, idTag: 'TAG1', meterStart: 1000, timestamp: `${T}00:10:00Z` }, `${T}00:10:00.000Z`, 5, {
      transactionId: 100,
      idTagInfo: { status: 'Accepted' },
    }),
  );
  groups.MeterValues.push(
    mkMsg('MeterValues', { transactionId: 100, meterValue: [{ timestamp: `${T}00:10:01Z`, sampledValue: [{ context: 'Transaction.Begin', measurand: 'Energy.Active.Import.Register', value: '1000' }] }] }, `${T}00:10:01.000Z`, 6),
    mkMsg('MeterValues', { transactionId: 100, meterValue: [{ timestamp: `${T}00:15:00Z`, sampledValue: [{ context: 'Sample.Periodic', measurand: 'Power.Active.Import', value: '30000', unit: 'W' }] }] }, `${T}00:15:00.000Z`, 8),
  );
  groups.StopTransaction.push(
    mkMsg('StopTransaction', { transactionId: 100, meterStop: 6000, reason: 'Local', timestamp: `${T}00:20:00Z` }, `${T}00:20:00.000Z`, 11, { idTagInfo: { status: 'Accepted' } }),
  );
  const internalTxMap: InternalTxMap = new Map([['100', 'internal_100']]);
  const transactions = processTransactions(groups, internalTxMap);
  return { groups, transactions, internalTxMap };
}

describe('runProtocolValidation — structure & happy path', () => {
  const { groups, transactions, internalTxMap } = happyScenario();
  const res = runProtocolValidation(groups, transactions, internalTxMap, []);
  const find = (id: string) => res.groups.flatMap((g) => g.checks).find((c) => c.id === id)!;

  it('produces the 5 groups and 21 system checks (source-faithful count)', () => {
    expect(res.groups.map((g) => g.id)).toEqual(['BOOT', 'RESP', 'TXC', 'STATUS', 'MV']);
    expect(res.summary.total).toBe(21);
  });

  it('passes the key checks on a clean transaction and reports zero failures', () => {
    expect(find('BOOT-001').status).toBe('pass');
    expect(find('BOOT-003').status).toBe('pass');
    expect(find('BOOT-004').status).toBe('pass'); // no phantom
    expect(find('RESP-001').status).toBe('pass');
    expect(find('TXC-003').status).toBe('pass'); // 5 kWh dispensed
    expect(find('STATUS-004').status).toBe('pass'); // Charging present
    expect(find('MV-001').status).toBe('pass'); // Transaction.Begin present
    expect(res.summary.failed).toBe(0);
    expect(res.summary.compliance).toBeGreaterThanOrEqual(90);
  });

  it('builds a per-transaction lifecycle that is all-pass', () => {
    expect(res.perTransactionResults).toHaveLength(1);
    const ptx = res.perTransactionResults[0];
    expect(ptx.txId).toBe(100);
    expect(ptx.overallStatus).toBe('pass');
    expect(ptx.failedCount).toBe(0);
    expect(ptx.internalTransactionId).toBe('internal_100');
    expect(ptx.lifecycle.find((s) => s.stage === 'StartTransaction Sent')!.status).toBe('pass');
    expect(ptx.lifecycle).toHaveLength(10);
  });
});

describe('runProtocolValidation — phantom connection lowers compliance', () => {
  it('fails BOOT-004 when an unanswered BootNotification coincides with live PING/PONG', () => {
    const groups = createMessageGroups();
    groups.BootNotification.push(mkMsg('BootNotification', {}, `${T}00:00:00.000Z`, 1)); // no response → unanswered
    const rawLines = [`[${T}00:00:30.000Z] %c[OCPPClient] >> PING at ${T}00:00:30.000Z color: cyan;`];

    const res = runProtocolValidation(groups, [], new Map(), rawLines);
    const boot004 = res.groups.flatMap((g) => g.checks).find((c) => c.id === 'BOOT-004')!;
    expect(boot004.status).toBe('fail');
    expect(res.summary.failed).toBeGreaterThanOrEqual(1);
    expect(res.summary.compliance).toBeLessThan(100);
  });
});

describe('detectPhantomConnectionPattern', () => {
  it('detects unanswered boots while PING/PONG is alive', () => {
    const boots = [mkMsg('BootNotification', {}, `${T}00:00:00.000Z`, 1)];
    const r = detectPhantomConnectionPattern(boots, ['x >> PING y']);
    expect(r.detected).toBe(true);
    expect(r.unrespondedCount).toBe(1);
  });

  it('does not detect when all boots are answered', () => {
    const boots = [mkMsg('BootNotification', {}, `${T}00:00:00.000Z`, 1, { status: 'Accepted' })];
    expect(detectPhantomConnectionPattern(boots, ['x >> PING y']).detected).toBe(false);
  });

  it('does not detect when there is no PING/PONG activity', () => {
    const boots = [mkMsg('BootNotification', {}, `${T}00:00:00.000Z`, 1)];
    expect(detectPhantomConnectionPattern(boots, ['no heartbeat here']).detected).toBe(false);
  });
});
