---
name: careful
phase: safety tool (any phase)
triggers: "careful, warn me before destructive commands, safety mode on"
ocpp-context: false
---

## Purpose

Activates a safety gate: Claude will warn before any command that is hard to reverse.
Covers: `rm`, `git reset --hard`, `git push --force`, `git checkout --`, DROP TABLE,
overwriting uncommitted files, deleting branches.

## Steps

When /careful is active, before executing any destructive command, Claude must:
1. Print: "⚠ CAREFUL: [command] is destructive and hard to reverse."
2. State what will be lost or changed.
3. Ask: "Proceed? (yes / no)"
4. Only proceed if user says yes.

Remains active for the duration of the session. To deactivate: start a new session.
