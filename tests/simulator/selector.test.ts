// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { renderSelector } from '../../src/simulator/render/selector';
import { buildCatalog } from '../../src/simulator/catalog/buildCatalog';

describe('renderSelector', () => {
  it('lists profile groups and fires onSelect', () => {
    const mount = document.createElement('div');
    const onSelect = vi.fn();
    renderSelector(mount, buildCatalog(), onSelect);
    // profile filter has all 6 groups
    const profileSel = mount.querySelector<HTMLSelectElement>('[data-role="profile"]')!;
    const opts = Array.from(profileSel.options).map(o => o.value);
    expect(opts).toContain('Smart Charging');
    // message dropdown populated
    const msgSel = mount.querySelector<HTMLSelectElement>('[data-role="message"]')!;
    expect(msgSel.options.length).toBeGreaterThan(0);
    // selecting a message fires the callback
    msgSel.value = 'Authorize';
    msgSel.dispatchEvent(new Event('change'));
    expect(onSelect).toHaveBeenCalledWith('Authorize');
  });
});
