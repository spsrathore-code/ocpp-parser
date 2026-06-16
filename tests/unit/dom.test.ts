// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';

describe('jsdom environment', () => {
  it('provides document', () => {
    const div = document.createElement('div');
    div.textContent = 'hi';
    expect(div.textContent).toBe('hi');
  });
});
