---
title: "6. Messages"
spec-section: "6"
spec-pages: "60–78"
spec-version: "1.6 edition 2 — FINAL, 2017-09-28"
tags:
  - ocpp/1.6
  - messages
  - pdu
---

# 6. Messages

## 6.1. Authorize.req

This contains the field definition of the Authorize.req PDU sent by the Charge Point to the Central System.

*See also Authorize*

| FIELD NAME | FIELD TYPE | CARD. | DESCRIPTION |
|---|---|---|---|
| idTag | IdToken | 1..1 | Required. This contains the identifier that needs to be authorized. |

**JSON Schema**

<json-schema id="AuthorizeRequest">
```json
{
  "$schema": "http://json-schema.org/draft-04/schema#",
  "id": "urn:OCPP:1.6:2019:12:AuthorizeRequest",
  "title": "AuthorizeRequest",
  "type": "object",
  "properties": {
    "idTag": {
      "type": "string",
      "maxLength": 20
    }
  },
  "additionalProperties": false,
  "required": [
    "idTag"
  ]
}
```
</json-schema>

## 6.2. Authorize.conf

This contains the field definition of the Authorize.conf PDU sent by the Central System to the Charge Point in response to a Authorize.req PDU.

*See also Authorize*

| FIELD NAME | FIELD TYPE | CARD. | DESCRIPTION |
|---|---|---|---|
| idTagInfo | IdTagInfo | 1..1 | Required. This contains information about authorization status, expiry and parent id. |

**JSON Schema**

<json-schema id="AuthorizeResponse">
```json
{
  "$schema": "http://json-schema.org/draft-04/schema#",
  "id": "urn:OCPP:1.6:2019:12:AuthorizeResponse",
  "title": "AuthorizeResponse",
  "type": "object",
  "properties": {
    "idTagInfo": {
      "type": "object",
      "properties": {
        "expiryDate": {
          "type": "string",
          "format": "date-time"
        },
        "parentIdTag": {
          "type": "string",
          "maxLength": 20
        },
        "status": {
          "type": "string",
          "additionalProperties": false,
          "enum": [
            "Accepted",
            "Blocked",
            "Expired",
            "Invalid",
            "ConcurrentTx"
          ]
        }
      },
      "additionalProperties": false,
      "required": [
        "status"
      ]
    }
  },
  "additionalProperties": false,
  "required": [
    "idTagInfo"
  ]
}
```
</json-schema>

## 6.3. BootNotification.req

This contains the field definition of the BootNotification.req PDU sent by the Charge Point to the Central System.

*See also Boot Notification*

| FIELD NAME | FIELD TYPE | CARD. | DESCRIPTION |
|---|---|---|---|
| chargeBoxSerialNumber | CiString25Type | 0..1 | Optional. This contains a value that identifies the serial number of the Charge Box inside the Charge Point. Deprecated, will be removed in future version |
| chargePointModel | CiString20Type | 1..1 | Required. This contains a value that identifies the model of the ChargePoint. |
| chargePointSerialNumber | CiString25Type | 0..1 | Optional. This contains a value that identifies the serial number of the Charge Point. |
| chargePointVendor | CiString20Type | 1..1 | Required. This contains a value that identifies the vendor of the ChargePoint. |
| firmwareVersion | CiString50Type | 0..1 | Optional. This contains the firmware version of the Charge Point. |
| iccid | CiString20Type | 0..1 | Optional. This contains the ICCID of the modem’s SIM card. |
| imsi | CiString20Type | 0..1 | Optional. This contains the IMSI of the modem’s SIM card. |
| meterSerialNumber | CiString25Type | 0..1 | Optional. This contains the serial number of the main electrical meter of the Charge Point. |
| meterType | CiString25Type | 0..1 | Optional. This contains the type of the main electrical meter of the Charge Point. |

**JSON Schema**

<json-schema id="BootNotificationRequest">
```json
{
  "$schema": "http://json-schema.org/draft-04/schema#",
  "id": "urn:OCPP:1.6:2019:12:BootNotificationRequest",
  "title": "BootNotificationRequest",
  "type": "object",
  "properties": {
    "chargePointVendor": {
      "type": "string",
      "maxLength": 20
    },
    "chargePointModel": {
      "type": "string",
      "maxLength": 20
    },
    "chargePointSerialNumber": {
      "type": "string",
      "maxLength": 25
    },
    "chargeBoxSerialNumber": {
      "type": "string",
      "maxLength": 25
    },
    "firmwareVersion": {
      "type": "string",
      "maxLength": 50
    },
    "iccid": {
      "type": "string",
      "maxLength": 20
    },
    "imsi": {
      "type": "string",
      "maxLength": 20
    },
    "meterType": {
      "type": "string",
      "maxLength": 25
    },
    "meterSerialNumber": {
      "type": "string",
      "maxLength": 25
    }
  },
  "additionalProperties": false,
  "required": [
    "chargePointVendor",
    "chargePointModel"
  ]
}
```
</json-schema>

## 6.4. BootNotification.conf

This contains the field definition of the BootNotification.conf PDU sent by the Central System to the Charge Point in response to a BootNotification.req PDU.

*See also Boot Notification*

| FIELD NAME | FIELD TYPE | CARD. | DESCRIPTION |
|---|---|---|---|
| currentTime | dateTime | 1..1 | Required. This contains the Central System’s current time. |
| interval | integer | 1..1 | Required. When RegistrationStatus is Accepted, this contains the heartbeat interval in seconds. If the Central System returns something other than Accepted, the value of the interval field indicates the minimum wait time before sending a next BootNotification request. |
| status | RegistrationStatus | 1..1 | Required. This contains whether the Charge Point has been registered within the System Central. |

**JSON Schema**

<json-schema id="BootNotificationResponse">
```json
{
  "$schema": "http://json-schema.org/draft-04/schema#",
  "id": "urn:OCPP:1.6:2019:12:BootNotificationResponse",
  "title": "BootNotificationResponse",
  "type": "object",
  "properties": {
    "status": {
      "type": "string",
      "additionalProperties": false,
      "enum": [
        "Accepted",
        "Pending",
        "Rejected"
      ]
    },
    "currentTime": {
      "type": "string",
      "format": "date-time"
    },
    "interval": {
      "type": "integer"
    }
  },
  "additionalProperties": false,
  "required": [
    "status",
    "currentTime",
    "interval"
  ]
}
```
</json-schema>

## 6.5. CancelReservation.req

This contains the field definition of the CancelReservation.req PDU sent by the Central System to the Charge Point.

*See also Cancel Reservation*

| FIELD NAME | FIELD TYPE | CARD. | DESCRIPTION |
|---|---|---|---|
| reservationId | integer | 1..1 | Required. Id of the reservation to cancel. |

**JSON Schema**

<json-schema id="CancelReservationRequest">
```json
{
  "$schema": "http://json-schema.org/draft-04/schema#",
  "id": "urn:OCPP:1.6:2019:12:CancelReservationRequest",
  "title": "CancelReservationRequest",
  "type": "object",
  "properties": {
    "reservationId": {
      "type": "integer"
    }
  },
  "additionalProperties": false,
  "required": [
    "reservationId"
  ]
}
```
</json-schema>

## 6.6. CancelReservation.conf

This contains the field definition of the CancelReservation.conf PDU sent by the Charge Point to the Central System in response to a CancelReservation.req PDU.

*See also Cancel Reservation*

| FIELD NAME | FIELD TYPE | CARD. | DESCRIPTION |
|---|---|---|---|
| status | CancelReservationStatus | 1..1 | Required. This indicates the success or failure of the cancelling of a reservation by Central System. |

**JSON Schema**

<json-schema id="CancelReservationResponse">
```json
{
  "$schema": "http://json-schema.org/draft-04/schema#",
  "id": "urn:OCPP:1.6:2019:12:CancelReservationResponse",
  "title": "CancelReservationResponse",
  "type": "object",
  "properties": {
    "status": {
      "type": "string",
      "additionalProperties": false,
      "enum": [
        "Accepted",
        "Rejected"
      ]
    }
  },
  "additionalProperties": false,
  "required": [
    "status"
  ]
}
```
</json-schema>

## 6.7. ChangeAvailability.req

This contains the field definition of the ChangeAvailability.req PDU sent by the Central System to the Charge Point.

*See also Change Availability*

| FIELD NAME | FIELD TYPE | CARD. | DESCRIPTION |
|---|---|---|---|
| connectorId | integer connectorId >= 0 | 1..1 | Required. The id of the connector for which availability needs to change. Id '0' (zero) is used if the availability of the Charge Point and all its connectors needs to change. |
| type | AvailabilityType | 1..1 | Required. This contains the type of availability change that the Charge Point should perform. |

**JSON Schema**

<json-schema id="ChangeAvailabilityRequest">
```json
{
  "$schema": "http://json-schema.org/draft-04/schema#",
  "id": "urn:OCPP:1.6:2019:12:ChangeAvailabilityRequest",
  "title": "ChangeAvailabilityRequest",
  "type": "object",
  "properties": {
    "connectorId": {
      "type": "integer"
    },
    "type": {
      "type": "string",
      "additionalProperties": false,
      "enum": [
        "Inoperative",
        "Operative"
      ]
    }
  },
  "additionalProperties": false,
  "required": [
    "connectorId",
    "type"
  ]
}
```
</json-schema>

## 6.8. ChangeAvailability.conf

This contains the field definition of the ChangeAvailability.conf PDU return by Charge Point to Central System.

