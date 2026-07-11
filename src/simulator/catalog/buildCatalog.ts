import { OCPP16 } from 'typed-ocpp';
import type { MessageDef, FieldDef } from '../model/types';
import { fieldsFromSchema } from './schemaFields';
import { MESSAGE_META, ACTIONS } from './metadata';
import { TRAINING_OVERLAY } from './training';
import { MESSAGE_DESCRIPTIONS } from './descriptions';

const schemas = OCPP16.schemas as unknown as Record<string, unknown>;

/** Layer training-friendly default values onto schema-derived fields (does not change shape). */
function applyDefaults(fields: FieldDef[], action: string): FieldDef[] {
  const defaults = TRAINING_OVERLAY[action]?.defaults;
  if (!defaults) return fields;
  return fields.map(f => (defaults[f.name] !== undefined ? { ...f, default: defaults[f.name] } : f));
}

/** Build the full 28-message catalog from typed-ocpp's schemas + the metadata overlay. */
export function buildCatalog(): MessageDef[] {
  return ACTIONS.map((action): MessageDef => {
    const meta = MESSAGE_META[action];
    return {
      action,
      profile: meta.profile,
      direction: meta.direction,
      description: MESSAGE_DESCRIPTIONS[action],
      request: applyDefaults(fieldsFromSchema(schemas[`${action}Request`]), action),
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
