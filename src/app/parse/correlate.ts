import type { ParsedMessage } from '../model/types';

/**
 * Pair Call (msgType 2) requests with their CallResult (msgType 3) responses by
 * MessageId, and return **only the requests**, each annotated with
 * `responsePayload` = the response's payload (`message[2]` of the CallResult), or
 * `null` if unanswered. Ported verbatim from the tool's `correlateMessages`.
 *
 * Note (parity): output order is request first-seen order (Map insertion);
 * responses are not emitted as standalone entries; a reused MessageId overwrites
 * the earlier request — all matching the original behaviour exactly.
 */
export function correlateMessages(messages: ParsedMessage[]): ParsedMessage[] {
  const messageMap = new Map<unknown, { request?: ParsedMessage; response?: ParsedMessage }>();

  for (const msg of messages) {
    const messageId = msg.message[1];
    if (msg.message[0] === 2) {
      messageMap.set(messageId, { request: msg });
    } else if (msg.message[0] === 3) {
      const entry = messageMap.get(messageId);
      if (entry) entry.response = msg;
    }
  }

  const correlated: ParsedMessage[] = [];
  for (const pair of messageMap.values()) {
    if (pair.request) {
      pair.request.responsePayload = pair.response ? pair.response.message[2] : null;
      correlated.push(pair.request);
    }
  }
  return correlated;
}
