import { defineConfig } from 'vitest/config';

// Single config for Vite (dev/build) and Vitest (test). Root = repo root.
// One page entry: the unified tool (index.html → src/app/main.ts), which boots the
// nav shell that hosts the Parser and the OCPP Simulator as views (design §4.1).
export default defineConfig({
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
  },
});
