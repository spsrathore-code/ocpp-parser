---
title: "4. RPC framework"
source-document: "OCPP-J 1.6 Specification"
source-spec: "Open Charge Point Protocol JSON 1.6 (OCPP-J 1.6)"
spec-section: "4"
spec-pages: "9–14"
spec-version: "1.6 — 2015-10-08"
transport: OCPP-J
tags:
  - ocpp/1.6
  - ocpp-j
  - transport
  - rpc
  - call
  - callresult
  - callerror
---

# 4. RPC framework

## 4.1. Introduction

A websocket is a full-duplex connection, simply put a pipe where data goes in and data can come out and without a clear relation between in and out. The WebSocket protocol by itself provides no way to relate messages as requests and responses. To encode these request/response relations we need a small protocol on top of WebSocket. This problem occurs in more use cases of WebSocket so there are existing schemes to solve it. The most widely-used is WAMP (see [WAMP]) but with the current version of that framework handling RPCs symmetrically is not WAMP compliant. Since the required framework is very simple we decided to define our own framework, inspired by WAMP, leaving out what we do not need and adding what we find missing.

Basically what we need is very simple: we need to send a message (CALL) and receive a reply (CALLRESULT) or an explanation why the message could not be handled properly (CALLERROR). For possible future compatibility we will keep the numbering of these message in sync with WAMP. Our actual OCPP message will be put into a wrapper that at least contains the type of message, a unique message ID and the payload, the OCPP message itself.

### 4.1.1. Synchronicity

A Charge Point or Central System SHOULD NOT send a CALL message to the other party unless all the CALL messages it sent before have been responded to or have timed out. A CALL message has been responded to when a CALLERROR or CALLRESULT message has been received with the message ID of the CALL message.

A CALL message has timed out when:

- it has not been responded to, and
- an implementation-dependent timeout interval has elapsed since the message was sent.

Implementations are free to choose this timeout interval. It is RECOMMENDED that they take into account the kind of network used to communicate with the other party. Mobile networks typically have much longer worst-case round-trip times than fixed lines.

> NOTE
>
> The above requirements do not rule out that a Charge Point or Central System will receive a CALL message from the other party while it is waiting for a CALLERROR or CALLRESULT. Such a situation is difficult to prevent because CALL messages from both sides can always cross each other.

### 4.1.2. Character encoding

The whole message consisting of wrapper and payload MUST be valid JSON encoded with the UTF-8 (see [RFC3629]) character encoding.

Note that all valid US-ASCII text is also valid UTF-8, so if a system sends only US-ASCII text, all messages it sends comply with the UTF-8 requirement. A Charge Point or Central System SHOULD only use characters not in US-ASCII for sending natural-language text. An example of such natural-language text is the text in the LocalizedText type in OCPP 2.0.

### 4.1.3. The message type

To identify the type of message one of the following Message Type Numbers MUST be used.

*Table 2: Message types*

| MessageType | MessageTypeNumber | Direction |
|---|---|---|
| CALL | 2 | Client-to-Server |
| CALLRESULT | 3 | Server-to-Client |
| CALLERROR | 4 | Server-to-Client |

When a server receives a message with a Message Type Number not in this list, it SHALL ignore the message payload. Each message type may have additional required fields.

### 4.1.4. The message ID

The message ID serves to identify a request. A message ID for a CALL message MUST be different from all message IDs previously used by the same sender for CALL messages on the same WebSocket connection. A message ID for a CALLRESULT or CALLERROR message MUST be equal to that of the CALL message that the CALLRESULT or CALLERROR message is a response to.

*Table 3: Unique Message ID*

| Name | Datatype | Restrictions |
|---|---|---|
| messageId | string | Maximum of 36 characters, to allow for GUIDs |

## 4.2. Message structures for different message types

> NOTE
>
> You may find the charge point identity missing in the following paragraphs. The identity is exchanged during the WebSocket connection handshake and is a property of the connection. Every message is sent by or directed at this identity. There is therefore no need to repeat it in each message.

### 4.2.1. Call

