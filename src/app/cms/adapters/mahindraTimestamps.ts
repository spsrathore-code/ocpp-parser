// Mahindra "Created On" timestamp normalization.
//
// Mahindra records a single IST wall-clock per row, displayed as "d/m/yy H:MM".
// The adapter reads it as FORMATTED TEXT (parseCmsWorkbook keeps cellNF:true) and
// parses it here — it deliberately does NOT decode the raw Excel serial. In this
// customer's export the serial is written with an m/d format, so serial 46060
// decodes to "Feb 7" while the OCPP payload proves the event is 2 July; parsing
// the display string as d/m matched the payload date 295/460 rows and m/d 0/460.
// Verified IST: "2/7/26 15:19" == payload currentTime 2026-07-02T09:49Z (+5:30).

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

// d/m/yy[yy] H:MM[:SS]  — day/month order, 2- or 4-digit year, optional seconds.
const MAH_TS_RE = /^\s*(\d{1,2})\/(\d{1,2})\/(\d{2,4})\s+(\d{1,2}):(\d{2})(?::(\d{2}))?\s*$/;

/**
 * Convert a Mahindra IST "Created On" display string ("d/m/yy H:MM") to a UTC ISO
 * instant. Returns null for blank/unparseable input, or for a raw numeric serial
 * (unreliable month in this export — must be read as formatted text instead).
 */
export function mahindraTimestampToUtcIso(value: string): string | null {
  if (typeof value !== 'string') return null;
  const m = value.match(MAH_TS_RE);
  if (!m) return null;
  const [, dd, mm, yy, hh, min, ss] = m;
  const year = yy.length === 2 ? 2000 + Number(yy) : Number(yy);
  const istAsUtcMs = Date.UTC(year, Number(mm) - 1, Number(dd), Number(hh), Number(min), ss ? Number(ss) : 0);
  return new Date(istAsUtcMs - IST_OFFSET_MS).toISOString();
}
