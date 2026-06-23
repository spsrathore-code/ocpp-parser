// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { renderCpCompliance } from '../../src/app/render/sections/cpCompliance';
import { analyzeLogLines } from '../../src/app/analyze';

const r = analyzeLogLines(['{"timestamp":"2025-01-01T00:00:00.000Z","message":[2,"a","BootNotification",{"chargePointVendor":"X","chargePointModel":"Y"}]}'], 'f.json');

describe('renderCpCompliance', () => {
  it('renders the weighted score badge and all 10 message groups', () => {
    const node = renderCpCompliance(r);
    expect(node.textContent).toContain('% Compliant');
    expect(node.querySelectorAll('[data-cpc-group]')).toHaveLength(10);
  });
  it('renders a table with the export target id and a severity column', () => {
    const node = renderCpCompliance(r);
    expect(node.querySelector('#cp-compliance-table')).toBeTruthy();
    expect(node.textContent).toContain('Severity');
    expect(node.textContent).toContain('Indeterminate'); // BootNotification-only log → STOP/STATUS/BOOT indeterminate rows present
  });
  it('does not crash and keeps the export table present', () => {
    const node = renderCpCompliance(r);
    expect(node.querySelector('#cp-compliance-table')).toBeTruthy();
  });
});
