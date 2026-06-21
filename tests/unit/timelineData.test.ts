// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { getTimelineDataForTx, tlTime } from '../../src/app/render/timeline/timelineData';
import type { Transaction, ParsedMessage } from '../../src/app/model/types';

// Synthetic: one tx on connector 1, with a Preparing→Charging→Finishing status arc,
// MeterValues carrying SoC + Energy + Power + Temperature(Inlet), and a Stop.
const T0 = Date.parse('2026-01-21T10:00:00Z');
const min = (n: number) => T0 + n * 60_000;

function sn(connectorId: number, status: string, tOffsetMin: number, extra: Record<string, unknown> = {}): ParsedMessage {
  return { timestamp: new Date(min(tOffsetMin)).toISOString(), direction: 'sent',
    message: [2, 'id', 'StatusNotification', { connectorId, status, ...extra }] } as unknown as ParsedMessage;
}
function mvMsg(tOffsetMin: number, sampled: Array<Record<string, unknown>>): ParsedMessage {
  return { timestamp: new Date(min(tOffsetMin)).toISOString(), direction: 'sent',
    message: [2, 'id', 'MeterValues', { connectorId: 1, meterValue: [{ timestamp: new Date(min(tOffsetMin)).toISOString(), sampledValue: sampled }] }] } as unknown as ParsedMessage;
}

const tx: Transaction = {
  id: 555, startTime: new Date(min(0)).toISOString(), stopTime: new Date(min(30)).toISOString(),
  connectorId: 1, idTag: 'TAG1', meterStart: 1000, meterStop: 6000, stopReason: 'Local',
  totalEnergy: 5, duration: 30, socBegin: '20', socEnd: '80',
  meterValues: [
    mvMsg(1, [{ measurand: 'SoC', value: '20', context: 'Transaction.Begin' }, { measurand: 'Energy.Active.Import.Register', value: '1000', unit: 'Wh' }, { measurand: 'Power.Active.Import', value: '7000', unit: 'W' }, { measurand: 'Temperature', value: '40', location: 'Inlet' }]),
    mvMsg(29, [{ measurand: 'SoC', value: '80', context: 'Transaction.End' }, { measurand: 'Energy.Active.Import.Register', value: '6000', unit: 'Wh' }]),
  ],
  isOfflineReplay: false, logTimestamp: new Date(min(0)).toISOString(), replayDelayMs: 0, internalTransactionId: null,
};
const messages: ParsedMessage[] = [
  sn(1, 'Available', -8), sn(1, 'Preparing', -2), sn(1, 'Charging', 1), sn(1, 'Finishing', 31), sn(1, 'Available', 33),
  ...tx.meterValues,
];

describe('getTimelineDataForTx (FR-210/211/215/222)', () => {
  const data = getTimelineDataForTx(555, [tx], messages)!;

  it('returns null for an unknown tx', () => {
    expect(getTimelineDataForTx(999, [tx], messages)).toBeNull();
  });

  it('windows 10 min before start and after stop', () => {
    expect(data.winStart).toBe(min(0) - 10 * 60_000);
    expect(data.winEnd).toBe(min(30) + 10 * 60_000);
  });

  it('builds ordered markers incl. Start/Charging/Stop/Finishing/Available', () => {
    const labels = data.markers.map((m) => m.label);
    expect(labels.some((l) => l.includes('Available'))).toBe(true);
    expect(labels.some((l) => l.includes('Preparing'))).toBe(true);
    expect(labels.some((l) => l.includes('Charging'))).toBe(true);
    expect(labels.some((l) => l.includes('StartTransaction'))).toBe(true);
    expect(labels.some((l) => l.includes('Stop'))).toBe(true);
    expect(labels.some((l) => l.includes('Finishing'))).toBe(true);
    // markers are time-sorted
    const ts = data.markers.map((m) => m.t);
    expect(ts).toEqual([...ts].sort((a, b) => a - b));
    // no Phantom marker (legacy parity — 10-marker set)
    expect(labels.some((l) => l.includes('Phantom'))).toBe(false);
  });

  it('breaks MeterValues into measurand tracks', () => {
    expect(data.mv.soc.map((p) => p.v)).toEqual([20, 80]);
    expect(data.mv.energy.map((p) => p.v)).toEqual([1000, 6000]);
    expect(data.mv.power.map((p) => p.v)).toEqual([7000]);
    expect(data.mv.tempInlet.map((p) => p.v)).toEqual([40]);
    expect(data.mv.soc[0].ctx).toContain('Begin');
  });

  it('builds a swimlane for connector 1', () => {
    expect(data.swimlanes.map((s) => s.connectorId)).toContain(1);
    const lane = data.swimlanes.find((s) => s.connectorId === 1)!;
    expect(lane.events.map((e) => e.status)).toEqual(['Available', 'Preparing', 'Charging', 'Finishing', 'Available']);
  });
});

describe('tlTime', () => {
  it('formats short HH:MM and full HH:MM:SS IST', () => {
    const ts = Date.parse('2026-01-21T10:00:00Z');
    expect(tlTime(ts, true)).toMatch(/^\d{2}:\d{2}$/);
    expect(tlTime(ts, false)).toMatch(/IST$/);
  });
});

// ── Smoke test: modal shell (Step 6) ────────────────────────────────────────
import { createSessionTimelineModal } from '../../src/app/render/timeline/sessionTimeline';

it('opens a modal with a 4-tab bar', () => {
  createSessionTimelineModal(555, [tx], messages); // reuse the fixture
  const modal = document.querySelector('[data-timeline-modal]');
  expect(modal).not.toBeNull();
  expect(modal!.textContent).toContain('Session');
  expect(modal!.textContent).toContain('Energy');
  expect(modal!.textContent).toContain('Status');
  expect(modal!.textContent).toContain('Telemetry');
});
