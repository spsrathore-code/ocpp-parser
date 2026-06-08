---
title: "2. Terminology and Conventions"
spec-section: "2"
spec-pages: "5–7"
spec-version: "1.6 edition 2 — FINAL, 2017-09-28"
tags:
  - ocpp/1.6
  - terminology
  - conventions
---

# 2. Terminology and Conventions

## 2.1. Conventions

The key words “MUST”, “MUST NOT”, “REQUIRED”, “SHALL”, “SHALL NOT”, “SHOULD”, “SHOULD NOT”, “RECOMMENDED”, “MAY”, and “OPTIONAL” in this document are to be interpreted as described in [RFC2119], subject to the following additional clarification clause:

The phrase “valid reasons in particular circumstances” relating to the usage of the terms “SHOULD”, “SHOULD NOT”, “RECOMMENDED”, and “NOT RECOMMENDED” is to be taken to mean technically valid reasons, such as the absence of necessary hardware to support a function from a charge point design: for the purposes of this specification it specifically excludes decisions made on commercial, or other non-technical grounds, such as cost of implementation, or likelihood of use.

All sections and appendixes, except “Scope” and “Terminology and Conventions”, are normative, unless they are explicitly indicated to be informative.

## 2.2. Definitions

This section contains the terminology that is used throughout this document.

| TERM | DEFINITION |
|---|---|
| Central System | Charge Point Management System: the central system that manages Charge Points and has the information for authorizing users for using its Charge Points. |
| CiString | Case Insensitive String. Only printable ASCII allowed. |
| Charge Point | The Charge Point is the physical system where an electric vehicle can be charged. A Charge Point has one or more connectors. |
| Charging Profile | Generic Charging Profile, used for different types of Profiles. Contains information about the Profile and holds the Charging Schedule. In future versions of OCPP it might hold more than 1 Charging Schedule. |
| Charging Schedule | Part of a Charging Profile. Defines a block of charging Power or Current limits. Can contain a start time and length. |
| Charging Session | A Charging Session is started when first interaction with user or EV occurs. This can be a card swipe, remote start of transaction, connection of cable and/or EV, parking bay occupancy detector, etc. |
| Composite Charging Schedule | The charging schedule as calculated by the Charge Point. It is the result of the calculation of all active schedules and possible local limits present in the Charge Point. Local Limits might be taken into account. |
| Connector | The term “Connector”, as used in this specification, refers to an independently operated and managed electrical outlet on a Charge Point. This usually corresponds to a single physical connector, but in some cases a single outlet may have multiple physical socket types and/or tethered cable/connector arrangements to facilitate different vehicle types (e.g. four-wheeled EVs and electric scooters). |
| Control Pilot signal | Signal used by a Charge Point to inform EV of maximum Charging power or current limit, as defined by [IEC61851-1]. |
| Energy Offer Period | Energy Offer Period starts when the EVSE is ready and willing to supply energy. |
| Energy Offer SuspendPeriod | During a transaction, there may be periods the EnergyOffer to EV is suspended by the EVSE, for instance due to Smart Charging or local balancing. |
| Energy Transfer Period | Time during which an EV chooses to take offered energy, or return it. Multiple Energy Transfer Periods are possible during a Transaction. |
| Local Controller | Optional device in a smart charging infrastructure. Located on the premises with a number of Charge Points connected to it. Sits between the Charge Points and Central System. Understands and speaks OCPP messages. Controls the Power or Current in other Charge Point by using OCPP smart charging messages. Can be a Charge Point itself. |
| OCPP-J | OCPP via JSON over WebSocket |
| OCPP-S | OCPP via SOAP |
| Phase Rotation | Defines the wiring order of the phases between the electrical meter (or if absent, the grid connection), and the Charge Point connector. |
| Transaction | The part of the charging process that starts when all relevant preconditions (e.g. authorization, plug inserted) are met, and ends at the moment when the Charge Point irrevocably leaves this state. |
| String | Case Sensitive String. Only printable ASCII allowed. All strings in messages and enumerations are case sensitive, unless explicitly stated otherwise. |

## 2.3. Abbreviations

| ABBREVIATION | MEANING |
|---|---|
| CSL | Comma Separated List |
| CPO | Charge Point Operator |
| DNS | Domain Name System |
| DST | Daylight Saving Time |
| EV | Electrical Vehicle, this can be BEV (battery EV) or PHEV (plug-in hybrid EV) |
| EVSE | Electric Vehicle Supply Equipment [IEC61851-1] |
| FTP(S) | File Transport Protocol (Secure) |
| HTTP(S) | HyperText Transport Protocol (Secure) |
| ICCID | Integrated Circuit Card Identifier |
| IMSI | International Mobile Subscription Identity |
| JSON | JavaScript Object Notation |
| NAT | Native Address Translation |
| PDU | Protocol Data Unit |
| SC | Smart Charging |
| SOAP | Simple Object Access Protocol |
| URL | Uniform Resource Locator |
| RST | 3 phase power connection, Standard Reference Phasing |
| RTS | 3 phase power connection, Reversed Reference Phasing |
| SRT | 3 phase power connection, Reversed 240 degree rotation |
| STR | 3 phase power connection, Standard 120 degree rotation |
| TRS | 3 phase power connection, Standard 240 degree rotation |
| TSR | 3 phase power connection, Reversed 120 degree rotation |
| UTC | Coordinated Universal Time |

## 2.4. References

- [IEC61851-1] “IEC 61851-1 2010: Electric vehicle conductive charging system - Part 1: General requirements” https://webstore.iec.ch/publication/6029
- [OCPP1.5] “OCPP 1.5: Open Charge Proint Protocol 1.5” http://www.openchargealliance.org/downloads/
- [OCPP_1.6CT] “OCPP 1.6 Compliance testing” http://www.openchargealliance.org/downloads/
- [OCPP_IMP_J] “OCPP JSON Specification” http://www.openchargealliance.org/downloads/
- [OCPP_IMP_S] “OCPP SOAP Specification” http://www.openchargealliance.org/downloads/
- [RFC2119] “Key words for use in RFCs to Indicate Requirement Levels”. S. Bradner. March 1997. http://www.ietf.org/rfc/rfc2119.txt
