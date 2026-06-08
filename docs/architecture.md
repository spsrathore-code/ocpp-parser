# Architecture

## Suite shape

A mega-repo of five tools sharing one OCPP core:

```
        ┌──────────────────────────────────────────┐
        │   Shared core: OCPP types + schemas +     │
        │   Validation Engine (typed-ocpp, L1–L3)   │
        └───────────────┬──────────────────────────┘
                        │ consumed by
   ┌──────────┬─────────┼──────────┬─────────────────┐
   │ Parser   │  CMS     │ Charger  │ Training        │
   │ (logs)   │ (CSMS)   │ Emulator │ Emulator        │
   └──────────┴──────────┴──────────┴─────────────────┘
```

- **Validation Engine** — isomorphic TS package; `messageValidator` (L1+L2 via typed-ocpp) · `exchangeTracker` (L3) · `protocolValidator` (L4 stub). Full design: `./TYPEVALIDATION.md`.
- **Schemas** — `../src/schemas/ocpp-1.6/` (56 reference `.json`); runtime validation uses typed-ocpp's bundled OCA schemas.

## Parser (current) — internal architecture

The Parser is today a single 9,813-line HTML file (`../src/app/OCPP_Parser_Complete_ 21 Jan'26.html`). Its full internal architecture — parsing contract (regexes), the `tx` data model, the 19-section render order, the downtime engine, dependency manifest — is documented in `../specs/requirements.md` §19 (Architecture & Data Model).

**Revamp constraint:** no source file may exceed 2,000 lines, so the monolith will be decomposed into `src/` modules (parse · detect · health · protocol · ws · repository · timeline · render · export · api-download · ui-shell). See `../specs/requirements.md` §19.6.

## Deployment

`src/app/…html` → copied to root `index.html` → GitHub Pages. See `../specs/requirements.md` → Deploy Workflow.
