// Downtime detection engine — faithful port of the v2026.05.14 tool's
// `detectDowntimes` (HTML 1298, spec §9.1). Scans the raw log once to detect
// downtime start/recovery for each fault type, and harvests WebSocket PING/PONG
// events in the SAME pass (FR-334).
//
// Deviation from the original (behaviour-preserving): the WS heartbeat streams
// are RETURNED in the result instead of being written to `window._wsPingEvents`
// / `_wsPongEvents` / `_wsServerPings` globals. Same data, no global state — the
// §14 WebSocket-health module consumes them from the return value.

import type { ParsedMessage, ParsedAlert } from '../model/types';
import type { Downtime, WsEvent, DetectDowntimesResult } from './types';
import { downtimeConfig } from './downtimeConfig';

function formatDuration(durationMs: number): string {
  if (durationMs <= 0) return '00:00:00';
  const hours = Math.floor(durationMs / (1000 * 60 * 60));
  const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((durationMs % (1000 * 60)) / 1000);
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export function detectDowntimes(
  rawLogLines: string[],
  messages: ParsedMessage[],
  alerts: ParsedAlert[],
): DetectDowntimesResult {
  const downtimes: Downtime[] = [];
  const activeDowntimes = new Map<string, Downtime>();

  // Track last PING/PONG for accurate Connection Lost start time.
  let lastPingTime: string | null = null;
  let lastPingLineNumber: number | null = null;
  let lastPongTime: string | null = null;
  let lastPongLineNumber: number | null = null;

  // Collect all PING/PONG events for WebSocket health (Section 14) — same pass.
  const wsPingEvents: WsEvent[] = [];
  const wsPongEvents: WsEvent[] = [];
  const wsServerPings: WsEvent[] = [];

  rawLogLines.forEach((line, index) => {
    const timestampMatch = line.match(/\[([^\]]+)\]/);
    if (!timestampMatch) return;

    const timestamp = timestampMatch[1];
    const lineNumber = index + 1;
    const currentTime = new Date(timestamp);

    // Track PING/PONG for accurate Connection Lost start time.
    if (line.includes('[OCPPClient]') && line.includes('>> PING at')) {
      lastPingTime = timestamp;
      lastPingLineNumber = lineNumber;
    }
    if (line.includes('[OCPPClient]') && line.includes('<< PONG at')) {
      lastPongTime = timestamp;
      lastPongLineNumber = lineNumber;
    }

    // Harvest PING/PONG events for WebSocket health (Section 14).
    if (line.includes('[OCPPClient]') && line.includes('>> PING')) {
      wsPingEvents.push({ ts: timestamp, t: currentTime, lineNo: lineNumber });
    }
    if (line.includes('[OCPPClient]') && line.includes('<< PONG')) {
      wsPongEvents.push({ ts: timestamp, t: currentTime, lineNo: lineNumber });
    }
    if (line.includes('[OCPPClient]') && line.includes('<< PING')) {
      wsServerPings.push({ ts: timestamp, t: currentTime, lineNo: lineNumber });
    }

    // Track which downtimes started on this line (prevents same-line end detection).
    const downtimesStartedThisLine = new Set<string>();

    // --- Check for downtime START patterns FIRST ---
    for (const [reason, config] of Object.entries(downtimeConfig)) {
      let isStartMatch = false;
      if (config.customStartCheck) {
        isStartMatch = config.customStartCheck(line);
      } else if (config.startPattern) {
        isStartMatch = config.startPattern.test(line);
      }

      if (!isStartMatch) continue;

      if (config.isContinuousReporting && activeDowntimes.has(reason)) {
        // Continuous-reporting fault already active — refresh last-seen.
        const existingDowntime = activeDowntimes.get(reason)!;
        existingDowntime.lastSeenTime = timestamp;
        existingDowntime.lastSeenLineNumber = lineNumber;
      } else if (!activeDowntimes.has(reason)) {
        let actualStartTime = timestamp;
        let actualStartLineNumber = lineNumber;

        // For Connection Lost, use last PONG (or PING) as the real start time.
        if (config.useLastHeartbeatAsStart) {
          if (lastPongTime) {
            actualStartTime = lastPongTime;
            actualStartLineNumber = lastPongLineNumber!;
          } else if (lastPingTime) {
            actualStartTime = lastPingTime;
            actualStartLineNumber = lastPingLineNumber!;
          }
        }

        activeDowntimes.set(reason, {
          reason,
          startTime: actualStartTime,
          startLineNumber: actualStartLineNumber,
          endTime: null,
          endLineNumber: null,
          lastSeenTime: actualStartTime,
          lastSeenLineNumber: actualStartLineNumber,
        });
        downtimesStartedThisLine.add(reason);
      }
    }

    // --- Check for downtime END patterns (skip those started on this line) ---
    for (const [reason, config] of Object.entries(downtimeConfig)) {
      if (!activeDowntimes.has(reason)) continue;
      if (downtimesStartedThisLine.has(reason)) continue;

      const downtime = activeDowntimes.get(reason)!;
      const downtimeStartTime = new Date(downtime.startTime);
      const downtimeStartLineNumber = downtime.startLineNumber;

      if (lineNumber <= downtimeStartLineNumber) continue;

      for (const endPattern of config.endPatterns) {
        let shouldEnd = false;
        let endTimestamp = timestamp;
        let endLineNum = lineNumber;

        if (endPattern.type === 'bootnotification') {
          const isResponseLine = line.includes('<< message received:') || line.includes('message received:');
          const hasAcceptedStatus =
            line.includes('"status":"Accepted"') || line.includes('"status": "Accepted"');
          const hasInterval = line.includes('"interval":') || line.includes('"interval" :');

          if (isResponseLine && hasAcceptedStatus && hasInterval) {
            // Use the first StatusNotification AFTER this BootNotification line; its
            // internal payload timestamp is the correct synchronised post-reboot time.
            const firstStatusNotification = messages.find(
              (m) =>
                m.message &&
                m.message[2] === 'StatusNotification' &&
                m.direction === 'sent' &&
                m.lineNumber > lineNumber,
            );
            const snPayload = firstStatusNotification?.message[3] as { timestamp?: string } | undefined;

            if (firstStatusNotification && snPayload && snPayload.timestamp) {
              shouldEnd = true;
              endTimestamp = snPayload.timestamp;
              endLineNum = firstStatusNotification.lineNumber;
            } else {
              shouldEnd = true;
              endTimestamp = timestamp;
              endLineNum = lineNumber;
            }
          }
        } else if (endPattern.type === 'statusnotification' && endPattern.first) {
          if (!shouldEnd && line.includes('StatusNotification')) {
            const statusMsg = messages.find((m) => {
              if (m.message && m.message[2] === 'StatusNotification' && m.lineNumber === lineNumber) {
                return new Date(m.timestamp) > downtimeStartTime;
              }
              return false;
            });
            if (statusMsg) {
              shouldEnd = true;
              endTimestamp = statusMsg.timestamp;
              endLineNum = statusMsg.lineNumber;
            }
          }
        } else if (endPattern.type === 'log' && endPattern.pattern && endPattern.pattern.test(line)) {
          if (
            !shouldEnd &&
            currentTime > downtimeStartTime &&
            line.includes('[OCPPClient]') &&
            !line.toLowerCase().includes('disconnected') &&
            !line.toLowerCase().includes('sending') &&
            !line.includes('topic') &&
            !line.includes('hmi')
          ) {
            shouldEnd = true;
            endTimestamp = timestamp;
            endLineNum = lineNumber;
          }
        } else if (endPattern.type === 'powerfailure_recovery' || endPattern.type === 'emergencystop_recovery') {
          if (!shouldEnd && line.includes('StatusNotification')) {
            const hasConnector0 = line.includes('"connectorId":0') || line.includes('"connectorId": 0');
            const hasNoError = line.includes('"errorCode":"NoError"') || line.includes('"errorCode": "NoError"');
            const hasRecoveryStatus =
              line.includes('"status":"Available"') ||
              line.includes('"status": "Available"') ||
              line.includes('"status":"Preparing"') ||
              line.includes('"status": "Preparing"') ||
              line.includes('"status":"Charging"') ||
              line.includes('"status": "Charging"') ||
              line.includes('"status":"Finishing"') ||
              line.includes('"status": "Finishing"');

            if (hasConnector0 && hasNoError && hasRecoveryStatus) {
              if (new Date(timestamp) > downtimeStartTime) {
                shouldEnd = true;
                endTimestamp = timestamp;
                endLineNum = lineNumber;
              }
            }
          }
        } else if (endPattern.type === 'time_based_silence') {
          if (!shouldEnd && downtime.lastSeenTime) {
            const lastSeenTime = new Date(downtime.lastSeenTime);
            const silenceMs = currentTime.getTime() - lastSeenTime.getTime();
            if (endPattern.silenceThresholdMs !== undefined && silenceMs > endPattern.silenceThresholdMs) {
              shouldEnd = true;
              endTimestamp = downtime.lastSeenTime;
              endLineNum = downtime.lastSeenLineNumber;
            }
          }
        }

        if (shouldEnd) {
          const endTime = new Date(endTimestamp);
          if (endTime > downtimeStartTime) {
            downtime.endTime = endTimestamp;
            downtime.endLineNumber = endLineNum;

            const errorCodes = config.extractErrorCodes(downtime, messages, alerts);
            downtime.ocppErrorCode = errorCodes.ocppErrorCode;
            downtime.cpoErrorCode = errorCodes.cpoErrorCode;
            downtime.vendorErrorCode = errorCodes.vendorErrorCode;

            const startDate = new Date(downtime.startTime);
            const endDate = new Date(downtime.endTime);
            downtime.duration = formatDuration(endDate.getTime() - startDate.getTime());

            downtime.info = `Start detected at line ${downtime.startLineNumber}, Recovery at line ${endLineNum}`;

            downtimes.push({ ...downtime });
            activeDowntimes.delete(reason);

            // Reset PING/PONG tracking after Connection Lost recovery.
            if (reason === 'Connection Lost') {
              lastPingTime = null;
              lastPingLineNumber = null;
              lastPongTime = null;
              lastPongLineNumber = null;
            }
            break;
          }
        }
      }
    }
  });

  // Any remaining active downtimes are unresolved → Ongoing.
  activeDowntimes.forEach((downtime, reason) => {
    const config = downtimeConfig[reason];
    const errorCodes = config.extractErrorCodes(downtime, messages, alerts);
    downtime.ocppErrorCode = errorCodes.ocppErrorCode;
    downtime.cpoErrorCode = errorCodes.cpoErrorCode;
    downtime.vendorErrorCode = errorCodes.vendorErrorCode;
    downtime.duration = 'Ongoing';
    downtime.info = `Start detected at line ${downtime.startLineNumber}, Recovery: Ongoing`;
    downtimes.push({ ...downtime });
  });

  // Sort chronologically (earliest first).
  downtimes.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

  return {
    downtimes,
    wsEvents: { pings: wsPingEvents, pongs: wsPongEvents, serverPings: wsServerPings },
  };
}
