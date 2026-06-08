---
title: "9. Standard Configuration Key Names & Values"
spec-section: "9"
spec-pages: "97–104"
spec-version: "1.6 edition 2 — FINAL, 2017-09-28"
tags:
  - ocpp/1.6
  - configuration
  - configuration-keys
---

# 9. Standard Configuration Key Names & Values

Below follows a list of all configuration keys with a role standardized in this specification. The list is separated by Feature Profiles. A required configuration key mentioned under a particular profile only has to be supported by the Charge Point if it supports that profile. For optional Configuration Keys with a boolean type, the following rules apply for the configuration key in the response to a GetConfiguration.req without a list of keys: • If the key is present, the Charge Point provides the functionality that is configured by the key, and it can be enabled or disabled by setting the value for the key. • If the key is not present, the Charge Point does not provide the functionality that can be configured by the key. The "Accessibility" property shows if the value for a certain configuration key is read-only ("R") or read-write ("RW"). In case the key is read-only, the Central System can read the value for the key using GetConfiguration, but not write it. In case the accessibility is read-write, the Central System can also write the value for the key using ChangeConfiguration.

## 9.1. Core Profile

### 9.1.1. AllowOfflineTxForUnknownId

| KEY | VALUE |
|---|---|
| Required/optional | optional |
| Accessibility | RW |
| Type | boolean |
| Description | If this key exists, the Charge Point supports Unknown Offline Authorization. If this key reports a value of true, Unknown Offline Authorization is enabled. |

### 9.1.2. AuthorizationCacheEnabled

| KEY | VALUE |
|---|---|
| Required/optional | optional |
| Accessibility | RW |
| Type | boolean |
| Description | If this key exists, the Charge Point supports an Authorization Cache. If this key reports a value of true, the Authorization Cache is enabled. |

### 9.1.3. AuthorizeRemoteTxRequests

| KEY | VALUE |
|---|---|
| Required/optional | required |
| Accessibility | R or RW. Choice is up to Charge Point implementation. |
| Type | boolean |
| Description | Whether a remote request to start a transaction in the form of a RemoteStartTransaction.req message should be authorized beforehand like a local action to start a transaction. |

### 9.1.4. BlinkRepeat

| KEY | VALUE |
|---|---|
| Required/optional | optional |
| Accessibility | RW |
| Type | integer |
| Unit | times |
| Description | Number of times to blink Charge Point lighting when signalling |

### 9.1.5. ClockAlignedDataInterval

| KEY | VALUE |
|---|---|
| Required/optional | required |
| Accessibility | RW |
| Type | integer |
| Unit | seconds |
| Description | Size (in seconds) of the clock-aligned data interval. This is the size (in seconds) of the set of evenly spaced aggregation intervals per day, starting at 00:00:00 (midnight). For example, a value of 900 (15 minutes) indicates that every day should be broken into 96 15-minute intervals. When clock aligned data is being transmitted, the interval in question is identified by the start time and (optional) duration interval value, represented according to the ISO8601 standard. All "per-period" data (e.g. energy readings) should be accumulated (for "flow" type measurands such as energy), or averaged (for other values) across the entire interval (or partial interval, at the beginning or end of a Transaction), and transmitted (if so enabled) at the end of each interval, bearing the interval start time timestamp. A value of "0" (numeric zero), by convention, is to be interpreted to mean that no clock-aligned data should be transmitted. |

### 9.1.6. ConnectionTimeOut

| KEY | VALUE |
|---|---|
| Required/optional | required |
| Accessibility | RW |
| Type | integer |
| Unit | seconds |
| Description | Interval *from beginning of status: 'Preparing' until incipient Transaction is automatically canceled, due to failure of EV driver to (correctly) insert the charging cable connector(s) into the appropriate socket(s). The Charge Point SHALL go back to the original state, probably: 'Available'. |

### 9.1.7. ConnectorPhaseRotation

| KEY | VALUE |
|---|---|
| Required/optional | required |
| Accessibility | RW |
| Type | CSL |
| Description | The phase rotation per connector in respect to the connector’s electrical meter (or if absent, the grid connection). Possible values per connector are: NotApplicable (for Single phase or DC Charge Points) Unknown (not (yet) known) RST (Standard Reference Phasing) RTS (Reversed Reference Phasing) SRT (Reversed 240 degree rotation) STR (Standard 120 degree rotation) TRS (Standard 240 degree rotation) TSR (Reversed 120 degree rotation) R can be identified as phase 1 (L1), S as phase 2 (L2), T as phase 3 (L3). If known, the Charge Point MAY also report the phase rotation between the grid connection and the main energymeter by using index number Zero (0). Values are reported in CSL, formatted: 0.RST, 1.RST, 2.RTS |

### 9.1.8. ConnectorPhaseRotationMaxLength

| KEY | VALUE |
|---|---|
| Required/optional | optional |
| Accessibility | R |
| Type | integer |
| Description | Maximum number of items in a ConnectorPhaseRotation Configuration Key. |

### 9.1.9. GetConfigurationMaxKeys

| KEY | VALUE |
|---|---|
| Required/optional | required |
| Accessibility | R |
| Type | integer |
| Description | Maximum number of requested configuration keys in a GetConfiguration.req PDU. |

