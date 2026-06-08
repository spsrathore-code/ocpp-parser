---
title: "7. Types"
spec-section: "7"
spec-pages: "76–94"
spec-version: "1.6 edition 2 — FINAL, 2017-09-28"
tags:
  - ocpp/1.6
  - types
---

# 7. Types

## 7.1. AuthorizationData

*Class*

Elements that constitute an entry of a Local Authorization List update.

| FIELD NAME | FIELD TYPE | CARD. | DESCRIPTION |
|---|---|---|---|
| idTag | IdToken | 1..1 | Required. The identifier to which this authorization applies. |
| idTagInfo | IdTagInfo | 0..1 | Optional. (Required when UpdateType is Full) This contains information about authorization status, expiry and parent id. For a Differential update the following applies: If this element is present, then this entry SHALL be added or updated in the Local Authorization List. If this element is absent, than the entry for this idtag in the Local Authorization List SHALL be deleted. |

## 7.2. AuthorizationStatus

*Enumeration*

Status in a response to an Authorize.req.

| VALUE | DESCRIPTION |
|---|---|
| Accepted | Identifier is allowed for charging. |
| Blocked | Identifier has been blocked. Not allowed for charging. |
| Expired | Identifier has expired. Not allowed for charging. |
| Invalid | Identifier is unknown. Not allowed for charging. |
| ConcurrentTx | Identifier is already involved in another transaction and multiple transactions are not allowed. (Only relevant for a StartTransaction.req.) |

## 7.3. AvailabilityStatus

*Enumeration*

Status returned in response to ChangeAvailability.req.

| VALUE | DESCRIPTION |
|---|---|
| Accepted | Request has been accepted and will be executed. |
| Rejected | Request has not been accepted and will not be executed. |
| Scheduled | Request has been accepted and will be executed when transaction(s) in progress have finished. |

## 7.4. AvailabilityType

*Enumeration*

Requested availability change in ChangeAvailability.req.

| VALUE | DESCRIPTION |
|---|---|
| Inoperative | Charge point is not available for charging. |
| Operative | Charge point is available for charging. |

## 7.5. CancelReservationStatus

*Enumeration*

Status in CancelReservation.conf.

| VALUE | DESCRIPTION |
|---|---|
| Accepted | Reservation for the identifier has been cancelled. |
| Rejected | Reservation could not be cancelled, because there is no reservation active for the identifier. |

## 7.6. ChargePointErrorCode

*Enumeration*

Charge Point status reported in StatusNotification.req.

| VALUE | DESCRIPTION |
|---|---|
| ConnectorLockFailure | Failure to lock or unlock connector. |
| EVCommunicationError | Communication failure with the vehicle, might be Mode 3 or other communication protocol problem. This is not a real error in the sense that the Charge Point doesn’t need to go to the faulted state. Instead, it should go to the SuspendedEVSE state. |
| GroundFailure | Ground fault circuit interrupter has been activated. |
| HighTemperature | Temperature inside Charge Point is too high. |
| InternalError | Error in internal hard- or software component. |
| LocalListConflict | The authorization information received from the Central System is in conflict with the LocalAuthorizationList. |
| NoError | No error to report. |
| OtherError | Other type of error. More information in vendorErrorCode. |
| OverCurrentFailure | Over current protection device has tripped. |
| OverVoltage | Voltage has risen above an acceptable level. |
| PowerMeterFailure | Failure to read electrical/energy/power meter. |
| PowerSwitchFailure | Failure to control power switch. |
| ReaderFailure | Failure with idTag reader. |
| ResetFailure | Unable to perform a reset. |
| UnderVoltage | Voltage has dropped below an acceptable level. |
| WeakSignal | Wireless communication device reports a weak signal. |

## 7.7. ChargePointStatus

*Enumeration*

Status reported in StatusNotification.req. A status can be reported for the Charge Point main controller (connectorId = 0) or for a specific connector. Status for the Charge Point main controller is a subset of the enumeration: Available, Unavailable or Faulted. States considered Operative are: Available, Preparing, Charging, SuspendedEVSE, SuspendedEV, Finishing, Reserved. States considered Inoperative are: Unavailable, Faulted.

