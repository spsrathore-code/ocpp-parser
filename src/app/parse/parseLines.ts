import { parseJsonSafely } from './parseJsonSafely';
import type {
  ParsedMessage,
  ParsedEvent,
  ParsedAlert,
  InternalTxMap,
  OcppRawMessage,
} from '../model/types';

export interface ParsedLines {
  messages: ParsedMessage[];
  events: ParsedEvent[];
  alerts: ParsedAlert[];
  internalTxMap: InternalTxMap;
}

// Parsing contract — regexes ported verbatim from spec §19.2 / the tool source.
const OCPP_RE = /(?:>>|<<) message (?:sent|received): ((\[|{).*(\]|}))/;
const EVENT_RE = /\[([^\]]+)\] handling \[OCPP\] event ({.*})/;
const RUNTIME_STOP_RE = /\[OCPPRuntime\] New State --> stop Transaction ({.*})/;
const STORED_TX_RE = /Stored transactionId (\d+) for internalTransactionId (internal_transId_\w+)/;
const TIMESTAMP_RE = /\[([^\]]+)\]/;

/**
 * Pure, synchronous line parser — extracts OCPP messages, events, alerts, and the
 * CMS↔internal transaction-id map from raw log lines.
 *
 * This is the parsing *logic* of `parseOcppLogsAsync`, decomposed out of the
 * chunked/async UI driver (1000-line chunks + 10 ms yields), which is a render-layer
 * concern and lives with the UI shell in a later phase. The per-line behaviour —
 * regexes, `parseJsonSafely`, the `N/A` defaults, and the two-source internalTxMap —
 * is identical to the original.
 */
export function parseLines(lines: string[], fileName: string): ParsedLines {
  const messages: ParsedMessage[] = [];
  const events: ParsedEvent[] = [];
  const alerts: ParsedAlert[] = [];
  const internalTxMap: InternalTxMap = new Map();

  for (let j = 0; j < lines.length; j++) {
    const line = lines[j];
    const lineNumber = j + 1;

    // OCPP message
    const ocppMatch = line.match(OCPP_RE);
    if (ocppMatch) {
      try {
        const message = parseJsonSafely(ocppMatch[1]) as OcppRawMessage;
        const tsMatch = line.match(TIMESTAMP_RE);
        const timestamp = tsMatch ? tsMatch[1] : new Date().toISOString();
        const direction = line.includes('>> message sent:') ? 'sent' : 'received';
        messages.push({ timestamp, direction, message, lineNumber, fileName });
      } catch {
        /* malformed JSON — skip, matching the original's warn-and-continue */
      }
    }

    // Event / Alert
    const eventMatch = line.match(EVENT_RE);
    if (eventMatch) {
      try {
        const timestamp = eventMatch[1];
        const eventData = parseJsonSafely(eventMatch[2]) as {
          type?: string;
          chargerId?: string;
          outlet?: string;
          payload?: { code?: string; msg?: string; session?: string } & Record<string, unknown>;
        };
        if (eventData.type === 'alert') {
          alerts.push({
            timestamp,
            chargerId: eventData.chargerId || 'N/A',
            outlet: eventData.outlet || 'N/A',
            code: eventData.payload?.code || 'N/A',
            message: eventData.payload?.msg || 'N/A',
            session: eventData.payload?.session || 'N/A',
            lineNumber,
            fileName,
          });
        } else {
          events.push({
            timestamp,
            type: eventData.type ?? 'N/A',
            chargerId: eventData.chargerId || 'N/A',
            outlet: eventData.outlet || 'N/A',
            payload: eventData.payload || {},
            lineNumber,
            fileName,
          });
        }
      } catch {
        /* skip */
      }
    }

    // internalTxMap — primary source: [OCPPRuntime] stop Transaction JSON
    const runtimeStopMatch = line.match(RUNTIME_STOP_RE);
    if (runtimeStopMatch) {
      try {
        const rt = parseJsonSafely(runtimeStopMatch[1]) as {
          transactionId?: unknown;
          internalTransactionId?: string;
        };
        if (rt.transactionId && rt.internalTransactionId) {
          internalTxMap.set(String(rt.transactionId), rt.internalTransactionId);
        }
      } catch {
        /* skip */
      }
    }

    // internalTxMap — backup source: "Stored transactionId X for internalTransactionId Y"
    const storedTxMatch = line.match(STORED_TX_RE);
    if (storedTxMatch) {
      const cmsTxId = storedTxMatch[1];
      const intTxId = storedTxMatch[2];
      if (!internalTxMap.has(cmsTxId)) internalTxMap.set(cmsTxId, intTxId);
    }
  }

  return { messages, events, alerts, internalTxMap };
}
