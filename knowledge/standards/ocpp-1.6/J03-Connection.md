---
title: "3. Connection"
source-document: "OCPP-J 1.6 Specification"
source-spec: "Open Charge Point Protocol JSON 1.6 (OCPP-J 1.6)"
spec-section: "3"
spec-pages: "6–9"
spec-version: "1.6 — 2015-10-08"
transport: OCPP-J
tags:
  - ocpp/1.6
  - ocpp-j
  - transport
  - connection
  - websocket
---

# 3. Connection

For the connection between a Charge Point and a Central System using OCPP-J, the Central System acts as a WebSocket server and the Charge Point acts as a WebSocket client.

## 3.1. Client request

To set up a connection, the Charge Point initiates a WebSocket connection as described in [RFC6455] section 4, "Opening Handshake".

OCPP-J imposes extra constraints on the URL and the WebSocket subprotocol, detailed in the following two sections 4.1.1 and 4.1.2.

### 3.1.1. The connection URL

To initiate a WebSocket connection, the Charge Point needs a URL ([RFC3986]) to connect to. This URL is henceforth called the "connection URL". This connection URL is specific to a charge point. The charge point's connection URL contains the charge point identity so that the Central System knows which charge point a WebSocket connection belongs to.

A Central System supporting OCPP-J MUST provide at least one OCPP-J endpoint URL, from which the Charge Point SHOULD derive its connection URL. This OCPP-J endpoint URL can be any URL with a "ws" or "wss" scheme. How the Charge Point obtains an OCPP-J endpoint URL is outside of the scope of this document.

To derive its connection URL, the Charge Point modifies the OCPP-J endpoint URL by appending to the path first a '/' (U+002F SOLIDUS) and then a string uniquely identifying the Charge Point. This uniquely identifying string has to be percent-encoded as necessary as described in [RFC3986].

Example 1: for a charge point with identity "CP001" connecting to a Central System with OCPP-J endpoint URL "ws://centralsystem.example.com/ocpp" this would give the following connection URL:

```
ws://centralsystem.example.com/ocpp/CP001
```

Example 2: for a charge point with identity "RDAM 123" connecting to a Central System with OCPP-J endpoint URL "wss://centralsystem.example.com/ocppj" this would give the following URL:

```
wss://centralsystem.example.com/ocppj/RDAM%20123
```

### 3.1.2. OCPP version

The exact OCPP version MUST be specified in the Sec-Websocket-Protocol field. This SHOULD be one of the following values:

*Table 1: OCPP Versions*

| OCPP version | WebSocket subprotocol name |
|---|---|
| 1.2 | ocpp1.2 |
| 1.5 | ocpp1.5 |
| 1.6 | ocpp1.6 |
| 2.0 | ocpp2.0 |

The ones for OCPP 1.2, 1.5 and 2.0 are official WebSocket subprotocol name values. They are registered as such with IANA.

Note that OCPP 1.2 and 1.5 are in the list. Since the JSON over WebSocket solution is independent of the actual message content the solution can be used for older OCPP versions as well. Please keep in mind that in these cases the implementation should preferably also maintain support for the SOAP based solution to be interoperable.

It is considered good practice to include the OCPP version as part of the OCPP-J endpoint URL string. If you run a web service that can handle multiple protocol versions on the same OCPP-J endpoint URL this is not necessary of course.

### 3.1.3. Example of an opening HTTP request

The following is an example of an opening HTTP request of an OCPP-J connection handshake:

```http
GET /webServices/ocpp/CP3211 HTTP/1.1
Host: some.server.com:33033
Upgrade: websocket
Connection: Upgrade
Sec-WebSocket-Key: x3JJHMbDL1EzLkh9GBhXDw==
Sec-WebSocket-Protocol: ocpp1.6, ocpp1.5
Sec-WebSocket-Version: 13
```

The bold parts are found as such in every WebSocket handshake request, the other parts are specific to this example.

In this example, the Central System's OCPP-J endpoint URL is "ws://some.server.com:33033/webServices/ocpp". The Charge Point's unique identifier is "CP3211", so the path to request becomes "webServices/ocpp/CP3211".

With the Sec-WebSocket-Protocol header, the Charge Point indicates here that it can use OCPP1.6J and OCPP1.5J, with a preference for the former.

The other headers in this example are part of the HTTP and WebSocket protocols and are not relevant to those implementing OCPP-J on top of third-party WebSocket libraries. The roles of these headers are explained in [RFC2616] and [RFC6455].

## 3.2. Server response

Upon receiving the Charge Point's request, the Central System has to finish the handshake with a response as described in [RFC6455].

The following OCPP-J-specific conditions apply:

- If the Central System does not recognize the charge point identifier in the URL path, it SHOULD send an HTTP response with status 404 and abort the WebSocket connection as described in [RFC6455].
- If the Central System does not agree to using one of the subprotocols offered by the client, it MUST complete the WebSocket handshake with a response without a Sec-WebSocket-Protocol header and then immediately close the WebSocket connection.

So if the Central System accepts the above example request and agrees to using OCPP 1.6J with the Charge Point, the Central System's response will look as follows:

```http
HTTP/1.1 101 Switching Protocols
Upgrade: websocket
Connection: Upgrade
Sec-WebSocket-Accept: s3pPLMBiTxaQ9kYGzzhZRbK+xOo=
Sec-WebSocket-Protocol: ocpp1.6
```

The bold parts are found as such in every WebSocket handshake response, the other parts are specific to this example.

The roleof the Sec-WebSocket-Accept header is explained in [RFC6455].

The Sec-WebSocket-Protocol header indicates that the server will be using OCPP1.6J on this connection.

## 3.3. More information

For those doing their own implementation of the WebSocket handshake, [WS] and [WIKIWS] give more information on the WebSocket protocol.
