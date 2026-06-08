# User Guide

> End-user guide for the **Parser** (the live tool). Other suite tools are not built yet.

## Open the tool

- **Hosted (recommended):** https://spsrathore-code.github.io/ocpp-parser/ — needed for Google Drive sync (Log Repository).
- **Local:** open `src/app/OCPP_Parser_Complete_ 21 Jan'26.html` in a browser. Parsing and local (IndexedDB) storage work offline; Drive sync requires the hosted URL.

## Analyse a log

1. **Upload** one or more OCPP client logs (`.txt`/`.log`), or use **Download from EVSE** (IP + site name) to pull a log over the API.
2. Watch the progress bar; results render below as collapsible sections.
3. Review the sections — Debug Info, Boot/Heartbeat/Status/Start/Stop, Transaction Summary, Connector Stats, Meter Values, Events/Alerts, Downtime Report, Emergency Stop, Fault Status, Incomplete Transactions, Energy Dispense, Protocol Compliance, WebSocket Health.
4. **Export** any section to Excel; download or preview log **context** around boot/event/alert/downtime rows.
5. Optionally **save to the Log Repository** (local IndexedDB; optional Google Drive sync) to re-analyse later.

## Reference

Every feature, column, threshold, and check is specified in `../specs/requirements.md` (the single source of truth).
