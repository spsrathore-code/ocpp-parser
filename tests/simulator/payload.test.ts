import { describe, it, expect } from 'vitest';
import { buildCallFrame, buildResultFrame, defaultResponse } from '../../src/simulator/render/payload';
import type { FieldDef } from '../../src/simulator/model/types';

describe('payload builders', () => {
  it('builds a Call frame', () => {
    expect(buildCallFrame('Authorize', 'id-1', { idTag: 'ABC' })).toEqual([2, 'id-1', 'Authorize', { idTag: 'ABC' }]);
  });
  it('builds a CallResult frame', () => {
    expect(buildResultFrame('id-1', { status: 'Accepted' })).toEqual([3, 'id-1', { status: 'Accepted' }]);
  });
  it('generates a default response filling required enum with first value', () => {
    const fields: FieldDef[] = [
      { name: 'status', type: 'enum', required: true, enumValues: ['Accepted', 'Rejected'] },
      { name: 'interval', type: 'integer', required: true },
    ];
    const r = defaultResponse(fields);
    expect(r.status).toBe('Accepted');
    expect(typeof r.interval).toBe('number');
  });
  it('empty response fields → empty object', () => {
    expect(defaultResponse([])).toEqual({});
  });
});
