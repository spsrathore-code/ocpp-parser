// Duration and timestamp formatting for the Uptime analysis.
//
// The reference workbook formats every duration with Excel's "[h]:mm:ss". The
// square brackets are load-bearing: they make the hour field UNBOUNDED. Plain
// "h:mm:ss" wraps at 24h, so DC052's 36:40:27 HighTemperature outage would
// render as 12:40:27 — understating downtime by a full day with no error shown.
// Never format these with Date/toISOString helpers, which all wrap.
//
// Timestamps are stored UTC throughout and displayed IST (UTC + 5:30), per the
// workbook's build principle 4: "All timestamps are stored UTC and displayed
// IST. Never mix."

/** Minutes IST runs ahead of UTC. */
export const IST_OFFSET_MIN = 5 * 60 + 30;

const pad2 = (n: number): string => String(n).padStart(2, '0');

/**
 * Format a duration in seconds as `[h]:mm:ss` — hours unbounded, never wrapping.
 * A negative input is rendered with a leading '-' rather than silently mangled;
 * durations should never be negative, so a '-' in the UI is a visible bug report.
 */
export function formatDuration(totalSeconds: number): string {
  const sign = totalSeconds < 0 ? '-' : '';
  const s = Math.abs(Math.round(totalSeconds));
  const hours = Math.floor(s / 3600);
  const minutes = Math.floor((s % 3600) / 60);
  const seconds = s % 60;
  return `${sign}${hours}:${pad2(minutes)}:${pad2(seconds)}`;
}

/**
 * Human-readable outage length for the flat outage list (Outage_<Site> col N).
 * `null` means the episode never closed before the log ended — reported as such
 * rather than as a zero duration, because it is excluded from every total and
 * therefore understates downtime by an unknown amount.
 */
export function formatOutageText(durationSec: number | null): string {
  if (durationSec === null) return 'unresolved at log end';
  const s = Math.round(durationSec);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h} hr ${m} min ${sec} sec`;
  if (m > 0) return `${m} min ${sec} sec`;
  return `${sec} sec`;
}

/** Render a UTC epoch-ms instant as an IST wall-clock string `YYYY-MM-DD HH:MM:SS`. */
export function toIstIso(utcMs: number): string {
  const d = new Date(utcMs + IST_OFFSET_MIN * 60_000);
  return (
    `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())} ` +
    `${pad2(d.getUTCHours())}:${pad2(d.getUTCMinutes())}:${pad2(d.getUTCSeconds())}`
  );
}
