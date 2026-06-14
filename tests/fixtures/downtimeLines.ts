// Synthetic raw-log fixtures for the Detection module (§9 detectDowntimes).
// Each array reproduces one fault type's start + recovery in the exact line
// shapes the detector keys on, so expected downtimes are deterministic.

/** Connection Lost: PING/PONG heartbeat, then a disconnect, then BootNotification Accepted. */
export const CONNECTION_LOST_LINES: string[] = [
  '[2025-08-22T02:50:00.000Z] %c[OCPPClient] >> PING at 2025-08-22T02:50:00.000Z color: cyan;',
  '[2025-08-22T02:50:00.100Z] %c[OCPPClient] << PONG at 2025-08-22T02:50:00.100Z color: cyan;',
  '[2025-08-22T02:50:30.000Z] [OCPPClient] client didn\'t get a response for PING. Setting connection to "disconnected"',
  '[2025-08-22T02:51:00.000Z] %c[OCPPClient] << message received: [3,"idboot",{"currentTime":"2025-08-22T02:51:00Z","interval":300,"status":"Accepted"}] color: cyan;',
];

/** Power Failure: Faulted StatusNotification (vendor 19), then connector-0 NoError recovery. */
export const POWER_FAILURE_LINES: string[] = [
  '[2025-08-22T05:00:00.000Z] [OCPPClient] >> message sent: [2,"idpf","StatusNotification",{"connectorId":1,"errorCode":"OtherError","status":"Faulted","info":"PowerFailure","vendorErrorCode":"19"}]',
  '[2025-08-22T05:05:00.000Z] [OCPPClient] >> message sent: [2,"idrec","StatusNotification",{"connectorId":0,"errorCode":"NoError","status":"Available"}]',
];

/** Emergency Stop: Faulted StatusNotification (vendor 17), then connector-0 NoError recovery. */
export const EMERGENCY_STOP_LINES: string[] = [
  '[2025-08-22T07:00:00.000Z] [OCPPClient] >> message sent: [2,"ides","StatusNotification",{"connectorId":1,"errorCode":"OtherError","status":"Faulted","info":"EmergencyPressed","vendorErrorCode":"17"}]',
  '[2025-08-22T07:02:00.000Z] [OCPPClient] >> message sent: [2,"idrec","StatusNotification",{"connectorId":0,"errorCode":"NoError","status":"Available"}]',
];

/** Input Under Voltage: continuous Faulted reports (vendor 26), recovered by 1-min silence. */
export const UNDER_VOLTAGE_LINES: string[] = [
  '[2025-08-22T06:00:00.000Z] [OCPPClient] >> message sent: [2,"iduv1","StatusNotification",{"connectorId":1,"errorCode":"UnderVoltage","status":"Faulted","info":"InputUnderVoltage","vendorErrorCode":"26"}]',
  '[2025-08-22T06:00:10.000Z] [OCPPClient] >> message sent: [2,"iduv2","StatusNotification",{"connectorId":1,"errorCode":"UnderVoltage","status":"Faulted","info":"InputUnderVoltage","vendorErrorCode":"26"}]',
  '[2025-08-22T06:02:00.000Z] [OCPPClient] some idle log line well past the silence threshold',
];

/** PING/PONG/server-PING lines for the same-pass WebSocket-event harvest (FR-334). */
export const WS_EVENT_LINES: string[] = [
  '[2025-08-22T01:00:00.000Z] %c[OCPPClient] >> PING at 2025-08-22T01:00:00.000Z color: cyan;',
  '[2025-08-22T01:00:00.200Z] %c[OCPPClient] << PONG at 2025-08-22T01:00:00.200Z color: cyan;',
  '[2025-08-22T01:00:05.000Z] %c[OCPPClient] << PING at 2025-08-22T01:00:05.000Z color: cyan;',
];
