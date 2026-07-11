// OCPP 1.6J message-direction mapping for CMS logs.
//
// The Client-parser pipeline is written from the CHARGE POINT's perspective:
// a message the charger emits has `direction: 'sent'`, one it receives is
// 'received'. Active modules depend on this (detectDowntimes, render/timeline,
// compliance/cpInitiated). A CMS Excel row only gives us the request/response
// strings, so we recover direction from WHO initiates each operation per the
// spec: §4 operations are Charge-Point-initiated, §5 are Central-System-initiated.

import type { Direction } from '../model/types';

/** OCPP 1.6J §4 — operations initiated by the Charge Point. DataTransfer is
 *  bidirectional but is treated as CP-initiated (the common case in field logs). */
const CP_INITIATED_ACTIONS = new Set<string>([
  'BootNotification',
  'Heartbeat',
  'StatusNotification',
  'StartTransaction',
  'StopTransaction',
  'MeterValues',
  'Authorize',
  'DataTransfer',
  'DiagnosticsStatusNotification',
  'FirmwareStatusNotification',
]);

/** True if `action` is a Charge-Point-initiated operation (OCPP 1.6J §4). */
export function isCpInitiated(action: string): boolean {
  return CP_INITIATED_ACTIONS.has(action);
}

/** Direction of the CALL (request) for `action`, from the charger's perspective. */
export function requestDirection(action: string): Direction {
  return isCpInitiated(action) ? 'sent' : 'received';
}

/** Direction of the CALLRESULT (response) for `action` — always the opposite. */
export function responseDirection(action: string): Direction {
  return isCpInitiated(action) ? 'received' : 'sent';
}
