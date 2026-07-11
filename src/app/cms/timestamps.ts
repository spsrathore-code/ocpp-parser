// CMS timestamp normalization.
//
// CMS Excel logs record wall-clock time in the customer's local zone. For CZ that
// is IST (UTC+5:30), formatted "dd/mm/yyyy, HH:MM:SS" — proven by the sample, where
// Request Time `08/08/2025, 00:02:42` equals payload `currentTime 2025-08-07T18:32:42Z`.
//
// The whole render layer treats `ParsedMessage.timestamp` as a UTC ISO string and
// derives IST for display (see render/format.ts `formatUtcIst`/`convertToIST`). So
// the adapter must store the UTC instant; the UI shows IST back to the customer.

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

// dd/mm/yyyy[,] HH:MM:SS  — comma optional, one-or-more spaces before the time.
const CZ_TS_RE = /^\s*(\d{1,2})\/(\d{1,2})\/(\d{4}),?\s+(\d{1,2}):(\d{2}):(\d{2})\s*$/;

/**
 * Convert a CZ IST wall-clock string ("dd/mm/yyyy, HH:MM:SS") to a UTC ISO 8601
 * instant. Returns `null` for blank or unparseable input so the caller can fall
 * back to another column.
 */
export function istToUtcIso(raw: string): string | null {
  if (!raw) return null;
  const m = raw.match(CZ_TS_RE);
  if (!m) return null;
  const [, dd, mm, yyyy, hh, min, ss] = m;
  const istAsUtcMs = Date.UTC(+yyyy, +mm - 1, +dd, +hh, +min, +ss);
  return new Date(istAsUtcMs - IST_OFFSET_MS).toISOString();
}
