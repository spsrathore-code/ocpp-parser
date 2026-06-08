---
title: "5. Connection"
source-document: "OCPP-J 1.6 Specification"
source-spec: "Open Charge Point Protocol JSON 1.6 (OCPP-J 1.6)"
spec-section: "5"
spec-pages: "14–15"
spec-version: "1.6 — 2015-10-08"
transport: OCPP-J
tags:
  - ocpp/1.6
  - ocpp-j
  - transport
  - connection
  - websocket
  - heartbeat
---

# 5. Connection

## 5.1. Compression

Since JSON is very compact we recommend not to use compression in any other form than allowed as part of the WebSocket [RFC6455] specification. Otherwise it may compromise interoperability.

## 5.2. Data integrity

For data integrity we rely on the underlying TCP/IP transport layer mechanisms.

## 5.3. WebSocket Ping in relation to OCPP Heartbeat

The WebsSocket specification defines Ping and Pong frames that are used to check if the remote endpoint is still responsive. In practice this mechanism is also used to prevent the network operator from quietly closing the underlying network connection after a certain period of inactivity. This websocket feature can be used as a substitute for most of the OCPP Heartbeat messages, but cannot replace all of its functionality.

An important aspect of the Heartbeat response is time synchronisation. The Ping and Pong frames cannot be used for this so at least one original Heartbeat message a day is recommended to ensure a correct clock setting on the Charge Point.

## 5.4. Reconnecting

When reconnecting a charge point should not send a BootNotification unless one or more of the elements in the BootNotification have changed since the last connection. For the previous SOAP based solutions this was considered good practice but when using WebsSocket the server can already make the match between the identity and a communciation channel at the moment the connection is established. There is no need for an additional message.

## 5.5. Network node hierarchy

The physical network topology is not influenced by a choice for JSON or SOAP. In case of JSON however the issues with Network Address Translation (NAT) have been resolved by letting the Charge Point open a TCP connection to the Central System and keeping this connection open for communication initiated by the Central System. It is therefore no longer necessary to have a smart device capable of interpreting and redirecting SOAP calls in between the Central System and the Charge Point.