*See also Change Availability*

| FIELD NAME | FIELD TYPE | CARD. | DESCRIPTION |
|---|---|---|---|
| status | AvailabilityStatus | 1..1 | Required. This indicates whether the Charge Point is able to perform the availability change. |

**JSON Schema**

<json-schema id="ChangeAvailabilityResponse">
```json
{
  "$schema": "http://json-schema.org/draft-04/schema#",
  "id": "urn:OCPP:1.6:2019:12:ChangeAvailabilityResponse",
  "title": "ChangeAvailabilityResponse",
  "type": "object",
  "properties": {
    "status": {
      "type": "string",
      "additionalProperties": false,
      "enum": [
        "Accepted",
        "Rejected",
        "Scheduled"
      ]
    }
  },
  "additionalProperties": false,
  "required": [
    "status"
  ]
}
```
</json-schema>

## 6.9. ChangeConfiguration.req

This contains the field definition of the ChangeConfiguration.req PDU sent by Central System to Charge Point. It is RECOMMENDED that the content and meaning of the 'key' and 'value' fields is agreed upon between Charge Point and Central System.

*See also Change Configuration*

| FIELD NAME | FIELD TYPE | CARD. | DESCRIPTION |
|---|---|---|---|
| key | CiString50Type | 1..1 | Required. The name of the configuration setting to change. See for standard configuration key names and associated values |
| value | CiString500Type | 1..1 | Required. The new value as string for the setting. See for standard configuration key names and associated values |

**JSON Schema**

<json-schema id="ChangeConfigurationRequest">
```json
{
  "$schema": "http://json-schema.org/draft-04/schema#",
  "id": "urn:OCPP:1.6:2019:12:ChangeConfigurationRequest",
  "title": "ChangeConfigurationRequest",
  "type": "object",
  "properties": {
    "key": {
      "type": "string",
      "maxLength": 50
    },
    "value": {
      "type": "string",
      "maxLength": 500
    }
  },
  "additionalProperties": false,
  "required": [
    "key",
    "value"
  ]
}
```
</json-schema>

## 6.10. ChangeConfiguration.conf

This contains the field definition of the ChangeConfiguration.conf PDU returned from Charge Point to Central System.

*See also Change Configuration*

| FIELD NAME | FIELD TYPE | CARD. | DESCRIPTION |
|---|---|---|---|
| status | ConfigurationStatus | 1..1 | Required. Returns whether configuration change has been accepted. |

**JSON Schema**

<json-schema id="ChangeConfigurationResponse">
```json
{
  "$schema": "http://json-schema.org/draft-04/schema#",
  "id": "urn:OCPP:1.6:2019:12:ChangeConfigurationResponse",
  "title": "ChangeConfigurationResponse",
  "type": "object",
  "properties": {
    "status": {
      "type": "string",
      "additionalProperties": false,
      "enum": [
        "Accepted",
        "Rejected",
        "RebootRequired",
        "NotSupported"
      ]
    }
  },
  "additionalProperties": false,
  "required": [
    "status"
  ]
}
```
</json-schema>

## 6.11. ClearCache.req

This contains the field definition of the ClearCache.req PDU sent by the Central System to the Charge Point.

*See also Clear Cache No fields are defined.*

**JSON Schema**

<json-schema id="ClearCacheRequest">
```json
{
  "$schema": "http://json-schema.org/draft-04/schema#",
  "id": "urn:OCPP:1.6:2019:12:ClearCacheRequest",
  "title": "ClearCacheRequest",
  "type": "object",
  "properties": {},
  "additionalProperties": false
}
```
</json-schema>

## 6.12. ClearCache.conf

This contains the field definition of the ClearCache.conf PDU sent by the Charge Point to the Central System in response to a ClearCache.req PDU.

*See also Clear Cache*

| FIELD NAME | FIELD TYPE | CARD. | DESCRIPTION |
|---|---|---|---|
| status | ClearCacheStatus | 1..1 | Required. Accepted if the Charge Point has executed the request, otherwise rejected. |

**JSON Schema**

<json-schema id="ClearCacheResponse">
```json
{
  "$schema": "http://json-schema.org/draft-04/schema#",
  "id": "urn:OCPP:1.6:2019:12:ClearCacheResponse",
  "title": "ClearCacheResponse",
  "type": "object",
  "properties": {
    "status": {
      "type": "string",
      "additionalProperties": false,
      "enum": [
        "Accepted",
        "Rejected"
      ]
    }
  },
  "additionalProperties": false,
  "required": [
    "status"
  ]
}
```
</json-schema>

## 6.13. ClearChargingProfile.req

This contains the field definition of the ClearChargingProfile.req PDU sent by the Central System to the Charge Point. The Central System can use this message to clear (remove) either a specific charging profile (denoted by id) or a selection of charging profiles that match with the values of the optional connectorId, stackLevel and chargingProfilePurpose fields.

*See also Clear Charging Profile*

| FIELD NAME | FIELD TYPE | CARD. | DESCRIPTION |
|---|---|---|---|
| id | integer | 0..1 | Optional. The ID of the charging profile to clear. |
| connectorId | integer | 0..1 | Optional. Specifies the ID of the connector for which to clear charging profiles. A connectorId of zero (0) specifies the charging profile for the overall Charge Point. Absence of this parameter means the clearing applies to all charging profiles that match the other criteria in the request. |
| chargingProfilePurpose | ChargingProfilePurposeType | 0..1 | Optional. Specifies to purpose of the charging profiles that will be cleared, if they meet the other criteria in the request. |
| stackLevel | integer | 0..1 | Optional. specifies the stackLevel for which charging profiles will be cleared, if they meet the other criteria in the request |

**JSON Schema**

<json-schema id="ClearChargingProfileRequest">
```json
{
  "$schema": "http://json-schema.org/draft-04/schema#",
  "id": "urn:OCPP:1.6:2019:12:ClearChargingProfileRequest",
  "title": "ClearChargingProfileRequest",
  "type": "object",
  "properties": {
    "id": {
      "type": "integer"
    },
    "connectorId": {
      "type": "integer"
    },
    "chargingProfilePurpose": {
      "type": "string",
      "additionalProperties": false,
      "enum": [
        "ChargePointMaxProfile",
        "TxDefaultProfile",
        "TxProfile"
      ]
    },
    "stackLevel": {
      "type": "integer"
    }
  },
  "additionalProperties": false
}
```
</json-schema>

## 6.14. ClearChargingProfile.conf

This contains the field definition of the ClearChargingProfile.conf PDU sent by the Charge Point to the Central System in response to a ClearChargingProfile.req PDU.

*See also Clear Charging Profile*

| FIELD NAME | FIELD TYPE | CARD. | DESCRIPTION |
|---|---|---|---|
| status | ClearChargingProfileStatus | 1..1 | Required. Indicates if the Charge Point was able to execute the request. |

**JSON Schema**

<json-schema id="ClearChargingProfileResponse">
```json
{
  "$schema": "http://json-schema.org/draft-04/schema#",
  "id": "urn:OCPP:1.6:2019:12:ClearChargingProfileResponse",
  "title": "ClearChargingProfileResponse",
  "type": "object",
  "properties": {
    "status": {
      "type": "string",
      "additionalProperties": false,
      "enum": [
        "Accepted",
        "Unknown"
      ]
    }
  },
  "additionalProperties": false,
  "required": [
    "status"
  ]
}
```
</json-schema>

## 6.15. DataTransfer.req

This contains the field definition of the DataTransfer.req PDU sent either by the Central System to the Charge Point or vice versa.

*See also Data Transfer*

| FIELD NAME | FIELD TYPE | CARD. | DESCRIPTION |
|---|---|---|---|
| vendorId | CiString255Type | 1..1 | Required. This identifies the Vendor specific implementation |
| messageId | CiString50Type | 0..1 | Optional. Additional identification field |
| data | Text Length undefined | 0..1 | Optional. Data without specified length or format. |

**JSON Schema**

<json-schema id="DataTransferRequest">
```json
{
  "$schema": "http://json-schema.org/draft-04/schema#",
  "id": "urn:OCPP:1.6:2019:12:DataTransferRequest",
  "title": "DataTransferRequest",
  "type": "object",
  "properties": {
    "vendorId": {
      "type": "string",
      "maxLength": 255
    },
    "messageId": {
      "type": "string",
      "maxLength": 50
    },
    "data": {
      "type": "string"
    }
  },
  "additionalProperties": false,
  "required": [
    "vendorId"
  ]
}
```
</json-schema>

## 6.16. DataTransfer.conf

This contains the field definition of the DataTransfer.conf PDU sent by the Charge Point to the Central System or vice versa in response to a DataTransfer.req PDU.

*See also Data Transfer*

| FIELD NAME | FIELD TYPE | CARD. | DESCRIPTION |
|---|---|---|---|
| status | DataTransferStatus | 1..1 | Required. This indicates the success or failure of the data transfer. |
| data | Text Length undefined | 0..1 | Optional. Data in response to request. |

**JSON Schema**

<json-schema id="DataTransferResponse">
```json
{
  "$schema": "http://json-schema.org/draft-04/schema#",
  "id": "urn:OCPP:1.6:2019:12:DataTransferResponse",
  "title": "DataTransferResponse",
  "type": "object",
  "properties": {
    "status": {
      "type": "string",
      "additionalProperties": false,
      "enum": [
        "Accepted",
        "Rejected",
        "UnknownMessageId",
        "UnknownVendorId"
      ]
    },
    "data": {
      "type": "string"
    }
  },
  "additionalProperties": false,
  "required": [
    "status"
  ]
}
```
</json-schema>

