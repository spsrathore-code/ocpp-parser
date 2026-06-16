// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { renderShell } from '../../src/app/render/shell';

describe('renderShell — header + upload card + container', () => {
  it('builds the shell and returns live element references', () => {
    const root = document.createElement('div');
    const refs = renderShell(root);

    // Header chrome (theme toggle id is what initTheme binds to).
    expect(root.querySelector('#theme-toggle-btn')).not.toBeNull();
    expect(root.querySelector('#help-btn')).not.toBeNull();
    expect(root.textContent).toContain('OCPP Client Log Parser');

    // Upload card.
    expect(refs.fileInput).toBeInstanceOf(HTMLInputElement);
    expect(refs.fileInput.accept).toContain('.txt');
    expect(refs.fileInput.multiple).toBe(true);
    expect(refs.parseBtn.disabled).toBe(true);

    // Results mount point.
    expect(refs.container.id).toBe('parsed-data-container');
    expect(root.contains(refs.container)).toBe(true);
  });

  it('enables the parse button once files are selected', () => {
    const root = document.createElement('div');
    const refs = renderShell(root);
    // jsdom can't set a real FileList; simulate the handler contract via a stub.
    Object.defineProperty(refs.fileInput, 'files', { value: [new File(['x'], 'a.txt')], configurable: true });
    refs.fileInput.dispatchEvent(new Event('change'));
    expect(refs.parseBtn.disabled).toBe(false);
  });
});
