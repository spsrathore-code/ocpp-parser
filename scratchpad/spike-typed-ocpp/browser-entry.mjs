// Browser bundle entry: the real question of the spike (TYPEVALIDATION.md §7).
// Can typed-ocpp (pure ESM, deps Ajv + date-fns) bundle for the browser with esbuild?
import { OCPP16 } from 'typed-ocpp';

export function runInBrowser() {
  const call = [2, 'uid-1', 'BootNotification',
    { chargePointVendor: 'Ador', chargePointModel: 'DC-60' }];
  const ok = OCPP16.validate(call);
  const result = [3, 'uid-1', { status: 'Accepted', currentTime: '2026-06-13T10:00:00Z', interval: 300 }];
  const matched = OCPP16.checkCallResult(result, call);
  return { ok, matched, schemaCount: Object.keys(OCPP16.schemas).length };
}

// Expose on window so a browser smoke-test could call it.
if (typeof window !== 'undefined') window.runInBrowser = runInBrowser;
