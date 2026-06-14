import { createMessageGroups } from '../model/types';
import type { ParsedMessage, MessageGroups, MessageGroupKey } from '../model/types';

/**
 * Group correlated messages into the 7 buckets by action (`message[2]`); unknown
 * actions fall into `Other`. Ported verbatim from the tool's `groupMessagesByType`.
 */
export function groupMessagesByType(messages: ParsedMessage[]): MessageGroups {
  const grouped = createMessageGroups();
  for (const msg of messages) {
    const messageType = msg.message[2] as MessageGroupKey;
    if (Object.prototype.hasOwnProperty.call(grouped, messageType)) {
      grouped[messageType].push(msg);
    } else {
      grouped.Other.push(msg);
    }
  }
  return grouped;
}
