import { describe, it, expect, beforeEach } from 'vitest';
import {
  registerProtocolRules,
  getRegisteredRules,
  clearProtocolRules,
} from '../../src/services/validation/protocolValidator';
import type { ProtocolRule } from '../../src/services/validation/types';

const ruleA: ProtocolRule = { id: 'no-stop-before-start', check: () => [] };
const ruleB: ProtocolRule = { id: 'boot-before-core', check: () => [] };

describe('protocolValidator — L4 extension point (VAL-009)', () => {
  beforeEach(() => clearProtocolRules());

  it('registers rules and exposes them', () => {
    registerProtocolRules([ruleA, ruleB]);
    expect(getRegisteredRules().map(r => r.id)).toEqual(['no-stop-before-start', 'boot-before-core']);
  });

  it('does not register a duplicate rule id', () => {
    registerProtocolRules([ruleA]);
    registerProtocolRules([ruleA]);
    expect(getRegisteredRules()).toHaveLength(1);
  });

  it('does NOT execute rules in Phase 1 (registration only)', () => {
    let called = false;
    registerProtocolRules([{ id: 'spy', check: () => { called = true; return []; } }]);
    // Nothing in Phase 1 invokes check(); registration must not call it.
    expect(called).toBe(false);
  });
});
