import { describe, it, expect } from 'vitest';
import { fieldsFromSchema } from '../../src/simulator/catalog/schemaFields';

describe('fieldsFromSchema', () => {
  it('maps scalar + maxLength + required', () => {
    const schema = { type: 'object', properties: { idTag: { type: 'string', maxLength: 20 } }, required: ['idTag'] };
    const [f] = fieldsFromSchema(schema);
    expect(f).toMatchObject({ name: 'idTag', type: 'string', required: true, maxLength: 20 });
  });

  it('maps enum', () => {
    const schema = { type: 'object', properties: { type: { type: 'string', enum: ['Hard', 'Soft'] } }, required: ['type'] };
    const [f] = fieldsFromSchema(schema);
    expect(f.type).toBe('enum');
    expect(f.enumValues).toEqual(['Hard', 'Soft']);
  });

  it('maps date-time to datetime', () => {
    const schema = { type: 'object', properties: { currentTime: { type: 'string', format: 'date-time' } } };
    expect(fieldsFromSchema(schema)[0].type).toBe('datetime');
  });

  it('maps object/array to json', () => {
    const schema = { type: 'object', properties: { meterValue: { type: 'array', items: {} } } };
    expect(fieldsFromSchema(schema)[0].type).toBe('json');
  });

  it('returns [] for an empty schema', () => {
    expect(fieldsFromSchema({ type: 'object', properties: {} })).toEqual([]);
    expect(fieldsFromSchema({})).toEqual([]);
  });
});
