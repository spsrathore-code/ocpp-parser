import { describe, it, expect } from 'vitest';
import { MESSAGE_META, ACTIONS } from '../../src/simulator/catalog/metadata';

describe('message metadata', () => {
  it('covers all 28 operations', () => {
    expect(ACTIONS).toHaveLength(28);
  });
  it('tags direction and profile', () => {
    expect(MESSAGE_META.Authorize).toEqual({ profile: 'Core', direction: 'CP_TO_CS' });
    expect(MESSAGE_META.Reset).toEqual({ profile: 'Core', direction: 'CS_TO_CP' });
    expect(MESSAGE_META.DataTransfer).toEqual({ profile: 'Core', direction: 'BOTH' });
    expect(MESSAGE_META.TriggerMessage).toEqual({ profile: 'Remote Trigger', direction: 'CS_TO_CP' });
    expect(MESSAGE_META.SetChargingProfile.profile).toBe('Smart Charging');
  });
  it('every action has metadata', () => {
    for (const a of ACTIONS) expect(MESSAGE_META[a]).toBeDefined();
  });
});
