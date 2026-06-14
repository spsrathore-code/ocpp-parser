// Downtime detection config — faithful port of the v2026.05.14 tool's
// `downtimeConfig` (HTML 946). Four fault types, each with a start matcher,
// recovery pattern(s), and an error-code extractor. Order-independent substring
// checks are preserved verbatim to keep parity with the live tool.

import type { DowntimeConfig } from './types';

export const downtimeConfig: DowntimeConfig = {
  'Connection Lost': {
    startPattern: null, // uses customStartCheck instead
    customStartCheck: (line: string): boolean => {
      // Pattern 1: PING timeout
      const hasPingTimeout =
        /client didn't get a response for PING.*Setting connection to ["']disconnected["']/i.test(line);
      // Pattern 2: connection failure (DNS/network)
      const hasConnectionFailure = line.includes('[OCPPClient]') && line.includes('Fail to connect');
      // Pattern 3: connection closed with code 1006
      const hasConnectionClosed =
        line.includes('[OCPPClient]') && line.includes('connection closed:') && line.includes('1006');
      // Pattern 4: connection timeout
      const hasConnectionTimeout =
        line.includes('[OCPPClient]') && line.includes('Timeout of the client connection');
      // Pattern 5: reconnect failed timeout
      const hasReconnectFailed =
        line.includes('[Connection]') && line.includes('reconnect failed timeout');
      return (
        hasPingTimeout || hasConnectionFailure || hasConnectionClosed || hasConnectionTimeout || hasReconnectFailed
      );
    },
    useLastHeartbeatAsStart: true,
    // Only ends on BootNotification Accepted (a "Connected to ws://" line appears
    // before the BootNotification response, so it cannot be used as the end).
    endPatterns: [{ type: 'bootnotification', status: 'Accepted' }],
    extractErrorCodes: (downtime, _messages, alerts) => {
      const nearbyAlerts = alerts.filter((a) => {
        const alertTime = new Date(a.timestamp);
        return alertTime >= new Date(downtime.startTime) && alertTime <= new Date(downtime.endTime || new Date());
      });
      const ocppErrorCode = nearbyAlerts.length > 0 ? nearbyAlerts[0].code ?? 'N/A' : 'N/A';
      return { ocppErrorCode, cpoErrorCode: 'N/A', vendorErrorCode: 'N/A' };
    },
  },

  'Power Failure': {
    startPattern: null,
    customStartCheck: (line: string): boolean => {
      const hasPowerFailure = line.includes('"info":"PowerFailure"') || line.includes('"info": "PowerFailure"');
      const hasFaulted = line.includes('"status":"Faulted"') || line.includes('"status": "Faulted"');
      const hasOtherError = line.includes('"errorCode":"OtherError"') || line.includes('"errorCode": "OtherError"');
      const hasVendorError19 = line.includes('"vendorErrorCode":"19"') || line.includes('"vendorErrorCode": "19"');
      return hasPowerFailure && hasFaulted && hasOtherError && hasVendorError19;
    },
    endPatterns: [{ type: 'powerfailure_recovery' }],
    extractErrorCodes: () => ({ ocppErrorCode: 'OtherError', cpoErrorCode: 'N/A', vendorErrorCode: '19' }),
  },

  'Input Under Voltage': {
    startPattern: null,
    customStartCheck: (line: string): boolean => {
      const hasUnderVoltage = line.includes('"errorCode":"UnderVoltage"') || line.includes('"errorCode": "UnderVoltage"');
      const hasInputUnderVoltage =
        line.includes('"info":"InputUnderVoltage"') || line.includes('"info": "InputUnderVoltage"');
      const hasFaulted = line.includes('"status":"Faulted"') || line.includes('"status": "Faulted"');
      const hasVendorError26 = line.includes('"vendorErrorCode":"26"') || line.includes('"vendorErrorCode": "26"');
      return hasUnderVoltage && hasInputUnderVoltage && hasFaulted && hasVendorError26;
    },
    // Time-based recovery: fault clears when no new report for 1+ minute.
    endPatterns: [{ type: 'time_based_silence', silenceThresholdMs: 60000 }],
    isContinuousReporting: true,
    extractErrorCodes: () => ({ ocppErrorCode: 'UnderVoltage', cpoErrorCode: 'N/A', vendorErrorCode: '26' }),
  },

  'Emergency Stop': {
    startPattern: null,
    customStartCheck: (line: string): boolean => {
      const hasEmergencyPressed =
        line.includes('"info":"EmergencyPressed"') || line.includes('"info": "EmergencyPressed"');
      const hasFaulted = line.includes('"status":"Faulted"') || line.includes('"status": "Faulted"');
      const hasOtherError = line.includes('"errorCode":"OtherError"') || line.includes('"errorCode": "OtherError"');
      const hasVendorError17 = line.includes('"vendorErrorCode":"17"') || line.includes('"vendorErrorCode": "17"');
      return hasEmergencyPressed && hasFaulted && hasOtherError && hasVendorError17;
    },
    endPatterns: [{ type: 'emergencystop_recovery' }],
    extractErrorCodes: () => ({ ocppErrorCode: 'OtherError', cpoErrorCode: 'N/A', vendorErrorCode: '17' }),
  },
};
