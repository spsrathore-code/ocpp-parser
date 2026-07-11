import { describe, it, expect } from 'vitest';
import { readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { OCPP16 } from 'typed-ocpp';

const localDir = fileURLToPath(new URL('../../src/schemas/ocpp-1.6', import.meta.url));

/** Local file basename → typed-ocpp schema key. */
function fileToKey(file: string): string {
  const base = file.replace(/\.json$/, '');
  return base.endsWith('Response') ? base : `${base}Request`;
}

describe('schema drift — local 56 .json vs typed-ocpp bundled (spec §6/§10)', () => {
  const localKeys = readdirSync(localDir)
    .filter(f => f.endsWith('.json'))
    .map(fileToKey)
    .sort();
  const libKeys = Object.keys(OCPP16.schemas).sort();

  it('both sources expose exactly 56 schemas', () => {
    expect(localKeys).toHaveLength(56);
    expect(libKeys).toHaveLength(56);
  });

  it('the local reference set matches the typed-ocpp runtime set (no drift)', () => {
    const onlyLocal = localKeys.filter(k => !libKeys.includes(k));
    const onlyLib = libKeys.filter(k => !localKeys.includes(k));
    expect({ onlyLocal, onlyLib }).toEqual({ onlyLocal: [], onlyLib: [] });
  });
});
