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
