import { OCPP16 } from 'typed-ocpp';
import type { MessageDef } from '../model/types';
import { fieldsFromSchema } from './schemaFields';
import { MESSAGE_META, ACTIONS } from './metadata';

const schemas = OCPP16.schemas as unknown as Record<string, unknown>;

/** Build the full 28-message catalog from typed-ocpp's schemas + the metadata overlay. */
export function buildCatalog(): MessageDef[] {
  return ACTIONS.map((action): MessageDef => {
    const meta = MESSAGE_META[action];
    return {
      action,
      profile: meta.profile,
      direction: meta.direction,
      request: fieldsFromSchema(schemas[`${action}Request`]),
      response: fieldsFromSchema(schemas[`${action}Response`]),
    };
  });
}

let cached: MessageDef[] | null = null;
function catalog(): MessageDef[] {
  if (!cached) cached = buildCatalog();
  return cached;
}

export function getMessage(action: string): MessageDef | undefined {
  return catalog().find(m => m.action === action);
}