### 9.1.10. HeartbeatInterval

| KEY | VALUE |
|---|---|
| Required/optional | required |
| Accessibility | RW |
| Type | integer |
| Unit | seconds |
| Description | Interval of inactivity (no OCPP exchanges) with central system after which the Charge Point should send a Heartbeat.req PDU |

### 9.1.11. LightIntensity

| KEY | VALUE |
|---|---|
| Required/optional | optional |
| Accessibility | RW |
| Type | integer |
| Unit | % |
| Description | Percentage of maximum intensity at which to illuminate Charge Point lighting |

### 9.1.12. LocalAuthorizeOffline

| KEY | VALUE |
|---|---|
| Required/optional | required |
| Accessibility | RW |
| Type | boolean |
| Description | whether the Charge Point, when offline, will start a transaction for locally-authorized identifiers. |

### 9.1.13. LocalPreAuthorize

| KEY | VALUE |
|---|---|
| Required/optional | required |
| Accessibility | RW |
| Type | boolean |
| Description | whether the Charge Point, when online, will start a transaction for locally-authorized identifiers without waiting for or requesting an Authorize.conf from the Central System |

### 9.1.14. MaxEnergyOnInvalidId

| KEY | VALUE |
|---|---|
| Required/optional | optional |
| Accessibility | RW |
| Type | integer |
| Unit | Wh |
| Description | Maximum energy in Wh delivered when an identifier is invalidated by the Central System after start of a transaction. |

### 9.1.15. MeterValuesAlignedData

| KEY | VALUE |
|---|---|
| Required/optional | required |
| Accessibility | RW |
| Type | CSL |
| Description | Clock-aligned measurand(s) to be included in a MeterValues.req PDU, every ClockAlignedDataInterval seconds |

### 9.1.16. MeterValuesAlignedDataMaxLength

| KEY | VALUE |
|---|---|
| Required/optional | optional |
| Accessibility | R |
| Type | integer |
| Description | Maximum number of items in a MeterValuesAlignedData Configuration Key. |

### 9.1.17. MeterValuesSampledData

| KEY | VALUE |
|---|---|
| Required/optional | required |
| Accessibility | RW |
| Type | CSL |
| Description | Sampled measurands to be included in a MeterValues.req PDU, every MeterValueSampleInterval seconds. Where applicable, the Measurand is combined with the optional phase; for instance: Voltage.L1 Default: "Energy.Active.Import.Register" |

### 9.1.18. MeterValuesSampledDataMaxLength

| KEY | VALUE |
|---|---|
| Required/optional | optional |
| Accessibility | R |
| Type | integer |
| Description | Maximum number of items in a MeterValuesSampledData Configuration Key. |

### 9.1.19. MeterValueSampleInterval

| KEY | VALUE |
|---|---|
| Required/optional | required |
| Accessibility | RW |
| Type | integer |
| Unit | seconds |
| Description | Interval between sampling of metering (or other) data, intended to be transmitted by "MeterValues" PDUs. For charging session data (ConnectorId>0), samples are acquired and transmitted periodically at this interval from the start of the charging transaction. A value of "0" (numeric zero), by convention, is to be interpreted to mean that no sampled data should be transmitted. |

### 9.1.20. MinimumStatusDuration

| KEY | VALUE |
|---|---|
| Required/optional | optional |
| Accessibility | RW |
| Type | integer |
| Unit | seconds |
| Description | The minimum duration that a Charge Point or Connector status is stable before a StatusNotification.req PDU is sent to the Central System. |

### 9.1.21. NumberOfConnectors

| KEY | VALUE |
|---|---|
| Required/optional | required |
| Accessibility | R |
| Type | integer |
| Description | The number of physical charging connectors of this Charge Point. |

### 9.1.22. ResetRetries

| KEY | VALUE |
|---|---|
| Required/optional | required |
| Accessibility | RW |
| Type | integer |
| Unit | times |
| Description | Number of times to retry an unsuccessful reset of the Charge Point. |

### 9.1.23. StopTransactionOnEVSideDisconnect

| KEY | VALUE |
|---|---|
| Required/optional | required |
| Accessibility | RW |
| Type | boolean |
| Description | When set to true, the Charge Point SHALL administratively stop the transaction when the cable is unplugged from the EV. |

### 9.1.24. StopTransactionOnInvalidId

| KEY | VALUE |
|---|---|
| Required/optional | required |
| Accessibility | RW |
| Type | boolean |
| Description | whether the Charge Point will stop an ongoing transaction when it receives a non- Accepted authorization status in a StartTransaction.conf for this transaction |

### 9.1.25. StopTxnAlignedData

| KEY | VALUE |
|---|---|
| Required/optional | required |
| Accessibility | RW |
| Type | CSL |
| Description | Clock-aligned periodic measurand(s) to be included in the TransactionData element of StopTransaction.req MeterValues.req PDU for every ClockAlignedDataInterval of the Transaction |

### 9.1.26. StopTxnAlignedDataMaxLength