## 6.17. DiagnosticsStatusNotification.req

This contains the field definition of the DiagnosticsStatusNotification.req PDU sent by the Charge Point to the Central System.

*See also Diagnostics Status Notification*

| FIELD NAME | FIELD TYPE | CARD. | DESCRIPTION |
|---|---|---|---|
| status | DiagnosticsStatus | 1..1 | Required. This contains the status of the diagnostics upload. |

**JSON Schema**

<json-schema id="DiagnosticsStatusNotificationRequest">
```json
{
  "$schema": "http://json-schema.org/draft-04/schema#",
  "id": "urn:OCPP:1.6:2019:12:DiagnosticsStatusNotificationRequest",
  "title": "DiagnosticsStatusNotificationRequest",
  "type": "object",
  "properties": {
    "status": {
      "type": "string",
      "additionalProperties": false,
      "enum": [
        "Idle",
        "Uploaded",
        "UploadFailed",
        "Uploading"
      ]
    }
  },
  "additionalProperties": false,
  "required": [
    "status"
  ]
}
```
</json-schema>

## 6.18. DiagnosticsStatusNotification.conf

This contains the field definition of the DiagnosticsStatusNotification.conf PDU sent by the Central System to the Charge Point in response to a DiagnosticsStatusNotification.req PDU.

*See also Diagnostics Status Notification No fields are defined.*

**JSON Schema**

<json-schema id="DiagnosticsStatusNotificationResponse">
```json
{
  "$schema": "http://json-schema.org/draft-04/schema#",
  "id": "urn:OCPP:1.6:2019:12:DiagnosticsStatusNotificationResponse",
  "title": "DiagnosticsStatusNotificationResponse",
  "type": "object",
  "properties": {},
  "additionalProperties": false
}
```
</json-schema>

## 6.19. FirmwareStatusNotification.req

This contains the field definition of the FirmwareStatusNotifitacion.req PDU sent by the Charge Point to the Central System.

*See also Firmware Status Notification*

| FIELD NAME | FIELD TYPE | CARD. | DESCRIPTION |
|---|---|---|---|
| status | FirmwareStatus | 1..1 | Required. This contains the progress status of the firmware installation. |

**JSON Schema**

<json-schema id="FirmwareStatusNotificationRequest">
```json
{
  "$schema": "http://json-schema.org/draft-04/schema#",
  "id": "urn:OCPP:1.6:2019:12:FirmwareStatusNotificationRequest",
  "title": "FirmwareStatusNotificationRequest",
  "type": "object",
  "properties": {
    "status": {
      "type": "string",
      "additionalProperties": false,
      "enum": [
        "Downloaded",
        "DownloadFailed",
        "Downloading",
        "Idle",
        "InstallationFailed",
        "Installing",
        "Installed"
      ]
    }
  },
  "additionalProperties": false,
  "required": [
    "status"
  ]
}
```
</json-schema>

## 6.20. FirmwareStatusNotification.conf

This contains the field definition of the FirmwareStatusNotification.conf PDU sent by the Central System to the Charge Point in response to a FirmwareStatusNotification.req PDU.

*See also Firmware Status Notification No fields are defined.*

**JSON Schema**

<json-schema id="FirmwareStatusNotificationResponse">
```json
{
  "$schema": "http://json-schema.org/draft-04/schema#",
  "id": "urn:OCPP:1.6:2019:12:FirmwareStatusNotificationResponse",
  "title": "FirmwareStatusNotificationResponse",
  "type": "object",
  "properties": {},
  "additionalProperties": false
}
```
</json-schema>

## 6.21. GetCompositeSchedule.req

This contains the field definition of the GetCompositeSchedule.req PDU sent by the Central System to the Charge Point.

*See also Get Composite Schedule*

| FIELD NAME | FIELD TYPE | CARD. | DESCRIPTION |
|---|---|---|---|
| connectorId | integer | 1..1 | Required. The ID of the Connector for which the schedule is requested. When ConnectorId=0, the Charge Point will calculate the expected consumption for the grid connection. |
| duration | integer | 1..1 | Required. Time in seconds. length of requested schedule |
| chargingRateUnit | ChargingRateUnitType | 0..1 | Optional. Can be used to force a power or current profile |

**JSON Schema**

<json-schema id="GetCompositeScheduleRequest">
```json
{
  "$schema": "http://json-schema.org/draft-04/schema#",
  "id": "urn:OCPP:1.6:2019:12:GetCompositeScheduleRequest",
  "title": "GetCompositeScheduleRequest",
  "type": "object",
  "properties": {
    "connectorId": {
      "type": "integer"
    },
    "duration": {
      "type": "integer"
    },
    "chargingRateUnit": {
      "type": "string",
      "additionalProperties": false,
      "enum": [
        "A",
        "W"
      ]
    }
  },
  "additionalProperties": false,
  "required": [
    "connectorId",
    "duration"
  ]
}
```
</json-schema>

## 6.22. GetCompositeSchedule.conf

This contains the field definition of the GetCompositeSchedule.conf PDU sent by the Charge Point to the Central System in response to a GetCompositeSchedule.req PDU.

*See also Get Composite Schedule*

| FIELD NAME | FIELD TYPE | CARD. | DESCRIPTION |
|---|---|---|---|
| status | GetCompositeScheduleStatus | 1..1 | Required. Status of the request. The Charge Point will indicate if it was able to process the request |
| connectorId | integer | 0..1 | Optional. The charging schedule contained in this notification applies to a Connector. |
| scheduleStart | dateTime | 0..1 | Optional. Time. Periods contained in the charging profile are relative to this point in time. If status is "Rejected", this field may be absent. |
| chargingSchedule | ChargingSchedule | 0..1 | Optional. Planned Composite Charging Schedule, the energy consumption over time. Always relative to ScheduleStart. If status is "Rejected", this field may be absent. |

**JSON Schema**

<json-schema id="GetCompositeScheduleResponse">
```json
{
  "$schema": "http://json-schema.org/draft-04/schema#",
  "id": "urn:OCPP:1.6:2019:12:GetCompositeScheduleResponse",
  "title": "GetCompositeScheduleResponse",
  "type": "object",
  "properties": {
    "status": {
      "type": "string",
      "additionalProperties": false,
      "enum": [
        "Accepted",
        "Rejected"
      ]
    },
    "connectorId": {
      "type": "integer"
    },
    "scheduleStart": {
      "type": "string",
      "format": "date-time"
    },
    "chargingSchedule": {
      "type": "object",
      "properties": {
        "duration": {
          "type": "integer"
        },
        "startSchedule": {
          "type": "string",
          "format": "date-time"
        },
        "chargingRateUnit": {
          "type": "string",
          "additionalProperties": false,
          "enum": [
            "A",
            "W"
          ]
        },
        "chargingSchedulePeriod": {
          "type": "array",
          "items": {
            "type": "object",
            "properties": {
              "startPeriod": {
                "type": "integer"
              },
              "limit": {
                "type": "number",
                "multipleOf": 0.1
              },
              "numberPhases": {
                "type": "integer"
              }
            },
            "additionalProperties": false,
            "required": [
              "startPeriod",
              "limit"
            ]
          }
        },
        "minChargingRate": {
          "type": "number",
          "multipleOf": 0.1
        }
      },
      "additionalProperties": false,
      "required": [
        "chargingRateUnit",
        "chargingSchedulePeriod"
      ]
    }
  },
  "additionalProperties": false,
  "required": [
    "status"
  ]
}
```
</json-schema>

## 6.23. GetConfiguration.req

This contains the field definition of the GetConfiguration.req PDU sent by the Central System to the Charge Point.

*See also Get Configuration*

| FIELD NAME | FIELD TYPE | CARD. | DESCRIPTION |
|---|---|---|---|
| key | CiString50Type | 0..* | Optional. List of keys for which the configuration value is requested. |

**JSON Schema**

<json-schema id="GetConfigurationRequest">
```json
{
  "$schema": "http://json-schema.org/draft-04/schema#",
  "id": "urn:OCPP:1.6:2019:12:GetConfigurationRequest",
  "title": "GetConfigurationRequest",
  "type": "object",
  "properties": {
    "key": {
      "type": "array",
      "items": {
        "type": "string",
        "maxLength": 50
      }
    }
  },
  "additionalProperties": false
}
```
</json-schema>

## 6.24. GetConfiguration.conf

This contains the field definition of the GetConfiguration.conf PDU sent by Charge Point the to the Central System in response to a GetConfiguration.req.

*See also Get Configuration*

| FIELD NAME | FIELD TYPE | CARD. | DESCRIPTION |
|---|---|---|---|
| configurationKey | KeyValue | 0..* | Optional. List of requested or known keys |
| unknownKey | CiString50Type | 0..* | Optional. Requested keys that are unknown |

**JSON Schema**

<json-schema id="GetConfigurationResponse">
```json
{
  "$schema": "http://json-schema.org/draft-04/schema#",
  "id": "urn:OCPP:1.6:2019:12:GetConfigurationResponse",
  "title": "GetConfigurationResponse",
  "type": "object",
  "properties": {
    "configurationKey": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "key": {
            "type": "string",
            "maxLength": 50
          },
          "readonly": {
            "type": "boolean"
          },
          "value": {
            "type": "string",
            "maxLength": 500
          }
        },
        "additionalProperties": false,
        "required": [
          "key",
          "readonly"
        ]
      }
    },
    "unknownKey": {
      "type": "array",
      "items": {
        "type": "string",
        "maxLength": 50
      }
    }
  },
  "additionalProperties": false
}
```
</json-schema>

