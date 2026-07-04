import type { FieldDef } from '../model/types';

export function buildCallFrame(action: string, messageId: string, payload: Record<string, unknown>): unknown[] {
  return [2, messageId, action, payload];
}

export function buildResultFrame(messageId: string, payload: Record<string, unknown>): unknown[] {
  return [3, messageId, payload];
}

/** Generate a plausible default response payload from the response field list. */
export function defaultResponse(fields: FieldDef[]): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const f of fields) {
    if (!f.required) continue;
    switch (f.type) {
      case 'enum': out[f.name] = f.enumValues?.[0] ?? ''; break;
      case 'integer': case 'number': out[f.name] = 0; break;
      case 'boolean': out[f.name] = true; break;
      case 'datetime': out[f.name] = new Date().toISOString(); break;
      case 'json': out[f.name] = {}; break;
      default: out[f.name] = '';
    }
  }
  return out;
}