| STATUS | CONDITION |
|---|---|
| Available | When a Connector becomes available for a new user (Operative) |
| Preparing | When a Connector becomes no longer available for a new user but there is no ongoing Transaction (yet). Typically a Connector is in preparing state when a user presents a tag, inserts a cable or a vehicle occupies the parking bay (Operative) |
| Charging | When the contactor of a Connector closes, allowing the vehicle to charge (Operative) |
| SuspendedEVSE | When the EV is connected to the EVSE but the EVSE is not offering energy to the EV, e.g. due to a smart charging restriction, local supply power constraints, or as the result of StartTransaction.conf indicating that charging is not allowed etc. (Operative) |
| SuspendedEV | When the EV is connected to the EVSE and the EVSE is offering energy but the EV is not taking any energy. (Operative) |
| Finishing | When a Transaction has stopped at a Connector, but the Connector is not yet available for a new user, e.g. the cable has not been removed or the vehicle has not left the parking bay (Operative) |
| Reserved | When a Connector becomes reserved as a result of a Reserve Now command (Operative) |
| Unavailable | When a Connector becomes unavailable as the result of a Change Availability command or an event upon which the Charge Point transitions to unavailable at its discretion. Upon receipt of a Change Availability command, the status MAY change immediately or the change MAY be scheduled. When scheduled, the Status Notification shall be send when the availability change becomes effective (Inoperative) |
| Faulted | When a Charge Point or connector has reported an error and is not available for energy delivery . (Inoperative). |

## 7.8. ChargingProfile

*Class*

A ChargingProfile consists of a ChargingSchedule, describing the amount of power or current that can be delivered per time interval.

```text
ChargingProfile
chargingProfileId: int [1..1]
transactionId: int [0..1]
stackLevel: int [1..1]
chargingProfilePurpose: ChargingProfilePurposeType 1..1
chargingProfileKind: ChargingProfileKindType [1..1]
recurrencyKind: RecurrencyKindType [0..1]
validFrom: DateTime [0..1]
validTo: DateTime [0..1]
chargingSchedule: ChargingSchedule [1..1]
ChargingSchedule
duration: int [0..1]
startSchedule: DateTime [0..1]
schedulingUnit: SchedulingUnitType [1..1]
chargingSchedulePeriod: ChargingSchedulepPeriod [1..*]
minChargingRate: decimal [0..1]
ChargingSchedulePeriod
startPeriod: int [1..1]
limit: int [1..1]
numberPhases: int [0..1]
ChargingProfilePurposeType
ChargePointMaxProfile
TxDefaultProfile
TxProfile
ChargingProfileKindType
Absolute
Recurring
Relative
RecurrencyKindType
Daily
Weekly
1
1
1
*
```

*Figure 42. Class Diagram: ChargingProfile*

| FIELD NAME | FIELD TYPE | CARD. | DESCRIPTION |
|---|---|---|---|
| chargingProfileId | integer | 1..1 | Required. Unique identifier for this profile. |
| transactionId | integer | 0..1 | Optional. Only valid if ChargingProfilePurpose is set to TxProfile, the transactionId MAY be used to match the profile to a specific transaction. |
| stackLevel | integer >=0 | 1..1 | Required. Value determining level in hierarchy stack of profiles. Higher values have precedence over lower values. Lowest level is 0. |
| chargingProfilePurpose | ChargingProfilePurposeType | 1..1 | Required. Defines the purpose of the schedule transferred by this message. |
| chargingProfileKind | ChargingProfileKindType | 1..1 | Required. Indicates the kind of schedule. |
| recurrencyKind | RecurrencyKindType | 0..1 | Optional. Indicates the start point of a recurrence. |
| validFrom | dateTime | 0..1 | Optional. Point in time at which the profile starts to be valid. If absent, the profile is valid as soon as it is received by the Charge Point. |
| validTo | dateTime | 0..1 | Optional. Point in time at which the profile stops to be valid. If absent, the profile is valid until it is replaced by another profile. |
| chargingSchedule | ChargingSchedule | 1..1 | Required. Contains limits for the available power or current over time. |

