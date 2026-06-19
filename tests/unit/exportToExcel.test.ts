// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { exportButton, exportTableToExcel } from '../../src/app/export/exportToExcel';

describe('exportButton', () => {
  it('renders a labeled "Export to Excel" button', () => {
    const b = exportButton('some-table', 'Some.xlsx');
    expect(b.tagName).toBe('BUTTON');
    expect(b.textContent).toBe('Export to Excel');
  });
});

describe('exportTableToExcel', () => {
  it('no-ops (logs) when the target table is absent — does not throw', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    await expect(exportTableToExcel('does-not-exist', 'f.xlsx')).resolves.toBeUndefined();
    expect(spy).toHaveBeenCalledWith('Table not found for export:', 'does-not-exist');
    spy.mockRestore();
  });
});
