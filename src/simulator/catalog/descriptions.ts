// Plain-language, one-line descriptions for the Description card (all 28 operations).
// Reference data (OCPP 1.6J §4/§5/§6), not derivable from the schemas.

export const MESSAGE_DESCRIPTIONS: Record<string, string> = {
  // Core — CP → CS
  Authorize: 'CP → CS: Requests authorization for an idTag before starting or stopping a transaction.',
  BootNotification: 'CP → CS: Announces the Charge Point to the Central System on boot-up.',
  Heartbeat: 'CP → CS: Periodic keep-alive so the Central System knows the Charge Point is online.',
  MeterValues: 'CP → CS: Reports sampled meter readings (energy, power, SoC, etc.) during a session.',
  StatusNotification: 'CP → CS: Reports a connector status or error change.',
  StartTransaction: 'CP → CS: Starts a charging transaction and requests a transactionId.',
  StopTransaction: 'CP → CS: Stops a charging transaction and reports the final meter value.',
  // Core — CS → CP
  ChangeAvailability: 'CS → CP: Sets a connector (or the whole Charge Point) Operative or Inoperative.',
  ChangeConfiguration: 'CS → CP: Changes a configuration key on the Charge Point.',
  GetConfiguration: 'CS → CP: Requests the values of one or more configuration keys.',
  ClearCache: 'CS → CP: Clears the Charge Point’s authorization cache.',
  Reset: 'CS → CP: Requests a hard or soft reset of the Charge Point.',
  UnlockConnector: 'CS → CP: Requests the Charge Point to unlock a connector.',
  RemoteStartTransaction: 'CS → CP: Asks the Charge Point to start a transaction for an idTag.',
  RemoteStopTransaction: 'CS → CP: Asks the Charge Point to stop a running transaction.',
  // Core — both
  DataTransfer: 'CP ↔ CS: Vendor-specific data exchange not covered by the standard messages.',
  // Firmware Management
  DiagnosticsStatusNotification: 'CP → CS: Reports progress of a diagnostics file upload.',
  FirmwareStatusNotification: 'CP → CS: Reports progress of a firmware update.',
  GetDiagnostics: 'CS → CP: Requests the Charge Point to upload a diagnostics file.',
  UpdateFirmware: 'CS → CP: Instructs the Charge Point to download and install firmware.',
  // Local Auth List
  GetLocalListVersion: 'CS → CP: Requests the version of the local authorization list.',
  SendLocalList: 'CS → CP: Sends a full or differential update of the local authorization list.',
  // Reservation
  ReserveNow: 'CS → CP: Reserves a connector for an idTag until an expiry time.',
  CancelReservation: 'CS → CP: Cancels an existing reservation.',
  // Smart Charging
  SetChargingProfile: 'CS → CP: Sends a charging profile that shapes power/current over time.',
  ClearChargingProfile: 'CS → CP: Removes charging profiles matching the given criteria.',
  GetCompositeSchedule: 'CS → CP: Requests the resulting composite charging schedule for a connector.',
  // Remote Trigger
  TriggerMessage: 'CS → CP: Asks the Charge Point to send a specific message on demand.',
};