## 7.9. ChargingProfileKindType

*Enumeration*

Kind of charging profile, as used in: ChargingProfile.

| VALUE | DESCRIPTION |
|---|---|
| Absolute | Schedule periods are relative to a fixed point in time defined in the schedule. |
| Recurring | The schedule restarts periodically at the first schedule period. |
| Relative | Schedule periods are relative to a situation-specific start point (such as the start of a Transaction) that is determined by the charge point. |

## 7.10. ChargingProfilePurposeType

*Enumeration*

Purpose of the charging profile, as used in: ChargingProfile.

| VALUE | DESCRIPTION |
|---|---|
| ChargePointMaxProfile | Configuration for the maximum power or current available for an entire Charge Point. |
| TxDefaultProfile | Default profile *that can be configured in the Charge Point. When a new transaction is started, this profile SHALL be used, unless it was a transaction that was started by a RemoteStartTransaction.req with a ChargeProfile that is accepted by the Charge Point. |
| TxProfile | Profile with constraints to be imposed by the Charge Point on the current transaction, or on a new transaction when this is started via a RemoteStartTransaction.req with a ChargeProfile. A profile with this purpose SHALL cease to be valid when the transaction terminates. |

## 7.11. ChargingProfileStatus

*Enumeration*

Status returned in response to SetChargingProfile.req.

| VALUE | DESCRIPTION |
|---|---|
| Accepted | Request has been accepted and will be executed. |
| Rejected | Request has not been accepted and will not be executed. |
| NotSupported | Charge Point indicates that the request is not supported. |

## 7.12. ChargingRateUnitType

*Enumeration*

Unit in which a charging schedule is defined, as used in: GetCompositeSchedule.req and ChargingSchedule

| VALUE | DESCRIPTION |
|---|---|
| W | Watts (power). This is the TOTAL allowed charging power. If used for AC Charging, the phase current should be calculated via: Current per phase = Power / (Line Voltage * Number of Phases). The "Line Voltage" used in the calculation is not the measured voltage, but the set voltage for the area (hence, 230 of 110 volt). The "Number of Phases" is the numberPhases from the ChargingSchedulePeriod. It is usually more convenient to use this for DC charging. Note that if numberPhases in a ChargingSchedulePeriod is absent, 3 SHALL be assumed. |
| A | Amperes (current). The amount of Ampere per phase, not the sum of all phases. It is usually more convenient to use this for AC charging. |

## 7.13. ChargingSchedule

*Class*

Charging schedule structure defines a list of charging periods, as used in: GetCompositeSchedule.conf and ChargingProfile.

| FIELD NAME | FIELD TYPE | CARD. | DESCRIPTION |
|---|---|---|---|
| duration | integer | 0..1 | Optional. Duration of the charging schedule in seconds. If the duration is left empty, the last period will continue indefinitely or until end of the transaction in case startSchedule is absent. |
| startSchedule | dateTime | 0..1 | Optional. Starting point of an absolute schedule. If absent the schedule will be relative to start of charging. |
| chargingRateUnit | ChargingRateUnitType | 1..1 | Required. The unit of measure Limit is expressed in. |
| chargingSchedulePeriod | ChargingSchedulePeriod | 1..* | Required. List of ChargingSchedulePeriod elements defining maximum power or current usage over time. The startSchedule of the first ChargingSchedulePeriod SHALL always be 0. |
| minChargingRate | decimal | 0..1 | Optional. Minimum charging rate supported by the electric vehicle. The unit of measure is defined by the chargingRateUnit. This parameter is intended to be used by a local smart charging algorithm to optimize the power allocation for in the case a charging process is inefficient at lower charging rates. Accepts at most one digit fraction (e.g. 8.1) |

## 7.14. ChargingSchedulePeriod

*Class*

Charging schedule period structure defines a time period in a charging schedule, as used in: ChargingSchedule.

