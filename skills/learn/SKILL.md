---
name: learn
phase: 7 of 7 — REFLECT
triggers: "update the journal, log this session, learn, close the feature, session summary"
ocpp-context: true
---

## Phase Banner

Read `skills/WORKFLOW.md`. Print:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
OCPP Tool Suite — Skill Chain
Phase 7 of 7 — REFLECT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Feature:   [active feature from WORKFLOW.md, or "session" if no feature active]
Previous:  /retro (Reflect)  [run | ⚠ Not recorded]
Current:   /learn
Next:      (chain complete — start a new feature)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## Purpose

Appends a dated session summary to `knowledge/project-journal.md`.
Moves completed tasks in `specs/tasks.md`. Marks the Reflect phase complete.
Triggered any time the user says "update the journal" — not only at end of chain.

## Steps

1. Ask: "What did we work on in this session?" (Prompt for: discussed, decided, implemented, next.)
   (If invoked as part of the chain after /retro, read the retro doc instead of asking.)
2. Append to `knowledge/project-journal.md`:

   ```markdown
   ## YYYY-MM-DD — [Session topic]

   ### Discussed
   - [topics covered in this session]

   ### Decided
   - [decisions made and rationale]

   ### Implemented
   - [files created/changed, or "design phase only" if no code written]

   ### Next
   - [pending items for next session]
   ```

3. Review `specs/tasks.md`:
   - Move any completed items from Next → Done.
   - Add any new Next items from the session.
4. Commit journal and tasks:
   ```bash
   git add knowledge/project-journal.md specs/tasks.md
   git commit -m "docs: session journal update YYYY-MM-DD"
   ```
5. Print:
   ```
   knowledge/project-journal.md updated ✓  (YYYY-MM-DD entry appended)
   specs/tasks.md updated ✓               (N items moved to Done)
   ```

## OCPP Considerations

If the session involved any OCPP protocol discoveries (unexpected charger behaviour,
new understanding of field log patterns), include them in the Discussed section.

## Output

`knowledge/project-journal.md` — new entry appended.
`specs/tasks.md` — tasks updated.

## WORKFLOW.md Update

Mark Reflect ✅ with today's date.
Move completed feature to "Completed features" table in WORKFLOW.md.
Print: "skills/WORKFLOW.md updated ✓ — Reflect phase complete. Feature [name] archived."

## End Banner

Print:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Phase 7 — REFLECT complete. Feature cycle closed.
knowledge/project-journal.md updated ✓
skills/WORKFLOW.md updated ✓ (feature archived)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
