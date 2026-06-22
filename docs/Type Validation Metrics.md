

# Recommended Metrics

## 1. Overall Health Metrics

| Metric                  | Formula                             | Source Requirement | Why it matters          |
| ----------------------- | ----------------------------------- | ------------------ | ----------------------- |
| Total Frames            | Count of all OCPP frames            | VAL-001            | Overall traffic volume  |
| Total Calls             | Count of MessageType=2              | VAL-002            | Request volume          |
| Total CallResults       | Count of MessageType=3              | VAL-004            | Successful responses    |
| Total CallErrors        | Count of MessageType=4              | VAL-004            | Error volume            |
| Total Exchanges         | Successfully paired Call + Response | VAL-004            | End-to-end transactions |
| Validation Success Rate | Valid Frames / Total Frames         | VAL-002 + VAL-003  | Protocol compliance     |

---

## 2. L1: RPC Frame Metrics

| Metric                   | Formula                             |
| ------------------------ | ----------------------------------- |
| Invalid Frame Count      | FRAME_INVALID count                 |
| Invalid Frame %          | Invalid Frames / Total Frames × 100 |
| Invalid CALL Count       | Malformed type=2                    |
| Invalid CALLRESULT Count | Malformed type=3                    |
| Invalid CALLERROR Count  | Malformed type=4                    |

Example:

```text
L1 Health = 98.7%
FRAME_INVALID = 5
```

---

## 3. L2: Schema Compliance Metrics

| Metric                   | Formula                               |
| ------------------------ | ------------------------------------- |
| Schema Violations        | Total SCHEMA_VIOLATION                |
| Schema Compliance %      | Valid Payloads / Total Payloads × 100 |
| Missing Mandatory Fields | Count                                 |
| Data Type Errors         | Count                                 |
| Enum Violations          | Count                                 |
| Max Violating Action     | Top offender                          |

Example:

```text
StatusNotification : 18 violations
MeterValues : 6 violations
```

---

## 4. L3: Request-Response Correlation Metrics

| Metric                | Formula                                 |
| --------------------- | --------------------------------------- |
| Paired Exchanges      | Successful pairings                     |
| Pairing Success Rate  | Paired Calls / Total Calls × 100        |
| Result Mismatch Count | RESULT_MISMATCH                         |
| Result Match Rate     | Correct Matches / Total Responses × 100 |

Example:

```text
Calls = 100
Paired = 97
Pairing Success = 97%
```

---

## 5. Orphan Metrics

| Metric           | Formula                            |
| ---------------- | ---------------------------------- |
| Orphan Calls     | Call without response              |
| Orphan Responses | Response without Call              |
| Orphan Rate      | Total Orphans / Total Frames × 100 |

These are extremely useful during PCAP analysis.

Example:

```text
Orphan Calls = 3
Orphan Responses = 1
```

---

## 6. Latency Metrics (VAL-006)

This is probably the most valuable operational KPI.

| Metric        | Formula                |
| ------------- | ---------------------- |
| Average RTT   | Sum RTT / Exchanges    |
| Min RTT       | Lowest RTT             |
| Max RTT       | Highest RTT            |
| P95 RTT       | 95th percentile        |
| P99 RTT       | 99th percentile        |
| Timeout Count | RTT > Threshold        |
| Timeout Rate  | Timeouts / Calls × 100 |

Example:

```text
Average RTT = 420 ms
P95 = 850 ms
Max = 2300 ms
```

Suggested thresholds:

| RTT         | Status  |
| ----------- | ------- |
| <500 ms     | Healthy |
| 500-1000 ms | Warning |
| >1000 ms    | Poor    |

---

## 7. Action-wise Metrics

This is very useful for charger debugging.

| Action           | Calls | Success | Errors | Avg RTT |
| ---------------- | ----- | ------- | ------ | ------- |
| BootNotification | 1     | 1       | 0      | 180 ms  |
| Heartbeat        | 100   | 100     | 0      | 80 ms   |
| Authorize        | 50    | 48      | 2      | 220 ms  |
| StartTransaction | 45    | 44      | 1      | 310 ms  |

cover for all Action
---


---

## 9. Overall Compliance Score (Recommended)



```text
Compliance Score =
40% Frame Validation +
30% Schema Validation +
20% Pairing Validation +
10% Orphan Validation
```

Example:

```text
Frame Score     : 99%
Schema Score    : 97%
Pairing Score   : 96%
Orphan Score    : 98%

Overall Score = 97.7%
```

---

# My recommendation: Organize your tool output into these 4 layers

| Layer | Purpose     | Metrics                      |
| ----- | ----------- | ---------------------------- |
| L1    | RPC Frame   | FRAME_INVALID                |
| L2    | Schema      | SCHEMA_VIOLATION             |
| L3    | Correlation | RESULT_MISMATCH              |
| L4    | Extensions  | ISO15118/OCPP business rules |

and expose these **top-level KPIs**:

```text
Frames Processed
Validation Success %
Schema Compliance %
Pairing Success %
Orphan Count
Average RTT
P95 RTT
Total Errors
Overall Compliance Score
```

Since you mentioned **PCAP log analysis** in previous conversations, these metrics will make the tool extremely useful for **charger ↔ CMS debugging** instead of being just a schema validator.