| FIELD NAME | FIELD TYPE | CARD. | DESCRIPTION |
|---|---|---|---|
| startPeriod | integer | 1..1 | Required. Start of the period, in seconds from the start of schedule. The value of StartPeriod also defines the stop time of the previous period. |
| limit | decimal | 1..1 | Required. Charging rate limit during the schedule period, in the applicable chargingRateUnit, for example in Amperes or Watts. Accepts at most one digit fraction (e.g. 8.1). |
| numberPhases | integer | 0..1 | Optional. The number of phases that can be used for charging. If a number of phases is needed, numberPhases=3 will be assumed unless another number is given. |

## 7.15. CiString20Type

*Type*

Generic used case insensitive string of 20 characters.

| FIELD TYPE | DESCRIPTION |
|---|---|
| CiString[20] | String is case insensitive. |

## 7.16. CiString25Type

*Type*

Generic used case insensitive string of 25 characters.

| FIELD TYPE | DESCRIPTION |
|---|---|
| CiString[25] | String is case insensitive. |

## 7.17. CiString50Type

*Type*

Generic used case insensitive string of 50 characters.

| FIELD TYPE | DESCRIPTION |
|---|---|
| CiString[50] | String is case insensitive. |

## 7.18. CiString255Type

*Type*

Generic used case insensitive string of 255 characters.

| FIELD TYPE | DESCRIPTION |
|---|---|
| CiString[255] | String is case insensitive. |

## 7.19. CiString500Type

*Type*

Generic used case insensitive string of 500 characters.

| FIELD TYPE | DESCRIPTION |
|---|---|
| CiString[500] | String is case insensitive. |

## 7.20. ClearCacheStatus

*Enumeration*

Status returned in response to ClearCache.req.

| VALUE | DESCRIPTION |
|---|---|
| Accepted | Command has been executed. |
| Rejected | Command has not been executed. |

## 7.21. ClearChargingProfileStatus

*Enumeration*

Status returned in response to ClearChargingProfile.req.

| VALUE | DESCRIPTION |
|---|---|
| Accepted | Request has been accepted and will be executed. |
| Unknown | No Charging Profile(s) were found matching the request. |

## 7.22. ConfigurationStatus

*Enumeration*

Status in ChangeConfiguration.conf.

| VALUE | DESCRIPTION |
|---|---|
| Accepted | Configuration key is supported and setting has been changed. |
| Rejected | Configuration key is supported, but setting could not be changed. |
| RebootRequired | Configuration key is supported and setting has been changed, but change will be available after reboot (Charge Point will not reboot itself) |
| NotSupported | Configuration key is not supported. |

## 7.23. DataTransferStatus

*Enumeration*

Status in DataTransfer.conf.

| VALUE | DESCRIPTION |
|---|---|
| Accepted | Message has been accepted and the contained request is accepted. |
| Rejected | Message has been accepted but the contained request is rejected. |
| UnknownMessageId | Message could not be interpreted due to unknown messageId string. |
| UnknownVendorId | Message could not be interpreted due to unknown vendorId string. |

## 7.24. DiagnosticsStatus

*Enumeration*

Status in DiagnosticsStatusNotification.req.

| VALUE | DESCRIPTION |
|---|---|
| Idle | Charge Point is not performing diagnostics related tasks. Status Idle SHALL only be used as in a DiagnosticsStatusNotification.req that was triggered by a TriggerMessage.req |
| Uploaded | Diagnostics information has been uploaded. |
| UploadFailed | Uploading of diagnostics failed. |
| Uploading | File is being uploaded. |

## 7.25. FirmwareStatus

*Enumeration*

Status of a firmware download as reported in FirmwareStatusNotification.req.

| VALUE | DESCRIPTION |
|---|---|
| Downloaded | New firmware has been downloaded by Charge Point. |
| DownloadFailed | Charge point failed to download firmware. |
| Downloading | Firmware is being downloaded. |
| Idle | Charge Point is not performing firmware update related tasks. Status Idle SHALL only be used as in a FirmwareStatusNotification.req that was triggered by a TriggerMessage.req |
| InstallationFailed | Installation of new firmware has failed. |
| Installing | Firmware is being installed. |
| Installed | New firmware has successfully been installed in charge point. |

