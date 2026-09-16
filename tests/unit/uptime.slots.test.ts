import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { ingestUptimeSlots } from '../../src/app/uptime/ingest';

// Regression: two logs, one per upload slot, must analyze as TWO sites.
//
// They previously merged into one whenever both exports named their sheet the
// same thing — which is the normal case, since a single-charger export is often
// just "Sheet1". The result was a silent collapse to one site and the message
// "Only one site loaded", with every comparison section hidden.

const A = resolve(__dirname, '../../scratchpad/uptime-probe/siteA.xlsx');
const B = resolve(__dirname, '../../scratchpad/uptime-probe/siteB.xlsx');
const fixtures = existsSync(A) && existsSync(B);
const suite = fixtures ? describe : describe.skip;

/** Minimal File stand-in: jsdom's File lacks arrayBuffer() in this environment. */
function fileFrom(path: string, name: string): File {
  const buffer = readFileSync(path);
  return {
    name,
    arrayBuffer: async () => buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength),
    text: async () => buffer.toString('utf8'),
  } as unknown as File;
}

suite('upload slots are authoritative', () => {
  it('keeps two same-named sheets as two sites, one per slot', async () => {
    const sources = await ingestUptimeSlots([
      { label: 'Site A', files: [fileFrom(A, 'chargerA.xlsx')] },
      { label: 'Site B', files: [fileFrom(B, 'chargerB.xlsx')] },
    ]);
    // Both fixtures use a sheet named "Sheet1" — the collapse case.
    expect(sources).toHaveLength(2);
    expect(new Set(sources.map((s) => s.site)).size).toBe(2);
  });

  it('labels each site from its file when the sheet name identifies nothing', async () => {
    // Both fixtures name their sheet "Sheet1", so the file name is the only
    // thing that tells the two chargers apart.
    const sources = await ingestUptimeSlots([
      { label: 'Site A', files: [fileFrom(A, 'chargerA.xlsx')] },
      { label: 'Site B', files: [fileFrom(B, 'chargerB.xlsx')] },
    ]);
    expect(sources.map((s) => s.site)).toEqual(['chargerA', 'chargerB']);
  });

  it('disambiguates by slot when even the file names collide', async () => {
    const sources = await ingestUptimeSlots([
      { label: 'Site A', files: [fileFrom(A, 'export.xlsx')] },
      { label: 'Site B', files: [fileFrom(B, 'export.xlsx')] },
    ]);
    expect(sources).toHaveLength(2);
    expect(sources[1].site).toContain('Site B');
  });

  it('keeps each slot rows separate — no cross-contamination', async () => {
    const sources = await ingestUptimeSlots([
      { label: 'Site A', files: [fileFrom(A, 'chargerA.xlsx')] },
      { label: 'Site B', files: [fileFrom(B, 'chargerB.xlsx')] },
    ]);
    expect(sources[0].rows.length).toBeGreaterThan(0);
    expect(sources[1].rows.length).toBeGreaterThan(0);
    expect(sources[0].rows[0].requestString).not.toBe(sources[1].rows[0].requestString);
  });

  it('still merges several files WITHIN one slot into a single site', async () => {
    // One charger split over two monthly exports is one continuous site.
    const sources = await ingestUptimeSlots([
      { label: 'Site A', files: [fileFrom(A, 'jan.xlsx'), fileFrom(A, 'feb.xlsx')] },
    ]);
    expect(sources).toHaveLength(1);
    expect(sources[0].fileName).toContain('jan.xlsx');
    expect(sources[0].fileName).toContain('feb.xlsx');
  });

  it('a single slot still yields one site', async () => {
    const sources = await ingestUptimeSlots([{ label: 'Site A', files: [fileFrom(A, 'a.xlsx')] }]);
    expect(sources).toHaveLength(1);
  });
});

// OCPP 1.6J carries no charger id, station or model name (Analysis_Spec_MD 4.5),
// so when a label matters the operator must be able to type it — the uploaded
// file name is arbitrary and the sheet name is often generic.
suite('typed site names', () => {
  it('uses the typed name for the slot instead of the derived one', async () => {
    const sources = await ingestUptimeSlots([
      { label: 'Site A', files: [fileFrom(A, 'whatever-export-2026.xlsx')], siteName: 'DC052' },
      { label: 'Site B', files: [fileFrom(B, 'another-file.xlsx')], siteName: 'DC053' },
    ]);
    expect(sources.map((s) => s.site)).toEqual(['DC052', 'DC053']);
  });

  it('trims whitespace and ignores a blank name', async () => {
    const sources = await ingestUptimeSlots([
      { label: 'Site A', files: [fileFrom(A, 'chargerA.xlsx')], siteName: '  MH0055  ' },
      { label: 'Site B', files: [fileFrom(B, 'chargerB.xlsx')], siteName: '   ' },
    ]);
    expect(sources[0].site).toBe('MH0055');
    expect(sources[1].site).toBe('chargerB');
  });

  it('falls back to derived names when the slot holds several sites', async () => {
    // A typed name addresses the slot; it cannot name two sheets at once.
    const sources = await ingestUptimeSlots([
      { label: 'Site A', files: [fileFrom(A, 'a.xlsx'), fileFrom(B, 'b.xlsx')], siteName: 'Both' },
    ]);
    expect(sources.length).toBeGreaterThanOrEqual(1);
    if (sources.length > 1) expect(sources.map((s) => s.site)).not.toContain('Both');
  });
});
