// Phantom Connection detection (diagnostic L-001) — faithful port of the
// v2026.05.14 tool's `detectPhantomConnectionPattern` (HTML 5905). A phantom
// connection = unanswered BootNotification(s) while the WebSocket transport is
// alive (PING/PONG flowing) — i.e. CSMS application layer silent.
//
// Deviation (behaviour-preserving): the log lines are passed in instead of read
// from `window.rawLogLines`.

import type { ParsedMessage } from '../model/types';
import type { PhantomResult } from './types';

export function detectPhantomConnectionPattern(
  bootNotifications: ParsedMessage[],
  rawLogLines: string[],
): PhantomResult {
  const unanswered = bootNotifications.filter(
    (b) => b.responsePayload === null || b.responsePayload === undefined,
  );
  if (unanswered.length === 0) return { detected: false };

  const hasPingPong = rawLogLines.some((l) => l.includes('>> PING') || l.includes('<< PONG'));
  if (!hasPingPong) return { detected: false };

  unanswered.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  const responded = bootNotifications
    .filter((b) => b.responsePayload !== null && b.responsePayload !== undefined)
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  let durationStr = 'Unknown';
  if (responded.length > 0 && unanswered[0].timestamp) {
    const ms = new Date(responded[0].timestamp).getTime() - new Date(unanswered[0].timestamp).getTime();
    if (ms > 0) {
      const totalMins = Math.round(ms / 60000);
      durationStr = totalMins >= 60 ? `~${Math.floor(totalMins / 60)}h ${totalMins % 60}m` : `~${totalMins}m`;
    }
  }

  return {
    detected: true,
    unrespondedCount: unanswered.length,
    durationStr,
    affectedMsgIds: unanswered.map((b) => b.message[1] as string),
  };
}
