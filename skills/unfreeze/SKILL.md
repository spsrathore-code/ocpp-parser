---
name: unfreeze
phase: safety tool (any phase)
triggers: "unfreeze, remove the freeze, unlock, stop restricting edits"
ocpp-context: false
---

## Purpose

Removes the /freeze directory restriction. /careful remains active if it was set.

## Steps

1. Confirm: "Removing freeze restriction. Edits are no longer restricted to `[frozen-dir]/`."
2. Note: /careful remains active if it was activated separately. Run a new session to deactivate /careful.
