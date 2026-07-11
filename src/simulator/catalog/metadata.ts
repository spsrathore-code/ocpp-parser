import type { Profile, Direction } from '../model/types';

export const MESSAGE_META: Record<string, { profile: Profile; direction: Direction }> = {
  // Core — CP → CS
  Authorize: { profile: 'Core', direction: 'CP_TO_CS' },
  BootNotification: { profile: 'Core', direction: 'CP_TO_CS' },
  Heartbeat: { profile: 'Core', direction: 'CP_TO_CS' },
  MeterValues: { profile: 'Core', direction: 'CP_TO_CS' },
  StatusNotification: { profile: 'Core', direction: 'CP_TO_CS' },
  StartTransaction: { profile: 'Core', direction: 'CP_TO_CS' },
  StopTransaction: { profile: 'Core', direction: 'CP_TO_CS' },
  // Core — CS → CP
  ChangeAvailability: { profile: 'Core', direction: 'CS_TO_CP' },
  ChangeConfiguration: { profile: 'Core', direction: 'CS_TO_CP' },
  GetConfiguration: { profile: 'Core', direction: 'CS_TO_CP' },
  ClearCache: { profile: 'Core', direction: 'CS_TO_CP' },
  Reset: { profile: 'Core', direction: 'CS_TO_CP' },
  UnlockConnector: { profile: 'Core', direction: 'CS_TO_CP' },
  RemoteStartTransaction: { profile: 'Core', direction: 'CS_TO_CP' },
  RemoteStopTransaction: { profile: 'Core', direction: 'CS_TO_CP' },
  // Core — both
  DataTransfer: { profile: 'Core', direction: 'BOTH' },
  // Firmware Management
  DiagnosticsStatusNotification: { profile: 'Firmware Management', direction: 'CP_TO_CS' },
  FirmwareStatusNotification: { profile: 'Firmware Management', direction: 'CP_TO_CS' },
  GetDiagnostics: { profile: 'Firmware Management', direction: 'CS_TO_CP' },
  UpdateFirmware: { profile: 'Firmware Management', direction: 'CS_TO_CP' },
  // Local Auth List
  GetLocalListVersion: { profile: 'Local Auth List', direction: 'CS_TO_CP' },
  SendLocalList: { profile: 'Local Auth List', direction: 'CS_TO_CP' },
  // Reservation
  ReserveNow: { profile: 'Reservation', direction: 'CS_TO_CP' },
  CancelReservation: { profile: 'Reservation', direction: 'CS_TO_CP' },
  // Smart Charging
  SetChargingProfile: { profile: 'Smart Charging', direction: 'CS_TO_CP' },
  ClearChargingProfile: { profile: 'Smart Charging', direction: 'CS_TO_CP' },
  GetCompositeSchedule: { profile: 'Smart Charging', direction: 'CS_TO_CP' },
  // Remote Trigger
  TriggerMessage: { profile: 'Remote Trigger', direction: 'CS_TO_CP' },
};

export const ACTIONS: string[] = Object.keys(MESSAGE_META);
