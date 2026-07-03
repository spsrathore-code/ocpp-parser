# OCPP Simulator — Current-State Functional Spec (Integration Requirements Baseline)

> **Role:** BLUEPRINT · **Status:** DRAFT · **Created:** 2026-07-03
> **Scope:** This document describes, from the **user's point of view** (not the
> code), what the **OCPP Simulator** — the first of the three tabs in
> `OCPP Transaction Simulator Extended V3_17 Aug.html` — does **today**. It is the
> agreed baseline of behavior that any suite integration (Validation Engine +
> Parser) must preserve. Tabs 2 (*Transaction Flow Simulator*) and 3 (*CMS Log
> Parser*) are out of scope here and documented separately.
>
> **Source file:** `OCPP Transaction Simulator Extended V3_17 Aug.html` (standalone
> browser HTML, ~6,010 lines, title *"OCPP Transaction Simulator Extended - With
> Complete Transaction Flow Simulation"*).

---

## 1. What the OCPP Simulator is (in one paragraph)

The OCPP Simulator lets a user pick a single OCPP 1.6J message, fill in its
parameters through a form, and see the exact request/response JSON that would go
over the wire. It works two ways: **completely offline** (it fakes the other
side's reply so you can learn and validate a message on its own), or **connected
to a real Central System** (it behaves as an actual charge point and exchanges
live OCPP frames). The mode is chosen with a single toggle at the top of the tab.

---

## 2. The mode toggle (the thing this document is really about)

At the top of the OCPP Simulator tab there is an **"Operating Mode"** selector
with two radio buttons:

| Mode | Label shown to user | Default? | Network? |
|---|---|---|---|
| Simulator Only | **"Simulator Only"** | ✅ Yes | No — fully offline |
| CP Mode | **"Charge Point (CP) Mode"** | No | Yes — live WebSocket to a CSMS |

Switching to **Charge Point (CP) Mode** reveals an extra **connection panel**
(hidden in Simulator Only): a WebSocket URL box, a Connect button, a colored
connection-status indicator, and a Start Heartbeat button. Switching back to
Simulator Only hides that panel again.

The rest of the tab (message dropdown, parameter form, Request Payload box,
Response Payload box, validation area, and message log) is **shared by both
modes** — only the *behavior* of the "action" button and the source of the
response changes.

---

## 3. Shared screen elements (present in both modes)

- **Message dropdown** — choose which OCPP message to work with. On first load a
  welcome screen shows a large dropdown; once a message is picked the full
  workspace appears.
- **Available messages** —
  - **Today (current build):** only **7 Core-profile, CP→CS messages** are
    populated: `Authorize`, `BootNotification`, `Heartbeat`, `MeterValues`,
    `StartTransaction`, `StopTransaction`, `StatusNotification`. (The dropdown is
    already grouped and reserves headings for Remote Control / Smart Charging /
    Reservation / Local Auth List — it was designed for the full set but never
    populated.)
  - **Target (integration requirement):** the **complete OCPP 1.6J set — all 28
    operations / 56 PDUs** — categorized by the spec's **6 Feature Profiles** and
    by **Direction** (see the catalog in §3.1). All assets to do this already
    exist in the repo: the 28 field-definition tables
    (`knowledge/standards/ocpp-1.6/06-Messages.md`), the 56 canonical JSON
    schemas (`src/schemas/ocpp-1.6/`), and runtime validators for every message
    (`typed-ocpp`, already used by the Validation Engine).

### 3.1. Full message catalog — the 6 OCPP Feature Profiles

The selector is organized on two axes: **Feature Profile** (primary — the same
grouping used in OCPP certification, so it doubles as a training curriculum) and
**Direction** (which side may initiate — this also decides which mode can send it).

| Profile | Operations | Direction |
|---|---|---|
| **Core** (16) | Authorize, BootNotification, Heartbeat, MeterValues, StatusNotification, StartTransaction, StopTransaction | CP → CS |
| | ChangeAvailability, ChangeConfiguration, GetConfiguration, ClearCache, Reset, UnlockConnector, RemoteStartTransaction, RemoteStopTransaction | CS → CP |
| | DataTransfer | both |
| **Firmware Management** (4) | DiagnosticsStatusNotification, FirmwareStatusNotification | CP → CS |
| | GetDiagnostics, UpdateFirmware | CS → CP |
| **Local Auth List** (2) | GetLocalListVersion, SendLocalList | CS → CP |
| **Reservation** (2) | ReserveNow, CancelReservation | CS → CP |
| **Smart Charging** (3) | SetChargingProfile, ClearChargingProfile, GetCompositeSchedule | CS → CP |
| **Remote Trigger** (1) | TriggerMessage | CS → CP |

> **Direction matters to the modes:** CP→CS messages are ones the simulator (as a
> charge point) *sends*; CS→CP messages are ones it *listens for and responds to*
> in CP Mode. Populating the CS→CP messages is what finally makes CP Mode's
> "listen and respond" flow (§5.3) usable — impossible today with only CP→CS
> messages in the catalog.
- **Description** — a plain-language sentence explaining the selected message and
  its direction (e.g. *"CP → CS: announces its boot-up"*).
- **Message Syntax/Format** — the expected shape of the message.
- **Request Parameters form** — one field per parameter, pre-filled with sensible
  **defaults**. Required fields are marked with `*`. Field types adapt: free text,
  numbers, **dropdowns for enums** (only valid values selectable), and **JSON text
  areas** for object/array parameters (e.g. a full `meterValue` block). Each field
  can carry a short help description.
- **Validation Status area** — shows **Success** (green) or **Failed** (red, with
  a bulleted list of every problem) after an action.
- **Request Payload** box — the assembled request as pretty, syntax-highlighted
  JSON, updated live as you edit the form.
- **Response Payload** box — the response as pretty JSON (auto-generated in
  Simulator Only; the real server reply in CP Mode).
- **OCPP Message Log** — a running console of every message, tagged **SENT**
  (green) or **RECEIVED** (blue) with a timestamp, plus a **Clear Log** button.

---

## 4. Mode 1 — "Simulator Only" (offline sandbox)

**Purpose for the user:** learn a message, experiment with its parameters, and
check that a payload is well-formed — with **no server and no network** needed.

**What the user does and sees:**

1. Leaves the mode on **Simulator Only** (the default). No connection panel is
   shown; nothing to configure.
2. Picks a message and edits the request parameters. The **Request Payload** JSON
   updates as they type.
3. Clicks the action button, labeled **"Run Simulation & Validate Request"**.
4. The tool **validates the request** against the message's built-in rules
   (required fields present, integers are numeric, enum values are allowed, JSON
   parameters parse correctly) and shows Success/Failed.
5. The tool **fakes the exchange locally**:
   - logs a **SENT** line for the request,
   - **auto-generates a plausible response** from the message's response
     definition (e.g. a `BootNotification` reply with `status: Accepted`,
     `currentTime`, `interval`),
   - logs a **RECEIVED** line for that response,
   - fills the **Response Payload** box.
6. **If the request was invalid**, the faked response degrades realistically —
   any `status` field flips to **`Rejected`** (including a nested
   `idTagInfo.status`) — so the user sees what a rejection would look like.

**Key user-facing truth:** in this mode **nothing leaves the browser**. The
response is invented by the tool, not received from a real system. It is a
teaching/validation sandbox.

---

## 5. Mode 2 — "Charge Point (CP) Mode" (live against a real CSMS)

**Purpose for the user:** act as a **real charge point** and exchange **live**
OCPP messages with an actual Central System (CSMS) for interoperability testing.

### 5.1 Connecting

1. User selects **Charge Point (CP) Mode**. The **connection panel** appears.
2. User enters the **full server URL including the charge-point ID** (placeholder
   `wss://your-csms-endpoint.com/CP_001`) and clicks **Connect**.
   - The URL must start with `ws://` or `wss://`, otherwise the user is warned.
   - Guidance note reminds them to use `wss://` when the page itself is served
     over HTTPS.
3. A **status indicator** reflects the live connection with a colored dot and
   text: **Disconnected** (red) → **Connecting…** (amber) → **Connected** (green).
4. Once connected, the button becomes **Disconnect**, and the **Start Heartbeat**
   button is enabled. The tool connects using the standard `ocpp1.6` WebSocket
   subprotocol.

### 5.2 Sending a charge-point → central-system message (e.g. BootNotification, StartTransaction)

1. User picks a **CP → CS** message; the request form is **editable** and the
   action button reads **"Send Request to Server"**.
2. On click, the tool validates, then **sends a real OCPP request** over the live
   socket, logs it as **SENT**, and shows **"Waiting for server response…"**.
3. When the CSMS replies, the tool displays the **actual server response** in the
   Response Payload box and logs it as **RECEIVED**.

### 5.3 Receiving a central-system → charge-point message (e.g. a server-initiated command)

1. For **CS → CP** messages the request form is **disabled** (the charge point
   can't initiate these) and the button reads **"Listening for this message from
   server…"**.
2. When the CSMS **sends that command**, the tool shows the incoming request,
   reveals a **response form** for the user to fill, and the button becomes
   **"Send Response to Server"**.
3. On click, the tool sends the user's response back to the CSMS as a real OCPP
   result and logs the exchange.

### 5.4 Heartbeat

- **Start Heartbeat** begins sending a real `Heartbeat` at a repeating interval;
  the button toggles to **Stop Heartbeat** (and turns red) until stopped.
- Heartbeats appear in the log like any other SENT message.
- If the connection drops, the heartbeat loop stops and the button resets.

**Key user-facing truth:** in this mode the tool is a **genuine OCPP client** —
every request, response, and heartbeat is a real frame on a real WebSocket to a
real CSMS. Responses are whatever the server actually returns.

---

## 6. Simulator Only vs CP Mode — side-by-side (user view)

| Aspect | Simulator Only | Charge Point (CP) Mode |
|---|---|---|
| Network | None — fully offline | Live WebSocket to a real CSMS |
| Connection panel | Hidden | Shown (URL, Connect, status, Heartbeat) |
| Who produces the response | The tool fakes it locally | The real Central System |
| Action button label | "Run Simulation & Validate Request" | "Send Request to Server" / "Send Response to Server" / "Listening…" |
| CS → CP messages | Simulated like any other | Received live; user replies |
| Heartbeat | Not applicable | Real, on an interval |
| Main use | Learn / validate a single message | Interoperability testing vs a CSMS |
| Risk | Zero (nothing leaves the browser) | Real traffic to a real system |

---

## 7. What this means for suite integration (requirements to preserve)

Any integration with the **Validation Engine** and **Parser** must keep the
above user experience intact. Concretely:

- **R1 — Preserve both modes.** The Simulator Only / CP Mode toggle and their
  distinct behaviors must survive integration unchanged from the user's view.
- **R2 — Validation is the natural join point.** The Simulator already validates
  payloads (today with its own built-in rules). Integration should let the
  **Validation Engine (L1–L3)** perform that validation instead, so the user sees
  the same authoritative results the Parser uses — in **both** modes.
- **R3 — Live frames in CP Mode are real OCPP frames.** Every sent/received frame
  is already in the exact `[messageType, messageId, action, payload]` shape, so it
  can be validated as-is without changing what the user does.
- **R4 — The message log is a session.** The running SENT/RECEIVED log is, in
  effect, an OCPP session transcript. Integration may let the user hand that
  session to the **Parser** for full analysis — without altering the simulator's
  own behavior.
- **R5 — No regressions to offline use.** Simulator Only must remain fully
  functional with no network, no server, and no external dependency for the user.
- **R6 — Full message coverage.** The catalog must expand from today's 7 to the
  **complete OCPP 1.6J set — all 28 operations / 56 PDUs** (§3.1), so a trainee can
  exercise the whole protocol, including CS→CP messages.
- **R7 — Categorized selection.** Messages must be selectable **by Feature Profile**
  (Core, Firmware Management, Local Auth List, Reservation, Smart Charging, Remote
  Trigger) and filterable **by Direction** (CP→CS / CS→CP / both) — the
  standards-native grouping (operating principle #11), which also serves as the
  training structure.
- **R8 — Schema-driven, not hand-maintained.** The catalog's message list, field
  types, enums, and required-flags must be **derived from the canonical schemas /
  `typed-ocpp`** already in the repo — the same source of truth the Validation
  Engine uses — not a hand-written parallel list. Only training-friendly extras the
  schemas don't carry (sensible defaults, plain-language descriptions) are layered
  on top. This guarantees zero drift between what the simulator sends and what the
  engine validates, and makes future OCPP 2.0.1 support "add a schema set," not
  "hand-write 40 more messages."

> These requirements are the acceptance baseline for the integration design that
> follows. The design/plan for *how* to wire this into the suite lives in a
> separate spec once this baseline is approved.

---

## 8. Out of scope for this document

- **Tab 2 — Transaction Flow Simulator** (replay a whole transaction from a CMS
  Excel log with playback speed control).
- **Tab 3 — CMS Log Parser** (parse a CMS Excel export into meter-value tables and
  graphs).
- Any code-level / architecture detail — captured in the integration design spec,
  not here.
