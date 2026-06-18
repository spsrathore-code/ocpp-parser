// Shared display formatting for the render layer. Ported verbatim from the
// v2026.05.14 tool. Grows as later section batches need more formatters.

/** Human-readable offline-replay delay, e.g. "2h 30m" / "5s" (HTML 237). */
export function fmtReplayDelay(ms: number): string {
  const d = Math.floor(ms / 86400000);
  const h = Math.floor((ms % 86400000) / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  const parts: string[] = [];
  if (d > 0) parts.push(`${d}d`);
  if (h > 0) parts.push(`${h}h`);
  if (m > 0) parts.push(`${m}m`);
  if (d === 0 && h === 0 && m === 0) parts.push(`${s}s`);
  return parts.join(' ') || '0s';
}

/** A timestamp rendered in both UTC and IST (UTC+5:30). */
export interface UtcIst {
  utc: string;
  ist: string;
}

/** Format a date as `{ utc: 'YYYY-MM-DD HH:MM:SSZ', ist: 'YYYY-MM-DD HH:MM:SS IST' }` (HTML 2098). */
export function formatUtcIst(timestamp: Date | null): UtcIst {
  if (!timestamp) return { utc: 'N/A', ist: 'N/A' };
  const utcDate = timestamp.toISOString().split('T')[0];
  const utcTime = timestamp.toISOString().split('T')[1].split('.')[0] + 'Z';
  const ist = new Date(timestamp.getTime() + 5.5 * 60 * 60 * 1000);
  const istDate = ist.toISOString().split('T')[0];
  const istTime = ist.toISOString().split('T')[1].split('.')[0];
  return { utc: `${utcDate} ${utcTime}`, ist: `${istDate} ${istTime} IST` };
}

/** Log span as "Xh Ym" (HTML 2120). */
export function formatLogDuration(ms: number): string {
  const hours = Math.floor(ms / (1000 * 60 * 60));
  const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
  return `${hours}h ${minutes}m`;
}

/** UTC ISO timestamp → "DD/MM/YYYY HH:MM:SS IST" (UTC+5:30) (HTML 1598). */
export function convertToIST(utcTimestamp: string): string {
  try {
    const istDate = new Date(new Date(utcTimestamp).getTime() + 5.5 * 60 * 60 * 1000);
    const year = istDate.getUTCFullYear();
    const month = String(istDate.getUTCMonth() + 1).padStart(2, '0');
    const day = String(istDate.getUTCDate()).padStart(2, '0');
    const hours = String(istDate.getUTCHours()).padStart(2, '0');
    const minutes = String(istDate.getUTCMinutes()).padStart(2, '0');
    const seconds = String(istDate.getUTCSeconds()).padStart(2, '0');
    return `${day}/${month}/${year} ${hours}:${minutes}:${seconds} IST`;
  } catch {
    return utcTimestamp;
  }
}
