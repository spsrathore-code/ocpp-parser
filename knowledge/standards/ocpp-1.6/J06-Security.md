---
title: "6. Security"
source-document: "OCPP-J 1.6 Specification"
source-spec: "Open Charge Point Protocol JSON 1.6 (OCPP-J 1.6)"
spec-section: "6"
spec-pages: "15–20"
spec-version: "1.6 — 2015-10-08"
transport: OCPP-J
tags:
  - ocpp/1.6
  - ocpp-j
  - transport
  - security
  - tls
  - authentication
---

# 6. Security

Two approaches exist for security with OCPP-J. Either one can rely on network-level security, or one uses OCPP-J over TLS. Both approaches are described below.

It is important that at all times, one of these approaches is used. Practically, this means that a Central System SHOULD NOT listen for incoming unencrypted OCPP-J connections from the internet.

## 6.1. Network-level security

For security one MAY rely on the security at a network level. This has historically been done with OCPP-S, and on networks that are set up appropriately one can also use OCPP-J without additional encryption or authentication measures.

## 6.2. OCPP-J over TLS

Sometimes however a secured network is not available between Charge Point and Central System. In that case one can use OCPP-J over TLS. This section explains how this is done.

The security needed for OCPP communication actually consists of two separate features: encryption and charge point authentication.

Encryption means that the OCPP messages are encrypted so no unauthorized third party can see the messages exchanged.

Charge point authentication means that Central System can verify the identity of a charge point, so that no unauthorized third party can pretend to be a charge point and send malicious messages to a central system.

### 6.2.1. Encryption

The industry standard for encryption on the internet is Transport Layer Security (TLS) [RFC5246]. Therefore OCPP is also adopting protocol for encrypting the connection between Central System and Charge Point. TLS with WebSocket is widely supported by libraries and for clients should be hardly more difficult than using unencrypted WebSocket.

When using TLS, the central system MAY also provide a signed certificate that a charge point can use to verify the central system’s identity.

As some Charge Point implementations are using embedded systems with limited computing resources, we impose an additional restriction on the TLS configuration on the server side:

- The TLS certificate SHALL be an RSA certificate with a size no greater than 2048 bytes

### 6.2.2. Charge point authentication

For authentication, OCPP-J over TLS uses the HTTP Basic authentication scheme ([RFC2617]). The relatively simple HTTP Basic authentication can be used because the connection is already TLS-encrypted, so there is no need to encrypt the credentials a second time.

When using HTTP Basic authentication, the client, i.e. the Charge Point, has to provide a username and password with its request. The username is equal to the charge point identity, which is the identifying string of the charge point as it uses it in the OCPP-J connection URL. The password is a 20-byte key that is stored on the charge point.

#### Example

If we have a charge point with:

- charge point identity "AL1000"
- authorization key 0001020304050607FFFFFFFFFFFFFFFFFFFFFFFF

the HTTP authorization header should be:

```http
Authorization: Basic QUwxMDAwOgABAgMEBQYH////////////////
```

#### A note on encryption

The authentication mechanism via HTTP Basic Authentication is meant to be used on TLS-encrypted connections. Using this mechanism on an unencrypted connection means that anyone who can see the network traffic between Charge Point and Central System can see the charge point credentials, and can thus impersonate the Charge Point.

#### Setting the charge point’s credentials

For this charge point authentication scheme, the charge point needs to have an authentication key. This authentication key has to be transferred onto the charge point in some way. What is a good way depends on the business model of the charge point manufacturer and central system operator.

##### Setting during or before installation

The desired, secure situation is that every charge point has its own, unique authorization key. If an authorization key is not unique, an attacker who discovers the authorization key of a single charge point can impersonate many or even all charge points in an operator’s Central System.

The simplest way to achieve this is to install the authorization key on the charge point during manufacture or installation. In these cases, the key will be securely communicated between the central system operator and installer or manufacturer by communication channels outside of OCPP. This scenario is secure because the key is not sent over the channel it is meant to secure, so an attacker eavesdropping the connection between Charge Point and Central System cannot impersonate the Charge Point.

##### Setting the key over OCPP

If the processes of manufacturing, sale and installation of a charge point are not under the central system operator’s control, there is no way to put a unique key on each individual charge point and also make sure the central system operator knows these keys and the charge points they belong to. For such scenarios, it is desirable for all charge points of a series to have the same "master" key when they leave the factory and are installed, or to have keys that are derived from the charge point identity by the same algorithm. Still the Central System operator will want to keep adversaries from impersonating all charge points of a series if the master key is leaked. For this use case, there is a possibility for the Central System to send a unique key to the charge point via OCPP after charge point installation.

