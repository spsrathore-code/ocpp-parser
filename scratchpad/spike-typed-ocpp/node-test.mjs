// Spike: does typed-ocpp do L1 (frame) + L2 (schema) + L3 (correlation) in Node?
// Maps to TYPEVALIDATION.md VAL-002..VAL-005. Run: npm run node-test
import { OCPP16 } from 'typed-ocpp';

let pass = 0, fail = 0;
const check = (name, cond, extra = '') => {
  if (cond) { pass++; console.log(`  PASS  ${name}`); }
  else { fail++; console.log(`  FAIL  ${name}  ${extra}`); }
};

console.log('typed-ocpp spike — Node functional test\n');

// --- Sanity: schemas bundled? ---
const schemaCount = Object.keys(OCPP16.schemas).length;
check(`schemas bundled (${schemaCount} found)`, schemaCount > 0);

// --- L1/L2: valid BootNotification Call ---
const goodCall = [2, 'uid-1', 'BootNotification',
  { chargePointVendor: 'Ador', chargePointModel: 'DC-60' }];
check('VAL-002/003 valid Call passes validate()', OCPP16.validate(goodCall) === true,
  JSON.stringify(OCPP16.validate.errors));
check('isCall() type guard', OCPP16.isCall(goodCall) === true);

// --- L2: schema-invalid (missing required chargePointModel) ---
const badPayload = [2, 'uid-2', 'BootNotification', { chargePointVendor: 'Ador' }];
const badPayloadOk = OCPP16.validate(badPayload);
check('VAL-003 missing required field is rejected', badPayloadOk === false);
check('VAL-003 reports Ajv-style errors', Array.isArray(OCPP16.validate.errors) && OCPP16.validate.errors.length > 0,
  JSON.stringify(OCPP16.validate.errors));
if (badPayloadOk === false) console.log('        e.g.', JSON.stringify(OCPP16.validate.errors[0]));

// --- L1: malformed frame (bad MessageTypeId) ---
const badFrame = [9, 'uid-3', 'BootNotification', {}];
check('VAL-002 malformed frame rejected', OCPP16.validate(badFrame) === false);

// --- L3: correlation — matching CallResult ---
const result = [3, 'uid-1', { status: 'Accepted', currentTime: '2026-06-13T10:00:00Z', interval: 300 }];
check('VAL-004 valid CallResult passes validateCallResult()', OCPP16.validateCallResult(result) === true,
  JSON.stringify(OCPP16.validateCallResult.errors));
const matched = OCPP16.checkCallResult(result, goodCall);
check('VAL-004 checkCallResult matches result to its Call', matched === true,
  JSON.stringify(OCPP16.checkCallResult.errors));

// --- L3: correlation — mismatched action should fail ---
// A Heartbeat-shaped result checked against a BootNotification call
const wrongResult = [3, 'uid-1', { currentTime: '2026-06-13T10:00:00Z' }];
const mism = OCPP16.checkCallResult(wrongResult, goodCall);
check('VAL-004 mismatched result is flagged', mism === false,
  '(checkCallResult returned true unexpectedly)');

console.log(`\nResult: ${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