## 7.26. GetCompositeScheduleStatus

*Enumeration*

Status returned in response to GetCompositeSchedule.req.

| VALUE | DESCRIPTION |
|---|---|
| Accepted | Request has been accepted and will be executed. |
| Rejected | Request has not been accepted and will not be executed. |

## 7.27. IdTagInfo

*Class*

Contains status information about an identifier. It is returned in Authorize, Start Transaction and Stop Transaction responses. If expiryDate is not given, the status has no end date.

| FIELD NAME | FIELD TYPE | CARD. | DESCRIPTION |
|---|---|---|---|
| expiryDate | dateTime | 0..1 | Optional. This contains the date at which idTag should be removed from the Authorization Cache. |
| parentIdTag | IdToken | 0..1 | Optional. This contains the parent-identifier. |
| status | AuthorizationStatus | 1..1 | Required. This contains whether the idTag has been accepted or not by the Central System. |

## 7.28. IdToken

*Type*

Contains the identifier to use for authorization. It is a case insensitive string. In future releases this may become a complex type to support multiple forms of identifiers.

| FIELD TYPE | DESCRIPTION |
|---|---|
| CiString20Type | IdToken is case insensitive. |

## 7.29. KeyValue

*Class*

Contains information about a specific configuration key. It is returned in GetConfiguration.conf.

| FIELD NAME | FIELD TYPE | CARD. | DESCRIPTION |
|---|---|---|---|
| key | CiString50Type | 1..1 | Required. |
| readonly | boolean | 1..1 | Required. False if the value can be set with the ChangeConfiguration message. |
| value | CiString500Type | 0..1 | Optional. If key is known but not set, this field may be absent. |

## 7.30. Location

*Enumeration*

Allowable values of the optional "location" field of a value element in SampledValue.

| VALUE | DESCRIPTION |
|---|---|
| Body | Measurement inside body of Charge Point (e.g. Temperature) |
| Cable | Measurement taken from cable between EV and Charge Point |
| EV | Measurement taken by EV |
| Inlet | Measurement at network (“grid”) inlet connection |
| Outlet | Measurement at a Connector. Default value |

## 7.31. Measurand

*Enumeration*

Allowable values of the optional "measurand" field of a Value element, as used in MeterValues.req and StopTransaction.req messages. Default value of "measurand" is always "Energy.Active.Import.Register"  Import is energy flow from the Grid to the Charge Point, EV or other load. Export is energy flow from the EV to the Charge Point and/or from the Charge Point to the Grid.