To set a charge point’s authorization key via OCPP, the Central System SHALL send the Charge Point a ChangeConfiguration.req message with the key AuthorizationKey and as the value a 40-character hexadecimal representation of the 20-byte authorization key. If the Charge Point responds to this ChangeConfiguration.req with a ChangeConfiguration.conf with status Accepted, the Central System SHALL assume that the authorization key change was successful, and no longer accept the credentials previously used by the charge point. If the Charge Point responds to the ChangeConfiguration.req with a ChangeConfiguration.conf with status Rejected or NotSupported, the Central System SHALL keep accepting the old credentials. While the Central System SHALL still accept an OCPP-J connection from the Charge Point in this case, it MAY treat the Charge Point’s OCPP messages differently, e.g. by not accepting the Charge Point’s boot notifications.

The charge point should not give back the authorization key in response to a GetConfiguration request. It can either not report the AuthorizationKey key at all or give back a value that is not related to the actual authorization key.

Note that while sending a key over the channel to be secured is normally considered a bad practice, we believe it is appropriate here to at least offer the possibility to do so. Typically the authorization key will be set when a charge point is first 'on-boarded' in the central system. If the charge point then later produces the key that was set during on-boarding, it at least means this is the same system that connected during the on-boarding. While it may be possible to successfully on-board a spoofed new charge point to an adversary who knows the single "master" key for all new charge points, it is not possible to pretend to be an already-installed and operating charge point. This makes still makes a number of conceivable attacks impossible:

- "reservation" of a charge point by spoofing messages marking it as occupied
- marking your just-started session on a public charge point as stopped so you won’t have to pay as much
- sending many spoofed transactions and/or errors from already on-boarded charge points to confuse a central system operator’s operations
- send spoofed transactions with another person’s token ID to the central system to incur financial damage to the token ID’s owner

It is RECOMMENDED that the Central System operator makes setting the authorization key part of a charge point onboarding procedure, using the new OCPP 1.6 Pending value of the registration status in BootNotification.conf. A newly-connecting Charge Point will first get a Pending registration status on its first BootNotification.conf. The Central System will then set the Charge Point’s unique authorization key with a ChangeConfiguration.req. Only when this ChangeConfiguration.req has been responded to with a ChangeConfiguration.conf with a status of Accepted, will the Central System respond to a boot notification with an Accepted registration status.

It is RECOMMENDED that the Central System operator checks for anomalies in the newly-connecting charge points. Thus he can try to detect if an attacker has managed to steal the master key or key derivation algorithm, and a list of registered charge point identities. For example, if the rate at which new charge points connect suddenly increases, this may indicate an attack.

#### Storing the credentials

It is important that the credentials are stored on the Charge Point in such a way that they are not easily lost or reset. If the credentials are lost, erased or changed unilaterally, the Charge Point can no longer connect to the Central System and requires on-site servicing to install new credentials.

On the Central System side, it is RECOMMENDED to store the authorization key hashed, with a unique salt, using a cryptographic hash algorithm designed for secure storage of passwords. This makes sure that if the database containing the charge points' authorization keys is leaked, the attackers still cannot authenticate as the charge points to the Central System.

### 6.2.3. What it does and does not secure

The scope of these security measures is limited to authentication and encryption of the connection between Charge Point and Central System. It does not address every current security issue in the EV Charging IT landscape.

It does provide the following things:

- authentication of the Charge Point to the Central System (using HTTP Basic Authentication)
- encryption of the connection between Charge Point and Central System
- authentication of the Central System to the Charge Point (with a TLS certificate)

It does not provide:

- A guarantee that the meter values are not tampered with between the meter and the Central System
- Authentication of the driver
- Protection against people physically tampering with a charge point

### 6.2.4. Applicability to OCPP-S

The approach of OCPP-J over TLS cannot be applied to OCPP-S. There are two reasons.

Firstly, in OCPP-S a new TCP connection is created for every request-response exchange. One would thus have to do a new TLS handshake for each such request-response exchange, incurring a great bandwidth overhead.

Secondly, in OCPP-S the Charge Point also acts a server, and would thus need a server certificate. It would be a great administrative burden to keep track of so many server certificates and the charge points they belong to.
