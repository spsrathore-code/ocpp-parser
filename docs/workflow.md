# Workflow

## Parser — how a log flows through

1. **Ingest** — user uploads a raw OCPP client log (`.txt`/`.log`) or pulls it from a charger via the API-download feature.
2. **Parse** — line-by-line extraction of OCPP messages, events, and alerts (chunked, 1000 lines/chunk).
3. **Correlate & process** — request↔response matching by `MessageId`; transactions assembled (`processTransactions`).
4. **Analyse** — downtime/fault detection, transaction-health checks, protocol-compliance checks, WebSocket health.
5. **Render** — 19 sections in a fixed order (see `../specs/requirements.md` §19.4); export to Excel per section.

## Suite interaction (target)

```
Charger Emulator ⇄ CMS (CSMS) ⇄ (logs) ⇒ Parser
        every message validated by the shared Validation Engine
```

## Git workflow (mandatory)

**Branch → PR → Merge. Never commit directly to `main`.**

1. `git checkout -b feat/your-description` (or `fix/`, `docs/`, `chore/`)
2. Make changes, commit to the branch.
3. `git push -u origin feat/your-description`
4. Open a Pull Request on GitHub → review → merge into `main`.

`main` is always deployable. Branch naming examples: `feat/offline-replay-flag`, `fix/meter-value-parse`, `docs/update-schemas`.

## Dev / deploy workflow (Parser)

- Edit the **canonical source**: `../src/app/OCPP_Parser_Complete_ 21 Jan'26.html` (never `index.html`).
- Work on a branch (see Git workflow above).
- Before merging: copy canonical source to root `index.html`.
- Merge PR → GitHub Pages auto-deploys from `main`.
- After any change, record an impact check in `../CHANGELOG.md`.
- Full steps + the standard impact-check template: `../specs/requirements.md`.