| VALUE | DESCRIPTION |
|---|---|
| Current.Export | Instantaneous current flow from EV |
| Current.Import | Instantaneous current flow to EV |
| Current.Offered | Maximum current offered to EV |
| Energy.Active.Export.Register | Numerical value read from the "active electrical energy" (Wh or kWh) register of the (most authoritative) electrical meter measuring energy exported (to the grid). |
| Energy.Active.Import.Register | Numerical value read from the "active electrical energy" (Wh or kWh) register of the (most authoritative) electrical meter measuring energy imported (from the grid supply). |
| Energy.Reactive.Export.Register | Numerical value read from the "reactive electrical energy" (VARh or kVARh) register of the (most authoritative) electrical meter measuring energy exported (to the grid). |
| Energy.Reactive.Import.Register | Numerical value read from the "reactive electrical energy" (VARh or kVARh) register of the (most authoritative) electrical meter measuring energy imported (from the grid supply). |
| Energy.Active.Export.Interval | Absolute amount of "active electrical energy" (Wh or kWh) exported (to the grid) during an associated time "interval", specified by a Metervalues ReadingContext, and applicable interval duration configuration values (in seconds) for "ClockAlignedDataInterval" and "MeterValueSampleInterval". |
| Energy.Active.Import.Interval | Absolute amount of "active electrical energy" (Wh or kWh) imported (from the grid supply) during an associated time "interval", specified by a Metervalues ReadingContext, and applicable interval duration configuration values (in seconds) for "ClockAlignedDataInterval" and "MeterValueSampleInterval". |
| Energy.Reactive.Export.Interval | Absolute amount of "reactive electrical energy" (VARh or kVARh) exported (to the grid) during an associated time "interval", specified by a Metervalues ReadingContext, and applicable interval duration configuration values (in seconds) for "ClockAlignedDataInterval" and "MeterValueSampleInterval". |
| Energy.Reactive.Import.Interval | Absolute amount of "reactive electrical energy" (VARh or kVARh) imported (from the grid supply) during an associated time "interval", specified by a Metervalues ReadingContext, and applicable interval duration configuration values (in seconds) for "ClockAlignedDataInterval" and "MeterValueSampleInterval". |
| Frequency | Instantaneous reading of powerline frequency. NOTE: OCPP 1.6 does not have a UnitOfMeasure for frequency, the UnitOfMeasure for any SampledValue with measurand: Frequency is Hertz. |
| Power.Active.Export | Instantaneous active power exported by EV. (W or kW) |
| Power.Active.Import | Instantaneous active power imported by EV. (W or kW) |
| Power.Factor | Instantaneous power factor of total energy flow |
| Power.Offered | Maximum power offered to EV |
| Power.Reactive.Export | Instantaneous reactive power exported by EV. (var or kvar) |
| Power.Reactive.Import | Instantaneous reactive power imported by EV. (var or kvar) |
| RPM | Fan speed in RPM |
| SoC | State of charge of charging vehicle in percentage |
| Temperature | Temperature reading inside Charge Point. |
| Voltage | Instantaneous AC RMS supply voltage  All "Register" values relating to a single charging transaction, or a non-transactional consumer (e.g. charge point internal power supply, overall supply) MUST be monotonically increasing in time. The actual quantity of energy corresponding to a reported ".Register" value is computed as the register value in question minus the register value recorded/reported at the start of the transaction or other relevant starting reference point in time. For improved auditability, ".Register" values SHOULD reported exactly as they are directly read from a non-volatile register in the electrical metering hardware, and SHOULD NOT be re-based to zero at the start of transactions. This allows any "missing energy" between sequential transactions, due to hardware fault, mis-wiring, fraud, etc. to be identified, by allowing the Central System to confirm that the starting register value of any transaction is identical to the finishing register value of the preceding transaction on the same connector. |

## 7.32. MessageTrigger

*Enumeration*

Type of request to be triggered in a TriggerMessage.req.

| VALUE | DESCRIPTION |
|---|---|
| BootNotification | To trigger a BootNotification request |
| DiagnosticsStatusNotification | To trigger a DiagnosticsStatusNotification request |
| FirmwareStatusNotification | To trigger a FirmwareStatusNotification request |
| Heartbeat | To trigger a Heartbeat request |
| MeterValues | To trigger a MeterValues request |
| StatusNotification | To trigger a StatusNotification request |

## 7.33. MeterValue

*Class*

Collection of one or more sampled values in MeterValues.req and StopTransaction.req. All sampled values in a MeterValue are sampled at the same point in time.

| FIELD NAME | FIELD TYPE | CARD. | DESCRIPTION |
|---|---|---|---|
| timestamp | dateTime | 1..1 | Required. Timestamp for measured value(s). |
| sampledValue | SampledValue | 1..* | Required. One or more measured values |

## 7.34. Phase

*Enumeration*

Phase as used in SampledValue. Phase specifies how a measured value is to be interpreted. Please note that not all values of Phase are applicable to all Measurands.

| VALUE | DESCRIPTION |
|---|---|
| L1 | Measured on L1 |
| L2 | Measured on L2 |
| L3 | Measured on L3 |
| N | Measured on Neutral |
| L1-N | Measured on L1 with respect to Neutral conductor |
| L2-N | Measured on L2 with respect to Neutral conductor |
| L3-N | Measured on L3 with respect to Neutral conductor |
| L1-L2 | Measured between L1 and L2 |
| L2-L3 | Measured between L2 and L3 |
| L3-L1 | Measured between L3 and L1 |

## 7.35. ReadingContext

