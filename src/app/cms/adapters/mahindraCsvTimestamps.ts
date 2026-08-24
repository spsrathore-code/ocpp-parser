// Mahindra CSV "Created On" normalization.
//
// The CSV export is the RAW portal string and is MM/DD/YYYY HH:MM:SS in IST.
// This differs from the .xlsx adapter, which reads Excel's REFORMATTED display
// string and parses d/m (see mahindraTimestamps.ts). Validated against the UTC
// `currentTime` inside response payloads: M/D matched 4763/4763 rows, D/M 0/4763,
// with no ambiguous rows. Using the d/m parser here would not fail loudly —
// "08/21/2026" would read as month 21 and silently roll into 2027.

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

// MM/DD/YYYY HH:MM:SS — month first, 4-digit year, seconds required.
// Month/day/hour are deliberately 1-or-2 digit (\d{1,2}): the real export is
// always zero-padded, but since the field order is fixed as month-first,
// digit width has no way to reintroduce the d/m ambiguity this parser exists
// to prevent — so there is no correctness reason to reject a plausible
// unpadded variant (e.g. "8/1/2026 5:00:00").
const MAH_CSV_TS_RE = /^\s*(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2}):(\d{2})\s*$/;

/** Convert a Mahindra CSV IST "Created On" to a UTC ISO instant, or null. */
export function mahindraCsvTimestampToUtcIso(value: string): string | null {
  if (typeof value !== 'string') return null;
  const m = value.match(MAH_CSV_TS_RE);
  if (!m) return null;
  const [, mo, dd, yyyy, hh, min, ss] = m;
  const month = Number(mo), day = Number(dd), hour = Number(hh);
  const minute = Number(min), second = Number(ss);
  if (month < 1 || month > 12 || day < 1 || day > 31 || hour > 23 || minute > 59 || second > 59) return null;
  const istAsUtcMs = Date.UTC(Number(yyyy), month - 1, day, hour, minute, second);
  const d = new Date(istAsUtcMs - IST_OFFSET_MS);
  // Date.UTC rolls invalid days over (e.g. Feb 31 -> Mar 3); reject instead.
  if (new Date(istAsUtcMs).getUTCDate() !== day) return null;
  return d.toISOString();
}
