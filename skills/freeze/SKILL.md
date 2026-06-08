---
name: freeze
phase: safety tool (any phase)
triggers: "freeze, lock this directory, only edit in this folder, restrict edits"
ocpp-context: false
---

## Purpose

Restricts Claude's file edits to one specified directory during a debugging session.
Prevents accidental edits to files outside the scope of investigation.

## Steps

1. Ask: "Which directory should I restrict edits to?" (e.g., `src/app/`)
2. Confirm: "I will only edit files inside `[directory]/` until you run /unfreeze."
3. For the rest of the session: before any file edit, check the path. If outside the frozen
   directory, warn: "⚠ FROZEN: [file] is outside `[directory]/`. Edit anyway? (yes / no)"
