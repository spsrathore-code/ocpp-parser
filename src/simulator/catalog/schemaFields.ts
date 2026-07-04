import type { FieldDef, FieldType } from '../model/types';

interface JsonSchemaProp {
  type?: string | string[];
  format?: string;
  enum?: string[];
  maxLength?: number;
}
interface JsonSchema {
  properties?: Record<string, JsonSchemaProp>;
  required?: string[];
}

function typeOf(prop: JsonSchemaProp): Pick<FieldDef, 'type' | 'enumValues' | 'maxLength'> {
  if (Array.isArray(prop.enum) && prop.enum.length > 0) {
    return { type: 'enum', enumValues: prop.enum };
  }
  const t = prop.type;
  if (t === 'string') {
    if (prop.format === 'date-time') return { type: 'datetime', maxLength: prop.maxLength };
    return { type: 'string', maxLength: prop.maxLength };
  }
  if (t === 'integer') return { type: 'integer' };
  if (t === 'number') return { type: 'number' };
  if (t === 'boolean') return { type: 'boolean' };
  // object / array / unknown → JSON editor
  return { type: 'json' as FieldType };
}

/** Convert a draft-04 JSON-schema object into the simulator's FieldDef list. */
export function fieldsFromSchema(schema: unknown): FieldDef[] {
  const s = (schema ?? {}) as JsonSchema;
  const props = s.properties;
  if (!props) return [];
  const required = new Set(s.required ?? []);
  return Object.entries(props).map(([name, prop]) => ({
    name,
    required: required.has(name),
    ...typeOf(prop),
  }));
}
