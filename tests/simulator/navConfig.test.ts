import { describe, it, expect } from 'vitest';
import { NAV_GROUPS } from '../../src/app/nav/navConfig';

describe('navConfig', () => {
  it('has the three functional groups in order', () => {
    expect(NAV_GROUPS.map(g => g.id)).toEqual(['parser', 'emulator', 'cms']);
  });

  it('Client Log Parser, CMS Log Parser and OCPP Simulator are enabled with mounts', () => {
    const client = NAV_GROUPS.find(g => g.id === 'parser')!.views.find(v => v.id === 'client-logs')!;
    expect(client.enabled).toBe(true);
    expect(typeof client.mount).toBe('function');
    const cms = NAV_GROUPS.find(g => g.id === 'parser')!.views.find(v => v.id === 'cms-logs')!;
    expect(cms.enabled).toBe(true);
    expect(typeof cms.mount).toBe('function');
    const sim = NAV_GROUPS.find(g => g.id === 'emulator')!.views.find(v => v.id === 'ocpp-simulator')!;
    expect(sim.enabled).toBe(true);
    expect(typeof sim.mount).toBe('function');
  });

  it('future views are disabled placeholders with no mount', () => {
    const disabled = NAV_GROUPS.flatMap(g => g.views).filter(v => !v.enabled);
    expect(disabled.map(v => v.id).sort()).toEqual(['csms', 'transaction-flow']);
    disabled.forEach(v => expect(v.mount).toBeUndefined());
  });
});