*Enumeration*

Values of the context field of a value in SampledValue.

| VALUE | DESCRIPTION |
|---|---|
| Interruption.Begin | Value taken at start of interruption. |
| Interruption.End | Value taken when resuming after interruption. |
| Other | Value for any other situations. |
| Sample.Clock | Value taken at clock aligned interval. |
| Sample.Periodic | Value taken as periodic sample relative to start time of transaction. |
| Transaction.Begin | Value taken at start of transaction. |
| Transaction.End | Value taken at end of transaction. |
| Trigger | Value taken in response to a TriggerMessage.req |

## 7.36. Reason

*Enumeration*

Reason for stopping a transaction in StopTransaction.req.

| VALUE | DESCRIPTION |
|---|---|
| DeAuthorized | The transaction was stopped because of the authorization status in a StartTransaction.conf |
| EmergencyStop | Emergency stop button was used. |
| EVDisconnected | disconnecting of cable, vehicle moved away from inductive charge unit. |
| HardReset | A hard reset command was received. |
| Local | Stopped locally on request of the user at the Charge Point. This is a regular termination of a transaction. Examples: presenting an RFID tag, pressing a button to stop. |
| Other | Any other reason. |
| PowerLoss | Complete loss of power. |
| Reboot | A locally initiated reset/reboot occurred. (for instance watchdog kicked in) |
| Remote | Stopped remotely on request of the user. This is a regular termination of a transaction. Examples: termination using a smartphone app, exceeding a (non local) prepaid credit. |
| SoftReset | A soft reset command was received. |
| UnlockCommand | Central System sent an Unlock Connector command. |

## 7.37. RecurrencyKindType

*Enumeration*

Type of recurrence of a charging profile, as used in ChargingProfile.

| VALUE | DESCRIPTION |
|---|---|
| Daily | The schedule restarts every 24 hours, at the same time as in the startSchedule. |
| Weekly | The schedule restarts every 7 days, at the same time and day-of-the-week as in the startSchedule. |

## 7.38. RegistrationStatus

*Enumeration*

Result of registration in response to BootNotification.req.

| VALUE | DESCRIPTION |
|---|---|
| Accepted | Charge point is accepted by Central System. |
| Pending | Central System is not yet ready to accept the Charge Point. Central System may send messages to retrieve information or prepare the Charge Point. |
| Rejected | Charge point is not accepted by Central System. This may happen when the Charge Point id is not known by Central System. |

## 7.39. RemoteStartStopStatus

*Enumeration*

The result of a RemoteStartTransaction.req or RemoteStopTransaction.req request.

| VALUE | DESCRIPTION |
|---|---|
| Accepted | Command will be executed. |
| Rejected | Command will not be executed. |

## 7.40. ReservationStatus

*Enumeration*

Status in ReserveNow.conf.

| VALUE | DESCRIPTION |
|---|---|
| Accepted | Reservation has been made. |
| Faulted | Reservation has not been made, because connectors or specified connector are in a faulted state. |
| Occupied | Reservation has not been made. All connectors or the specified connector are occupied. |
| Rejected | Reservation has not been made. Charge Point is not configured to accept reservations. |
| Unavailable | Reservation has not been made, because connectors or specified connector are in an unavailable state. |

## 7.41. ResetStatus

*Enumeration*

Result of Reset.req.

| VALUE | DESCRIPTION |
|---|---|
| Accepted | Command will be executed. |
| Rejected | Command will not be executed. |

## 7.42. ResetType

*Enumeration*

Type of reset requested by Reset.req.

| VALUE | DESCRIPTION |
|---|---|
| Hard | Restart (all) the hardware, the Charge Point is not required to gracefully stop ongoing transaction. If possible the Charge Point sends a StopTransaction.req for previously ongoing transactions after having restarted and having been accepted by the Central System via a BootNotification.conf. This is a last resort solution for a not correctly functioning Charge Point, by sending a "hard" reset, (queued) information might get lost. |
| Soft | Stop ongoing transactions gracefully and sending StopTransaction.req for every ongoing transaction. It should then restart the application software (if possible, otherwise restart the processor/controller). |

