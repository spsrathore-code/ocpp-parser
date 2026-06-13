---
name: guard
phase: safety tool (any phase)
triggers: "guard, maximum safety, lock everything down, careful and freeze"
ocpp-context: false
---

## Purpose

Activates both /careful and /freeze simultaneously. Maximum safety mode.

## Steps

1. Ask: "Which directory should I restrict edits to?"
2. Activate /careful (warn before destructive commands).
3. Activate /freeze for the specified directory.
4. Confirm: "Guard active. Destructive commands require confirmation. Edits restricted to `[dir]/`."