## 6.25. GetDiagnostics.req

This contains the field definition of the GetDiagnostics.req PDU sent by the Central System to the Charge Point.

*See also Get Diagnostics*

| FIELD NAME | FIELD TYPE | CARD. | DESCRIPTION |
|---|---|---|---|
| location | anyURI | 1..1 | Required. This contains the location (directory) where the diagnostics file shall be uploaded to. |
| retries | integer | 0..1 | Optional. This specifies how many times Charge Point must try to upload the diagnostics before giving up. If this field is not present, it is left to Charge Point to decide how many times it wants to retry. |
| retryInterval | integer | 0..1 | Optional. The interval in seconds after which a retry may be attempted. If this field is not present, it is left to Charge Point to decide how long to wait between attempts. |
| startTime | dateTime | 0..1 | Optional. This contains the date and time of the oldest logging information to include in the diagnostics. |
| stopTime | dateTime | 0..1 | Optional. This contains the date and time of the latest logging information to include in the diagnostics. |

**JSON Schema**

<json-schema id="GetDiagnosticsRequest">
```json
{
  "$schema": "http://json-schema.org/draft-04/schema#",
  "id": "urn:OCPP:1.6:2019:12:GetDiagnosticsRequest",
  "title": "GetDiagnosticsRequest",
  "type": "object",
  "properties": {
    "location": {
      "type": "string",
      "format": "uri"
    },
    "retries": {
      "type": "integer"
    },
    "retryInterval": {
      "type": "integer"
    },
    "startTime": {
      "type": "string",
      "format": "date-time"
    },
    "stopTime": {
      "type": "string",
      "format": "date-time"
    }
  },
  "additionalProperties": false,
  "required": [
    "location"
  ]
}
```
</json-schema>

## 6.26. GetDiagnostics.conf

This contains the field definition of the GetDiagnostics.conf PDU sent by the Charge Point to the Central System in response to a GetDiagnostics.req PDU.

*See also Get Diagnostics*

| FIELD NAME | FIELD TYPE | CARD. | DESCRIPTION |
|---|---|---|---|
| fileName | CiString255Type | 0..1 | Optional. This contains the name of the file with diagnostic information that will be uploaded. This field is not present when no diagnostic information is available. |

**JSON Schema**

<json-schema id="GetDiagnosticsResponse">
```json
{
  "$schema": "http://json-schema.org/draft-04/schema#",
  "id": "urn:OCPP:1.6:2019:12:GetDiagnosticsResponse",
  "title": "GetDiagnosticsResponse",
  "type": "object",
  "properties": {
    "fileName": {
      "type": "string",
      "maxLength": 255
    }
  },
  "additionalProperties": false
}
```
</json-schema>

## 6.27. GetLocalListVersion.req

This contains the field definition of the GetLocalListVersion.req PDU sent by the Central System to the Charge Point.

*See also Get Local List Version No fields are defined.*

**JSON Schema**

<json-schema id="GetLocalListVersionRequest">
```json
{
  "$schema": "http://json-schema.org/draft-04/schema#",
  "id": "urn:OCPP:1.6:2019:12:GetLocalListVersionRequest",
  "title": "GetLocalListVersionRequest",
  "type": "object",
  "properties": {},
  "additionalProperties": false
}
```
</json-schema>

## 6.28. GetLocalListVersion.conf

This contains the field definition of the GetLocalListVersion.conf PDU sent by the Charge Point to Central System in response to a GetLocalListVersion.req PDU.

*See also Get Local List Version*

| FIELD NAME | FIELD TYPE | CARD. | DESCRIPTION |
|---|---|---|---|
| listVersion | integer | 1..1 | Required. This contains the current version number of the local authorization list in the Charge Point. |

**JSON Schema**

<json-schema id="GetLocalListVersionResponse">
```json
{
  "$schema": "http://json-schema.org/draft-04/schema#",
  "id": "urn:OCPP:1.6:2019:12:GetLocalListVersionResponse",
  "title": "GetLocalListVersionResponse",
  "type": "object",
  "properties": {
    "listVersion": {
      "type": "integer"
    }
  },
  "additionalProperties": false,
  "required": [
    "listVersion"
  ]
}
```
</json-schema>

## 6.29. Heartbeat.req

This contains the field definition of the Heartbeat.req PDU sent by the Charge Point to the Central System.

*See also Heartbeat No fields are defined.*

**JSON Schema**

<json-schema id="HeartbeatRequest">
```json
{
  "$schema": "http://json-schema.org/draft-04/schema#",
  "id": "urn:OCPP:1.6:2019:12:HeartbeatRequest",
  "title": "HeartbeatRequest",
  "type": "object",
  "properties": {},
  "additionalProperties": false
}
```
</json-schema>

## 6.30. Heartbeat.conf

This contains the field definition of the Heartbeat.conf PDU sent by the Central System to the Charge Point in response to a Heartbeat.req PDU.

*See also Heartbeat*

| FIELD NAME | FIELD TYPE | CARD. | DESCRIPTION |
|---|---|---|---|
| currentTime | dateTime | 1..1 | Required. This contains the current time of the Central System. |

**JSON Schema**

<json-schema id="HeartbeatResponse">
```json
{
  "$schema": "http://json-schema.org/draft-04/schema#",
  "id": "urn:OCPP:1.6:2019:12:HeartbeatResponse",
  "title": "HeartbeatResponse",
  "type": "object",
  "properties": {
    "currentTime": {
      "type": "string",
      "format": "date-time"
    }
  },
  "additionalProperties": false,
  "required": [
    "currentTime"
  ]
}
```
</json-schema>

## 6.31. MeterValues.req

This contains the field definition of the MeterValues.req PDU sent by the Charge Point to the Central System.

*See also Meter Values*

| FIELD NAME | FIELD TYPE | CARD. | DESCRIPTION |
|---|---|---|---|
| connectorId | integer connectorId >= 0 | 1..1 | Required. This contains a number (>0) designating a connector of the Charge Point.‘0’ (zero) is used to designate the main powermeter. |
| transactionId | integer | 0..1 | Optional. The transaction to which these meter samples are related. |
| meterValue | MeterValue | 1..* | Required. The sampled meter values with timestamps. |

**JSON Schema**

<json-schema id="MeterValuesRequest">
```json
{
  "$schema": "http://json-schema.org/draft-04/schema#",
  "id": "urn:OCPP:1.6:2019:12:MeterValuesRequest",
  "title": "MeterValuesRequest",
  "type": "object",
  "properties": {
    "connectorId": {
      "type": "integer"
    },
    "transactionId": {
      "type": "integer"
    },
    "meterValue": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "timestamp": {
            "type": "string",
            "format": "date-time"
          },
          "sampledValue": {
            "type": "array",
            "items": {
              "type": "object",
              "properties": {
                "value": {
                  "type": "string"
                },
                "context": {
                  "type": "string",
                  "additionalProperties": false,
                  "enum": [
                    "Interruption.Begin",
                    "Interruption.End",
                    "Sample.Clock",
                    "Sample.Periodic",
                    "Transaction.Begin",
                    "Transaction.End",
                    "Trigger",
                    "Other"
                  ]
                },
                "format": {
                  "type": "string",
                  "additionalProperties": false,
                  "enum": [
                    "Raw",
                    "SignedData"
                  ]
                },
                "measurand": {
                  "type": "string",
                  "additionalProperties": false,
                  "enum": [
                    "Energy.Active.Export.Register",
                    "Energy.Active.Import.Register",
                    "Energy.Reactive.Export.Register",
                    "Energy.Reactive.Import.Register",
                    "Energy.Active.Export.Interval",
                    "Energy.Active.Import.Interval",
                    "Energy.Reactive.Export.Interval",
                    "Energy.Reactive.Import.Interval",
                    "Power.Active.Export",
                    "Power.Active.Import",
                    "Power.Offered",
                    "Power.Reactive.Export",
                    "Power.Reactive.Import",
                    "Power.Factor",
                    "Current.Import",
                    "Current.Export",
                    "Current.Offered",
                    "Voltage",
                    "Frequency",
                    "Temperature",
                    "SoC",
                    "RPM"
                  ]
                },
                "phase": {
                  "type": "string",
                  "additionalProperties": false,
                  "enum": [
                    "L1",
                    "L2",
                    "L3",
                    "N",
                    "L1-N",
                    "L2-N",
                    "L3-N",
                    "L1-L2",
                    "L2-L3",
                    "L3-L1"
                  ]
                },
                "location": {
                  "type": "string",
                  "additionalProperties": false,
                  "enum": [
                    "Cable",
                    "EV",
                    "Inlet",
                    "Outlet",
                    "Body"
                  ]
                },
                "unit": {
                  "type": "string",
                  "additionalProperties": false,
                  "enum": [
                    "Wh",
                    "kWh",
                    "varh",
                    "kvarh",
                    "W",
                    "kW",
                    "VA",
                    "kVA",
                    "var",
                    "kvar",
                    "A",
                    "V",
                    "K",
                    "Celcius",
                    "Celsius",
                    "Fahrenheit",
                    "Percent"
                  ]
                }
              },
              "additionalProperties": false,
              "required": [
                "value"
              ]
            }
          }
        },
        "additionalProperties": false,
        "required": [
          "timestamp",
          "sampledValue"
        ]
      }
    }
  },
  "additionalProperties": false,
  "required": [
    "connectorId",
    "meterValue"
  ]
}
```
</json-schema>

