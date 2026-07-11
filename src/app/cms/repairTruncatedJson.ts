// Repair OCPP JSON that a CMS export truncated mid-value.
//
// Some customer CMS exports cap long cell values (e.g. Mahindra truncates Request
// strings at 4000 chars), which cuts large MeterValues payloads mid-array and yields
// unterminated JSON. This salvages the valid prefix: it scans for the last position
// where every open bracket could be cleanly closed (i.e. right after a completed
// bracket at any depth), truncates there, and appends the outstanding closers.
// The result is validated with JSON.parse, so it is strictly safe — it recovers the
// complete leading entries or returns null (caller then skips the row), never worse.

/**
 * Attempt to close a truncated JSON string at its last complete bracket.
 * @returns a parseable JSON string (valid prefix), or null if nothing can be salvaged.
 */
export function repairTruncatedJson(s: string): string | null {
  const stack: string[] = []; // outstanding expected closers, innermost last
  let inStr = false;
  let esc = false;
  let bestCut = -1;
  let bestClosers = '';

  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (inStr) {
      if (esc) esc = false;
      else if (ch === '\\') esc = true;
      else if (ch === '"') inStr = false;
      continue;
    }
    if (ch === '"') {
      inStr = true;
    } else if (ch === '[') {
      stack.push(']');
    } else if (ch === '{') {
      stack.push('}');
    } else if (ch === ']' || ch === '}') {
      stack.pop();
      // Safe boundary: closing all still-open brackets here yields balanced JSON.
      bestCut = i + 1;
      bestClosers = [...stack].reverse().join('');
    }
  }

  if (bestCut < 0) return null;
  const candidate = s.slice(0, bestCut) + bestClosers;
  try {
    JSON.parse(candidate);
    return candidate;
  } catch {
    return null;
  }
}