A Call always consists of 4 elements: The standard elements MessageTypeId and UniqueId, a specific Action that is required on the other side and a payload, the arguments to the Action. The syntax of a call looks like this:

```
[<MessageTypeId>, "<UniqueId>", "<Action>", {<Payload>}]
```

*Table 4: Call Fields*

| Field | Meaning |
|---|---|
| UniqueId | this is a unique identifier that will be used to match request and result. |
| Action | the name of the remote procedure or action. This will be a case-sensitive string containing the same value as the Action-field in SOAP-based messages, without the preceding slash. |
| Payload | Payload is a JSON object containing the arguments relevant to the Action. If there is no payload JSON allows for two different notations: null or and empty object \{}. Although it seems trivial we consider it good practice to only use the empty object statement. Null usually represents something undefined, which is not the same as empty, and also \{} is shorter. |

For example, a BootNotification request could look like this:

```json
[2,
"19223201",
"BootNotification",
{"chargePointVendor": "VendorX", "chargePointModel": "SingleSocketCharger"}
]
```

### 4.2.2. CallResult

If the call can be handled correctly the result will be a regular CallResult. Error situations that are covered by the definition of the OCPP response definition are not considered errors in this context. They are regular results and as such will be treated as a normal CallResult, even if the result is undesirable for the recipient.

A CallResult always consists of 3 elements: The standard elements MessageTypeId and UniqueId and a payload, containing the response to the Action in the original Call. The syntax of a call looks like this:

```
[<MessageTypeId>, "<UniqueId>", {<Payload>}]
```

*Table 5: CallResult Fields*

| Field | Meaning |
|---|---|
| UniqueId | This must be the exact same ID that is in the call request so that the recipient can match request and result. |
| Payload | Payload is a JSON object containing the results of the executed Action. If there is no payload JSON allows for two different notations: null or and empty object \{}. Although it seems trivial we consider it good practice to only use the empty object statement. Null usually represents something undefined, which is not the same as empty, and also \{} is shorter. |

For example, a BootNotification response could look like this:

```json
[3,
"19223201",
{"status":"Accepted", "currentTime":"2013-02-01T20:53:32.486Z", "heartbeatInterval":300}
]
```

### 4.2.3. CallError

We only use CallError in two situations:

1. An error occurred during the transport of the message. This can be a network issue, an availability of service issue, etc.
2. The call is received but the content of the call does not meet the requirements for a proper message. This could be missing mandatory fields, an existing call with the same unique identifier is being handled already, unique identifier too long, etc.

A CallError always consists of 5 elements: The standard elements MessageTypeId and UniqueId, an errorCode string, an errorDescription string and an errorDetails object. The syntax of a call looks like this:

```
[<MessageTypeId>, "<UniqueId>", "<errorCode>", "<errorDescription>", {<errorDetails>}]
```

*Table 6: CallError Fields*

| Field | Meaning |
|---|---|
| UniqueId | This must be the exact same id that is in the call request so that the recipient can match request and result. |
| ErrorCode | This field must contain a string from the ErrorCode table below. |
| ErrorDescription | Should be filled in if possible, otherwise a clear empty string “”. |
| ErrorDetails | This JSON object describes error details in an undefined way. If there are no error details you MUST fill in an empty object \{}. |

*Table 7: Valid Error Codes*

| Error Code | Description |
|---|---|
| NotImplemented | Requested Action is not known by receiver |
| NotSupported | Requested Action is recognized but not supported by the receiver |
| InternalError | An internal error occurred and the receiver was not able to process the requested Action successfully |
| ProtocolError | Payload for Action is incomplete |
| SecurityError | During the processing of Action a security issue occurred preventing receiver from completing the Action successfully |
| FormationViolation | Payload for Action is syntactically incorrect or not conform the PDU structure for Action |
| PropertyConstraintViolation | Payload is syntactically correct but at least one field contains an invalid value |
| OccurenceConstraintViolation | Payload for Action is syntactically correct but at least one of the fields violates occurence constraints |
| TypeConstraintViolation | Payload for Action is syntactically correct but at least one of the fields violates data type constraints (e.g. “somestring”: 12) |
| GenericError | Any other error not covered by the previous ones |
