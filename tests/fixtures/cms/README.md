# CMS test fixtures

## `mahindra-sample.csv`

190 rows derived from a real Mahindra CMS portal export
(`Logs_of_charger__MPCKADC060_…csv`, 27,402 rows, 2026-08-15 → 2026-08-21 IST).
Row order is **newest-first**, exactly as the portal exports it.

### Scrubbing

All customer- and asset-identifying values are replaced with deterministic
pseudonyms. The mapping is stable within the file, so correlation still holds —
the same `idTag` on `Authorize`, `StartTransaction` and `StopTransaction` still
matches.

| Field | Replacement |
|---|---|
| `idTag`, `parentIdTag` | `TAG0001`…`TAG0009` (RFID card UIDs) |
| `chargeBoxSerialNumber` | `TESTBOX-0001` |
| `chargePointSerialNumber` | `TESTCP-0001` |
| `DataTransfer` `VehicleID` `data` | `aa0000000001`… (vehicle MAC addresses) |

Message UUIDs, timestamps, transaction IDs, meter readings and error codes are
**unmodified** — they carry no personal data and the tests depend on them.

### Coverage

| Case | Rows |
|---|---|
| Direction mislabelled by `Event Type` | 18 |
| Field truncated at the 4,000-char export cap | 105 |
| `-Awaiting response from charger-` | 8 |
| Response carrying `currentTime` (IST→UTC cross-check) | 23 |
| Distinct OCPP actions | 12 |
| Complete transaction lifecycle (`117646`) | Authorize → Start → MeterValues → Stop |

### The one synthetic row

The **final row** is not from the export. It is a hand-written `MeterValues`
truncated mid-token with no recoverable prefix:

```
[2,"00000000-0000-4000-8000-000000000001","MeterValues",{"connectorId":1,"meterValue":[{"sampledV
```

It exists so the unsalvageable-payload path has coverage — `repairTruncatedJson`
must count it and continue, not throw or abort the parse. Its UUID is the
all-zero pattern above so it is easy to identify. Every other row is real.
