/**
 * Parse a JSON string from a log line, tolerating logs that escape quotes as `\"`.
 * Ported verbatim from the v2026.05.14 tool (`parseJsonSafely`), which fixed the
 * "escaped quotes parse failure" bug (Known Issues — Pre-Formal Bugs).
 */
export function parseJsonSafely(jsonStr: string): unknown {
  if (jsonStr.includes('\\"')) {
    jsonStr = jsonStr.replace(/\\"/g, '"');
  }
  return JSON.parse(jsonStr);
}
