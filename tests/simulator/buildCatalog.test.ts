import { describe, it, expect } from 'vitest';
import { buildCatalog, getMessage } from '../../src/simulator/catalog/buildCatalog';

describe('buildCatalog', () => {
  const catalog = buildCatalog();

  it('produces all 28 messages', () => {
    expect(catalog).toHaveLength(28);
  });

  it('derives Authorize request from schema (idTag required, maxLength 20)', () => {
    const authorize = getMessage('Authorize')!;
    expect(authorize.profile).toBe('Core');
    expect(authorize.direction).toBe('CP_TO_CS');
    const idTag = authorize.request.find(f => f.name === 'idTag')!;
    expect(idTag).toMatchObject({ type: 'string', required: true, maxLength: 20 });
  });

  it('derives Reset request enum from schema', () => {
    const reset = getMessage('Reset')!;
    const typeField = reset.request.find(f => f.name === 'type')!;
    expect(typeField.type).toBe('enum');
    expect(typeField.enumValues).toEqual(['Hard', 'Soft']);
  });

  it('has a response shape (BootNotification.conf has status/currentTime/interval)', () => {
    const boot = getMessage('BootNotification')!;
    expect(boot.response.map(f => f.name).sort()).toEqual(['currentTime', 'interval', 'status']);
  });
});
