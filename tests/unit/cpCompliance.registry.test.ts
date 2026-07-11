import { describe, it, expect } from 'vitest';
import { SECTION_ORDER } from '../../src/app/render/renderResults';

const NEW_TITLE = 'Protocol Compliance — CP-Initiated Operations (§4)';

describe('SECTION_ORDER registers CP-Initiated Compliance', () => {
  it('adds exactly one new section right after Protocol Compliance', () => {
    const titles = SECTION_ORDER.map((s) => s.title);
    const pc = titles.indexOf('Protocol Compliance');
    expect(pc).toBeGreaterThan(-1);
    expect(titles[pc + 1]).toBe(NEW_TITLE);
  });
  it('the new section declares an Excel export target', () => {
    const def = SECTION_ORDER.find((s) => s.title === NEW_TITLE)!;
    expect(def.exportTable?.id).toBe('cp-compliance-table');
  });
  it('does not remove any pre-existing section (count grows by exactly 1)', () => {
    expect(SECTION_ORDER.length).toBe(21); // 20 existing + 1 new
  });
});