## 6.32. MeterValues.conf

This contains the field definition of the MeterValues.conf PDU sent by the Central System to the Charge Point in response to a MeterValues.req PDU.

*See also Meter Values No fields are defined.*

**JSON Schema**

<json-schema id="MeterValuesResponse">
```json
{
  "$schema": "http://json-schema.org/draft-04/schema#",
  "id": "urn:OCPP:1.6:2019:12:MeterValuesResponse",
  "title": "MeterValuesResponse",
  "type": "object",
  "properties": {},
  "additionalProperties": false
}
```
</json-schema>

## 6.33. RemoteStartTransaction.req

This contains the field definitions of the RemoteStartTransaction.req PDU sent to Charge Point by Central System.

*See also Remote Start Transaction*

| FIELD NAME | FIELD TYPE | CARD. | DESCRIPTION |
|---|---|---|---|
| connectorId | integer | 0..1 | Optional. Number of the connector on which to start the transaction. connectorId SHALL be > 0 |
| idTag | IdToken | 1..1 | Required. The identifier that Charge Point must use to start a transaction. |
| chargingProfile | ChargingProfile | 0..1 | Optional. Charging Profile to be used by the Charge Point for the requested transaction. ChargingProfilePurpose MUST be set to TxProfile |

**JSON Schema**

<json-schema id="RemoteStartTransactionRequest">
```json
{
  "$schema": "http://json-schema.org/draft-04/schema#",
  "id": "urn:OCPP:1.6:2019:12:RemoteStartTransactionRequest",
  "title": "RemoteStartTransactionRequest",
  "type": "object",
  "properties": {
    "connectorId": {
      "type": "integer"
    },
    "idTag": {
      "type": "string",
      "maxLength": 20
    },
    "chargingProfile": {
      "type": "object",
      "properties": {
        "chargingProfileId": {
          "type": "integer"
        },
        "transactionId": {
          "type": "integer"
        },
        "stackLevel": {
          "type": "integer"
        },
        "chargingProfilePurpose": {
          "type": "string",
          "additionalProperties": false,
          "enum": [
            "ChargePointMaxProfile",
            "TxDefaultProfile",
            "TxProfile"
          ]
        },
        "chargingProfileKind": {
          "type": "string",
          "additionalProperties": false,
          "enum": [
            "Absolute",
            "Recurring",
            "Relative"
          ]
        },
        "recurrencyKind": {
          "type": "string",
          "additionalProperties": false,
          "enum": [
            "Daily",
            "Weekly"
          ]
        },
        "validFrom": {
          "type": "string",
          "format": "date-time"
        },
        "validTo": {
          "type": "string",
          "format": "date-time"
        },
        "chargingSchedule": {
          "type": "object",
          "properties": {
            "duration": {
              "type": "integer"
            },
            "startSchedule": {
              "type": "string",
              "format": "date-time"
            },
            "chargingRateUnit": {
              "type": "string",
              "additionalProperties": false,
              "enum": [
                "A",
                "W"
              ]
            },
            "chargingSchedulePeriod": {
              "type": "array",
              "items": {
                "type": "object",
                "properties": {
                  "startPeriod": {
                    "type": "integer"
                  },
                  "limit": {
                    "type": "number",
                    "multipleOf": 0.1
                  },
                  "numberPhases": {
                    "type": "integer"
                  }
                },
                "additionalProperties": false,
                "required": [
                  "startPeriod",
                  "limit"
                ]
              }
            },
            "minChargingRate": {
              "type": "number",
              "multipleOf": 0.1
            }
          },
          "additionalProperties": false,
          "required": [
            "chargingRateUnit",
            "chargingSchedulePeriod"
          ]
        }
      },
      "additionalProperties": false,
      "required": [
        "chargingProfileId",
        "stackLevel",
        "chargingProfilePurpose",
        "chargingProfileKind",
        "chargingSchedule"
      ]
    }
  },
  "additionalProperties": false,
  "required": [
    "idTag"
  ]
}
```
</json-schema>

## 6.34. RemoteStartTransaction.conf

This contains the field definitions of the RemoteStartTransaction.conf PDU sent from Charge Point to Central System.

*See also Remote Start Transaction*

| FIELD NAME | FIELD TYPE | CARD. | DESCRIPTION |
|---|---|---|---|
| status | RemoteStartStopStatus | 1..1 | Required. Status indicating whether Charge Point accepts the request to start a transaction. |

**JSON Schema**

<json-schema id="RemoteStartTransactionResponse">
```json
{
  "$schema": "http://json-schema.org/draft-04/schema#",
  "id": "urn:OCPP:1.6:2019:12:RemoteStartTransactionResponse",
  "title": "RemoteStartTransactionResponse",
  "type": "object",
  "properties": {
    "status": {
      "type": "string",
      "additionalProperties": false,
      "enum": [
        "Accepted",
        "Rejected"
      ]
    }
  },
  "additionalProperties": false,
  "required": [
    "status"
  ]
}
```
</json-schema>

## 6.35. RemoteStopTransaction.req

This contains the field definitions of the RemoteStopTransaction.req PDU sent to Charge Point by Central System.

*See also Remote Stop Transaction*

| FIELD NAME | FIELD TYPE | CARD. | DESCRIPTION |
|---|---|---|---|
| transactionId | integer | 1..1 | Required. The identifier of the transaction which Charge Point is requested to stop. |

**JSON Schema**

<json-schema id="RemoteStopTransactionRequest">
```json
{
  "$schema": "http://json-schema.org/draft-04/schema#",
  "id": "urn:OCPP:1.6:2019:12:RemoteStopTransactionRequest",
  "title": "RemoteStopTransactionRequest",
  "type": "object",
  "properties": {
    "transactionId": {
      "type": "integer"
    }
  },
  "additionalProperties": false,
  "required": [
    "transactionId"
  ]
}
```
</json-schema>

## 6.36. RemoteStopTransaction.conf

This contains the field definitions of the RemoteStopTransaction.conf PDU sent from Charge Point to Central System.

*See also Remote Stop Transaction*

| FIELD NAME | FIELD TYPE | CARD. | DESCRIPTION |
|---|---|---|---|
| status | RemoteStartStopStatus | 1..1 | Required. Status indicating whether Charge Point accepts the request to stop a transaction. |

**JSON Schema**

<json-schema id="RemoteStopTransactionResponse">
```json
{
  "$schema": "http://json-schema.org/draft-04/schema#",
  "id": "urn:OCPP:1.6:2019:12:RemoteStopTransactionResponse",
  "title": "RemoteStopTransactionResponse",
  "type": "object",
  "properties": {
    "status": {
      "type": "string",
      "additionalProperties": false,
      "enum": [
        "Accepted",
        "Rejected"
      ]
    }
  },
  "additionalProperties": false,
  "required": [
    "status"
  ]
}
```
</json-schema>

## 6.37. ReserveNow.req

This contains the field definition of the ReserveNow.req PDU sent by the Central System to the Charge Point.

*See also Reserve Now*

| FIELD NAME | FIELD TYPE | CARD. | DESCRIPTION |
|---|---|---|---|
| connectorId | integer connectorId >= 0 | 1..1 | Required. This contains the id of the connector to be reserved. A value of 0 means that the reservation is not for a specific connector. |
| expiryDate | dateTime | 1..1 | Required. This contains the date and time when the reservation ends. |
| idTag | IdToken | 1..1 | Required. The identifier for which the Charge Point has to reserve a connector. |
| parentIdTag | IdToken | 0..1 | Optional. The parent idTag. |
| reservationId | integer | 1..1 | Required. Unique id for this reservation. |

**JSON Schema**

<json-schema id="ReserveNowRequest">
```json
{
  "$schema": "http://json-schema.org/draft-04/schema#",
  "id": "urn:OCPP:1.6:2019:12:ReserveNowRequest",
  "title": "ReserveNowRequest",
  "type": "object",
  "properties": {
    "connectorId": {
      "type": "integer"
    },
    "expiryDate": {
      "type": "string",
      "format": "date-time"
    },
    "idTag": {
      "type": "string",
      "maxLength": 20
    },
    "parentIdTag": {
      "type": "string",
      "maxLength": 20
    },
    "reservationId": {
      "type": "integer"
    }
  },
  "additionalProperties": false,
  "required": [
    "connectorId",
    "expiryDate",
    "idTag",
    "reservationId"
  ]
}
```
</json-schema>

## 6.38. ReserveNow.conf

This contains the field definition of the ReserveNow.conf PDU sent by the Charge Point to the Central System in response to a ReserveNow.req PDU.

*See also Reserve Now*

| FIELD NAME | FIELD TYPE | CARD. | DESCRIPTION |
|---|---|---|---|
| status | ReservationStatus | 1..1 | Required. This indicates the success or failure of the reservation. |

**JSON Schema**

<json-schema id="ReserveNowResponse">
```json
{
  "$schema": "http://json-schema.org/draft-04/schema#",
  "id": "urn:OCPP:1.6:2019:12:ReserveNowResponse",
  "title": "ReserveNowResponse",
  "type": "object",
  "properties": {
    "status": {
      "type": "string",
      "additionalProperties": false,
      "enum": [
        "Accepted",
        "Faulted",
        "Occupied",
        "Rejected",
        "Unavailable"
      ]
    }
  },
  "additionalProperties": false,
  "required": [
    "status"
  ]
}
```
</json-schema>

