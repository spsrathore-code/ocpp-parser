# MD File Registry — Design Spec

**Date:** 2026-06-08
**Status:** Approved — ready for implementation
**Author:** Brainstormed with Claude (Sonnet 4.6)
**Implements:** `docs/md-registry.md` + two additions to `project-standard.md`

---

## Problem

The repo currently has 32 MD files across 7 folders, growing to 60+ once the skill chain
implementation runs. Without a map it becomes impossible to remember — after any significant
gap — what files exist, what each one does, which are active vs dormant, and which files
must be updated together when one changes.

---

## Solution

A single human-readable registry file at `docs/md-registry.md`. One master table, grouped
by folder, with a "Updates when" column that captures inter-file dependencies without
requiring a diagram. Self-contained — all definitions embedded at the top of the file.

---

## File location

`docs/md-registry.md`

Rationale: `docs/` is the home for reference documents about the project. Not root (already
crowded). Not `specs/` (that is requirements, not meta-info). Not `knowledge/` (that is
standards and principles). `docs/` is correct.

---

## Document structure

```
# MD File Registry — OCPP Tool Suite

> Last reviewed: YYYY-MM-DD

## Role definitions
<table>

## Status definitions
<table>

---

## Root `/`
<registry table>

## specs/
<registry table>

## docs/
<registry table>

## docs/superpowers/plans/
<registry table>

## docs/superpowers/specs/
<registry table>

## knowledge/
<registry table>

## knowledge/standards/ocpp-1.6/
<registry table>

## skills/   ← populated once skill chain implementation runs
<registry table>
```

---

## Column definitions

| Column | Content | Constraint |
|---|---|---|
| `File` | Relative path from repo root as a clickable markdown link | Required |
| `Role` | One of the 5 Role values below | Required |
| `Status` | One of the 4 Status values below | Required |
| `Purpose` | One line, ≤ 15 words, no jargon | Required |
| `Updates when` | What triggers a change to this file — another file changes or a workflow event | Required |

---

## Role definitions (embedded in registry file)

| Role | What it does |
|---|---|
| `RULES` | Enforces constraints on how work happens |
| `BLUEPRINT` | Defines what to build and how |
| `RULEBOOK` | External protocol reference — consult, never edit |
| `TRACKER` | Records live state, history, decisions |
| `GUIDE` | Explains or describes to a human reader |

**Assignment guide:**
- CLAUDE.md, operating-principles.md, project-standard.md → `RULES`
- requirements.md, vision.md, roadmap.md, skill-chain.md, plans → `BLUEPRINT`
- All 14 OCPP 1.6J standard files in `knowledge/standards/` → `RULEBOOK`
- project-journal.md, CHANGELOG.md, tasks.md, WORKFLOW.md → `TRACKER`
- README.md, overview.md, architecture.md, user-guide.md, workflow.md → `GUIDE`

---

## Status definitions (embedded in registry file)

| Status | Meaning |
|---|---|
| `ACTIVE` | In regular use — updated this month or expected to be soon |
| `REFERENCE-ONLY` | Read often, almost never written |
| `DORMANT` | Exists but not relevant to active work right now |
| `DRAFT` | Work in progress, not yet authoritative |

---

## Maintenance rules

### Rule 1 — New file = new entry (same commit, no exceptions)

Any new MD file added to the repo must have a corresponding registry entry committed in
the same git commit. This rule is also added to `project-standard.md` so it is enforced
by the governance layer, not just by convention.

### Rule 2 — Skill chain integration

Two skills are responsible for surfacing missed entries:
- `/document-release` — adds a registry entry for every new MD file shipped in a PR
- `/learn` — at session end, flags any MD files created during the session without a
  registry entry

### Rule 3 — "Last reviewed" date

Updated when the registry is opened and verified as accurate. Not required every session.
Required after any major batch of work that adds multiple files (e.g., skill chain
implementation adds ~32 new SKILL.md files).

### What does NOT trigger an update

- Editing content inside an existing MD file
- Renaming a section inside a file
- Only structural changes trigger an update: file added, file deleted, file's Role or
  Status changes

---

## Changes to project-standard.md

Two additions only — no other modifications:

### Addition 1 — Add `md-registry.md` to the `docs/` section of the folder tree

```
├── docs/                     ← DOCUMENT
│   │
│   ├── md-registry.md        ← MD file inventory
│   ├── overview.md           ← Business overview
│   ├── architecture.md       ← System design
│   ├── workflow.md           ← Process flow
│   └── user-guide.md         ← End-user instructions
```

### Addition 2 — Add one rule line under "Repository Design Principle"

> **MD File Registry Rule:** Every MD file added to this repo must have an entry in
> `docs/md-registry.md` in the same commit. No MD file without a registry entry.

---

## Implementation scope

| File | Action | Detail |
|---|---|---|
| `docs/md-registry.md` | CREATE | Full registry with all 32 current MD files populated |
| `project-standard.md` | UPDATE | Two additions: tree entry + rule line |

The 32 current MD files must all be entered at creation time. Future files (30 SKILL.md
files from skill chain implementation) are added when that implementation runs.

---

## Out of scope

- Automated tooling to scan for unregistered files (could be added later as a git hook)
- Visual diagram of file relationships (rejected — diagrams rot; "Updates when" column
  covers the connection view in a maintainable way)
- Per-folder `_index.md` files (rejected — single file is simpler and sufficient)
- Machine-readable format (rejected — primary reader is human, JSON/YAML adds complexity
  with no benefit for the stated use case)
