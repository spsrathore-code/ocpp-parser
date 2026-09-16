# CMS Downtime Classification Logic

## Objective

Analyse the CMS OCPP logs and calculate two **mutually exclusive downtime categories**:

1. **PowerFailure Downtime**
2. **Offline Without Error Downtime**

The same period must **never be counted in both categories**.

---

# 1. PowerFailure Downtime

### Typical event flow

```text
PowerFailure StatusNotification
        ↓
Charger remains connected/alive on UPS
        ↓
Heartbeat Only
        ↓
UPS depletes or charger loses communication
        ↓
No further communication
        ↓
BootNotification
        ↓
Recovery StatusNotification
```

The fact that communication eventually stops after the PowerFailure alert does **not** make that portion Offline. For downtime classification, the **entire PowerFailure event remains PowerFailure downtime** until its defined recovery event.

---

## 1.1 Identify PowerFailure START

Treat a `StatusNotification` as a **PowerFailure START event** only when **all** of the following conditions are satisfied:

* `connectorId` is present.
* `status = "Faulted"`.
* `errorCode = "OtherError"`.
* `info = "PowerFailure"`.
* `timestamp` is valid.

### Example

```json
{
  "connectorId": 0,
  "errorCode": "OtherError",
  "info": "PowerFailure",
  "status": "Faulted",
  "timestamp": "2026-08-23T01:07:33.999Z",
  "vendorId": "QUENCH",
  "vendorErrorCode": "19"
}
```

Record:

```text
POWER_FAILURE_START =
timestamp of the PowerFailure StatusNotification
```

---

## 1.2 Identify PowerFailure END

For each PowerFailure START event, search forward chronologically for the **first subsequent `StatusNotification` on the same `connectorId`** where:

```text
status = "Finishing"
OR
status = "Available"
```

Record:

```text
POWER_FAILURE_END =
timestamp of the first qualifying recovery StatusNotification
```

Do **not** use a `Finishing` or `Available` event belonging to a different `connectorId`.

Therefore:

```text
PowerFailure Downtime =
POWER_FAILURE_END - POWER_FAILURE_START
```

---

## 1.3 Important PowerFailure exclusion rule

A PowerFailure event may contain a period where the charger initially remains connected because of UPS backup and subsequently becomes completely silent.

Example:

```text
PowerFailure START
        ↓
Heartbeat continues
        ↓
Heartbeat continues
        ↓
Last communication
        ↓
No communication
        ↓
BootNotification
        ↓
Available
        ↓
PowerFailure END
```

The communication-loss portion in this sequence **must remain part of PowerFailure Downtime**.

It must **NOT** be separately classified as Offline Downtime

### Rule:

```text
If communication loss occurs within an active
PowerFailure interval:

        → classify it as PowerFailure
        → DO NOT classify it as Offline
```

PowerFailure therefore has **priority over Offline classification**.

---

# 2. Offline Without Error Downtime

## Definition

An **Offline Without Error** event is an inferred loss of charger-to-CMS communication where:

* there is no identified PowerFailure event covering the period;
* the charger was previously communicating normally;
* communication stops for longer than the defined communication timeout;
* no Heartbeat, StatusNotification, MeterValues, transaction messages, or other valid charger-originated OCPP messages are received during the silence period; and
* communication is subsequently re-established through a `BootNotification`.

Conceptually:

```text
Normal communication
        ↓
Heartbeat / StatusNotification / MeterValues 
        ↓
SUDDEN SILENCE
        ↓
Communication gap exceeds threshold
        ↓
NO PowerFailure event
        ↓
BootNotification
        ↓
Communication restored
```

---

## 2.1 Identify the last confirmed communication

For each charger, sort all valid charger-originated OCPP messages chronologically.

Identify:

```text
LAST_COMMUNICATION =
timestamp of the last valid charger → CMS message
```

The communication stream can include, where applicable:

* Heartbeat
* StatusNotification
* MeterValues
* BootNotification
* StartTransaction
* StopTransaction
* Authorize
* DataTransfer
* other valid charger-originated OCPP messages

Heartbeat should be used as the primary **liveness reference**, because transaction messages are naturally intermittent.

---

## 2.2 Identify a candidate communication-loss event

Calculate the time between the last confirmed communication and the next valid charger-originated communication.

A communication gap becomes a candidate Offline event only when it exceeds the predefined **communication timeout threshold**.

Do not classify a short or normal communication delay as Offline.