## 6.39. Reset.req

This contains the field definition of the Reset.req PDU sent by the Central System to the Charge Point.

*See also Reset*

| FIELD NAME | FIELD TYPE | CARD. | DESCRIPTION |
|---|---|---|---|
| type | ResetType | 1..1 | Required. This contains the type of reset that the Charge Point should perform. |

**JSON Schema**

<json-schema id="ResetRequest">
```json
{
  "$schema": "http://json-schema.org/draft-04/schema#",
  "id": "urn:OCPP:1.6:2019:12:ResetRequest",
  "title": "ResetRequest",
  "type": "object",
  "properties": {
    "type": {
      "type": "string",
      "additionalProperties": false,
      "enum": [
        "Hard",
        "Soft"
      ]
    }
  },
  "additionalProperties": false,
  "required": [
    "type"
  ]
}
```
</json-schema>

## 6.40. Reset.conf

This contains the field definition of the Reset.conf PDU sent by the Charge Point to the Central System in response to a Reset.req PDU.

*See also Reset*

| FIELD NAME | FIELD TYPE | CARD. | DESCRIPTION |
|---|---|---|---|
| status | ResetStatus | 1..1 | Required. This indicates whether the Charge Point is able to perform the reset. |

**JSON Schema**

<json-schema id="ResetResponse">
```json
{
  "$schema": "http://json-schema.org/draft-04/schema#",
  "id": "urn:OCPP:1.6:2019:12:ResetResponse",
  "title": "ResetResponse",
  "type": "object",
  "properties": {
    "status": {
      "type": "string",
      "additionalProperties": false,
      "enum": [
        "Accepted",
        "Rejected"
      ]
    }
  },
  "additionalProperties": false,
  "required": [
    "status"
  ]
}
```
</json-schema>

## 6.41. SendLocalList.req

This contains the field definition of the SendLocalList.req PDU sent by the Central System to the Charge Point. If no (empty) localAuthorizationList is given and the updateType is Full, all identifications are removed from the list. Requesting a Differential update without (empty) localAuthorizationList will have no effect on the list. All idTags in the localAuthorizationList MUST be unique, no duplicate values are allowed.

*See also Send Local List*

| FIELD NAME | FIELD TYPE | CARD. | DESCRIPTION |
|---|---|---|---|
| listVersion | integer | 1..1 | Required. In case of a full update this is the version number of the full list. In case of a differential update it is the version number of the list after the update has been applied. |
| localAuthorizationList | AuthorizationData | 0..* | Optional. In case of a full update this contains the list of values that form the new local authorization list. In case of a differential update it contains the changes to be applied to the local authorization list in the Charge Point. Maximum number of AuthorizationData elements is available in the configuration key: SendLocalListMaxLength |
| updateType | UpdateType | 1..1 | Required. This contains the type of update (full or differential) of this request. |

**JSON Schema**

<json-schema id="SendLocalListRequest">
```json
{
  "$schema": "http://json-schema.org/draft-04/schema#",
  "id": "urn:OCPP:1.6:2019:12:SendLocalListRequest",
  "title": "SendLocalListRequest",
  "type": "object",
  "properties": {
    "listVersion": {
      "type": "integer"
    },
    "localAuthorizationList": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "idTag": {
            "type": "string",
            "maxLength": 20
          },
          "idTagInfo": {
            "type": "object",
            "properties": {
              "expiryDate": {
                "type": "string",
                "format": "date-time"
              },
              "parentIdTag": {
                "type": "string",
                "maxLength": 20
              },
              "status": {
                "type": "string",
                "additionalProperties": false,
                "enum": [
                  "Accepted",
                  "Blocked",
                  "Expired",
                  "Invalid",
                  "ConcurrentTx"
                ]
              }
            },
            "additionalProperties": false,
            "required": [
              "status"
            ]
          }
        },
        "additionalProperties": false,
        "required": [
          "idTag"
        ]
      }
    },
    "updateType": {
      "type": "string",
      "additionalProperties": false,
      "enum": [
        "Differential",
        "Full"
      ]
    }
  },
  "additionalProperties": false,
  "required": [
    "listVersion",
    "updateType"
  ]
}
```
</json-schema>

## 6.42. SendLocalList.conf

This contains the field definition of the SendLocalList.conf PDU sent by the Charge Point to the Central System in response to a SendLocalList.req PDU.

*See also Send Local List*

| FIELD NAME | FIELD TYPE | CARD. | DESCRIPTION |
|---|---|---|---|
| status | UpdateStatus | 1..1 | Required. This indicates whether the Charge Point has successfully received and applied the update of the local authorization list. |

**JSON Schema**

<json-schema id="SendLocalListResponse">
```json
{
  "$schema": "http://json-schema.org/draft-04/schema#",
  "id": "urn:OCPP:1.6:2019:12:SendLocalListResponse",
  "title": "SendLocalListResponse",
  "type": "object",
  "properties": {
    "status": {
      "type": "string",
      "additionalProperties": false,
      "enum": [
        "Accepted",
        "Failed",
        "NotSupported",
        "VersionMismatch"
      ]
    }
  },
  "additionalProperties": false,
  "required": [
    "status"
  ]
}
```
</json-schema>

## 6.43. SetChargingProfile.req

This contains the field definition of the SetChargingProfile.req PDU sent by the Central System to the Charge Point. The Central System uses this message to send charging profiles to a Charge Point.

*See also Set Charging Profile*

| FIELD NAME | FIELD TYPE | CARD. | DESCRIPTION |
|---|---|---|---|
| connectorId | integer | 1..1 | Required. The connector to which the charging profile applies. If connectorId = 0, the message contains an overall limit for the Charge Point. |
| csChargingProfiles | ChargingProfile | 1..1 | Required. The charging profile to be set at the Charge Point. |

**JSON Schema**

<json-schema id="SetChargingProfileRequest">
```json
{
  "$schema": "http://json-schema.org/draft-04/schema#",
  "id": "urn:OCPP:1.6:2019:12:SetChargingProfileRequest",
  "title": "SetChargingProfileRequest",
  "type": "object",
  "properties": {
    "connectorId": {
      "type": "integer"
    },
    "csChargingProfiles": {
      "type": "object",
      "properties": {
        "chargingProfileId": {
          "type": "integer"
        },
        "transactionId": {
          "type": "integer"
        },
        "stackLevel": {
          "type": "integer"
        },
        "chargingProfilePurpose": {
          "type": "string",
          "additionalProperties": false,
          "enum": [
            "ChargePointMaxProfile",
            "TxDefaultProfile",
            "TxProfile"
          ]
        },
        "chargingProfileKind": {
          "type": "string",
          "additionalProperties": false,
          "enum": [
            "Absolute",
            "Recurring",
            "Relative"
          ]
        },
        "recurrencyKind": {
          "type": "string",
          "additionalProperties": false,
          "enum": [
            "Daily",
            "Weekly"
          ]
        },
        "validFrom": {
          "type": "string",
          "format": "date-time"
        },
        "validTo": {
          "type": "string",
          "format": "date-time"
        },
        "chargingSchedule": {
          "type": "object",
          "properties": {
            "duration": {
              "type": "integer"
            },
            "startSchedule": {
              "type": "string",
              "format": "date-time"
            },
            "chargingRateUnit": {
              "type": "string",
              "additionalProperties": false,
              "enum": [
                "A",
                "W"
              ]
            },
            "chargingSchedulePeriod": {
              "type": "array",
              "items": {
                "type": "object",
                "properties": {
                  "startPeriod": {
                    "type": "integer"
                  },
                  "limit": {
                    "type": "number",
                    "multipleOf": 0.1
                  },
                  "numberPhases": {
                    "type": "integer"
                  }
                },
                "additionalProperties": false,
                "required": [
                  "startPeriod",
                  "limit"
                ]
              }
            },
            "minChargingRate": {
              "type": "number",
              "multipleOf": 0.1
            }
          },
          "additionalProperties": false,
          "required": [
            "chargingRateUnit",
            "chargingSchedulePeriod"
          ]
        }
      },
      "additionalProperties": false,
      "required": [
        "chargingProfileId",
        "stackLevel",
        "chargingProfilePurpose",
        "chargingProfileKind",
        "chargingSchedule"
      ]
    }
  },
  "additionalProperties": false,
  "required": [
    "connectorId",
    "csChargingProfiles"
  ]
}
```
</json-schema>

## 6.44. SetChargingProfile.conf

This contains the field definition of the SetChargingProfile.conf PDU sent by the Charge Point to the Central System in response to a SetChargingProfile.req PDU.

*See also Set Charging Profile*

| FIELD NAME | FIELD TYPE | CARD. | DESCRIPTION |
|---|---|---|---|
| status | ChargingProfileStatus | 1..1 | Required. Returns whether the Charge Point has been able to process the message successfully. This does not guarantee the schedule will be followed to the letter. There might be other constraints the Charge Point may need to take into account. |

**JSON Schema**

<json-schema id="SetChargingProfileResponse">
```json
{
  "$schema": "http://json-schema.org/draft-04/schema#",
  "id": "urn:OCPP:1.6:2019:12:SetChargingProfileResponse",
  "title": "SetChargingProfileResponse",
  "type": "object",
  "properties": {
    "status": {
      "type": "string",
      "additionalProperties": false,
      "enum": [
        "Accepted",
        "Rejected",
        "NotSupported"
      ]
    }
  },
  "additionalProperties": false,
  "required": [
    "status"
  ]
}
```
</json-schema>

