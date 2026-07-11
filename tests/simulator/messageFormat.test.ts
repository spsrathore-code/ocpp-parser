import { describe, it, expect } from 'vitest';
import { renderMessageFormat } from '../../src/simulator/render/messageFormat';
import type { FieldDef } from '../../src/simulator/model/types';

describe('renderMessageFormat', () => {
  it('renders Request and Response field tables with required/type', () => {
    const req: FieldDef[] = [{ name: 'idTag', type: 'string', required: true }];
    const res: FieldDef[] = [{ name: 'idTagInfo', type: 'json', required: true }];
    const html = renderMessageFormat(req, res);
    expect(html).toMatch(/Request Format/);
    expect(html).toMatch(/Response Format/);
    expect(html).toMatch(/idTag/);
    expect(html).toMatch(/required/);
    expect(html).toMatch(/idTagInfo/);
  });

  it('shows a placeholder for an empty field list', () => {
    expect(renderMessageFormat([], [])).toMatch(/No fields/);
  });
});
