import { defineConfig } from 'vitest/config';
import { resolve } from 'node:path';

// Single config for Vite (dev/build) and Vitest (test). Root = repo root.
// Two page entries: the Parser (index.html → src/app/main.ts) and the
// OCPP Simulator (simulator.html → src/simulator/main.ts).
export default defineConfig({
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: resolve('index.html'),
        simulator: resolve('simulator.html'),
      },
    },
  },
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
  },
});