## 6.45. StartTransaction.req

This section contains the field definition of the StartTransaction.req PDU sent by the Charge Point to the Central System.

*See also Start Transaction*

| FIELD NAME | FIELD TYPE | CARD. | DESCRIPTION |
|---|---|---|---|
| connectorId | integer connectorId > 0 | 1..1 | Required. This identifies which connector of the Charge Point is used. |
| idTag | IdToken | 1..1 | Required. This contains the identifier for which a transaction has to be started. |
| meterStart | integer | 1..1 | Required. This contains the meter value in Wh for the connector at start of the transaction. |
| reservationId | integer | 0..1 | Optional. This contains the id of the reservation that terminates as a result of this transaction. |
| timestamp | dateTime | 1..1 | Required. This contains the date and time on which the transaction is started. |

**JSON Schema**

<json-schema id="StartTransactionRequest">
```json
{
  "$schema": "http://json-schema.org/draft-04/schema#",
  "id": "urn:OCPP:1.6:2019:12:StartTransactionRequest",
  "title": "StartTransactionRequest",
  "type": "object",
  "properties": {
    "connectorId": {
      "type": "integer"
    },
    "idTag": {
      "type": "string",
      "maxLength": 20
    },
    "meterStart": {
      "type": "integer"
    },
    "reservationId": {
      "type": "integer"
    },
    "timestamp": {
      "type": "string",
      "format": "date-time"
    }
  },
  "additionalProperties": false,
  "required": [
    "connectorId",
    "idTag",
    "meterStart",
    "timestamp"
  ]
}
```
</json-schema>

## 6.46. StartTransaction.conf

This contains the field definition of the StartTransaction.conf PDU sent by the Central System to the Charge Point in response to a StartTransaction.req PDU.

*See also Start Transaction*

| FIELD NAME | FIELD TYPE | CARD. | DESCRIPTION |
|---|---|---|---|
| idTagInfo | IdTagInfo | 1..1 | Required. This contains information about authorization status, expiry and parent id. |
| transactionId | integer | 1..1 | Required. This contains the transaction id supplied by the Central System. |

**JSON Schema**

<json-schema id="StartTransactionResponse">
```json
{
  "$schema": "http://json-schema.org/draft-04/schema#",
  "id": "urn:OCPP:1.6:2019:12:StartTransactionResponse",
  "title": "StartTransactionResponse",
  "type": "object",
  "properties": {
    "idTagInfo": {
      "type": "object",
      "properties": {
        "expiryDate": {
          "type": "string",
          "format": "date-time"
        },
        "parentIdTag": {
          "type": "string",
          "maxLength": 20
        },
        "status": {
          "type": "string",
          "additionalProperties": false,
          "enum": [
            "Accepted",
            "Blocked",
            "Expired",
            "Invalid",
            "ConcurrentTx"
          ]
        }
      },
      "additionalProperties": false,
      "required": [
        "status"
      ]
    },
    "transactionId": {
      "type": "integer"
    }
  },
  "additionalProperties": false,
  "required": [
    "idTagInfo",
    "transactionId"
  ]
}
```
</json-schema>

## 6.47. StatusNotification.req

This contains the field definition of the StatusNotification.req PDU sent by the Charge Point to the Central System.

*See also Status Notification*

| FIELD NAME | FIELD TYPE | CARD. | DESCRIPTION |
|---|---|---|---|
| connectorId | integer connectorId >= 0 | 1..1 | Required. The id of the connector for which the status is reported. Id '0' (zero) is used if the status is for the Charge Point main controller. |
| errorCode | ChargePointErrorCode | 1..1 | Required. This contains the error code reported by the Charge Point. |
| info | CiString50Type | 0..1 | Optional. Additional free format information related to the error. |
| status | ChargePointStatus | 1..1 | Required. This contains the current status of the Charge Point. |
| timestamp | dateTime | 0..1 | Optional. The time for which the status is reported. If absent time of receipt of the message will be assumed. |
| vendorId | CiString255Type | 0..1 | Optional. This identifies the vendor-specific implementation. |
| vendorErrorCode | CiString50Type | 0..1 | Optional. This contains the vendor-specific error code. |

**JSON Schema**

<json-schema id="StatusNotificationRequest">
```json
{
  "$schema": "http://json-schema.org/draft-04/schema#",
  "id": "urn:OCPP:1.6:2019:12:StatusNotificationRequest",
  "title": "StatusNotificationRequest",
  "type": "object",
  "properties": {
    "connectorId": {
      "type": "integer"
    },
    "errorCode": {
      "type": "string",
      "additionalProperties": false,
      "enum": [
        "ConnectorLockFailure",
        "EVCommunicationError",
        "GroundFailure",
        "HighTemperature",
        "InternalError",
        "LocalListConflict",
        "NoError",
        "OtherError",
        "OverCurrentFailure",
        "PowerMeterFailure",
        "PowerSwitchFailure",
        "ReaderFailure",
        "ResetFailure",
        "UnderVoltage",
        "OverVoltage",
        "WeakSignal"
      ]
    },
    "info": {
      "type": "string",
      "maxLength": 50
    },
    "status": {
      "type": "string",
      "additionalProperties": false,
      "enum": [
        "Available",
        "Preparing",
        "Charging",
        "SuspendedEVSE",
        "SuspendedEV",
        "Finishing",
        "Reserved",
        "Unavailable",
        "Faulted"
      ]
    },
    "timestamp": {
      "type": "string",
      "format": "date-time"
    },
    "vendorId": {
      "type": "string",
      "maxLength": 255
    },
    "vendorErrorCode": {
      "type": "string",
      "maxLength": 50
    }
  },
  "additionalProperties": false,
  "required": [
    "connectorId",
    "errorCode",
    "status"
  ]
}
```
</json-schema>

## 6.48. StatusNotification.conf

This contains the field definition of the StatusNotification.conf PDU sent by the Central System to the Charge Point in response to an StatusNotification.req PDU.

*See also Status Notification No fields are defined.*

**JSON Schema**

<json-schema id="StatusNotificationResponse">
```json
{
  "$schema": "http://json-schema.org/draft-04/schema#",
  "id": "urn:OCPP:1.6:2019:12:StatusNotificationResponse",
  "title": "StatusNotificationResponse",
  "type": "object",
  "properties": {},
  "additionalProperties": false
}
```
</json-schema>

## 6.49. StopTransaction.req

This contains the field definition of the StopTransaction.req PDU sent by the Charge Point to the Central System.

*See also Stop Transaction*

| FIELD NAME | FIELD TYPE | CARD. | DESCRIPTION |
|---|---|---|---|
| idTag | IdToken | 0..1 | Optional. This contains the identifier which requested to stop the charging. It is optional because a Charge Point may terminate charging without the presence of an idTag, e.g. in case of a reset. A Charge Point SHALL send the idTag if known. |
| meterStop | integer | 1..1 | Required. This contains the meter value in Wh for the connector at end of the transaction. |
| timestamp | dateTime | 1..1 | Required. This contains the date and time on which the transaction is stopped. |
| transactionId | integer | 1..1 | Required. This contains the transaction-id as received by the StartTransaction.conf. |
| reason | Reason | 0..1 | Optional. This contains the reason why the transaction was stopped. MAY only be omitted when the Reason is "Local". |
| transactionData | MeterValue | 0..* | Optional. This contains transaction usage details relevant for billing purposes. |

**JSON Schema**

<json-schema id="StopTransactionRequest">
```json
{
  "$schema": "http://json-schema.org/draft-04/schema#",
  "id": "urn:OCPP:1.6:2019:12:StopTransactionRequest",
  "title": "StopTransactionRequest",
  "type": "object",
  "properties": {
    "idTag": {
      "type": "string",
      "maxLength": 20
    },
    "meterStop": {
      "type": "integer"
    },
    "timestamp": {
      "type": "string",
      "format": "date-time"
    },
    "transactionId": {
      "type": "integer"
    },
    "reason": {
      "type": "string",
      "additionalProperties": false,
      "enum": [
        "EmergencyStop",
        "EVDisconnected",
        "HardReset",
        "Local",
        "Other",
        "PowerLoss",
        "Reboot",
        "Remote",
        "SoftReset",
        "UnlockCommand",
        "DeAuthorized"
      ]
    },
    "transactionData": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "timestamp": {
            "type": "string",
            "format": "date-time"
          },
          "sampledValue": {
            "type": "array",
            "items": {
              "type": "object",
              "properties": {
                "value": {
                  "type": "string"
                },
                "context": {
                  "type": "string",
                  "additionalProperties": false,
                  "enum": [
                    "Interruption.Begin",
                    "Interruption.End",
                    "Sample.Clock",
                    "Sample.Periodic",
                    "Transaction.Begin",
                    "Transaction.End",
                    "Trigger",
                    "Other"
                  ]
                },
                "format": {
                  "type": "string",
                  "additionalProperties": false,
                  "enum": [
                    "Raw",
                    "SignedData"
                  ]
                },
                "measurand": {
                  "type": "string",
                  "additionalProperties": false,
                  "enum": [
                    "Energy.Active.Export.Register",
                    "Energy.Active.Import.Register",
                    "Energy.Reactive.Export.Register",
                    "Energy.Reactive.Import.Register",
                    "Energy.Active.Export.Interval",
                    "Energy.Active.Import.Interval",
                    "Energy.Reactive.Export.Interval",
                    "Energy.Reactive.Import.Interval",
                    "Power.Active.Export",
                    "Power.Active.Import",
                    "Power.Offered",
                    "Power.Reactive.Export",
                    "Power.Reactive.Import",
                    "Power.Factor",
                    "Current.Import",
                    "Current.Export",
                    "Current.Offered",
                    "Voltage",
                    "Frequency",
                    "Temperature",
                    "SoC",
                    "RPM"
                  ]
                },
                "phase": {
                  "type": "string",
                  "additionalProperties": false,
                  "enum": [
                    "L1",
                    "L2",
                    "L3",
                    "N",
                    "L1-N",
                    "L2-N",
                    "L3-N",
                    "L1-L2",
                    "L2-L3",
                    "L3-L1"
                  ]
                },
                "location": {
                  "type": "string",
                  "additionalProperties": false,
                  "enum": [
                    "Cable",
                    "EV",
                    "Inlet",
                    "Outlet",
                    "Body"
                  ]
                },
                "unit": {
                  "type": "string",
                  "additionalProperties": false,
                  "enum": [
                    "Wh",
                    "kWh",
                    "varh",
                    "kvarh",
                    "W",
                    "kW",
                    "VA",
                    "kVA",
                    "var",
                    "kvar",
                    "A",
                    "V",
                    "K",
                    "Celcius",
                    "Fahrenheit",
                    "Percent"
                  ]
                }
              },
              "additionalProperties": false,
              "required": [
                "value"
              ]
            }
          }
        },
        "additionalProperties": false,
        "required": [
          "timestamp",
          "sampledValue"
        ]
      }
    }
  },
  "additionalProperties": false,
  "required": [
    "transactionId",
    "timestamp",
    "meterStop"
  ]
}
```
</json-schema>

