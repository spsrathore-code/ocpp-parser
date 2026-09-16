import { describe, it, expect } from 'vitest';
import { formatDuration, formatOutageText, toIstIso } from '../../src/app/uptime/duration';

// The reference workbook uses Excel's "[h]:mm:ss" format — square brackets mean
// the hour field is UNBOUNDED. Plain "h:mm:ss" wraps at 24h and silently
// understates multi-day downtime; DC052 legitimately reports 36:40:27.
describe('formatDuration ([h]:mm:ss semantics)', () => {
  it('formats zero', () => {
    expect(formatDuration(0)).toBe('0:00:00');
  });

  it('formats seconds only', () => {
    expect(formatDuration(1)).toBe('0:00:01');
    expect(formatDuration(59)).toBe('0:00:59');
  });

  it('formats minutes and seconds', () => {
    expect(formatDuration(41)).toBe('0:00:41');
    expect(formatDuration(694)).toBe('0:11:34');
    expect(formatDuration(3599)).toBe('0:59:59');
  });

  it('formats hours', () => {
    expect(formatDuration(3600)).toBe('1:00:00');
    expect(formatDuration(31622)).toBe('8:47:02');
  });

  it('does NOT wrap at 24 hours — the whole point of [h]:mm:ss', () => {
    expect(formatDuration(86400)).toBe('24:00:00');
    // DC052 HighTemperature: the workbook shows 36:40:27, not 12:40:27.
    expect(formatDuration(132027)).toBe('36:40:27');
    // DC052 by-error-code total: 49:49:03.
    expect(formatDuration(179343)).toBe('49:49:03');
    // DC052 site available time: 479:52:40 (two connectors × 239:56:20).
    expect(formatDuration(863780 * 2)).toBe('479:52:40');
  });

  it('renders a negative duration explicitly rather than silently mis-formatting', () => {
    expect(formatDuration(-1)).toBe('-0:00:01');
  });
});

// Outage_<Site> column N: a human-readable duration, or the unresolved marker.
describe('formatOutageText', () => {
  it('reports unresolved episodes rather than showing a zero duration', () => {
    expect(formatOutageText(null)).toBe('unresolved at log end');
  });

  it('uses seconds only under a minute', () => {
    expect(formatOutageText(16)).toBe('16 sec');
  });

  it('uses minutes and seconds under an hour', () => {
    expect(formatOutageText(94)).toBe('1 min 34 sec');
  });

  it('uses hours, minutes and seconds above an hour', () => {
    expect(formatOutageText(26135)).toBe('7 hr 15 min 35 sec');
  });
});

// All timestamps are stored UTC and displayed IST (UTC + 5:30). Never mixed.
describe('toIstIso', () => {
  it('shifts UTC to IST for display', () => {
    // DC052 window start: 2026-08-10 18:31:53 UTC = 2026-08-11 00:01:53 IST.
    expect(toIstIso(Date.UTC(2026, 7, 10, 18, 31, 53))).toBe('2026-08-11 00:01:53');
  });

  it('rolls the date forward across midnight', () => {
    expect(toIstIso(Date.UTC(2026, 7, 20, 18, 28, 13))).toBe('2026-08-20 23:58:13');
  });
});
