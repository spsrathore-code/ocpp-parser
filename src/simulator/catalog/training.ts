// Training overlay — friendly starting values the JSON schemas don't carry.
// Applied on top of the schema-derived FieldDef list (never replaces schema shape).

export interface TrainingInfo {
  /** friendly default values by request-field name (strings; parsed by the form) */
  defaults?: Record<string, string>;
}

export const TRAINING_OVERLAY: Record<string, TrainingInfo> = {
  Authorize: { defaults: { idTag: 'ABC12345' } },
  BootNotification: { defaults: { chargePointVendor: 'Ador', chargePointModel: 'DC-60kW', firmwareVersion: '1.0.0' } },
  Heartbeat: {},
  MeterValues: { defaults: { connectorId: '1', transactionId: '1' } },
  StartTransaction: { defaults: { connectorId: '1', idTag: 'ABC12345', meterStart: '0' } },
  StopTransaction: { defaults: { transactionId: '1', meterStop: '5000', reason: 'Local' } },
  StatusNotification: { defaults: { connectorId: '1', errorCode: 'NoError', status: 'Available' } },
  ChangeAvailability: { defaults: { connectorId: '1', type: 'Operative' } },
  ChangeConfiguration: { defaults: { key: 'HeartbeatInterval', value: '300' } },
  Reset: { defaults: { type: 'Soft' } },
  RemoteStartTransaction: { defaults: { connectorId: '1', idTag: 'ABC12345' } },
  RemoteStopTransaction: { defaults: { transactionId: '1' } },
  TriggerMessage: { defaults: { requestedMessage: 'BootNotification', connectorId: '1' } },
  UnlockConnector: { defaults: { connectorId: '1' } },
};
