import { defineConfig } from 'vitest/config';

// Single config for Vite (dev/build) and Vitest (test). Root = repo root.
// One page entry: the unified tool (index.html → src/app/main.ts), which boots the
// nav shell that hosts the Parser and the OCPP Simulator as views (design §4.1).
//
// `base` is set to the GitHub Pages project subpath ('/ocpp-parser/') for the
// production build only — Pages serves the site under that path, so every asset,
// lazy chunk, and the analysis Web Worker URL must be prefixed with it. Dev/preview
// stay at '/' so `npm run dev` remains at http://localhost:5173/.
export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/ocpp-parser/' : '/',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
  },
}));
