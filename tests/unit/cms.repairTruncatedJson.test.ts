import { describe, it, expect } from 'vitest';
import { repairTruncatedJson } from '../../src/app/cms/repairTruncatedJson';

describe('repairTruncatedJson', () => {
  it('salvages a MeterValues CALL truncated mid-entry (keeps complete entries)', () => {
    // Mahindra-style truncation: cut in the middle of the 3rd meterValue entry.
    const truncated = '[2,"id","MeterValues",{"connectorId":1,"transactionId":9,"meterValue":[{"a":1},{"b":2},{"c":';
    const repaired = repairTruncatedJson(truncated);
    expect(repaired).not.toBeNull();
    const parsed = JSON.parse(repaired!);
    expect(parsed[2]).toBe('MeterValues');
    expect(parsed[3].connectorId).toBe(1);
    expect(parsed[3].transactionId).toBe(9);
    expect(parsed[3].meterValue).toEqual([{ a: 1 }, { b: 2 }]); // the partial 3rd dropped
  });

  it('salvages when truncation lands inside a nested sampledValue object', () => {
    const truncated = '[2,"id","MeterValues",{"meterValue":[{"sampledValue":[{"v":"1"},{"v":';
    const repaired = repairTruncatedJson(truncated);
    expect(repaired).not.toBeNull();
    const parsed = JSON.parse(repaired!);
    expect(parsed[3].meterValue[0].sampledValue).toEqual([{ v: '1' }]);
  });

  it('returns null when not even one bracket completes (nothing to salvage)', () => {
    expect(repairTruncatedJson('[2,"id","MeterValues",{"meterValue":[{"a":')).toBeNull();
  });

  it('does not corrupt a value inside a truncated string literal', () => {
    // Truncation inside a string — the last safe close is the entry before it.
    const truncated = '[2,"id","MeterValues",{"meterValue":[{"a":1},{"b":"unterminated}]}';
    const repaired = repairTruncatedJson(truncated);
    expect(repaired).not.toBeNull();
    const parsed = JSON.parse(repaired!);
    expect(parsed[3].meterValue).toEqual([{ a: 1 }]);
  });
});
