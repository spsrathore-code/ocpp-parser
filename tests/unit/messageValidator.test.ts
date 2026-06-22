import { describe, it, expect } from 'vitest';
import { validateMessage } from '../../src/services/validation/messageValidator';

describe('validateMessage — L1 frame structure', () => {
  it('rejects a non-array frame as L1/FRAME_INVALID', () => {
    const r = validateMessage('not-an-array' as unknown as unknown[]);
    expect(r.ok).toBe(false);
    expect(r.violations[0]).toMatchObject({ layer: 'L1', code: 'FRAME_INVALID' });
  });

  it('rejects an unknown MessageTypeId (9) as L1/FRAME_INVALID', () => {
    const r = validateMessage([9, 'uid-3', 'BootNotification', {}]);
    expect(r.ok).toBe(false);
    expect(r.violations[0]).toMatchObject({ layer: 'L1', code: 'FRAME_INVALID' });
  });

  it('rejects a Call with wrong arity as L1/FRAME_INVALID', () => {
    const r = validateMessage([2, 'uid', 'BootNotification']); // missing payload
    expect(r.ok).toBe(false);
    expect(r.violations[0].layer).toBe('L1');
  });

  it('classifies a valid Call: kind=Call, action, messageId', () => {
    const r = validateMessage([2, 'uid-1', 'BootNotification', { chargePointVendor: 'Ador', chargePointModel: 'DC-60' }]);
    expect(r.ok).toBe(true);
    expect(r.kind).toBe('Call');
    expect(r.action).toBe('BootNotification');
    expect(r.messageId).toBe('uid-1');
    expect(r.violations).toHaveLength(0);
  });
});

describe('validateMessage — L2 schema', () => {
  it('flags a missing required field as L2/SCHEMA_VIOLATION with a path', () => {
    const r = validateMessage([2, 'uid-2', 'BootNotification', { chargePointVendor: 'Ador' }]); // missing chargePointModel
    expect(r.ok).toBe(false);
    expect(r.kind).toBe('Call');
    expect(r.violations.some(v => v.layer === 'L2' && v.code === 'SCHEMA_VIOLATION')).toBe(true);
  });

  it('accepts a structurally valid CallResult (action-specific schema enforced later at L3)', () => {
    const r = validateMessage([3, 'uid-1', { status: 'Accepted', currentTime: '2026-06-13T10:00:00Z', interval: 300 }]);
    expect(r.ok).toBe(true);
    expect(r.kind).toBe('CallResult');
    expect(r.messageId).toBe('uid-1');
  });

  it('classifies a CallError frame', () => {
    const r = validateMessage([4, 'uid-9', 'NotSupported', 'Not supported', {}]);
    expect(r.kind).toBe('CallError');
    expect(r.messageId).toBe('uid-9');
  });
});
