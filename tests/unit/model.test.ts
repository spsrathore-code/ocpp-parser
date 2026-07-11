import { describe, it, expect } from 'vitest';
import { createMessageGroups, MESSAGE_GROUP_KEYS } from '../../src/app/model/types';

describe('model — message groups', () => {
  it('createMessageGroups() returns all 7 keys, each an empty array', () => {
    const groups = createMessageGroups();
    expect(Object.keys(groups).sort()).toEqual([...MESSAGE_GROUP_KEYS].sort());
    for (const key of MESSAGE_GROUP_KEYS) {
      expect(groups[key]).toEqual([]);
    }
  });
});