| KEY | VALUE |
|---|---|
| Required/optional | optional |
| Accessibility | R |
| Type | integer |
| Description | Maximum number of items in a StopTxnAlignedData Configuration Key. |

### 9.1.27. StopTxnSampledData

| KEY | VALUE |
|---|---|
| Required/optional | required |
| Accessibility | RW |
| Type | CSL |
| Description | Sampled measurands to be included in the TransactionData element of StopTransaction.req PDU, every MeterValueSampleInterval seconds from the start of the charging session |

### 9.1.28. StopTxnSampledDataMaxLength

| KEY | VALUE |
|---|---|
| Required/optional | optional |
| Accessibility | R |
| Type | integer |
| Description | Maximum number of items in a StopTxnSampledData Configuration Key. |

### 9.1.29. SupportedFeatureProfiles

| KEY | VALUE |
|---|---|
| Required/optional | required |
| Accessibility | R |
| Type | CSL |
| Description | A list of supported Feature Profiles. Possible profile identifiers: Core, FirmwareManagement, LocalAuthListManagement, Reservation, SmartCharging and RemoteTrigger. |

### 9.1.30. SupportedFeatureProfilesMaxLength

| KEY | VALUE |
|---|---|
| Required/optional | optional |
| Accessibility | R |
| Type | integer |
| Description | Maximum number of items in a SupportedFeatureProfiles Configuration Key. |

### 9.1.31. TransactionMessageAttempts

| KEY | VALUE |
|---|---|
| Required/optional | required |
| Accessibility | RW |
| Type | integer |
| Unit | times |
| Description | How often the Charge Point should try to submit a transaction-related message when the Central System fails to process it. |

### 9.1.32. TransactionMessageRetryInterval

| KEY | VALUE |
|---|---|
| Required/optional | required |
| Accessibility | RW |
| Type | integer |
| Unit | seconds |
| Description | How long the Charge Point should wait before resubmitting a transaction-related message that the Central System failed to process. |

### 9.1.33. UnlockConnectorOnEVSideDisconnect

| KEY | VALUE |
|---|---|
| Required/optional | required |
| Accessibility | RW |
| Type | boolean |
| Description | When set to true, the Charge Point SHALL unlock the cable on Charge Point side when the cable is unplugged at the EV. |

### 9.1.34. WebSocketPingInterval

| KEY | VALUE |
|---|---|
| Required/optional | optional |
| Accessibility | RW |
| Type | integer |
| Unit | seconds |
| Description | Only relevant for websocket implementations. 0 disables client side websocket Ping/Pong. In this case there is either no ping/pong or the server initiates the ping and client responds with Pong. Positive values are interpreted as number of seconds between pings. Negative values are not allowed. ChangeConfiguration is expected to return a REJECTED result. |

## 9.2. Local Auth List Management Profile

### 9.2.1. LocalAuthListEnabled

| KEY | VALUE |
|---|---|
| Required/optional | required |
| Accessibility | RW |
| Type | boolean |
| Description | whether the Local Authorization List is enabled |

### 9.2.2. LocalAuthListMaxLength

| KEY | VALUE |
|---|---|
| Required/optional | required |
| Accessibility | R |
| Type | integer |
| Description | Maximum number of identifications that can be stored in the Local Authorization List |

### 9.2.3. SendLocalListMaxLength

| KEY | VALUE |
|---|---|
| Required/optional | required |
| Accessibility | R |
| Type | integer |
| Description | Maximum number of identifications that can be send in a single SendLocalList.req |

## 9.3. Reservation Profile

### 9.3.1. ReserveConnectorZeroSupported

| KEY | VALUE |
|---|---|
| Required/optional | optional |
| Accessibility | R |
| Type | boolean |
| Description | If this configuration key is present and set to true: Charge Point support reservations on connector 0. |

## 9.4. Smart Charging Profile

### 9.4.1. ChargeProfileMaxStackLevel

| KEY | VALUE |
|---|---|
| Required/optional | required |
| Accessibility | R |
| Type | integer |
| Description | Max StackLevel of a ChargingProfile. The number defined also indicates the max allowed number of installed charging schedules per Charging Profile Purposes. |

### 9.4.2. ChargingScheduleAllowedChargingRateUnit

| KEY | VALUE |
|---|---|
| Required/optional | required |
| Accessibility | R |
| Type | CSL |
| Description | A list of supported quantities for use in a ChargingSchedule. Allowed values: 'Current' and 'Power' |

### 9.4.3. ChargingScheduleMaxPeriods

| KEY | VALUE |
|---|---|
| Required/optional | required |
| Accessibility | R |
| Type | integer |
| Description | Maximum number of periods that may be defined per ChargingSchedule. |

### 9.4.4. ConnectorSwitch3to1PhaseSupported

| KEY | VALUE |
|---|---|
| Required/optional | optional |
| Accessibility | R |
| Type | boolean |
| Description | If defined and true, this Charge Point support switching from 3 to 1 phase during a Transaction. |

### 9.4.5. MaxChargingProfilesInstalled

| KEY | VALUE |
|---|---|
| Required/optional | required |
| Accessibility | R |
| Type | integer |
| Description | Maximum number of Charging profiles installed at a time |
