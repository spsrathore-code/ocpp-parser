import { validateMessage, ExchangeTracker } from '../../services/validation';
import type { MessageResult } from '../../services/validation';

export function validateFrame(frame: unknown[]): MessageResult {
  return validateMessage(frame);
}

export function newTracker(): ExchangeTracker {
  return new ExchangeTracker();
}

/** Human-readable violation lines for the validation panel. */
export function formatViolations(r: MessageResult): string[] {
  return r.violations.map(v => `[${v.layer}] ${v.message}${v.path ? ` (${v.path})` : ''}`);
}