## 7.43. SampledValue

*Class*

Single sampled value in MeterValues. Each value can be accompanied by optional fields.

| FIELD NAME | FIELD TYPE | CARD. | DESCRIPTION |
|---|---|---|---|
| value | String | 1..1 | Required. Value as a “Raw” (decimal) number or “SignedData”. Field Type is “string” to allow for digitally signed data readings. Decimal numeric values are also acceptable to allow fractional values for measurands such as Temperature and Current. |
| context | ReadingContext | 0..1 | Optional. Type of detail value: start, end or sample. Default = “Sample.Periodic” |
| format | ValueFormat | 0..1 | Optional. Raw or signed data. Default = “Raw” |
| measurand | Measurand | 0..1 | Optional. Type of measurement. Default = “Energy.Active.Import.Register” |
| phase | Phase | 0..1 | Optional. indicates how the measured value is to be interpreted. For instance between L1 and neutral (L1-N) Please note that not all values of phase are applicable to all Measurands. When phase is absent, the measured value is interpreted as an overall value. |
| location | Location | 0..1 | Optional. Location of measurement. Default=”Outlet” |
| unit | UnitOfMeasure | 0..1 | Optional. Unit of the value. Default = “Wh” if the (default) measurand is an “Energy” type. |

## 7.44. TriggerMessageStatus

*Enumeration*

Status in TriggerMessage.conf.

| VALUE | DESCRIPTION |
|---|---|
| Accepted | Requested notification will be sent. |
| Rejected | Requested notification will not be sent. |
| NotImplemented | Requested notification cannot be sent because it is either not implemented or unknown. |

## 7.45. UnitOfMeasure

*Enumeration*

Allowable values of the optional "unit" field of a Value element, as used in SampledValue. Default value of "unit" is always "Wh".

| VALUE | DESCRIPTION |
|---|---|
| Wh | Watt-hours (energy). Default. |
| kWh | kiloWatt-hours (energy). |
| varh | Var-hours (reactive energy). |
| kvarh | kilovar-hours (reactive energy). |
| W | Watts (power). |
| kW | kilowatts (power). |
| VA | VoltAmpere (apparent power). |
| kVA | kiloVolt Ampere (apparent power). |
| var | Vars (reactive power). |
| kvar | kilovars (reactive power). |
| A | Amperes (current). |
| V | Voltage (r.m.s. AC). |
| Celsius | Degrees (temperature). |
| Fahrenheit | Degrees (temperature). |
| K | Degrees Kelvin (temperature). |
| Percent | Percentage. |

## 7.46. UnlockStatus

*Enumeration*

Status in response to UnlockConnector.req.

| VALUE | DESCRIPTION |
|---|---|
| Unlocked | Connector has successfully been unlocked. |
| UnlockFailed | Failed to unlock the connector: The Charge Point has tried to unlock the connector and has detected that the connector is still locked or the unlock mechanism failed. |
| NotSupported | Charge Point has no connector lock, or ConnectorId is unknown. |

## 7.47. UpdateStatus

*Enumeration*

Type of update for a SendLocalList.req.

| VALUE | DESCRIPTION |
|---|---|
| Accepted | Local Authorization List successfully updated. |
| Failed | Failed to update the Local Authorization List. |
| NotSupported | Update of Local Authorization List is not supported by Charge Point. |
| VersionMismatch | Version number in the request for a differential update is less or equal then version number of current list. |

## 7.48. UpdateType

*Enumeration*

Type of update for a SendLocalList.req.

| VALUE | DESCRIPTION |
|---|---|
| Differential | Indicates that the current Local Authorization List must be updated with the values in this message. |
| Full | Indicates that the current Local Authorization List must be replaced by the values in this message. |

## 7.49. ValueFormat

*Enumeration*

Format that specifies how the value element in SampledValue is to be interpreted.

| VALUE | DESCRIPTION |
|---|---|
| Raw | Data is to be interpreted as integer/decimal numeric data. |
| SignedData | Data is represented as a signed binary data block, encoded as hex data. |