## 6.50. StopTransaction.conf

This contains the field definition of the StopTransaction.conf PDU sent by the Central System to the Charge Point in response to a StopTransaction.req PDU.

*See also Stop Transaction*

| FIELD NAME | FIELD TYPE | CARD. | DESCRIPTION |
|---|---|---|---|
| idTagInfo | IdTagInfo | 0..1 | Optional. This contains information about authorization status, expiry and parent id. It is optional, because a transaction may have been stopped without an identifier. |

**JSON Schema**

<json-schema id="StopTransactionResponse">
```json
{
  "$schema": "http://json-schema.org/draft-04/schema#",
  "id": "urn:OCPP:1.6:2019:12:StopTransactionResponse",
  "title": "StopTransactionResponse",
  "type": "object",
  "properties": {
    "idTagInfo": {
      "type": "object",
      "properties": {
        "expiryDate": {
          "type": "string",
          "format": "date-time"
        },
        "parentIdTag": {
          "type": "string",
          "maxLength": 20
        },
        "status": {
          "type": "string",
          "additionalProperties": false,
          "enum": [
            "Accepted",
            "Blocked",
            "Expired",
            "Invalid",
            "ConcurrentTx"
          ]
        }
      },
      "additionalProperties": false,
      "required": [
        "status"
      ]
    }
  },
  "additionalProperties": false
}
```
</json-schema>

## 6.51. TriggerMessage.req

This contains the field definition of the TriggerMessage.req PDU sent by the Central System to the Charge Point.

*See also Trigger Message*

| FIELD NAME | FIELD TYPE | CARD. | DESCRIPTION |
|---|---|---|---|
| requestedMessage | MessageTrigger | 1..1 | Required. |
| connectorId | integer connectorId > 0 | 0..1 | Optional. Only filled in when request applies to a specific connector. |

**JSON Schema**

<json-schema id="TriggerMessageRequest">
```json
{
  "$schema": "http://json-schema.org/draft-04/schema#",
  "id": "urn:OCPP:1.6:2019:12:TriggerMessageRequest",
  "title": "TriggerMessageRequest",
  "type": "object",
  "properties": {
    "requestedMessage": {
      "type": "string",
      "additionalProperties": false,
      "enum": [
        "BootNotification",
        "DiagnosticsStatusNotification",
        "FirmwareStatusNotification",
        "Heartbeat",
        "MeterValues",
        "StatusNotification"
      ]
    },
    "connectorId": {
      "type": "integer"
    }
  },
  "additionalProperties": false,
  "required": [
    "requestedMessage"
  ]
}
```
</json-schema>

## 6.52. TriggerMessage.conf

This contains the field definition of the TriggerMessage.conf PDU sent by the Charge Point to the Central System in response to a TriggerMessage.req PDU.

*See also Trigger Message*

| FIELD NAME | FIELD TYPE | CARD. | DESCRIPTION |
|---|---|---|---|
| status | TriggerMessageStatus | 1..1 | Required. Indicates whether the Charge Point will send the requested notification or not. |

**JSON Schema**

<json-schema id="TriggerMessageResponse">
```json
{
  "$schema": "http://json-schema.org/draft-04/schema#",
  "id": "urn:OCPP:1.6:2019:12:TriggerMessageResponse",
  "title": "TriggerMessageResponse",
  "type": "object",
  "properties": {
    "status": {
      "type": "string",
      "additionalProperties": false,
      "enum": [
        "Accepted",
        "Rejected",
        "NotImplemented"
      ]
    }
  },
  "additionalProperties": false,
  "required": [
    "status"
  ]
}
```
</json-schema>

## 6.53. UnlockConnector.req

This contains the field definition of the UnlockConnector.req PDU sent by the Central System to the Charge Point.

*See also Unlock Connector*

| FIELD NAME | FIELD TYPE | CARD. | DESCRIPTION |
|---|---|---|---|
| connectorId | integer connectorId > 0 | 1..1 | Required. This contains the identifier of the connector to be unlocked. |

**JSON Schema**

<json-schema id="UnlockConnectorRequest">
```json
{
  "$schema": "http://json-schema.org/draft-04/schema#",
  "id": "urn:OCPP:1.6:2019:12:UnlockConnectorRequest",
  "title": "UnlockConnectorRequest",
  "type": "object",
  "properties": {
    "connectorId": {
      "type": "integer"
    }
  },
  "additionalProperties": false,
  "required": [
    "connectorId"
  ]
}
```
</json-schema>

## 6.54. UnlockConnector.conf

This contains the field definition of the UnlockConnector.conf PDU sent by the Charge Point to the Central System in response to an UnlockConnector.req PDU.

*See also Unlock Connector*

| FIELD NAME | FIELD TYPE | CARD. | DESCRIPTION |
|---|---|---|---|
| status | UnlockStatus | 1..1 | Required. This indicates whether the Charge Point has unlocked the connector. |

**JSON Schema**

<json-schema id="UnlockConnectorResponse">
```json
{
  "$schema": "http://json-schema.org/draft-04/schema#",
  "id": "urn:OCPP:1.6:2019:12:UnlockConnectorResponse",
  "title": "UnlockConnectorResponse",
  "type": "object",
  "properties": {
    "status": {
      "type": "string",
      "additionalProperties": false,
      "enum": [
        "Unlocked",
        "UnlockFailed",
        "NotSupported"
      ]
    }
  },
  "additionalProperties": false,
  "required": [
    "status"
  ]
}
```
</json-schema>

## 6.55. UpdateFirmware.req

This contains the field definition of the UpdateFirmware.req PDU sent by the Central System to the Charge Point.

*See also Update Firmware*

| FIELD NAME | FIELD TYPE | CARD. | DESCRIPTION |
|---|---|---|---|
| location | anyURI | 1..1 | Required. This contains a string containing a URI pointing to a location from which to retrieve the firmware. |
| retries | integer | 0..1 | Optional. This specifies how many times Charge Point must try to download the firmware before giving up. If this field is not present, it is left to Charge Point to decide how many times it wants to retry. |
| retrieveDate | dateTime | 1..1 | Required. This contains the date and time after which the Charge Point is allowed to retrieve the (new) firmware. |
| retryInterval | integer | 0..1 | Optional. The interval in seconds after which a retry may be attempted. If this field is not present, it is left to Charge Point to decide how long to wait between attempts. |

**JSON Schema**

<json-schema id="UpdateFirmwareRequest">
```json
{
  "$schema": "http://json-schema.org/draft-04/schema#",
  "id": "urn:OCPP:1.6:2019:12:UpdateFirmwareRequest",
  "title": "UpdateFirmwareRequest",
  "type": "object",
  "properties": {
    "location": {
      "type": "string",
      "format": "uri"
    },
    "retries": {
      "type": "integer"
    },
    "retrieveDate": {
      "type": "string",
      "format": "date-time"
    },
    "retryInterval": {
      "type": "integer"
    }
  },
  "additionalProperties": false,
  "required": [
    "location",
    "retrieveDate"
  ]
}
```
</json-schema>

## 6.56. UpdateFirmware.conf

This contains the field definition of the UpdateFirmware.conf PDU sent by the Charge Point to the Central System in response to a UpdateFirmware.req PDU.

*See also Update Firmware No fields are defined.*

**JSON Schema**

<json-schema id="UpdateFirmwareResponse">
```json
{
  "$schema": "http://json-schema.org/draft-04/schema#",
  "id": "urn:OCPP:1.6:2019:12:UpdateFirmwareResponse",
  "title": "UpdateFirmwareResponse",
  "type": "object",
  "properties": {},
  "additionalProperties": false
}
```
</json-schema>