For example, if the defined threshold is 180 seconds:

```text
Last communication       = 10:06:00
Communication timeout     = 180 seconds
Candidate Offline START   = 10:09:00
```

The threshold should be configurable and should be based on the normal Heartbeat interval observed in the CMS logs.

---

## 2.3 Confirm Offline using BootNotification

A candidate Offline event should be considered **Confirmed Offline Without Error** when a subsequent `BootNotification` is received after the communication gap.

Record:

```text
OFFLINE_START =
LAST_COMMUNICATION + communication timeout

OFFLINE_END =
timestamp of the subsequent BootNotification
```

Therefore:

```text
Offline Without Error Downtime =
OFFLINE_END - OFFLINE_START
```

The `BootNotification` is treated as evidence that the charger has re-established its OCPP communication with the CMS.

Important:

`BootNotification` indicates communication re-establishment but does **not by itself identify the root cause** of the outage.

---

# 3. PowerFailure Exclusion Rule for Offline

Before recording any candidate Offline event, check whether the candidate Offline interval overlaps an identified PowerFailure interval.

### If YES:

```text
DO NOT COUNT AS OFFLINE
```

Classify the period under:

```text
POWER_FAILURE
```

### If NO:

```text
COUNT AS OFFLINE WITHOUT ERROR
```

Therefore:

```text
Offline Without Error =
communication-loss interval
NOT covered by PowerFailure
```

No portion of an identified PowerFailure event should be reclassified as Offline.

---

# 4. Examples

## Example A — PowerFailure followed by communication loss

```text
01:07:33  PowerFailure START
01:09:30  Heartbeat
01:11:30  Heartbeat
01:13:30  Heartbeat
01:15:30  Heartbeat
01:17:30  Last Heartbeat
          ↓
          Silence
          ↓
01:25:00  BootNotification
01:26:00  Available
```

Classification:

```text
PowerFailure = 01:07:33 → 01:26:00

Offline = 0
```

Even though the charger became silent after the UPS-backed communication stopped, this entire period is associated with the active PowerFailure event and must not be counted as Offline.

---

## Example B — Offline Without Error

```text
10:00:00  Heartbeat
10:02:00  Heartbeat
10:04:00  Heartbeat
10:06:00  Heartbeat
          ↓
          Silence
          ↓
10:09:00  Communication timeout reached
          ↓
10:15:00  BootNotification
```

Assuming a 180-second communication timeout:

```text
Offline START = 10:09:00
Offline END   = 10:15:00

Offline Downtime = 6 minutes
```

There is no PowerFailure event covering this interval, so it is classified as:

```text
OFFLINE WITHOUT ERROR
```

---

## Example C — PowerFailure followed by a separate Offline event

```text
10:00  PowerFailure START
10:05  Heartbeat
10:10  Heartbeat
10:20  Available
      ↓
      PowerFailure END

10:22  Heartbeat
10:24  Heartbeat
      ↓
      Silence
      ↓
10:27  Communication timeout
      ↓
10:40  BootNotification
```

Classification:

```text
PowerFailure = 10:00 → 10:20

Offline Without Error = 10:27 → 10:40
```

These are two separate downtime events.

---

# 5. Final Classification Priority

Apply the following priority when calculating downtime:

```text
CMS OCPP LOGS
      │
      ▼
Identify PowerFailure events
      │
      ▼
Create PowerFailure intervals
      │
      ▼
Identify communication gaps
      │
      ▼
Does candidate gap fall within
a PowerFailure interval?
      │
   YES│              NO
      ▼               ▼
 POWER FAILURE    Check communication
                  timeout
                       │
                       ▼
                Gap > threshold?
                  │          │
                 NO         YES
                  │          │
                  ▼          ▼
                Normal   BootNotification?
                              │
                         YES  │  NO
                              ▼
                    OFFLINE WITHOUT ERROR
                              │
                              ▼
                         Otherwise:
                    Unconfirmed communication gap
```

## Final rule

### PowerFailure

```text
Explicit PowerFailure StatusNotification
        +
same-connector recovery StatusNotification
```

### Offline Without Error

```text
Communication gap > defined timeout
        +
subsequent BootNotification
        +
NO PowerFailure interval covering the gap
```

### Critical principle

> **PowerFailure classification takes precedence over Offline classification. Any communication loss occurring during an active PowerFailure event must remain classified as PowerFailure and must not be counted as Offline Without Error.**
