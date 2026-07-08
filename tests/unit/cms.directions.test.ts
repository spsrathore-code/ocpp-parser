import { describe, it, expect } from 'vitest';
import { requestDirection, responseDirection } from '../../src/app/cms/directions';

// The client-parser analysis is written from the CHARGER's perspective:
// CP-initiated messages are `direction: 'sent'`. Several active modules
// (detectDowntimes, timelineData, cpInitiated) filter on that. The CMS adapter
// must reproduce it so those sections work on Excel logs too.
describe('requestDirection', () => {
  it("labels CP-initiated requests 'sent' (charger -> CMS)", () => {
    for (const a of ['BootNotification', 'Heartbeat', 'StatusNotification', 'StartTransaction', 'StopTransaction', 'MeterValues', 'Authorize']) {
      expect(requestDirection(a)).toBe('sent');
    }
  });

  it("labels CS-initiated requests 'received' (CMS -> charger)", () => {
    for (const a of ['RemoteStartTransaction', 'RemoteStopTransaction', 'Reset', 'TriggerMessage', 'ChangeConfiguration', 'GetConfiguration', 'UnlockConnector']) {
      expect(requestDirection(a)).toBe('received');
    }
  });
});

describe('responseDirection', () => {
  it('is the opposite of the request direction', () => {
    expect(responseDirection('Heartbeat')).toBe('received'); // CMS answers a CP request
    expect(responseDirection('Reset')).toBe('sent'); // charger answers a CS request
  });
});
