// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { renderParamForm, readForm } from '../../src/simulator/render/paramForm';
import type { FieldDef } from '../../src/simulator/model/types';

const fields: FieldDef[] = [
  { name: 'idTag', type: 'string', required: true, default: 'ABC123' },
  { name: 'connectorId', type: 'integer', required: true },
  { name: 'reason', type: 'enum', required: false, enumValues: ['Local', 'Remote'] },
  { name: 'meterValue', type: 'json', required: true },
];

describe('paramForm', () => {
  it('renders one control per field and reads typed values', () => {
    const mount = document.createElement('div');
    renderParamForm(mount, fields);
    // enum → select
    expect(mount.querySelector('select[name="reason"]')).toBeTruthy();
    // default prefilled
    expect(mount.querySelector<HTMLInputElement>('[name="idTag"]')!.value).toBe('ABC123');
    // set values and read back
    mount.querySelector<HTMLInputElement>('[name="connectorId"]')!.value = '2';
    mount.querySelector<HTMLTextAreaElement>('[name="meterValue"]')!.value = '{"a":1}';
    const payload = readForm(mount, fields);
    expect(payload).toMatchObject({ idTag: 'ABC123', connectorId: 2, meterValue: { a: 1 } });
  });

  it('omits empty optional fields', () => {
    const mount = document.createElement('div');
    renderParamForm(mount, fields);
    // clear the enum's implicit first-option value so 'reason' reads empty
    const reason = mount.querySelector<HTMLSelectElement>('[name="reason"]')!;
    reason.value = '';
    const payload = readForm(mount, fields);
    expect('reason' in payload).toBe(false);
  });
});
