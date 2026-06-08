---
title: "7. Configuration"
source-document: "OCPP-J 1.6 Specification"
source-spec: "Open Charge Point Protocol JSON 1.6 (OCPP-J 1.6)"
spec-section: "7"
spec-pages: "20"
spec-version: "1.6 — 2015-10-08"
transport: OCPP-J
tags:
  - ocpp/1.6
  - ocpp-j
  - transport
  - configuration
  - configuration-keys
---

# 7. Configuration

The following items in OCPP Get/ChangeConfiguration messages are added to control JSON/WebSockets behaviour:

*Table 8: Additional OCPP Keys*

| Key | Value |
|---|---|
| WebSocketPingInterval | integer A value of 0 disables client side websocket Ping / Pong. In this case there is either no ping / pong or the server initiates the ping and client responds with Pong. Positive values are interpreted as number of seconds between pings. Negative values are not allowed. ChangeConfiguration is expected to return a REJECTED result. |
