# Deploy — OCPP Suite → GitHub Pages

Live URL: **https://spsrathore-code.github.io/ocpp-parser/**

## How it works (since 2026-07-11)

The suite is a Vite app (TS + Web Worker + code-split chunks), so it must be **built**
before serving — GitHub Pages cannot serve the raw source. A GitHub Actions workflow
builds it and publishes `dist/` to Pages.

- **Trigger:** every push to `main` (or manual `workflow_dispatch`). See
  `.github/workflows/deploy.yml`.
- **Build:** `npm ci && npm run build` → `dist/`.
- **Base path:** `vite.config.ts` sets `base: '/ocpp-parser/'` for the production
  build only (Pages serves under the repo subpath). Dev/preview stay at `/`.
- **Pages setting:** Settings → Pages → Build and deployment → **Source: GitHub
  Actions** (build_type `workflow`). Switched from the old "legacy" (serve `main`
  raw) mode during the deploy swap.

## To deploy a change

1. Merge the change into `main` (via PR, per the Git workflow rule).
2. The `Deploy OCPP Suite to GitHub Pages` workflow runs automatically.
3. Watch it: `gh run watch` or the Actions tab. Live in ~1–2 min.

## Rollback

The legacy single-file parser (previous live tool) is preserved at tag
**`legacy-parser-v2026.05.14`**. To roll back, either revert `main` to that tag's
tree or temporarily point Pages back to a branch serving the legacy `index.html`.

## Known deferrals (v1)

- **Tailwind Play CDN** is still loaded at runtime (works online; keeps the dynamic
  `text-${color}` classes JIT-compiling). Compiling Tailwind is a later hardening
  step — it would break those dynamic classes without a safelist/refactor first.
- Google Fonts loaded from CDN.
- No SRI on the CDN scripts. (Both CDNs are the assessment's S3 note.)

## Local checks before merging a deploy-affecting change

- `npm run build` succeeds and `dist/index.html` references `/ocpp-parser/assets/…`.
- `npx tsc --noEmit` clean, `npm test` green.
