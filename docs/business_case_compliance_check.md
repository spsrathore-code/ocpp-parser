
# OCPP 1.6J - Charge Point Initiated Operations Compliance Rules

Source:
04-Operations-Initiated-by-Charge-Point.md (obsidian://open?vault=Claude%20Tools&file=P4_OCPP%20Client%20Parser%2Fknowledge%2Fstandards%2Focpp-1.6%2F04-Operations-Initiated-by-Charge-Point)

Purpose:
These business cases are derived ONLY from OCPP 1.6J Section 4 - Operations Initiated by Charge Point.

---

| Test ID | Spec Reference | Target Message | Compliance Rule / Invariant | Log Audit Logic | Severity |
|---------|----------------|----------------|----------------------------|----------------|----------|

# 4.1 Authorize

| AUTH-001 | 4.1 | Authorize | Charging SHALL occur only after successful authorization | Verify charging session does not begin without accepted authorization | Critical |
| AUTH-002 | 4.1 | Authorize | Every Authorize.req SHALL receive Authorize.conf | Verify request-response pairing | Critical |
| AUTH-003 | 4.1 | Authorize | Authorize.req for stopping SHALL only occur if stop idTag differs from start idTag | Compare transaction start and stop identifiers | Major |
| AUTH-004 | 4.1 | Authorize | Authorize.req SHOULD only be used for charging authorization | Flag unexpected usage patterns | Minor |

---

# 4.2 BootNotification

| BOOT-001 | 4.2 | BootNotification | BootNotification SHALL be sent after every boot/reboot | Detect reconnect event and verify BootNotification | Critical |
| BOOT-002 | 4.2 | BootNotification | CP SHALL NOT send any request before Accepted/Pending | Verify CP silence before acceptance | Critical |
| BOOT-003 | 4.2 | BootNotification | Cached offline messages SHALL NOT bypass BootNotification | Detect queued messages before acceptance | Critical |
| BOOT-004 | 4.2 | BootNotification | Rejected CP SHALL NOT send any OCPP message during retry interval | Verify CP silence during retry interval | Critical |
| BOOT-005 | 4.2 | BootNotification | Rejected CP SHALL NOT respond to CS initiated messages | Verify no responses during rejected state | Critical |
| BOOT-006 | 4.2 | BootNotification | Pending CP SHALL NOT send requests unless TriggerMessage exists | Verify CP silence during pending | Critical |
| BOOT-007 | 4.2 | BootNotification | RemoteStartTransaction SHALL NOT occur during Pending | Verify CMS behavior | Major |
| BOOT-008 | 4.2 | BootNotification | RemoteStopTransaction SHALL NOT occur during Pending | Verify CMS behavior | Major |
| BOOT-009 | 4.2 | BootNotification | BootNotification retries SHALL respect retry interval | Validate retry timing | Major |

---

# 4.3 DataTransfer

| DT-001 | 4.3 | DataTransfer | Every DataTransfer.req SHALL receive DataTransfer.conf | Verify pairing | Critical |
| DT-002 | 4.3 | DataTransfer | UnknownVendor SHALL NOT contain data field | Validate response payload | Major |
| DT-003 | 4.3 | DataTransfer | Unsupported messageId SHALL return UnknownMessageId | Validate response payload | Major |

---

# 4.4 DiagnosticsStatusNotification

| DIAG-001 | 4.4 | DiagnosticsStatusNotification | Every request SHALL receive DiagnosticsStatusNotification.conf | Verify pairing | Critical |
| DIAG-002 | 4.4 | DiagnosticsStatusNotification | Idle SHALL only occur after TriggerMessage when not uploading | Validate event dependency | Major |

---

# 4.5 FirmwareStatusNotification

| FW-001 | 4.5 | FirmwareStatusNotification | Every request SHALL receive FirmwareStatusNotification.conf | Verify pairing | Critical |
| FW-002 | 4.5 | FirmwareStatusNotification | Idle SHALL only occur after TriggerMessage when not downloading/installing firmware | Validate event dependency | Major |

---

# 4.6 Heartbeat

| HEART-001 | 4.6 | Heartbeat | Every Heartbeat.req SHALL receive Heartbeat.conf | Verify pairing | Critical |
| HEART-002 | 4.6 | Heartbeat | Heartbeat MAY be skipped if another PDU was sent within heartbeat interval | Suppress false positives | Informational |
| HEART-003 | 4.6 | Heartbeat | Heartbeat.conf SHALL contain currentTime | Validate response payload | Major |

---

# 4.7 MeterValues

| METER-001 | 4.7 | MeterValues | Every MeterValues.req SHALL receive MeterValues.conf | Verify pairing | Critical |
| METER-002 | 4.7 | MeterValues | transactionId SHALL belong to active transaction if present | Validate transaction mapping | Major |
| METER-003 | 4.7 | MeterValues | MeterValues timestamps SHALL be chronological | Validate timestamp ordering | Major |
| METER-004 | 4.7 | MeterValues | connectorId=0 energy measurements SHALL represent Charge Point level meter | Validate connector usage | Major |
| METER-005 | 4.7 | MeterValues | MeterValues SHALL NOT appear after transaction closure | Validate transaction lifecycle | Major |

---

# 4.8 StartTransaction

| START-001 | 4.8 | StartTransaction | Every StartTransaction.req SHALL receive StartTransaction.conf | Verify pairing | Critical |
| START-002 | 4.8 | StartTransaction | reservationId SHALL exist if reservation is being terminated | Validate reservation mapping | Major |
| START-003 | 4.8 | StartTransaction | StartTransaction.conf SHALL contain transactionId | Validate response payload | Critical |

---

# 4.9 StatusNotification

| STATUS-001 | 4.9 | StatusNotification | Every StatusNotification.req SHALL receive StatusNotification.conf | Verify pairing | Critical |
| STATUS-002 | 4.9 | StatusNotification | ConnectorId=0 SHALL only use Available, Unavailable or Faulted | Validate allowed states | Critical |
| STATUS-003 | 4.9 | StatusNotification | Connector state transitions SHALL follow official state transition matrix | Validate state graph | Critical |
| STATUS-004 | 4.9 | StatusNotification | SuspendedEVSE SHALL take precedence over SuspendedEV | Validate precedence | Major |
| STATUS-005 | 4.9 | StatusNotification | Unavailable SHALL persist across reboot | Validate persistence | Major |
| STATUS-006 | 4.9 | StatusNotification | EVCommunicationError SHALL only occur with Preparing, SuspendedEV, SuspendedEVSE and Finishing | Validate combinations | Major |
| STATUS-007 | 4.9 | StatusNotification | Offline synchronization SHALL only report current state and errors | Validate offline recovery behavior | Major |
| STATUS-008 | 4.9 | StatusNotification | Offline synchronization messages SHALL preserve event order | Validate ordering | Major |
| STATUS-009 | 4.9 | StatusNotification | EV disconnect behavior SHALL respect StopTransactionOnEVSideDisconnect | Validate configuration behavior | Major |

---

# 4.10 StopTransaction

| STOP-001 | 4.10 | StopTransaction | Every StopTransaction.req SHALL receive StopTransaction.conf | Verify pairing | Critical |
| STOP-002 | 4.10 | StopTransaction | transactionId SHALL belong to active transaction | Validate transaction mapping | Critical |
| STOP-003 | 4.10 | StopTransaction | meterStop SHALL be greater than or equal to meterStart | Validate meter progression | Major |
| STOP-004 | 4.10 | StopTransaction | StopTransactionOnEVSideDisconnect=true SHALL stop transaction | Validate behavior | Major |
| STOP-005 | 4.10 | StopTransaction | StopTransactionOnEVSideDisconnect=false SHALL NOT stop transaction | Validate behavior | Major |
| STOP-006 | 4.10 | StopTransaction | StopTransactionOnEVSideDisconnect=false SHALL take precedence over UnlockConnectorOnEVSideDisconnect | Validate precedence | Major |


