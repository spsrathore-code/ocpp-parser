import { describe, it, expect } from 'vitest';
import type { MessageDef, FieldDef, SessionEntry } from '../../src/simulator/model/types';

describe('simulator types', () => {
  it('compose a MessageDef', () => {
    const f: FieldDef = { name: 'idTag', type: 'string', required: true, maxLength: 20 };
    const m: MessageDef = { action: 'Authorize', profile: 'Core', direction: 'CP_TO_CS', request: [f], response: [] };
    const e: SessionEntry = { ts: '2026-07-03T10:00:00Z', direction: 'sent', frame: [2, 'id', 'Authorize', {}] };
    expect(m.request[0].name).toBe('idTag');
    expect(e.frame[0]).toBe(2);
  });
});
