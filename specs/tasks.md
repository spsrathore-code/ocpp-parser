# Tasks — current work items

> Living list. Done items move to `../CHANGELOG.md`.

## Done

- [x] Consolidate scattered MD docs into one SSOT (`requirements.md`).
- [x] Reconcile SSOT against the actual tool source (v2.7 — downtime engine, Sections 18/19, etc.).
- [x] Decide OCPP schema strategy (`requirements.md` §19.7) and write the Validation Engine spec (`../docs/TYPEVALIDATION.md`).
- [x] Standardise the repo to `../knowledge/project-standard.md` (full tree, files placed, governance files authored).

## Next

- [ ] **Delete the leftover empty `OCPP Client Parser MD Collection/`** (locked CWD blocked auto-delete; git-ignored for now). Easy once VS Code is reopened on the P4 root.
- [ ] Update the Deploy Workflow in `requirements.md` to the new source path (`src/app/…html`).
- [ ] Validation Engine — **`typed-ocpp` browser-bundling spike** (`../docs/TYPEVALIDATION.md` §7), then `writing-plans`.

## Later

- [ ] Parser revamp — decompose the monolith into `src/` modules (< 2,000 lines each) + `tests/`.
- [ ] Fold the L4 rule catalog ("laundry list") from `../scratchpad/drafts/Revamp Proposal.txt` + Protocol Compliance + L-001/2/3 into the Validation Engine.
- [ ] CMS, Charger Emulator (SAP candidate), Training Emulator.
