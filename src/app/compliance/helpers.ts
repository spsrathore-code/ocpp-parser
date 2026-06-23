// Shared accessors + eval helpers for compliance rules. Frames are ParsedMessage;
// payload = message[3]; response = responsePayload (null if unanswered).
import type { ParsedMessage, MessageGroups } from '../model/types';
import type { AffectedItem, ComplianceEvalOutput } from './types';

export const payload = <T>(m: ParsedMessage): T => (m.message[3] ?? {}) as T;
export const resp = <T>(m: ParsedMessage): T | null => (m.responsePayload ?? null) as T | null;
export const hasResp = (m: ParsedMessage): boolean => m.responsePayload !== null && m.responsePayload !== undefined;
export const msgId = (m: ParsedMessage): string => m.message[1] as string;
export const itemOf = (m: ParsedMessage, label: string): AffectedItem => ({ label, lineNumber: m.lineNumber });

/** Messages for an action. messageGroups only keys 6 actions + 'Other'; Authorize,
 *  DataTransfer, DiagnosticsStatusNotification, FirmwareStatusNotification, etc.
 *  fall into Other (grouped by message[2]). Returns the named group if present,
 *  else filters Other by action name. */
export function byAction(mg: MessageGroups, action: string): ParsedMessage[] {
  const known = (mg as unknown as Record<string, ParsedMessage[] | undefined>)[action];
  if (known) return known;
  return mg.Other.filter((m) => m.message[2] === action);
}

/** Generic "every X.req received an X.conf" pairing check. */
export function pairingResult(reqs: ParsedMessage[], label: string): ComplianceEvalOutput {
  if (reqs.length === 0) return { status: 'info', details: `No ${label} messages to check`, affected: [] };
  const unanswered = reqs.filter((m) => !hasResp(m));
  if (unanswered.length === 0) return { status: 'pass', details: `All ${reqs.length} ${label}.req received a .conf`, affected: [] };
  return {
    status: 'fail',
    details: `${unanswered.length}/${reqs.length} ${label}.req without a .conf response`,
    affected: unanswered.map((m) => itemOf(m, msgId(m))),
  };
}
